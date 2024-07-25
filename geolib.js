const canvas = document.querySelector("canvas");
let context = canvas.getContext("2d");
const screenDimensions = {"width": window.innerWidth, "height": 77.5/100 *window.innerHeight};
[canvas.width, canvas.height] = [screenDimensions.width, screenDimensions.height];

const defaultRendererScale = (dimensions, isOrto) => isOrto ? 200 * Math.pow(1.5, dimensions - 3) : 200 * Math.pow(3, Math.sqrt(dimensions - 2));
const cameraDistance = 3;

function matrixPointMultiplication(matrix, point){
  let resultCoordinates = [];
  const matrixColumns = matrix[0].length, matrixRows = matrix.length;
  if(matrixColumns !== point.nthDimension) throw new Error(`Matrix multiplication cannot exist:\nmatrix length:\t${matrixColumns},\npoint length:\t${point.nthDimension}`);
  for (let row of matrix) {
    let sum = 0;
    for (let value of row){
      let indexValue = row.indexOf(value);
      sum = row.reduce((sum, value) => (sum += value*point.coordinates[indexValue]));
      if(isNaN(sum)) throw new Error("sum is NaN");
    }
    let indexRow = matrix.indexOf(row);
    resultCoordinates[indexRow] = sum;
  }
  return new PointND(...resultCoordinates);
}
// helper methods to create a wellknown transformation matrix
class Matrix {
  static translation(...vector) {
    const matrixRows = vector.length + 1, matrixColumns = matrixRows;
    const matrix = Array(matrixRows);
    for(let row_i=0; row_i<matrixRows; row_i++){
      matrix[row_i] = Array(matrixColumns);
      for(let col_j=0; col_j<matrixColumns; col_j++){
        let isInDiagonal = row_i === col_j;
        let isLastColumn = col_j === matrixColumns - 1;
        if(isInDiagonal) matrix[row_i][col_j] = 1;
        // This condition excludes the one above (isInDiagonal)
        else if(isLastColumn) matrix[row_i][col_j] = vector[row_i];
        else matrix[row_i][col_j] = 0;
      }
    }
    // Deletes the last row. Now the matrix is regular always returns the correct n-dimenional point if it's multiplied by a point.
    matrix.pop();
    return matrix;
  }
  static rotationsInNthDimension(nthDimension, angles, center=PointND.origin(nthDimension).coordinates, filter="all", type="and"){
    let matrices = [];
    const mainDiagonals = Matrix.#possibleRotationMainDiagonals(nthDimension);
    const rowAndColumnSizes = mainDiagonals[0].length;
    for(let mat_n=0; mat_n<mainDiagonals.length; mat_n++){
      matrices[mat_n] = [];
      const sinesLeft = [-Math.sin(angles[mat_n]), Math.sin(angles[mat_n])];
      for(let row_i=0; row_i<rowAndColumnSizes; row_i++){
        matrices[mat_n][row_i] = [];
        for(let col_j=0; col_j<rowAndColumnSizes; col_j++){
          let isInDiagonal = row_i === col_j;
          let thereIsCosine = mainDiagonals[mat_n][col_j] === "cos";
          let thereIsOneInTheSameRow = mainDiagonals[mat_n][col_j] === "1";
          let thereIsOneInTheSameColumn = mainDiagonals[mat_n][row_i] === "1";
          if(isInDiagonal && thereIsCosine) matrices[mat_n][row_i][col_j] = Math.cos(angles[mat_n]);
          else if(isInDiagonal && !thereIsCosine) matrices[mat_n][row_i][col_j] = 1;
          else if(thereIsOneInTheSameRow || thereIsOneInTheSameColumn) matrices[mat_n][row_i][col_j] = 0;
          else if(sinesLeft.length === 0) throw new Error("No sines left. Cannot insert anything.");
          else {matrices[mat_n][row_i][col_j] = sinesLeft[0]; sinesLeft.shift();}
        }
      }
    }
    let filteredMatrices = matrices;
    if(filter !== "all") filteredMatrices = Matrix.#filterFromAllRotations(mainDiagonals, matrices, filter, type);
    Matrix.#setRotationsAtCenter(filteredMatrices, center);
    return filteredMatrices;
  }
  static #setRotationsAtCenter(matrices, center){
    matrices.unshift(Matrix.translation(...oppositeVector(center)));
    matrices.push(Matrix.translation(...center));
  }
  static #filterFromAllRotations(mainDiagonals, matrices, filter, type="and"){
    let filteredMatrices = [];
    // the array numbers are referred to those rotation which transforms the all the coordinates from 0 to n-1 has a variable angle
    let coordPairsWanted = Matrix.#translateFilter(filter);
    for(let pair_n=0; pair_n<coordPairsWanted.length; pair_n++){
      if(coordPairsWanted[pair_n].length !== 2) throw new Error("Invalid length for a coordinate pair.");
      let firstCoord = coordPairsWanted[pair_n][0];
      let secondCoord = coordPairsWanted[pair_n][1];
      for(let mat_i=0; mat_i<matrices.length; mat_i++){
        if(filteredMatrices.includes(matrices[mat_i])) continue;
        // the filter depends on type: if both of the coordinates must have cosine is "and", if at least one "or"
        let isValid = false;
        let firstCoordInfluencedByCosine = mainDiagonals[mat_i][firstCoord] === "cos";
        let secondCoordInfluencedByCosine = mainDiagonals[mat_i][secondCoord] === "cos";
        switch (type) {
          case "and": isValid = (firstCoordInfluencedByCosine && secondCoordInfluencedByCosine); break;
          case "or": isValid = (firstCoordInfluencedByCosine || secondCoordInfluencedByCosine); break;
          default: throw new Error("Invalid value for \"type\": " + type);
        }
        if (isValid) filteredMatrices.push(matrices[mat_i]);
      }
    }
    return filteredMatrices;
  }
  static #translateFilter(filter){
    let pairs = filter.split(", ");
    for(let pair_i=0; pair_i < pairs.length; pair_i++){
      pairs[pair_i] = pairs[pair_i].split("_");
      for(let coord_j=0; coord_j < pairs[pair_i].length; coord_j++){
        let isALetter = /^[a-zA-Z]$/.test(pairs[pair_i][coord_j]);
        let isNumbered = /^d\d+/.test(pairs[pair_i][coord_j]);
        if(isALetter)
          switch (pairs[pair_i][coord_j]) {
            case "x": pairs[pair_i][coord_j] = 0; break;
            case "y": pairs[pair_i][coord_j] = 1; break;
            case "z": pairs[pair_i][coord_j] = 2; break;
            case "w": pairs[pair_i][coord_j] = 3; break;
            case "v": pairs[pair_i][coord_j] = 4; break;
            case "u": pairs[pair_i][coord_j] = 5; break;
            default: throw new Error("Something went wrong with a literal coordinate!");
          }
        else if(isNumbered) pairs[pair_i][coord_j] = pairs[pair_i][coord_j].slice(1)*1;
      }
    }
    return pairs;
  }
  static #possibleRotationMainDiagonals(nthDimension, mainDiagonal=[], cosinesLeft=2){
    if(nthDimension < cosinesLeft) throw new Error("Rotations cannot exist in "+nthDimension+" dimension/s.");
    if(nthDimension === 0){
      return [ mainDiagonal ];
    }
    // all dispositions among two "cosines" and "1"
    let dispositions = [];
    // checks if all "cosines" are used till the last position, if not, you must use the last cosine
    // before completing the diagonal in order to create a valid rotation matrix
    if(cosinesLeft === nthDimension)
      dispositions = [...Matrix.#possibleRotationMainDiagonals(nthDimension - 1, mainDiagonal.concat("cos"), cosinesLeft - 1)];
    // if two cosines are used, you cannot use another one
    else if(cosinesLeft > 0) dispositions = [
      ...Matrix.#possibleRotationMainDiagonals(nthDimension - 1, mainDiagonal.concat("cos"), cosinesLeft - 1),
      ...Matrix.#possibleRotationMainDiagonals(nthDimension - 1, mainDiagonal.concat("1"), cosinesLeft)
    ]
    else dispositions = [...Matrix.#possibleRotationMainDiagonals(nthDimension - 1, mainDiagonal.concat("1"), cosinesLeft)];

    // this sorting is important: it reorders matrices grouping them per dimension, like we used to:
    // xy -> at least second dimension
    // xz, yz -> at least third dimension
    // xw, yw, zw -> at least fourth dimension ...
    return dispositions.sort((a, b) => {
      let firstIndexOfCos = a.indexOf("cos");
      let secondIndexOfCos = a.indexOf("cos", 1 + firstIndexOfCos);
      let firstSum = Math.pow(2, firstIndexOfCos) + Math.pow(2, secondIndexOfCos);
      firstIndexOfCos = b.indexOf("cos");
      secondIndexOfCos = b.indexOf("cos", 1 + firstIndexOfCos);
      let secondSum = Math.pow(2, firstIndexOfCos) + Math.pow(2, secondIndexOfCos);
      return firstSum - secondSum;
    });
  }
  
  static scale(...factors){
    const rows = factors.length, columns = rows;
    const matrix = Array(rows);
    for(let i=0; i<rows; i++){
      matrix[i] = Array(columns);
      for(let j=0; j<columns; j++){
        if(i === j) matrix[i][j] = factors[i];
        else matrix[i][j] = 0;
      }
    }
    return matrix;
  }

  static symmetry(){return 1;}
}

