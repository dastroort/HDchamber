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
  animationId: {},
  meshToRender: null,
};

async function fetchWikiData() {
  try {
    const response = await fetch("./wiki.json");
    const wiki = await response.json();
    return wiki;
  } catch (error) {
    throw new Error("Errore durante il fetch della wiki:", error);
  }
}

const WIKI = await fetchWikiData();
console.log(WIKI);

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

function setDropmenuBehavior(dropmenu) {
  dropmenu.style.display = "flex";
  setTimeout(() => {
    dropmenu.classList.toggle("open");
  }, 10);
  // Imposta display: none appena finisce la transizione per evitare bug
  dropmenu.addEventListener("transitionend", () => {
    if (!isDropmenuOpen(dropmenu)) {
      dropmenu.style.display = "none";
    }
  });
}

app.guiHandlers.meshes.button.addEventListener("click", () => {
  setDropmenuBehavior(app.guiHandlers.meshes.dropmenu);
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
    app.meshToRender = button.innerHTML;
    if (app.meshToRender !== "And so on...") {
      cancelAnimationFrame(app.animationId);
      uploadWikipage();
      tic(app.meshToRender);
    } else {
      alert("Wait for new meshes!");
    }
  });
});

function selectMesh(input, dimensions) {
  switch (input) {
    case "Hypercube":
      return new GEOLIB.Hypercube(dimensions);
    case "Simplex":
      return new GEOLIB.Simplex(dimensions);
    case "Hypersphere":
      return new GEOLIB.Hypersphere(dimensions);
    case "Torus":
      return new GEOLIB.Torus(dimensions);
    case "Orthoplex":
      return new GEOLIB.Orthoplex(dimensions);
    default:
      throw new Error("Invalid input entered: " + '"' + input + '"');
  }
}

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
    alert(`Invalid number of dimensions: ${app.guiHandlers.dimensions.input}`);
  } else {
    app.dimensionsToRender = app.guiHandlers.dimensions.input;
  }

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
  setDropmenuBehavior(app.guiHandlers.rotation.dropmenu);
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

// wiki
app.guiHandlers.wiki = {
  button: document.querySelector(".button.wiki"),
  wikipage: document.querySelector(".wikipage"),
  input: null,
  meshData: null,
};
function uploadWikipage() {
  try {
    app.guiHandlers.wiki.wikipage.replaceChildren();
    writeMeshWikiPage(app.dimensionsToRender + "-" + app.meshToRender, app.guiHandlers.wiki.wikipage);
  } catch {
    writeDefaultWikiPage(app.guiHandlers.wiki.wikipage);
  }
}

app.guiHandlers.wiki.button.addEventListener("click", () => {
  app.guiHandlers.wiki.wikipage.classList.toggle("open");
  app.guiHandlers.wiki.button.classList.toggle("open");
  uploadWikipage();
});

function loadMeshWikiData(technicalName) {
  const target = WIKI.find((mesh) => mesh["technicalName"] === technicalName);
  if (target === undefined) throw new Error(`Cannot find the technical name "${technicalName}" in the wiki.`);
  return target;
}
console.log("Debug della funzione umanizzazione: ", humanizeMeshName("7-Hypercube"));
console.log(app);

function humanizeMeshName(technicalName) {
  try {
    const target = loadMeshWikiData(technicalName);
    return target["commonName"];
  } catch (error) {
    console.warn("An error is found, it will be returned the original name.", error);
    return technicalName;
  }
}

function writeMeshWikiPage(technicalName, container) {
  const target = loadMeshWikiData(technicalName);
  const title = document.createElement("h3");
  const dimensions = document.createElement("p");
  const description = document.createElement("p");

  title.innerHTML = target["commonName"];
  dimensions.innerHTML = "Dimensions: " + target["dimensions"];
  description.innerHTML = target["description"];

  const elements = [title, dimensions, description];
  elements.forEach((element) => {
    container.appendChild(element);
  });
}

function writeDefaultWikiPage(container) {
  const title = document.createElement("h3");
  const p = document.createElement("p");

  title.innerHTML = "Welcome to the Wiki!";
  p.innerHTML = "Select a mesh to see its documentation!";

  const elements = [title, p];
  elements.forEach((element) => {
    container.appendChild(element);
  });
}

function tic(input) {
  app.isRendering = true;
  app.finalTime = Date.now();
  app.angle += (app.angularSpeed * app.deltaTime()) / 1000;
  app.initialTime = app.finalTime;
  renderEnvironment(input);
}

function renderEnvironment(input) {
  const mesh = selectMesh(input, app.dimensionsToRender);
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
  const humanizedInput = humanizeMeshName(`${app.dimensionsToRender}-${input}`);
  h1.innerHTML = `A ${humanizedInput} rotating in ${rotationScope}D`;
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
  app.animationId = requestAnimationFrame(() => tic(input));
}

// STOP FRAME ANIMETION AFTER 10S (only debugging)
// setTimeout(() => {
//   cancelAnimationFrame(app.animationId);
//   console.log("Loop interrotto");
// }, 10000);
