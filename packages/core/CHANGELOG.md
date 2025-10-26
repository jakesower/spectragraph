# Core Package Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

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
