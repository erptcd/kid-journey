// Âm thanh tổng hợp bằng WebAudio (không cần file): hiệu ứng, tiếng máy theo tốc độ, còi, còi hú xe ưu tiên.
// Các hàm đều nhận (c, out, t) để dùng được cả khi chơi (AudioContext) và khi xuất file nghe thử (OfflineAudioContext).
let ctx = null, master = null, muted = false;
const NOISE = new WeakMap();
function noise(c) { if (!NOISE.has(c)) { const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; NOISE.set(c, b); } return NOISE.get(c); }
export function audio() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination); }
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

/* ---------- còi khởi hành ---------- */
export function hornAt(k, c, out, t) {
  if (k === 'train') { // còi hơi tàu: hợp âm 3 nốt, có tiếng hơi, "tu… tuuuu"
    [[0, 0.35], [0.55, 1.1]].forEach(([d, len]) => { [523, 659, 784].forEach((f, i) => { const o = osc(c, out, 'triangle', f, t + d, 0.06, 0.05 - i * 0.008, 0.25, len, 3000); o.frequency.setValueAtTime(f * 0.97, t + d); o.frequency.linearRampToValueAtTime(f, t + d + 0.12); }); burst(c, out, t + d, len + 0.2, 0.025, 'bandpass', 2200, 1.5, 0.05); });
  } else if (k === 'metro') { // chuông báo tàu chạy "ding – dong"
    [[0, 659], [0.42, 523]].forEach(([d, f]) => { osc(c, out, 'sine', f, t + d, 0.005, 0.12, 1.1); osc(c, out, 'sine', f * 2.01, t + d, 0.005, 0.03, 0.5); });
  } else if (k === 'truck' || k === 'fire') { // còi hơi xe tải: trầm, to
    [[0, 0.32], [0.48, 0.55]].forEach(([d, len]) => { osc(c, out, 'sawtooth', 185, t + d, 0.03, 0.06, 0.12, len, 1400); osc(c, out, 'sawtooth', 233, t + d, 0.03, 0.05, 0.12, len, 1400); });
  } else { // còi xe con "bíp bíp"
    [0, 0.26].forEach(d => { osc(c, out, 'square', 415, t + d, 0.01, 0.045, 0.05, 0.13, 2200); osc(c, out, 'square', 495, t + d, 0.01, 0.04, 0.05, 0.13, 2200); });
  }
}
export function brakeAt(k, c, out, t) {
  if (k === 'truck' || k === 'fire') burst(c, out, t, 0.7, 0.09, 'highpass', 3000, 0.7, 0.01); // xả phanh hơi "xììì"
  else if (k === 'train') burst(c, out, t, 1.2, 0.06, 'highpass', 2500, 0.7, 0.05);
  else if (k === 'metro') burst(c, out, t, 0.5, 0.035, 'highpass', 3500, 0.7, 0.02);
}

