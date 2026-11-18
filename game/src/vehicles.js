// Cars: a low-poly mesh factory (body, cabin, wheels, lights) plus arcade driving
// physics and the traffic AI that keeps the city moving. One Car class serves the
// player, the traffic and the police — the driver decides the inputs.

import * as THREE from 'three';
import { CAR_TUNING } from './config.js';
import { nearestRoadPoint, resolveCollisions } from './city.js';
import { shuffle } from './rng.js';

const CAR_COLORS = [0xd83a2e, 0x2e6fd8, 0xe8c33c, 0x3fae7a, 0xe8e4da, 0x22242a, 0x8a5fc7, 0xd86a2e];
const TAXI_COLOR = 0xf2c230;

export const CAR_TYPES = {
  sedan: { length: 4.4, width: 1.9, height: 0.62, cabin: 0.55 },
  taxi: { length: 4.4, width: 1.9, height: 0.62, cabin: 0.55 },
  pickup: { length: 5.0, width: 2.0, height: 0.75, cabin: 0.6 },
  van: { length: 5.2, width: 2.1, height: 1.1, cabin: 0.9 },
  police: { length: 4.6, width: 1.95, height: 0.62, cabin: 0.55 },
  sport: { length: 4.3, width: 2.0, height: 0.5, cabin: 0.42 },
};

export function carColorFor(type, random) {
  if (type === 'taxi') return TAXI_COLOR;
  if (type === 'police') return 0xf2f2f2;
  if (type === 'sport') return 0xd81f2e;
  return CAR_COLORS[Math.floor(random() * CAR_COLORS.length)];
}

// A car is a group: body + cabin + 4 wheels + headlights + taillights.
// The group faces +X when heading is 0.
export function createCarMesh(type, color) {
  const spec = CAR_TYPES[type] ?? CAR_TYPES.sedan;
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1c2836 });
  const tyreMat = new THREE.MeshLambertMaterial({ color: 0x14161a });

  const body = new THREE.Mesh(new THREE.BoxGeometry(spec.length, spec.height, spec.width), bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(spec.length * 0.5, spec.cabin, spec.width * 0.86), glassMat);
  cabin.position.set(-spec.length * 0.05, 0.55 + spec.height / 2 + spec.cabin / 2, 0);
  cabin.castShadow = true;
  group.add(cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
  wheelGeo.rotateX(Math.PI / 2);
  const wheels = [];
  for (const [wx, wz] of [[1.45, 0.95], [1.45, -0.95], [-1.45, 0.95], [-1.45, -0.95]]) {
    const wheel = new THREE.Mesh(wheelGeo, tyreMat);
    wheel.position.set(wx, 0.36, wz);
    group.add(wheel);
    wheels.push(wheel);
  }

  const lightMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0x888844 });
  for (const wz of [0.6, -0.6]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.3), lightMat);
    head.position.set(spec.length / 2 + 0.02, 0.6, wz);
    group.add(head);
  }
  const tailMat = new THREE.MeshLambertMaterial({ color: 0xd81f2e, emissive: 0x550000 });
  for (const wz of [0.6, -0.6]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.3), tailMat);
    tail.position.set(-spec.length / 2 - 0.02, 0.6, wz);
    group.add(tail);
  }
  group.userData.tailMat = tailMat;

  if (type === 'police') {
    const barMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 1.1), barMat);
    bar.position.set(-0.2, 0.55 + spec.height / 2 + spec.cabin + 0.08, 0);
    group.add(bar);
    const redMat = new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xaa0000 });
    const blueMat = new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x0000aa });
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.5), redMat);
    red.position.set(-0.2, 0.55 + spec.height / 2 + spec.cabin + 0.2, 0.28);
    group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.5), blueMat);
    blue.position.set(-0.2, 0.55 + spec.height / 2 + spec.cabin + 0.2, -0.28);
    group.add(blue);
    group.userData.lightBar = { red, blue };
  }
  if (type === 'taxi') {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.22, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x222222 }),
    );
    sign.position.set(-0.2, 0.55 + spec.height / 2 + spec.cabin + 0.1, 0);
    group.add(sign);
  }

  group.userData.wheels = wheels;
  group.userData.spec = spec;
  return group;
}

export class Car {
  constructor(mesh, x, z, heading) {
    this.mesh = mesh;
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.speed = 0;
    this.steer = 0;
    this.driver = null; // 'player' | 'traffic' | 'police' | null (parked)
    this.health = 100;
    this.brakeLights = false;
  }

  get spec() {
    return this.mesh.userData.spec;
  }

