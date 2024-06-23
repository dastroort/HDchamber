const canvas = document.querySelector("canvas");
let context = canvas.getContext("2d");
let angle = 0;
const dims = {
  "width": window.innerWidth,
  "height": 77.5/100 *window.innerHeight
};
canvas.width = dims.width;
canvas.height = dims.height;

function extendMatrix(matrix) {
  let rows = matrix.length;
  let cols = matrix[0].length;
  // Add a row of zeros at the bottom
  let newRow = Array(cols).fill(0);
  newRow.push(1);
  matrix.push(newRow);
  // Add a column of zeros to the right, with a specific value in the last position
  for (let i = 0; i < rows; i++) {
    matrix[i].push(0);
  }
  return matrix;
}

function matrixPointMul(matrix, point){
  let result = [];
  if(matrix[0].length !== point.nthDimension) throw new Error(`Invalid dimensions: matrix ${matrix[0].length}, point.nthDimension ${point.nthDimension}`);
  for (let i = 0; i < matrix.length; i++) {
    let sum = 0;
    for (let j = 0; j < matrix[0].length; j++) {
      sum += matrix[i][j] * (j < point.nthDimension ? point.coordinates[j] : 1);
    }
    result[i] = sum;
  }
  return new PointND(...result.slice(0, point.nthDimension));
}

const cameraDistance = 3;
const SCALE = 200;

// helper methods to create a wellknown transformation matrix
class Matrix {
  static translation(...vector) {
    const rows = vector.length + 1, columns = rows;
    const matrix = Array(rows);
    for(let i=0; i<rows; i++){
      matrix[i] = Array(columns);
      for(let j=0; j<columns; j++){
        if(i === j) matrix[i][j] = 1;
        else if(j === columns-1) matrix[i][j] = vector[i]; 
        else matrix[i][j] = 0;
      }
    }
    matrix.pop();
    return matrix;
  }
  
  static allRotations(nthDimension, angle, center=PointND.origin(nthDimension).coordinates){
    let matrices = [];
    let mainDiagonals = Matrix.#possibleRotationMainDiagonals(nthDimension);
    for(let n=0; n<mainDiagonals.length; n++){
      matrices[n] = [];
      let sinesLeft = 2;
      for(let i=0; i<mainDiagonals[0].length; i++){
        matrices[n][i] = []
        for(let j=0; j<mainDiagonals[0].length; j++){
          if(i === j && mainDiagonals[n][j] === "cos") matrices[n][i][j] = Math.cos(angle);
          else if(i === j && mainDiagonals[n][j] === "1") matrices[n][i][j] = 1;
          else if(mainDiagonals[n][j] === "1" || mainDiagonals[n][i] === "1") matrices[n][i][j] = 0;
          else if(sinesLeft === 2){
            matrices[n][i][j] = -Math.sin(angle);
            sinesLeft--;
          } else {
            matrices[n][i][j] = Math.sin(angle);
            sinesLeft--;
          }
        }
      }
    }
    matrices.unshift(Matrix.translation(...oppositeVector(center)));
    matrices.push(Matrix.translation(...center));
    return matrices;
  }
  
  static filterFromAllRotations(nthDimension, angle, coordinateIndexPairsInvolved, center=PointND.origin(nthDimension).coordinates, type="and"){
    let matrices = Matrix.allRotations(nthDimension, angle, center);
    matrices.pop(); matrices.shift(); // excluding the two translation matrices
    let mainDiagonals = Matrix.#possibleRotationMainDiagonals(nthDimension);
    let filteredMatrices = [];
    // the array numbers are referred to those rotation which transforms the all the coordinates from 0 to n-1 has a variable angle
    for(let n=0; n<coordinateIndexPairsInvolved.length; n++){
      if(coordinateIndexPairsInvolved[0].length !== 2) throw new Error("Invalid length for a coordinate pair");
      let x = coordinateIndexPairsInvolved[n][0];
      let y = coordinateIndexPairsInvolved[n][1];
      for(let i=0; i<matrices.length; i++){
        if(filteredMatrices.includes(matrices[i])) continue;
        // the filter depends on type: if both of the coordinates must have cosine is "and", if at least one "or"
        let isValid = false;
        switch (type) {
          case "and":
            isValid = (mainDiagonals[i][x] === "cos" && mainDiagonals[i][y] === "cos");
            break;
          case "or":
            isValid = (mainDiagonals[i][x] === "cos" || mainDiagonals[i][y] === "cos");
            break;
          default: throw new Error("Invalid value for \"type\": " + type);
        }
        if (isValid) filteredMatrices.push(matrices[i]);
      }
    }
    return filteredMatrices;
  }

