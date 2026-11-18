// The HUD: money and health, wanted stars, the clock, the mission objective,
// speed while driving, and a live minimap drawn on a 2D canvas — roads, the
// player arrow, traffic, police and the mission marker. All of it is DOM and
// canvas, so it stays crisp over the 3D view.

import { CITY } from './config.js';
import { MISSION_DEFS } from './missions.js';

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
      <div id="hud-mission">
        <div id="hud-mission-title">MISI 1/8</div>
        <div id="hud-mission-objective">Ke Bengkel Ombak untuk misi</div>
        <div id="hud-mission-giver">DARA · BENGKEL OMBAK</div>
      </div>
      <div id="hud-health"><div id="hud-health-fill"></div></div>
      <div id="hud-hint">WASD jalan · E mobil · Klik tembak · Shift NOS · C perbaiki · V cat</div>
    </div>
    <div id="hud-top-right">
      <div id="hud-money">$0</div>
      <div id="hud-stars">☆☆☆☆☆</div>
      <div id="hud-wanted-label"></div>
      <div id="hud-clock">08:00</div>
      <div id="hud-radio">RADIO NUSA</div>
    </div>
    <div id="hud-objective"><span id="hud-objective-text"></span><span id="hud-objective-dist"></span></div>
    <div id="hud-speed"><span id="hud-speed-num">0</span><span id="hud-speed-unit">KM/H</span><div id="hud-nos"><div id="hud-nos-fill"></div><span id="hud-nos-label">NOS</span></div></div>
    <div id="hud-toast"></div>
    <div id="hud-dialogue">
      <svg id="hud-dialogue-portrait" viewBox="0 0 64 64" width="52" height="52" aria-hidden="true">
        <circle cx="32" cy="32" r="31" fill="#f2a93b"/>
        <path d="M18 64 Q19 44 32 44 Q45 44 46 64 Z" fill="#c75b4a"/>
        <circle cx="32" cy="27" r="13" fill="#f2c9a0"/>
        <path d="M19 27 Q18 11 32 11 Q46 11 45 27 Q44 17 37 15 Q32 13 27 15 Q20 17 19 27 Z" fill="#2a2118"/>
        <circle cx="27" cy="28" r="1.6" fill="#221a08"/>
        <circle cx="37" cy="28" r="1.6" fill="#221a08"/>
        <path d="M28 35 Q32 38 36 35" stroke="#b06a4a" stroke-width="1.4" fill="none"/>
      </svg>
      <div>
        <div id="hud-dialogue-name">DARA · BENGKEL OMBAK</div>
        <div id="hud-dialogue-text"></div>
      </div>
    </div>
    <div id="hud-crosshair">+</div>
    <canvas id="hud-minimap" width="220" height="220"></canvas>
    <div id="hud-damage"></div>
  `;
  document.body.appendChild(root);
  return {
    root,
    money: root.querySelector('#hud-money'),
    healthFill: root.querySelector('#hud-health-fill'),
    missionTitle: root.querySelector('#hud-mission-title'),
    missionObjective: root.querySelector('#hud-mission-objective'),
    stars: root.querySelector('#hud-stars'),
    wantedLabel: root.querySelector('#hud-wanted-label'),
    clock: root.querySelector('#hud-clock'),
    radio: root.querySelector('#hud-radio'),
    objectiveText: root.querySelector('#hud-objective-text'),
    objectiveDist: root.querySelector('#hud-objective-dist'),
    speed: root.querySelector('#hud-speed'),
    speedNum: root.querySelector('#hud-speed-num'),
    nosFill: root.querySelector('#hud-nos-fill'),
    nosLabel: root.querySelector('#hud-nos-label'),
    toast: root.querySelector('#hud-toast'),
    dialogue: root.querySelector('#hud-dialogue'),
    dialogueName: root.querySelector('#hud-dialogue-name'),
    dialogueText: root.querySelector('#hud-dialogue-text'),
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
  // District labels, so the minimap reads as a city instead of a grid.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const [label, lx, lz] of [['PASAR', -40, -40], ['PELABUHAN', 180, 160], ['MALL', 40, -120], ['PANTAI', 0, 210]]) {
    const lp = worldToMap(lx, lz, size);
    ctx.fillText(label, lp.x, lp.y);
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
  // Mission panel (top-left): title + objective + stage, like the
  // leaderboard covers — the player always sees which job and which step.
  if (missions.active) {
    hud.missionTitle.textContent = `MISI ${missions.completed + 1}/${MISSION_DEFS.length} · ${missions.active.def.title.toUpperCase()}`;
    hud.missionObjective.textContent = missions.objectiveLabel;
  } else if (missions.state === 'allDone') {
    hud.missionTitle.textContent = 'SEMUA MISI SELESAI';
    hud.missionObjective.textContent = 'Jelajahi kota — Teluk Nusa milikmu.';
  } else {
    hud.missionTitle.textContent = `MISI ${missions.completed + 1}/${MISSION_DEFS.length} · SIAP`;
    hud.missionObjective.textContent = 'Ke Bengkel Ombak (tanda kuning) untuk misi';
  }
  // Dialogue box: Dara speaks when a mission starts, with her portrait.
  if (missions.dialogue && missions.dialogueTimer > 0) {
    hud.dialogue.style.opacity = '1';
    hud.dialogueName.textContent = `${missions.dialogue.name} · ${missions.dialogue.sub}`;
    hud.dialogueText.textContent = missions.dialogue.text;
  } else {
    hud.dialogue.style.opacity = '0';
  }
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
    // NOS tank: full bar in cyan, flashing while the boost is on.
    hud.nosFill.style.width = `${Math.round(player.car.nos * 100)}%`;
    hud.nosFill.style.background = player.car.nosActive ? '#ff5a4e' : '#7ee2e2';
    hud.nosLabel.style.color = player.car.nosActive ? '#ff5a4e' : '#7ee2e2';
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
