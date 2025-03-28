const canvas = document.querySelector("canvas");
const CONTEXT_DIMENSION = 2;
let context = canvas.getContext(CONTEXT_DIMENSION + "d");
const screenDimensions = { width: window.innerWidth, height: (77.5 / 100) * window.innerHeight };
[canvas.width, canvas.height] = [screenDimensions.width, screenDimensions.height];

const DEFAULT_RENDER_SCALE = 200;
const DEFAULT_SIZE = 1.5;
const DEFAULT_COMPLEXITY = 8;
const cameraDistance = 3;
const cameraZoom = 2;
const axisIdentifiers = "xyzwvu";
const DEPTH_MAPPING_DIMENSION = 3;
const COLOR_MAPPING_DIMENSION = 4;
const MAX_DRAWN_POINT_SIZE = 8;
const BRIGHTNESS = 300;
const FOG = 0.5;

// No more for loops. Instead, forEach and reduce are used to improve readability and performance.
// Time complexity: O(m * n) where m is the number of rows and n is the number of columns.
// Space complexity: O(m) for storing the result coordinates.
// Acoording to: https://www.bigocalc.com/
function matrixPointMultiplication(matrix, point) {
  let resultCoordinates = [];
  const matrixColumns = matrix[0].length;
  // Check if the matrix columns match the point's dimensions before proceeding with the multiplication.
  if (matrixColumns !== point.nthDimension()) throw new Error(`Matrix multiplication cannot exist:\nmatrix length:\t${matrixColumns},\npoint length:\t${point.nthDimension()}`);
  matrix.forEach((row, rowIndex) => {
    // Use reduce to calculate the weighted sum of the current row and the point's coordinates. No more nested loops.
    let sum = row.reduce((sum, currentValue, valueIndex) => {
      return sum + currentValue * point.coordinates[valueIndex];
    }, 0); // Without specifying it, it starts from the second value of the array.
    if (isNaN(sum)) throw new Error("sum is NaN");
    resultCoordinates[rowIndex] = sum;
  });
  return new PointND(...resultCoordinates);
}

function rotationScope(planes) {
  let scopeIndex = 0;
  planes.forEach((plane) => {
    const firstPlaneAxis = plane[0];
    const secondPlaneAxis = plane[1];
    scopeIndex = Math.max(scopeIndex, axisIdentifiers.indexOf(firstPlaneAxis), axisIdentifiers.indexOf(secondPlaneAxis));
  });
  return scopeIndex + 1;
}

// ---------------------- HELPER METHODS TO CREATE A WELLKNOWN TRASFORMATION MATRIX ----------------------
class SingletonMatrix {
  static #instance = null;

  constructor(rows, cols) {
    if (SingletonMatrix.#instance) {
      throw new Error("Use init() method.");
    }
    this.rows = rows;
    this.cols = cols;
    this.value = Array(rows)
      .fill()
      .map(() => Array(cols).fill(0));
    this.#setDefault(rows, cols);
  }

  static init(rows, cols = rows) {
    if (!SingletonMatrix.#instance) {
      SingletonMatrix.#instance = new SingletonMatrix(rows, cols);
    }
    return SingletonMatrix.#instance;
  }

