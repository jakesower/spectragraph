import { inlineKey, mapObj } from "@polygraph/utils";

interface SchemaResourceDefinition {
  singular: string;
  plural: string;
  properties: {
    [k: string]: SchemaPropertyDefinition;
  };
  relationships: {
    [k: string]: SchemaRelationshipDefinition;
  };
  meta?: any;
}

interface SchemaPropertyDefinition {
  type: string;
  meta?: any;
}

interface SchemaRelationshipDefinition {
  cardinality: "one" | "many";
  type: string;
  inverse?: string;
  meta?: any;
}

interface SchemaDefinition {
  resources: { [k: string]: SchemaResourceDefinition };
  title?: string;
  meta?: any;
}

type SchemaAttribute = SchemaProperty | SchemaRelationship;
type SchemaAttributeObj = { [k: string]: SchemaAttribute };

export interface SchemaResource extends SchemaResourceDefinition {
  attributes: SchemaAttributeObj;
  attributesArray: SchemaAttribute[];
  properties: { [k: string]: SchemaProperty };
  propertiesArray: SchemaProperty[];
  relationships: { [k: string]: SchemaRelationship };
  relationshipsArray: SchemaRelationship[];
  name: string;
}

type SchemaResourceObj = { [k: string]: SchemaResource };
type SchemaPropertyObj = { [k: string]: SchemaProperty };
type SchemaRelationshipObj = { [k: string]: SchemaRelationship };

export interface SchemaProperty extends SchemaPropertyDefinition {
  name: string;
}

export interface SchemaRelationship extends SchemaRelationshipDefinition {
  name: string;
}

interface SchemaInterface extends Schema {
  resources: { [k: string]: SchemaResource };
}

export interface SchemaType {
  inverse: (relDef: SchemaRelationship) => SchemaRelationship | null;
  resources: { [k: string]: SchemaResource };
  schema: SchemaInterface;

  fullCardinality: (
    resType: string,
    relType: string
  ) => RelationshipCardinality;
}

type RelationshipCardinality =
  | "one-to-one"
  | "one-to-many"
  | "one-to-none"
  | "many-to-one"
  | "many-to-many"
  | "many-to-none";

export class Schema implements SchemaType {
  public readonly schema: SchemaInterface;
  public readonly resources: { [k: string]: SchemaResource };

  constructor(schemaDefinition: SchemaDefinition) {
    const resources: SchemaResourceObj = mapObj(
      schemaDefinition.resources,
      (resourceDef, resourceName) => {
        const properties = inlineKey(
          resourceDef.properties,
          "name"
        ) as SchemaPropertyObj;
        const relationships = inlineKey(
          resourceDef.relationships,
          "name"
        ) as SchemaRelationshipObj;

        return {
          ...resourceDef,
          name: resourceName,
          attributes: { ...properties, ...relationships },
          attributesArray: [
            ...Object.values(properties),
            ...Object.values(relationships),
          ],
          properties,
          propertiesArray: Object.values(properties),
          relationships,
          relationshipsArray: Object.values(relationships),
        };
      }
    );

    const processed = {
      ...schemaDefinition,
      resources,
    } as SchemaInterface;

    this.schema = processed;
    this.resources = processed.resources;
  }

  fullCardinality(resType, relType) {
    const relDef = this.schema.resources[resType].relationships[relType];

    if ("inverse" in relDef) {
      const invDef = this.inverse(resType, relType);
      return `${relDef.cardinality}-to-${invDef.cardinality}` as RelationshipCardinality;
    }

    return `${relDef.cardinality}-to-none` as RelationshipCardinality;
  }

  inverse(relDef: SchemaRelationship): SchemaRelationship | null {
    return "inverse" in relDef
      ? this.schema.resources[relDef.type].relationships[relDef.inverse]
      : null;
  }
}
