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

/* ---------- dùng trong game ---------- */
const now = () => ctx.currentTime;
// Theo yêu cầu: không phát âm thanh xe (máy chạy, còi, còi hú). Chỉ giữ tiếng hiệu ứng giao diện.
export const sfx = {
  tap() { const c = audio(); if (c && !muted) osc(c, master, 'square', 560, now(), 0.005, 0.03, 0.05); },
  board() { const c = audio(); if (c && !muted) [660, 880].forEach((f, i) => osc(c, master, 'triangle', f, now() + i * 0.1, 0.01, 0.12, 0.12)); },
  stamp() { const c = audio(); if (!c || muted) return; osc(c, master, 'square', 140, now(), 0.005, 0.12, 0.18); osc(c, master, 'sine', 90, now() + 0.02, 0.005, 0.2, 0.25); [784, 1047].forEach((f, i) => osc(c, master, 'triangle', f, now() + 0.2 + i * 0.12, 0.01, 0.12, 0.2)); },
  boost() { const c = audio(); if (c && !muted) [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => osc(c, master, 'square', f, now() + i * 0.06, 0.01, 0.06, 0.14)); },
  buy() { const c = audio(); if (c && !muted) [988, 1319, 1568].forEach((f, i) => osc(c, master, 'triangle', f, now() + i * 0.07, 0.01, 0.14, 0.12)); },
  win() { const c = audio(); if (c && !muted) [523, 659, 784, 1047, 1319].forEach((f, i) => osc(c, master, 'triangle', f, now() + i * 0.13, 0.01, 0.16, 0.32)); },
};