class PointND{
  constructor(...coordinates){
    this.nthDimension = coordinates.length;
    this.coordinates = coordinates;
  }

  static origin(nthDimension){return new PointND(...Array(nthDimension).fill(0)); }

  transform(...matrices){
    let transformed = this;
    for(let i=0; i<matrices.length; i++){
      let matrixCols = matrices[i][0].length, matrixRows = matrices[i].length;
      if(matrixCols === this.nthDimension + 1 && matrixRows === matrixCols - 1)
        transformed = matrixPointMultiplication(matrices[i], new PointND(...transformed.coordinates, 1));
      else transformed = matrixPointMultiplication(matrices[i], transformed);
    }
    return new PointND(...transformed.coordinates);
  }

  convertTo(dimensions){
    let extension = [];
    let dimensionsLeft = dimensions - this.nthDimension;
    for(let i=0; i<dimensionsLeft; i++) extension[i] = 0;
    return new PointND(...this.coordinates, ...extension);
  }

  projectInto(dimensions=2, isOrto=false){
    let dimensionsLeft = this.nthDimension - dimensions;
    if(dimensionsLeft === 0) return this;

    let perspectiveFactor = 1 / (cameraDistance - this.coordinates[this.coordinates.length - 1]);
    let projectionMatrix = [];
    for(let i=0; i<this.nthDimension; i++){
      projectionMatrix[i] = [];
      for(let j=0; j<this.nthDimension; j++){
        if(i === j && i !== this.nthDimension - 1){
          if(this.nthDimension === 3 && isOrto) perspectiveFactor = 1;
          projectionMatrix[i][j] = perspectiveFactor;
        } else projectionMatrix[i][j] = 0;
      } 
    }
    projectionMatrix.pop();
    let projected = matrixPointMultiplication(projectionMatrix, this);
    return projected.projectInto(dimensions, isOrto);
  }

