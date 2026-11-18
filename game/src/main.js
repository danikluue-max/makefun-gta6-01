// NUSA HEAT — boot and the one loop. Input is read every frame, the world advances
// in fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between six screens: title, play, paused, busted, wasted and end (story done).
//
// ?seed=N fixes the city. ?shot=chase|street|drive|mission (with &seed=N) stages
// that scene instead of running the loop and sets window.__shotReady.

import * as THREE from 'three';
import { STEP, PLAYER_TUNING, WANTED } from './config.js';
import { createRandom } from './rng.js';
import { buildCity, resolveCollisions } from './city.js';
import { buildWorld } from './world3d.js';
import { Car, createCarMesh, createTraffic, updateTraffic, createParkedCar, nearestCar, carColorFor } from './vehicles.js';
import { createPeds, updatePeds, scarePeds, createPedMesh, Ped } from './pedestrians.js';
import { Player, createPlayerMesh } from './player.js';
import { Wanted, Police } from './police.js';
import { MissionManager, MISSION_DEFS } from './missions.js';
import { shootAt, makeMuzzleFlash, makeHitSpark, updateEffects } from './combat.js';
import { createHud, updateHud } from './hud.js';
import { AudioEngine } from './audio.js';
import { createSky, updateSky, DAY_LENGTH_SECONDS } from './skycycle.js';
import { CameraRig } from './camera.js';
import { saveGame, loadGame, hasSave } from './savegame.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER_CAR, ACTION_SHOOT, ACTION_RADIO, ACTION_MUTE, ACTION_HORN, ACTION_REPAIR, ACTION_PAINT } from './input.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const AUTOSAVE_SECONDS = 30;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = 0x4f9be0;
scene.fog = new THREE.Fog(0x4f9be0, 320, 760);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1200);

const random = createRandom(seed);
const city = buildCity(random);
const { lampHeads, ferrisSpin } = buildWorld(scene, city);
const sky = createSky(scene);

const player = new Player(createPlayerMesh(), -106, 120);
scene.add(player.mesh);

const traffic = createTraffic(city, scene, random, 20);
const parkedCars = [];
for (const [x, z, heading, type] of [[-90, 120, 0.4, 'sedan'], [80, -70, 1.57, 'taxi'], [160, 80, -1.57, 'pickup'], [-40, 170, 0, 'van'], [120, -160, 3.1, 'sedan']]) {
  const car = createParkedCar(city, scene, random, x, z, heading, type);
  parkedCars.push(car);
}
const peds = createPeds(city, scene, random, 34);
const wanted = new Wanted();
const police = new Police(scene, city, random);
const missions = new MissionManager(scene);
const hud = createHud();
const audio = new AudioEngine();
const cameraRig = new CameraRig(camera, city);
const input = createInput(canvas, cameraRig);

// Refs for the raycaster: every shootable object carries its game object.
function tagShootable(object, ref) {
  object.traverse((node) => { node.userData.ref = ref; });
}
for (const car of traffic) tagShootable(car.mesh, { kind: 'car', car });
for (const car of parkedCars) tagShootable(car.mesh, { kind: 'car', car });
for (const ped of peds) tagShootable(ped.mesh, { kind: 'ped', ped });

const game = {
  scene, camera, renderer, city, random, sky, lampHeads, ferrisSpin,
  player, traffic, parkedCars, peds, police, wanted, missions,
  hud, audio, cameraRig, input,
  timeOfDay: 8,
  elapsed: 0,
  screen: 'title',
  effects: [],
  autosaveTimer: AUTOSAVE_SECONDS,
  caughtTimer: 0,
  titleAngle: 0,
  allCars() {
    return [...this.traffic, ...this.parkedCars, ...this.police.cars];
  },
  enterableCars() {
    return [...this.traffic, ...this.parkedCars];
  },
  spawnMissionCar(x, z, heading, type) {
    const car = createParkedCar(city, scene, random, x, z, heading, type);
    tagShootable(car.mesh, { kind: 'car', car });
    parkedCars.push(car);
    return car;
  },
  save() {
    saveGame(this);
  },
};

// ---- Screens (DOM overlays) ----
function makeScreen(id, html) {
  const div = document.createElement('div');
  div.id = id;
  div.className = 'screen';
  div.innerHTML = html;
  document.body.appendChild(div);
  return div;
}