  static #possibleRotationMainDiagonals(nthDimension, mainDiagonal=[], cosinesLeft=2){
    if(nthDimension < cosinesLeft) throw new Error("Rotations cannot exist in "+nthDimension+" dimension/s.");
    if(nthDimension === 0){
      return [ mainDiagonal ];
    }
    // all dispositions among two "cosines" and "1"
    let dispositions = [];
    // checks if all "cosines" are used till the last position, if not, you must use the last cosine
    // before completing the diagonal in order to create a valid rotation matrix
    if(cosinesLeft === nthDimension)
      dispositions = [...Matrix.#possibleRotationMainDiagonals(nthDimension - 1, mainDiagonal.concat("cos"), cosinesLeft - 1)];
    // if two cosines are used, you cannot use another one
    else if(cosinesLeft > 0) dispositions = [
      ...Matrix.#possibleRotationMainDiagonals(nthDimension - 1, mainDiagonal.concat("cos"), cosinesLeft - 1),
      ...Matrix.#possibleRotationMainDiagonals(nthDimension - 1, mainDiagonal.concat("1"), cosinesLeft)
    ]
    else dispositions = [...Matrix.#possibleRotationMainDiagonals(nthDimension - 1, mainDiagonal.concat("1"), cosinesLeft)];
    // if( dispositions.length !== actualDispositions) throw new Error("Something went wrong: in "+nthDimension+" dimensions there are not "+dispositions.length+" rotations");
    return dispositions;
  }
  
  static scale(...factors){
    const rows = factors.length, columns = rows;
    const matrix = Array(rows);
    for(let i=0; i<rows; i++){
      matrix[i] = Array(columns);
      for(let j=0; j<columns; j++){
        if(i === j) matrix[i][j] = factors[i];
        else matrix[i][j] = 0;
      }
    }
    return matrix;
  }

  static symmetry(){return 1;}
}

class PointND{
  constructor(...coordinates){
    this.nthDimension = coordinates.length;
    this.coordinates = coordinates;
  }

  static origin(nthDimension){return new PointND(...Array(nthDimension).fill(0)); }

  transform(...matrices){
    let transformed = this;
    for(let i=0; i<matrices.length; i++){
      let matrixCols = matrices[i][0].length, matrixRows = matrices[i].length;
      if(matrixCols === this.nthDimension + 1 && matrixRows === this.nthDimension)
        transformed = matrixPointMul(matrices[i], new PointND(...transformed.coordinates, 1));
      else transformed = matrixPointMul(matrices[i], transformed);
    }
    return transformed;
  }

  convertTo(dimensions){
    let extension = [];
    let dimensionsLeft = dimensions - this.nthDimension;
    for(let i=0; i<dimensionsLeft; i++) extension[i] = 0;
    return new PointND(...this.coordinates, ...extension);
  }

  projectInto(dimensions=2, isOrto=false){
    let dimensionsLeft = this.nthDimension - dimensions;
    if(dimensionsLeft === 0) return new PointND(...this.coordinates);

    let perspectiveFactor = 1 / (cameraDistance - this.coordinates[this.coordinates.length - 1]);
    if(isOrto) perspectiveFactor = 1;
    let projectionMatrix = [];
    for(let i=0; i<this.nthDimension; i++){
      projectionMatrix[i] = [];
      for(let j=0; j<this.nthDimension; j++){
        if(i === j && i !== this.nthDimension - 1) projectionMatrix[i][j] = perspectiveFactor;
        else projectionMatrix[i][j] = 0;
      } 
    }
    projectionMatrix.pop();
    let projected = matrixPointMul(projectionMatrix, this);
    return projected.projectInto(dimensions, isOrto);
  }

