# Memory Store Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Changed

- Automatic ID generation now supports both integer and string ID types based on schema definition
- Integer IDs use auto-incrementing counters initialized from existing data (max ID + 1)
- String IDs continue to use UUID generation via `crypto.randomUUID()`

## [Pre-Log]

- In-memory graph store implementing the complete SpectraGraph Store interface with CRUD operations, querying, and bidirectional relationship management
- Automatic inverse relationship synchronization across the entire graph with cascading relationship cleanup on resource deletion
- Dual expression engines for SELECT (full capabilities) and WHERE (filtering-only) clauses with customizable engine support
- Complex resource tree insertion via merge operation that recursively creates/updates nested resources while preserving references to existing ones
- Automatic UUID generation for resources created without explicit IDs using `crypto.randomUUID()`
- Normalized graph storage organized by resource type and ID with reference-based relationships
- Schema-driven validation using AJV with support for custom validator instances
- Reference implementation for building custom SpectraGraph stores (database adapters, API clients, etc.)
- Development-focused features including fast deterministic test fixtures, local offline work, and seamless transition to production stores
