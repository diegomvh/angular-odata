# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add custom region support to apigen schematic to preserve user code between regenerations

### Fixed

- Fix imports in apigen schematic

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

[unreleased]: https://github.com/diegomvh/angular-odata/compare/v0.142.0...main
[0.142.0]: https://github.com/diegomvh/angular-odata/compare/v0.141.0...v0.142.0
[0.141.0]: https://github.com/diegomvh/angular-odata/compare/v0.140.1...v0.141.0
[0.140.1]: https://github.com/diegomvh/angular-odata/compare/v0.140.0...v0.140.1
[0.140.0]: https://github.com/diegomvh/angular-odata/compare/v0.128.0...v0.140.0
[0.128.0]: https://github.com/diegomvh/angular-odata/compare/v0.127.0...v0.128.0
[0.127.0]: https://github.com/diegomvh/angular-odata/compare/v0.126.0...v0.127.0
[0.126.0]: https://github.com/diegomvh/angular-odata/compare/v0.125.0...v0.126.0
[0.125.0]: https://github.com/diegomvh/angular-odata/compare/v0.124.0...v0.125.0
[0.124.0]: https://github.com/diegomvh/angular-odata/compare/v0.123.0...v0.124.0
[0.123.0]: https://github.com/diegomvh/angular-odata/compare/v0.122.0...v0.123.0
[0.122.0]: https://github.com/diegomvh/angular-odata/compare/v0.121.0...v0.122.0
[0.121.0]: https://github.com/diegomvh/angular-odata/compare/v0.120.0...v0.121.0
[0.120.0]: https://github.com/diegomvh/angular-odata/compare/v0.115.0...v0.120.0
[0.115.0]: https://github.com/diegomvh/angular-odata/compare/v0.110.0...v0.115.0
[0.110.0]: https://github.com/diegomvh/angular-odata/compare/v0.105.0...v0.110.0
[0.105.0]: https://github.com/diegomvh/angular-odata/compare/v0.102.0...v0.105.0
