# PostgreSQL Store Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [Pre-Log]

- Production-ready PostgreSQL backend implementation with full CRUD operations and automatic resource validation
- Advanced query engine translating SpectraGraph queries to optimized SQL with filtering, ordering, pagination, and nested relationship queries
- Automatic schema management generating PostgreSQL tables from SpectraGraph schemas with proper column types and indexes
- Bidirectional relationship management across one-to-one, one-to-many, and many-to-many relationships with automatic inverse synchronization
- Transaction support with automatic BEGIN/COMMIT/ROLLBACK wrapping for ACID compliance; works with both Pool and Client instances
- Batch merge operation for upserting entire resource trees with nested relationships in a single operation
- Parameterized queries with automatic SQL injection prevention
- Configuration-driven schema mapping with table prefixes and custom column type overrides
- Automatic snake_case/camelCase conversion between database columns and SpectraGraph resources
- Connection pooling support for production scalability
