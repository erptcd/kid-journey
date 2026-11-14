// Âm thanh tổng hợp bằng WebAudio (không cần file mp3): hiệu ứng, tiếng máy chạy, còi xe ưu tiên
let ctx = null, master = null, muted = false, noiseBuf = null;
export function audio() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => { });
  return ctx;
}
export function setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05); }
export function tone(f, dur, type = 'sine', vol = 0.15, delay = 0) {
  const c = audio(); if (!c || muted) return; const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
function burst(when, dur, vol, ftype, freq, q = 1) { // tiếng xì/cạch ngắn từ nhiễu trắng
  const c = ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noiseBuf; f.type = ftype; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(vol, when + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(when, Math.random() * 1.5); s.stop(when + dur + 0.05);
}
export const sfx = {
  tap() { tone(560, 0.05, 'square', 0.03); },
  board() { [660, 880].forEach((f, i) => tone(f, 0.12, 'triangle', 0.12, i * 0.1)); },
  stamp() { tone(140, 0.18, 'square', 0.12); tone(90, 0.25, 'sine', 0.2, 0.02); [784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.12, 0.2 + i * 0.12)); },
  boost() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.14, 'square', 0.06, i * 0.06)); },
  buy() { [988, 1319, 1568].forEach((f, i) => tone(f, 0.12, 'triangle', 0.14, i * 0.07)); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.32, 'triangle', 0.16, i * 0.13)); },
  horn(k) {
    if (k === 'train') [0, 0.65].forEach(d => { tone(392, 0.55, 'square', 0.05, d); tone(494, 0.55, 'square', 0.04, d); tone(587, 0.55, 'triangle', 0.03, d); });
    else if (k === 'metro') { tone(1250, 0.09, 'sine', 0.12); tone(1250, 0.09, 'sine', 0.12, 0.16); }
    else if (k === 'truck' || k === 'fire') [0, 0.45].forEach(d => { tone(196, 0.38, 'sawtooth', 0.07, d); tone(247, 0.38, 'sawtooth', 0.05, d); });
    else [0, 0.3].forEach(d => { tone(440, 0.22, 'sawtooth', 0.05, d); tone(554, 0.22, 'sawtooth', 0.04, d); });
  },
  brake(k) { const c = audio(); if (!c || muted) return; if (k === 'truck' || k === 'fire' || k === 'metro' || k === 'train') burst(c.currentTime, k === 'train' ? 0.9 : 0.55, 0.12, 'highpass', 2500); }
};

