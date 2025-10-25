# SpectraGraph Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Removed

- **jsonapi-server package** - Removed JSON:API server implementation package
- **jsonapi-store package** - Removed JSON:API client store implementation package

### Added

- **WHERE clause pushdown** in multi-api-store for optimizing queries by converting predicates to API URL parameters
- **Changelogs** added to core, memory-store, postgres-store, sqlite-store, query-helpers, and multi-api-store packages

## [0.3.0] - 2024-10-05

### Changed

- Migrated to json-expressions `$matches` operator for WHERE clause normalization
- Updated json-expressions dependency with improved expression handling

### Added

- `ids` query parameter for targeted resource retrieval
- `parentResultPromise` to multi-api-store for better nested query handling
- Comprehensive query reference documentation (~1,800 lines)
- Licensing documentation

### Fixed

- Test suite fixes across sqlite-store, postgres-store, and interface-tests
- Test organization in multi-api-store (split into handlers, errors, subqueries)

## [Pre-Log]

SpectraGraph is a unified query language for multiple data sources that enables querying databases, APIs, and in-memory data with the same syntax.

### Core Features

- **Schema-driven graph query system** with powerful query language mirroring desired output structure
- **Store-agnostic architecture** - same queries work across PostgreSQL, SQLite, in-memory data, and REST APIs
- **Flexible querying** - filtering, pagination, sorting, relationship traversal, computed fields, advanced expressions
- **Automatic relationship handling** with bidirectional synchronization and intelligent graph merging
- **Dual expression engines** - full-featured SELECT engine and performance-optimized WHERE engine powered by json-expressions
- **Comprehensive validation** for schemas, queries, and resource operations with both error-checking and fail-fast variants
- **Graph manipulation primitives** - create, merge, normalize, link, and traverse graph data structures

### Store Implementations

- **@spectragraph/memory-store** - In-memory graph store with full CRUD, automatic inverse relationships, perfect for development and testing
- **@spectragraph/sqlite-store** - SQLite adapter with query optimization and relationship management
- **@spectragraph/postgres-store** - PostgreSQL adapter with advanced query capabilities
- **@spectragraph/multi-api-store** - Federate queries across multiple API endpoints with intelligent request batching and relationship resolution

### Supporting Packages

- **@spectragraph/core** - Core query engine, validation, and graph primitives
- **@spectragraph/query-helpers** - Utilities for building and manipulating queries
- **@spectragraph/sql-helpers** - Shared SQL generation utilities for database stores
- **@spectragraph/utils** - Common utilities used across packages
- **@spectragraph/interface-tests** - Shared test suite for validating store implementations
