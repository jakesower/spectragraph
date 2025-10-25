# Multi-API Store Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- **WHERE clause pushdown system** that converts query predicates to API URL parameters
  - `createWherePushdownEngine` helper for defining custom pushdown handlers per expression type
  - `pushdown` configuration option for specifying clause-to-engine mappings
  - Engines return both query parameters for the API and unhandled predicates for local evaluation
  - Integrates with json-expressions for flexible predicate transformation
