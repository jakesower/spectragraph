import { pipeThru, uniq } from "@polygraph/utils";
import { filterObj, mapObj } from "@polygraph/utils/objects";
import { difference } from "@polygraph/utils/arrays";
import { ensureValidGetQuerySyntax, ensureValidSetQuerySyntax } from "../validation.mjs";
import { ERRORS, PolygraphError } from "../errors.mjs";

function normalizeShorthandLonghandKeys(query) {
  const shortLongPairs = [
    ["allProps", "allProperties"],
    ["excludedProps", "excludedProperties"],
    ["props", "properties"],
    ["rels", "relationships"],
  ];

  const outQuery = { ...query };
  shortLongPairs.forEach(([shorthand, longhand]) => {
    if (shorthand in query && longhand in query) {
      throw new PolygraphError(ERRORS.SHORTHAND_LONGHAND_BOTH_USED, {
        query,
        shorthand,
        longhand,
      });
    }

    if (shorthand in query || longhand in query) {
      outQuery[longhand] = query[shorthand] ?? query[longhand];
      delete outQuery[shorthand];
    }
  });

  return outQuery;
}

function normalizeProps(schema, query) {
  const schemaResDef = schema.resources[query.type];
  const nonRelProps = filterObj(
    schemaResDef.properties,
    ({ type }) => type !== "relationship",
  );
  const schemaNonRelKeys = Object.keys(nonRelProps);
  const schemaPropKeys = Object.keys(schemaResDef.properties);
  const excludedProperties = query.excludedProperties ?? [];

  const availableProps = uniq([
    ...(query.allProperties ? schemaNonRelKeys : []),
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
  const relProps = filterObj(
    schemaResDef.properties,
    ({ type }) => type === "relationship",
  );

  const schemaRelationshipKeys = Object.keys(relProps);
  const queryRelationshipKeys = Object.keys(query.relationships);
  const invalidRelationships = difference(queryRelationshipKeys, schemaRelationshipKeys);

  if (invalidRelationships.length > 0) {
    throw new PolygraphError(ERRORS.INVALID_RELATIONSHIPS, {
      invalidRelationships,
      queryRelationshipKeys,
      schemaRelationshipKeys,
    });
  }

  const relationships = mapObj(query.relationships, (rel, relKey) => {
    const schemaRelDef = schemaResDef.properties[relKey];
    return normalizeQuery(schema, { ...rel, type: schemaRelDef.relatedType });
  });

  return { ...query, relationships };
}

function normalizeQuery(schema, query) {
  return pipeThru(query, [
    (q) => normalizeShorthandLonghandKeys(q),
    (q) => normalizeProps(schema, q),
    (q) => normalizeAndExpandRels(schema, q),
  ]);
}

export function normalizeGetQuery(schema, query) {
  ensureValidGetQuerySyntax(schema, query);
  return normalizeQuery(schema, query);
}

export function normalizeSetQuery(schema, query) {
  ensureValidSetQuerySyntax(schema, query);
  return normalizeQuery(schema, query);
}