  #setDefault(rows, cols) {
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (i === j) {
          this.value[i][j] = 1;
        } else {
          this.value[i][j] = 0;
        }
      }
    }
  }

  set(flag, param, reset = true) {
    if (!SingletonMatrix.#instance) {
      throw new Error("There is no instance.");
    }
    if (reset) {
      this.reset();
    }
    switch (flag) {
      case "t":
        this.setTranslation(param);
        break;
      case "r":
        if (typeof param !== "object") {
          throw new Error("Param for rotation must be an array: [stamp, angle]");
        }
        this.setRotation(param[0], param[1]);
        break;
      default:
        throw new Error("Invalid flag.");
    }
    this.#update();
  }

  destroy() {
    if (!SingletonMatrix.#instance) {
      throw new Error("Cannot destroy a null instance.");
    }
    SingletonMatrix.#instance = null;
  }

  reset() {
    let rows = this.rows;
    let cols = this.cols;
    this.destroy();
    SingletonMatrix.#instance = new SingletonMatrix(rows, cols);
  }

  #update() {
    this.rows = this.value.length;
    this.cols = this.value[0].length;
  }

  setTranslation(vector) {
    if (vector.length !== this.rows || vector.length !== this.cols) throw new Error(`Invalid vector value (${vector.length}): Matrix${this.rows}x${this.cols}`);
    for (let i = 0; i < this.rows; i++) {
      this.value[i][this.cols] = vector[i];
    }
  }

  setRotation(stamp, angle) {
    if (this.rows !== this.cols) throw new Error("Not given a square matrix.");
    const mainDiagonalStamp = this.#generateMainDiagonal(stamp, this.rows);
    const sinesLeft = [-Math.sin(angle), Math.sin(angle)];

    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        let isInDiagonal = i === j;
        let thereIsCosine = mainDiagonalStamp[j] === "cos";
        let thereIsOneInTheSameRow = mainDiagonalStamp[j] === "1";
        let thereIsOneInTheSameColumn = mainDiagonalStamp[i] === "1";
        if (isInDiagonal && thereIsCosine) this.value[i][j] = Math.cos(angle);
        else if (isInDiagonal && !thereIsCosine) this.value[i][j] = 1;
        else if (thereIsOneInTheSameRow || thereIsOneInTheSameColumn) this.value[i][j] = 0;
        else if (sinesLeft.length === 0) throw new Error("No sines left. Cannot insert anything.");
        else {
          this.value[i][j] = sinesLeft[0];
          sinesLeft.shift();
        }
      }
    }
  }

  #generateMainDiagonal(stamp, dim) {
    if (typeof stamp !== "string") throw new Error("Not given a string stamp");
    if (stamp.length !== 2) throw new Error("The stamp is not long 2");
    stamp = stamp.split("");
    stamp = stamp.map((char) => axisIdentifiers.indexOf(char));
    if (-1 in stamp) throw new Error("Not valid stamp. Unrecognized char");
    const mainDiagonal = Array(dim).fill("1");
    mainDiagonal[stamp[0]] = "cos";
    mainDiagonal[stamp[1]] = "cos";
    return mainDiagonal;
  }

  // static scale(...factors) {
  //   const rows = factors.length, columns = rows;
  //   const matrix = Array(rows);
  //   for (let i = 0; i < rows; i++) {
  //     matrix[i] = Array(columns);
  //     for (let j = 0; j < columns; j++) {
  //       if (i === j) matrix[i][j] = factors[i];
  //       else matrix[i][j] = 0;
  //     }
  //   }
  //   return matrix;
  // }

  // static symmetry() { return 1; }
  extendIn(dimensions) {
    this.value.forEach((row) => {
      while (row.length < dimensions) {
        row.push(0);
      }
    });

    while (this.value.length < dimensions) {
      const newRow = new Array(dimensions).fill(0);
      newRow[this.value.length] = 1;
      this.value.push(newRow);
    }
  }
}

class PointND {
  constructor(...coordinates) {
    this.nthDimension = () => coordinates.length;
    this.coordinates = coordinates;
  }

  static origin(nthDimension) {
    return new PointND(...Array(nthDimension).fill(0));
  }

  transform(matrix) {
    let transformed = this;
    let matrixCols = matrix[0].length,
      matrixRows = matrix.length;
    if (matrixCols === this.nthDimension + 1 && matrixRows === matrixCols - 1) transformed = matrixPointMultiplication(matrix, new PointND(...transformed.coordinates, 1));
    else transformed = matrixPointMultiplication(matrix, transformed);
    return new PointND(...transformed.coordinates);
  }

