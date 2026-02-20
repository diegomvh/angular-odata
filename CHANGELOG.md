# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.143.0] - 2026-02-20

### Added

- Add custom region support to apigen schematic to preserve user code between regenerations

### Fixed

- Fix imports in apigen schematic

### Changed

- Remove inlineSources from tsconfig.lib.json

## [0.142.0] - 2025-12-23

### Fixed

- Fix remove collection model
- Fix Imports

### Changed

- Update Angular 21
- Tuning cache

### Removed

- remove jasmin

### Dependencies

- add jsdom

## [0.141.0] - 2025-10-29

### Added

- GeoProperties support
- Collection and Model support in config
- Models and Collections from api-config
- Navigation Properties support
- Models and Collections
- getter, setters, fetch, resource

### Fixed

- Fix: Metadata parser bug (Constructor incorrectly checks version of a metadata, #98)

### Changed

- ODataResponseJson
- ES2022 use declare (Model fields are 'declare', type-only field declarations)
- Types

## [0.140.1] - 2025-09-18

### Fixed

- Fix builder test (Missing type in test)
- Fix `ExpandOptions['select']`, `Transform['aggregate']`, `Transform['filter']` and some other TS type definitions
- Fix order of transform operations
