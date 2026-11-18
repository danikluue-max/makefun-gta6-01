// The story: Raka owes Dara, who runs Bengkel Ombak, a garage on the edge of the
// market district. Eight jobs pay the debt off — a delivery, a stolen car, a police
// raid, a round of collections, a timed courier run, a stolen taxi, one last
// getaway to the yacht at the port, and a street race against the rival Jalak.
// Missions unlock in order; each one is a small state machine over objectives.

import * as THREE from 'three';
import { MISSION_REWARDS } from './config.js';

const GARAGE = { x: -120, z: 120 };

export const MISSION_DEFS = [
  {
    id: 1,
    title: 'Nasi Bungkus',
    giver: 'Dara',
    brief: 'Ambil nasi bungkus di Pasar Nusa, antar ke Pelabuhan. Jangan sampai dingin.',
    line: 'Raka, nasi bungkusnya jangan sampai dingin. Pelabuhan, cepat!',
    objectives: [
      { type: 'goto', label: 'Ambil pesanan di Pasar Nusa', x: -40, z: -40, radius: 7 },
      { type: 'goto', label: 'Antar ke Pelabuhan', x: 180, z: 160, radius: 7, timeLimit: 120 },
    ],
  },
  {
    id: 2,
    title: 'Mobil Pesanan',
    giver: 'Dara',
    brief: 'Ada Kancil GT merah parkir di Mall Nusa. Bawa ke bengkel. Jangan tanya punya siapa.',
    line: 'Kancil GT merah di Mall Nusa. Bawa ke bengkel. Jangan tanya punya siapa.',
    objectives: [
      // The Kancil waits at the kerb south of the mall (z = -87, on the
      // sidewalk at the edge of road z = -80). It used to spawn at the mall's
      // own centre (40, -120), inside the mall's building collider, so the
      // physics push shoved it out to x = 59 the moment the player entered it.
      { type: 'steal', label: 'Curi Kancil GT di Mall Nusa', x: 40, z: -87, radius: 6 },
      // The return point is the forecourt in front of the garage (z = 134),
      // not the garage building's centre: the building's collider fills
      // x -131..-109, z 112..128, so a car could never get within 8 m of
      // (-120, 120) — the closest it can come is exactly 8 m, and the check
      // is a strict <.
      { type: 'goto', label: 'Bawa mobilnya ke Bengkel Ombak', x: -120, z: 134, radius: 8 },
    ],
  },
  {
    id: 3,
    title: 'Razia',
    giver: 'Dara',
    brief: 'Polisi razia besar-besaran. Bertahan 60 detik — atau hilang dari radar mereka.',
    line: 'Polisi razia besar-besaran. Bertahan — atau hilang dari radar mereka.',
    objectives: [
      { type: 'survive', label: 'Bertahan dari razia polisi', seconds: 60 },
    ],
  },
  {
    id: 4,
    title: 'Tagihan Pasar',
    giver: 'Dara',
    brief: 'Empat pedagang di Pasar Nusa belum bayar. Ambil tagihannya, satu per satu.',
    line: 'Empat pedagang belum bayar. Ambil tagihannya, satu per satu.',
    objectives: [
      { type: 'collect', label: 'Kumpulkan tagihan pasar (0/4)', spots: [[-60, -60], [-20, -60], [-60, -20], [-20, -20]], radius: 3.5 },
    ],
  },
  {
    id: 5,
    title: 'Kirim Kilat',
    giver: 'Dara',
    brief: 'Tiga paket, tiga tempat, satu tenggat. Mall, menara, pelabuhan — jangan sampai telat.',
    line: 'Tiga paket, tiga tempat, satu tenggat. Jangan sampai telat!',
    objectives: [
      { type: 'goto', label: 'Antar paket ke Mall Nusa', x: 40, z: -87, radius: 7, timeLimit: 90 },
      { type: 'goto', label: 'Antar paket ke Menara Nusa', x: 40, z: 40, radius: 7, timeLimit: 90 },
      { type: 'goto', label: 'Antar paket ke Pelabuhan', x: 180, z: 160, radius: 7, timeLimit: 90 },
    ],
  },
  {
    id: 6,
    title: 'Taksi Terakhir',
    giver: 'Dara',
    brief: 'Seorang sopir taksi berutang padaku. Bawa taksinya ke bengkel — dia boleh jalan kaki.',
    line: 'Sopir taksi itu berutang padaku. Bawa taksinya ke bengkel.',
    objectives: [
      { type: 'stealTaxi', label: 'Curi taksi di boulevard', x: 0, z: 80, radius: 6 },
      { type: 'goto', label: 'Bawa taksi ke Bengkel Ombak', x: -120, z: 134, radius: 8 },
    ],
  },
  {
    id: 7,
    title: 'Pelarian Terakhir',
    giver: 'Dara',
    brief: 'Ini yang terakhir. Lewati tiga pos, sampai ke yacht di dermaga. Polisi tidak akan diam.',
    line: 'Ini yang terakhir, Raka. Lewati tiga pos, sampai ke yacht. Polisi tidak akan diam.',
    objectives: [
      { type: 'goto', label: 'Pos 1: persimpangan boulevard', x: 0, z: 160, radius: 9 },
      { type: 'goto', label: 'Pos 2: tikungan barat', x: -160, z: 0, radius: 9 },
      { type: 'goto', label: 'Pos 3: jalan utara', x: 0, z: -160, radius: 9 },
      { type: 'goto', label: 'Sampai ke yacht di dermaga', x: 196, z: 196, radius: 9 },
    ],
  },
  {
    id: 8,
    title: 'Balapan Liar',
    giver: 'Dara',
    brief: 'Si Jalak menantangmu balapan liar keliling kota. Empat pos, satu tenggat — kalahkan dia di garis finis pelabuhan.',
    line: 'Si Jalak menantangmu balapan liar. Kalahkan dia, dan utangmu lunas... hampir.',
    objectives: [
      { type: 'goto', label: 'Pos 1: persimpangan boulevard', x: 0, z: 160, radius: 9, timeLimit: 75 },
      { type: 'goto', label: 'Pos 2: tikungan barat', x: -160, z: 0, radius: 9, timeLimit: 75 },
      { type: 'goto', label: 'Pos 3: jalan utara', x: 0, z: -160, radius: 9, timeLimit: 75 },
      { type: 'goto', label: 'Finis: gerbang pelabuhan', x: 180, z: 160, radius: 9, timeLimit: 90 },
    ],
  },
];

