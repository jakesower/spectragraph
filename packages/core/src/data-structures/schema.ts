import { inlineKey, mapObj } from "@polygraph/utils";

interface SchemaPropertyDefinition {
  type: string;
  meta?: unknown;
}

interface SchemaRelationshipDefinition {
  cardinality: "one" | "many";
  type: string;
  inverse?: string;
  meta?: unknown;
}

interface SchemaResourceDefinition {
  singular: string;
  plural: string;
  idField?: string;
  properties: {
    [k: string]: SchemaPropertyDefinition;
  };
  relationships: {
    [k: string]: SchemaRelationshipDefinition;
  };
  meta?: unknown;
}

interface SchemaDefinition {
  resources: { [k: string]: SchemaResourceDefinition };
  title?: string;
  meta?: unknown;
}

export interface SchemaProperty extends SchemaPropertyDefinition {
  name: string;
}

export interface SchemaRelationship extends SchemaRelationshipDefinition {
  name: string;
}

type SchemaAttribute = SchemaProperty | SchemaRelationship;
type SchemaAttributeObj = { [k: string]: SchemaAttribute };

export interface SchemaResource extends SchemaResourceDefinition {
  attributes: SchemaAttributeObj;
  attributesArray: SchemaAttribute[];
  name: string;
  idField: string;
  properties: { [k: string]: SchemaProperty };
  propertiesArray: SchemaProperty[];
  propertyNames: Set<string>;
  relationships: { [k: string]: SchemaRelationship };
  relationshipsArray: SchemaRelationship[];
  relationshipNames: Set<string>;
}

type SchemaResourceObj = { [k: string]: SchemaResource };
type SchemaPropertyObj = { [k: string]: SchemaProperty };
type SchemaRelationshipObj = { [k: string]: SchemaRelationship };

interface SchemaInterface {
  resources: { [k: string]: SchemaResource };
}

export interface SchemaType {
  inverse: (relDef: SchemaRelationship) => SchemaRelationship | null;
  resources: { [k: string]: SchemaResource };
  schema: SchemaInterface;

  // fullCardinality: (
  //   resType: string,
  //   relType: string
  // ) => RelationshipCardinality;
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
          "name",
        ) as SchemaPropertyObj;
        const relationships = inlineKey(
          resourceDef.relationships,
          "name",
        ) as SchemaRelationshipObj;

        return {
          idField: "id",
          ...resourceDef,
          attributes: { ...properties, ...relationships },
          attributesArray: [
            ...Object.values(properties),
            ...Object.values(relationships),
          ],
          name: resourceName,
          properties,
          propertiesArray: Object.values(properties),
          propertyNames: new Set(Object.keys(properties)),
          relationships,
          relationshipsArray: Object.values(relationships),
          relationshipNames: new Set(Object.keys(relationships)),
        };
      },
    );

    const processed = {
      idField: "id",
      ...schemaDefinition,
      resources,
    } as SchemaInterface;

    this.schema = processed;
    this.resources = processed.resources;
  }

  // fullCardinality(resType: string, relType: string): RelationshipCardinality {
  //   const relDef = this.schema.resources[resType].relationships[relType];

  //   if ("inverse" in relDef) {
  //     const invDef = this.inverse(resType);
  //     return `${relDef.cardinality}-to-${invDef.cardinality}` as RelationshipCardinality;
  //   }

  //   return `${relDef.cardinality}-to-none` as RelationshipCardinality;
  // }

  inverse(relDef: SchemaRelationship): SchemaRelationship | null {
    return "inverse" in relDef
      ? this.schema.resources[relDef.type].relationships[relDef.inverse]
      : null;
  }
}