  draw(depth, scale=SCALE, nthDimensionPoint=undefined){
    // only a point in 2 dimensions can be drawn on a screen
    if(this.nthDimension > 2) throw new Error("This point has too many dimensions to be drawn. You should project it");
    if(this.nthDimension === 2){
      context.beginPath();
      let positionX = scale*this.coordinates[0] + 5 + dims.width/2;
      let positionY = scale*this.coordinates[1] + 5 + dims.height/2;
      let pointSize = 10 / (cameraDistance - depth);
      context.arc(positionX, positionY, pointSize, 0, 2*Math.PI, false);
      context.stroke();
      context.strokeStyle = "rgba(0,0,0,0.25)";
  
      // Calcola il colore basato su hyperdepth
      let color = `hsla(270, 9.8%, 80%, ${250 / (cameraDistance - depth)}%)`;
      if(nthDimensionPoint !== undefined && nthDimensionPoint.nthDimension > 3){
        let lastHigherDimensionCoordinate = nthDimensionPoint.coordinates[nthDimensionPoint.coordinates.length - 1];
        let hue = 36 * lastHigherDimensionCoordinate + 270; // Hue secondo i commenti
        color = `hsla(${hue}, 100%, 50%, ${250 / (cameraDistance - depth)}%)`;
      }
      
      // Applica il colore calcolato come riempimento
      context.fillStyle = color;
      context.fill();
      context.closePath();
    } else if(this.nthDimension === 1) (new PointND(...this.coordinates,0)).draw(depth);
    else if(this.nthDimension === 0) (new PointND(0,0)).draw(depth);
  }

  distanceSquare(point){
    let sum=0;
    for(let dim=0; dim<this.nthDimension; dim++) sum += Math.pow(this.coordinates[dim] - point.coordinates[dim], 2);
    return sum;
  }
}

class MeshND{
  constructor(vertices){
    this.vertices = vertices;
  }

  barycenter(){
    let barycenterCoords = [];
    let sum = 0;
    for(let dim=0; dim<this.vertices[0].nthDimension; dim++){
      for(let i=0; i<this.vertices.length; i++){
        sum += this.vertices[i].coordinates[dim];
      }
      barycenterCoords.push(sum/this.vertices.length);
      sum = 0;
    }
    return new PointND(...barycenterCoords);
  }
  
  render(scale=SCALE){
    this.vertices.forEach(vertex => {
      let projectedVertex = vertex.projectInto(2);
      let sampleForHigherDimension = undefined;
      if(vertex.nthDimension > 3) sampleForHigherDimension = vertex;
      projectedVertex.draw(vertex.coordinates[2], scale, vertex);
    });
  }

  transform(...matrices){
    for(let i=0; i<this.vertices.length; i++) this.vertices[i] = this.vertices[i].transform(...matrices);
    return this;
  }
}

class Hypercube extends MeshND{
  constructor(dimensions, side){
    const vertices = Hypercube.#createHypercube(dimensions, side);
    super(vertices);
  }

  static #createHypercube(dimensions, side, pointstamp=[]){
    if(dimensions === 0){
      return [ new PointND(...pointstamp) ];
    }else return [
      ...this.#createHypercube(dimensions - 1, side, pointstamp.concat(side/2)),
      ...this.#createHypercube(dimensions - 1, side, pointstamp.concat(-side/2))
    ];
  }
}

class Simplex extends MeshND{
  constructor(dimensions, side){
    const vertices = Simplex.#createSimplex(dimensions, side);
    super(vertices);
  }

  static #createSimplex(dimensions, side, pointstamp=[]){
    if(dimensions === 1){
      return (new Hypercube(1, side, pointstamp)).vertices;
    } else {
      let oldSimplex = new Simplex(dimensions - 1, side, pointstamp);
      let oldBarycenter = oldSimplex.barycenter();
      let newVertex = new PointND(...oldBarycenter.coordinates, Math.sqrt(side**side - oldBarycenter.distanceSquare(oldSimplex.vertices[0])));
      let vertices = [ ...oldSimplex.vertices, newVertex ];
      let simplex = new MeshND(vertices);
      for(let i=0; i<vertices.length; i++){
        // check if all the vertices have the same number of coordinates
        if(vertices[i].nthDimension > dimensions) throw new Error("A point has too many coordinates");
        if(vertices[i].nthDimension < dimensions) vertices[i] = vertices[i].convertTo(dimensions);
      }
      let oppositeNewBarycenterVector = oppositeVector(simplex.barycenter().coordinates);
      // center the simplex with a traslation
      simplex.transform(Matrix.translation(...oppositeNewBarycenterVector));
      return vertices;
    }
  }
}

const hypersphereRadius = 2;
const stepAngle = Math.PI / 10;
const stepHeight = stepAngle / (Math.PI);
const stepHyperheight = stepHeight;