  convertTo(dimensions) {
    let dimensionsLeft = dimensions - this.nthDimension();
    for (let i = 0; i < dimensionsLeft; i++) this.coordinates.push(0);
  }

  projectInto(dimensions = CONTEXT_DIMENSION, isOrthogonalProjection = false) {
    let vertexDimension = this.coordinates.length;
    while (vertexDimension > dimensions) {
      let lastCoordinate = this.coordinates.pop();
      if (!isOrthogonalProjection || vertexDimension > DEPTH_MAPPING_DIMENSION) {
        const perspectiveFactor = cameraZoom / (cameraDistance - lastCoordinate);
        this.coordinates = this.coordinates.map((coordinate) => coordinate * perspectiveFactor);
      }
      vertexDimension -= 1;
    }
    return this;
  }

  draw(depthSample, colorSample = undefined, dimensionalScope = undefined, scale = DEFAULT_RENDER_SCALE) {
    if (this.nthDimension > CONTEXT_DIMENSION) throw new Error("This point has too many dimensions to be drawn. You should project it");
    if (this.nthDimension < CONTEXT_DIMENSION) this.convertTo(CONTEXT_DIMENSION);

    context.beginPath();
    let pointSize = MAX_DRAWN_POINT_SIZE / (cameraDistance - depthSample);
    if (isNaN(pointSize)) throw new Error("pointSize non è un numero");
    let positionX = scale * this.coordinates[0] + MAX_DRAWN_POINT_SIZE / 2 + screenDimensions.width / 2;
    if (isNaN(positionX)) throw new Error("PositionX non è un numero");
    let positionY = scale * this.coordinates[1] + MAX_DRAWN_POINT_SIZE / 2 + screenDimensions.height / 2;
    if (isNaN(positionY)) throw new Error("PositionY non è un numero");
    context.arc(positionX, positionY, pointSize, 0, 2 * Math.PI, false);
    context.stroke();
    context.strokeStyle = "rgba(0,0,0,0.25)";

    // Calcola il colore basato su hyperdepth
    let color = `hsla(270, 9.8%, 80%, ${BRIGHTNESS / ((1 + FOG) * (cameraDistance - depthSample))}%)`;
    if (dimensionalScope !== undefined && dimensionalScope >= COLOR_MAPPING_DIMENSION) {
      let hue = 36 * colorSample + 270; // Hue secondo i commenti
      color = `hsla(${hue}, 100%, 50%, ${BRIGHTNESS / ((1 + FOG) * (cameraDistance - depthSample))}%)`;
    }

    // Applica il colore calcolato come riempimento
    context.fillStyle = color;
    context.fill();
    context.closePath();
  }

  distanceSquare(point) {
    let sum = 0;
    for (let dim = 0; dim < this.nthDimension; dim++) sum += Math.pow(this.coordinates[dim] - point.coordinates[dim], 2);
    return sum;
  }
}