  draw(depth, scale=defaultRendererScale(this.nthDimension), nthDimensionPoint=undefined){
    // only a point in 2 dimensions can be drawn on a screen
    if(this.nthDimension > 2) throw new Error("This point has too many dimensions to be drawn. You should project it");
    if(this.nthDimension === 2){
      context.beginPath();
      let positionX = scale*this.coordinates[0] + 5 + screenDimensions.width/2;
      let positionY = scale*this.coordinates[1] + 5 + screenDimensions.height/2;
      let pointSize = 5 / (cameraDistance - depth);
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
    } else if(this.nthDimension === 1) (new PointND(...this.coordinates,0)).draw(depth);
    else if(this.nthDimension === 0) (new PointND(0,0)).draw(depth);
  }

  distanceSquare(point){
    let sum=0;
    for(let dim=0; dim<this.nthDimension; dim++) sum += Math.pow(this.coordinates[dim] - point.coordinates[dim], 2);
    return sum;
  }
}

class MeshND{
  constructor(vertices, sides=[]){
    this.vertices = vertices;
    this.sides = sides;
    this.nthDimension = this.vertices[0].nthDimension;
  }
  barycenter(){
    let barycenterCoords = [];
    let sum = 0;
    for(let dim=0; dim<this.vertices[0].nthDimension; dim++){
      for(let i=0; i<this.vertices.length; i++){
        sum += this.vertices[i].coordinates[dim];
      }
      barycenterCoords.push(sum/this.vertices.length);
      sum = 0;
    }
    return new PointND(...barycenterCoords);
  }
  render(isOrto=false, scale=defaultRendererScale(this.nthDimension, isOrto)){
    this.vertices.forEach(vertex => {
      let projectedVertex = vertex.projectInto(2, isOrto);
      let sampleForHigherDimension = undefined;
      let depth = 1;
      if(vertex.nthDimension > 3) sampleForHigherDimension = vertex;
      if(vertex.nthDimension > 2) depth = vertex.coordinates[2];
      projectedVertex.draw(depth, scale, sampleForHigherDimension);
    });
    this.sides.forEach(side => {
      side.render(isOrto, scale);
    });
  }
  extendIn(dimensions){
    let amountOfZeros = dimensions - this.nthDimension;
    if(amountOfZeros < 0) throw new Error("Impossible extension in a lower dimension");
    if(amountOfZeros === 0) return this;
    let zerosToAppend = Array(amountOfZeros).fill(0);
    this.vertices = this.vertices.map(vertex => new PointND(...vertex.coordinates.concat(zerosToAppend)));
    this.sides = this.sides.map(segment => {
      let extendedStart = new PointND(...segment.start.coordinates, ...zerosToAppend);
      let extendedEnd = new PointND(...segment.end.coordinates, ...zerosToAppend);
      let extendedSegment = new SegmentND(extendedStart, extendedEnd);
      return extendedSegment;
    });
    return new MeshND(this.vertices, this.sides);
  }

