# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### ...

## [1.1.0-alpha] - 2025-03-02

### Added

- **Dimension handler button**: a button that allows you to change the number of dimensions in real time. It is located on the right side of the GUI.

- **Rotation handler button**: a button that allows you to manage elementary rotations described by planes (e.g., XY) in real time. You can add new ones, remove them, or change the angular velocity coefficient (which refers to the global variable “angle.” It is located in the left side of the GUI.

### Changed

- **Matrix class**: improved Matrix class and its instance generation. Now Matrix class has Singleton design for a better performance (only one Matrix instance will be created and edited for multiuse).

- **Logic to render with hsl or not**: logic to render with hsl or not: previously the condition was based solely on the number of minimum dimensions in which the mesh can be displayed. But this excludes the case where the mesh has less dimensions than the composition of rotations (e.g. a square to which an XW rotation is applied). Now the logic depends on the nature of the rotations and not on the mesh.

### Removed

- **Old functions** that handled the creation of matrices such as “rotationsInNthDimension()” and “possibleRotationMainDiagonals().” There is no longer a need to get all possible rotation matrices if one is updated ad hoc via a singleton class instance.

## [1.0.0] (Demo) - 2024-08-21

### Added

- Everything!

[unreleased]: https://github.com/dastroort/hdchamber/compare/v1.1.0-alpha...HEAD
[1.1.0-alpha]: https://github.com/dastroort/hdchamber/compare/v1.0.0...v1.1.0-alpha
[1.0.0]: https://github.com/dastroort/hdchamber/releases/tag/v1.0.0
