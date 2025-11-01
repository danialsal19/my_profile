// src/main.js
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

// --- Basic scene / camera / renderer ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa0a0a0);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 5); // eye height ~1.6m

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('root').appendChild(renderer.domElement);

// --- Skybox (procedural) ---
const sky = new Sky();
sky.scale.setScalar(450000); // large sphere to surround world
scene.add(sky);

// Sun setup
const sun = new THREE.Vector3();

// Sky shader uniforms
const skyUniforms = sky.material.uniforms;
skyUniforms['turbidity'].value = 10;
skyUniforms['rayleigh'].value = 2;
skyUniforms['mieCoefficient'].value = 0.005;
skyUniforms['mieDirectionalG'].value = 0.8;

// Sun position (azimuth, elevation)
const phi = THREE.MathUtils.degToRad(90 - 10); // elevation
const theta = THREE.MathUtils.degToRad(180);   // azimuth
sun.setFromSphericalCoords(1, phi, theta);
sky.material.uniforms['sunPosition'].value.copy(sun);

// Optional: add matching directional light to match sun
const sunlight = new THREE.DirectionalLight(0xffffff, 1.0);
sunlight.position.copy(sun).multiplyScalar(10000);
sunlight.castShadow = true;
scene.add(sunlight);

// --- Lighting ---
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
hemi.position.set(0, 50, 0);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(-10, 20, 10);
dir.castShadow = true;
scene.add(dir);

// --- Ground ---
const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// --- PointerLockControls for POV ---
const controls = new PointerLockControls(camera, renderer.domElement);

// Click to lock pointer
renderer.domElement.addEventListener('click', () => {
  controls.lock();
});

// Simple on-screen hint (optional)
const hint = document.createElement('div');
hint.style.position = 'absolute';
hint.style.left = '50%';
hint.style.bottom = '10%';
hint.style.transform = 'translateX(-50%)';
hint.style.padding = '6px 12px';
hint.style.background = 'rgba(0,0,0,0.5)';
hint.style.color = 'white';
hint.style.fontFamily = 'sans-serif';
hint.style.fontSize = '13px';
hint.style.borderRadius = '6px';
hint.style.pointerEvents = 'none';
hint.innerText = 'Click to enter POV • WASD or arrows to move • Space to jump • U to toggle fly mode • T/G up/down';
document.body.appendChild(hint);

// small fly-mode indicator element
const flyIndicator = document.createElement('div');
flyIndicator.style.position = 'absolute';
flyIndicator.style.left = '12px';
flyIndicator.style.top = '12px';
flyIndicator.style.padding = '6px 10px';
flyIndicator.style.background = 'rgba(0,0,0,0.5)';
flyIndicator.style.color = 'white';
flyIndicator.style.fontFamily = 'sans-serif';
flyIndicator.style.fontSize = '13px';
flyIndicator.style.borderRadius = '6px';
flyIndicator.style.pointerEvents = 'none';
flyIndicator.innerText = 'Fly: OFF';
document.body.appendChild(flyIndicator);

controls.addEventListener('lock', () => (hint.style.display = 'none'));
controls.addEventListener('unlock', () => (hint.style.display = 'block'));

// --- Player movement state ---
const moveState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  canJump: false,
  fly: false,      // <-- fly mode on/off
  flyUp: false,    // T pressed
  flyDown: false,  // G pressed
};

const velocity = new THREE.Vector3();  // current velocity
const direction = new THREE.Vector3(); // movement direction
const upVec = new THREE.Vector3(0, 1, 0);

const params = {
  walkSpeed: 10.0,        // m/s
  sprintMultiplier: 1.8,
  accel: 20.0,            // acceleration m/s^2
  friction: 14.0,         // deceleration
  gravity: 30.0,          // m/s^2 (ignored in fly mode)
  jumpSpeed: 8.0,
  flySpeed: 20.0,         // vertical speed while flying (m/s)
};