  transform(...matrices){
    for(let i=0; i<this.vertices.length; i++) this.vertices[i] = this.vertices[i].transform(...matrices);
    for(let j=0; j<this.sides.length; j++) this.sides[j] = this.sides[j].transform(...matrices);
    return new MeshND(this.vertices, this.sides);
  }
}
class SegmentND{
  constructor(...extremes){
    if(extremes.length !== 2) throw new Error("A segment has not got "+extremes.length+" extremes");
    if(extremes[0].nthDimension !== extremes[1].nthDimension) throw new Error("Watch out! You put two different PointND", extremes[0].coordinates, extremes[1].coordinates);
    this.nthDimension = extremes[0].nthDimension;
    this.extremes = extremes;
    this.start = extremes[0]; this.end = extremes[1];
  }
  render(isOrto=false, scale=defaultRendererScale(this.nthDimension)){
    let hyperdepth1 = undefined;
    let hyperdepth2 = undefined;
    if(this.nthDimension > 3){
      hyperdepth1 = this.start.coordinates[this.start.coordinates.length - 1];
      hyperdepth2 = this.end.coordinates[this.end.coordinates.length - 1];
    }
    let depth = 1;
    if(this.nthDimension > 2){
      this.start = this.start.projectInto(3, isOrto);
      this.end = this.end.projectInto(3, isOrto);
      depth = (this.start.coordinates[2] + this.end.coordinates[2])/2;
    }
    this.start = this.start.projectInto(2, isOrto);
    this.end = this.end.projectInto(2, isOrto);
    let positionX = scale*this.start.coordinates[0] + 5 + screenDimensions.width/2;
    let positionY = scale*this.start.coordinates[1] + 5 + screenDimensions.height/2;
    let positionX_1 = scale*this.end.coordinates[0] + 5 + screenDimensions.width/2;
    let positionY_1 = scale*this.end.coordinates[1] + 5 + screenDimensions.height/2;
    context.beginPath();
    context.moveTo(positionX, positionY);
    context.lineTo(positionX_1, positionY_1);
    let color = `hsla(270, 9.8%, 80%, ${150 / (cameraDistance - depth)}%)`;
    context.strokeStyle = color;
    context.lineWidth = 3 * (this.nthDimension - 2) / (2*cameraDistance - 3*(this.nthDimension - 2)*depth);
    
    if(hyperdepth1 !== undefined && hyperdepth2 !== undefined){
      let hue1 = 36 * hyperdepth1 + 270; // Hue secondo i commenti
      let hue2 = 36 * hyperdepth2 + 270; // Hue secondo i commenti
      
      // Create a linear gradient
      const gradient = context.createLinearGradient(positionX, positionY, positionX_1, positionY_1);
      gradient.addColorStop(0, `hsla(${hue1}, 100%, 50%, ${150 / (cameraDistance - depth)}%)`);
      gradient.addColorStop(1, `hsla(${hue2}, 100%, 50%, ${150 / (cameraDistance - depth)}%)`);

      context.strokeStyle = gradient;
    }
    
    context.stroke();
    context.closePath();
  }
  transform(...matrices){
    return new SegmentND(this.start.transform(...matrices), this.end.transform(...matrices));
  }
}
class Hypercube extends MeshND{
  constructor(dimensions, side){
    let vertices = Hypercube.#createHypercubeVertices(dimensions, side);
    let sides = Hypercube.#createHypercubeSides(dimensions, vertices);
    super(vertices, sides);
  }
  static #createHypercubeVertices(dimensions, side, pointstamp=[]){
    if(dimensions === 0) return [ new PointND(...pointstamp) ];
    return [
      ...this.#createHypercubeVertices(dimensions - 1, side, pointstamp.concat(side/2)),
      ...this.#createHypercubeVertices(dimensions - 1, side, pointstamp.concat(-side/2))
    ];
  }
  // group vertices in segments when they are sorted like binary numbers (1,1,1), (1,1,-1) (1,-1,1) (1,-1,-1)...
  static #createHypercubeSides(dimensions, vertices){
    let sides = [];
    let verticesUsed = [];
    for(let i=0; i<dimensions; i++){
      verticesUsed = [];
      for(let j=0; j<vertices.length; j++){
        if(verticesUsed.includes(j)) continue;
        sides.push(new SegmentND(vertices[j], vertices[j+Math.pow(2,i)]));
        verticesUsed.push(j, j+Math.pow(2,i));
      }
    }
    return sides;
  }
}
class Simplex extends MeshND{
  constructor(dimensions, side){
    const vertices = Simplex.#createSimplex(dimensions, side);
    const sides = Simplex.#createSimplexSides(dimensions, vertices);
    super(vertices, sides);
  }
  static #createSimplex(dimensions, side, pointstamp=[]){
    if(dimensions === 1){
      return (new Hypercube(1, side)).vertices;
    } else {
      let oldSimplex = new Simplex(dimensions - 1, side, pointstamp);
      let oldBarycenter = oldSimplex.barycenter();
      let newVertex = new PointND(...oldBarycenter.coordinates, Math.sqrt(side*side - oldBarycenter.distanceSquare(oldSimplex.vertices[0])));
      let vertices = [ ...oldSimplex.vertices, newVertex ];
      let simplex = new MeshND(vertices);
      for(let i=0; i<vertices.length; i++){
        // check if all the vertices have the same number of coordinates
        if(vertices[i].nthDimension > dimensions) throw new Error("A point has too many coordinates");
        if(vertices[i].nthDimension < dimensions) vertices[i] = vertices[i].convertTo(dimensions);
      }
      let oppositeNewBarycenterVector = oppositeVector(simplex.barycenter().coordinates);
      // center the simplex with a traslation
      simplex.transform(Matrix.translation(...oppositeNewBarycenterVector));
      return vertices;
    }
  }
  static #createSimplexSides(dimensions, vertices){
    let sides = [];
    let verticesUsed = [];
    for(let i=0; i<dimensions; i++){
      for(let j=0; j<vertices.length; j++){
        if(i === j) continue;
        if(verticesUsed.includes(j)) continue;
        sides.push(new SegmentND(vertices[i], vertices[j]));
        verticesUsed.push(i);
      }
    }
    return sides;
  }
}
class Hypersphere extends MeshND{
  constructor(dimensions, radius, complexity=10){
    const hypersphere = Hypersphere.#createHypersphere(dimensions, radius, complexity);
    // const sides = Hypersphere.#createHypersphereSides(vertices, complexity);
    super(hypersphere.vertices, hypersphere.sides);
  }
  // Funzione ricorsiva per la creazione di ipersfere
  static #createHypersphere(dimensions, radius, complexity, pointstamp=[]) {
    let stepAngle = Math.PI/complexity;
    if (dimensions === 1) {
      return {vertices: (new Hypercube(1, radius)).vertices, sides: []};
    }
    if (dimensions === 2) {
      // Caso base: restituisci un array con un singolo punto
      return Hypersphere.#createCircle(radius, stepAngle, pointstamp);
    } else {
      // Caso ricorsivo: costruisci i punti utilizzando le sezioni di ipersfere di dimensioni inferiori
      let vertices = [];
      let sides = [];
      let previousHypersphereSection = undefined; 
      for (let i=0; i<=complexity; i++){
        let w = radius*(Math.cos(Math.PI - i*Math.PI/complexity));
        let hypersphereSectionRadius = Math.sqrt(radius * radius - w * w);
        let hypersphereSection = Hypersphere.#createHypersphere(dimensions - 1, hypersphereSectionRadius, complexity, pointstamp.concat(w));
        vertices.push(...hypersphereSection.vertices);
        sides.push(...hypersphereSection.sides, ...Hypersphere.connectTwoAdiacentHypersphereSections(previousHypersphereSection, hypersphereSection));
        previousHypersphereSection = hypersphereSection;
      }
      // connect adiacent sections
      return {vertices: vertices, sides: sides};
    }
  }
  static connectTwoAdiacentHypersphereSections(previousHypersphereSection, hypersphereSection){
    if(previousHypersphereSection === undefined) return [];
    let sides = [];
    for(let v=0; v<hypersphereSection.vertices.length; v++) sides.push(new SegmentND(previousHypersphereSection.vertices[v], hypersphereSection.vertices[v]));
    return sides;
  }
  // Function to create a 2D circle of points, given radius and a stepangle.
  static #createCircle(radius, stepAngle, pointstamp=[]){
    const vertices = Hypersphere.#createCircleVertices(radius, stepAngle, pointstamp);
    const sides = Hypersphere.#createCircleSides(vertices);
    const circle = { vertices: vertices, sides: sides };
    return circle;
  }
  static #createCircleVertices(radius, stepAngle, pointstamp=[]) {
    let points = [];
    for (let theta = 0; theta < 2 * Math.PI; theta += stepAngle) {
      let x = radius * Math.cos(theta);
      let y = radius * Math.sin(theta);
      let newPoint = new PointND(x, y, ...pointstamp);
      points.push(newPoint);
    }
    return points;
  }
  static #createCircleSides(vertices){
    let sides = [];
    for(let v=0; v<vertices.length; v++){
      if(v === vertices.length - 1) sides.push(new SegmentND(vertices[v], vertices[0]));
      else sides.push(new SegmentND(vertices[v], vertices[v+1]));
    }
    return sides;
  }
}
class Orthoplex extends MeshND{
  constructor(dimensions, side){
    // thinking an orthoplex as a hypersphere of complexity 2
    const radius = side * Math.SQRT1_2;
    const orthoplex = new Hypersphere(dimensions, radius, 2);
    super(orthoplex.vertices, orthoplex.sides);
  }
}
class Torus extends MeshND{
  constructor(dimensions, radius, distanceFromTheCenter=2*radius, complexity=10){
    const torus = Torus.#createTorusVertices(dimensions, radius, distanceFromTheCenter, complexity);
    super(torus.vertices, torus.sides);
  }
  static #createTorusVertices(dimensions, radius, distanceFromTheCenter, complexity){
    let vertices = [];
    let sides = [];
    let slice = new Hypersphere(dimensions - 1, radius, complexity/2);
    slice.extendIn(dimensions);
    let zerosToAppend = Array(dimensions - 1).fill(0);
    slice.transform(Matrix.translation(radius + distanceFromTheCenter, ...zerosToAppend));
    let lastCoordinate = dimensions - 1;
    
