import * as GEOLIB from "/geolib.js";

// VARIABILI GLOBALI PER L'APPLICAZIONE
const app = {
  initialTime: Date.now(),
  finalTime: null,
  deltaTime: () => app.finalTime - app.initialTime,
  angularSpeed: Math.PI / 4, // rad/s
  dimensions: 2,
  MIN_DIMENSIONS: 2,
  MAX_DIMENSIONS: 6,
  angle: 0,
  isRendering: false,
  handlers: {}
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
app.handlers.projection = {
  button: document.querySelector(".button.projection-mode"),
  icon: document.querySelector(".button.projection-mode .icon"),
  isOrthoActivated: false
};
app.handlers.projection.button.addEventListener("click", () => {
  app.handlers.projection.isOrthoActivated = app.handlers.projection.isOrthoActivated ? false : true;
  app.handlers.projection.button.icon.src = `./icons/orto_${app.handlers.projection.isOrtoActivated ? "on" : "off"}.png`;
});

// CONFIGURAZIONE DEL BOTTONE CHE GESTISCE LA SELEZIONE DELLE MESH
app.handlers.meshes = {
  button: document.querySelector(".meshes-handler .button"),
  dropmenu: document.querySelector(".meshes-handler .dropmenu"),
  meshButtons: null
};
app.handlers.meshes.button.addEventListener("click", () => {
  app.handlers.meshes.dropmenu.classList.toggle("open");
  // Imposta display: none appena finisce la transizione per evitare bug
  app.handlers.meshes.dropmenu.addEventListener("transitionend", () => {
    if (!app.handlers.meshes.dropmenu.classList.contains("open")) {
      app.handlers.meshes.dropmenu.style.display = "none";
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


meshesMap.keys().forEach(key => {
  const mesh = document.createElement("li");
  mesh.classList.add("button", "mesh");
  mesh.innerHTML = key;
  app.handlers.meshes.dropmenu.appendChild(mesh);
});
// Aggiorno la property prima nulla
app.handlers.meshes.meshButtons = document.querySelectorAll(".button.mesh");
app.handlers.meshes.meshButtons.forEach(button => {
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
app.handlers.dimension = {
  button: document.querySelector(".button.dimension-handler"),
  input: null
};
app.handlers.dimension.button.addEventListener("click", () => {
    app.handlers.dimension.input = prompt(`Enter the number of dimensions of the shape you want to see (${app.MIN_DIMENSIONS}-${app.MAX_DIMENSIONS}):`) * 1;
    if (app.handlers.dimension.input >= app.MIN_DIMENSIONS && app.handlers.dimension.input <= app.MAX_DIMENSIONS) {
      app.dimensions = app.handlers.dimension.input;
      if (app.isRendering) {
        const h1 = document.querySelector("h1");
        h1.innerHTML = `A ${app.dimensions}-${app.handlers.dimension.input} rotating in ${app.dimensions}`;
      }
    } else {
      alert(`Invalid number of dimensions: ${app.handlers.dimension.input}`);
    }
  }
);

// GESTIONE DEL BOTTONE PER IMPOSTARE LE ROTAZIONI
app.handlers.rotation = {
  button: document.querySelector(".button.rotation-handler"),
  dropmenu: document.querySelector(".rotation-handler .dropmenu"),
  planes: ["xz", "xy", "yw", "zw"],
  angularSpeedFactors: [1, 1, 0.5, 0.75],
  planeButtons: null,
  options: null
};
app.handlers.rotation.button = document.querySelector(".rotation-handler");
app.handlers.rotation.dropmenu = document.querySelector(".rotation-handler + .dropmenu");
app.handlers.rotation.button.addEventListener("click", () => {
  app.handlers.rotation.dropmenu.classList.toggle("open");
});

const planesMap = new Map();
for (let i = 0; i < app.handlers.rotation.planes.length; i++) {
  planesMap.set(app.handlers.rotation.planes[i], app.handlers.rotation.angularSpeedFactors[i]);
}
app.handlers.rotation.options = document.createElement("ul");
app.handlers.rotation.options.classList.add("rotation-handler-options", "button");
planesMap.set("+", null);
planesMap.set("-", null);

planesMap.keys().forEach((key => {
  const rotationPlane = document.createElement("li");
  rotationPlane.classList.add("button", "rotation-plane", key);
  rotationPlane.innerHTML = key.toUpperCase();
  app.handlers.rotation.dropmenu.appendChild(rotationPlane);
}));
// Edita il fattore di velocità di rotazione di un piano, toglilo o aggiungilo.
app.handlers.rotation.planeButtons = document.querySelectorAll(".button.rotation-plane");
app.handlers.rotation.planeButtons.forEach(button => {
  button.addEventListener("click", () => {
    const input = button.innerHTML.toLowerCase();
    if (input === "+" || input === "-") {
      let rotationPlane = prompt("Enter the rotation plane you want to add or remove:");
      if (rotationPlane) {
        if (app.handlers.rotation.planes.includes(rotationPlane)) {
          let index = app.handlers.rotation.planes.indexOf(rotationPlane);
          app.handlers.rotation.planes.splice(index, 1);
          app.handlers.rotation.angularSpeedFactors.splice(index, 1);
          app.handlers.rotation.dropmenu.querySelector(`.${rotationPlane}`).remove();
        } else {
          const newButton = document.createElement("li");
          newButton.classList.add("button", "rotation-plane", rotationPlane);
          app.handlers.rotation.planes.push(rotationPlane);
          newButton.innerHTML = rotationPlane.toUpperCase();
          app.handlers.rotation.angularSpeedFactors.push(1);
          app.handlers.rotation.dropmenu.appendChild(newButton);
        }
      }
    } else {
      let rotationPlane = input;
      let angularSpeedFactor = prompt(`Enter the angular speed factor for the plane ${rotationPlane}:`) * 1;
      if (angularSpeedFactor) {
        let index = app.handlers.rotation.planes.indexOf(rotationPlane);
        app.handlers.rotation.angularSpeedFactors[index] = angularSpeedFactor;
      }
    }
  });
});
console.log(app);

function tic(input) {
  app.isRendering = true;
  app.finalTime = Date.now();
  app.angle += app.angularSpeed * app.deltaTime() / 1000;
  app.initialTime = app.finalTime;
  renderEnvironment(input);
}

function renderEnvironment(input) {
  const mesh = new (meshesMap.get(input))(app.dimensions);
  GEOLIB.uploadEnvironment();
  // Creo la matrice di rotazione
  let r = GEOLIB.SingletonMatrix.init(app.dimensions);

  if (app.handlers.rotation.planes.length !== app.handlers.rotation.angularSpeedFactors.length) throw new Error(`Num of planes and angles must be equal:\nRotation planes: ${app.handlers.rotation.planes} (${app.handlers.rotation.planes.length})\nAngles: ${app.handlers.rotation.angularSpeedFactors} (${app.handlers.rotation.angularSpeedFactors.length})`);
  // Calcolo gli angoli di rotazione nell'istante attuale
  let angles = app.handlers.rotation.angularSpeedFactors.map(factor => factor * app.angle % (2 * Math.PI));

  let highestRotationDimension;
  app.handlers.rotation.planes.forEach(plane => {
    let dimensions = plane.split("");
    dimensions = dimensions.map(axis => GEOLIB.axisIdentifiers.indexOf(axis) + 1);
    dimensions.forEach(d => {
      if (!highestRotationDimension) {
        highestRotationDimension = d;
      } else {
        highestRotationDimension = Math.max(highestRotationDimension, d);
      }
    });
  });
  // Aggiorno il titolo
  const h1 = document.querySelector("h1");
  h1.innerHTML = `A ${app.dimensions}-${input} rotating in ${highestRotationDimension}D`;
  // Applico la rotazione
  for(let i = 0; i < app.handlers.rotation.planes.length; i++){
    r.set("r", [app.handlers.rotation.planes[i], angles[i]]);
    mesh.transform(r.value);
  }
  // Distruggo la matrice di rotazione. E' importante farlo per evitare memory leaks
  r.destroy();
  // Disegno la mesh
  mesh.render(highestRotationDimension, app.isOrthoActivated);
  requestAnimationFrame(() => tic(input));
}