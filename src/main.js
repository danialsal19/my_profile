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
hint.innerText = 'Click to enter POV • WASD or arrows to move • Space to jump';
document.body.appendChild(hint);

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
};

const velocity = new THREE.Vector3();  // current velocity
const direction = new THREE.Vector3(); // movement direction
const upVec = new THREE.Vector3(0, 1, 0);

const params = {
  walkSpeed: 10.0,      // m/s
  sprintMultiplier: 1.8,
  accel: 20.0,         // acceleration m/s^2
  friction: 14.0,      // deceleration
  gravity: 30.0,       // m/s^2
  jumpSpeed: 8.0,
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
      if (moveState.canJump) {
        velocity.y = params.jumpSpeed;
        moveState.canJump = false;
      }
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
  }
}
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);

// --- Buildings (simple box objects) ---
const buildings = [];      // array of meshes
const buildingBoxes = [];  // array of THREE.Box3 for collision

function createBuilding(x, z, width = 6, depth = 6, height = 12, color = null) {
  const geo = new THREE.BoxGeometry(width, height, depth);
  const mat = new THREE.MeshStandardMaterial({
    color: color ?? new THREE.Color().setHSL(Math.random() * 0.1 + 0.05, 0.2, 0.25),
    roughness: 0.9,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, height / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  buildings.push(mesh);

  // Compute bounding box (world space) and store
  const box = new THREE.Box3().setFromObject(mesh);
  buildingBoxes.push(box);
  return mesh;
}

// Example: procedural block city on either side of a road
// ------------------------
// Replace spawnCity() and its call with the code below
// ------------------------

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
  
    return tiles;
  }
  
  // Spawn buildings onto each tile. For each tile we spawn 1–3 buildings,
  // placing them randomly inside the tile with a small margin so they don't touch edges.
  function spawnBuildingsOnTiles(tiles) {
    for (const t of tiles) {
      const count = 1 + Math.floor(Math.random() * 3); // 1..3 buildings per tile
      for (let i = 0; i < count; i++) {
        const margin = 2; // margin from tile edge
        const half = t.tileSize / 2 - margin;
        // random offset within tile
        const rx = (Math.random() * 2 - 1) * half;
        const rz = (Math.random() * 2 - 1) * half;
        const bx = t.centerX + rx;
        const bz = t.centerZ + rz;
  
        // building size randomization
        const width = 4 + Math.random() * 8;
        const depth = 4 + Math.random() * 8;
        const height = 8 + Math.random() * 60;
  
        createBuilding(bx, bz, width, depth, height);
      }
    }
  
    // make sure collision boxes are up-to-date
    recomputeBoxes();
  }
  
  // create the road, the 4x4 sidewalk grid, and spawn buildings
  const road = createRoad(120, 260, 0.01);
  // the grid center Z is -30 so the tiles are in front of the player's initial position.
  // tweak the centerPos to move the grid closer or further away.
  const sidewalkTiles = createSidewalkGrid(5, 5, 40, 10, new THREE.Vector3(0, 0, -30));
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

  // Apply gravity
  velocity.y -= params.gravity * delta;

  // Movement direction relative to camera orientation
  direction.set(0, 0, 0);
  if (moveState.forward) direction.z -= 1;
  if (moveState.backward) direction.z += 1;
  if (moveState.left) direction.x -= 1;
  if (moveState.right) direction.x += 1;
  direction.normalize();

  // compute target speed
  const speed = params.walkSpeed * (moveState.sprint ? params.sprintMultiplier : 1);

  // Convert camera-local direction to world-space movement vector
  const camQuat = camera.quaternion;
  const moveVec = new THREE.Vector3(direction.x, 0, direction.z).applyQuaternion(camQuat);

  // Accelerate / decelerate horizontally
  const horizVel = new THREE.Vector3(velocity.x, 0, velocity.z);
  const targetVel = moveVec.multiplyScalar(speed);
  // simple accel toward target
  horizVel.lerp(targetVel, 1 - Math.exp(-params.accel * delta)); // smooth accel
  // apply friction when no input
  if (direction.length() === 0) {
    horizVel.multiplyScalar(Math.max(0, 1 - params.friction * delta));
  }
  velocity.x = horizVel.x;
  velocity.z = horizVel.z;

  // Compute proposed next position
  const currentPos = controls.getObject ? controls.getObject().position : camera.position;
  // PointerLockControls stores camera inside an Object3D at controls.getObject()
  const nextPos = new THREE.Vector3().copy(currentPos).addScaledVector(velocity, delta);

  // simple ground collision / floor check (don't fall through ground)
  if (nextPos.y < 1.6) { // standing head height; adjust as needed
    velocity.y = 0;
    nextPos.y = 1.6;
    moveState.canJump = true;
  }

  // Check horizontal collisions (ignore Y for building intersection check by projecting Y)
  const projectedPos = new THREE.Vector3(nextPos.x, 1.0, nextPos.z); // use mid-height for checks
  const projectedCurrent = new THREE.Vector3(currentPos.x, 1.0, currentPos.z);

  // If collision, try sliding: check separately for X and Z movement
  let collided = false;
  if (willCollide(projectedPos)) {
    collided = true;
    // attempt move only on X
    const tryX = new THREE.Vector3(projectedPos.x, projectedPos.y, projectedCurrent.z);
    if (!willCollide(tryX)) {
      nextPos.z = currentPos.z; // allow X movement only
    } else {
      // attempt only Z
      const tryZ = new THREE.Vector3(projectedCurrent.x, projectedCurrent.y, projectedPos.z);
      if (!willCollide(tryZ)) {
        nextPos.x = currentPos.x; // allow Z movement only
      } else {
        // both blocked: stop horizontal movement
        velocity.x = 0;
        velocity.z = 0;
        nextPos.x = currentPos.x;
        nextPos.z = currentPos.z;
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