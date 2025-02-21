import * as GEOLIB from "/geolib.js"

let initialTime = Date.now();
const speed = Math.PI / 4 // rad/s
const DIMENSIONS = 4;
let isOrtoActivated = false;
function hcf(n, m) {
  if (m === 0) return n;
  let remainder = n % m;
  return hcf(m, remainder);
}
function lcm(n, m) {
  return n * m / hcf(n, m);
}
function factorial(n) {
  if (n === 0 || n === 1) return 1;
  return n * factorial(n - 1);
}
function nCr(n, r) {
  return factorial(n) / (factorial(r) * factorial(n - r));
}
let angle = 0;

// Switch projection mode: orthogonal or perspective projection 
const projectionModeBtn = document.querySelector(".projection-mode");
projectionModeBtn.addEventListener("click", () => {
  isOrtoActivated = isOrtoActivated ? false : true;
  let icon = projectionModeBtn.querySelector(".icon");
  icon.src = `./icons/orto_${isOrtoActivated ? "on" : "off"}.png`;
});

window.addEventListener("resize", () => {
  GEOLIB.resizeCanvas();
  const h1 = document.querySelector("h1");
  h1.style.textAlign = "center";
  const legend = document.querySelector("legend");
  legend.style.margin = "auto";
  tic();
});

// Open and close a dropmenu
const shapeHandlerBtn = document.querySelector(".shape-handler");
const dropmenu = document.querySelector(".dropmenu");
shapeHandlerBtn.addEventListener("click", () => {
  dropmenu.classList.toggle("open");
});

// A js map is similar to a python dict
const shapesMap = new Map();
shapesMap.set("Hypercube", GEOLIB.Hypercube);
shapesMap.set("Simplex", GEOLIB.Simplex);
shapesMap.set("Hypersphere", GEOLIB.Hypersphere);
shapesMap.set("Torus", GEOLIB.Torus);
shapesMap.set("Orthoplex", GEOLIB.Orthoplex);
shapesMap.set("And so on...", null);

shapesMap.keys().forEach(key => {
  const shape = document.createElement("li");
  shape.classList.add("button", "shape");
  shape.innerHTML = key;
  dropmenu.appendChild(shape);
});

const shapesBtns = dropmenu.querySelectorAll(".button.shape");
shapesBtns.forEach(button => {
  button.addEventListener("click", () => {
    const input = button.innerHTML;
    const h1 = document.querySelector("h1");
    if (input !== "And so on...") {
      h1.innerHTML = `A ${DIMENSIONS}-${input} rotating in ${DIMENSIONS}D`;
      tic(input);
    } else {
      alert("Wait for new shapes!");
    }
  });
});

function tic(input) {
  let lastTime = Date.now();
  let deltaTime = lastTime - initialTime;
  angle += speed * deltaTime / 1000;
  initialTime = lastTime;
  renderEnvironment(input);
}
function renderEnvironment(input) {
  const mesh = new (shapesMap.get(input))(DIMENSIONS);
  GEOLIB.uploadEnvironment();
  // Fixed matrix problem: now only one multipurpose matrix is uploaded every time with matrix stamps.
  let M = GEOLIB.SingletonMatrix.init(DIMENSIONS, DIMENSIONS);

  const matrixStamps = ["xz", "xy", "yw", "zw"];
  const angles = [angle, angle, 0.5*angle, 0.75*angle];
  // Fixed angle problem: now every angle is normalized indipendently.
  angles.forEach((theta, index, array) => {
    array[index] = theta % (2 * Math.PI);
  });
  // :88
  for(let i=0; i<matrixStamps.length; i++){
    if (matrixStamps.length !== angles.length) throw new Error("Num of stamps and angles must be equal.");
    M.set("r", [matrixStamps[i], angles[i]]);
    mesh.transform(M.value);
  }
  M.destroy();
  mesh.render(isOrtoActivated);

  requestAnimationFrame(() => tic(input));
}