// --- Keyboard handling ---
function onKeyDown(e) {
  switch (e.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveState.forward = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveState.left = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveState.backward = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveState.right = true;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      moveState.sprint = true;
      break;
    case 'Space':
      if (!moveState.fly && moveState.canJump) { // only normal jump when not flying
        velocity.y = params.jumpSpeed;
        moveState.canJump = false;
      }
      break;
    case 'KeyU': // toggle fly mode
      moveState.fly = !moveState.fly;
      // when enabling fly mode, zero vertical velocity so it feels responsive
      if (moveState.fly) {
        velocity.y = 0;
      }
      // update UI
      flyIndicator.innerText = 'Fly: ' + (moveState.fly ? 'ON' : 'OFF');
      break;
    case 'KeyT': // fly up
      moveState.flyUp = true;
      break;
    case 'KeyG': // fly down
      moveState.flyDown = true;
      break;
  }
}
function onKeyUp(e) {
  switch (e.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveState.forward = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveState.left = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveState.backward = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveState.right = false;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      moveState.sprint = false;
      break;
    case 'KeyT':
      moveState.flyUp = false;
      break;
    case 'KeyG':
      moveState.flyDown = false;
      break;
  }
}
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);

// --- Buildings (simple box objects) ---
const buildings = [];      // array of meshes
const buildingBoxes = [];  // array of THREE.Box3 for collision

