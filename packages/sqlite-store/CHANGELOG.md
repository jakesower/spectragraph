# SQLite Store Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- Support for `before` and `after` subclauses in `slice` (via @spectragraph/core upgrade). These are applied in post-processing rather than translated to SQL. See core changelog for details.

## [Pre-Log]

- Schema-driven SQLite backend with full CRUD operations (create, read, update, delete, upsert)
- Advanced query capabilities including complex filtering with logical operators, relationship traversal, nested queries, and pagination
- Automatic SQLite table creation from SpectraGraph schemas with proper column type mapping and join table generation
- Relationship handling for one-to-many and many-to-many patterns with automatic foreign key and join table management
- Transaction management with BEGIN/COMMIT/ROLLBACK wrapping for write operations
- Merge operations for bulk upsert of resource trees with nested relationships
- 5-step query pipeline: parse → compose → assemble → execute → transform for efficient SQL generation
- REGEXP pattern matching support via custom SQLite function
- Configurable table and column mappings for integration with existing databases
- Database utilities including `createTables()` for schema initialization and `seed()` for data population
