// Pedestrians: simple low-poly people (body, head, legs that swing while walking)
// who stroll along the sidewalks, cross at corners, and flee when a gun goes off.

import * as THREE from 'three';
import { resolveCollisions } from './city.js';

const SHIRTS = [0xe05a4e, 0x4a90d9, 0x3fae7a, 0xf2a93b, 0x8a5fc7, 0xe8e4da, 0x2e6fd8, 0xd86a2e];
const SKINS = [0xc98d64, 0x8a5a3b, 0xe8b98a, 0x6b4423];

export function createPedMesh(random) {
  const group = new THREE.Group();
  const shirt = SHIRTS[Math.floor(random() * SHIRTS.length)];
  const skin = SKINS[Math.floor(random() * SKINS.length)];
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const skinMat = new THREE.MeshLambertMaterial({ color: skin });
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x2e3138 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.85, 8), shirtMat);
  body.position.y = 1.05;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skinMat);
  head.position.y = 1.72;
  head.castShadow = true;
  group.add(head);
  const legGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.62, 6);
  const legL = new THREE.Mesh(legGeo, pantsMat);
  legL.position.set(0, 0.31, 0.12);
  group.add(legL);
  const legR = new THREE.Mesh(legGeo, pantsMat);
  legR.position.set(0, 0.31, -0.12);
  group.add(legR);
  const armGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.6, 6);
  const armL = new THREE.Mesh(armGeo, shirtMat);
  armL.position.set(0.3, 1.1, 0);
  armL.rotation.z = 0.25;
  group.add(armL);
  const armR = new THREE.Mesh(armGeo, shirtMat);
  armR.position.set(-0.3, 1.1, 0);
  armR.rotation.z = -0.25;
  group.add(armR);

  group.userData.legs = { legL, legR };
  return group;
}

export class Ped {
  constructor(mesh, x, z) {
    this.mesh = mesh;
    this.x = x;
    this.z = z;
    this.heading = 0;
    this.speed = 1.4;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.target = null;
    this.fleeing = 0;
    this.fleeX = 0;
    this.fleeZ = 0;
    this.alive = true;
    this.down = false;
  }

  syncMesh() {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    const swing = Math.sin(this.walkPhase) * 0.55;
    const { legL, legR } = this.mesh.userData.legs;
    legL.rotation.x = swing;
    legR.rotation.x = -swing;
  }
}

// A new stroll target on a sidewalk: near a road line, offset onto the walk,
// so pedestrians stay on the pavements instead of wandering through blocks.
function sidewalkTarget(city, random) {
  if (random() < 0.5) {
    return { x: city.roadsX[Math.floor(random() * city.roadsX.length)] + 9, z: (random() * 2 - 1) * 170 };
  }
  return { x: (random() * 2 - 1) * 170, z: city.roadsZ[Math.floor(random() * city.roadsZ.length)] + 9 };
}

export function createPeds(city, scene, random, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const mesh = createPedMesh(random);
    scene.add(mesh);
    const horizontal = random() < 0.5;
    const x = horizontal ? (random() * 2 - 1) * 170 : city.roadsX[Math.floor(random() * city.roadsX.length)] + 9;
    const z = horizontal ? city.roadsZ[Math.floor(random() * city.roadsZ.length)] + 9 : (random() * 2 - 1) * 170;
    const ped = new Ped(mesh, x, z);
    ped.heading = random() * Math.PI * 2;
    // A mixed crowd walks at mixed speeds.
    ped.speed = 1.1 + random() * 0.7;
    ped.target = sidewalkTarget(city, random);
    ped.syncMesh();
    peds.push(ped);
  }
  return peds;
}

// A gunshot nearby makes pedestrians run away from the noise.
export function scarePeds(peds, x, z, radius = 45) {
  for (const ped of peds) {
    if (!ped.alive) continue;
    const d = Math.hypot(ped.x - x, ped.z - z);
    if (d < radius) {
      ped.fleeing = 4;
      const away = Math.atan2(-(ped.z - z), ped.x - x);
      ped.fleeX = ped.x + Math.cos(away) * 30;
      ped.fleeZ = ped.z - Math.sin(away) * 30;
    }
  }
}

export function updatePeds(city, peds, dt) {
  for (const ped of peds) {
    if (!ped.alive || ped.down) continue;
    let tx;
    let tz;
    let speed = ped.speed;
    if (ped.fleeing > 0) {
      ped.fleeing -= dt;
      tx = ped.fleeX;
      tz = ped.fleeZ;
      speed = 4.2;
    } else {
      tx = ped.target.x;
      tz = ped.target.z;
    }
    const dx = tx - ped.x;
    const dz = tz - ped.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 3) {
      ped.target = sidewalkTarget(city, Math.random);
      continue;
    }
    const want = Math.atan2(-dz, dx);
    let diff = want - ped.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    ped.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    ped.x += Math.cos(ped.heading) * speed * dt;
    ped.z += -Math.sin(ped.heading) * speed * dt;
    ped.walkPhase += dt * speed * 3.4;
    const fixed = resolveCollisions(city, ped.x, ped.z, 0.5);
    ped.x = fixed.x;
    ped.z = fixed.z;
    ped.syncMesh();
  }
}
