import {
  applyOrMap,
  arraySetDifference,
  deepClone,
  equals,
  groupBy,
  mapObj,
  omitKeys,
  partition,
  pick,
} from "@polygraph/utils";
import {
  MutatingResources,
  NormalizedResources,
  Store,
  QueryRelationship,
  Resource,
  ResourceRef,
  Operation,
  Tree,
  CreateOperation,
  Query,
} from "../types";
import { SchemaType } from "../data-structures/schema";
import { operations } from "./operations";
import { refsEqual, applyMapOrNull } from "../utils";
import { QuiverType, ScopedQuiver } from "../data-structures/working-quiver";

function makeEmptyData(schema: SchemaType): NormalizedResources {
  const out = {};
  Object.keys(schema.resources).forEach((resourceName) => {
    out[resourceName] = {};
  });
  return out;
}

function asArray<T>(valOrArray: T | T[]): T[] {
  return Array.isArray(valOrArray) ? valOrArray : [valOrArray];
}

// performs a deep clone and ensures all invertable relationships line up
// this is memorystore stuff
function copyAndClean(
  schema: SchemaType,
  data: NormalizedResources,
): NormalizedResources {
  Object.keys(data).forEach((resourceType) => {
    const relationshipProperties = schema.resources[resourceType].relationshipsArray;

    Object.entries(data[resourceType]).forEach(([resourceId, resource]) => {
      relationshipProperties.forEach((relAttr) => {
        applyOrMap(resource[relAttr.name], (foreignId) => {
          if (foreignId) {
            const foreignInverses = data[relAttr.type][foreignId][relAttr.inverse];
            const okay = Array.isArray(foreignInverses)
              ? foreignInverses.includes(resourceId)
              : foreignInverses === resourceId;

            if (!okay) {
              throw new Error(
                `Relationship mismatch: (${resourceType}, ${resourceId}) does not have a corresponding inverse (${relAttr.type}, ${foreignId})`,
              );
            }
          }
        });
      });
    });
  });

  return deepClone(data);
}

