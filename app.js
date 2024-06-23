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

function matrixVectorMul(matrix, vector){
  if(matrix[0].length === vector.length){
    let result = [];
    for (let i = 0; i < matrix.length; i++) {
      result[i] = [];
      let sum = 0;
      for (let j = 0; j < matrix[0].length; j++) {
        sum += matrix[i][j] * vector[j][0];
        result[i][0] = sum;
      }
    }
    return result;
  } else {
    throw new Error(`Invalid dimensions: matrix ${matrix[0].length}, vector ${vector.length}`);
  }
}


function OrtoProjection3D(){ return [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0]
  ];
}
const cameraDistance = 3;
const SCALE = 500;
function PerspectiveProjection3D(depthVariable, scale=1){ let w = scale / (cameraDistance - depthVariable); return [
    [w, 0, 0, 0],
    [0, w, 0, 0],
    [0, 0, w, 0]
  ];
}
function OrtoProjection2D(scale=0.5*SCALE){ return [
    [scale, 0, 0],
    [0, scale, 0]
  ];
}
function PerspectiveProjection2D(depthVariable, scale=SCALE){ let z = scale / (cameraDistance - depthVariable); return [
    [z, 0, 0],
    [0, z, 0]
  ];
}
function OrtoProjection1D(){ return [
    [1, 0]
  ];
}
function PerspectiveProjection1D(yVariable, scale=2*SCALE/5){ let y = scale / (50*cameraDistance - yVariable); return [
    [y, 0]
  ];
}

function RotationXY(angle){ return [
    [Math.cos(angle), -Math.sin(angle), 0, 0],
    [Math.sin(angle), Math.cos(angle), 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ];
}
function RotationXZ(angle){ return [
    [Math.cos(angle), 0, Math.sin(angle), 0],
    [0, 1, 0, 0],
    [-Math.sin(angle), 0, Math.cos(angle), 0],
    [0, 0, 0, 1]
  ];
}
function RotationYZ(angle){ return [
    [1, 0, 0, 0],
    [0, Math.cos(angle), -Math.sin(angle), 0],
    [0, Math.sin(angle), Math.cos(angle), 0],
    [0, 0, 0, 1]
  ];
}
function RotationXW(angle){ return [
    [Math.cos(angle), 0, 0, -Math.sin(angle)],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [Math.sin(angle), 0, 0, Math.cos(angle)]
  ];
}
function RotationYW(angle){ return [
    [1, 0, 0, 0],
    [0, Math.cos(angle), 0, -Math.sin(angle)],
    [0, 0, 1, 0],
    [0, Math.sin(angle), 0, Math.cos(angle)]
  ];
}
function RotationZW(angle){ return [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, Math.cos(angle), -Math.sin(angle)],
    [0, 0, Math.sin(angle), Math.cos(angle)]
  ];
}


class Point1D{
  constructor(x){
    this.x = x;
  }

  toVector() {return [ [this.x] ]; }
  static toPoint(vector) { return new Point1D(vector[0][0]); }

  draw(width, depth){
    context.beginPath();
    context.arc(this.x + pointSize/2 + dims.width/2, pointSize/2 + dims.height/2, pointSize / (cameraDistance - width), 0, 2*Math.PI, false);
    context.stroke();
    context.strokeStyle = "rgba(0,0,0,0.25)";

    const hue = 36 * depth + 270;
    const color = `hsla(${hue}, 100%, 50%, ${250 / (cameraDistance - width)}%)`;

    context.fillStyle = color;
    context.fill();
    context.closePath();
  }
}

class Point2D extends Point1D{
  constructor(x, y){
    super(x);
    this.y = y;
  }

  toVector() { return [ [this.x], [this.y] ]; }
  static toPoint(vector) { return new Point2D(vector[0][0], vector[1][0]); }

  draw(depth, hyperdepth){
    context.beginPath();
    context.arc(this.x + pointSize/2 + dims.width/2, this.y + pointSize/2 + dims.height/2, pointSize / (cameraDistance - depth), 0, 2*Math.PI, false);
    context.stroke();
    context.strokeStyle = "rgba(0,0,0,0.25)";

    const hue = 36 * hyperdepth + 270;
    const color = `hsla(${hue}, 100%, 50%, ${250 / (cameraDistance - depth)}%)`;

    context.fillStyle = color;
    context.fill();
    context.closePath();
  }
}
class Point3D extends Point2D{
  constructor(x, y, z){
    super(x,y);
    this.z = z;
  }
  toVector() { return [ [this.x], [this.y], [this.z] ]; }
  static toPoint(vector) { return new Point3D(vector[0][0], vector[1][0], vector[2][0]); }
  
