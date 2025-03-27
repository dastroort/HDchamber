# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### ...

## [1.2.0-alpha] - 2025-03-27

### Added

- **Global object (app)**: a new global object named "app" has been introduced for centralized state and configuration management.
  Properties include:

  - initialTime, finalTime, and deltaTime for tracking and calculating time intervals.

  - angularSpeed for managing rotation speed.

  - dimensionsToRender alongside MIN_DIMENSIONS and MAX_DIMENSIONS for setting and validating dimensions.

  - isRendering to indicate the rendering state.

  - guiHandlers containing settings for GUI interactions such as projection mode, mesh selection, dimension selection, and rotation configuration.

- **Global constants**: CONTEXT_DIMENSION, DEPTH_MAPPING_DIMENSION, COLOR_MAPPING_DIMENSION, MAX_DRAWN_POINT_SIZE, BRIGHTNESS, FOG.

- **rotationScope(planes) function**: the rotationScope function added in geolib.js is designed to calculate the minimum context size required to handle rotations based on the axes provided.

- **SingletonMatrix.extendIn(dimensions)**: the function SingletonMatrix.extendIn(dimensions) is designed to adjust the size of the matrix managed by the SingletonMatrix class so that it conforms to a specified number of dimensions.

- **Integration of tools**: tools such as ESLint and Prettier have been added to ensure higher coding standards.

### Changed

- **Code refactoring**: properly renamed variables to maintain consistency (e.g. “shape” -> “mesh”). Better described the meaning of the conditions (e.g. instead of “this.nthDimension() > 2” it is preferable to write “this.nthDimension() >= DEPTH_MAPPING_DIMENSION” where “DEPTH_MAPPING_DIMENSION” = 3)

- **PointND.projectInto() method**: in the previous implementation, the projectInto() method relied on creating a temporary matrix for dimension reduction, involving manual transformations through nested loops or predefined matrices. The updated version replaces this with the .map method, enabling direct transformations of vertex coordinates. This change has improved the code’s clarity, efficiency, and performance by removing the need for temporary matrix creation and streamlining the logic for projections, whether orthogonal or perspective.

### Deprecated

- **Translation matrix**: translation matrices are a much more complex solution to a simple coordinate mapping of a point and can generate errors in the parameters of the “matrixPointMultiplication(matrix, point)” function.

## [1.1.0-alpha] - 2025-03-02

### Added

- **Dimension handler button**: a button that allows you to change the number of dimensions in real time. It is located on the right side of the GUI.

- **Rotation handler button**: a button that allows you to manage elementary rotations described by planes (e.g. XY) in real time. You can add new ones, remove them, or change the angular velocity coefficient (which refers to the global variable “angle.” It is located in the left side of the GUI.

### Changed

- **Matrix class**: improved Matrix class and its instance generation. Now Matrix class has Singleton design for a better performance (only one Matrix instance will be created and edited for multiuse).

- **Logic to render with hsl or not**: logic to render with hsl or not: previously the condition was based solely on the number of minimum dimensions in which the mesh can be displayed. But this excludes the case where the mesh has less dimensions than the composition of rotations (e.g. a square to which an XW rotation is applied). Now the logic depends on the nature of the rotations and not on the mesh.

### Removed

- **Old functions** that handled the creation of matrices such as “rotationsInNthDimension()” and “possibleRotationMainDiagonals().” There is no longer a need to get all possible rotation matrices if one is updated ad hoc via a singleton class instance.

## [1.0.0-demo] - 2024-08-21

### Added

- Everything!

[unreleased]: https://github.com/dastroort/hdchamber/compare/v1.2.0-alpha...HEAD
[1.2.0-alpha]: https://github.com/dastroort/hdchamber/compare/v1.1.0-alpha...v1.2.0-alpha
[1.1.0-alpha]: https://github.com/dastroort/hdchamber/compare/v1.0.0...v1.1.0-alpha
[1.0.0-demo]: https://github.com/dastroort/hdchamber/releases/tag/v1.0.0
