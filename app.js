const canvas = document.querySelector("canvas");
let context = canvas.getContext("2d");
const dims = {
  "width": window.innerWidth,
  "height": 77.5/100 *window.innerHeight
};
canvas.width = dims.width;
canvas.height = dims.height;
let angle = 0;
const pointSize = 10;
const cameraDistance = 3;
const SCALE = 200;

function matrixPointMul(matrix, point){
  let result = [];
  if(matrix[0].length !== point.nthDimension) throw new Error(`Invalid dimensions: matrix ${matrix[0].length}, point.nthDimension ${point.nthDimension}`);
  for (let i = 0; i < matrix.length; i++) {
    let sum = 0;
    for (let j = 0; j < matrix[0].length; j++) {
      sum += matrix[i][j] * point.coordinates[j];
    }
    result[i] = sum;
  }
  return new PointND(result);
}

function createAllRotationMatrices(nthDimension){
  let matrices = [];
  let mainDiagonals = arrangeAllMainDiagonals(nthDimension);
  for(let n=0; n<mainDiagonals.length; n++){
    matrices[n] = {
      mainDiagonal: mainDiagonals[n],
      mat: [],
      alreadyAdded: false
    };
    let sinesLeft = 2;
    for(let i=0; i<mainDiagonals[0].length; i++){
      matrices[n].mat[i] = []
      for(let j=0; j<mainDiagonals[0].length; j++){
        if(i === j) matrices[n].mat[i][j] = mainDiagonals[n][j].value;
        else if(mainDiagonals[n][j].value === 1 || mainDiagonals[n][i].value === 1) matrices[n].mat[i][j] = 0;
        else if(sinesLeft === 2){
          matrices[n].mat[i][j] = - Math.sin(angle);
          sinesLeft--;
        } else {
          matrices[n].mat[i][j] = Math.sin(angle);
          sinesLeft--;
        }
      }
    }
  }
  return matrices;
}

function filterRotations(matrices, filterRules={}){
  let filteredMatrices = [];
  // the array numbers are referred to those rotation which transforms the all the coordinates from 0 to n-1 has a variable angle
  if(Array.isArray(filterRules.only.coordinatesPairs)){
    for(let n=0; n<filterRules.only.coordinatesPairs.length; n++){
      if(filterRules.only.coordinatesPairs[0].length !== 2) throw new Error("Invalid length for a coordinate pair");
      let x = filterRules.only.coordinatesPairs[n][0];
      let y = filterRules.only.coordinatesPairs[n][1];
      for(let i=0; i<matrices.length; i++){
        if(matrices[i].alreadyAdded) continue;
        // the filter depends on type of only: if both of the coordinates must have cosine is "and", if at least one "or"
        if(filterRules.only.type === "and" && !(matrices[i].mainDiagonal[x].isCosine && matrices[i].mainDiagonal[y].isCosine)) continue;
        if(filterRules.only.type === "or" && !(matrices[i].mainDiagonal[x].isCosine || matrices[i].mainDiagonal[y].isCosine)) continue;
        matrices[i].alreadyAdded = true;
        filteredMatrices.push(matrices[i]);
      }
    }
  }
  return filteredMatrices;
}

function arrangeAllMainDiagonals(nthDimension, mainDiagonal=[], cosinesLeft=2){
  if(nthDimension === 0){
    return [ mainDiagonal ];
  }
  // all dispositions among two "cosines" and "1"
  let dispositions = [];
  // checks if all "cosines" are used till the last position, if not, you must use the last cosine
  // before completing the diagonal in order to create a valid rotation matrix
  if(cosinesLeft === nthDimension)
    dispositions = [...arrangeAllMainDiagonals(nthDimension - 1, mainDiagonal.concat({value: Math.cos(angle), isCosine: true}), cosinesLeft - 1)];
  // if two cosines are used, you cannot use another one
  else if(cosinesLeft > 0) dispositions = [
    ...arrangeAllMainDiagonals(nthDimension - 1, mainDiagonal.concat({value: Math.cos(angle), isCosine: true}), cosinesLeft - 1),
    ...arrangeAllMainDiagonals(nthDimension - 1, mainDiagonal.concat({value: 1, isCosine: false}), cosinesLeft)
  ]
  else dispositions = [...arrangeAllMainDiagonals(nthDimension - 1, mainDiagonal.concat({value: 1, isCosine: false}), cosinesLeft)];
  // if( dispositions.length !== actualDispositions) throw new Error("Something went wrong: in "+nthDimension+" dimensions there are not "+dispositions.length+" rotations");
  return dispositions;
}