/* ---------- tiếng máy chạy theo tốc độ ---------- */
// v: tốc độ (đơn vị/giây, tối đa ~22, tăng tốc ~34). Hồ sơ từng xe:
const PROF = {
  train: { type: 'steam' },
  metro: { type: 'electric' },
  car: { type: 'petrol', idle: 850, red: 3800, gears: [0, 5, 10, 15, 20], vol: 1 },
  taxi: { type: 'petrol', idle: 850, red: 3800, gears: [0, 5, 10, 15, 20], vol: 1 },
  police: { type: 'petrol', idle: 900, red: 4200, gears: [0, 6, 12, 18, 24], vol: 1, siren: 'yelp' },
  ambulance: { type: 'petrol', idle: 800, red: 3600, gears: [0, 5, 10, 16, 22], vol: 1, siren: 'hilo' },
  truck: { type: 'diesel', idle: 600, red: 2300, gears: [0, 3, 6, 10, 14, 19], vol: 1 },
  fire: { type: 'diesel', idle: 620, red: 2400, gears: [0, 3, 6, 10, 14, 19], vol: 1, siren: 'wail' }
};
export function makeEngine(kind, c, dest, t0) {
  const P = PROF[kind] || PROF.car, out = c.createGain(); out.gain.setValueAtTime(0, t0); out.gain.linearRampToValueAtTime(1, t0 + 0.4); out.connect(dest);
  const nodes = [], E = { P, kind, out, nodes, chuff: 0, chuffI: 0, joint: 0, lastV: 0, hiss: 0 };
  const loopNoise = (type, f, q, gain) => { const s = c.createBufferSource(); s.buffer = noise(c); s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = gain; s.connect(fl); fl.connect(g); g.connect(out); s.start(t0); nodes.push(s); return { s, fl, g }; };
  if (P.type === 'petrol' || P.type === 'diesel') {
    // động cơ: sóng răng cưa ở tần số nổ + hoạ âm, lọc thấp; tiếng nổ lách cách = nhiễu điều biến theo tần số nổ
    const o1 = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
    o1.type = 'sawtooth'; o2.type = 'triangle'; lp.type = 'lowpass'; lp.Q.value = 1.2; g.gain.value = P.type === 'diesel' ? 0.07 : 0.055;
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(out); o1.start(t0); o2.start(t0); nodes.push(o1, o2);
    const am = c.createOscillator(), amG = c.createGain(), nz = loopNoise('bandpass', P.type === 'diesel' ? 160 : 300, 0.9, 0); am.type = 'square'; amG.gain.value = 0;
    am.connect(amG); amG.connect(nz.g.gain); am.start(t0); nodes.push(am);
    E.engine = { o1, o2, lp, g, am, amG, nz }; E.road = loopNoise('lowpass', 500, 0.5, 0);
  } else if (P.type === 'electric') {
    const m1 = c.createOscillator(), m2 = c.createOscillator(), g = c.createGain(); m1.type = 'sine'; m2.type = 'sine'; g.gain.value = 0;
    m1.connect(g); m2.connect(g); g.connect(out); m1.start(t0); m2.start(t0); nodes.push(m1, m2);
    E.motor = { m1, m2, g }; E.road = loopNoise('lowpass', 260, 0.7, 0); E.hum = loopNoise('bandpass', 100, 2, 0.006);
  } else { E.road = loopNoise('lowpass', 220, 0.7, 0); E.steam = loopNoise('highpass', 4000, 0.5, 0.004); }
  if (P.siren) { const s = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); s.type = P.siren === 'hilo' ? 'square' : 'triangle'; f.type = 'lowpass'; f.frequency.value = 2600; g.gain.value = 0; s.connect(f); f.connect(g); g.connect(dest); s.start(t0); nodes.push(s); E.siren = { s, g }; }
  E.update = (v, dt, t, sirenOn) => engineStep(E, c, v, dt, t, sirenOn);
  E.stop = t => { out.gain.setTargetAtTime(0, t, 0.08); if (E.siren) E.siren.g.gain.setTargetAtTime(0, t, 0.05); nodes.forEach(n => { try { n.stop(t + 0.6); } catch (x) { } }); };
  return E;
}
function rpmOf(P, v) { const G = P.gears; let i = G.length - 2; for (let k = 0; k < G.length - 1; k++) if (v < G[k + 1]) { i = k; break; } const a = G[i], b = G[i + 1], u = Math.max(0, Math.min(1.15, (v - a) / (b - a))); return v < 0.3 ? P.idle : P.idle * 1.15 + u * (P.red - P.idle * 1.15); }
function engineStep(E, c, v, dt, t, sirenOn) {
  const P = E.P, k = Math.min(1, v / 22), acc = (v - E.lastV) / Math.max(dt, 1e-3); E.lastV = v;
  const T = (p, val, tc = 0.06) => p.setTargetAtTime(val, t, tc);
  if (E.engine) {
    const rpm = rpmOf(P, v), cyl = P.type === 'diesel' ? 6 : 4, f = rpm / 60 * cyl / 2, load = Math.max(0, Math.min(1, 0.35 + acc * 0.12));
    T(E.engine.o1.frequency, f); T(E.engine.o2.frequency, f * 2); T(E.engine.am.frequency, f);
    T(E.engine.lp.frequency, 180 + f * (P.type === 'diesel' ? 4 : 5) + load * 500);
    const lv = v < 0.3 ? 0.3 : 0.55 + 0.45 * Math.max(load, k); // nổ máy nhỏ khi đứng chờ
    T(E.engine.g.gain, (P.type === 'diesel' ? 0.05 : 0.04) * lv);
    T(E.engine.amG.gain, (P.type === 'diesel' ? 0.06 : 0.025) * lv * (0.6 + load));
    T(E.road.g.gain, k * 0.03, 0.2);
  } else if (E.motor) { // tiếng rít điều khiển động cơ điện: cao dần khi tăng tốc, to khi tăng/giảm tốc
    const f = 220 + v * 34, pull = Math.min(1, Math.abs(acc) * 0.25 + (v > 0.5 ? 0.25 : 0));
    T(E.motor.m1.frequency, f); T(E.motor.m2.frequency, f * 1.335); T(E.motor.g.gain, v > 0.3 ? 0.014 * Math.min(1, Math.abs(acc) * 0.3) + 0.0015 : 0, 0.15);
    T(E.road.g.gain, k * 0.09, 0.2);
  } else { // tàu hơi nước: xình xịch 4 nhịp mỗi vòng bánh, nhịp mạnh nhẹ xen kẽ
    T(E.road.g.gain, k * 0.07, 0.2);
    if (v > 0.4) {
      E.chuff += dt * Math.min(9, 1.2 + v * 0.42);
      while (E.chuff >= 1) { E.chuff -= 1; const acc4 = [1, 0.55, 0.8, 0.5][E.chuffI++ % 4], dur = Math.max(0.07, 0.22 - v * 0.007); burst(c, E.out, t, dur, 0.55 * acc4, 'bandpass', 700 + v * 18, 0.6, 0.004); burst(c, E.out, t, dur * 0.6, 0.3 * acc4, 'lowpass', 260, 0.7, 0.004); }
    } else { E.hiss += dt; if (E.hiss > 2.6) { E.hiss = 0; burst(c, E.out, t, 0.9, 0.08, 'highpass', 3500, 0.5, 0.15); } }
  }
  // tiếng bánh sắt qua mối nối ray: "cạch-cạch … cạch-cạch"
  if ((P.type === 'steam' || P.type === 'electric') && v > 1.5) {
    E.joint += v * dt; const L = P.type === 'steam' ? 12 : 14;
    if (E.joint >= L) { E.joint -= L; const g = (P.type === 'steam' ? 0.2 : 0.14) * (0.4 + k * 0.6), gap = Math.min(0.25, 2.4 / v); burst(c, E.out, t, 0.04, g, 'bandpass', 1500, 1.2, 0.002); burst(c, E.out, t + gap, 0.04, g * 0.85, 'bandpass', 1400, 1.2, 0.002); }
  }
  if (E.siren) {
    const on = sirenOn && v > 0.5; T(E.siren.g.gain, on ? 0.04 : 0, 0.08);
    if (on) { const tt = t, s = E.siren.s.frequency; let f;
      if (P.siren === 'hilo') f = Math.floor(tt / 0.55) % 2 ? 650 : 960; // xe cứu thương "tò – te"
      else if (P.siren === 'yelp') { const u = (tt % 0.32) / 0.32; f = 650 + 900 * u; } // cảnh sát hú nhanh
      else { const u = (tt % 4) / 4; f = 520 + 640 * (u < 0.5 ? u * 2 : 2 - u * 2); } // cứu hoả hú lên xuống chậm
      s.setTargetAtTime(f, t, P.siren === 'hilo' ? 0.004 : 0.015);
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
let E = null;
export function engineStart(kind) { engineStop(); const c = audio(); if (!c) return; E = makeEngine(kind, c, master, c.currentTime); }
export function engineStop() { if (E && ctx) E.stop(ctx.currentTime); E = null; }
export function engineUpdate(v, dt, sirenOn) { if (E && ctx) E.update(v, dt, ctx.currentTime, sirenOn); }