  // other methods ...
}
class Point4D extends Point3D{
  constructor(x, y, z, w){
    super(x,y,z);
    this.w = w;
  }
  toVector() { return [ [this.x], [this.y], [this.z], [this.w] ]; }
  static toPoint(vector) { return new Point4D(vector[0][0], vector[1][0], vector[2][0], vector[3][0]); }
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
      points.push(new Point4D(x, y, fixedCoordinates.z, fixedCoordinates.w));
    } else if (fixedCoordinates.y !== undefined){
      let z = y;
      points.push(new Point4D(x, fixedCoordinates.y, z, fixedCoordinates.w));
    } else if (fixedCoordinates.x !== undefined){
      let z = y;
      y = x;
      points.push(new Point4D(fixedCoordinates.x, y, z, fixedCoordinates.w));
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

function createSimplex4D(){
  return [
    new Point4D(-1, -Math.sqrt(3)/3, -Math.sqrt(6)/6, -Math.sqrt(10)/10),
    new Point4D(1, -Math.sqrt(3)/3, -Math.sqrt(6)/6, -Math.sqrt(10)/10),
    new Point4D(0, 2*Math.sqrt(3)/3, -Math.sqrt(6)/6, -Math.sqrt(10)/10),
    new Point4D(0, 0, Math.sqrt(6)/2, -Math.sqrt(10)/10),
    new Point4D(0, 0, 0, 2*Math.sqrt(10)/5)
  ];
}

function createCube3D() {
  const vertices = [];
  for (let i = -1; i <= 1; i += 2) {
    for (let j = -1; j <= 1; j += 2) {
      for (let k = -1; k <= 1; k += 2) {
        vertices.push(new Point4D(i, j, k, 0));
      }
    }
  }
  return vertices;
}

function createCube4D() {
  const vertices = [];
  for (let i = -1; i <= 1; i += 2) {
    for (let j = -1; j <= 1; j += 2) {
      for (let k = -1; k <= 1; k += 2) {
        for (let l = -1; l <= 1; l += 2) {
          vertices.push(new Point4D(i, j, k, l));
        }
      }
    }
  }
  return vertices;
}

function create24Cell() {
  const vertices = [];
  // Generate vertices of the form (±1, ±1, 0, 0)
  const coords = [1, -1];
  for (let i of coords) {
    for (let j of coords) {
      vertices.push(new Point4D(i, j, 0, 0));
      vertices.push(new Point4D(i, 0, j, 0));
      vertices.push(new Point4D(i, 0, 0, j));
      vertices.push(new Point4D(0, i, j, 0));
      vertices.push(new Point4D(0, i, 0, j));
      vertices.push(new Point4D(0, 0, i, j));
    }
  }
  // Generate vertices of the form (±1, 0, 0, 0)
  for (let i of coords) {
    vertices.push(new Point4D(i, 0, 0, 0));
    vertices.push(new Point4D(0, i, 0, 0));
    vertices.push(new Point4D(0, 0, i, 0));
    vertices.push(new Point4D(0, 0, 0, i));
  }
  return vertices;
}

function flattenArray(arr) {
  console.log("flatten");
  return arr.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenArray(val)) : acc.concat(val), []);
}

let vertices = createSimplex4D();

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
    rotated = Point4D.toPoint(matrixVectorMul(RotationXY(angle), rotated.toVector()));
    rotated = Point4D.toPoint(matrixVectorMul(RotationXZ(angle), rotated.toVector()));
    rotated = Point4D.toPoint(matrixVectorMul(RotationYZ(angle), rotated.toVector()));
  
    rotated = Point4D.toPoint(matrixVectorMul(RotationXW(angle), rotated.toVector()));
    rotated = Point4D.toPoint(matrixVectorMul(RotationYW(angle), rotated.toVector()));
    rotated = Point4D.toPoint(matrixVectorMul(RotationZW(angle), rotated.toVector()));
  
    let projected3D = Point3D.toPoint(matrixVectorMul(PerspectiveProjection3D(rotated.w), rotated.toVector()));
    let projected2D = Point2D.toPoint(matrixVectorMul(PerspectiveProjection2D(projected3D.z), projected3D.toVector()));
    projected2D.draw(rotated.z, rotated.w);
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