export function MemoryStore(
  schema: SchemaType,
  { initialData = {} }: { initialData: NormalizedResources },
): Store {
  const data = copyAndClean(schema, initialData);
  const contextualOperations = operations(schema, data);

  // PLAN ?:
  // 0. (Validation) - Ensure tree and query comport (should be somewhere else)
  // 1. Convert the (query, tree) pair into graph assertions
  // 2. Ensure the graph assertions are internally consistent
  // 3. Convert the graph assertions into operations and apply them

  // Assume tree has been pruned to the schema (and a query)
  // TODO: what to do about existing nodes that are not in the existing tree?
  async function treeToQuiver(tree: Tree | Tree[]) {
    // gonna build up a working quiver using mutable state for performance
    const quiver = new ScopedQuiver(schema);

    const runSubTree = async (subTree: Tree | Tree[]) => {
      if (Array.isArray(subTree)) {
        return Promise.all(subTree.map(runSubTree));
      }

      const { id, type } = subTree;
      const existingNode = await contextualOperations.read(subTree);
      const schemaResDef = schema.resources[type];
      const properties = pick(
        subTree.attributes,
        schemaResDef.propertiesArray.map((attr) => attr.name),
      );
      const relationships = pick(
        subTree.attributes,
        schemaResDef.relationshipsArray.map((rel) => rel.name),
      );

      // set node/arrows for this
      quiver.addNode({ type, id, properties });
      Object.entries(relationships).forEach(([relName, relValue]) => {
        const source = { type, id };
        const existingTargets = existingNode.attributes[relName];

        quiver.setOutgoingArrows(
          source,
          relName,
          asArray(relValue),
          asArray(existingTargets),
        );
      });

      await Promise.all(Object.values(relationships).map(runSubTree));

      return quiver;
    };

    return runSubTree(tree);
  }

  async function quiverToOperations(quiver: QuiverType) {
    const {
      assertedNodes,
      assertedArrows,
      deletedNodes,
      deletedArrows,
    } = quiver.toObject();

    // to hell with perf
    const createNodesP = assertedNodes.map(async (node) => {
      const exists = await !!contextualOperations.read(node);
      return exists
        ? contextualOperations.create(node)
        : contextualOperations.update(node);
    });
  }

  // create/update resources/properties
  // create/update relationships
  async function extractOperations(
    updatedResourceOrResources: Resource | Resource[] | null,
    existingRefOrRefs: ResourceRef | ResourceRef[],
    prevResource: Resource | null,
    subQuery: QueryRelationship,
    skipDelete: boolean,
  ): Promise<Operation[]> {
    const forceArray = <T>(arrayOrValue: T | T[]): T[] => {
      if (Array.isArray(arrayOrValue)) return arrayOrValue;
      return arrayOrValue == null ? [] : [arrayOrValue];
    };

    const updatedResources = forceArray(updatedResourceOrResources);
    const existingRefs = forceArray(existingRefOrRefs);
    const { type } = updatedResources[0] || existingRefs[0];

    // traverse relationships for more stuff
    const resourceOperationsPromise = Promise.all(
      updatedResources.flatMap(async (updatedResource) => {
        const existingResource = await contextualOperations.read({
          type,
          id: updatedResource.id,
        });

        const related = await Promise.all(
          Object.entries(subQuery.relationships || {}).flatMap(
            ([relationshipName, relationshipDefinition]) => {
              const nextRelationship = fleshedRelationship(
                relationshipName,
                relationshipDefinition,
              );
              const attrName = nextRelationship.name;
              const nextExistingRefOrRefs = existingResource
                ? existingResource[attrName]
                : null;

              return extractOperations(
                updatedResource[attrName],
                nextExistingRefOrRefs,
                updatedResource,
                relationshipDefinition,
                skipDelete,
              );
            },
          ),
        ).then((x) => x.flat());

        if (!existingResource) {
          return [
            { type: "create", resource: updatedResource },
            ...related,
          ] as Operation[];
        } if (!equals(updatedResource, existingResource)) {
          return [
            { type: "update", resource: updatedResource },
            ...related,
          ] as Operation[];
        }
        return related;
      }),
    ).then((x) => x.flat());

    // delete stuff
    const localDeletions = skipDelete
      ? []
      : existingRefs
        .filter(({ id }) => !updatedResources.some((r) => r.id === id))
        .map((ref) => ({ operation: "delete", resource: ref } as Operation));

    // update inverse relationships
    if (prevResource) {
    }

    const resourceOperations = await resourceOperationsPromise;

    return [...resourceOperations, ...localDeletions];
  }

  const runQuery = async (initQuery) => {
    const expandRelationship = (
      relationshipName: string,
      relationshipDefinition: QueryRelationship,
      type: string,
      id: string,
    ): Tree | Tree[] => {
      const resource = data[type][id];
      const relatedType = schema.resources[type].properties[relationshipName].type;

      return applyOrMap(resource[relationshipName], (relatedId) => expandResource(relationshipDefinition, relatedType, relatedId));
    };

    const expandResource = (
      subQuery: QueryRelationship,
      type: string,
      id: string,
    ): Tree => {
      const resource = data[type][id];

      if (!resource) {
        return null;
      }

      const properties = subQuery.properties
        ? pick(resource.properties, subQuery.properties)
        : resource;
      const relationships = "relationships" in subQuery
        ? mapObj(
          subQuery.relationships,
          (relationshipDefinition, relationshipName) => expandRelationship(
            relationshipName,
            relationshipDefinition,
            type,
            id,
          ),
        )
        : {};

      return {
        id,
        type,
        properties: { ...properties, ...relationships },
      };
    };

    const expandResources = (subQuery, type) => Object.keys(data[type]).map((id) => expandResource(subQuery, type, id));

    const result = "id" in initQuery
      ? expandResource(initQuery, initQuery.type, initQuery.id)
      : expandResources(initQuery, initQuery.type);

    return result;
  };

  const transaction = async (operations: Operation[]) => {
    // this is a normalized data store that will get populated into throughout the transaction; it
    // is tracked here to detect inconsistancies and other errors; additionally, it tracks all the
    // data that is mutated during the transaction. it has its own layer of operation application
    // that eventually gives way to calling the store operations with full faith for success
    const mutatingData = makeEmptyData(schema) as MutatingResources;
    const primitiveOperations = [];
    const DELETED = Symbol("deleted");

    // the "mutatingData" store needs to be fairly smart, insofar as it must do:
    // - provide data to operations for relationships from the true data store
    // - prevent conflicting changes to the same resource
    // - identify mutated resources
    // - identify mutations to relationships
    // - to-one relationships are trivial; to-many need added, removed, set

    const groupedOperations = groupBy(operations, (o) => o.operation);

    (groupedOperations.create as CreateOperation[]).forEach(
      async ({ resource }) => {
        const { type, id } = resource;
        const existingResource = await contextualOperations.read(resource);

        if (existingResource) {
          throw new Error(
            `Failed trying to create an already existing resource (${type}, ${id})`,
          );
        }

        mutatingData[type][id] = resource;
        primitiveOperations.push({ operations: "create", resource });
      },
    );

    operations.forEach(async ({ operation, resource }) => {
      const { id, type } = resource;
      const existingResource = mutatingData[type][id] || (await contextualOperations.read(resource));

      switch (operation) {
      case "create": {
        break;
      }
      case "update": {
        if (!existingResource) {
          throw new Error(
            `Failed trying to update a nonexistant resource (${type}, ${id})`,
          );
        }

        // the same resource has been created/updated--ensure consistency
        if (mutatingData[type][id]) {
          Object.keys(existingResource).forEach((key) => {
            if (existingResource[key] !== resource[key]) {
              throw new Error("inconsistent data");
            }

            mutatingData[type][id] = {
              ...existingResource,
              ...mutatingData[type][id],
            };
          });
        } else {
          mutatingData[type][id] = resource;
        }
        break;
      }
      case "delete": {
        if (!existingResource) {
          throw new Error(
            `Failed to delete a nonexistant resource (${type}, ${id})`,
          );
        }

        mutatingData[type][id] = DELETED;
      }
      }
    });
  };

  return {
    ...operations(schema, data),

    upsert: async (resource) => {
      const { id, type } = resource;
      return id in data[type]
        ? contextualOperations.update(resource)
        : contextualOperations.create(resource);
    },
    query: runQuery,
    merge: async (query, graph) => {
      const existing = await runQuery(query);
      const operations = await extractOperations(
        graph,
        existing,
        null,
        query,
        true,
      );

      return transaction(operations);
    },
    replace: async (query, graph) => {
      const existing = await runQuery(query);
      const operations = await extractOperations(
        graph,
        existing,
        null,
        query,
        false,
      );

      return transaction(operations);
    },
    transaction,

    // are these relationship methods replaceable with merge/replace above?
    // replaceRelationship({ type: 'bear', id: '1', relationship: 'home', foreignId: '2' })
    // ~equivalent to~
    // replace({ type: 'bear', id: '1' }, { type: 'bears', id: '1', home: '2' })

    // appendRelationships({ type: 'bear', id: '1', relationship: 'powers', foreignIds: ['2'] })
    // ~NOT equivalent to~
    // merge({ type: 'bear', id: '1' }, { type: 'bears', id: '1', powers: ['2'] })

    // it appears that the singular e.g. "replaceRelationship" can go, while "replaceRelationships" should stay,
    // but there's no harm in keeping them all?

    replaceRelationship: async () => {},
    replaceRelationships: async () => {},
    appendRelationships: async () => {},
    deleteRelationship: async () => {},
    deleteRelationships: async () => {},
  };
}