// Full replacement for createBuilding — paste this entire function into main.js
// Full replacement for createBuilding — paste this entire function into main.js
function createBuilding(x, z, type = 'boring', opts = {}) {
  const group = new THREE.Group();
  group.position.set(x, 0, z); // group origin at ground level (y=0)

  // Helper to make materials quickly
  const makeMat = (colorHex, metal = 0.05, rough = 0.8, emissive = 0x000000) =>
    new THREE.MeshStandardMaterial({ color: colorHex, metalness: metal, roughness: rough, emissive });

  // We'll compute the "footprint" width/depth and heights, allowing opts overrides
  let bodyWidth, bodyDepth, bodyHeight;
  let roofHeight = 0;

  if (type === 'boring') {
    // Simple box building (the standard building type)
    bodyWidth = opts.width ?? (4 + Math.random() * 4);
    bodyDepth = opts.depth ?? (4 + Math.random() * 4);
    bodyHeight = opts.height ?? (8 + Math.random() * 12);

    const geo = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
    const mat = makeMat(0x999999, 0.05, 0.9);
    const body = new THREE.Mesh(geo, mat);
    body.castShadow = true;
    body.receiveShadow = true;
    // place body so its base sits at y=0
    body.position.set(0, bodyHeight / 2, 0);
    group.add(body);

  } else if (type === 'skyscraper') {
    // UNIFORM height (defaults to 120 unless overridden)
    const HEIGHT_CHOICES = [25, 30, 35];
    bodyHeight = HEIGHT_CHOICES[Math.floor(Math.random() * HEIGHT_CHOICES.length)];

    // width/depth can still vary (or pass opts.width / opts.depth)
    bodyWidth = opts.width ?? (8 + Math.random() * 4);
    bodyDepth = opts.depth ?? (8 + Math.random() * 4);
  

    // Main body: rough grey box
    const geo = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x7f7f7f,
      metalness: 0.08,
      roughness: 0.85,
    });
    const body = new THREE.Mesh(geo, mat);
    body.castShadow = true;
    body.receiveShadow = true;
    body.position.set(0, bodyHeight / 2, 0); // sits on ground
    group.add(body);

    // --- Doors (two) ---
    const doorMaxW = Math.min(3.5, bodyWidth * 0.3);
    const doorWidth = doorMaxW;
    const doorHeight = Math.min(8, Math.max(4, bodyHeight * 0.05));
    const doorDepth = 0.35;

    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.25,
      roughness: 0.35,
    });

    const doorGutter = 0.5;
    const doorSep = doorWidth + doorGutter;
    const doorZ = bodyDepth / 2 + doorDepth / 2 - 0.01;

    const leftDoorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth);
    const leftDoor = new THREE.Mesh(leftDoorGeo, doorMat);
    leftDoor.position.set(-doorSep / 2, doorHeight / 2, doorZ);
    leftDoor.castShadow = true;
    group.add(leftDoor);

    // clone and set position using .position.set(...) instead of replacing .position
    const rightDoor = leftDoor.clone();
    rightDoor.position.set(doorSep / 2, doorHeight / 2, doorZ);
    group.add(rightDoor);

    // small step/threshold under doors
    const stepGeo = new THREE.BoxGeometry(doorWidth * 0.9, 0.15, 0.6);
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 });
    const leftStep = new THREE.Mesh(stepGeo, stepMat);
    leftStep.position.set(-doorSep / 2, 0.075, doorZ - 0.15);
    group.add(leftStep);

    const rightStep = leftStep.clone();
    rightStep.position.set(doorSep / 2, 0.075, doorZ - 0.15);
    group.add(rightStep);

    // --- Black glossy windows in rows of 3 above the doors ---
    const topMargin = 1.0;
    const startY = doorHeight + 0.6;
    const availableHeight = Math.max(0, bodyHeight - startY - topMargin);
    const windowRowHeight = 2.0;
    const vGap = 0.5;
    const rows = Math.max(0, Math.floor(availableHeight / (windowRowHeight + vGap)));

    const horizontalMargin = 0.8;
    const gutter = 0.4;
    const usableWidth = Math.max(0.1, bodyWidth - horizontalMargin * 2 - gutter * 2);
    const windowWidth = usableWidth / 3;

    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      metalness: 0.92,
      roughness: 0.06,
    });

    const windowZ = bodyDepth / 2 + 0.02;
    const leftX = -bodyWidth / 2 + horizontalMargin + windowWidth / 2;

    for (let r = 0; r < rows; r++) {
      const y = startY + r * (windowRowHeight + vGap) + windowRowHeight / 2;
      for (let c = 0; c < 3; c++) {
        const x = leftX + c * (windowWidth + gutter);
        const winGeo = new THREE.PlaneGeometry(windowWidth, windowRowHeight);
        const win = new THREE.Mesh(winGeo, windowMat);
        win.position.set(x, y, windowZ);
        win.castShadow = false;
        win.receiveShadow = false;
        group.add(win);

        // frames around window
        const frameThickness = 0.06;
        const frameGeoH = new THREE.BoxGeometry(windowWidth + frameThickness * 2, frameThickness, frameThickness);
        const frameGeoV = new THREE.BoxGeometry(frameThickness, windowRowHeight + frameThickness * 2, frameThickness);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.3, roughness: 0.5 });

        const topFrame = new THREE.Mesh(frameGeoH, frameMat);
        topFrame.position.set(x, y + windowRowHeight / 2 + frameThickness / 2, windowZ + 0.01);
        group.add(topFrame);
        const bottomFrame = topFrame.clone();
        bottomFrame.position.set(x, y - windowRowHeight / 2 - frameThickness / 2, windowZ + 0.01);
        group.add(bottomFrame);

        const leftFrame = new THREE.Mesh(frameGeoV, frameMat);
        leftFrame.position.set(x - (windowWidth / 2 + frameThickness / 2), y, windowZ + 0.01);
        group.add(leftFrame);
        const rightFrame = leftFrame.clone();
        rightFrame.position.set(x + (windowWidth / 2 + frameThickness / 2), y, windowZ + 0.01);
        group.add(rightFrame);
      }
    }

  } else if (type === 'residential') {
    // small residential building with a pyramid roof
    bodyWidth = opts.width ?? (6 + Math.random() * 6);
    bodyDepth = opts.depth ?? (6 + Math.random() * 6);
    bodyHeight = opts.bodyHeight ?? (6 + Math.random() * 6);
    roofHeight = opts.roofHeight ?? Math.max(2, Math.min(6, bodyWidth * 0.4));

    const bodyGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
    const bodyMat = makeMat(0xd1c7b7, 0.02, 0.85);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    body.position.set(0, bodyHeight / 2, 0);
    group.add(body);

    const roofGeo = new THREE.ConeGeometry(Math.max(bodyWidth, bodyDepth) * 0.6, roofHeight, 4);
    const roofMat = makeMat(0x8a3b2b, 0.02, 0.8);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.castShadow = true;
    roof.position.set(0, bodyHeight + roofHeight / 2, 0);
    roof.rotation.y = Math.PI / 4;
    group.add(roof);

  } else if (type === 'restaurant') {
    // low, wide restaurant with a simple awning
    bodyWidth = opts.width ?? (8 + Math.random() * 6);
    bodyDepth = opts.depth ?? (8 + Math.random() * 6);
    bodyHeight = opts.height ?? (4 + Math.random() * 3);

    const bodyGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
    const bodyMat = makeMat(0xffffff, 0.03, 0.9);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    body.position.set(0, bodyHeight / 2, 0);
    group.add(body);

    const awningGeo = new THREE.BoxGeometry(bodyWidth * 0.9, 0.6, bodyDepth * 0.25);
    const awningMat = makeMat(0xc23a3a, 0.02, 0.7);
    const awning = new THREE.Mesh(awningGeo, awningMat);
    awning.position.set(0, bodyHeight - 0.1, bodyDepth / 2 + awningGeo.parameters.depth / 2 - 0.05);
    awning.castShadow = true;
    group.add(awning);

    const signGeo = new THREE.PlaneGeometry(bodyWidth * 0.5, 0.6);
    const signMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, bodyHeight - 0.2, bodyDepth / 2 + 0.01);
    sign.rotation.y = Math.PI;
    group.add(sign);

  } else {
    // default fallback = boring
    bodyWidth = opts.width ?? 4;
    bodyDepth = opts.depth ?? 4;
    bodyHeight = opts.height ?? 10;
    const geo = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
    const mat = makeMat(0x999999);
    const body = new THREE.Mesh(geo, mat);
    body.position.set(0, bodyHeight / 2, 0);
    group.add(body);
  }

  // add group to scene and register for collision
  scene.add(group);
  buildings.push(group);

  // compute bounding box for the new object and store
  const box = new THREE.Box3().setFromObject(group);
  buildingBoxes.push(box);

  return group;
}


