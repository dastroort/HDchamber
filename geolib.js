const canvas = document.querySelector("canvas");
let context = canvas.getContext("2d");
const screenDimensions = { width: window.innerWidth, height: (77.5 / 100) * window.innerHeight };
[canvas.width, canvas.height] = [screenDimensions.width, screenDimensions.height];

const DEFAULT_RENDER_SCALE = 200;
const DEFAULT_SIZE = 1.5;
const DEFAULT_COMPLEXITY = 8;
const cameraDistance = 3;
const cameraZoom = 2;
const axisIdentifiers = "xyzwvu";

// No more for loops. Instead, forEach and reduce are used to improve readability and performance.
// Time complexity: O(m * n) where m is the number of rows and n is the number of columns.
// Space complexity: O(m) for storing the result coordinates.
// Acoording to: https://www.bigocalc.com/
function matrixPointMultiplication(matrix, point) {
  let resultCoordinates = [];
  const matrixColumns = matrix[0].length;
  // Check if the matrix columns match the point's dimensions before proceeding with the multiplication.
  if (matrixColumns !== point.nthDimension) throw new Error(`Matrix multiplication cannot exist:\nmatrix length:\t${matrixColumns},\npoint length:\t${point.nthDimension}`);
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
}

class PointND {
  constructor(...coordinates) {
    this.nthDimension = coordinates.length;
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
    let extension = [];
    let dimensionsLeft = dimensions - this.nthDimension;
    for (let i = 0; i < dimensionsLeft; i++) extension[i] = 0;
    return new PointND(...this.coordinates, ...extension);
  }

  projectInto(dimensions = 2, isOrto = false) {
    let dimensionsLeft = this.nthDimension - dimensions;
    if (dimensionsLeft === 0) return this;

    let perspectiveFactor = cameraZoom / (cameraDistance - this.coordinates[this.coordinates.length - 1]);
    let projectionMatrix = [];
    for (let i = 0; i < this.nthDimension; i++) {
      projectionMatrix[i] = [];
      for (let j = 0; j < this.nthDimension; j++) {
        if (i === j && i !== this.nthDimension - 1) {
          if (this.nthDimension === 3 && isOrto) perspectiveFactor = 1;
          projectionMatrix[i][j] = Math.sqrt(perspectiveFactor);
        } else projectionMatrix[i][j] = 0;
      }
    }
    projectionMatrix.pop();
    let projected = matrixPointMultiplication(projectionMatrix, this);
    return projected.projectInto(dimensions, isOrto);
  }

  draw(depth, scale = DEFAULT_RENDER_SCALE, nthDimensionPoint = undefined, minRotationDimensions = undefined) {
    // only a point in 2 dimensions can be drawn on a screen
    if (this.nthDimension > 2) throw new Error("This point has too many dimensions to be drawn. You should project it");
    if (this.nthDimension === 2) {
      context.beginPath();
      let positionX = scale * this.coordinates[0] + 5 + screenDimensions.width / 2;
      let positionY = scale * this.coordinates[1] + 5 + screenDimensions.height / 2;
      let pointSize = 5 / (cameraDistance - 2 * depth + 0.5);
      context.arc(positionX, positionY, pointSize, 0, 2 * Math.PI, false);
      context.stroke();
      context.strokeStyle = "rgba(0,0,0,0.25)";

      // Calcola il colore basato su hyperdepth
      let color = `hsla(270, 9.8%, 80%, ${250 / (cameraDistance - depth)}%)`;
      if (minRotationDimensions !== undefined && minRotationDimensions > 3) {
        let lastHigherDimensionCoordinate = nthDimensionPoint.coordinates[nthDimensionPoint.coordinates.length - 1];
        let hue = 36 * lastHigherDimensionCoordinate + 270; // Hue secondo i commenti
        color = `hsla(${hue}, 100%, 50%, ${250 / (cameraDistance - depth)}%)`;
      }

      // Applica il colore calcolato come riempimento
      context.fillStyle = color;
      context.fill();
      context.closePath();
    } else if (this.nthDimension === 1) new PointND(...this.coordinates, 0).draw(depth);
    else if (this.nthDimension === 0) new PointND(0, 0).draw(depth);
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
    this.nthDimension = this.vertices[0].nthDimension;
  }
  barycenter() {
    let barycenterCoords = [];
    let sum = 0;
    for (let dim = 0; dim < this.vertices[0].nthDimension; dim++) {
      for (let i = 0; i < this.vertices.length; i++) {
        sum += this.vertices[i].coordinates[dim];
      }
      barycenterCoords.push(sum / this.vertices.length);
      sum = 0;
    }
    return new PointND(...barycenterCoords);
  }
  render(dimensions, isOrto = false, scale = DEFAULT_RENDER_SCALE) {
    this.vertices.forEach((vertex) => {
      let projectedVertex = vertex.projectInto(2, isOrto);
      let sampleForHigherDimension = undefined;
      let depth = 1;
      if (dimensions > 3) sampleForHigherDimension = vertex;
      if (vertex.nthDimension > 2) depth = vertex.coordinates[2];
      projectedVertex.draw(depth, scale, sampleForHigherDimension, dimensions);
    });
    this.sides.forEach((side) => {
      side.render(isOrto, scale, dimensions);
    });
  }
  extendIn(dimensions) {
    let amountOfZeros = dimensions - this.nthDimension;
    if (amountOfZeros < 0) throw new Error("Impossible extension in a lower dimension");
    if (amountOfZeros === 0) return this;
    let zerosToAppend = Array(amountOfZeros).fill(0);
    this.vertices = this.vertices.map((vertex) => new PointND(...vertex.coordinates.concat(zerosToAppend)));
    this.sides = this.sides.map((segment) => {
      let extendedStart = new PointND(...segment.start.coordinates, ...zerosToAppend);
      let extendedEnd = new PointND(...segment.end.coordinates, ...zerosToAppend);
      let extendedSegment = new SegmentND(extendedStart, extendedEnd);
      return extendedSegment;
    });
    return new MeshND(this.vertices, this.sides);
  }

