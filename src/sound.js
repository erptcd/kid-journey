// Âm thanh tổng hợp bằng WebAudio (không cần file): hiệu ứng, tiếng máy theo tốc độ, còi, còi hú xe ưu tiên.
// Các hàm đều nhận (c, out, t) để dùng được cả khi chơi (AudioContext) và khi xuất file nghe thử (OfflineAudioContext).
import { SOUNDS } from './sounds-data.js';
let ctx = null, master = null, muted = false;
const NOISE = new WeakMap();
function noise(c) { if (!NOISE.has(c)) { const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; NOISE.set(c, b); } return NOISE.get(c); }
export function audio() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination); prepare(ctx); }
  if (ctx.state === 'suspended') ctx.resume().catch(() => { });
  return ctx;
}
export function setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.05); }

/* ---------- khối dựng âm ---------- */
function env(g, t, a, peak, d, hold = 0) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); if (hold) g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + d); }
function osc(c, out, type, f, t, a, peak, d, hold = 0, lp = 0) {
  const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  let n = o; if (lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); n = fl; }
  n.connect(g); g.connect(out); env(g, t, a, peak, d, hold); o.start(t); o.stop(t + a + hold + d + 0.05); return o;
}
function burst(c, out, t, dur, peak, type, f, q = 0.8, a = 0.005) {
  const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noise(c); fl.type = type; fl.frequency.value = f; fl.Q.value = q; s.connect(fl); fl.connect(g); g.connect(out);
  env(g, t, a, peak, dur); s.start(t, Math.random() * 1.5); s.stop(t + a + dur + 0.05);
}

/* ---------- âm thanh thu thật (OpenSFX, Kenney) ---------- */
const BUF = new WeakMap();
export function loadSounds(c) {
  if (!BUF.has(c)) BUF.set(c, Promise.all(Object.entries(SOUNDS).map(([k, b64]) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return c.decodeAudioData(u.buffer).then(b => [k, b]).catch(() => [k, null]); })).then(e => Object.fromEntries(e)));
  return BUF.get(c);
}
const READY = new WeakMap();
function buf(c, k) { const m = READY.get(c); return m && m[k]; }
export async function prepare(c) { READY.set(c, await loadSounds(c)); }
function play(c, out, k, t, { rate = 1, gain = 1, offset = 0, dur, lp } = {}) {
  const b = buf(c, k); if (!b) return null;
  const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; s.playbackRate.value = rate; g.gain.value = gain;
  let n = s; if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; s.connect(f); n = f; }
  n.connect(g); g.connect(out);
  if (dur) { g.gain.setValueAtTime(gain, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur); s.start(t, offset, dur + 0.02); } else s.start(t, offset);
  return s;
}

/* ---------- còi khởi hành (âm thanh thật) ---------- */
export function hornAt(k, c, out, t) {
  if (k === 'train') play(c, out, 'train_depart', t, { gain: 1.0 });
  else if (k === 'metro') play(c, out, 'metro_depart', t, { gain: 1.1 });
  else if (k === 'truck' || k === 'fire') play(c, out, 'truck_depart', t, { gain: 0.9, dur: 2.6 });
  else play(c, out, 'car_horn', t, { gain: 0.8 });
}
export function brakeAt(k, c, out, t) {
  if (k === 'train') play(c, out, 'steam', t, { gain: 0.9 });
  else if (k === 'truck' || k === 'fire') play(c, out, 'steam', t, { gain: 0.6, rate: 1.4, lp: 6000 });
  else if (k === 'metro') play(c, out, 'steam', t, { gain: 0.3, rate: 1.8 });
}

