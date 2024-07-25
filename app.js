import * as GEOLIB from "/geolib.js"

let initialTime = Date.now();
const speed = Math.PI / 4 // rad/s
const DIMENSIONS = 4;
let isOrtoActivated = false;
function hcf(n, m){
  if(m === 0) return n;
  let remainder = n % m;
  return hcf(m, remainder);
}
function lcm(n, m){
  return n * m / hcf(n, m);
}
function factorial(n){
  if(n===0 || n===1) return 1;
  return n*factorial(n-1);
}
function nCr(n, r){
  return factorial(n) / (factorial(r) * factorial(n-r));
}
let angle = 0;
function tic(){
  angle = (angle > 2*lcm(6, 12)*Math.PI) ? angle - 2*lcm(1, 12)*Math.PI : angle;
  let lastTime = Date.now();
  let deltaTime = lastTime - initialTime;
  angle += speed * deltaTime / 1000;
  initialTime = lastTime;
  
  renderEnvironment();
}
function renderEnvironment(){
  GEOLIB.uploadEnvironment();
  // let torus = new Torus(DIMENSIONS, 0.5, undefined, 10);
  // let sphere = new Hypersphere(DIMENSIONS, 2, 10);
  // let cube = new GEOLIB.Hypercube(DIMENSIONS, 2);
  let simplex = new GEOLIB.Simplex(DIMENSIONS, 3);
  let rotationMatrices = GEOLIB.Matrix.rotationsInNthDimension(DIMENSIONS, [Math.PI/4, angle, 0*angle, 0, angle/12, 0*angle], GEOLIB.PointND.origin(DIMENSIONS).coordinates, "all");
  
  // cube.transform(Matrix.translation(1.5, ...Array(DIMENSIONS - 1).fill(0)));
  // simplex.transform(Matrix.translation(-2, ...Array(DIMENSIONS - 1).fill(0)));
  // torus = torus.extendIn(DIMENSIONS);
  // torus.transform(...rotationMatrices);
  // sphere.transform(...rotationMatrices);
  // cube.transform(...rotationMatrices);
  simplex.transform(...rotationMatrices);

  // torus.render(SCALE * Math.pow(3, DIMENSIONS - 3)); // A sample point with a coordinate "1" is divided by 3 for each projection
  // sphere.render(SCALE * Math.pow(3, DIMENSIONS - 3), false); // A sample point with a coordinate "1" is divided by 3 for each projection
  // cube.render(isOrtoActivated); // A sample point with a coordinate "1" is divided by 3 for each projection
  simplex.render(isOrtoActivated); // A sample point with a coordinate "1" is divided by 3 for each projection

  requestAnimationFrame(tic);
}

const perspectiveSwitchBtn = document.querySelector("#perspective-switch-btn");
perspectiveSwitchBtn.addEventListener("click", ()=>{
  isOrtoActivated = isOrtoActivated ? false : true;
  let icon = perspectiveSwitchBtn.querySelector("img");
  icon.src = `./icons/orto_${isOrtoActivated ? "on" : "off"}.png`;
});

tic();