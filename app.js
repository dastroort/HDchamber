import * as GEOLIB from "/geolib.js";
import * as CROSS_SECTION from "/cross-section.js";

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
  isCrossSectionMode: false,
  renderScale: GEOLIB.DEFAULT_RENDER_SCALE,
  isOrtho: false,
  axesEnabled: false,
  fixedAxes: true,
  lastCoordinateEnabled: false,
};

async function fetchWiki() {
  try {
    const response = await fetch("./wiki.json");
    const wiki = await response.json();
    return wiki;
  } catch (error) {
    throw new Error("Errore durante il fetch della wiki:", error);
  }
}

const WIKI = await fetchWiki();

function addWindowEvents() {
  window.addEventListener("resize", () => {
    GEOLIB.resizeCanvas();
    const h1 = document.querySelector("h1");
    h1.style.textAlign = "center";
    tic();
  });
  window.addEventListener("wheel", () => {
    const threshold = 5;
    const zoomIn = (threshold) => {
      app.renderScale += threshold;
    };
    const zoomOut = (threshold) => {
      app.renderScale -= threshold;
    };

    if (event.deltaY < 0) {
      zoomIn(threshold);
    } else {
      zoomOut(threshold);
    }
  });
}

function addGuiHandlers() {
  setProjectionMode();
  setMeshSelector();
  setDimensionsHandler();
  setRotationHandler();
  setWikiHandler();
  setCrossSectionMode();
  setAxesMode();
  setLastCoordinateMode();
}

function setProjectionMode() {
  const projection = {
    button: document.querySelector(".button.projection-mode"),
    icon: document.querySelector(".button.projection-mode .icon"),
  };
  function toggle(itemStatus, onTrue, onFalse) {
    return itemStatus ? onFalse : onTrue;
  }
  function setButton() {
    projection.button.addEventListener("click", () => {
      app.isOrtho = !app.isOrtho;
      projection.icon.src = `./icons/orto_${toggle(projection.isOrtho, "on", "off")}.png`;
    });
  }

  setButton();
  app.guiHandlers.projection = projection;
}

function isDropmenuOpen(dropmenu) {
  return dropmenu.classList.contains("open");
}

function toggleDropmenu(dropmenu) {
  dropmenu.style.display = "flex";
  setTimeout(() => {
    dropmenu.classList.toggle("open");
  }, 10);
  dropmenu.addEventListener("transitionend", () => {
    if (!isDropmenuOpen(dropmenu)) {
      dropmenu.style.display = "none";
    }
  });
}

function setMeshSelector() {
  const meshSelector = {
    button: document.querySelector(".meshes-handler .button"),
    dropmenu: document.querySelector(".meshes-handler .dropmenu"),
    meshButtons: null,
  };
  function setButton() {
    meshSelector.button.addEventListener("click", () => {
      toggleDropmenu(meshSelector.dropmenu);
    });
  }
  function setDropmenu() {
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
      meshSelector.dropmenu.appendChild(mesh);
    });
    // Aggiorno la property prima nulla
    meshSelector.meshButtons = document.querySelectorAll(".button.mesh");
    meshSelector.meshButtons.forEach((button) => {
      button.addEventListener("click", () => {
        app.meshToRender = button.innerHTML;
        if (app.meshToRender !== "And so on...") {
          cancelAnimationFrame(app.animationId);
          uploadWikipage();
          GEOLIB.disableColorLegend();
          tic(app.meshToRender);
        } else {
          alert("Wait for new meshes!");
        }
      });
    });
  }

  setDropmenu();
  setButton();
  app.guiHandlers.meshSelector = meshSelector;
}

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

function setDimensionsHandler() {
  const dimensions = {
    button: document.querySelector(".button.dimensions-handler"),
    input: null,
  };
  function isValidNumberOfDimensions(dimensionsEntered) {
    return dimensionsEntered >= app.MIN_DIMENSIONS && dimensionsEntered <= app.MAX_DIMENSIONS;
  }
  function setButton() {
    dimensions.button.addEventListener("click", () => {
      dimensions.input = prompt(`Enter the number of dimensions of the shape you want to see (${app.MIN_DIMENSIONS}-${app.MAX_DIMENSIONS}):`) * 1;
      GEOLIB.disableColorLegend();
      if (!isValidNumberOfDimensions(dimensions.input)) {
        alert(`Invalid number of dimensions: ${dimensions.input}`);
      } else {
        app.dimensionsToRender = dimensions.input;
        setRotationHandler();
      }

      if (app.isRendering) {
        const h1 = document.querySelector("h1");
        h1.innerHTML = `A ${app.dimensionsToRender}-${dimensions.input} rotating in ${app.dimensionsToRender}`;
      }
    });
  }

  setButton();
  app.guiHandlers.dimension = dimensions;
}

