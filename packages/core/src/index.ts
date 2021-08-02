/**
 * Whose job?
 *
 * Note: Everything is done within the context of a schema
 *
 * Key Concepts:
 * - Schema
 * - Store
 * - Resource
 * - Query
 * - Graph
 * - Operation
 *
 * Core:
 * - query(query) -> graph | [graph]
 * - mergeQuery(query, graph | [graph]) -> graph | [graph]
 * - replaceQuery(query, graph | [graph]) -> graph | [graph]
 *
 * Store:
 * MUST:
 * - create(resource) -> ok
 * - destroy(resource) -> ok
 * - fetchById(type, id) -> resource
 * - fetchMany(conditions) -> resource set
 * - fetchOne(conditions) -> resource
 * - update(resource) -> ok
 *
 * MAY (THANKS TO CORE STORE):
 * - fetch(query) -> graph
 * - replaceRelationship
 *
 * Split up attributes and relationships?
 *
 * + Much easier to deal with joins
 * - Annoying to write
 */
