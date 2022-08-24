export class BlossomError extends Error {
  constructor(message, details = {}) {
    super(message);
    Object.keys(details).forEach((key) => {
      this[key] = details[key];
    });
  }
}

export const ERRORS = {
  FIRST_NOT_ALLOWED_ON_SINGULAR:
    "`first` may only be used on queries or relationships returning multiple resources",
  ID_FIELD_REQUIRED: "resources require an id field to be present",
  INVALID_EXCLUDED_PROPS:
    "one or more excluded properties in the query don't match the schema",
  INVALID_PROPS: "one or more properties in the query don't match the schema",
  INVALID_RELATIONSHIPS: "one or more sub queries in the query don't match the schema",
  INVALID_GET_QUERY_SYNTAX: "invalid query syntax in get query",
  INVALID_SET_QUERY_SYNTAX: "invalid query syntax in set query",
  INVALID_PROPERTY_FOR_ORDER: "only ordinal properties may be sorted on",
  MULTIPLE_TO_ONE_RELATIONSHIPS:
    "a resource has a to-one relationship with multiple resources in it",
  NO_INVERTIBLE_REFS_IN_SET_QUERIES:
    "relationships with inverses can't be used as properties in set queries. either the reference property was included in props/properties or allRefProps/allReferenceProperties was set to true",
  ORDER_NOT_ALLOWED_ON_SINGULAR:
    "`order` may only be used on queries or relationships returning multiple resources",
  QUERY_MISSING_CREATE_FIELDS:
    "the query provided is missing some fields required to create the record (fields not marked as optional and not having a default are required)",
  RESOURCE_REFERENCE_NOT_IN_STORE:
    "resource references must already be present in the store to be used",
  SHORTHAND_LONGHAND_BOTH_USED:
    "both the shorthand and longhand versions of an option were used",
};
