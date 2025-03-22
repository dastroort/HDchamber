import * as GEOLIB from "/geolib.js";

// VARIABILI GLOBALI PER L'APPLICAZIONE
const app = {
  initialTime: Date.now(),
  finalTime: null,
  deltaTime: () => app.finalTime - app.initialTime,
  angularSpeed: Math.PI / 4, // rad/s
  dimensionsToRender: 4,
  MIN_DIMENSIONS: 2,
  MAX_DIMENSIONS: 6,
  angle: 0,
  isRendering: false,
  guiHandlers: {},
};

// CONFIGURAZIONE DEL CANVAS
window.addEventListener("resize", () => {
  GEOLIB.resizeCanvas();
  const h1 = document.querySelector("h1");
  h1.style.textAlign = "center";
  const legend = document.querySelector("legend");
  legend.style.margin = "auto";
  tic();
});

// CONFIGURAZIONE DEL BOTTONE CHE ATTIVA/DISATTIVA LA PROIEZIONE ORTOGONALE
app.guiHandlers.projection = {
  button: document.querySelector(".button.projection-mode"),
  icon: document.querySelector(".button.projection-mode .icon"),
  isOrthogonalProjection: false,
};
function toggle(itemStatus, onTrue, onFalse) {
  return itemStatus ? onFalse : onTrue;
}
app.guiHandlers.projection.button.addEventListener("click", () => {
  app.guiHandlers.projection.isOrthogonalProjection = !app.guiHandlers.projection.isOrthogonalProjection;
  app.guiHandlers.projection.icon.src = `./icons/orto_${toggle(app.guiHandlers.projection.isOrthogonalProjection, "on", "off")}.png`;
});

// CONFIGURAZIONE DEL BOTTONE CHE GESTISCE LA SELEZIONE DELLE MESH
app.guiHandlers.meshes = {
  button: document.querySelector(".meshes-handler .button"),
  dropmenu: document.querySelector(".meshes-handler .dropmenu"),
  meshButtons: null,
};

function isDropmenuOpen(dropmenu) {
  return dropmenu.classList.contains("open");
}

app.guiHandlers.meshes.button.addEventListener("click", () => {
  app.guiHandlers.meshes.dropmenu.classList.toggle("open");
  // Imposta display: none appena finisce la transizione per evitare bug
  app.guiHandlers.meshes.dropmenu.addEventListener("transitionend", () => {
    if (!isDropmenuOpen(app.guiHandlers.meshes.dropmenu)) {
      app.guiHandlers.meshes.dropmenu.style.display = "none";
    }
  });
});

const meshesMap = new Map();
meshesMap.set("Hypercube", GEOLIB.Hypercube);
meshesMap.set("Simplex", GEOLIB.Simplex);
meshesMap.set("Hypersphere", GEOLIB.Hypersphere);
meshesMap.set("Torus", GEOLIB.Torus);
meshesMap.set("Orthoplex", GEOLIB.Orthoplex);
meshesMap.set("And so on...", null);

meshesMap.keys().forEach((key) => {
  const mesh = document.createElement("li");
  mesh.classList.add("button", "mesh");
  mesh.innerHTML = key;
  app.guiHandlers.meshes.dropmenu.appendChild(mesh);
});
// Aggiorno la property prima nulla
app.guiHandlers.meshes.meshButtons = document.querySelectorAll(".button.mesh");
app.guiHandlers.meshes.meshButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const input = button.innerHTML;
    if (input !== "And so on...") {
      tic(input);
    } else {
      alert("Wait for new meshes!");
    }
  });
});

// GESTIONE DEL BOTTONE PER CAMBIARE IL NUMERO DI DIMENSIONI
app.guiHandlers.dimensions = {
  button: document.querySelector(".button.dimensions-handler"),
  input: null,
};

function isValidNumberOfDimensions(dimensionsEntered) {
  return dimensionsEntered >= app.MIN_DIMENSIONS && dimensionsEntered <= app.MAX_DIMENSIONS;
}

app.guiHandlers.dimensions.button.addEventListener("click", () => {
  app.guiHandlers.dimensions.input = prompt(`Enter the number of dimensions of the shape you want to see (${app.MIN_DIMENSIONS}-${app.MAX_DIMENSIONS}):`) * 1;

  if (!isValidNumberOfDimensions(app.guiHandlers.dimensions.input)) {
    alert(`Invalid number of dimensions: ${app.guiHandlers.dimension.input}`);
  }
  app.dimensionsToRender = app.guiHandlers.dimensions.input;

  if (app.isRendering) {
    const h1 = document.querySelector("h1");
    h1.innerHTML = `A ${app.dimensionsToRender}-${app.guiHandlers.dimensions.input} rotating in ${app.dimensionsToRender}`;
  }
});

