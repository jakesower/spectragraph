import { keyByProp, mapObj } from "@polygraph/utils";

// function compileResource()
const validPropTypes = ["string", "number", "boolean"];
const validCardinalities = ["one", "many"];

// TODO: Validate schema structure with json-schema
export function compileSchema(schemaDefinition) {
  const resources = mapObj(
    schemaDefinition.resources,
    (resourceDef, resourceName) => {
      const properties = mapObj(
        resourceDef.properties,
        (prop, name) => {
          if (!validPropTypes.includes(prop.type)) {
            throw new Error(`type on property ${resourceName}.${name} must be a valid type; it must be one of (${validPropTypes.join(", ")})`);
          }

          return { ...prop, name };
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
          if (!validCardinalities.includes(rel.cardinality)) {
            throw new Error(`relationship cardinality ${resourceName}.${name} is invalid; "${rel.cardinality}" is not one of ("${validCardinalities.join("\", \"")}")`);
          }

          // return rel;
          return { ...rel, name };
        },
      // );
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

      return resource;
    },
  );

  return {
    ...schemaDefinition,
    resources,
  };
}
