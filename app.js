import * as GEOLIB from "/geolib.js"

let initialTime = Date.now();
const speed = Math.PI / 4 // rad/s
let DIMENSIONS = 2;
const MIN_DIMENSIONS = 2;
const MAX_DIMENSIONS = 6;
let isOrtoActivated = false;
let angle = 0;
let isRendering = false;

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
const shapesDropmenu = document.querySelector(".shape-handler + .dropmenu");
shapeHandlerBtn.addEventListener("click", () => {
  shapesDropmenu.classList.toggle("open");
  // Imposta display:none appena finisce la transizione per evitare bug.
  shapesDropmenu.addEventListener("transitionend", () => {
    if (!shapesDropmenu.classList.contains("open")) {
      shapesDropmenu.style.display = "none";
    }
  });
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
  shapesDropmenu.appendChild(shape);
});

const shapesBtns = shapesDropmenu.querySelectorAll(".button.shape");
shapesBtns.forEach(button => {
  button.addEventListener("click", () => {
    const input = button.innerHTML;
    if (input !== "And so on...") {
      tic(input);
    } else {
      alert("Wait for new shapes!");
    }
  });
});

// Gestione del bottone per cambiare il numero di dimensioni
const dimensionHandlerBtn = document.querySelector(".dimension-handler");
dimensionHandlerBtn.addEventListener("click", () => {
    let n = prompt(`Enter the number of dimensions of the shape you want to see (${MIN_DIMENSIONS}-${MAX_DIMENSIONS}):`) * 1;
    if (n >= 2 && n <= 6) {
      DIMENSIONS = n;
      if (isRendering) {
        const h1 = document.querySelector("h1");
        h1.innerHTML = `A ${DIMENSIONS}-${input} rotating in ${DIMENSIONS}`;
      }
    } else {
      alert(`Invalid number of dimensions: ${n}`);
    }
  }
);

// Gestione del bottone per impostare le rotazioni
const rotationHandlerBtn = document.querySelector(".rotation-handler");
rotationHandlerBtn.addEventListener("click", () => {});

const rotationsDropmenu = document.querySelector(".rotation-handler + .dropmenu");
rotationHandlerBtn.addEventListener("click", () => {
  rotationsDropmenu.classList.toggle("open");
});

const rotationPlanes = ["xz", "xy", "yw", "zw"];
const angularSpeedFactors = [1, 1, 0.5, 0.75];

const rotationsMap = new Map();
for (let i=0; i<rotationPlanes.length; i++) {
  rotationsMap.set(rotationPlanes[i], angularSpeedFactors[i]);
}
let rotationHandlerOptions = document.createElement("ul");
rotationHandlerOptions.classList.add("rotation-handler-options", "button");
rotationsMap.set("+", null);
rotationsMap.set("-", null);

rotationsMap.keys().forEach((key => {
  const rotationPlane = document.createElement("li");
  rotationPlane.classList.add("button", "rotation-plane", key);
  rotationPlane.innerHTML = key.toUpperCase();
  rotationsDropmenu.appendChild(rotationPlane);
}));

// Edita il fattore di velocità di rotazione di un piano, toglilo o aggiungilo.
const rotationPlanesBtns = document.querySelectorAll(".button.rotation-plane");
rotationPlanesBtns.forEach(button => {
  button.addEventListener("click", () => {
    const input = button.innerHTML.toLowerCase();
    if (input === "+" || input === "-") {
      let rotationPlane = prompt("Enter the rotation plane you want to add or remove:");
      if (rotationPlane) {
        if (rotationPlanes.includes(rotationPlane)) {
          let index = rotationPlanes.indexOf(rotationPlane);
          rotationPlanes.splice(index, 1);
          angularSpeedFactors.splice(index, 1);
          rotationsDropmenu.querySelector(`.${rotationPlane}`).remove();
        } else {
          const rotationPlaneBtn = document.createElement("li");
          rotationPlaneBtn.classList.add("button", "rotation-plane", rotationPlane);
          rotationPlanes.push(rotationPlane);
          rotationPlaneBtn.innerHTML = rotationPlane.toUpperCase();
          angularSpeedFactors.push(1);
          rotationsDropmenu.appendChild(rotationPlaneBtn);
        }
      }
    } else {
      let rotationPlane = input;
      let angularSpeedFactor = prompt(`Enter the angular speed factor for the plane ${rotationPlane}:`);
      if (angularSpeedFactor) {
        let index = rotationPlanes.indexOf(rotationPlane);
        angularSpeedFactors[index] = angularSpeedFactor * 1;
      }
    }
  });
});

function tic(input) {
  isRendering = true;
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

  if (rotationPlanes.length !== angularSpeedFactors.length) throw new Error(`Num of planes and angles must be equal:\nRotation planes: ${rotationPlanes} (${rotationPlanes.length})\nAngles: ${angularSpeedFactors} (${angularSpeedFactors.length})`);
  // Fixed angle problem: now every angle is normalized indipendently.
  let angles = angularSpeedFactors.map(factor => factor * angle % (2 * Math.PI));

  let minRotationDimensions;
  rotationPlanes.forEach(plane => {
    let dimensions = plane.split("");
    dimensions = dimensions.map(axis => GEOLIB.axisIdentifiers.indexOf(axis) + 1);
    dimensions.forEach(dims => {
      if (!minRotationDimensions) {
        minRotationDimensions = dims;
      } else {
        minRotationDimensions = Math.max(minRotationDimensions, dims);
      }
    });
  });
  const h1 = document.querySelector("h1");
  h1.innerHTML = `A ${DIMENSIONS}-${input} rotating in ${minRotationDimensions}D`;

  for(let i=0; i<rotationPlanes.length; i++){
    M.set("r", [rotationPlanes[i], angles[i]]);
    mesh.transform(M.value);
  }

  M.destroy();
  mesh.render(minRotationDimensions, isOrtoActivated);
  requestAnimationFrame(() => tic(input));
}