// GESTIONE DEL BOTTONE PER IMPOSTARE LE ROTAZIONI
app.guiHandlers.rotation = {
  button: document.querySelector(".button.rotation-handler"),
  dropmenu: document.querySelector(".rotation-handler .dropmenu"),
  planes: ["xz", "xy"],
  angularSpeedFactors: [1, 1],
  planeButtons: null,
  options: null,
};
app.guiHandlers.rotation.button = document.querySelector(".rotation-handler");
app.guiHandlers.rotation.dropmenu = document.querySelector(".rotation-handler + .dropmenu");
app.guiHandlers.rotation.button.addEventListener("click", () => {
  app.guiHandlers.rotation.dropmenu.classList.toggle("open");
});

const planesMap = new Map();
for (let i = 0; i < app.guiHandlers.rotation.planes.length; i++) {
  planesMap.set(app.guiHandlers.rotation.planes[i], app.guiHandlers.rotation.angularSpeedFactors[i]);
}
app.guiHandlers.rotation.options = document.createElement("ul");
app.guiHandlers.rotation.options.classList.add("rotation-handler-options", "button");
planesMap.set("+", null);
planesMap.set("-", null);

planesMap.keys().forEach((key) => {
  const rotationPlane = document.createElement("li");
  rotationPlane.classList.add("button", "rotation-plane", key);
  rotationPlane.innerHTML = key.toUpperCase();
  app.guiHandlers.rotation.dropmenu.appendChild(rotationPlane);
});
// Edita il fattore di velocità di rotazione di un piano, toglilo o aggiungilo.
app.guiHandlers.rotation.planeButtons = document.querySelectorAll(".button.rotation-plane");
app.guiHandlers.rotation.planeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const input = button.innerHTML.toLowerCase();
    if (input === "+" || input === "-") {
      let rotationPlane = prompt("Enter the rotation plane you want to add or remove:");
      if (rotationPlane) {
        if (app.guiHandlers.rotation.planes.includes(rotationPlane)) {
          let index = app.guiHandlers.rotation.planes.indexOf(rotationPlane);
          app.guiHandlers.rotation.planes.splice(index, 1);
          app.guiHandlers.rotation.angularSpeedFactors.splice(index, 1);
          app.guiHandlers.rotation.dropmenu.querySelector(`.${rotationPlane}`).remove();
        } else {
          const newButton = document.createElement("li");
          newButton.classList.add("button", "rotation-plane", rotationPlane);
          app.guiHandlers.rotation.planes.push(rotationPlane);
          newButton.innerHTML = rotationPlane.toUpperCase();
          app.guiHandlers.rotation.angularSpeedFactors.push(1);
          app.guiHandlers.rotation.dropmenu.appendChild(newButton);
        }
      }
    } else {
      let rotationPlane = input;
      let angularSpeedFactor = prompt(`Enter the angular speed factor for the plane ${rotationPlane}:`) * 1;
      if (angularSpeedFactor) {
        let index = app.guiHandlers.rotation.planes.indexOf(rotationPlane);
        app.guiHandlers.rotation.angularSpeedFactors[index] = angularSpeedFactor;
      }
    }
  });
});
console.log(app);

function tic(input) {
  app.isRendering = true;
  app.finalTime = Date.now();
  app.angle += (app.angularSpeed * app.deltaTime()) / 1000;
  app.initialTime = app.finalTime;
  renderEnvironment(input);
}

function renderEnvironment(input) {
  const mesh = new (meshesMap.get(input))(app.dimensionsToRender);
  const rotationScope = GEOLIB.rotationScope(app.guiHandlers.rotation.planes);
  if (mesh.nthDimension() < rotationScope) mesh.extendIn(rotationScope);
  GEOLIB.uploadEnvironment();
  // Creo la matrice di rotazione
  let r = GEOLIB.SingletonMatrix.init(app.dimensionsToRender);

  if (app.guiHandlers.rotation.planes.length !== app.guiHandlers.rotation.angularSpeedFactors.length)
    throw new Error(
      `Num of planes and angles must be equal:\nRotation planes: ${app.guiHandlers.rotation.planes} (${app.guiHandlers.rotation.planes.length})\nAngles: ${app.guiHandlers.rotation.angularSpeedFactors} (${app.guiHandlers.rotation.angularSpeedFactors.length})`
    );
  // Calcolo gli angoli di rotazione nell'istante attuale
  let angles = app.guiHandlers.rotation.angularSpeedFactors.map((factor) => (factor * app.angle) % (2 * Math.PI));

  // Aggiorno il titolo
  const h1 = document.querySelector("h1");
  h1.innerHTML = `A ${app.dimensionsToRender}-${input} rotating in ${rotationScope}D`;
  // Applico la rotazione
  for (let i = 0; i < app.guiHandlers.rotation.planes.length; i++) {
    r.set("r", [app.guiHandlers.rotation.planes[i], angles[i]]);
    r.extendIn(rotationScope);
    mesh.transform(r.value);
  }
  // Distruggo la matrice di rotazione. E' importante farlo per evitare memory leaks
  r.destroy();
  // Disegno la mesh
  mesh.render(rotationScope, app.guiHandlers.projection.isOrthogonalProjection);
  requestAnimationFrame(() => tic(input));
}
