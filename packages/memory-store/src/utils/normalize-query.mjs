import { pipeThru, uniq } from "@blossom/utils";
import { filterObj, mapObj, partitionObj } from "@blossom/utils/objects";
import { difference } from "@blossom/utils/arrays";
import { blossomError } from "../validations/errors.mjs";
import { ERRORS } from "../strings.mjs";

function normalizeShorthandLonghandKeys(query) {
  const shortLongPairs = [
    ["allNonRefProps", "allNonReferenceProperties"],
    ["allRefProps", "allReferenceProperties"],
    ["excludedProps", "excludedProperties"],
    ["props", "properties"],
    ["rels", "relationships"],
  ];

  const outQuery = { ...query };
  shortLongPairs.forEach(([shorthand, longhand]) => {
    if (shorthand in query && longhand in query) {
      throw new blossomError(ERRORS.SHORTHAND_LONGHAND_BOTH_USED, {
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
  const [relProps, nonRelProps] = partitionObj(
    schemaResDef.properties,
    ({ type }) => type === "relationship",
  );
  const schemaNonRelKeys = Object.keys(nonRelProps);
  const schemaRelKeys = Object.keys(relProps);
  const schemaPropKeys = Object.keys(schemaResDef.properties);
  const excludedProperties = query.excludedProperties ?? [];

  const availableProps = uniq([
    ...(query.allNonReferenceProperties ? schemaNonRelKeys : []),
    ...(query.allReferenceProperties ? schemaRelKeys : []),
    ...(query.properties ?? []),
  ]);
  const properties = difference(availableProps, excludedProperties);

  const invalidProperties = difference(properties, schemaPropKeys);
  if (invalidProperties.length > 0) {
    throw new blossomError(ERRORS.INVALID_PROPS, {
      invalidProperties,
      queryProperties: properties,
      schemaProperties: schemaPropKeys,
    });
  }

  const invalidExcludedProperties = difference(excludedProperties, schemaPropKeys);
  if (invalidProperties.length > 0) {
    throw new blossomError(ERRORS.INVALID_EXCLUDED_PROPS, {
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
    throw new blossomError(ERRORS.INVALID_RELATIONSHIPS, {
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

export function normalizeQuery(schema, query) {
  return pipeThru(query, [
    (q) => normalizeShorthandLonghandKeys(q),
    (q) => normalizeProps(schema, q),
    (q) => normalizeAndExpandRels(schema, q),
  ]);
}