class MeshND {
  constructor(vertices, sides = []) {
    this.vertices = vertices;
    this.sides = sides;
    this.nthDimension = () => this.vertices[0].nthDimension();
  }
  barycenter() {
    let barycenterCoords = [];
    let sum = 0;
    for (let dim = 0; dim < this.vertices[0].nthDimension(); dim++) {
      for (let i = 0; i < this.vertices.length; i++) {
        sum += this.vertices[i].coordinates[dim];
      }
      barycenterCoords.push(sum / this.nthDimension());
      sum = 0;
    }
    return new PointND(...barycenterCoords);
  }
  static #pickColorSample(vertex) {
    return vertex.coordinates.at(-1);
  }
  static #pickDepthSample(vertex) {
    return vertex.coordinates[CONTEXT_DIMENSION - 1 + 1];
  }
  render(rotationScope, isOrthogonalProjection = false, renderingScale = DEFAULT_RENDER_SCALE) {
    this.vertices.forEach((vertex) => {
      let colorSample = undefined;
      let projectedVertex = new PointND(...vertex.coordinates);
      projectedVertex = projectedVertex.projectInto(CONTEXT_DIMENSION, isOrthogonalProjection);
      let depthSample = 1;
      if (rotationScope >= COLOR_MAPPING_DIMENSION || this.nthDimension() >= COLOR_MAPPING_DIMENSION) {
        colorSample = MeshND.#pickColorSample(vertex);
      }
      if (rotationScope >= DEPTH_MAPPING_DIMENSION || vertex.nthDimension() >= DEPTH_MAPPING_DIMENSION) depthSample = MeshND.#pickDepthSample(vertex);
      projectedVertex.draw(depthSample, colorSample, Math.max(rotationScope, vertex.nthDimension()));
    });
    this.sides.forEach((side) => {
      side.render(isOrthogonalProjection, renderingScale, Math.max(rotationScope, side.start.nthDimension()));
    });
  }
  extendIn(dimensions) {
    let oldDimension = this.nthDimension();
    this.vertices.forEach((vertex) => {
      for (let i = 0; i < dimensions - oldDimension; i++) {
        vertex.coordinates.push(0);
      }
    });
  }

  transform(matrix) {
    this.extendIn(matrix.length);
    this.vertices = this.vertices.map((vertex) => vertex.transform(matrix));
    this.sides = this.sides.map((side) => side.transform(matrix));
    return new MeshND(this.vertices, this.sides);
  }
}
class SegmentND {
  constructor(...extremes) {
    if (extremes.length !== 2) throw new Error("A segment has not got " + extremes.length + " extremes");
    if (extremes[0].nthDimension() !== extremes[1].nthDimension()) throw new Error("Watch out! You put two different PointND", extremes[0].coordinates, extremes[1].coordinates);
    this.nthDimension = () => extremes[0].nthDimension();
    this.extremes = extremes;
    this.start = extremes[0];
    this.end = extremes[1];
  }
  render(isOrthogonalProjection = false, scale = DEFAULT_RENDER_SCALE, rotationScope = undefined) {
    let colorSample1 = undefined;
    let colorSample2 = undefined;
    if (rotationScope >= COLOR_MAPPING_DIMENSION) {
      colorSample1 = this.start.coordinates.at(-1);
      colorSample2 = this.end.coordinates.at(-1);
    }
    let depth = 1;
    if (this.nthDimension() >= DEPTH_MAPPING_DIMENSION) {
      this.start = this.start.projectInto(3, isOrthogonalProjection);
      this.end = this.end.projectInto(3, isOrthogonalProjection);
      depth = (this.start.coordinates.at(-1) + this.end.coordinates.at(-1)) / 2;
    }
    this.start = this.start.projectInto(2, isOrthogonalProjection);
    this.end = this.end.projectInto(2, isOrthogonalProjection);
    let positionX = scale * this.start.coordinates[0] + MAX_DRAWN_POINT_SIZE / 2 + screenDimensions.width / 2;
    if (isNaN(positionX)) throw new Error("positionX non è un numero.");
    let positionY = scale * this.start.coordinates[1] + MAX_DRAWN_POINT_SIZE / 2 + screenDimensions.height / 2;
    if (isNaN(positionY)) throw new Error("positionY non è un numero.");
    let positionX_1 = scale * this.end.coordinates[0] + MAX_DRAWN_POINT_SIZE / 2 + screenDimensions.width / 2;
    if (isNaN(positionX_1)) throw new Error("positionX1 non è un numero.");
    let positionY_1 = scale * this.end.coordinates[1] + MAX_DRAWN_POINT_SIZE / 2 + screenDimensions.height / 2;
    if (isNaN(positionY_1)) throw new Error("positionY1 non è un numero.");
    context.beginPath();
    context.moveTo(positionX, positionY);
    context.lineTo(positionX_1, positionY_1);
    let color = `hsla(270, 9.8%, 80%, ${BRIGHTNESS / ((1 + 2 * FOG) * (cameraDistance - depth))}%)`;
    context.strokeStyle = color;
    context.lineWidth = 2.5 / (cameraDistance - depth);

    if (colorSample1 !== undefined && colorSample2 !== undefined) {
      let hue1 = 36 * colorSample1 + 270; // Hue secondo i commenti
      let hue2 = 36 * colorSample2 + 270; // Hue secondo i commenti

      // Create a linear gradient
      const gradient = context.createLinearGradient(positionX, positionY, positionX_1, positionY_1);
      gradient.addColorStop(0, `hsla(${hue1}, 100%, 50%, ${BRIGHTNESS / ((1 + 2 * FOG) * (cameraDistance - depth))}%)`);
      gradient.addColorStop(1, `hsla(${hue2}, 100%, 50%, ${BRIGHTNESS / ((1 + 2 * FOG) * (cameraDistance - depth))}%)`);

      context.strokeStyle = gradient;
    }

    context.stroke();
    context.closePath();
  }
  transform(matrix) {
    return new SegmentND(this.start.transform(matrix), this.end.transform(matrix));
  }
}
class Hypercube extends MeshND {
  constructor(dimensions, side = DEFAULT_SIZE) {
    let vertices = Hypercube.#createHypercubeVertices(dimensions, side);
    let sides = Hypercube.#createHypercubeSides(dimensions, vertices);
    super(vertices, sides);
  }
  static #createHypercubeVertices(dimensions, side) {
    let vertices = [];
    for (let i = 0; i < Math.pow(2, dimensions); i++) {
      let vertex = [];
      for (let j = 0; j < dimensions; j++) vertex.push(i & (1 << j) ? side / 2 : -side / 2);
      vertices.push(new PointND(...vertex));
    }
    return vertices;
  }
  // group vertices in segments when they are sorted like binary numbers (1,1,1), (1,1,-1) (1,-1,1) (1,-1,-1)...
  static #createHypercubeSides(dimensions, vertices) {
    let sides = [];
    let verticesUsed = [];
    for (let i = 0; i < dimensions; i++) {
      verticesUsed = [];
      for (let j = 0; j < vertices.length; j++) {
        if (verticesUsed.includes(j)) continue;
        sides.push(new SegmentND(vertices[j], vertices[j + Math.pow(2, i)]));
        verticesUsed.push(j, j + Math.pow(2, i));
      }
    }
    return sides;
  }
}
class Simplex extends MeshND {
  constructor(dimensions, side = DEFAULT_SIZE) {
    const vertices = Simplex.#createSimplex(dimensions, side);
    const sides = Simplex.#createSimplexSides(dimensions, vertices);
    super(vertices, sides);
  }
  static #createSimplex(dimensions, side, pointstamp = []) {
    if (dimensions === 1) {
      return new Hypercube(1, side).vertices;
    } else {
      let oldSimplex = new Simplex(dimensions - 1, side, pointstamp);
      let oldBarycenter = oldSimplex.barycenter();
      let newVertex = new PointND(...oldBarycenter.coordinates, Math.sqrt(side * side - oldBarycenter.distanceSquare(oldSimplex.vertices[0])));
      let vertices = [...oldSimplex.vertices, newVertex];
      let simplex = new MeshND(vertices);
      for (let i = 0; i < vertices.length; i++) {
        // check if all the vertices have the same number of coordinates
        if (vertices[i].nthDimension() > dimensions) throw new Error("A point has too many coordinates");
        if (vertices[i].nthDimension() < dimensions) vertices[i].convertTo(dimensions);
      }
      let oppositeNewBarycenterVector = oppositeVector(simplex.barycenter().coordinates);
      // center the simplex with a traslation
      simplex.vertices.forEach((vertex) => {
        for (let i = 0; i < vertex.nthDimension(); i++) {
          vertex.coordinates[i] += oppositeNewBarycenterVector[i];
        }
      });
      // let T = SingletonMatrix.init(dimensions, dimensions);
      // T.set("t", oppositeNewBarycenterVector);
      // simplex.extendIn(T.value[0].length);
      // console.log(dimensions);
      // simplex.transform(T.value);
      // T.destroy();
      return simplex.vertices;
    }
  }
  static #createSimplexSides(dimensions, vertices) {
    let sides = [];
    let verticesUsed = [];
    for (let i = 0; i < dimensions; i++) {
      for (let j = 0; j < vertices.length; j++) {
        if (i === j) continue;
        if (verticesUsed.includes(j)) continue;
        sides.push(new SegmentND(vertices[i], vertices[j]));
        verticesUsed.push(i);
      }
    }
    return sides;
  }
}
class Hypersphere extends MeshND {
  constructor(dimensions, radius = DEFAULT_SIZE, complexity = DEFAULT_COMPLEXITY) {
    const hypersphere = Hypersphere.#createHypersphere(dimensions, radius, complexity);
    // const sides = Hypersphere.#createHypersphereSides(vertices, complexity);
    super(hypersphere.vertices, hypersphere.sides);
  }
  // Funzione ricorsiva per la creazione di ipersfere
  static #createHypersphere(dimensions, radius, complexity, pointstamp = []) {
    let stepAngle = Math.PI / complexity;
    if (dimensions === 1) {
      return { vertices: new Hypercube(1, radius).vertices, sides: [] };
    }
    if (dimensions === 2) {
      // Caso base: restituisci un array con un singolo punto
      return Hypersphere.#createCircle(radius, stepAngle, pointstamp);
    } else {
      // Caso ricorsivo: costruisci i punti utilizzando le sezioni di ipersfere di dimensioni inferiori
      let vertices = [];
      let sides = [];
      let previousHypersphereSection = undefined;
      for (let i = 0; i <= complexity; i++) {
        let w = radius * Math.cos(Math.PI - (i * Math.PI) / complexity);
        let hypersphereSectionRadius = Math.sqrt(radius * radius - w * w);
        let hypersphereSection = Hypersphere.#createHypersphere(dimensions - 1, hypersphereSectionRadius, complexity, pointstamp.concat(w));
        vertices.push(...hypersphereSection.vertices);
        sides.push(...hypersphereSection.sides, ...Hypersphere.connectTwoAdiacentHypersphereSections(previousHypersphereSection, hypersphereSection));
        previousHypersphereSection = hypersphereSection;
      }
      // connect adiacent sections
      return { vertices: vertices, sides: sides };
    }
  }
  static connectTwoAdiacentHypersphereSections(previousHypersphereSection, hypersphereSection) {
    if (previousHypersphereSection === undefined) return [];
    let sides = [];
    for (let v = 0; v < hypersphereSection.vertices.length; v++) sides.push(new SegmentND(previousHypersphereSection.vertices[v], hypersphereSection.vertices[v]));
    return sides;
  }
  // Function to create a 2D circle of points, given radius and a stepangle.
  static #createCircle(radius, stepAngle, pointstamp = []) {
    const vertices = Hypersphere.#createCircleVertices(radius, stepAngle, pointstamp);
    const sides = Hypersphere.#createCircleSides(vertices);
    const circle = { vertices: vertices, sides: sides };
    return circle;
  }
  static #createCircleVertices(radius, stepAngle, pointstamp = []) {
    let points = [];
    for (let theta = 0; theta < 2 * Math.PI; theta += stepAngle) {
      let x = radius * Math.cos(theta);
      let y = radius * Math.sin(theta);
      let newPoint = new PointND(x, y, ...pointstamp);
      points.push(newPoint);
    }
    return points;
  }
  static #createCircleSides(vertices) {
    let sides = [];
    for (let v = 0; v < vertices.length; v++) {
      if (v === vertices.length - 1) sides.push(new SegmentND(vertices[v], vertices[0]));
      else sides.push(new SegmentND(vertices[v], vertices[v + 1]));
    }
    return sides;
  }
}
class Orthoplex extends MeshND {
  constructor(dimensions, side = DEFAULT_SIZE) {
    // thinking an orthoplex as a hypersphere of complexity 2
    const radius = side * Math.SQRT1_2;
    const orthoplex = new Hypersphere(dimensions, radius, 2);
    super(orthoplex.vertices, orthoplex.sides);
  }
}
class Torus extends MeshND {
  constructor(dimensions, radius = DEFAULT_SIZE / 4, distanceFromTheCenter = 2 * radius, complexity = DEFAULT_COMPLEXITY) {
    const torus = Torus.#createTorusVertices(dimensions, radius, distanceFromTheCenter, complexity);
    super(torus.vertices, torus.sides);
  }
  static #createTorusVertices(dimensions, radius, distanceFromTheCenter, complexity) {
    let vertices = [];
    let sides = [];
    let slice = new Hypersphere(dimensions - 1, radius, complexity / 2);
    slice.extendIn(dimensions);
    let zerosToAppend = Array(dimensions - 1).fill(0);
    let vector = [radius + distanceFromTheCenter, ...zerosToAppend];
    slice.vertices.forEach((vertex) => {
      for (let i = 0; i < vertex.nthDimension(); i++) {
        vertex.coordinates[i] += vector[i];
      }
    });
    // let T = SingletonMatrix.init(dimensions, dimensions);
    // T.set("t", vector);
    // slice.transform(T.value);
    // T.destroy();
    let stamp = "x" + axisIdentifiers[dimensions - 1];