// Create a large black asphalt plane (road)
function createRoad(width = 100, length = 220, y = 0.01) {
    const geo = new THREE.PlaneGeometry(width, length);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.95,
      metalness: 0.02,
    });
    const road = new THREE.Mesh(geo, mat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, y, 0);
    road.receiveShadow = true;
    scene.add(road);
    return road;
  }
  
  // Create a 4x4 grid of grey sidewalk tiles placed on top of the road.
  // centerPos is the grid center in world coordinates (x, 0, z)
  function createSidewalkGrid(rows = 5, cols = 5, tileSize = 160, gap = 400, centerPos = new THREE.Vector3(0, 0, -30)) {
    const tiles = [];
    const totalWidth = cols * tileSize + (cols - 1) * gap;
    const totalDepth = rows * tileSize + (rows - 1) * gap;
  
    const startX = centerPos.x - totalWidth / 2 + tileSize / 2;
    const startZ = centerPos.z - totalDepth / 2 + tileSize / 2;
  
    const mat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.95 });
  
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * (tileSize + gap);
        const z = startZ + r * (tileSize + gap);
  
        const geo = new THREE.PlaneGeometry(tileSize, tileSize);
        const tile = new THREE.Mesh(geo, mat);
        tile.rotation.x = -Math.PI / 2;
        // lift slightly above the road to avoid z-fighting
        tile.position.set(x, 0.02, z);
        tile.receiveShadow = true;
        scene.add(tile);
  
        tiles.push({
          mesh: tile,
          centerX: x,
          centerZ: z,
          tileSize,
        });
      }
    }
     // Create outer ring with 20 unit offset
  const outerOffset = 20;
  
  // Top row (above the main grid)
  for (let c = 0; c < cols-1; c++) {
    const x = startX + c * (tileSize + gap) + outerOffset + 5;
    const z = startZ - (tileSize + gap);
    
    const geo = new THREE.PlaneGeometry(tileSize, tileSize);
    const tile = new THREE.Mesh(geo, mat);
    tile.rotation.x = -Math.PI / 2;
    tile.position.set(x, 0.02, z);
    tile.receiveShadow = true;
    scene.add(tile);
    
    tiles.push({
      mesh: tile,
      centerX: x,
      centerZ: z,
      tileSize,
    });
  }
  
  // Bottom row (below the main grid)
  for (let c = 0; c < cols-1; c++) {
    const x = startX + c * (tileSize + gap) + outerOffset + 5;
    const z = startZ + (rows - 1) * (tileSize + gap) + (tileSize + gap);
    
    const geo = new THREE.PlaneGeometry(tileSize, tileSize);
    const tile = new THREE.Mesh(geo, mat);
    tile.rotation.x = -Math.PI / 2;
    tile.position.set(x, 0.02, z);
    tile.receiveShadow = true;
    scene.add(tile);
    
    tiles.push({
      mesh: tile,
      centerX: x,
      centerZ: z,
      tileSize,
    });
  }
  
  // Left column (left of the main grid, excluding corners to avoid overlap)
  for (let r = 0; r < rows-1; r++) {
    const x = startX - (tileSize + gap);
    const z = startZ + r * (tileSize + gap) + outerOffset + 5; 
    
    const geo = new THREE.PlaneGeometry(tileSize, tileSize);
    const tile = new THREE.Mesh(geo, mat);
    tile.rotation.x = -Math.PI / 2;
    tile.position.set(x, 0.02, z);
    tile.receiveShadow = true;
    scene.add(tile);
    
    tiles.push({
      mesh: tile,
      centerX: x,
      centerZ: z,
      tileSize,
    });
  }
  
  // Right column (right of the main grid, excluding corners to avoid overlap)
  for (let r = 0; r < rows-1; r++) {
    const x = startX + (cols - 1) * (tileSize + gap) + (tileSize + gap);
    const z = startZ + r * (tileSize + gap) + outerOffset + 5;
    
    const geo = new THREE.PlaneGeometry(tileSize, tileSize);
    const tile = new THREE.Mesh(geo, mat);
    tile.rotation.x = -Math.PI / 2;
    tile.position.set(x, 0.02, z);
    tile.receiveShadow = true;
    scene.add(tile);
    
    tiles.push({
      mesh: tile,
      centerX: x,
      centerZ: z,
      tileSize,
    });
  }
  
    return tiles;
  }
  
  // Spawn buildings onto each tile. For each tile we spawn 1–3 buildings,
  // placing them randomly inside the tile with a small margin so they don't touch edges.
  function spawnBuildingsOnTiles(tiles) {
    const INNER = 30; // inner square size (30 x 30) inside each tile (tileSize is 40)
    const CELLS = 3;  // 3x3
    const cellSize = INNER / CELLS; // 10 for INNER=30
    const halfInner = INNER / 2;
  
    for (const t of tiles) {
      // If tile is smaller than expected, clamp inner to tileSize - 2*margin
      const effectiveInner = Math.min(INNER, t.tileSize - 2); // keep at least 1 unit margin
      const effectiveCell = effectiveInner / CELLS;
      const half = effectiveInner / 2;
  
      // centers of 3x3 grid relative offsets (x,z)
      // center offset formula: -half + effectiveCell/2 + j*effectiveCell
      for (let rz = 0; rz < CELLS; rz++) {
        for (let cx = 0; cx < CELLS; cx++) {
          const offsetX = -half + effectiveCell / 2 + cx * effectiveCell;
          const offsetZ = -half + effectiveCell / 2 + rz * effectiveCell;
  
          const bx = t.centerX + offsetX;
          const bz = t.centerZ + offsetZ;
  
          // choose building size small enough to fit in the cell
          const footprint = Math.min(effectiveCell * 0.8, 8); // building footprint (max 8)
          const width = footprint * (0.8 + Math.random() * 0.2);
          const depth = footprint * (0.8 + Math.random() * 0.2);
          const height = 6 + Math.random() * 14;
  
          // For now spawn BORING buildings only as requested
          
          try {
            createBuilding(bx, bz, 'skyscraper', { width, depth, height });
          } catch (e) {
            console.error('❌ Failed to create building at', bx, bz);
            console.error('Error name:', e.name);
            console.error('Error message:', e.message);
            console.error('Stack trace:', e.stack);
          }
        }
      }
    }
  
    // update collision boxes so your movement/collision uses the new boxes
    recomputeBoxes();
  }
  
  // create the road, the 4x4 sidewalk grid, and spawn buildings
  const road = createRoad(400, 400, 0.01);
  // the grid center Z is -30 so the tiles are in front of the player's initial position.
  // tweak the centerPos to move the grid closer or further away.
  const sidewalkTiles = createSidewalkGrid(4, 4, 40, 10, new THREE.Vector3(0, 0, -30));
  spawnBuildingsOnTiles(sidewalkTiles);
  

