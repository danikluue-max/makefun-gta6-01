// The screenshot scenes behind ?shot=chase|street|drive|mission. Each one stages a
// real moment of play — the player driving, walking, chased or on a job — then runs
// the simulation forward a fixed number of steps, so the frame is what a short
// game really looks like and the same seed always gives the same frame.

import { STEP } from './config.js';
import { Car, createCarMesh, updateTraffic } from './vehicles.js';
import { updatePeds } from './pedestrians.js';
import { updateHud } from './hud.js';
import { updateSky } from './skycycle.js';

function resetStaging(game) {
  const { player, police, wanted, missions } = game;
  if (player.inCar) player.exitCar();
  for (const car of police.cars) game.scene.remove(car.mesh);
  police.cars = [];
  police.spawnTimer = 10;
  wanted.clear();
  player.health = 100;
  player.ammo = 60;
  missions.active = null;
  missions.completed = 0;
  missions.state = 'idle';
  for (const bag of missions.cashBags) game.scene.remove(bag);
  missions.cashBags = [];
  missions.beacon.visible = false;
}

function spawnPoliceAt(game, x, z, heading) {
  const mesh = createCarMesh('police', 0xf2f2f2);
  game.scene.add(mesh);
  const car = new Car(mesh, x, z, heading);
  car.driver = 'police';
  car.speed = 18;
  car.syncMesh();
  game.police.cars.push(car);
  return car;
}

function putPlayerInCar(game, car) {
  game.player.enterCar(car);
  game.cameraRig.yaw = car.heading;
}

function stagedStep(game, drive) {
  const dt = STEP;
  game.elapsed += dt;
  game.timeOfDay += dt * (24 / 480);
  if (game.player.inCar && game.player.car) {
    game.player.car.drive(dt, drive.throttle, drive.brake, drive.steer);
  }
  updateTraffic(game.city, game.traffic, dt, game.random);
  updatePeds(game.city, game.peds, dt);
  game.police.update(dt, game.player, game.wanted, game.elapsed);
  game.missions.update(dt, game);
  game.missions.updateVisuals(game.elapsed);
  const target = game.player.inCar && game.player.car
    ? { x: game.player.car.x, z: game.player.car.z }
    : { x: game.player.x, z: game.player.z };
  game.cameraRig.update(dt, target, game.player.inCar, game.player.car ? game.player.car.heading : 0);
  updateSky(game.sky, game.scene, game.timeOfDay, game.lampHeads);
  updateHud(game.hud, game);
}

export function stageShot(name, game) {
  resetStaging(game);
  const drive = { throttle: 0, brake: 0, steer: 0 };
  let steps = 60;

  if (name === 'chase') {
    // The cover: a police chase at dusk on the boulevard — wanted stars, the
    // minimap, a mission objective and two police cars on the player's tail.
    game.timeOfDay = 18.4;
    game.missions.completed = 4;
    game.missions.startNext(game);
    game.missions.active.objectiveIndex = 1;
    game.missions.refreshBeacon(game);
    const car = game.spawnMissionCar(0, 160, 0, 'sport');
    putPlayerInCar(game, car);
    // Pull the chase camera in for the cover: the car and its pursuers
    // should fill the frame, not sit small at the bottom of the road.
    game.cameraRig.distance = 8.5;
    game.player.car.speed = 24;
    game.wanted.add(3, 'razia');
    // One unit comes at the player down the boulevard, far enough out that
    // it is still closing in the frame instead of ramming the player's car
    // (a closer spawn ends in a tangle at 4 km/h); the other comes up
    // from behind.
    spawnPoliceAt(game, 150, 160, Math.PI);
    spawnPoliceAt(game, -30, 163, 0);
    drive.throttle = 1;
    steps = 150;
  } else if (name === 'street') {
    // On foot in Pasar Nusa at midday: stalls, pedestrians, the first mission.
    game.timeOfDay = 10.5;
    game.missions.startNext(game);
    game.player.x = -40;
    game.player.z = -24;
    game.player.heading = Math.PI / 2;
    game.player.syncMesh();
    game.cameraRig.yaw = Math.PI / 2;
    game.cameraRig.distance = 7;
    steps = 45;
  } else if (name === 'drive') {
    // Driving the boulevard in the afternoon, delivery job on the HUD.
    game.timeOfDay = 14.0;
    game.missions.startNext(game);
    game.missions.active.objectiveIndex = 1;
    game.missions.refreshBeacon(game);
    const car = game.spawnMissionCar(80, 160, 0, 'sedan');
    putPlayerInCar(game, car);
    game.player.car.speed = 20;
    drive.throttle = 1;
    steps = 110;
  } else if (name === 'mission') {
    // Collecting the market debts: one bag taken, the next one glowing ahead.
    game.timeOfDay = 11.0;
    game.missions.completed = 3;
    game.missions.startNext(game);
    game.missions.active.collected = 1;
    game.missions.refreshBeacon(game);
    game.player.x = -26;
    game.player.z = -54;
    game.player.heading = Math.PI / 2;
    game.player.syncMesh();
    game.cameraRig.yaw = Math.PI / 2;
    game.cameraRig.distance = 7;
    steps = 40;
  } else {
    game.timeOfDay = 10.5;
  }

  for (let i = 0; i < steps; i += 1) stagedStep(game, drive);
  return { scene: game.scene, camera: game.camera };
}
