// Sound, all procedural WebAudio — no audio files. A small synth for effects
// (engine hum, sirens, gunshots, pickups) and three radio stations, each a tiny
// step sequencer with its own scale, tempo and bass line.

const STATIONS = [
  { name: 'RADIO NUSA', tempo: 116, root: 55, scale: [0, 2, 3, 5, 7, 10], wave: 'sawtooth' },
  { name: 'PANTAI FM', tempo: 92, root: 65.41, scale: [0, 2, 4, 7, 9], wave: 'triangle' },
  { name: 'OMBAK 88', tempo: 128, root: 49, scale: [0, 3, 5, 6, 10], wave: 'square' },
];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.stationIndex = 0;
    this.step = 0;
    this.nextStepTime = 0;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenOn = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.16;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.6;
    this.sfxGain.connect(this.master);
    // Engine hum: a low oscillator whose pitch follows the speed.
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 50;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 320;
    this.engineOsc.connect(engineFilter);
    engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
    // Police siren: two alternating tones.
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sine';
    this.sirenOsc.frequency.value = 700;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOsc.start();
  }

  stationName() {
    return STATIONS[this.stationIndex].name;
  }

  nextStation() {
    this.stationIndex = (this.stationIndex + 1) % STATIONS.length;
    this.step = 0;
    // A quick tuning blip so the switch is heard as well as seen.
    if (this.ctx) {
      this.blip(440, 0.06, 'sine', 0.15);
      setTimeout(() => this.blip(660, 0.06, 'sine', 0.15), 60);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  setEngine(speed, inCar) {
    if (!this.ctx) return;
    const target = inCar ? 0.05 + Math.min(0.1, Math.abs(speed) * 0.002) : 0;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    this.engineOsc.frequency.setTargetAtTime(50 + Math.abs(speed) * 3.2, this.ctx.currentTime, 0.1);
  }

  setSiren(on, wanted) {
    if (!this.ctx) return;
    this.sirenOn = on;
    this.sirenGain.gain.setTargetAtTime(on ? 0.05 + wanted * 0.008 : 0, this.ctx.currentTime, 0.2);
    if (on) {
      const t = this.ctx.currentTime;
      this.sirenOsc.frequency.setValueAtTime(700, t);
      this.sirenOsc.frequency.linearRampToValueAtTime(950, t + 0.45);
      this.sirenOsc.frequency.linearRampToValueAtTime(700, t + 0.9);
    }
  }

  blip(freq, duration, type = 'sine', volume = 0.25) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  noiseBurst(duration, volume = 0.4) {
    if (!this.ctx) return;
    const len = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(this.sfxGain);
    src.start();
  }

  playGunshot() {
    this.noiseBurst(0.12, 0.5);
    this.blip(160, 0.08, 'square', 0.2);
  }

  playPickup() {
    this.blip(660, 0.09);
    setTimeout(() => this.blip(880, 0.12), 70);
  }

  playMissionComplete() {
    [523, 659, 784, 1046].forEach((freq, i) => setTimeout(() => this.blip(freq, 0.16, 'triangle', 0.3), i * 110));
  }

  playHorn() {
    this.blip(370, 0.18, 'sawtooth', 0.2);
    this.blip(466, 0.18, 'sawtooth', 0.2);
  }

  // NOS: a rising whoosh — a noise burst through a sweeping filter, plus a
  // high blip, so the boost is heard as well as seen.
  playNos() {
    if (!this.ctx) return;
    const len = Math.floor(this.ctx.sampleRate * 0.5);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(3200, this.ctx.currentTime + 0.45);
    const gain = this.ctx.createGain();
    gain.gain.value = 0.5;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start();
  }

  // One step of the radio sequencer: bass on the beat, a sparse lead, hats.
  musicStep() {
    if (!this.ctx || this.muted) return;
    const station = STATIONS[this.stationIndex];
    const stepDur = 60 / station.tempo / 2;
    const now = this.ctx.currentTime;
    if (now < this.nextStepTime) return;
    this.nextStepTime = now + stepDur;
    const s = this.step % 16;
    this.step += 1;
    const scale = station.scale;
    // Bass: root on beats 0, 4, 8, 12, fifth on 6 and 14.
    if (s % 4 === 0 || s === 6 || s === 14) {
      const degree = s === 6 || s === 14 ? 4 : 0;
      const freq = station.root * Math.pow(2, scale[degree % scale.length] / 12);
      this.note(freq, stepDur * 1.8, 'triangle', 0.5);
    }
    // Lead: a pentatonic wander on some off-beats.
    if (s % 4 === 2 && Math.random() < 0.75) {
      const degree = Math.floor(Math.random() * scale.length);
      const freq = station.root * 4 * Math.pow(2, scale[degree] / 12);
      this.note(freq, stepDur * 0.9, station.wave, 0.14);
    }
    // Hat: short noise every other step.
    if (s % 2 === 1) this.noiseBurst(0.03, 0.05);
  }

  note(freq, duration, type, volume) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }
}