function setPlanesDropmenu(handler) {
  function setPlanes() {
    const planesMap = new Map();
    for (let i = 0; i < handler.planes.length; i++) {
      planesMap.set(handler.planes[i], handler.angularSpeedFactors[i]);
    }
    handler.options = document.createElement("ul");
    handler.options.classList.add("rotation-handler-options", "button");
    handler.dropmenu.innerHTML = "";

    planesMap.forEach((value, key) => {
      const rotationPlane = document.createElement("li");
      rotationPlane.classList.add("button", "rotation-plane", key);
      rotationPlane.innerHTML = key.toUpperCase() + " | " + value;
      handler.dropmenu.appendChild(rotationPlane);
    });
  }

  function setPlaneButton(button) {
    button.addEventListener("click", () => {
      const input = button.innerHTML.toLowerCase();
      let rotationPlane = input.slice(0, 2);
      let angularSpeedFactor = prompt(`Enter the angular speed factor for the plane ${rotationPlane}:`) * 1;
      let index = handler.planes.indexOf(rotationPlane);
      handler.angularSpeedFactors[index] = angularSpeedFactor;
      button.innerHTML = rotationPlane.toUpperCase() + " | " + angularSpeedFactor;
    });
  }

  setPlanes();
  handler.planeButtons = document.querySelectorAll(".button.rotation-plane");
  handler.planeButtons.forEach((button) => {
    setPlaneButton(button);
  });
}

function setRotationHandler() {
  const rotation = {
    button: document.querySelector(".button.rotation-handler"),
    dropmenu: document.querySelector(".rotation-handler + .dropmenu"),
    planes: allPossiblePlanes(app.dimensionsToRender),
    angularSpeedFactors: Array(nCr(app.dimensionsToRender, 2)).fill(0),
    planeButtons: null,
    options: null,
  };

  function allPossiblePlanes(dimensions) {
    const coords = GEOLIB.axisIdentifiers.slice(0, dimensions).split("");
    const planes = [];
    for (let i = 0; i < coords.length; i++) {
      for (let j = i + 1; j < coords.length; j++) planes.push(coords[i] + coords[j]);
    }
    return planes.sort(sortPlanes(coords));
  }

  function sortPlanes(coords) {
    return function (a, b) {
      const dimA1 = Math.max(coords.indexOf(a[0]), coords.indexOf(a[1]));
      const dimB1 = Math.max(coords.indexOf(b[0]), coords.indexOf(b[1]));

      if (dimA1 !== dimB1) return dimA1 - dimB1;

      const dimA2 = Math.min(coords.indexOf(a[0]), coords.indexOf(a[1]));
      const dimB2 = Math.min(coords.indexOf(b[0]), coords.indexOf(b[1]));

      return dimA2 - dimB2;
    };
  }

  function nCr(n, r) {
    if (r === 0 || r === n) return 1;
    return nCr(n - 1, r - 1) + nCr(n - 1, r);
  }

  function setButton() {
    rotation.button.addEventListener("click", () => {
      GEOLIB.disableColorLegend();
      toggleDropmenu(rotation.dropmenu);
    });
  }

  setPlanesDropmenu(rotation);
  setButton();
  app.guiHandlers.rotation = rotation;
}

function setWikiHandler() {
  const wiki = {
    button: document.querySelector(".button.wiki"),
    wikipage: document.querySelector(".wikipage"),
    input: null,
    meshData: null,
  };

  function setButton() {
    wiki.button.addEventListener("click", () => {
      wiki.wikipage.classList.toggle("open");
      wiki.button.classList.toggle("open");
      uploadWikipage();
    });
  }

  setButton();
  app.guiHandlers.wiki = wiki;
}