  // Arcade physics: throttle/brake/steer in [-1, 1]. Returns nothing; the mesh
  // follows the state.
  drive(dt, throttle, brake, steer, maxSpeed = CAR_TUNING.maxSpeed) {
    const accel = throttle > 0 ? CAR_TUNING.accel * throttle : 0;
    const braking = brake > 0 ? CAR_TUNING.brake * brake : 0;
    if (throttle < 0) this.speed += CAR_TUNING.accel * throttle * dt * 0.6;
    this.speed += accel * dt;
    this.speed -= braking * dt * Math.sign(this.speed);
    // Rolling drag and a hard stop at zero when nothing pushes.
    this.speed -= this.speed * 0.55 * dt;
    if (Math.abs(this.speed) < 0.05 && throttle === 0 && brake === 0) this.speed = 0;
    this.speed = Math.max(-CAR_TUNING.reverseMax, Math.min(maxSpeed, this.speed));
    const turn = steer * CAR_TUNING.turnRate * Math.min(1, Math.abs(this.speed) / 6) * Math.sign(this.speed || 1);
    this.heading += turn * dt;
    this.x += Math.cos(this.heading) * this.speed * dt;
    this.z += -Math.sin(this.heading) * this.speed * dt;
    this.brakeLights = brake > 0;
    this.syncMesh();
  }

  syncMesh() {
    this.mesh.position.set(this.x, 0, this.z);
    // rotation.y = heading maps the car's local +X (its nose) to the world
    // direction (cos h, 0, -sin h), which is exactly how drive() moves it.
    this.mesh.rotation.y = this.heading;
    const spin = this.speed * 0.12;
    for (const wheel of this.mesh.userData.wheels) wheel.rotation.z -= spin;
    // Brake lights flare while the brakes are on.
    const tailMat = this.mesh.userData.tailMat;
    if (tailMat) tailMat.emissive.setHex(this.brakeLights ? 0xdd1111 : 0x550000);
  }
}

// Traffic: each car drives along the road grid toward a waypoint at an
// intersection; on arrival it picks a new one. Cars slow for the car ahead.
export function createTraffic(city, scene, random, count) {
  const cars = [];
  // Deal the types from a shuffled deck so the mix is even instead of
  // letting one random roll decide the whole street.
  const deck = shuffle(random, ['sedan', 'taxi', 'pickup', 'van', 'sedan', 'sedan']);
  for (let i = 0; i < count; i += 1) {
    const type = deck[i % deck.length];
    const mesh = createCarMesh(type, carColorFor(type, random));
    scene.add(mesh);
    const horizontal = random() < 0.5;
    const road = horizontal
      ? { x: (random() * 2 - 1) * 160, z: city.roadsZ[Math.floor(random() * city.roadsZ.length)] }
      : { x: city.roadsX[Math.floor(random() * city.roadsX.length)], z: (random() * 2 - 1) * 160 };
    const car = new Car(mesh, road.x, road.z, horizontal ? (random() < 0.5 ? 0 : Math.PI) : (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2));
    car.driver = 'traffic';
    car.speed = CAR_TUNING.trafficSpeed * (0.8 + random() * 0.4);
    car.target = pickWaypoint(city, random, car);
    cars.push(car);
  }
  return cars;
}

function pickWaypoint(city, random, car) {
  const horizontal = Math.abs(Math.sin(car.heading)) < 0.5;
  if (horizontal) {
    const z = city.roadsZ[Math.floor(random() * city.roadsZ.length)];
    return { x: (random() * 2 - 1) * 170, z, horizontal: true };
  }
  const x = city.roadsX[Math.floor(random() * city.roadsX.length)];
  return { x, z: (random() * 2 - 1) * 170, horizontal: false };
}

export function updateTraffic(city, cars, dt, random) {
  for (const car of cars) {
    if (!car.target) car.target = pickWaypoint(city, random, car);
    const dx = car.target.x - car.x;
    const dz = car.target.z - car.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 6) {
      car.target = pickWaypoint(city, random, car);
      continue;
    }
    // Steer toward the target along the road: snap the heading to the
    // direction of travel, then ease the car onto the road line.
    const wantHeading = Math.atan2(-dz, dx);
    let diff = wantHeading - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 1.6));
    // Slow down for the car ahead on the same road.
    let throttle = 0.55;
    for (const other of cars) {
      if (other === car) continue;
      const ox = other.x - car.x;
      const oz = other.z - car.z;
      const ahead = ox * Math.cos(car.heading) - oz * Math.sin(car.heading);
      const side = Math.abs(ox * Math.sin(car.heading) + oz * Math.cos(car.heading));
      if (ahead > 0 && ahead < 12 && side < 3) { throttle = 0; break; }
    }
    car.drive(dt, throttle, throttle === 0 ? 0.8 : 0, steer, CAR_TUNING.trafficSpeed * 1.2);
    const fixed = resolveCollisions(city, car.x, car.z, 2.4);
    car.x = fixed.x;
    car.z = fixed.z;
  }
}

// A parked car the player can steal: no driver, engine off.
export function createParkedCar(city, scene, random, x, z, heading, type) {
  const mesh = createCarMesh(type, carColorFor(type, random));
  scene.add(mesh);
  const car = new Car(mesh, x, z, heading);
  car.driver = null;
  car.syncMesh();
  return car;
}

export function nearestCar(cars, x, z, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    const d = Math.hypot(car.x - x, car.z - z);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}
