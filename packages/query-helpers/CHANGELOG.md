# Query Helpers Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [Pre-Log]

- Query traversal utilities to flatten and iterate over nested query structures with `flattenQuery`, `flatMapQuery`, `forEachQuery`, and `someQuery` functions
- Query analysis capabilities to programmatically inspect which resource types, attributes, and relationships are requested in complex queries
- Rich breakdown metadata with each flattened query item including path, attributes, relationships, parent references, and type information
- Functional API design providing Array-like methods (`flatMap`, `forEach`, `some`) for intuitive iteration patterns over query trees
- Schema-driven parsing that automatically distinguishes attributes from relationships using schema definitions
- Parent relationship tracking with full parent chain references enabling bidirectional navigation within query structures
- Composable query inspection enabling use cases like permission checking, filter complexity analysis, and resource dependency mapping
- Lightweight implementation with minimal dependencies (only `es-toolkit` and `json-expressions`)
