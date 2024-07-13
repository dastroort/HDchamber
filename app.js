const canvas = document.querySelector("canvas");
let context = canvas.getContext("2d");
let angle = 0;
const screenDimensions = {
  "width": window.innerWidth,
  "height": 77.5/100 *window.innerHeight
};
canvas.width = screenDimensions.width;
canvas.height = screenDimensions.height;
const cameraDistance = 3;
const SCALE = 200;
function matrixPointMultiplication(matrix, point){
  let resultCoordinates = [];
  const matrixColumns = matrix[0].length, matrixRows = matrix.length;
  if(matrixColumns !== point.nthDimension) throw new Error(`Matrix multiplication cannot exist:\nmatrix length:\t${cols},\npoint length:\t${point.nthDimension}`);
  for (let row_i = 0; row_i < matrixRows; row_i++) {
    let sum = 0;
    for (let col_j = 0; col_j < matrixColumns; col_j++) sum += matrix[row_i][col_j] * point.coordinates[col_j];
    resultCoordinates[row_i] = sum;
  }
  return new PointND(...resultCoordinates);
}
// helper methods to create a wellknown transformation matrix
class Matrix {
  static translation(...vector) {
    const matrixRows = vector.length + 1, matrixColumns = matrixRows;
    const matrix = Array(matrixRows);
    for(let row_i=0; row_i<matrixRows; row_i++){
      matrix[row_i] = Array(matrixColumns);
      for(let col_j=0; col_j<matrixColumns; col_j++){
        let isInDiagonal = row_i === col_j;
        let isLastColumn = col_j === matrixColumns - 1;
        if(isInDiagonal) matrix[row_i][col_j] = 1;
        // This condition excludes the one above (isInDiagonal)
        else if(isLastColumn) matrix[row_i][col_j] = vector[row_i];
        else matrix[row_i][col_j] = 0;
      }
    }
    // Deletes the last row. Now the matrix is regular always returns the correct n-dimenional point if it's multiplied by a point.
    matrix.pop();
    return matrix;
  }
  static rotationsInNthDimension(nthDimension, angle, center=PointND.origin(nthDimension).coordinates, filter="all", type="and"){
    let matrices = [];
    const mainDiagonals = Matrix.#possibleRotationMainDiagonals(nthDimension);
    const rowAndColumnSizes = mainDiagonals[0].length;
    for(let mat_n=0; mat_n<mainDiagonals.length; mat_n++){
      matrices[mat_n] = [];
      const sinesLeft = [-Math.sin(angle), Math.sin(angle)];
      for(let row_i=0; row_i<rowAndColumnSizes; row_i++){
        matrices[mat_n][row_i] = [];
        for(let col_j=0; col_j<rowAndColumnSizes; col_j++){
          let isInDiagonal = row_i === col_j;
          let thereIsCosine = mainDiagonals[mat_n][col_j] === "cos";
          let thereIsOneInTheSameRow = mainDiagonals[mat_n][col_j] === "1";
          let thereIsOneInTheSameColumn = mainDiagonals[mat_n][row_i] === "1";
          if(isInDiagonal && thereIsCosine) matrices[mat_n][row_i][col_j] = Math.cos(angle);
          else if(isInDiagonal && !thereIsCosine) matrices[mat_n][row_i][col_j] = 1;
          else if(thereIsOneInTheSameRow || thereIsOneInTheSameColumn) matrices[mat_n][row_i][col_j] = 0;
          else if(sinesLeft.length === 0) throw new Error("No sines left. Cannot insert anything.");
          else {matrices[mat_n][row_i][col_j] = sinesLeft[0]; sinesLeft.shift();}
        }
      }
    }
    let filteredMatrices = matrices;
    if(filter !== "all") filteredMatrices = Matrix.#filterFromAllRotations(mainDiagonals, matrices, filter, type);
    Matrix.#setRotationsAtCenter(filteredMatrices, center);
    return filteredMatrices;
  }
  static #setRotationsAtCenter(matrices, center){
    matrices.unshift(Matrix.translation(...oppositeVector(center)));
    matrices.push(Matrix.translation(...center));
  }
  static #filterFromAllRotations(mainDiagonals, matrices, filter, type="and"){
    let filteredMatrices = [];
    // the array numbers are referred to those rotation which transforms the all the coordinates from 0 to n-1 has a variable angle
    let coordPairsWanted = Matrix.#translateFilter(filter);
    if(coordPairsWanted.length === 2) coordPairsWanted = [coordPairsWanted];
    for(let pair_n=0; pair_n<coordPairsWanted.length; pair_n++){
      if(coordPairsWanted[pair_n].length !== 2) throw new Error("Invalid length for a coordinate pair.");
      let firstCoord = coordPairsWanted[pair_n][0];
      let secondCoord = coordPairsWanted[pair_n][1];
      for(let mat_i=0; mat_i<matrices.length; mat_i++){
        if(filteredMatrices.includes(matrices[mat_i])) continue;
        // the filter depends on type: if both of the coordinates must have cosine is "and", if at least one "or"
        let isValid = false;
        let firstCoordInfluencedByCosine = mainDiagonals[mat_i][firstCoord] === "cos";
        let secondCoordInfluencedByCosine = mainDiagonals[mat_i][secondCoord] === "cos";
        switch (type) {
          case "and": isValid = (firstCoordInfluencedByCosine && secondCoordInfluencedByCosine); break;
          case "or": isValid = (firstCoordInfluencedByCosine || secondCoordInfluencedByCosine); break;
          default: throw new Error("Invalid value for \"type\": " + type);
        }
        if (isValid) filteredMatrices.push(matrices[mat_i]);
      }
    }
    return filteredMatrices;
  }
  static #translateFilter(filter){
    let pairs = filter.split(", ");
    for(let pair_i=0; pair_i < pairs.length; pair_i++){
      pairs[pair_i] = pairs[pair_i].split("_");
      for(let coord_j=0; coord_j < pairs[pair_i].length; coord_j++){
        let isALetter = /^[a-zA-Z]$/.test(pairs[pair_i][coord_j]);
        let isNumbered = /^d\d+/.test(pairs[pair_i][coord_j]);
        if(isALetter)
          switch (pairs[pair_i][coord_j]) {
            case "x": pairs[pair_i][coord_j] = 0; break;
            case "y": pairs[pair_i][coord_j] = 1; break;
            case "z": pairs[pair_i][coord_j] = 2; break;
            case "w": pairs[pair_i][coord_j] = 3; break;
            case "v": pairs[pair_i][coord_j] = 4; break;
            case "u": pairs[pair_i][coord_j] = 5; break;
            default: throw new Error("Something went wrong with a literal coordinate!");
          }
        else if(isNumbered) pairs[pair_i][coord_j] = pairs[pair_i][coord_j].slice(1)*1;
      }
    }
    return pairs;
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
      if(matrixCols === this.nthDimension + 1 && matrixRows === matrixCols - 1)
        transformed = matrixPointMultiplication(matrices[i], new PointND(...transformed.coordinates, 1));
      else transformed = matrixPointMultiplication(matrices[i], transformed);
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
    if(dimensionsLeft === 0) return this;

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
    let projected = matrixPointMultiplication(projectionMatrix, this);
    return projected.projectInto(dimensions, isOrto);
  }

  draw(depth, scale=SCALE, nthDimensionPoint=undefined){
    // only a point in 2 dimensions can be drawn on a screen
    if(this.nthDimension > 2) throw new Error("This point has too many dimensions to be drawn. You should project it");
    if(this.nthDimension === 2){
      context.beginPath();
      let positionX = scale*this.coordinates[0] + 5 + screenDimensions.width/2;
      let positionY = scale*this.coordinates[1] + 5 + screenDimensions.height/2;
      let pointSize = 5 / (cameraDistance - depth);
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
    this.nthDimension = this.vertices[0].nthDimension;
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
  
  render(scale=SCALE * Math.pow(3, DIMENSIONS - 3)){
    this.vertices.forEach(vertex => {
      let projectedVertex = vertex.projectInto(2);
      let sampleForHigherDimension = undefined;
      let depth = 1;
      if(vertex.nthDimension > 3) sampleForHigherDimension = vertex;
      if(vertex.nthDimension > 2) depth = vertex.coordinates[2];
      projectedVertex.draw(depth, scale, vertex);
    });
  }
  extendIn(dimensions){
    let amountOfZeros = dimensions - this.nthDimension;
    if(amountOfZeros < 0) throw new Error("Impossible extension in a lower dimension");
    if(amountOfZeros === 0) return this;
    let zerosToAppend = Array(amountOfZeros).fill(0);
    this.vertices = this.vertices.map(vertex => new PointND(...vertex.coordinates.concat(zerosToAppend)));
    return new MeshND(this.vertices);
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
      return (new Hypercube(1, side)).vertices;
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
class Orthoplex extends MeshND{
  constructor(dimensions, side){
    const vertices = Orthoplex.#createOrthoplex(dimensions, side);
    super(vertices);
  }

  static #createOrthoplex(dimensions, side, pointstamp=[]){
    if(dimensions === 0){
      return [ new PointND(...pointstamp) ];
    }else if(!pointstamp.includes(side*Math.SQRT1_2) && !pointstamp.includes(-side*Math.SQRT1_2) && dimensions === 1)
      return [...this.#createOrthoplex(dimensions - 1, side, pointstamp.concat(side*Math.SQRT1_2)),
      ...this.#createOrthoplex(dimensions - 1, side, pointstamp.concat(-side*Math.SQRT1_2))]
    else if(!pointstamp.includes(side*Math.SQRT1_2) && !pointstamp.includes(-side*Math.SQRT1_2))
      return [
        ...this.#createOrthoplex(dimensions - 1, side, pointstamp.concat(side*Math.SQRT1_2)),
        ...this.#createOrthoplex(dimensions - 1, side, pointstamp.concat(-side*Math.SQRT1_2)),
        ...this.#createOrthoplex(dimensions - 1, side, pointstamp.concat(0))
      ];
    else return [...this.#createOrthoplex(dimensions - 1, side, pointstamp.concat(0))];
  }
}

class Hypersphere extends MeshND{
  constructor(dimensions, radius, complexity=10){
    const vertices = Hypersphere.#createHypersphere(dimensions, radius, complexity);
    super(vertices);
  }
  // Funzione ricorsiva per la creazione di ipersfere
static #createHypersphere(dimensions, radius, complexity, pointstamp=[]) {
  let stepAngle = Math.PI/complexity;
  if (dimensions === 1) {
    return new Hypercube(1, radius).vertices;
  }
  if (dimensions === 2) {
    // Caso base: restituisci un array con un singolo punto
    return Hypersphere.#createCircle(radius, stepAngle, pointstamp);
  } else {
    // Caso ricorsivo: costruisci i punti utilizzando le sezioni di ipersfere di dimensioni inferiori
    let points = [];
    for (let i=0; i<=complexity; i++){
      let w = radius*(Math.cos(Math.PI - i*Math.PI/complexity));
      let oldHypersphereRadius = Math.sqrt(radius * radius - w * w);
      let oldHypersphere = Hypersphere.#createHypersphere(dimensions - 1, oldHypersphereRadius, complexity, pointstamp.concat(w));
      points.push(...oldHypersphere);
    }
    return points;
  }
}
  // Function to create a 2D circle of points, given radius and a stepangle.
  static #createCircle(radius, stepAngle, pointstamp=[]) {
    let points = [];
    for (let theta = 0; theta < 2 * Math.PI; theta += stepAngle) {
      let x = radius * Math.cos(theta);
      let y = radius * Math.sin(theta);
      let newPoint = new PointND(x, y, ...pointstamp);
      if(!points.includes(newPoint)) points.push(newPoint);
    }
    return points;
  }
}

class Torus extends MeshND{
  constructor(dimensions, radius, distanceFromTheCenter=2*radius, complexity=10){
    const vertices = Torus.#createTorus(dimensions, radius, distanceFromTheCenter, complexity);
    super(vertices);
  }

  static #createTorus(dimensions, radius, distanceFromTheCenter, complexity){
    let vertices = [];
    let slice = new Hypersphere(dimensions - 1, radius, complexity/2);
    slice = slice.extendIn(dimensions);
    let zerosToAppend = Array(dimensions - 1).fill(0);
    slice.transform(Matrix.translation(radius + distanceFromTheCenter, ...zerosToAppend));
    let lastCoordinate = dimensions - 1;
    
    let stepAngle = Math.PI/complexity;
    for(let i=0; i<2*complexity; i++){
      let rotationAroundCenter = Matrix.rotationsInNthDimension(dimensions, stepAngle, PointND.origin(dimensions).coordinates, `x_d${lastCoordinate}`);
      slice.transform(...rotationAroundCenter);
      vertices = vertices.concat(slice.vertices);
    }
    return vertices;
  }
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
  const DIMENSIONS = 4;
  let torus = new Torus(DIMENSIONS, 0.5, undefined, 10);
  let sphere = new Hypersphere(DIMENSIONS, 0.3, 10);
  let cube = new Hypercube(DIMENSIONS, 2);
  let simplex = new Simplex(DIMENSIONS, 0.5);
  let rotationMatrices = Matrix.rotationsInNthDimension(DIMENSIONS, angle, cube.barycenter().coordinates);
  
  // cube.transform(Matrix.translation(2, ...Array(DIMENSIONS - 1).fill(0)));
  simplex.transform(Matrix.translation(-2, ...Array(DIMENSIONS - 1).fill(0)));
  torus = torus.extendIn(DIMENSIONS);
  torus.transform(...rotationMatrices);
  sphere.transform(...rotationMatrices);
  cube.transform(...rotationMatrices);
  simplex.transform(...rotationMatrices);

  torus.render(SCALE * Math.pow(3, DIMENSIONS - 3)); // A sample point with a coordinate "1" is divided by 3 for each projection
  // sphere.render(SCALE * Math.pow(3, DIMENSIONS - 3)); // A sample point with a coordinate "1" is divided by 3 for each projection
  // cube.render(SCALE * Math.pow(3, DIMENSIONS - 3)); // A sample point with a coordinate "1" is divided by 3 for each projection
  // simplex.render(SCALE * Math.pow(3, DIMENSIONS - 3)); // A sample point with a coordinate "1" is divided by 3 for each projection

  requestAnimationFrame(tic);
}
function resizeCanvas() {
  screenDimensions.width = window.innerWidth;
  context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
  tic(); // Redraw the scene
}

window.addEventListener("resize", resizeCanvas);

tic();