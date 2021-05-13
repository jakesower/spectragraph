import { applyOrMap, mapObj, pick } from "@polygraph/utils";
import { Query } from "../types";
import { SchemaType } from "./schema";

export interface ScopedTreeType {
  type: string;
  id: string;
  attributes: { [k: string]: any };

  scopeToQuery: (query: Query) => ScopedTreeType;
}

export class ScopedTree implements ScopedTreeType {
  public readonly attributes: { [k: string]: any };
  public readonly id: string;
  public readonly type: string;

  private readonly schema: SchemaType;

  constructor(schema: SchemaType, attrData) {
    const { attributes, id, type } = attrData;
    const schemaResDef = this.schema.resources[type];
    const allowedAttrs = schemaResDef.attributesArray.map((attr) => attr.name);

    this.attributes = pick(attributes, allowedAttrs);
    this.id = id;
    this.schema = schema;
    this.type = type;
  }

  // leaf rels?
  scopeToQuery(query: Query): ScopedTreeType {
    const scope = (subTreeAttrs, subQuery: Query) => {
      const { type } = subQuery;
      const schemaResDef = this.schema.resources[type];
      const allowedProps = schemaResDef.propertiesArray.map(
        (attr) => attr.name
      );
      const scopedProps = pick(subTreeAttrs, allowedProps);
      const scopedRels = mapObj(
        query.relationships || {},
        (relQuery, relName) => {
          const nextQuery = {
            ...relQuery,
            type: schemaResDef.relationships[relName].type,
          };

          return applyOrMap(subTreeAttrs[relName], (relAttrs) =>
            scope(relAttrs, nextQuery)
          );
        }
      );

      return { ...scopedProps, ...scopedRels };
    };

    return new ScopedTree(this.schema, {
      type: this.type,
      id: this.id,
      attributes: scope(this.attributes, query),
    });
  }

  // private
  private relationshipTrees() {
    return this.attributes;
  }
}