const titleScreen = makeScreen('screen-title', `
  <h1>NUSA HEAT</h1>
  <p class="tagline">Teluk Nusa — kota pesisir, jalanan panas, satu utang yang harus dibayar.</p>
  <p class="story">Raka pulang ke Teluk Nusa dengan kantong kosong. Dara, yang punya Bengkel Ombak,
  menawarinya delapan pekerjaan: antar, curi, kabur, tagih, kirim kilat, taksi, satu pelarian terakhir,
  dan balapan liar melawan si Jalak.
  Kota ini milik siapa saja yang berani mengambilnya.</p>
  <div class="controls">WASD jalan / nyetir &nbsp;·&nbsp; E masuk &amp; keluar mobil &nbsp;·&nbsp; Klik kiri tembak &nbsp;·&nbsp; Shift lari / NOS<br>
  Spasi rem tangan &nbsp;·&nbsp; C perbaiki &nbsp;·&nbsp; V cat baru (di bengkel) &nbsp;·&nbsp; R ganti radio &nbsp;·&nbsp; M bisu &nbsp;·&nbsp; P jeda</div>
  <div class="buttons">
    <button id="btn-new">MULAI BARU</button>
    <button id="btn-continue">LANJUTKAN</button>
  </div>
  <p class="save-note" id="save-note"></p>
`);
const pauseScreen = makeScreen('screen-pause', `
  <h2>JEDA</h2>
  <div class="buttons">
    <button id="btn-resume">LANJUT MAIN</button>
    <button id="btn-save">SIMPAN</button>
    <button id="btn-restart">MULAI ULANG</button>
  </div>
`);
const bustedScreen = makeScreen('screen-busted', `
  <h2>TERTANGKAP</h2>
  <p>Polisi menangkapmu di jalan. Mereka mengambil $200 sebagai "denda".</p>
  <div class="buttons"><button id="btn-busted">BANGUN DI BENGKEL</button></div>
`);
const wastedScreen = makeScreen('screen-wasted', `
  <h2>PINGSAN</h2>
  <p>Kamu tidak sadarkan diri. Seseorang membawamu ke bengkel — dan dompetmu lebih ringan $200.</p>
  <div class="buttons"><button id="btn-wasted">BANGUN DI BENGKEL</button></div>
`);
const endScreen = makeScreen('screen-end', `
  <h2>TAMAT</h2>
  <p>Utang lunas. Yacht menunggu di dermaga, dan Teluk Nusa milikmu sekarang.<br>
  Kota ini tetap terbuka — jelajahi sesukamu.</p>
  <div class="buttons"><button id="btn-end">LANJUT JELAJAH</button></div>
`);

function showScreen(name) {
  for (const [key, el] of [['title', titleScreen], ['paused', pauseScreen], ['busted', bustedScreen], ['wasted', wastedScreen], ['end', endScreen]]) {
    el.style.display = key === name ? 'flex' : 'none';
  }
  hud.root.style.display = name === 'play' ? 'block' : 'none';
}

function startNew() {
  audio.ensure();
  player.x = -106;
  player.z = 120;
  player.heading = 0;
  player.health = PLAYER_TUNING.maxHealth;
  player.money = 0;
  player.ammo = PLAYER_TUNING.pistolAmmo;
  if (player.inCar) player.exitCar();
  wanted.clear();
  missions.completed = 0;
  missions.active = null;
  missions.state = 'idle';
  game.timeOfDay = 8;
  game.screen = 'play';
  showScreen('play');
}

function continueGame() {
  const data = loadGame();
  if (!data) { startNew(); return; }
  audio.ensure();
  player.money = data.money;
  player.ammo = data.ammo ?? PLAYER_TUNING.pistolAmmo;
  player.health = data.health;
  player.x = data.x;
  player.z = data.z;
  player.heading = data.heading || 0;
  player.syncMesh();
  missions.completed = data.missionsDone;
  missions.state = data.missionsDone >= MISSION_DEFS.length ? 'allDone' : 'idle';
  game.timeOfDay = data.timeOfDay ?? 8;
  game.audio.stationIndex = data.station ?? 0;
  wanted.clear();
  game.screen = 'play';
  showScreen('play');
}

