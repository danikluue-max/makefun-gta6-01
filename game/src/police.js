// The wanted system and the police who answer it. Crimes raise stars; stars decay
// when the player stays clean and out of sight. Police cars spawn at the city edge,
// chase on the road grid and ram the player; at four stars a helicopter circles
// overhead with a searchlight.

import * as THREE from 'three';
import { CAR_TUNING, WANTED } from './config.js';
import { Car, createCarMesh } from './vehicles.js';
import { nearestRoadPoint } from './city.js';

export class Wanted {
  constructor() {
    this.stars = 0;
    this.decayTimer = 0;
    this.crimeFlash = 0;
  }

  add(amount, reason) {
    const before = this.stars;
    this.stars = Math.max(0, Math.min(WANTED.maxStars, this.stars + amount));
    this.decayTimer = WANTED.decaySeconds;
    if (this.stars > before) this.crimeFlash = 1.2;
    return { before, after: this.stars, reason };
  }

  clear() {
    this.stars = 0;
    this.decayTimer = 0;
  }

  // Decay only while no police officer is close enough to see the player.
  update(dt, policeNear) {
    if (this.stars === 0) return;
    if (this.crimeFlash > 0) this.crimeFlash -= dt;
    if (policeNear) {
      this.decayTimer = WANTED.decaySeconds;
      return;
    }
    this.decayTimer -= dt;
    if (this.decayTimer <= 0) {
      this.stars -= 1;
      this.decayTimer = WANTED.decaySeconds;
    }
  }
}

function makeHelicopter(scene) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1c2f4a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.4, 1.8), bodyMat);
  body.castShadow = true;
  group.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 0.5), bodyMat);
  tail.position.set(-3.6, 0.3, 0);
  group.add(tail);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.8, 1.6),
    new THREE.MeshLambertMaterial({ color: 0x9fc4d8 }),
  );
  glass.position.set(1.8, 0.2, 0);
  group.add(glass);
  const rotorMat = new THREE.MeshLambertMaterial({ color: 0x22242a });
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5), rotorMat);
  rotor.position.y = 1.1;
  group.add(rotor);
  const skidMat = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
  for (const wz of [0.8, -0.8]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 0.12), skidMat);
    skid.position.set(0, -0.9, wz);
    group.add(skid);
  }
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(7, 55, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
  );
  cone.position.y = -28;
  cone.rotation.x = Math.PI;
  group.add(cone);
  group.userData.cone = cone;
  group.userData.rotor = rotor;
  group.visible = false;
  scene.add(group);
  return group;
}

export class Police {
  constructor(scene, city, random) {
    this.scene = scene;
    this.city = city;
    this.random = random;
    this.cars = [];
    this.heli = makeHelicopter(scene);
    this.heliAngle = 0;
    this.spawnTimer = 0;
    this.sirenPhase = 0;
  }

  wantedCarCount(stars) {
    return Math.min(6, stars * 2);
  }

  spawnCar(px, pz) {
    const angle = this.random() * Math.PI * 2;
    const x = px + Math.cos(angle) * 130;
    const z = pz - Math.sin(angle) * 130;
    const near = nearestRoadPoint(this.city, x, z);
    const mesh = createCarMesh('police', 0xf2f2f2);
    this.scene.add(mesh);
    const car = new Car(mesh, near.x, near.z, 0);
    car.driver = 'police';
    car.speed = 10;
    car.syncMesh();
    this.cars.push(car);
    return car;
  }

  update(dt, player, wanted, time) {
    const want = this.wantedCarCount(wanted.stars);
    this.spawnTimer -= dt;
    if (this.cars.length < want && this.spawnTimer <= 0) {
      this.spawnCar(player.x, player.z);
      this.spawnTimer = 2.5;
    }
    // Despawn the farthest car when the wanted level drops.
    while (this.cars.length > want) {
      const car = this.cars.pop();
      this.scene.remove(car.mesh);
    }

    let near = false;
    const px = player.inCar && player.car ? player.car.x : player.x;
    const pz = player.inCar && player.car ? player.car.z : player.z;
    for (const car of this.cars) {
      // Chase steering: aim at the player, snapped to the road grid.
      const dx = px - car.x;
      const dz = pz - car.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 70) near = true;
      const wantHeading = Math.atan2(-dz, dx);
      let diff = wantHeading - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const steer = Math.max(-1, Math.min(1, diff * 1.4));
      const throttle = dist > 8 ? 1 : 0.4;
      car.drive(dt, throttle, 0, steer, CAR_TUNING.policeSpeed);
      // Ram: shove the player's car. On foot, getting caught is handled by the
      // busted timer in main.js, not by damage here.
      if (dist < 3.4 && player.inCar && player.car) {
        player.car.speed *= 0.82;
        player.car.x += (dx / (dist || 1)) * -1.2;
        player.car.z += (dz / (dist || 1)) * -1.2;
      }
      // Flash the light bar, alternating red and blue.
      const bar = car.mesh.userData.lightBar;
      if (bar) {
        const on = Math.floor(time * 6) % 2 === 0;
        bar.red.material.emissive.setHex(on ? 0xff0000 : 0x220000);
        bar.blue.material.emissive.setHex(on ? 0x000022 : 0x0000ff);
      }
    }

    // Helicopter at four stars and above: circle the player with a searchlight.
    if (wanted.stars >= 4) {
      this.heli.visible = true;
      this.heliAngle += dt * 0.5;
      // The searchlight sweeps side to side as the helicopter circles.
      const cone = this.heli.userData.cone;
      if (cone) cone.rotation.z = Math.sin(time * 0.9) * 0.22;
      const hx = px + Math.cos(this.heliAngle) * 26;
      const hz = pz - Math.sin(this.heliAngle) * 26;
      this.heli.position.set(hx, 58, hz);
      this.heli.rotation.y = this.heliAngle;
      this.heli.userData.rotor.rotation.y += dt * 22;
    } else {
      this.heli.visible = false;
    }
    return near;
  }
}