class PointND{
  constructor(...coordinates){
    this.nthDimension = coordinates.length;
    this.coordinates = coordinates;
  }
  traslate(vector){
    for(let i=0; i<vector.length; i++) this.coordinates[i] += vector[i];
    return this;
  }
  convertTo(dimensions){
    let extension = [];
    let dimensionsLeft = dimensions - this.nthDimension;
    for(let i=0; i<dimensionsLeft; i++) extension[i] = 0;
    return new PointND([...this.coordinates, ...extension]);
  }
  projectInto(dimensions=2, isOrto=false){
    let dimensionsLeft = this.nthDimension - dimensions;
    if(dimensionsLeft === 0) return new PointND(this.coordinates);

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
    } else if(this.nthDimension === 1) (new PointND([...this.coordinates,0])).draw(depth);
    else if(this.nthDimension === 0) (new PointND([0,0])).draw(depth);
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

function createHyperCube(dimensions, side, pointstamp=[]){
  if(dimensions === 0){
    return [ new PointND(pointstamp) ];
  }else return [
    ...createHyperCube(dimensions - 1, side, pointstamp.concat(side/2)),
    ...createHyperCube(dimensions - 1, side, pointstamp.concat(-side/2))
  ];
}
function oppositeVector(vector){
  for(let i=0; i<vector.length; i++) vector[i] *= -1;
  return vector;
}

function createSimplex(dimensions, side, pointstamp=[]){
  if(dimensions === 1){
    return createHyperCube(1, side, pointstamp);
  }else{
    let oldSimplexVertices = createSimplex(dimensions - 1, side, pointstamp);
    let oldBarycenter = barycenterOf(oldSimplexVertices);
    let newVertex = new PointND([...oldBarycenter.coordinates, Math.sqrt(side**side - distanceSquare(oldBarycenter, oldSimplexVertices[0]))]);
    let vertices = [ ...oldSimplexVertices, newVertex ];
    for(let i=0; i<vertices.length; i++){
      // check if all the vertices have the same number of coordinates
      if(vertices[i].nthDimension > dimensions) throw new Error("A point has too many coordinates");
      if(vertices[i].nthDimension < dimensions) vertices[i] = vertices[i].convertTo(dimensions);
    }
    let oppositeNewBarycenterVector = oppositeVector(barycenterOf(vertices).coordinates);
    for (let i=0; i<vertices.length; i++){
      // center the simplex with a traslation
      vertices[i].traslate(oppositeNewBarycenterVector);
    }
    return vertices;
  }
}

function barycenterOf(points){
  let barycenterCoords = [];
  let sum = 0;
  for(let dim=0; dim<points[0].nthDimension; dim++){
    for(let i=0; i<points.length; i++){
      sum += points[i].coordinates[dim];
    }
    barycenterCoords.push(sum/points.length);
    sum = 0;
  }
  return new PointND(barycenterCoords);
}


function distanceSquare(pointA, pointB){
  let sum=0;
  for(let dim=0; dim<pointA.nthDimension; dim++) sum += Math.pow(pointA.coordinates[dim] - pointB.coordinates[dim], 2);
  return sum;
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

function flattenArray(arr) {
  console.log("flatten");
  return arr.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenArray(val)) : acc.concat(val), []);
}

let vertices = createSimplex(4, 2);

let initialTime = Date.now();
const speed = 0.6 // rad/s

vertices = flattenArray(vertices);

function tic(){
  angle = (angle > 2*Math.PI) ? angle - 2*Math.PI : angle;
  let lastTime = Date.now();
  let deltaTime = lastTime - initialTime;
  angle += speed * deltaTime / 1000;
  initialTime = lastTime;

  context.clearRect(0,0,window.innerWidth,window.innerHeight);

  vertices = vertices.sort((a,b) => b.z - a.z)
  for(let i=0; i<vertices.length; i++){
    let rotated = vertices[i];
    let rotationMatrices = createAllRotationMatrices(rotated.nthDimension);
    let filterRules = {
      only: {
        coordinatesPairs: [[0, 2], [1,3]],
        type: "and"
      }
    }
    let filteredRotationMatrices = filterRotations(rotationMatrices, filterRules);
    console.log(filteredRotationMatrices);
    for(let i=0; i<filteredRotationMatrices.length; i++){
      rotated = matrixPointMul(filteredRotationMatrices[i].mat, rotated);
    }
  
    let projected = rotated.projectInto(2);
    projected.draw(rotated.coordinates[2], SCALE, rotated);
  }
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