// Function to create a 2D circle of points, given radius and a stepangle.
function createCircle2D(radius, stepAngle, fixedCoordinates={"z": 0,"w": 0}) {
  let points = [];
  for (let theta = 0; theta < 2 * Math.PI; theta += stepAngle) {
    let x = radius * Math.cos(theta);
    let y = radius * Math.sin(theta);
    if (fixedCoordinates.z !== undefined){
      points.push(new PointND(x, y, fixedCoordinates.z, fixedCoordinates.w));
    } else if (fixedCoordinates.y !== undefined){
      let z = y;
      points.push(new PointND(x, fixedCoordinates.y, z, fixedCoordinates.w));
    } else if (fixedCoordinates.x !== undefined){
      let z = y;
      y = x;
      points.push(new PointND(fixedCoordinates.x, y, z, fixedCoordinates.w));
    } else {
      throw new Error("invalid properties in \"fixedCordinates\"");
    }
  }
  return points;
}

// Function to create a 3D sphere of points. Think as a z = h plane intersecting the sphere, which gives a circle. Easy to deal with it since we've
// already have the function.
function createSphere3D(radius, stepAngle, hyperheight=0) {
  let circles = [];
  // let lastCircleRadius = 0;
  for (let height = -1; height <= 1 ; height += stepHeight) {
    let circleRadius = Math.sqrt(radius*radius - height*height);
    // let currentStepAngle = circleRadius !== 0 ?
    //   Math.asin(lastCircleRadius * Math.sin(stepAngle) / circleRadius) : stepAngle;
      // 0.5 * stepAngle * (1 + Math.sqrt(1 - circleRadius*circleRadius)) / circleRadius : stepAngle;
    circles.push(createCircle2D(circleRadius, stepAngle, {"y": height, "w": hyperheight}));
    circles.push(createCircle2D(circleRadius, stepAngle, {"z": height, "w": hyperheight}));
    lastCircleRadius = circleRadius !== 0 ? circleRadius : 1;
  }
  return circles;
}

// It's the analogue of the sphere but in four dimensions: a 3D-space w = 0 is intersecting the hypershpere, which gives a traditional sphere.
function createSphere4D(radius, stepAngle, noOfSpheres=3) {
  let spheres = [];
  let stepHyperheight = radius / (noOfSpheres-1);
  for (let hyperheight = -1; hyperheight <= 1 ; hyperheight += stepHyperheight) {
    spheres.push(createSphere3D(Math.sqrt(radius*radius - hyperheight*hyperheight), stepAngle, hyperheight));
  }
  return spheres;
}

function flattenArray(arr) {
  console.log("flatten");
  return arr.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenArray(val)) : acc.concat(val), []);
}

function oppositeVector(vector){
  for(let i=0; i<vector.length; i++) vector[i] *= -1;
  return vector;
}

function create24Cell() {
  const vertices = [];
  // Generate vertices of the form (±1, ±1, 0, 0)
  const coords = [1, -1];
  for (let i of coords) {
    for (let j of coords) {
      vertices.push(new PointND(i, j, 0, 0));
      vertices.push(new PointND(i, 0, j, 0));
      vertices.push(new PointND(i, 0, 0, j));
      vertices.push(new PointND(0, i, j, 0));
      vertices.push(new PointND(0, i, 0, j));
      vertices.push(new PointND(0, 0, i, j));
    }
  }
  // Generate vertices of the form (±1, 0, 0, 0)
  for (let i of coords) {
    vertices.push(new PointND(i, 0, 0, 0));
    vertices.push(new PointND(0, i, 0, 0));
    vertices.push(new PointND(0, 0, i, 0));
    vertices.push(new PointND(0, 0, 0, i));
  }
  return vertices;
}


let initialTime = Date.now();
const speed = 0.6 // rad/s
let position = 0;

function tic(){
  angle = (angle > 2*Math.PI) ? angle - 2*Math.PI : angle;
  let lastTime = Date.now();
  let deltaTime = lastTime - initialTime;
  angle += speed * deltaTime / 1000;
  initialTime = lastTime;
  
  renderEnvironment();
}

function renderEnvironment(){
  context.clearRect(0,0,window.innerWidth,window.innerHeight);

  const DIMENSIONS = 7;
  let tesseract = new Simplex(DIMENSIONS, 2);
  let rotationMatrices = Matrix.allRotations(DIMENSIONS, angle, tesseract.barycenter().coordinates);
  tesseract.transform(...rotationMatrices);
  console.log(tesseract.vertices);
  tesseract.render(SCALE * Math.pow(3, DIMENSIONS - 3)); // A sample point with a coordinate "1" is divided by 3 for each projection
  requestAnimationFrame(tic);
}

function resizeCanvas() {
  dims.width = window.innerWidth;
  context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
  tic(); // Redraw the scene
}

window.addEventListener("resize", resizeCanvas);

tic();