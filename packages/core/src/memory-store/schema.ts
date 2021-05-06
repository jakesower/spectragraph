import { mapObj } from "@polygraph/utils";

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

interface SchemaResource extends SchemaResourceDefinition {
  properties: { [k: string]: SchemaProperty | SchemaRelationship };
  name: string;
}

interface SchemaProperty extends SchemaPropertyDefinition {
  name: string;
}

interface SchemaRelationship extends SchemaRelationshipDefinition {
  name: string;
}

interface SchemaInterface extends Schema {
  resources: { [k: string]: SchemaResource };
}

export interface SchemaType {
  schema: SchemaInterface;
  resources: { [k: string]: SchemaResource };
}

export class Schema implements SchemaType {
  public readonly schema: SchemaInterface;
  public readonly resources: { [k: string]: SchemaResource };

  constructor(schemaDefinition: SchemaDefinition) {
    const processed = {
      ...schemaDefinition,
      resources: mapObj(schemaDefinition.resources, (val, key) => {
        const nextProperties = mapObj(val.properties, (attrVal, attrKey) => ({
          ...attrVal,
          name: attrKey,
        }));

        return {
          ...val,
          name: key,
          properties: nextProperties,
        };
      }),
    } as SchemaInterface;

    this.schema = processed;
    this.resources = processed.resources;
  }

  resourceProperites(resourceName: string) {
    const resource = this.schema.resources[resourceName];
  }
}
