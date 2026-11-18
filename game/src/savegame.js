// Save and load: money, missions, health, position and time of day, kept in
// localStorage so a visit can pick up where it left off. Nothing leaves the
// browser.

import { SAVE_KEY } from './config.js';

export function saveGame(game) {
  try {
    const data = {
      v: 1,
      money: game.player.money,
      ammo: game.player.ammo,
      missionsDone: game.missions.completed,
      health: game.player.health,
      x: game.player.x,
      z: game.player.z,
      heading: game.player.heading,
      timeOfDay: game.timeOfDay,
      station: game.audio.stationIndex,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.money !== 'number' || typeof data.missionsDone !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}
