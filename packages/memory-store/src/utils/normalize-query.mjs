import { mapObj, pipeThru, uniq } from "@polygraph/utils";
import { difference } from "@polygraph/utils/arrays";
import { PolygraphError } from "../validations/errors.mjs";
import { ERRORS } from "../strings.mjs";

function normalizeShorthandLonghandKeys(schema, query) {
  const shortLongPairs = [
    ["allNonRefProps", "allNonReferenceProperties"],
    ["allRefProps", "allReferenceProperties"],
    ["excludedProps", "excludedProperties"],
    ["props", "properties"],
    ["rels", "relationships"],

  ];

  const outQuery = { ...query };
  shortLongPairs.forEach(([shorthand, longhand]) => {
    if ((shorthand in query) && (longhand in query)) {
      throw new PolygraphError(ERRORS.SHORTHAND_LONGHAND_BOTH_USED, {
        query,
        shorthand,
        longhand,
      });
    }

    if ((shorthand in query) || (longhand in query)) {
      outQuery[longhand] = query[shorthand] ?? query[longhand];
      delete outQuery[shorthand];
    }
  });

  return outQuery;
}

function normalizeProps(schema, query) {
  const schemaResDef = schema.resources[query.type];
  const schemaNonRelKeys = Object.keys(schemaResDef.properties);
  const schemaRelKeys = Object.keys(schemaResDef.relationships);
  const schemaPropKeys = [...schemaNonRelKeys, ...schemaRelKeys];
  const excludedProperties = query.excludedProperties ?? [];

  const availableProps = uniq([
    ...(query.allNonReferenceProperties ? schemaNonRelKeys : []),
    ...(query.allReferenceProperties ? schemaRelKeys : []),
    ...(query.properties ?? []),
  ]);
  const properties = difference(availableProps, excludedProperties);

  const invalidProperties = difference(properties, schemaPropKeys);
  if (invalidProperties.length > 0) {
    throw new PolygraphError(ERRORS.INVALID_PROPS, {
      invalidProperties,
      queryProperties: properties,
      schemaProperties: schemaPropKeys,
    });
  }

  const invalidExcludedProperties = difference(excludedProperties, schemaPropKeys);
  if (invalidProperties.length > 0) {
    throw new PolygraphError(ERRORS.INVALID_EXCLUDED_PROPS, {
      invalidProperties: invalidExcludedProperties,
      queryProperties: properties,
      schemaProperties: schemaPropKeys,
    });
  }

  return { ...query, properties };
}

function normalizeAndExpandRels(schema, query) {
  if (!("relationships" in query)) {
    return { ...query, relationships: {} };
  }

  const schemaResDef = schema.resources[query.type];
  const schemaRelationshipKeys = Object.keys(schemaResDef.relationships);
  const queryRelationshipKeys = Object.keys(query.relationships);
  const invalidRelationships = difference(queryRelationshipKeys, queryRelationshipKeys);

  if (invalidRelationships.length > 0) {
    throw new PolygraphError(ERRORS.INVALID_RELATIONSHIPS, {
      invalidRelationships,
      queryRelationshipKeys,
      schemaRelationshipKeys,
    });
  }

  const relationships = mapObj(query.relationships, (rel, relKey) => {
    const schemaRelDef = schemaResDef.relationships[relKey];
    return normalizeQuery(schema, { ...rel, type: schemaRelDef.relatedType });
  });

  return { ...query, relationships };
}

export function normalizeQuery(schema, query) {
  return pipeThru(query, [
    (q) => normalizeShorthandLonghandKeys(schema, q),
    (q) => normalizeProps(schema, q),
    (q) => normalizeAndExpandRels(schema, q),
  ]);
}
