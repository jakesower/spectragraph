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
  SchemaInterface,
  SchemaAttribute,
  SchemaRelationship,
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
import { operations } from "./operations";

function isInvertableRelationship(attribute): attribute is SchemaRelationship {
  return attribute.inverse;
}

function makeEmptyData(schema: SchemaInterface): NormalizedResources {
  const out = {};
  Object.keys(schema.resources).forEach((resourceName) => {
    out[resourceName] = {};
  });
  return out;
}

// performs a deep clone and ensures all invertable relationships line up
function copyAndClean(
  schema: SchemaInterface,
  data: NormalizedResources
): NormalizedResources {
  Object.keys(data).forEach((resourceType) => {
    const relationshipAttributes = Object.values(
      schema.resources[resourceType].attributes
    ).filter(isInvertableRelationship);

    Object.entries(data[resourceType]).forEach(([resourceId, resource]) => {
      relationshipAttributes.forEach((relAttr) => {
        applyOrMap(resource[relAttr.name], (foreignId) => {
          if (foreignId) {
            const foreignInverses =
              data[relAttr.type][foreignId][relAttr.inverse];
            const okay = Array.isArray(foreignInverses)
              ? foreignInverses.includes(resourceId)
              : foreignInverses === resourceId;

            if (!okay) {
              throw new Error(
                `Relationship mismatch: (${resourceType}, ${resourceId}) does not have a corresponding inverse (${relAttr.type}, ${foreignId})`
              );
            }
          }
        });
      });
    });
  });

  return deepClone(data);
}

function partitionAttributes(
  schema: SchemaInterface,
  type: string
): [SchemaAttribute[], SchemaRelationship[]] {
  return partition(
    Object.values(schema.resources[type].attributes),
    (attribute) => !("cardinality" in attribute)
  ) as [SchemaAttribute[], SchemaRelationship[]];
}

type RelationshipCardinality =
  | "one-to-one"
  | "one-to-many"
  | "one-to-none"
  | "many-to-one"
  | "many-to-many"
  | "many-to-none";
function fullCardinality(
  schema: SchemaInterface,
  type: string,
  relationshipName: string
): RelationshipCardinality {
  const relDefinition = schema.resources[type].attributes[
    relationshipName
  ] as SchemaRelationship;

  if ("inverse" in relDefinition) {
    const invDefinition = schema.resources[relDefinition.type].attributes[
      relDefinition.inverse
    ] as SchemaRelationship;

    return `${relDefinition.cardinality}-to-${invDefinition.cardinality}` as RelationshipCardinality;
  }

  return `${relDefinition.cardinality}-to-none` as RelationshipCardinality;
}

