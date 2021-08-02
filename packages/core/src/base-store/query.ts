import { applyOrMap, mapObj, pick } from "@polygraph/utils";
import { Schema } from "../data-structures/schema";
import {
  CrudStore, Query, QueryRelationship, DataTree,
} from "../types";

type QueryFn = (queryObj: Query) => Promise<Tree | Tree[]>;
export function query(schema: Schema, store: CrudStore): QueryFn {
  async function expandRelationship(
    relationshipName: string,
    relationshipDefinition: QueryRelationship,
    type: string,
    id: string,
  ): Promise<DataTree | DataTree[]> {
    const resource = await store.findOne({ type, id });
    const relatedType = schema.resources[type].properties[relationshipName].type;

    return applyOrMap(
      resource[relationshipName],
      (relatedId) => expandResource(relationshipDefinition, relatedType, relatedId),
    );
  }

  async function expandResource(
    subQuery: QueryRelationship,
    type: string,
    id: string,
  ): Promise<DataTree> {
    const resource = await store.findOne({ type, id });

    if (!resource) {
      return null;
    }

    const properties = "properties" in subQuery
      ? pick(resource.attributes, subQuery.properties)
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
      attributes: { ...properties, ...relationships },
    };
  }

  async function expandResources(subQuery: QueryRelationship, type: string): Promise<DataTree[]> {
    const resources = await store.find(type);
    return Promise.all(Object.keys(resources).map((id) => expandResource(subQuery, type, id)));
  }

  return async function (initQuery: Query): Promise<DataTree | DataTree[]> {
    const result = "id" in initQuery
      ? await expandResource(initQuery, initQuery.type, initQuery.id)
      : await expandResources(initQuery, initQuery.type);

    return result;
  };
}