/* ---------- tiếng máy chạy theo tốc độ (im lặng khi xe đứng chờ bé làm bài) ---------- */
// Còi ưu tiên theo NĐ 109/2009/NĐ-CP (Điều 10): cứu hoả WAIL 580–1400 Hz 120 lần/phút; công an YELP 500–850 Hz 180 lần/phút; cứu thương HI-LO 600–800 Hz 60 lần/phút.
const PROF = {
  train: { type: 'steam' }, metro: { type: 'electric' },
  car: { type: 'engine', rate: [0.55, 1.45], gears: [0, 6, 12, 18] }, taxi: { type: 'engine', rate: [0.55, 1.45], gears: [0, 6, 12, 18] },
  police: { type: 'engine', rate: [0.6, 1.55], gears: [0, 7, 14, 21], siren: 'yelp' }, ambulance: { type: 'engine', rate: [0.55, 1.4], gears: [0, 6, 12, 18], siren: 'hilo' },
  truck: { type: 'engine', rate: [0.38, 0.85], gears: [0, 4, 8, 13, 18], lp: 900 }, fire: { type: 'engine', rate: [0.4, 0.88], gears: [0, 4, 8, 13, 18], lp: 1000, siren: 'wail' }
};
export function makeEngine(kind, c, dest, t0) {
  const P = PROF[kind] || PROF.car, out = c.createGain(); out.gain.setValueAtTime(0, t0); out.connect(dest);
  const nodes = [], E = { P, kind, out, nodes, chuff: 0, chuffI: 0, joint: 0, lastV: 0 };
  const loopNoise = (type, f, q, gain) => { const s = c.createBufferSource(); s.buffer = noise(c); s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = gain; s.connect(fl); fl.connect(g); g.connect(out); s.start(t0); nodes.push(s); return { s, fl, g }; };
  if (P.type === 'engine') {
    const b = buf(c, 'engine');
    if (b) { const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; s.loop = true; s.loopStart = 0.08; s.loopEnd = b.duration - 0.08; f.type = 'lowpass'; f.frequency.value = P.lp || 4000; g.gain.value = 0.25; s.connect(f); f.connect(g); g.connect(out); s.start(t0, 0.1); nodes.push(s); E.eng = { s, f, g }; }
    E.road = loopNoise('lowpass', 450, 0.5, 0);
  } else if (P.type === 'electric') {
    const m1 = c.createOscillator(), m2 = c.createOscillator(), g = c.createGain(); m1.type = 'sine'; m2.type = 'sine'; g.gain.value = 0;
    m1.connect(g); m2.connect(g); g.connect(out); m1.start(t0); m2.start(t0); nodes.push(m1, m2);
    E.motor = { m1, m2, g }; E.road = loopNoise('lowpass', 260, 0.7, 0);
  } else E.road = loopNoise('lowpass', 220, 0.7, 0);
  if (P.siren) { const s = c.createOscillator(), bp = c.createBiquadFilter(), g = c.createGain(); s.type = 'square'; bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 0.5; g.gain.value = 0; s.connect(bp); bp.connect(g); g.connect(dest); s.start(t0); nodes.push(s); E.siren = { s, g }; }
  E.update = (v, dt, t, sirenOn) => engineStep(E, c, v, dt, t, sirenOn);
  E.stop = t => { out.gain.setTargetAtTime(0, t, 0.08); if (E.siren) E.siren.g.gain.setTargetAtTime(0, t, 0.05); nodes.forEach(n => { try { n.stop(t + 0.6); } catch (x) { } }); };
  return E;
}
function gearU(P, v) { const G = P.gears; let i = G.length - 2; for (let k = 0; k < G.length - 1; k++) if (v < G[k + 1]) { i = k; break; } return v < 0.3 ? 0 : 0.15 + 0.85 * Math.min(1.1, (v - G[i]) / (G[i + 1] - G[i])); }
function engineStep(E, c, v, dt, t, sirenOn) {
  const P = E.P, k = Math.min(1, v / 22), acc = (v - E.lastV) / Math.max(dt, 1e-3); E.lastV = v;
  const T = (p, val, tc = 0.06) => p.setTargetAtTime(val, t, tc);
  const moving = v > 0.3;
  T(E.out.gain, moving ? 1 : 0, moving ? 0.15 : 0.35); // đứng chờ làm bài: im lặng
  if (P.type === 'engine') {
    if (E.eng) { const u = gearU(P, v), load = Math.max(0, Math.min(1, 0.3 + acc * 0.1)); T(E.eng.s.playbackRate, P.rate[0] + u * (P.rate[1] - P.rate[0]), 0.08); T(E.eng.g.gain, 0.2 + 0.15 * Math.max(load, k), 0.1); }
    T(E.road.g.gain, k * 0.025, 0.2);
  } else if (P.type === 'electric') {
    const f = 220 + v * 34; T(E.motor.m1.frequency, f); T(E.motor.m2.frequency, f * 1.335); T(E.motor.g.gain, moving ? 0.05 * Math.min(1, Math.abs(acc) * 0.3) + 0.006 : 0, 0.15);
    T(E.road.g.gain, k * 0.28, 0.2);
  } else {
    T(E.road.g.gain, k * 0.06, 0.2);
    if (v > 0.4) {
      E.chuff += dt * Math.min(8, 1.2 + v * 0.38);
      while (E.chuff >= 1) { E.chuff -= 1; const a4 = [1, 0.55, 0.8, 0.5][E.chuffI++ % 4]; play(c, E.out, 'steam', t, { gain: 0.9 * a4, offset: 0.02 + Math.random() * 0.1, dur: Math.max(0.09, 0.24 - v * 0.007), rate: 0.75 + Math.random() * 0.1, lp: 3500 }); }
    }
  }
  if ((P.type === 'steam' || P.type === 'electric') && v > 1.5) {
    E.joint += v * dt; const L = P.type === 'steam' ? 12 : 14;
    if (E.joint >= L) { E.joint -= L; const g = (P.type === 'steam' ? 0.2 : 0.14) * (0.4 + k * 0.6), gap = Math.min(0.25, 2.4 / v); burst(c, E.out, t, 0.04, g, 'bandpass', 1500, 1.2, 0.002); burst(c, E.out, t + gap, 0.04, g * 0.85, 'bandpass', 1400, 1.2, 0.002); }
  }
  if (E.siren) {
    const on = sirenOn && v > 0.5; T(E.siren.g.gain, on ? 0.09 : 0, 0.08);
    if (on) { const s = E.siren.s.frequency; let f;
      if (P.siren === 'hilo') f = Math.floor(t / 0.5) % 2 ? 600 : 800;
      else if (P.siren === 'yelp') f = 500 + 350 * ((t % (1 / 3)) * 3);
      else { const u = (t % 0.5) / 0.5; f = 580 + 820 * (u < 0.5 ? u * 2 : 2 - u * 2); }
      s.setTargetAtTime(f, t, P.siren === 'hilo' ? 0.003 : 0.01);
    }
  }
}

