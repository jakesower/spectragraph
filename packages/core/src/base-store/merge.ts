import { pick } from "@polygraph/utils";
import { Schema, SchemaProperty, SchemaRelationship } from "../data-structures/schema";
import { CrudStore, Query, Tree } from "../types";
import { WorkingQuiverType, WorkingQuiver } from "../data-structures/working-quiver";

type MergeFn = (queryObj: Query, tree: Tree) => Promise<any>;

function asArray<T>(valOrArray: T | T[]): T[] {
  return Array.isArray(valOrArray) ? valOrArray : [valOrArray];
}

/**
 * Forms of data:
 *
 * - Quiver: object by type/id
 * - Tree: data only, requiring a query for context
 * - Something else: contextualized data (tree + query + schema) -- traversable
 */

function reduceTree<T>(tree: Tree, initValue: T, reducer: (acc: T, node: Tree) => T): T {
  return initValue;
}

export async function makeReplace(schema: Schema, store: CrudStore): MergeFn {
  async function existingQuiver(tree: Tree | Tree[]) {

  }

  async function treeToQuiver(tree: Tree | Tree[]): Promise<WorkingQuiver> {
    // gonna build up a working quiver using mutable state for performance
    const quiver = new WorkingQuiver(schema);

    const runSubTree = async (subTree: Tree | Tree[]) => {
      if (Array.isArray(subTree)) {
        return Promise.all(subTree.map(runSubTree));
      }

      const { id, type } = subTree;
      const existingNode = await store.findOne(subTree);
      const resSchemaDef = schema.resources[type];
      const properties = pick(
        subTree.attributes,
        resSchemaDef.propertiesArray.map((attr) => attr.name),
      ) as { [k: string]: unknown };
      const relationships = pick(
        subTree.attributes,
        resSchemaDef.relationshipsArray.map((rel) => rel.name),
      ) as { [k: string]: Tree | Tree[] };

      // set node/arrows for this
      quiver.assertNode({ type, id, properties });
      Object.entries(relationships).forEach(([relName, relValue]) => {
        const source = { type, id };
        const existingTargets = existingNode.attributes[relName] as string | string[];
        const relType = resSchemaDef.relationships[relName].type;

        quiver.setOutgoingArrows(
          source,
          relName,
          asArray(relValue),
          asArray(existingTargets).map((value) => ({ type: relType, id: value })),
        );
      });

      await Promise.all(Object.values(relationships).map(runSubTree));

      return quiver;
    };

    await runSubTree(tree);

    return quiver;
  }

  async function runQuiverOperations(quiver: WorkingQuiverType) {
    const {
      assertedNodes,
      assertedArrows,
      deletedNodes,
      deletedArrows,
    } = quiver.toObject();

    const upsertNodesPs = assertedNodes.map((node) => store.upsert({
      type: node.type,
      id: node.id,
      attributes: node.properties,
    }));
    const deleteRelationshipsPs = deletedArrows.map(
      ({ source, target, label }) => store.deleteRelationship(source, target, label),
    );

    await Promise.all([...upsertNodesPs, ...deleteRelationshipsPs]);

    const deletedNodesP = deletedNodes.map((node) => store.delete({
      type: node.type,
      id: node.id,
      attributes: node.properties,
    }));
    const upsertRelationshipsP = assertedArrows.map(
      ({ source, target, label }) => store.upsertRelationship(source, target, label),
    );

    await Promise.all([deletedNodesP, upsertRelationshipsP]);
  }

  return async function merge(query: Query, tree: Tree | Tree[]): Promise<unknown> {
    const quiver = await treeToQuiver(tree);
  };
}
