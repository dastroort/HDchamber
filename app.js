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
  angle = (angle > 2 * lcm(6, 12) * Math.PI) ? angle - 2 * lcm(1, 12) * Math.PI : angle;
  let lastTime = Date.now();
  let deltaTime = lastTime - initialTime;
  angle += speed * deltaTime / 1000;
  initialTime = lastTime;
  renderEnvironment(input);
}
function renderEnvironment(input) {
  const mesh = new (shapesMap.get(input))(DIMENSIONS);
  GEOLIB.uploadEnvironment();
  let rotationMatrices = GEOLIB.Matrix.rotationsInNthDimension(DIMENSIONS, [angle, angle, 0.5 * angle, 0, angle / 12, 0 * angle, angle / 12, ...Array(nCr(9, 2) - 7).fill(angle / 3)], GEOLIB.PointND.origin(DIMENSIONS).coordinates, "all");
  mesh.transform(...rotationMatrices);
  mesh.render(isOrtoActivated);

  requestAnimationFrame(() => tic(input));
}