/* ---------- dùng trong game ---------- */
const now = () => ctx.currentTime;
export const sfx = {
  tap() { const c = audio(); if (c && !muted) osc(c, master, 'square', 560, now(), 0.005, 0.03, 0.05); },
  board() { const c = audio(); if (c && !muted) [660, 880].forEach((f, i) => osc(c, master, 'triangle', f, now() + i * 0.1, 0.01, 0.12, 0.12)); },
  stamp() { const c = audio(); if (!c || muted) return; osc(c, master, 'square', 140, now(), 0.005, 0.12, 0.18); osc(c, master, 'sine', 90, now() + 0.02, 0.005, 0.2, 0.25); [784, 1047].forEach((f, i) => osc(c, master, 'triangle', f, now() + 0.2 + i * 0.12, 0.01, 0.12, 0.2)); },
  boost() { const c = audio(); if (c && !muted) [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => osc(c, master, 'square', f, now() + i * 0.06, 0.01, 0.06, 0.14)); },
  buy() { const c = audio(); if (c && !muted) [988, 1319, 1568].forEach((f, i) => osc(c, master, 'triangle', f, now() + i * 0.07, 0.01, 0.14, 0.12)); },
  win() { const c = audio(); if (c && !muted) [523, 659, 784, 1047, 1319].forEach((f, i) => osc(c, master, 'triangle', f, now() + i * 0.13, 0.01, 0.16, 0.32)); },
  horn(k) { const c = audio(); if (c && !muted) hornAt(k, c, master, now() + 0.02); },
  brake(k) { const c = audio(); if (c && !muted) brakeAt(k, c, master, now() + 0.02); }
};
let E = null, tok = 0;
export function engineStart(kind) { engineStop(); const c = audio(); if (!c) return; const my = ++tok; loadSounds(c).then(m => { READY.set(c, m); if (my === tok) E = makeEngine(kind, c, master, c.currentTime); }); }
export function engineStop() { tok++; if (E && ctx) E.stop(ctx.currentTime); E = null; }
export function engineUpdate(v, dt, sirenOn) { if (E && ctx) E.update(v, dt, ctx.currentTime, sirenOn); }