// Update buildingBoxes when window resizes or if you move buildings later
function recomputeBoxes() {
  for (let i = 0; i < buildings.length; i++) {
    buildingBoxes[i].setFromObject(buildings[i]);
  }
}

// --- Basic collision: prevent camera (player) from entering building boxes ---
// We treat the player as a small vertical capsule approximated by a box.
const playerBox = new THREE.Box3();
const playerHalfSize = new THREE.Vector3(0.35, 0.9, 0.35); // half-extents

function willCollide(pos) {
  // pos is next camera position (Vector3)
  const min = new THREE.Vector3().copy(pos).sub(playerHalfSize);
  const max = new THREE.Vector3().copy(pos).add(playerHalfSize);
  playerBox.min.copy(min);
  playerBox.max.copy(max);

  for (let i = 0; i < buildingBoxes.length; i++) {
    if (playerBox.intersectsBox(buildingBoxes[i])) return true;
  }
  return false;
}

// --- Animation loop & physics ---
let prevTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const time = performance.now();
  const delta = Math.min((time - prevTime) / 1000, 0.05); // seconds (clamped)
  prevTime = time;

  // Movement direction relative to camera orientation
  direction.set(0, 0, 0);
  if (moveState.forward) direction.z -= 1;
  if (moveState.backward) direction.z += 1;
  if (moveState.left) direction.x -= 1;
  if (moveState.right) direction.x += 1;
  direction.normalize();

  // compute horizontal target speed
  const speed = params.walkSpeed * (moveState.sprint ? params.sprintMultiplier : 1);

  // Convert camera-local direction to world-space movement vector (XZ only)
  const camQuat = camera.quaternion;
  const moveVec = new THREE.Vector3(direction.x, 0, direction.z).applyQuaternion(camQuat);

  // Accelerate / decelerate horizontally (same as before)
  const horizVel = new THREE.Vector3(velocity.x, 0, velocity.z);
  const targetVel = moveVec.multiplyScalar(speed);
  horizVel.lerp(targetVel, 1 - Math.exp(-params.accel * delta)); // smooth accel
  if (direction.length() === 0) {
    horizVel.multiplyScalar(Math.max(0, 1 - params.friction * delta));
  }
  velocity.x = horizVel.x;
  velocity.z = horizVel.z;

  // Vertical handling:
  // - If fly mode ON: vertical velocity is driven by T/G keys (no gravity)
  // - If fly mode OFF: gravity applies and normal jumping works
  if (moveState.fly) {
    // Stop gravity accumulation
    // Vertical speed determined directly by flyUp/flyDown
    let vY = 0;
    if (moveState.flyUp) vY += params.flySpeed;
    if (moveState.flyDown) vY -= params.flySpeed;
    // Instead of setting velocity.y directly (which would be huge due to lerp), compute deltaY per frame
    // We'll apply as a translation when computing nextPos.
    // (Also zero out gravity / jump state)
    velocity.y = 0;
  } else {
    // normal gravity + jumping
    velocity.y -= params.gravity * delta;
  }

  // Compute proposed next position
  const currentPos = controls.getObject ? controls.getObject().position : camera.position;
  const horizontalMove = new THREE.Vector3(velocity.x, 0, velocity.z).multiplyScalar(delta);

  // compute vertical displacement
  let verticalMove = 0;
  if (moveState.fly) {
    // fly vertical displacement per frame
    const flyDelta = params.flySpeed * delta;
    if (moveState.flyUp) verticalMove += flyDelta;
    if (moveState.flyDown) verticalMove -= flyDelta;
  } else {
    // normal physics vertical displacement from velocity.y
    verticalMove = velocity.y * delta;
  }

  const nextPos = new THREE.Vector3().copy(currentPos).add(horizontalMove);
  nextPos.y += verticalMove;

  // If not flying, enforce ground (landing)
  if (!moveState.fly) {
    if (nextPos.y < 1.6) { // standing head height; adjust as needed
      velocity.y = 0;
      nextPos.y = 1.6;
      moveState.canJump = true;
    }
  }

  // Collision logic:
  // - When flying we check full 3D collision against buildings (so you can't fly through them)
  // - When walking we use the original projected XZ collision sliding behavior
  if (moveState.fly) {
    // full 3D collision test
    if (willCollide(nextPos)) {
      // collision: don't move into the colliding position.
      // Strategy: cancel vertical move first, then horizontal if still colliding.
      const tryNoVertical = new THREE.Vector3(nextPos.x, currentPos.y, nextPos.z);
      if (!willCollide(tryNoVertical)) {
        nextPos.y = currentPos.y; // cancel vertical
      } else {
        const tryNoHorizontal = new THREE.Vector3(currentPos.x, nextPos.y, currentPos.z);
        if (!willCollide(tryNoHorizontal)) {
          nextPos.x = currentPos.x;
          nextPos.z = currentPos.z;
        } else {
          // completely blocked: stay where you are
          nextPos.copy(currentPos);
          velocity.x = 0;
          velocity.z = 0;
        }
      }
    }
  } else {
    // existing XZ sliding collision behavior (projected mid-height)
    const projectedPos = new THREE.Vector3(nextPos.x, 1.0, nextPos.z);
    const projectedCurrent = new THREE.Vector3(currentPos.x, 1.0, currentPos.z);

    if (willCollide(projectedPos)) {
      // attempt move only on X
      const tryX = new THREE.Vector3(projectedPos.x, projectedPos.y, projectedCurrent.z);
      if (!willCollide(tryX)) {
        nextPos.z = currentPos.z; // allow X
      } else {
        // attempt only Z
        const tryZ = new THREE.Vector3(projectedCurrent.x, projectedCurrent.y, projectedPos.z);
        if (!willCollide(tryZ)) {
          nextPos.x = currentPos.x; // allow Z
        } else {
          // both blocked
          velocity.x = 0;
          velocity.z = 0;
          nextPos.x = currentPos.x;
          nextPos.z = currentPos.z;
        }
      }
    }
  }

  // Commit position
  if (controls.getObject) {
    controls.getObject().position.copy(nextPos);
  } else {
    camera.position.copy(nextPos);
  }

  renderer.render(scene, camera);
}
animate();

// --- Resize handling ---
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  recomputeBoxes();
});