function uploadWikipage() {
  try {
    function writeMeshWikipage(technicalName, container) {
      const target = getMeshWikiData(technicalName);
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

    app.guiHandlers.wiki.wikipage.replaceChildren();
    writeMeshWikipage(app.dimensionsToRender + "-" + app.meshToRender, app.guiHandlers.wiki.wikipage);
  } catch {
    function writeDefaultWikipage(container) {
      const title = document.createElement("h3");
      const p = document.createElement("p");

      title.innerHTML = "Welcome to the Wiki!";
      p.innerHTML = "Select a mesh to see its documentation!";

      const elements = [title, p];
      elements.forEach((element) => {
        container.appendChild(element);
      });
    }

    writeDefaultWikipage(app.guiHandlers.wiki.wikipage);
  }
}

function getMeshWikiData(technicalName) {
  const target = WIKI.find((mesh) => mesh["technicalName"] === technicalName);
  if (target === undefined) throw new Error(`Cannot find the technical name "${technicalName}" in the wiki.`);
  return target;
}

function setCrossSectionMode() {
  const crossSection = {
    button: document.querySelector(".button.cross-section-mode"),
  };

  function setButton() {
    crossSection.button.addEventListener("click", () => {
      app.isCrossSectionMode = !app.isCrossSectionMode;
      if (app.isCrossSectionMode) {
        crossSection.button.setAttribute("title", "Disable cross-section mode");
      } else {
        crossSection.button.setAttribute("title", "Enable cross-section mode");
      }
    });
  }

  setButton();
  app.guiHandlers.crossSection = crossSection;
}

function setAxesMode() {
  const axesButton = document.querySelector(".axes.button");
  let counter = 0;
  axesButton.addEventListener("click", () => {
    counter++;
    if (counter % 3 === 0) {
      app.axesEnabled = false;
      axesButton.setAttribute("title", "Enable fixed axes");
    } else if (counter % 3 === 1) {
      app.axesEnabled = true;
      app.fixedAxes = true;
      axesButton.setAttribute("title", "Enable rotating axes");
    } else if (counter % 3 === 2) {
      app.fixedAxes = false;
      axesButton.setAttribute("title", "Disable axes");
    }
    console.log(app.axesEnabled, app.fixedAxes);
  });
}

function setLastCoordinateMode() {
  const lastCoordinateButton = document.querySelector(".button.last-coordinate-mode");
  lastCoordinateButton.addEventListener("click", () => {
    if (app.dimensionsToRender < GEOLIB.COLOR_MAPPING_DIMENSION)
      alert("Cannot enable 'Last Coordinate Mode' without color mapping. Try to select at least " + GEOLIB.COLOR_MAPPING_DIMENSION + " dimensions.");
    else {
      app.lastCoordinateEnabled = !app.lastCoordinateEnabled;
      lastCoordinateButton.setAttribute("title", (app.lastCoordinateEnabled ? "Disable" : "Enable") + " last-coordinate mode");
    }
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
  const rotationScope = GEOLIB.rotationScope(app.guiHandlers.rotation.planes, app.guiHandlers.rotation.angularSpeedFactors);
  const rotatingAxes = new GEOLIB.CartesianAxes(app.dimensionsToRender);
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
  function humanizeMeshName(technicalName) {
    try {
      const target = getMeshWikiData(technicalName);
      return target["commonName"];
    } catch (error) {
      console.warn("An error is found, it will be returned the original name.", error);
      return technicalName;
    }
  }
  const humanizedInput = humanizeMeshName(`${app.dimensionsToRender}-${input}`);
  if (rotationScope > 1) h1.innerHTML = `A ${humanizedInput} is rotating in ${rotationScope}D`;
  else h1.innerHTML = `A ${humanizedInput} is static`;
  const title = document.querySelector("title");
  title.innerHTML = "HDchamber | " + h1.innerHTML;
  // Applico la rotazione
  for (let i = 0; i < app.guiHandlers.rotation.planes.length; i++) {
    r.set("r", [app.guiHandlers.rotation.planes[i], angles[i]]);
    r.extendIn(rotationScope);
    mesh.transform(r.value);
    rotatingAxes.transform(r.value);
  }
  // Distruggo la matrice di rotazione. E' importante farlo per evitare memory leaks
  r.destroy();
  // Disegno la mesh
  const dataDiv = document.querySelector(".technical-data");

  if (app.isCrossSectionMode) {
    renderCrossSection(mesh);
    const opacity = smoothGoniometricTransition(0.25, 0.5);
    mesh.render(rotationScope, app.isOrtho, app.renderScale, opacity, false);

    function renderCrossSection(mesh) {
      const zeros = Array(app.dimensionsToRender - 1).fill(0);
      const hyperplane = new CROSS_SECTION.Hyperplane([...zeros, 1]);
      const crossSection = hyperplane.crossSectionOfMesh(mesh, app.dimensionsToRender);

      crossSection.render(app.dimensionsToRender - 1, app.isOrtho, app.renderScale, 5, app.lastCoordinateEnabled);

      const hyperplaneString = hyperplane.toString();

      if (dataDiv.classList.contains("hidden")) dataDiv.classList.remove("hidden");
      dataDiv.innerHTML = "";
      const p = document.createElement("p");
      switch (app.dimensionsToRender) {
        case 2:
          p.innerHTML = "Line";
          break;
        case 3:
          p.innerHTML = "Plane";
          break;
        default:
          p.innerHTML = "Hyperplane";
      }
      p.innerHTML += ": " + hyperplaneString;
      dataDiv.appendChild(p);
    }
    function smoothGoniometricTransition(angularSpeed, maxY = 1) {
      const phase = app.angle - 2 * Math.PI;
      const eased = 0.5 * (1 - Math.cos(angularSpeed * phase));
      return Math.min(Math.pow(eased, 3), maxY);
    }
  } else {
    dataDiv.innerHTML = "";
    if (!dataDiv.classList.contains("hidden")) dataDiv.classList.add("hidden");
    mesh.render(rotationScope, app.isOrtho, app.renderScale, undefined, app.lastCoordinateEnabled);
  }
  // Rendering assi
  if (app.axesEnabled && app.fixedAxes) {
    const fixedAxes = new GEOLIB.CartesianAxes(app.dimensionsToRender);
    fixedAxes.render(rotationScope, app.isOrtho, app.renderScale);
  } else if (!app.fixedAxes && app.axesEnabled) {
    rotatingAxes.render(rotationScope, app.isOrtho, app.renderScale);
  }
  app.animationId = requestAnimationFrame(() => tic(input));
}

addWindowEvents();
addGuiHandlers();
