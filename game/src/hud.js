// The HUD: money and health, wanted stars, the clock, the mission objective,
// speed while driving, and a live minimap drawn on a 2D canvas — roads, the
// player arrow, traffic, police and the mission marker. All of it is DOM and
// canvas, so it stays crisp over the 3D view.

import { CITY } from './config.js';

function starRow(stars) {
  let out = '';
  for (let i = 0; i < 5; i += 1) out += i < stars ? '★' : '☆';
  return out;
}

export function createHud() {
  const root = document.createElement('div');
  root.id = 'hud';
  root.innerHTML = `
    <div id="hud-top-left">
      <div id="hud-money">$0</div>
      <div id="hud-health"><div id="hud-health-fill"></div></div>
      <div id="hud-hint">WASD jalan · E masuk mobil · Klik tembak · P jeda · R radio · M bisu</div>
    </div>
    <div id="hud-top-center">
      <div id="hud-stars">☆☆☆☆☆</div>
      <div id="hud-wanted-label"></div>
    </div>
    <div id="hud-top-right">
      <div id="hud-clock">08:00</div>
      <div id="hud-radio">RADIO NUSA</div>
    </div>
    <div id="hud-objective"><span id="hud-objective-text"></span><span id="hud-objective-dist"></span></div>
    <div id="hud-speed"><span id="hud-speed-num">0</span><span id="hud-speed-unit">km/h</span></div>
    <div id="hud-toast"></div>
    <div id="hud-crosshair">+</div>
    <canvas id="hud-minimap" width="220" height="220"></canvas>
    <div id="hud-damage"></div>
  `;
  document.body.appendChild(root);
  return {
    root,
    money: root.querySelector('#hud-money'),
    healthFill: root.querySelector('#hud-health-fill'),
    stars: root.querySelector('#hud-stars'),
    wantedLabel: root.querySelector('#hud-wanted-label'),
    clock: root.querySelector('#hud-clock'),
    radio: root.querySelector('#hud-radio'),
    objectiveText: root.querySelector('#hud-objective-text'),
    objectiveDist: root.querySelector('#hud-objective-dist'),
    speed: root.querySelector('#hud-speed'),
    speedNum: root.querySelector('#hud-speed-num'),
    toast: root.querySelector('#hud-toast'),
    crosshair: root.querySelector('#hud-crosshair'),
    minimap: root.querySelector('#hud-minimap'),
    damage: root.querySelector('#hud-damage'),
  };
}

function worldToMap(x, z, size) {
  const half = CITY.half;
  return {
    x: ((x + half) / (half * 2)) * size,
    y: ((z + half) / (half * 2)) * size,
  };
}

export function drawMinimap(hud, game) {
  const canvas = hud.minimap;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);
  // Sea and land.
  ctx.fillStyle = '#14333d';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#22301f';
  const land = worldToMap(-CITY.half, -CITY.half, size);
  ctx.fillRect(land.x, land.y, size * 0.96, ((CITY.beachZ + CITY.half) / (CITY.half * 2)) * size);
  ctx.fillStyle = '#c9b078';
  const beach = worldToMap(-CITY.half, CITY.beachZ, size);
  ctx.fillRect(beach.x, beach.y, size, size - beach.y);
  // Roads.
  ctx.strokeStyle = '#5a5f6a';
  ctx.lineWidth = 5;
  for (const rx of game.city.roadsX) {
    const a = worldToMap(rx, -CITY.half, size);
    const b = worldToMap(rx, CITY.half, size);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const rz of game.city.roadsZ) {
    const a = worldToMap(-CITY.half, rz, size);
    const b = worldToMap(CITY.half, rz, size);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Mission marker.
  const marker = game.missions.markerPos;
  const m = worldToMap(marker.x, marker.z, size);
  ctx.fillStyle = '#ffd23c';
  ctx.beginPath();
  ctx.arc(m.x, m.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Traffic as pale dots, police as blue dots.
  ctx.fillStyle = '#e8e4da';
  for (const car of game.traffic) {
    const p = worldToMap(car.x, car.z, size);
    ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
  }
  ctx.fillStyle = '#3a6fd8';
  for (const car of game.police.cars) {
    const p = worldToMap(car.x, car.z, size);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // The helicopter, when it is up: a cyan ring so the player can see the
  // eye in the sky even though it flies above the camera's view.
  if (game.police.heli.visible) {
    const h = worldToMap(game.police.heli.position.x, game.police.heli.position.z, size);
    ctx.strokeStyle = '#7ee2e2';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(h.x, h.y, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#7ee2e2';
    ctx.beginPath();
    ctx.arc(h.x, h.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // The player: a white arrow pointing where they face.
  const px = game.player.inCar && game.player.car ? game.player.car.x : game.player.x;
  const pz = game.player.inCar && game.player.car ? game.player.car.z : game.player.z;
  const heading = game.player.inCar && game.player.car ? game.player.car.heading : game.player.heading;
  const p = worldToMap(px, pz, size);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(-heading);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-7, -6);
  ctx.lineTo(-7, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Border.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);
  // North marker: the map's top edge is the city's north.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', size / 2, 16);
}

export function updateHud(hud, game) {
  const { player, wanted, missions } = game;
  hud.money.textContent = `$${player.money.toLocaleString('en-US')}`;
  hud.healthFill.style.width = `${Math.max(0, player.health)}%`;
  hud.healthFill.style.background = player.health > 50 ? '#3fae7a' : player.health > 25 ? '#f2a93b' : '#e05a4e';
  hud.stars.textContent = starRow(wanted.stars);
  hud.stars.style.color = wanted.stars > 0 ? '#ffd23c' : 'rgba(255,255,255,0.45)';
  hud.wantedLabel.textContent = wanted.stars > 0 ? 'DICARI POLISI' : '';
  const hours = Math.floor(game.timeOfDay);
  const minutes = Math.floor((game.timeOfDay - hours) * 60);
  hud.clock.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  hud.radio.textContent = game.audio.muted ? 'BISU' : game.audio.stationName();
  const objective = missions.active ? missions.objectiveLabel : (missions.state === 'allDone' ? 'Semua misi selesai — jelajahi kota!' : 'Ke Bengkel Ombak (tanda kuning) untuk misi');
  hud.objectiveText.textContent = objective;
  const marker = missions.markerPos;
  const px = player.inCar && player.car ? player.car.x : player.x;
  const pz = player.inCar && player.car ? player.car.z : player.z;
  const dist = Math.hypot(marker.x - px, marker.z - pz);
  hud.objectiveDist.textContent = missions.active ? ` · ${Math.round(dist)}m` : '';
  if (player.inCar && player.car) {
    hud.speed.style.display = 'block';
    hud.speedNum.textContent = String(Math.round(Math.abs(player.car.speed) * 3.6));
  } else {
    hud.speed.style.display = 'none';
  }
  hud.crosshair.style.display = !player.inCar && game.screen === 'play' ? 'block' : 'none';
  hud.damage.style.opacity = player.hurtFlash > 0 ? String(Math.min(0.55, player.hurtFlash)) : '0';
  if (player.hurtFlash > 0) player.hurtFlash -= 0.016;
  if (missions.messageTimer > 0) {
    hud.toast.textContent = missions.message;
    hud.toast.style.opacity = '1';
  } else {
    hud.toast.style.opacity = '0';
  }
  drawMinimap(hud, game);
}