/* ---------- tiếng máy chạy theo tốc độ ---------- */
const PROF = {
  train: { osc: 'sawtooth', f0: 38, fk: 1.2, lp: 300, vol: 0.03, nVol: 0, chuff: true, clack: 11 },
  metro: { osc: 'sawtooth', f0: 120, fk: 22, lp: 1400, vol: 0.022, nVol: 0.012, nf: 400, clack: 13, whine: true },
  car: { osc: 'sawtooth', f0: 48, fk: 4.2, lp: 520, vol: 0.05, nVol: 0.02, nf: 260 },
  taxi: { osc: 'sawtooth', f0: 48, fk: 4.2, lp: 520, vol: 0.05, nVol: 0.02, nf: 260 },
  police: { osc: 'sawtooth', f0: 52, fk: 4.6, lp: 560, vol: 0.045, nVol: 0.02, nf: 260, siren: 'wail' },
  ambulance: { osc: 'sawtooth', f0: 50, fk: 4.0, lp: 520, vol: 0.045, nVol: 0.02, nf: 260, siren: 'hilo' },
  truck: { osc: 'sawtooth', f0: 32, fk: 2.6, lp: 380, vol: 0.06, nVol: 0.035, nf: 180 },
  fire: { osc: 'sawtooth', f0: 34, fk: 2.6, lp: 400, vol: 0.06, nVol: 0.03, nf: 180, siren: 'slow' }
};
let E = null;
export function engineStart(kind) {
  engineStop(); const c = audio(); if (!c) return; const P = PROF[kind] || PROF.car, t = c.currentTime;
  const out = c.createGain(); out.gain.value = 0; out.connect(master);
  const o = c.createOscillator(); o.type = P.osc; o.frequency.value = P.f0; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = P.lp; const og = c.createGain(); og.gain.value = P.vol; o.connect(lp); lp.connect(og); og.connect(out); o.start(t);
  const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = P.f0 * 0.5; const g2 = c.createGain(); g2.gain.value = P.vol * 0.35; o2.connect(lp); o2.start(t); void g2;
  let n = null, ng = null; if (P.nVol) { n = c.createBufferSource(); n.buffer = noiseBuf; n.loop = true; const nf = c.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = P.nf; ng = c.createGain(); ng.gain.value = P.nVol; n.connect(nf); nf.connect(ng); ng.connect(out); n.start(t); }
  let wh = null, whg = null; if (P.whine) { wh = c.createOscillator(); wh.type = 'sine'; wh.frequency.value = 300; whg = c.createGain(); whg.gain.value = 0; wh.connect(whg); whg.connect(master); wh.start(t); }
  let sir = null, sg = null; if (P.siren) { sir = c.createOscillator(); sir.type = 'triangle'; sir.frequency.value = 800; const sf = c.createBiquadFilter(); sf.type = 'lowpass'; sf.frequency.value = 2400; sg = c.createGain(); sg.gain.value = 0; sir.connect(sf); sf.connect(sg); sg.connect(master); sir.start(t); }
  E = { kind, P, out, o, o2, lp, n, ng, wh, whg, sir, sg, chuff: 0, clackD: 0, nodes: [o, o2, n, wh, sir].filter(Boolean) };
}
export function engineStop() {
  if (!E || !ctx) { E = null; return; } const t = ctx.currentTime, e = E; E = null;
  e.out.gain.setTargetAtTime(0, t, 0.08); if (e.whg) e.whg.gain.setTargetAtTime(0, t, 0.08); if (e.sg) e.sg.gain.setTargetAtTime(0, t, 0.08);
  setTimeout(() => e.nodes.forEach(nd => { try { nd.stop(); } catch (x) { } }), 600);
}
// gọi mỗi khung hình: v = tốc độ hiện tại (đơn vị/giây), dt = giây, sirenOn = có hú còi
export function engineUpdate(v, dt, sirenOn) {
  if (!E || !ctx || muted) return; const P = E.P, t = ctx.currentTime, k = Math.min(1, v / 22);
  E.out.gain.setTargetAtTime(0.35 + k * 0.65, t, 0.15);
  E.o.frequency.setTargetAtTime(P.f0 + v * P.fk, t, 0.12); E.o2.frequency.setTargetAtTime((P.f0 + v * P.fk) * 0.5, t, 0.12); E.lp.frequency.setTargetAtTime(P.lp + v * 25, t, 0.12);
  if (E.wh) { E.wh.frequency.setTargetAtTime(260 + v * 38, t, 0.1); E.whg.gain.setTargetAtTime(k * 0.018, t, 0.2); }
  if (P.chuff) { // xình xịch: số nhịp theo tốc độ, lúc đứng yên thì xì hơi chậm
    E.chuff += dt * (v > 0.5 ? 0.9 + v * 0.32 : 0.35);
    while (E.chuff >= 1) { E.chuff -= 1; burst(t + 0.01, v > 0.5 ? 0.13 : 0.35, v > 0.5 ? 0.09 : 0.03, 'bandpass', 900 + Math.random() * 300, 0.9); }
  }
  if (P.clack && v > 1) { // tiếng bánh sắt qua mối nối ray: cạch-cạch
    E.clackD += v * dt; if (E.clackD >= P.clack) { E.clackD = 0; const g = 0.05 + k * 0.05; burst(t + 0.01, 0.05, g, 'highpass', 1800); burst(t + 0.01 + Math.min(0.2, 3.2 / v), 0.05, g * 0.8, 'highpass', 1800); }
  }
  if (E.sir) {
    const on = sirenOn && v > 0.5; E.sg.gain.setTargetAtTime(on ? 0.035 : 0, t, 0.1);
    if (on) { const tt = performance.now() / 1000; let f; if (P.siren === 'hilo') f = Math.floor(tt / 0.45) % 2 ? 770 : 960; else if (P.siren === 'wail') f = 950 + 400 * Math.sin(tt * Math.PI * 1.6); else f = 800 - 320 * Math.cos(tt * Math.PI * 0.9); E.sir.frequency.setTargetAtTime(f, t, P.siren === 'hilo' ? 0.01 : 0.05); }
  }
}
