import { keyByProp, mapObj } from "@polygraph/utils";
import {
  CompiledSchema,
  CompiledSchemaProperties,
  CompiledSchemaRelationships,
  CompiledSchemaResource,
  Schema,
  SchemaProperty,
  SchemaResource,
} from "../types";

// function compileResource()
const validPropTypes = ["string", "number", "boolean"];
const validCardinalities = ["one", "many"];

// TODO: Validate schema structure with json-schema
export function compileSchema<S extends Schema>(schemaDefinition: S): CompiledSchema<S> {
  const resources = mapObj(
    schemaDefinition.resources as Record<keyof S["resources"], SchemaResource>,
    <ResType extends keyof S["resources"]>(resourceDef, resourceName: ResType) => {
      const properties = mapObj(
        resourceDef.properties,
        <PropType extends keyof S["resources"][ResType]["properties"]>(prop, name: PropType) => {
          if (!validPropTypes.includes(prop.type)) {
            throw new Error(`type on property ${resourceName}.${name} must be a valid type; it must be one of (${validPropTypes.join(", ")})`);
          }

          return { ...prop, name };
        },
      );

      const relationships = mapObj(
        resourceDef.relationships,
        <RelType extends keyof S["resources"][ResType]["relationships"]>(rel, name: RelType) => {
          if (!(Object.keys(schemaDefinition.resources).includes(rel.type))) {
            throw new Error(`relationship type ${resourceName}.${name}.${rel.type} does not reference a valid resource`);
          }
          if (rel.inverse && !(schemaDefinition.resources[rel.type].relationships[rel.inverse])) {
            throw new Error(`relationship type ${resourceName}.${name}.relationships.${rel.type} does not reference a valid inverse ${rel.type}.${rel.inverse}`);
          }
          if (!validCardinalities.includes(rel.cardinality)) {
            throw new Error(`relationship cardinality ${resourceName}.${name} is invalid; "${rel.cardinality}" is not one of ("${validCardinalities.join("\", \"")}")`);
          }

          return { ...rel, name };
        },
      );

      const resource = {
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

      return resource as CompiledSchemaResource<S, ResType>;
    },
  );

  return {
    ...schemaDefinition,
    resources,
  };
}