    let previousSlice = undefined;
    let stepAngle = Math.PI/complexity;
    for(let i=0; i<2*complexity; i++){
      let rotationAroundCenter = Matrix.rotationsInNthDimension(dimensions, Array(nCr(DIMENSIONS, 2)).fill(stepAngle), PointND.origin(dimensions).coordinates, `x_d${lastCoordinate}`);
      slice = slice.transform(...rotationAroundCenter);
      vertices.push(...slice.vertices);
      sides.push(...slice.sides);
    }
    sides.push(...Torus.#connectTwoAdiacentTorusSections(slice, vertices));
    return {vertices: vertices, sides: sides};
  }
  static #connectTwoAdiacentTorusSections(sliceSample, torusVertices){
    let sides = [];
    for(let v=sliceSample.vertices.length; v<torusVertices.length; v+=1){
      if(v > torusVertices.length - 1 - sliceSample.vertices.length) sides.push(new SegmentND(torusVertices[v], torusVertices[(v + sliceSample.vertices.length)%torusVertices.length]))
      sides.push(new SegmentND(torusVertices[v - sliceSample.vertices.length], torusVertices[v]));
    }
    return sides;
  }
}
function oppositeVector(vector){
  for(let i=0; i<vector.length; i++) vector[i] *= -1;
  return vector;
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

function uploadEnvironment(){
  context.clearRect(0,0,window.innerWidth,window.innerHeight);
}
function resizeCanvas() {
  screenDimensions.width = window.innerWidth;
  context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
  tic(); // Redraw the scene
}
window.addEventListener("resize", resizeCanvas);

export { Matrix, PointND, SegmentND, MeshND, Hypercube, Hypersphere, Simplex, uploadEnvironment }