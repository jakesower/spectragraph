# Changelog

All notable changes to `@spectragraph/utils` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## Pre-1.0 History

Prior to version 1.0.0, `@spectragraph/utils` (versions 0.0.1 through 0.0.7) provided a small set of utility functions that were extracted from common patterns used across SpectraGraph packages. During this period, the package evolved organically through real-world usage in production projects.

**Key utilities established:**
- `applyOrMap` - Apply functions uniformly to items or arrays
- `applyOrMapAsync` - Async version of applyOrMap
- `pipeThru` - Functional pipeline composition
- `get` - Safe property access with path notation and wildcard support
- `promiseObjectAll` - Parallel promise resolution for objects

The package has been stable and in production use since early development, with the API surface remaining consistent throughout the 0.x versions. Version 1.0.0 represents the formal stabilization of this API with comprehensive test coverage and documentation.

---

## [Unreleased]

### Added
- Comprehensive test suite with 96%+ coverage
- TypeScript definitions for all exported functions
- Extensive documentation with Care Bears themed examples
- README with detailed API reference and usage examples

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

---

## Release Notes

When version 1.0.0 is released, it will include:

- **Stable API**: All four core utilities (`applyOrMap`, `applyOrMapAsync`, `get`, `pipeThru`, `promiseObjectAll`)
- **Production Ready**: 96%+ test coverage with comprehensive edge case handling
- **Well Documented**: Complete API reference, usage examples, and TypeScript support
- **Zero Dependencies**: Minimal footprint (except `json-expressions` for internal use)
- **Dual Module Support**: Both ESM and CommonJS builds available

---

## Version History

### 0.0.7 and earlier

Iterative development versions with API stabilization and production usage validation.