    let stepAngle = Math.PI / complexity;
    for (let i = 0; i < 2 * complexity; i++) {
      let R = SingletonMatrix.init(dimensions);
      R.set("r", [stamp, stepAngle]);
      slice.transform(R.value);
      R.destroy();
      vertices.push(...slice.vertices);
      sides.push(...slice.sides);
    }
    sides.push(...Torus.#connectTwoAdiacentTorusSections(slice, vertices));
    return { vertices: vertices, sides: sides };
  }
  static #connectTwoAdiacentTorusSections(sliceSample, torusVertices) {
    let sides = [];
    for (let v = sliceSample.vertices.length; v < torusVertices.length; v += 1) {
      if (v > torusVertices.length - 1 - sliceSample.vertices.length) sides.push(new SegmentND(torusVertices[v], torusVertices[(v + sliceSample.vertices.length) % torusVertices.length]));
      sides.push(new SegmentND(torusVertices[v - sliceSample.vertices.length], torusVertices[v]));
    }
    return sides;
  }
}
function oppositeVector(vector) {
  for (let i = 0; i < vector.length; i++) vector[i] *= -1;
  return vector;
}

// function create24Cell() {
//   const vertices = [];
//   // Generate vertices of the form (±1, ±1, 0, 0)
//   const coords = [1, -1];
//   for (let i of coords) {
//     for (let j of coords) {
//       vertices.push(new PointND(i, j, 0, 0));
//       vertices.push(new PointND(i, 0, j, 0));
//       vertices.push(new PointND(i, 0, 0, j));
//       vertices.push(new PointND(0, i, j, 0));
//       vertices.push(new PointND(0, i, 0, j));
//       vertices.push(new PointND(0, 0, i, j));
//     }
//   }
//   // Generate vertices of the form (±1, 0, 0, 0)
//   for (let i of coords) {
//     vertices.push(new PointND(i, 0, 0, 0));
//     vertices.push(new PointND(0, i, 0, 0));
//     vertices.push(new PointND(0, 0, i, 0));
//     vertices.push(new PointND(0, 0, 0, i));
//   }
//   return vertices;
// }

function uploadEnvironment() {
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
}
function resizeCanvas() {
  screenDimensions.width = window.innerWidth;
  context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
}

export { axisIdentifiers, rotationScope, SingletonMatrix, PointND, SegmentND, MeshND, Hypercube, Hypersphere, Simplex, Torus, Orthoplex, uploadEnvironment, resizeCanvas };