function respawn() {
  player.money = Math.max(0, player.money - 200);
  player.health = PLAYER_TUNING.maxHealth;
  if (player.inCar) player.exitCar();
  player.x = -106;
  player.z = 120;
  player.heading = 0;
  player.syncMesh();
  // The garage forecourt can hold a parked car (the job's Kancil waits at
  // (-120, 134)): shove any car sitting on the respawn point aside, so the
  // player does not wake up standing on a roof. If a car is exactly on the
  // point there is no push direction, so shove it east instead.
  for (const car of game.allCars()) {
    const dx = car.x - player.x;
    const dz = car.z - player.z;
    const d = Math.hypot(dx, dz);
    if (d < 5) {
      const push = 6 - d;
      const nx = d < 0.5 ? 1 : dx / d;
      const nz = d < 0.5 ? 0 : dz / d;
      car.x += nx * push;
      car.z += nz * push;
      car.syncMesh();
    }
  }
  wanted.clear();
  game.screen = 'play';
  showScreen('play');
}

// Garage services: repair and repaint, only at Bengkel Ombak, in a car.
const PAINTS = [0xd83a2e, 0x2e6fd8, 0xe8c33c, 0x3fae7a, 0xe8e4da, 0x22242a, 0x8a5fc7, 0xd86a2e, 0xff69b4, 0x00e5cc];
function nearGarageCar() {
  if (!player.inCar || !player.car) return false;
  return Math.hypot(player.car.x + 120, player.car.z - 120) < 20;
}
function repaintCar(car) {
  const bodyMat = car.mesh.userData.bodyMat;
  if (!bodyMat) return;
  car.paintIndex = ((car.paintIndex ?? 0) + 1) % PAINTS.length;
  bodyMat.color.setHex(PAINTS[car.paintIndex]);
}

document.getElementById('btn-new').addEventListener('click', startNew);
document.getElementById('btn-continue').addEventListener('click', continueGame);
document.getElementById('btn-resume').addEventListener('click', () => { game.screen = 'play'; showScreen('play'); });
document.getElementById('btn-save').addEventListener('click', () => { game.save(); document.getElementById('btn-save').textContent = 'TERSIMPAN ✓'; setTimeout(() => { document.getElementById('btn-save').textContent = 'SIMPAN'; }, 1200); });
document.getElementById('btn-restart').addEventListener('click', startNew);
document.getElementById('btn-busted').addEventListener('click', respawn);
document.getElementById('btn-wasted').addEventListener('click', respawn);
document.getElementById('btn-end').addEventListener('click', () => { game.screen = 'play'; showScreen('play'); });
document.getElementById('save-note').textContent = hasSave() ? 'Ada simpanan terakhir — LANJUTKAN untuk memakai uang dan misimu.' : 'Belum ada simpanan di browser ini.';
document.getElementById('btn-continue').style.display = hasSave() ? 'inline-block' : 'none';

// ---- Crime and combat ----
function enterNearestCar() {
  const car = player.nearestEnterableCar(game.enterableCars());
  if (!car) return;
  if (car.driver === 'traffic') {
    // The driver runs off screaming; stealing a manned car is always seen.
    wanted.add(WANTED.stealCar, 'steal');
    const flee = new Ped(createPedMesh(random), car.x + 2, car.z + 2);
    flee.fleeing = 5;
    flee.fleeX = car.x + 30;
    flee.fleeZ = car.z - 30;
    scene.add(flee.mesh);
    tagShootable(flee.mesh, { kind: 'ped', ped: flee });
    peds.push(flee);
  } else if (missions.active && missions.active.targetCar === car) {
    // The job's car: no heat for doing the job.
  } else if (car.driver === null) {
    // A parked car: only a crime if the police are close enough to see it.
    const policeNear = police.cars.some((c) => Math.hypot(c.x - player.x, c.z - player.z) < 80);
    if (policeNear) wanted.add(WANTED.stealCar, 'steal');
  }
  player.enterCar(car);
  audio.playHorn();
}

function shoot() {
  if (player.inCar || player.ammo <= 0) return;
  player.ammo -= 1;
  audio.playGunshot();
  const targets = [];
  for (const ped of peds) if (ped.alive) targets.push(ped.mesh);
  for (const car of game.allCars()) targets.push(car.mesh);
  const hit = shootAt(scene, camera, targets, PLAYER_TUNING.pistolRange);
  const muzzle = camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1.2));
  game.effects.push(makeMuzzleFlash(scene, muzzle));
  if (!hit || !hit.ref) return;
  game.effects.push(makeHitSpark(scene, hit.point));
  const ref = hit.ref;
  if (ref.kind === 'ped') {
    ref.ped.alive = false;
    ref.ped.down = true;
    ref.ped.mesh.rotation.x = Math.PI / 2;
    ref.ped.mesh.position.y = 0.3;
    wanted.add(WANTED.hitPed, 'shoot');
    scarePeds(peds, player.x, player.z, 60);
  } else if (ref.kind === 'car') {
    const car = ref.car;
    car.health -= PLAYER_TUNING.pistolDamage;
    if (car.driver === 'police') {
      wanted.add(WANTED.hitPolice, 'shoot');
      if (car.health <= 0) car.driver = 'wrecked';
    } else if (car.health <= 0) {
      car.driver = 'wrecked';
      car.speed = 0;
    }
  }
}