export function MemoryStore(
  schema: SchemaInterface,
  { initialData = {} }: { initialData: NormalizedResources }
): Store {
  let data = copyAndClean(schema, initialData);
  const contextualOperations = operations(schema, data);

  function fleshedRelationship(type, relationship) {
    console.log({ type, relationship });
    return schema.resources[type].attributes[
      relationship
    ] as SchemaRelationship;
  }

  // PLAN ?:
  // 0. (Validation) - Ensure tree and query comport (should be somewhere else)
  // 1. Convert the (query, tree) pair into graph assertions
  // 2. Ensure the graph assertions are internally consistent
  // 3. Convert the graph assertions into operations and apply them
  function treeToGraphAssertions(tree: Tree | Tree[]) {
    if (Array.isArray(tree)) return tree.flatMap(treeToGraphAssertions);

    const { id, type } = tree;
    const [typeAttrs, typeRels] = partitionAttributes(schema, type);
    const assertNode = {
      assertion: "node",
      type,
      id,
      attributes: pick(
        tree.attributes,
        typeAttrs.map((attr) => attr.name)
      ),
    };

    const usedRelationships = pick(
      tree.attributes,
      typeRels.map((rel) => rel.name)
    );
    const assertRelationships = Object.entries(
      usedRelationships.map(([relationshipName, relationshipValue]) => {
        const cardinality = fullCardinality(schema, type, relationshipName);

        return {
          assertion:
            cardinality === "one-to-many"
              ? "assert-relationship"
              : "set-relationships",
          label: relationshipName,
          source: { type, id },
          target: { type: relationshipValue.type, id: relationshipValue.id },
        };
      })
    );

    // would be nice to have traversal handled elsewhere...
    const relatedAssertions = Object.values(usedRelationships).map(
      treeToGraphAssertions
    );

    return [assertNode, ...assertRelationships, ...relatedAssertions];
  }

  function graphAssertionsToOperations(graphAssertions) {
    const FINAL = Symbol("final");
    const nodes = makeEmptyData(schema);
    const arrows = makeEmptyData(schema);

    graphAssertions.forEach((assertionObj) => {
      const { type, id, assertion } = assertionObj;
      switch (assertion) {
        case "node": {
          if (id in nodes[type]) {
            const conflictKey = Object.keys(nodes[type][id]).find(
              (key) => nodes[type][id][key] !== assertionObj.attributes[key]
            );

            if (conflictKey) {
              const v1 = nodes[type][id][conflictKey];
              const v2 = assertionObj.attributes[conflictKey];
              throw new Error(
                `There is an inconsistency in the graph. (${type}, ${id}, ${conflictKey}) is marked as both ${v1} and ${v2}`
              );
            }

            nodes[type][id] = {
              ...nodes[type][id],
              ...assertionObj.attributes,
            };
          } else {
            nodes[type][id] = assertionObj.attributes;
          }
          break;
        }

        case "assert-relationship": {
          const { source, target, label } = assertionObj;
          const relDefinition = schema.resources[type].attributes[
            label
          ] as SchemaRelationship;

          const arrowExists = () => {
            const equalRefs = (left, right) =>
              left.type === right.type && left.id === right.id;
            const includesOrIs = (maybeArray, item) =>
              Array.isArray(maybeArray)
                ? maybeArray.some((ref) => equalRefs(ref, item))
                : equalRefs(maybeArray, item);

            if (
              source.id in arrows[relDefinition.type] &&
              includesOrIs(arrows[type][id][label], source)
            ) {
              return true;
            }

            if ("inverse" in relDefinition) {
              const invDefinition = schema.resources[relDefinition.type]
                .attributes[relDefinition.inverse] as SchemaRelationship;

              if (
                target.id in arrows[relDefinition.type] &&
                includesOrIs(
                  arrows[relDefinition.type][target.id][invDefinition.name],
                  source
                )
              ) {
                return true;
              }
            }

            return false;
          };

          if (arrowExists()) {
          }
        }

        default:
          break;
      }
    });
  }

  // create/update resources/attributes
  // create/update relationships
  async function extractOperations(
    updatedResourceOrResources: Resource | Resource[] | null,
    existingRefOrRefs: ResourceRef | ResourceRef[],
    prevResource: Resource | null,
    subQuery: QueryRelationship,
    skipDelete: boolean
  ): Promise<Operation[]> {
    const forceArray = <T>(arrayOrValue: T | T[]): T[] => {
      if (Array.isArray(arrayOrValue)) return arrayOrValue;
      return arrayOrValue == null ? [] : [arrayOrValue];
    };

    const updatedResources = forceArray(updatedResourceOrResources);
    const existingRefs = forceArray(existingRefOrRefs);
    const type = (updatedResources[0] || existingRefs[0]).type;

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
                relationshipDefinition
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
                skipDelete
              );
            }
          )
        ).then((x) => x.flat());

        if (!existingResource) {
          return [
            { type: "create", resource: updatedResource },
            ...related,
          ] as Operation[];
        } else if (!equals(updatedResource, existingResource)) {
          return [
            { type: "update", resource: updatedResource },
            ...related,
          ] as Operation[];
        } else {
          return related;
        }
      })
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
      id: string
    ): Tree | Tree[] => {
      const resource = data[type][id];
      const relatedType =
        schema.resources[type].attributes[relationshipName].type;

      return applyOrMap(resource[relationshipName], (relatedId) =>
        expandResource(relationshipDefinition, relatedType, relatedId)
      );
    };

    const expandResource = (
      subQuery: QueryRelationship,
      type: string,
      id: string
    ): Tree => {
      const resource = data[type][id];

      if (!resource) {
        return null;
      }

      const attributes = subQuery.attributes
        ? pick(resource.attributes, subQuery.attributes)
        : resource;
      const relationships =
        "relationships" in subQuery
          ? mapObj(
              subQuery.relationships,
              (relationshipDefinition, relationshipName) =>
                expandRelationship(
                  relationshipName,
                  relationshipDefinition,
                  type,
                  id
                )
            )
          : {};

      return {
        id,
        type,
        attributes: { ...attributes, ...relationships },
      };
    };

    const expandResources = (subQuery, type) =>
      Object.keys(data[type]).map((id) => expandResource(subQuery, type, id));

    const result =
      "id" in initQuery
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
            `Failed trying to create an already existing resource (${type}, ${id})`
          );
        }

        mutatingData[type][id] = resource;
        primitiveOperations.push({ operations: "create", resource });
      }
    );

    operations.forEach(async ({ operation, resource }) => {
      const { id, type } = resource;
      const existingResource =
        mutatingData[type][id] || (await contextualOperations.read(resource));

      switch (operation) {
        case "create": {
          break;
        }
        case "update": {
          if (!existingResource) {
            throw new Error(
              `Failed trying to update a nonexistant resource (${type}, ${id})`
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
              `Failed to delete a nonexistant resource (${type}, ${id})`
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
        true
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
        false
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
