// The player: Raka, a getaway driver back in Teluk Nusa. On foot he walks, runs
// and shoots; near a car he can get in (E) and drive it; stealing a car with a
// driver, or any car that is not his, is a crime the wanted system sees.

import * as THREE from 'three';
import { PLAYER_TUNING } from './config.js';
import { resolveCollisions } from './city.js';
import { nearestCar } from './vehicles.js';

export function createPlayerMesh() {
  const group = new THREE.Group();
  const jacketMat = new THREE.MeshLambertMaterial({ color: 0x2e6fd8 });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xc98d64 });
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x22242a });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.95, 8), jacketMat);
  body.position.y = 1.1;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skinMat);
  head.position.y = 1.82;
  head.castShadow = true;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.1, 10), new THREE.MeshLambertMaterial({ color: 0xd83a2e }));
  cap.position.y = 2.0;
  group.add(cap);
  // A worn backpack: Raka carries everything he owns, and it marks him out
  // from the crowd at a glance.
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.2), new THREE.MeshLambertMaterial({ color: 0x8a5fc7 }));
  pack.position.set(-0.36, 1.15, 0);
  group.add(pack);
  const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.7, 6);
  const legL = new THREE.Mesh(legGeo, pantsMat);
  legL.position.set(0, 0.35, 0.13);
  group.add(legL);
  const legR = new THREE.Mesh(legGeo, pantsMat);
  legR.position.set(0, 0.35, -0.13);
  group.add(legR);
  const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.65, 6);
  const armL = new THREE.Mesh(armGeo, jacketMat);
  armL.position.set(0.34, 1.15, 0);
  armL.rotation.z = 0.25;
  group.add(armL);
  const armR = new THREE.Mesh(armGeo, jacketMat);
  armR.position.set(-0.34, 1.15, 0);
  armR.rotation.z = -0.25;
  group.add(armR);
  group.userData.legs = { legL, legR };
  return group;
}

export class Player {
  constructor(mesh, x, z) {
    this.mesh = mesh;
    this.x = x;
    this.z = z;
    this.heading = 0;
    this.health = PLAYER_TUNING.maxHealth;
    this.ammo = PLAYER_TUNING.pistolAmmo;
    this.money = 0;
    this.inCar = false;
    this.car = null;
    this.carPrevDriver = null;
    this.walkPhase = 0;
    this.moving = false;
    this.hurtFlash = 0;
  }

  damage(amount) {
    this.health = Math.max(0, this.health - amount);
    this.hurtFlash = 0.5;
    return this.health <= 0;
  }

  heal(amount) {
    this.health = Math.min(PLAYER_TUNING.maxHealth, this.health + amount);
  }

  // On-foot movement, relative to the camera yaw. Returns whether moving.
  walk(dt, moveX, moveZ, running, city) {
    const speed = running ? PLAYER_TUNING.runSpeed : PLAYER_TUNING.walkSpeed;
    const len = Math.hypot(moveX, moveZ);
    this.moving = len > 0.1;
    if (!this.moving) {
      this.syncMesh();
      return;
    }
    const nx = moveX / len;
    const nz = moveZ / len;
    this.x += nx * speed * dt;
    this.z += nz * speed * dt;
    const wantHeading = Math.atan2(-nz, nx);
    let diff = wantHeading - this.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.heading += Math.max(-9 * dt, Math.min(9 * dt, diff));
    this.walkPhase += dt * speed * 1.6;
    const fixed = resolveCollisions(city, this.x, this.z, PLAYER_TUNING.radius);
    this.x = fixed.x;
    this.z = fixed.z;
    this.syncMesh();
  }

  syncMesh() {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    const swing = this.moving ? Math.sin(this.walkPhase) * 0.6 : 0;
    const { legL, legR } = this.mesh.userData.legs;
    legL.rotation.x = swing;
    legR.rotation.x = -swing;
    this.mesh.visible = !this.inCar;
  }

  nearestEnterableCar(cars, maxDist = 4.5) {
    return nearestCar(cars, this.x, this.z, maxDist);
  }

  enterCar(car) {
    this.inCar = true;
    this.car = car;
    // Remember who drove this car: a stolen traffic car goes back to
    // traffic when the player steps out instead of dying on the road.
    this.carPrevDriver = car.driver;
    car.driver = 'player';
    this.mesh.visible = false;
  }

  exitCar() {
    if (!this.car) return;
    const car = this.car;
    car.driver = this.carPrevDriver === 'traffic' ? 'traffic' : null;
    this.carPrevDriver = null;
    car.speed = 0;
    this.inCar = false;
    this.car = null;
    // Step out to the side of the car.
    const side = Math.cos(car.heading + Math.PI / 2);
    const sideZ = -Math.sin(car.heading + Math.PI / 2);
    this.x = car.x + side * 2.2;
    this.z = car.z + sideZ * 2.2;
    this.heading = car.heading;
    this.syncMesh();
  }
}