function makeBeacon() {
  const group = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23c, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 30;
  group.add(beam);
  const marker = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.85),
    new THREE.MeshBasicMaterial({ color: 0xffd23c }),
  );
  marker.position.y = 6;
  group.add(marker);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 3, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23c, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  group.add(ring);
  group.userData.marker = marker;
  group.visible = false;
  return group;
}

function makeCashBag() {
  const group = new THREE.Group();
  const bag = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.8, 0.7),
    new THREE.MeshLambertMaterial({ color: 0x2f8f4e }),
  );
  bag.position.y = 0.4;
  bag.castShadow = true;
  group.add(bag);
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(1.14, 0.2, 0.74),
    new THREE.MeshLambertMaterial({ color: 0xffd23c }),
  );
  band.position.y = 0.55;
  group.add(band);
  return group;
}

export class MissionManager {
  constructor(scene) {
    this.scene = scene;
    this.beacon = makeBeacon();
    scene.add(this.beacon);
    this.cashBags = [];
    this.current = -1; // index into MISSION_DEFS, -1 = none started yet
    this.completed = 0; // how many missions are done
    this.active = null; // { def, objectiveIndex, timer, collected, targetCar }
    this.state = 'idle'; // idle | active | allDone
    this.message = '';
    this.messageTimer = 0;
    // Dialogue box: when a mission starts, Dara speaks (name + line) in a
    // box with her portrait — the HUD shows it for a few seconds.
    this.dialogue = null; // { name, sub, text }
    this.dialogueTimer = 0;
  }

  get currentDef() {
    return this.active ? this.active.def : null;
  }

  get objective() {
    if (!this.active) return null;
    return this.active.def.objectives[this.active.objectiveIndex] ?? null;
  }

  get objectiveLabel() {
    const objective = this.objective;
    if (!objective) return '';
    if (objective.type === 'collect') {
      return `Kumpulkan tagihan pasar (${this.active.collected}/${objective.spots.length})`;
    }
    // Timed jobs show the seconds left as m:ss, so the player can feel the
    // clock. (It used to print "119d" — seconds with a stray "d" suffix,
    // which read as 119 days on the HUD.)
    if (objective.timeLimit !== undefined) {
      const left = Math.max(0, Math.ceil(objective.timeLimit - this.active.timer));
      const m = Math.floor(left / 60);
      const s = String(left % 60).padStart(2, '0');
      return `${objective.label} · ${m}:${s}`;
    }
    return objective.label;
  }

  get markerPos() {
    if (!this.active) return GARAGE;
    const objective = this.objective;
    if (!objective) return GARAGE;
    if (objective.type === 'collect') {
      const spot = objective.spots[this.active.collected];
      return spot ? { x: spot[0], z: spot[1] } : GARAGE;
    }
    return { x: objective.x, z: objective.z };
  }

  nearGarage(player) {
    return Math.hypot(player.x - GARAGE.x, player.z - GARAGE.z) < 16;
  }

  canStart() {
    return this.state === 'idle' && this.completed < MISSION_DEFS.length;
  }

