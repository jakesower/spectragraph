import { keyByProp, mapObj } from "@polygraph/utils";
import {
  CompiledSchema,
  CompiledSchemaProperty,
  CompiledSchemaRelationship,
  CompiledSchemaResource,
  Schema,
  SchemaResource,
} from "../types";

// function compileResource()
const validPropTypes = ["string", "number", "boolean"];
const validCardinalities = ["one", "many"];

// TODO: Validate schema structure with json-schema
export function compileSchema<S extends Schema>(schemaDefinition: S): CompiledSchema<S> {
  const resources = mapObj(
    schemaDefinition.resources as Record<keyof S["resources"], SchemaResource>,
    (resourceDef, resourceName) => {
      const properties = mapObj(
        resourceDef.properties,
        (prop, name) => {
          if (!validPropTypes.includes(prop.type)) {
            throw new Error(`type on property ${resourceName}.${name} must be a valid type; it must be one of (${validPropTypes.join(", ")})`);
          }

          return { ...prop, name } as CompiledSchemaProperty;
        },
      );

      const relationships = mapObj(
        resourceDef.relationships,
        (rel, name) => {
          if (!(Object.keys(schemaDefinition.resources).includes(rel.type))) {
            throw new Error(`relationship type ${resourceName}.${name}.${rel.type} does not reference a valid resource`);
          }
          if (rel.inverse && !(schemaDefinition.resources[rel.type].relationships[rel.inverse])) {
            throw new Error(`relationship type ${resourceName}.${name}.relationships.${rel.type} does not reference a valid inverse ${rel.type}.${rel.inverse}`);
          }
          if (!validCardinalities.includes(rel.type)) {
            throw new Error(`relationship cardinality ${resourceName}.${name}.${rel.type} is invalid; it must be one of (${validCardinalities.join(", ")})`);
          }

          return { ...rel, name } as CompiledSchemaRelationship<S>;
        },
      );

      const resource: CompiledSchemaResource<S, typeof resourceName> = {
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
        relationshipsByType: keyByProp(Object.values(relationships), "type"),
        relationshipNames: Object.keys(relationships),
        relationshipNamesSet: new Set(Object.keys(relationships)),
      };

      return resource;
    },
  );

  return {
    ...schemaDefinition,
    resources,
  };
}
