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
  game.cameraRig.update(dt, target, game.player.inCar, game.player.car ? game.player.car.heading : 0, game.player.car ? game.player.car.speed : 0);
  updateSky(game.sky, game.scene, game.timeOfDay, game.lampHeads);
  updateHud(game.hud, game);
}

export function stageShot(name, game) {
  resetStaging(game);
  const drive = { throttle: 0, brake: 0, steer: 0 };
  let steps = 60;

  if (name === 'chase') {
    // The cover: a police chase at GOLDEN HOUR on the boulevard — the sun
    // low over the sea, warm orange-pink sky, long shadows, wanted stars,
    // the minimap, a mission objective, police cars right on the player's
    // tail and the helicopter overhead. Round 1 shot this at dusk and the
    // frame came out dark; round 2 shot it at noon and it read flat. 17:48
    // keeps the warm sunset light while the street stays readable.
    game.timeOfDay = 17.8;
    game.missions.completed = 6;
    game.missions.startNext(game);
    game.missions.active.objectiveIndex = 1;
    game.missions.refreshBeacon(game);
    const car = game.spawnMissionCar(0, 160, 0, 'sport');
    putPlayerInCar(game, car);
    // The chase camera is close and low for the cover: the GT fills the
    // frame and the pursuers sit right behind it.
    game.cameraRig.distance = 6.8;
    game.player.car.speed = 24;
    game.wanted.add(4, 'razia');
    // The helicopter starts ahead of the car on its circle, so it is in the
    // frame by the time the shot is taken instead of behind the camera.
    game.police.heliAngle = -0.5;
    // Two units PARKED ahead across the road, facing the player — a
    // roadblock, not a chase: the police AI always turns a moving unit
    // around to face the player, so a "unit ahead driving the same way"
    // U-turns off the road (verified by probe). Parked units stay put,
    // big in the frame with their light bars on. A third unit comes down
    // the boulevard toward the player.
    for (const [bx, bz] of [[85, 157], [90, 163]]) {
      const block = new Car(createCarMesh('police', 0xf2f2f2), bx, bz, Math.PI);
      block.driver = null;
      block.syncMesh();
      const bar = block.mesh.userData.lightBar;
      if (bar) {
        bar.red.material.emissive.setHex(0xff0000);
        bar.blue.material.emissive.setHex(0x0000ff);
      }
      game.scene.add(block.mesh);
      game.parkedCars.push(block);
    }
    spawnPoliceAt(game, 170, 160, Math.PI);
    // Three traffic cars ahead, so the boulevard in the frame is busy
    // between the player and the oncoming police unit. They sit past the
    // roadblock (the parked units at 85/90), so nothing overlaps them.
    const aheadCars = [
      [60, 163, 0x2e6fd8, 'sedan'],
      [105, 157, 0xf2c230, 'taxi'],
      [130, 163, 0xe8e4da, 'van'],
    ];
    for (const [ax, az, color, type] of aheadCars) {
      const ahead = new Car(createCarMesh(type, color), ax, az, 0);
      ahead.driver = 'traffic';
      ahead.speed = 9;
      ahead.syncMesh();
      game.scene.add(ahead.mesh);
      game.traffic.push(ahead);
    }
    drive.throttle = 1;
    steps = 150;
  } else if (name === 'street') {
    // On foot in Pasar Nusa at golden hour: stalls, pedestrians, the first mission.
    game.timeOfDay = 17.6;
    game.missions.startNext(game);
    game.player.x = -40;
    game.player.z = -24;
    game.player.heading = Math.PI / 2;
    game.player.syncMesh();
    game.cameraRig.yaw = Math.PI / 2;
    game.cameraRig.distance = 7;
    steps = 45;
  } else if (name === 'drive') {
    // Driving the boulevard at golden hour in the red GT, delivery job on the HUD.
    // Staged from the west end of the boulevard, so the ferris wheel sits
    // far down the road instead of filling the top-right corner.
    game.timeOfDay = 17.4;
    game.missions.startNext(game);
    game.missions.active.objectiveIndex = 1;
    game.missions.refreshBeacon(game);
    const car = game.spawnMissionCar(-80, 160, 0, 'sport');
    putPlayerInCar(game, car);
    game.player.car.speed = 20;
    drive.throttle = 1;
    steps = 110;
  } else if (name === 'mission') {
    // Collecting the market debts at golden hour: one bag taken, the next one glowing ahead.
    game.timeOfDay = 17.7;
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
  if (name === 'chase') {
    // Park the helicopter in the frame for the cover: ahead of the car and
    // over the beach (no tall buildings there to hide it), low enough that
    // the chase camera — which looks slightly down — actually sees it.
    const cx = game.player.car ? game.player.car.x : game.player.x;
    const cz = game.player.car ? game.player.car.z : game.player.z;
    game.police.heliAngle = -0.7;
    game.police.heli.position.set(cx + 30, 14, cz + 25);
    game.police.heliPool.position.set(cx + 30, 0.06, cz + 25);
    game.police.heliShadow.position.set(cx + 30, 0.05, cz + 25);
  }
  return { scene: game.scene, camera: game.camera };
}