  startNext(game) {
    const def = MISSION_DEFS[this.completed];
    if (!def) return false;
    this.current = this.completed;
    this.active = { def, objectiveIndex: 0, timer: 0, collected: 0, targetCar: null };
    this.state = 'active';
    this.say(`${def.title} — ${def.brief}`);
    this.dialogue = { name: 'DARA', sub: 'BENGKEL OMBAK', text: def.line ?? def.brief };
    this.dialogueTimer = 6;
    if (def.id === 2) {
      // Park the red Kancil GT at the mall for the player to steal.
      this.active.targetCar = game.spawnMissionCar(40, -87, 0, 'sport');
    }
    if (def.id === 6) {
      // Park a yellow taxi on the boulevard for the player to take.
      this.active.targetCar = game.spawnMissionCar(0, 80, 0, 'taxi');
    }
    if (def.id === 3) {
      game.wanted.add(3, 'razia');
    }
    this.refreshBeacon(game);
    return true;
  }

  say(text) {
    this.message = text;
    this.messageTimer = 5;
  }

  refreshBeacon(game) {
    const pos = this.markerPos;
    this.beacon.position.set(pos.x, 0, pos.z);
    this.beacon.visible = this.state === 'active' || this.state === 'idle';
    // Cash bags for the collect mission.
    for (const bag of this.cashBags) this.scene.remove(bag);
    this.cashBags = [];
    if (this.active && this.objective && this.objective.type === 'collect') {
      for (const [x, z] of this.objective.spots) {
        const bag = makeCashBag();
        bag.position.set(x, 0, z);
        this.scene.add(bag);
        this.cashBags.push(bag);
      }
    }
  }

  // Returns 'objective' | 'complete' | 'failed' | null.
  update(dt, game) {
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (this.dialogueTimer > 0) this.dialogueTimer -= dt;
    if (this.state !== 'active' || !this.active) return null;
    const { player, wanted } = game;
    const objective = this.objective;
    if (!objective) return null;
    const px = player.inCar && player.car ? player.car.x : player.x;
    const pz = player.inCar && player.car ? player.car.z : player.z;

    if (objective.type === 'goto') {
      const d = Math.hypot(px - objective.x, pz - objective.z);
      if (objective.timeLimit !== undefined) {
        this.active.timer += dt;
        if (this.active.timer > objective.timeLimit) {
          this.fail(game, 'Terlambat. Misi gagal — kembali ke bengkel.');
          return 'failed';
        }
      }
      if (d < objective.radius) return this.advance(game);
    } else if (objective.type === 'steal') {
      if (player.inCar && player.car === this.active.targetCar) return this.advance(game);
    } else if (objective.type === 'stealTaxi') {
      // Same trigger as a steal: get in the job's taxi and the job moves on.
      if (player.inCar && player.car === this.active.targetCar) return this.advance(game);
    } else if (objective.type === 'survive') {
      this.active.timer += dt;
      if (wanted.stars === 0 || this.active.timer >= objective.seconds) {
        return this.complete(game);
      }
    } else if (objective.type === 'collect') {
      const spot = objective.spots[this.active.collected];
      if (spot && Math.hypot(px - spot[0], pz - spot[1]) < objective.radius) {
        this.active.collected += 1;
        const bag = this.cashBags[this.active.collected - 1];
        if (bag) {
          this.scene.remove(bag);
          this.cashBags.splice(this.active.collected - 1, 1);
        }
        game.audio.playPickup();
        if (this.active.collected >= objective.spots.length) return this.complete(game);
        this.refreshBeacon(game);
        return 'objective';
      }
    }
    return null;
  }

  advance(game) {
    game.audio.playPickup();
    this.active.objectiveIndex += 1;
    this.active.timer = 0;
    if (this.active.objectiveIndex >= this.active.def.objectives.length) return this.complete(game);
    this.say(this.objectiveLabel);
    this.refreshBeacon(game);
    return 'objective';
  }

  complete(game) {
    const reward = MISSION_REWARDS[this.current] ?? 500;
    game.player.money += reward;
    this.completed += 1;
    this.active = null;
    this.state = this.completed >= MISSION_DEFS.length ? 'allDone' : 'idle';
    game.audio.playMissionComplete();
    this.say(this.state === 'allDone'
      ? `Semua misi selesai! Kamu dapat $${reward}. Teluk Nusa milikmu sekarang.`
      : `Misi selesai! +$${reward}. Kembali ke bengkel untuk misi berikutnya.`);
    this.refreshBeacon(game);
    game.save();
    return 'complete';
  }

  fail(game, reason) {
    this.active = null;
    this.state = 'idle';
    this.say(reason);
    this.refreshBeacon(game);
    return 'failed';
  }

  updateVisuals(time) {
    if (this.beacon.visible) {
      this.beacon.userData.marker.position.y = 6 + Math.sin(time * 2.4) * 0.8;
      this.beacon.userData.marker.rotation.y += 0.02;
    }
  }
}
