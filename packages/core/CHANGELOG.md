# Core Package Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). This project is still in v0.x versioning and will not follow semantic versioning until v1.0. Instead, expect minor dot changes to sometimes introduce breaking changes. Patch versions will not break anything.

## [0.6.2] - 2025-11-20

No changes. Failed to build and deployed the wrong thing with 0.6.1.

## [0.6.1] - 2025-11-20

### Fixed

- `validateQueryResult` now correctly accepts `null` for to-one relationships in query results.

## [0.6.0] - 2025-11-19

### Changed

- **Breaking:** `buildResource(schema, resourceType, partialResource, options)` now returns a **flat resource** (attributes and relationship IDs at root level) instead of a normalized resource. This makes it more intuitive since it takes flat input and returns flat output.
- **New:** `buildNormalResource(schema, resourceType, partialResource, options)` added for building normalized resources with the `type`/`id`/`attributes`/`relationships` structure. This is the renamed version of the old `buildResource` behavior.

### Fixed

- `queryGraph` preserves `undefined` values instead of turning them into `null`.

### Migration Guide

If you were using `buildResource` and need a normalized resource:

```js
// Before
const resource = buildResource(schema, "bears", { name: "Grumpy" });

// After
const resource = buildNormalResource(schema, "bears", { name: "Grumpy" });
```

If you want a flat resource (new behavior):

```js
// After
const resource = buildResource(schema, "bears", { name: "Grumpy" });
// Returns: { name: "Grumpy", furColor: "brown", ... } (with defaults applied)
```

## [0.5.4] - 2025-11-11

### Added

- `getQueryExtent(schema, normalQuery)` - Analyzes a normalized query and returns an array of dot-notated paths representing all attributes and relationships required to fulfill the query's select clause. This is particularly useful for store implementations to optimize data fetching (e.g., determining which SQL columns to SELECT, which API fields to request, or which paths to validate for access control).
- `buildResource` now accepts an optional `options` parameter with an `includeRelationships` option. When set to `false`, relationship defaults are omitted, leaving only explicitly provided relationships. This is useful when building resources that will be linked later via `linkInverses()`, particularly in Multi-API store scenarios.

## [0.5.3] - 2025-11-05

- Strengthened validation on ID types.

## [0.5.2] - 2025-11-05

### Added

- Support for numeric IDs. Resource IDs can now be either strings or numbers throughout the system (previously only strings were supported). This applies to all resource types and relationships.

## [0.5.1] - 2025-11-04

### Added

- Support for `group.by: []` to create grand total queries that aggregate all resources into a single group. This enables computing aggregates across an entire collection without grouping dimensions (similar to SQL aggregates without GROUP BY).

## [0.5.0] - 2025-11-04

### Added

- **Grouping and aggregation queries** via `group` clause with support for:
  - Grouping by one or more attributes
  - Aggregate functions (`$count`, `$sum`, `$pluck`, etc.) via `aggregates`
  - Computed fields in `select` within groups
  - Filtering groups with `where` (similar to SQL HAVING)
  - Ordering, limiting, and offsetting groups
  - Nested grouping for multi-level aggregations
- Query validation and normalization support for group queries
- Comprehensive test coverage for grouping functionality

### Changed

- Split `query.js` into separate `query/normalize-query.js` and `query/validate-query.js` modules for better separation of concerns
- Query schema updated to support both `select` and `group` query types

## [0.4.0] - 2025-10-31

### Added

- `buildResource(schema, resourceType, partialResource)`. The function applies schema defaults and normalizes the resource in one step.
- `create`, `update`, and `upsert` now support `mutation(resourceType, flatResource)` and `mutation(normalResource)` forms as part of the Store interface.
- `storeMutation`. This wraps store handlers to support the new `mutation(resourceType, flatResource)` and `mutation(normalResource)` forms.
- `createGraphFromNormalResources`.

### Removed

- `createResource` was removed because it was barely used and had a confusing name.

### Changed

- **Breaking:** `mergeResources` renamed to `mergeNormalResources` to better communicate when flat and normal resources are expected.

### Fixed

- `normalizeResource` can now take in refs for relationship values and normalize them properly.

## [0.3.1] - 2025-10-29

- Schema normalization now produces `relationship` and `values` keys which are split up from `select` for ease of use

## [Pre-Log]

- Schema-driven graph query system with a powerful query language that mirrors desired output structure
- Flexible query capabilities including filtering, pagination, sorting, relationship traversal, computed fields, and advanced expressions
- Expression system with dual engines: full-featured SELECT engine (filters, aggregations, transformations) and performance-optimized WHERE engine (filtering and logic only)
- Comprehensive validation suite for schemas, queries, and resource operations (create/update/delete/merge) with both error-checking and fail-fast variants
- Graph manipulation primitives: create empty graphs from schemas, merge graphs intelligently, normalize resources from flat data, link inverse relationships, and traverse relationships
- Resource normalization to convert flat or nested resource objects into SpectraGraph's normalized format with separated attributes and relationships
- Direct graph querying via `queryGraph()` for in-memory normalized graphs
- Extensible custom expressions allowing domain-specific operations by extending default select and where engines
- Store integration errors (`ExpressionNotSupportedError`, `StoreOperationNotSupportedError`) for graceful store capability declaration
- Store-agnostic library design providing core primitives and types for diverse store implementations
