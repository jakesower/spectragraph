import { inlineKey, mapObj } from "@polygraph/utils";
import {
  CompiledSchema,
  CompiledSchemaProperty,
  CompiledSchemaRelationship,
  CompiledSchemaResource,
  Schema,
} from "../types";

export function compileSchema(schemaDefinition: Schema): CompiledSchema {
  const resources: Record<string, CompiledSchemaResource> = mapObj(
    schemaDefinition.resources,
    (resourceDef, resourceName) => {
      const properties = inlineKey(
        resourceDef.properties,
        "name",
      ) as Record<string, CompiledSchemaProperty>;
      const relationships = inlineKey(
        resourceDef.relationships,
        "name",
      ) as Record<string, CompiledSchemaRelationship>;

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
        propertyNames: Object.keys(properties),
        propertyNamesSet: new Set(Object.keys(properties)),
        relationships,
        relationshipsArray: Object.values(relationships),
        relationshipNames: Object.keys(relationships),
        relationshipNamesSet: new Set(Object.keys(relationships)),
      };
    },
  );

  return {
    ...schemaDefinition,
    resources,
  };
}