  transform(matrix) {
    this.vertices = this.vertices.map((vertex) => vertex.transform(matrix));
    this.sides = this.sides.map((side) => side.transform(matrix));
    return new MeshND(this.vertices, this.sides);
  }
}
class SegmentND {
  constructor(...extremes) {
    if (extremes.length !== 2) throw new Error("A segment has not got " + extremes.length + " extremes");
    if (extremes[0].nthDimension !== extremes[1].nthDimension) throw new Error("Watch out! You put two different PointND", extremes[0].coordinates, extremes[1].coordinates);
    this.nthDimension = extremes[0].nthDimension;
    this.extremes = extremes;
    this.start = extremes[0];
    this.end = extremes[1];
  }
  render(isOrto = false, scale = DEFAULT_RENDER_SCALE, minRotationDimensions = undefined) {
    let hyperdepth1 = undefined;
    let hyperdepth2 = undefined;
    if (minRotationDimensions > 3) {
      hyperdepth1 = this.start.coordinates[this.start.coordinates.length - 1];
      hyperdepth2 = this.end.coordinates[this.end.coordinates.length - 1];
    }
    let depth = 1;
    if (this.nthDimension > 2) {
      this.start = this.start.projectInto(3, isOrto);
      this.end = this.end.projectInto(3, isOrto);
      depth = (this.start.coordinates[2] + this.end.coordinates[2]) / 2;
    }
    this.start = this.start.projectInto(2, isOrto);
    this.end = this.end.projectInto(2, isOrto);
    let positionX = scale * this.start.coordinates[0] + 5 + screenDimensions.width / 2;
    let positionY = scale * this.start.coordinates[1] + 5 + screenDimensions.height / 2;
    let positionX_1 = scale * this.end.coordinates[0] + 5 + screenDimensions.width / 2;
    let positionY_1 = scale * this.end.coordinates[1] + 5 + screenDimensions.height / 2;
    context.beginPath();
    context.moveTo(positionX, positionY);
    context.lineTo(positionX_1, positionY_1);
    let color = `hsla(270, 9.8%, 80%, ${150 / (cameraDistance - depth)}%)`;
    context.strokeStyle = color;
    context.lineWidth = 2.5 / (cameraDistance - depth);

    if (hyperdepth1 !== undefined && hyperdepth2 !== undefined) {
      let hue1 = 36 * hyperdepth1 + 270; // Hue secondo i commenti
      let hue2 = 36 * hyperdepth2 + 270; // Hue secondo i commenti

      // Create a linear gradient
      const gradient = context.createLinearGradient(positionX, positionY, positionX_1, positionY_1);
      gradient.addColorStop(0, `hsla(${hue1}, 100%, 50%, ${150 / (cameraDistance - depth)}%)`);
      gradient.addColorStop(1, `hsla(${hue2}, 100%, 50%, ${150 / (cameraDistance - depth)}%)`);

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
        if (vertices[i].nthDimension > dimensions) throw new Error("A point has too many coordinates");
        if (vertices[i].nthDimension < dimensions) vertices[i] = vertices[i].convertTo(dimensions);
      }
      let oppositeNewBarycenterVector = oppositeVector(simplex.barycenter().coordinates);
      // center the simplex with a traslation
      let T = SingletonMatrix.init(dimensions, dimensions);
      T.set("t", oppositeNewBarycenterVector);
      simplex.transform(T.value);
      T.destroy();
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
    let T = SingletonMatrix.init(dimensions, dimensions);
    let vector = [radius + distanceFromTheCenter, ...zerosToAppend];
    T.set("t", vector);
    slice.transform(T.value);
    T.destroy();
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

export { axisIdentifiers, SingletonMatrix, PointND, SegmentND, MeshND, Hypercube, Hypersphere, Simplex, Torus, Orthoplex, uploadEnvironment, resizeCanvas };