function separateCars(dt) {
  if (!player.inCar || !player.car) return;
  const mine = player.car;
  for (const other of game.allCars()) {
    if (other === mine) continue;
    const dx = mine.x - other.x;
    const dz = mine.z - other.z;
    const d = Math.hypot(dx, dz);
    if (d < 3.6 && d > 0.01) {
      const push = (3.6 - d) * 0.5;
      mine.x += (dx / d) * push;
      mine.z += (dz / d) * push;
      mine.speed *= 0.75;
      if (other.driver === 'traffic') other.speed *= 0.7;
    }
  }
  const fixed = resolveCollisions(city, mine.x, mine.z, 2.4);
  mine.x = fixed.x;
  mine.z = fixed.z;
}

// ---- The fixed step ----
function step() {
  const dt = STEP;
  game.elapsed += dt;
  game.timeOfDay += dt * (24 / DAY_LENGTH_SECONDS);
  if (game.timeOfDay >= 24) game.timeOfDay -= 24;
  // The ferris wheel on the beach turns slowly, all day.
  if (game.ferrisSpin) game.ferrisSpin.rotation.z = game.elapsed * 0.05;

  if (game.screen === 'title') {
    game.titleAngle += dt * 0.05;
    updateTraffic(city, traffic, dt, random);
    updatePeds(city, peds, dt);
    camera.position.set(Math.cos(game.titleAngle) * 190, 90, Math.sin(game.titleAngle) * 190);
    camera.lookAt(0, 0, 0);
    updateSky(sky, scene, game.timeOfDay, lampHeads);
    return;
  }
  if (game.screen !== 'play') return;

  const actions = input.takeActions();
  const move = input.moveVector();

  if (actions & ACTION_PAUSE) {
    game.screen = 'paused';
    showScreen('paused');
    game.save();
    return;
  }
  if (actions & ACTION_RADIO) audio.nextStation();
  if (actions & ACTION_MUTE) audio.toggleMute();
  if (actions & ACTION_HORN && player.inCar) audio.playHorn();

  // Driving or walking.
  if (player.inCar && player.car) {
    const throttle = move.forward;
    const brake = input.held.space ? 1 : (move.forward < 0 ? 1 : 0);
    const steer = -move.strafe;
    // Shift is NOS while driving (on foot it is run): a burst with a sound
    // the first frame it kicks in.
    const nosWas = player.car.nosActive;
    player.car.drive(dt, throttle, brake, steer, undefined, input.held.shift ? 1 : 0);
    if (player.car.nosActive && !nosWas) audio.playNos();
    separateCars(dt);
    audio.setEngine(player.car.speed, true);
  } else {
    const fwd = cameraRig.forward();
    const right = cameraRig.right();
    const mx = fwd.x * move.forward + right.x * move.strafe;
    const mz = fwd.z * move.forward + right.z * move.strafe;
    player.walk(dt, mx, mz, input.held.shift, city);
    audio.setEngine(0, false);
    if (actions & ACTION_SHOOT) shoot();
  }
  if (actions & ACTION_ENTER_CAR) {
    if (player.inCar) player.exitCar();
    else enterNearestCar();
  }
  // Garage services: C repairs ($100), V repaints ($50) — only at the garage.
  if (actions & ACTION_REPAIR && player.inCar && player.car) {
    if (!nearGarageCar()) missions.say('Perbaikan hanya di Bengkel Ombak.');
    else if (player.car.health >= 100) missions.say('Mobil sudah mulus, tidak perlu diperbaiki.');
    else if (player.money < 100) missions.say('Uang tidak cukup untuk perbaikan ($100).');
    else {
      player.money -= 100;
      player.car.health = 100;
      missions.say('Mobil diperbaiki -$100.');
      audio.playPickup();
    }
  }
  if (actions & ACTION_PAINT && player.inCar && player.car) {
    if (!nearGarageCar()) missions.say('Cat baru hanya di Bengkel Ombak.');
    else if (player.money < 50) missions.say('Uang tidak cukup untuk cat baru ($50).');
    else {
      player.money -= 50;
      repaintCar(player.car);
      missions.say('Cat baru -$50.');
      audio.playPickup();
    }
  }
  if (actions & ACTION_CONFIRM && missions.canStart() && missions.nearGarage(player)) {
    missions.startNext(game);
  }

  updateTraffic(city, traffic, dt, random);
  updatePeds(city, peds, dt);
  const policeNear = police.update(dt, player, wanted, game.elapsed);
  wanted.update(dt, policeNear);
  audio.setSiren(wanted.stars > 0, wanted.stars);
  audio.musicStep();

  // Busted: a police car sits on the player on foot for two seconds.
  if (!player.inCar && wanted.stars >= 1) {
    const caught = police.cars.some((c) => Math.hypot(c.x - player.x, c.z - player.z) < 2.4);
    game.caughtTimer = caught ? game.caughtTimer + dt : 0;
    if (game.caughtTimer > 2) {
      game.caughtTimer = 0;
      game.screen = 'busted';
      showScreen('busted');
      return;
    }
  } else {
    game.caughtTimer = 0;
  }

  if (player.health <= 0) {
    game.screen = 'wasted';
    showScreen('wasted');
    return;
  }

  const missionEvent = missions.update(dt, game);
  if (missionEvent === 'complete' && missions.state === 'allDone') {
    game.screen = 'end';
    showScreen('end');
  }
  missions.updateVisuals(game.elapsed);

  // Camera follows the player (or the car).
  const target = player.inCar && player.car ? { x: player.car.x, z: player.car.z } : { x: player.x, z: player.z };
  cameraRig.update(dt, target, player.inCar, player.car ? player.car.heading : 0, player.car ? player.car.speed : 0);
  updateSky(sky, scene, game.timeOfDay, lampHeads);
  updateEffects(scene, game.effects, dt);
  updateHud(hud, game);

  game.autosaveTimer -= dt;
  if (game.autosaveTimer <= 0) {
    game.autosaveTimer = AUTOSAVE_SECONDS;
    game.save();
  }
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---- Debug handle for playtests ----
window.__game = {
  game,
  state() {
    return {
      screen: game.screen,
      money: game.player.money,
      health: game.player.health,
      ammo: game.player.ammo,
      inCar: game.player.inCar,
      playerX: Math.round(game.player.inCar && game.player.car ? game.player.car.x : game.player.x),
      playerZ: Math.round(game.player.inCar && game.player.car ? game.player.car.z : game.player.z),
      carSpeed: game.player.car ? Math.round(game.player.car.speed * 3.6) : 0,
      nos: game.player.car ? Math.round(game.player.car.nos * 100) : null,
      nosActive: game.player.car ? game.player.car.nosActive : false,
      carHealth: game.player.car ? Math.round(game.player.car.health) : null,
      wanted: game.wanted.stars,
      mission: game.missions.active ? game.missions.active.def.title : null,
      missionObjective: game.missions.objectiveLabel,
      missionsDone: game.missions.completed,
      traffic: game.traffic.filter((c) => c.driver === 'traffic').length,
      pedsAlive: game.peds.filter((p) => p.alive).length,
      police: game.police.cars.length,
      heli: game.police.heli.visible,
      timeOfDay: +game.timeOfDay.toFixed(2),
      elapsed: +game.elapsed.toFixed(2),
    };
  },
  teleport(x, z) {
    if (game.player.inCar) game.player.exitCar();
    game.player.x = x;
    game.player.z = z;
    game.player.syncMesh();
  },
  setWanted(n) {
    game.wanted.stars = n;
    game.wanted.decayTimer = WANTED.decaySeconds;
  },
  startMission() {
    return game.missions.startNext(game);
  },
  pressEnter() {
    enterNearestCar();
  },
};

function runShot(name) {
  const scene = stageShot(name, game);
  let painted = 0;
  function paint() {
    renderer.render(scene.scene, scene.camera);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function frame(now) {
  requestAnimationFrame(frame);
  if (shot) return;
  const dt = Math.min((now - last) / 1000, MAX_FRAME);
  last = now;
  accumulator += dt;
  let guard = 0;
  while (accumulator >= STEP && guard < 8) {
    step();
    accumulator -= STEP;
    guard += 1;
  }
  // One render per frame, whatever the screen: the overlays are DOM.
  renderer.render(scene, camera);
}

let accumulator = 0;
let last = performance.now();
showScreen('title');
if (shot) {
  game.screen = 'play';
  showScreen('play');
  runShot(shot);
} else {
  requestAnimationFrame(frame);
}
