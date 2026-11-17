// Lõi 3D: đường đi dài, dựng cảnh theo từng đoạn, ga, phương tiện, khách lên toa, máy quay
import * as THREE from 'three';
import * as MD from './models.js';
import * as SC from './scenery.js';
import { BIOMES, SEAT_KINDS, OUTFIT } from './data.js';
const isSeat = () => SEAT_KINDS.includes(R.kind);
import * as DC from './decor.js';
const V3 = THREE.Vector3;
const { mat, rbox, cyl, sign, gc } = MD;

export const W = {};
let renderer, scene, camera, hemi, sun, sky, ground, world, persist;
let path = null, R = null; // R = route state
const CH = 50;

/* ================= init ================= */
W.init = function (canvas) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(48, 1, 0.3, 1400);
  hemi = new THREE.HemisphereLight(0xdff3ff, 0x7aa35a, 1.35); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff1d6, 2.5); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 260 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04; sun.shadow.radius = 3; scene.add(sun); scene.add(sun.target);
  sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x4fa9ff) }, bot: { value: new THREE.Color(0xdff4ff) } },
    vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 p; void main(){ float t = smoothstep(-0.02, 0.55, p.y); gl_FragColor = vec4(mix(bot, top, t), 1.); }'
  })); sky.renderOrder = -1; scene.add(sky);
  scene.fog = new THREE.Fog(0xdff4ff, 160, 520);
  ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ color: 0x8fd16a, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; scene.add(ground);
  addEventListener('resize', resize); resize();
};
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.8 ? 62 : 48; camera.updateProjectionMatrix(); }

/* ================= RNG ================= */
function rngOf(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ================= path ================= */
function makePath(nLegs, legLen, straightAt, rng, yProfile) {
  const pad0 = 80, pad1 = 220, total = pad0 + nLegs * legLen + pad1, step = 40, n = Math.ceil(total / step) + 3;
  const ctrl = []; let x = 0, z = 0, th = 0, w = 0;
  for (let i = 0; i < n; i++) {
    ctrl.push(new V3(x, 0, z));
    const sa = i * step, near = straightAt.some(s => Math.abs(s - sa) < 75);
    if (!near) { w += (rng() - 0.5) * 0.5; w = Math.max(-0.32, Math.min(0.32, w)); th += w * 0.55; th = Math.max(-0.95, Math.min(0.95, th)); } else w *= 0.3;
    x += Math.sin(th) * step; z += Math.cos(th) * step;
  }
  const c = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal'); c.arcLengthDivisions = n * 60;
  const L = c.getLength(), N = Math.floor(L);
  const px = new Float32Array(N + 1), pz = new Float32Array(N + 1), tx = new Float32Array(N + 1), tz = new Float32Array(N + 1), py = new Float32Array(N + 1);
  for (let i = 0; i <= N; i++) { const u = i / N, p = c.getPointAt(u), t = c.getTangentAt(u); px[i] = p.x; pz[i] = p.z; const l = Math.hypot(t.x, t.z) || 1; tx[i] = t.x / l; tz[i] = t.z / l; }
  const ds = L / N;
  for (let i = 0; i <= N; i++) py[i] = yProfile ? yProfile(i * ds) : 0;
  return { L, N, ds, px, py, pz, tx, tz, pad0 };
}
function idx(s) { const f = Math.max(0, Math.min(path.N - 0.0001, s / path.ds)); const i = Math.floor(f); return [i, f - i]; }
const lerp = (a, b, t) => a + (b - a) * t;
function P(s, out = new V3()) { const [i, f] = idx(s); return out.set(lerp(path.px[i], path.px[i + 1], f), lerp(path.py[i], path.py[i + 1], f), lerp(path.pz[i], path.pz[i + 1], f)); }
function T(s, out = new V3()) { const [i, f] = idx(s); return out.set(lerp(path.tx[i], path.tx[i + 1], f), 0, lerp(path.tz[i], path.tz[i + 1], f)).normalize(); }
function S(s, out = new V3()) { const t = T(s); return out.set(t.z, 0, -t.x); }
function at(s, d, out = new V3()) { const p = P(s), sv = S(s); return out.set(p.x + sv.x * d, 0, p.z + sv.z * d); }
function stationYaw(s) { const sv = S(s); return Math.atan2(-sv.z, sv.x); } // local x = +S, local z = along track

/* ---------- geometry along path ---------- */
function strip(a, b, d0, d1, y, yTrack = false) {
  const n = Math.max(2, Math.ceil((b - a) / 1.5)), pos = [], ix = [];
  for (let i = 0; i <= n; i++) {
    const s = a + (b - a) * i / n, p = P(s), sv = S(s), yy = (yTrack ? p.y : 0) + y;
    pos.push(p.x + sv.x * d0, yy, p.z + sv.z * d0, p.x + sv.x * d1, yy, p.z + sv.z * d1);
    if (i < n) { const k = i * 2; ix.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(ix); g.computeVertexNormals();
  const ny = g.attributes.normal.getY(0); if (ny < 0) { for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.setIndex(ix); g.computeVertexNormals(); }
  return g;
}
function wall(a, b, d, y0, y1, yTrack = false) {
  const n = Math.max(2, Math.ceil((b - a) / 2)), pos = [], ix = [];
  for (let i = 0; i <= n; i++) { const s = a + (b - a) * i / n, p = P(s), sv = S(s), base = yTrack ? p.y : 0; pos.push(p.x + sv.x * d, base + y0, p.z + sv.z * d, p.x + sv.x * d, base + y1, p.z + sv.z * d); if (i < n) { const k = i * 2; ix.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(ix); g.computeVertexNormals(); return g;
}
function tubeAlong(a, b, d, y, r, m, parent) {
  const pts = []; for (let s = a; s <= b + 0.01; s += 2) { const p = P(s), sv = S(s); pts.push(new V3(p.x + sv.x * d, p.y + y, p.z + sv.z * d)); }
  if (pts.length < 2) return;
  const me = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, r, 5), m); me.castShadow = true; parent.add(me);
}

/* ---------- reservation (tránh đặt đồ đè lên nhau / đường ray) ---------- */
function makeSpace() {
  const grid = new Map(), cell = 24, strips = [], lines = [];
  const key = (x, z) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
  return {
    reserve(x, z, r) { const k = key(x, z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push([x, z, r]); },
    blockStrip(a, b, d0, d1) { strips.push([a, b, Math.min(d0, d1), Math.max(d0, d1)]); },
    blockRiver(c, t, hw) { lines.push([c.x, c.z, t.x, t.z, hw]); },
    free(x, z, r, s, d) {
      for (const [a, b, d0, d1] of strips) if (s > a - r && s < b + r && d > d0 - r && d < d1 + r) return false;
      for (const [cx, cz, txx, tzz, hw] of lines) if (Math.abs((x - cx) * txx + (z - cz) * tzz) < hw + r) return false;
      const cx = Math.floor(x / cell), cz = Math.floor(z / cell), span = Math.ceil((r + 40) / cell);
      for (let i = -span; i <= span; i++) for (let j = -span; j <= span; j++) { const L = grid.get(`${cx + i},${cz + j}`); if (L) for (const [ox, oz, or] of L) if ((ox - x) ** 2 + (oz - z) ** 2 < (or + r) ** 2) return false; }
      const clear = R.trackHalf + r, i0 = Math.max(0, Math.floor((s - 260) / path.ds)), i1 = Math.min(path.N, Math.ceil((s + 260) / path.ds));
      for (let i = i0; i <= i1; i += 3) { const dx = path.px[i] - x, dz = path.pz[i] - z; if (dx * dx + dz * dz < clear * clear) return false; }
      return true;
    }
  };
}

/* ================= route setup ================= */
W.setup = function (opt) {
  // opt: { kind: 'train'|'metro'|'car'|'truck', stations:[...], slots:n, legLen, seed }
  if (world) disposeGroup(world, true);
  world = new THREE.Group(); scene.add(world); persist = new THREE.Group(); world.add(persist);
  const st = opt.stations, n = st.length - 1, legLen = opt.legLen || 300, rng = rngOf(opt.seed || 7);
  const track = opt.kind === 'train' ? 'rail' : opt.kind === 'metro' ? 'metro' : 'road';
  R = { opt, st, n, legLen, track, kind: opt.kind, slots: opt.slots, trackHalf: track === 'road' ? 5.2 : 3.4, chunks: new Map(), spins: [], bobs: [], tweens: [], stationS: [], feats: [], anim: [], camMode: 'board', camUser: 'auto', boost: 0, waiters: [], delivered: [], lat: 0, latT: 0, lane: 0, items: [], jumps: [], fly: [], mission: null, funOn: false };
  const pad0 = 80;
  for (let i = 0; i <= n; i++) R.stationS.push(pad0 + i * legLen);
  for (let i = 0; i < n; i++) { const a = st[i], b = st[i + 1], f = (opt.dir < 0 ? b : a).feat; const sf = R.stationS[i] + legLen * 0.55; if (f && !(track === 'metro' && f === 'tunnel')) R.feats.push({ type: f, s: sf, leg: i }); }
  // metro: độ cao từng ga (ngầm −12, trên cao +9)
  let yProf = null;
  if (track === 'metro') {
    const H = st.map(x => x.under ? -12 : 9);
    yProf = s => { if (s <= R.stationS[0]) return H[0]; for (let i = 0; i < n; i++) { const a = R.stationS[i], b = R.stationS[i + 1]; if (s <= b) { if (H[i] === H[i + 1]) return H[i]; let u = (s - a) / (b - a); u = Math.max(0, Math.min(1, (u - 0.15) / 0.7)); u = u * u * (3 - 2 * u); return lerp(H[i], H[i + 1], u); } } return H[n]; };
  }
  path = makePath(n, legLen, [...R.stationS, ...R.feats.map(f => f.s)], rng, yProf);
  R.space = makeSpace();
  // chừa trống khu nhiệm vụ (đám cháy, người bệnh, bé lạc) và chỗ đặt máy quay
  R.missionAt = (opt.missions || []).map(i => W.missionS(i));
  R.missionAt.forEach(sm => R.space.blockStrip(sm - 32, sm + 32, -48, 26));
  R.ctx = makeCtx(persist, rngOf((opt.seed || 7) * 31));
  // ground colour target
  R.groundCol = new THREE.Color(BIOMES[st[0].town].ground); ground.material.color.copy(R.groundCol);
  // stations + landmarks + features (dựng một lần)
  st.forEach((x, i) => buildStation(i));
  st.forEach((x, i) => { if (x.lm) { const bio = BIOMES[x.town]; SC.landmark(R.ctx, x.lm, R.stationS[i], bio.sea ? 1 : -1); } });
  R.feats.forEach(f => { if (f.type === 'river') SC.riverFeature(R.ctx, f.s, track); else if (f.type === 'tunnel') SC.tunnelFeature(R.ctx, f.s); });
  if (track === 'metro') buildMetroUnderground();
  // vehicle
  R.veh = makeVehicle();
  R.veh.s = headStopS(0); placeVehicle(R.veh.s, 0);
  ensureChunks(R.veh.s);
  R.cam = { pos: new V3(), look: new V3(), shift: 0, shiftT: 0, shiftX: 0, shiftXT: 0, fov: 48 };
  snapCam();
  return { stationS: R.stationS, feats: R.feats, L: path.L };
};
function makeCtx(group, rng) {
  return {
    add: o => group.add(o), rng, at: (s, d) => at(s, d), T: s => T(s), S: s => S(s), P: s => P(s),
    free: (x, z, r, s, d) => R.space.free(x, z, r, s, d) && !inStation(s, d, r), reserve: (x, z, r) => R.space.reserve(x, z, r),
    blockStrip: (a, b, d0, d1) => R.space.blockStrip(a, b, d0, d1), blockRiver: (c, t, hw) => R.space.blockRiver(c, t, hw),
    strip: (a, b, d0, d1, y) => strip(a, b, d0, d1, y), wall: (a, b, d, y0, y1) => wall(a, b, d, y0, y1),
    spin: (o, axis, v) => R.spins.push({ o, axis, v }), bob: o => R.bobs.push({ o, ph: Math.random() * 6, y: o.position.y })
  };
}
function inStation(s, d, r) { for (const ss of R.stationS) if (s - ss > -48 - r && s - ss < 62 + r && d > -8 - r && d < 34 + r) return true; return false; }

/* ================= stations ================= */
function buildStation(i) {
  const s = R.stationS[i], x = R.st[i], yaw = stationYaw(s), p = P(s), word = R.opt.stopWord || 'Ga';
  const g = new THREE.Group(); g.rotation.y = yaw; persist.add(g);
  const len = R.track === 'metro' ? 26 : R.kind === 'train' ? 44 : 14;
  if (R.track === 'rail') {
    g.position.copy(at(s, 5.6));
    rbox(4.4, 0.7, len, 0.12, 0xe9e3d5, 0, 0.35, 0, g); rbox(0.25, 0.06, len, 0.03, 0xffd23f, -1.95, 0.72, 0, g);
    const roof = new THREE.Mesh(gc('canopy', () => new THREE.CylinderGeometry(3, 3, 26, 24, 1, true, -Math.PI / 2, Math.PI)), mat(0xc0522d, { side: THREE.DoubleSide }));
    roof.rotation.x = Math.PI / 2; roof.rotation.y = Math.PI; roof.scale.set(1, 0.5, 0.33); roof.position.set(0.2, 4.4, -15); roof.castShadow = true; g.add(roof);
    [-21, -15, -9].forEach(z => cyl(0.13, 0.13, 3.7, 10, 0x355070, g).position.set(1.3, 2.5, z));
    const b = MD.stationVN(x.name, x.prov); b.rotation.y = Math.PI / 2; b.position.set(13, 0, 30); g.add(b);
    const sg = sign(`${word} ${x.name}`, 5.2, 1.1, '#2b59c3', '#fff'); sg.position.set(-0.6, 3.3, 15.5); sg.rotation.y = Math.PI / 2; g.add(sg);
    [-1, 1].forEach(e => [[1.5, 0], [1.5, 2]].forEach(([xx, zz]) => { const pot = cyl(0.35, 0.28, 0.5, 12, 0xc1666b, g); pot.position.set(xx, 0.95, e * (8 + zz)); MD.ball(0.3, 0x52b788, xx, 1.35, e * (8 + zz), g, 10); }));
    R.space.reserve(g.position.x, g.position.z, 16);
  } else if (R.track === 'road') {
    g.position.copy(at(s, 6.8));
    rbox(3.4, 0.25, len + 6, 0.08, 0xd6d0c4, 0, 0.12, 0, g);
    const sh = MD.shelter(`${word} ${x.name}`); sh.position.set(0.6, 0.2, 0); g.add(sh);
    const b = MD.stationVN(x.name, x.prov, 0xe8f4ff); b.rotation.y = Math.PI / 2; b.position.set(15, 0, 24); b.scale.setScalar(0.8); g.add(b);
  } else if (!x.under) {
    const y = p.y; g.position.copy(at(s, 5.0)); g.position.y = y + 0.7;
    g.add(MD.metroStation(`${word} ${x.name}`));
    [-9, 0, 9].forEach(z => { const c = new THREE.Mesh(gc('ucyl', () => new THREE.CylinderGeometry(1, 1, 1, 14)), mat(0xcfd4da)); c.scale.set(0.55, y + 0.4, 0.55); c.position.set(1.2, -(y + 0.4) / 2 - 0.6, z); c.castShadow = true; g.add(c); });
  }
  g.userData.i = i; R['st' + i] = g;
}
function buildMetroUnderground() {
  // ống hầm + sảnh ga ngầm
  const wm = mat(0xdad6cc, { side: THREE.DoubleSide, roughness: 0.9 }), dark = mat(0x6b6f75, { side: THREE.DoubleSide });
  let a = null;
  const close = (b) => {
    persist.add(new THREE.Mesh(wall(a, b, -4.6, -0.3, 7.5, true), dark)); persist.add(new THREE.Mesh(wall(a, b, 4.6, -0.3, 7.5, true), dark));
    persist.add(new THREE.Mesh(strip(a, b, -4.7, 4.7, 7.5, true), dark));
    for (let s = a + 4; s < b; s += 9) { const p = P(s), lp = at(s, 4.4); const l = new THREE.Mesh(gc('lamp', () => new THREE.BoxGeometry(0.2, 0.4, 1.2)), mat(0xfff3b0, { emissive: 0xffd36b, emissiveIntensity: 2 })); l.position.set(lp.x, p.y + 5.5, lp.z); l.rotation.y = Math.atan2(T(s).x, T(s).z); persist.add(l); }
  };
  const inHall = s => R.st.some((x, i) => x.under && Math.abs(s - R.stationS[i]) < 25);
  for (let s = 0; s <= path.L; s += 2) { const under = P(s).y < -1.5 && !inHall(s); if (under && a == null) a = s; if (!under && a != null) { close(s); a = null; } }
  if (a != null) close(path.L);
  R.st.forEach((x, i) => {
    if (!x.under) return;
    const s = R.stationS[i], p = P(s), g = new THREE.Group(); g.position.copy(at(s, 6)); g.position.y = p.y; g.rotation.y = stationYaw(s); persist.add(g);
    const hall = new THREE.Mesh(new THREE.BoxGeometry(30, 11, 54), wm); hall.position.set(3, 5.2, 0); hall.receiveShadow = false; g.add(hall);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(30, 54), mat(0xcfc6b8)); fl.rotation.x = -Math.PI / 2; fl.position.set(3, -0.25, 0); g.add(fl);
    rbox(5, 0.9, 30, 0.1, 0xe9e3d5, -1.3, 0.45, 0, g); rbox(0.25, 0.06, 30, 0.03, 0xffd23f, -3.6, 0.92, 0, g);
    for (let z = -20; z <= 20; z += 8) { const l = new THREE.Mesh(gc('hallLamp', () => new THREE.BoxGeometry(14, 0.15, 0.6)), mat(0xffffff, { emissive: 0xfff4d6, emissiveIntensity: 1.4 })); l.position.set(2, 10.4, z); g.add(l); }
    const mural = sign(`${x.mural || x.emo}  Ga ${x.name}`, 16, 3.2, '#1565c0', '#fff'); mural.position.set(17.8, 5.5, 0); mural.rotation.y = -Math.PI / 2; g.add(mural);
    const fame = sign(`${x.emo} ${x.fame}`, 12, 1.6, '#fff3e0', '#22314f'); fame.position.set(17.8, 2.6, 0); fame.rotation.y = -Math.PI / 2; g.add(fame);
    [-14, 14].forEach(z => cyl(0.5, 0.5, 11, 12, 0xeceff1, g).position.set(3, 5.2, z));
  });
}
function headStopS(i) { return R.stationS[i] + R.veh_len / 2; }

/* ================= vehicles + slots ================= */
function makeVehicle() {
  const parts = [], gaps = [], add = (o, gap) => { parts.push(o); gaps.push(gap); world.add(o); };
  const n = R.slots;
  const decor = R.opt.decor || [], paint = DC.paintOf(decor);
  if (R.kind === 'train') { add(MD.steamLoco(paint.loco), 0); for (let k = 0; k < n; k++) add(MD.carriage(paint.cars[k % 4]), k === 0 ? 7.9 : 7.3); }
  else if (R.kind === 'metro') { for (let k = 0; k < n; k++) add(MD.metroCar(k === 0, R.st[R.st.length - 1].name, paint.metro), k === 0 ? 0 : k === 1 ? 11.6 : 10.3); }
  else if (R.kind === 'car') add(MD.car(paint.car), 0);
  else if (R.kind === 'taxi') add(MD.taxi(), 0);
  else if (R.kind === 'police') add(MD.policeCar(), 0);
  else if (R.kind === 'ambulance') add(MD.ambulance(), 0);
  else if (R.kind === 'fire') add(MD.fireTruck(), 0);
  else add(MD.truck(paint.truck[0], paint.truck[1]), 0);
  DC.applyDecor(parts, R.kind, decor);
  const off = []; let acc = 0; gaps.forEach(g => { acc += g; off.push(acc); });
  R.veh_len = acc + ({ car: 5, taxi: 5, police: 5, ambulance: 6.2, fire: 10.5, truck: 9 }[R.kind] || 8);
  const v = { parts, off, s: 0, y: R.track === 'rail' ? 0.32 : R.track === 'metro' ? 0.2 : 0.05, slots: [] };
  for (let k = 0; k < n; k++) {
    if (R.kind === 'train' || R.kind === 'metro') { const part = parts[R.kind === 'train' ? k + 1 : k], oi = R.kind === 'train' ? k + 1 : k; v.slots.push({ dz: () => -off[oi], fill: on => MD.setFilled(part, on), filled: () => !!part.userData.filled }); }
    else if (isSeat()) { const car = parts[0], h = car.userData.seats[k % 4]; v.slots.push({ dz: () => 0, fill: on => { h.visible = on; }, filled: () => h.visible }); }
    else { const tr = parts[0], bed = tr.userData.bed, c = new THREE.Group(); tr.add(c); const z = n === 1 ? (bed.z0 + bed.z1) / 2 : bed.z0 + 0.9 + k * ((bed.z1 - bed.z0 - 1.8) / (n - 1)); c.position.set(0, bed.y, z); c.visible = false; v.slots.push({ dz: () => z, crate: c, fill: on => { c.visible = on; }, filled: () => c.visible }); }
  }
  return v;
}
function placeVehicle(s, ds) {
  const v = R.veh, a = new V3(), b = new V3(), lo = R.lat || 0, lb = lo + ((R.latT || 0) - lo) * 0.35;
  v.parts.forEach((p, i) => {
    const ss = s - v.off[i];
    if (lo || lb) { at(ss, lo, a).y = P(ss).y; at(ss + 1.5, lb, b).y = P(ss + 1.5).y; } else { P(ss, a); P(ss + 1.5, b); }
    p.position.set(a.x, a.y + v.y, a.z); p.lookAt(b.x, b.y + v.y, b.z);
    (p.userData.wheels || []).forEach(w => { w.o.rotation.x += ds / w.r; });
    if (p.userData.update) p.userData.update(s / 0.72);
  });
}

/* ================= chunks ================= */
function biomeAt(s) {
  const ss = R.stationS;
  if (s <= ss[0] + 70) return R.st[0].town;
  for (let i = 0; i < R.n; i++) { if (Math.abs(s - ss[i + 1]) < 70) return R.st[i + 1].town; if (s < ss[i + 1]) return s < (ss[i] + ss[i + 1]) / 2 ? R.st[i].region : R.st[i + 1].region; }
  return R.st[R.n].town;
}
function ensureChunks(s) {
  const k0 = Math.max(0, Math.floor((s - 110) / CH)), k1 = Math.min(Math.floor(path.L / CH), Math.floor((s + 480) / CH));
  for (let k = k0; k <= k1; k++) if (!R.chunks.has(k)) { R.chunks.set(k, buildChunk(k)); }
  for (const [k, g] of R.chunks) if (k < k0 - 1) { disposeGroup(g); R.chunks.delete(k); }
}
const SLEEPER = new THREE.BoxGeometry(2.8, 0.18, 0.42), DASH = new THREE.BoxGeometry(0.22, 0.03, 2.2), DECK = new THREE.BoxGeometry(5.6, 1.0, 2.3), PARAPET = new THREE.BoxGeometry(0.25, 0.7, 1.6);
[SLEEPER, DASH, DECK, PARAPET].forEach(g => g.userData.shared = true);
function buildChunk(k) {
  const a = k * CH, b = Math.min(path.L, a + CH), g = new THREE.Group(); world.add(g);
  const ctx = makeCtx(g, rngOf(k * 7919 + 13));
  const inst = (geo, m, list, set, cast = true) => { if (!list.length) return; const im = new THREE.InstancedMesh(geo, m, list.length), d = new THREE.Object3D(); list.forEach((o, i) => { set(o, d); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.castShadow = cast; im.receiveShadow = true; im.computeBoundingSphere(); g.add(im); };
  const along = (step, fn) => { for (let s = Math.ceil(a / step) * step; s < b; s += step) fn(s, P(s), Math.atan2(T(s).x, T(s).z)); };
  if (R.track === 'rail') {
    g.add(new THREE.Mesh(strip(a, b + 0.5, -2.7, 2.7, 0.03), mat(0xa0937c, { roughness: 1 })));
    g.add(new THREE.Mesh(strip(a, b + 0.5, -2.1, 2.1, 0.06), mat(0x8f8576, { roughness: 1 })));
    const sl = []; along(1.05, (s, p, y) => sl.push([p, y])); inst(SLEEPER, mat(0x7b5236), sl, ([p, y], d) => { d.position.set(p.x, 0.15, p.z); d.rotation.set(0, y, 0); }, false);
    const rm = mat(0xb8c0cc, { metalness: 0.8, roughness: 0.3 }); tubeAlong(a, b + 0.5, -0.75, 0.3, 0.09, rm, g); tubeAlong(a, b + 0.5, 0.75, 0.3, 0.09, rm, g);
    const po = []; along(30, (s, p, y) => { if (!R.feats.some(f => Math.abs(f.s - s) < 45)) po.push([at(s, -4.2), y]); }); inst(SC.propGeo('pole'), SC.VMAT, po, ([p, y], d) => { d.position.copy(p); d.rotation.set(0, y, 0); });
  } else if (R.track === 'road') {
    g.add(new THREE.Mesh(strip(a, b + 0.5, -5.2, 5.2, 0.03), mat(0xb5b0a5, { roughness: 1 })));
    g.add(new THREE.Mesh(strip(a, b + 0.5, -4.4, 4.4, 0.06), mat(0x4a4f5a, { roughness: 0.9 })));
    [-3.95, 3.95].forEach(d => g.add(new THREE.Mesh(strip(a, b + 0.5, d - 0.12, d + 0.12, 0.08), mat(0xffffff))));
    const da = []; along(4.5, (s, p, y) => da.push([p, y])); inst(DASH, mat(0xffd166), da, ([p, y], d) => { d.position.set(p.x, 0.08, p.z); d.rotation.set(0, y, 0); }, false);
  } else {
    const dk = [], pp = [], sl = [];
    along(2, (s, p, y) => { if (p.y > 0.6) { dk.push([p, y]); [-2.75, 2.75].forEach(dd => { if (dd > 0 && R.stationS.some(x => Math.abs(s - x) < 14)) return; const q = at(s, dd); pp.push([q, p.y, y]); }); } });
    inst(DECK, mat(0xd9dde3, { roughness: 0.9 }), dk, ([p, y], d) => { d.position.set(p.x, p.y - 0.5, p.z); d.rotation.set(0, y, 0); });
    inst(PARAPET, mat(0xeceff3), pp, ([q, py, y], d) => { d.position.set(q.x, py + 0.3, q.z); d.rotation.set(0, y, 0); });
    along(1.05, (s, p, y) => sl.push([p, y])); inst(SLEEPER, mat(0xbdbdbd), sl, ([p, y], d) => { d.position.set(p.x, p.y + 0.08, p.z); d.rotation.set(0, y, 0); }, false);
    const rm = mat(0xb8c0cc, { metalness: 0.8, roughness: 0.3 }); tubeAlong(a, b + 0.5, -0.75, 0.25, 0.08, rm, g); tubeAlong(a, b + 0.5, 0.75, 0.25, 0.08, rm, g);
    along(15, (s, p, y) => { if (p.y > 2.5) { const c = new THREE.Mesh(gc('ucyl', () => new THREE.CylinderGeometry(1, 1, 1, 14)), mat(0xcfd4da)); c.scale.set(0.8, p.y - 1, 0.8); c.position.set(p.x, (p.y - 1) / 2, p.z); c.castShadow = true; g.add(c); const cap = rbox(4.4, 0.8, 1.8, 0.2, 0xcfd4da, p.x, p.y - 1.3, p.z, g); cap.rotation.y = y; } });
    if (P(a).y < 0.6 && P(b).y > -1.5) { [-3.2, 3.2].forEach(dd => g.add(new THREE.Mesh(wall(a, b, dd, -0.3, 1.2, true), mat(0xbdbdbd, { side: THREE.DoubleSide })))); }
  }
  const bio = BIOMES[biomeAt((a + b) / 2)];
  SC.scatterChunk(ctx, bio, a, b);
  return g;
}
function disposeGroup(g, all) {
  g.traverse(o => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); });
  if (g.parent) g.parent.remove(g);
  if (all) { R && (R.spins = [], R.bobs = []); }
}

/* ================= people / boarding ================= */
const CLOTH = [0xff7a3d, 0x3a86ff, 0x2a9d8f, 0xe63946, 0x8338ec, 0xffb703, 0x06d6a0, 0xff70a6];
function slotWorld(k, d, extraDz = 0) { const v = R.veh, sl = v.slots[k]; const s = v.s + sl.dz() + extraDz; const p = at(s, d); p.y = P(s).y; return { p, s }; }
function platformY() { const s = R.veh.s, p = P(s); if (R.track === 'rail') return 0.7; if (R.track === 'road') return 0.25; return p.y + (R.st[R.curStation]?.under ? 0.9 : 0.7); }
W.prepareWaiters = function (stationIdx) {
  clearWaiters(); R.curStation = stationIdx;
  const y = platformY(), rural = ['paddy', 'karst', 'citadel', 'town'].includes(R.st[stationIdx].town);
  const fame = R.st[stationIdx].emo;
  R.veh.slots.forEach((sl, k) => {
    const grp = [];
    if (R.kind === 'truck') {
      const { p } = slotWorld(k, 9.5, (k - (R.slots - 1) / 2) * 0.2); const c = MD.crate(fame, [0xc8964f, 0xd9a35f, 0xb5803f][k % 3]); c.position.set(p.x, y, p.z); c.rotation.y = Math.atan2(T(R.veh.s).x, T(R.veh.s).z); world.add(c); grp.push(c);
    } else {
      const cnt = isSeat() ? 1 : 3, of = OUTFIT[R.kind];
      for (let j = 0; j < cnt; j++) {
        const pe = MD.person(of ? { ...of } : { cloth: CLOTH[(k * 3 + j + stationIdx) % CLOTH.length], nonla: rural && j === 1 && !isSeat(), bag: R.kind === 'car' ? 0xffd23f : R.kind === 'taxi' ? 0x8d6e63 : (j === 2 ? 0x6d4c41 : null), cap: R.kind === 'car' && k % 2 ? 0xffffff : null });
        const d = (R.track === 'road' ? 6.4 : R.track === 'metro' ? (R.st[stationIdx].under ? 5.2 : 5.0) : 4.6) + (j % 2) * 0.9, { p } = slotWorld(k, d, isSeat() ? (k - (R.slots - 1) / 2) * 1.7 : (j - 1) * 1.1);
        pe.position.set(p.x, y, p.z); pe.scale.setScalar(isSeat() ? 0.95 : 0.85);
        const sv = S(R.veh.s); pe.rotation.y = Math.atan2(-sv.x, -sv.z); world.add(pe); grp.push(pe);
      }
    }
    R.waiters[k] = grp;
  });
};
function clearWaiters() { (R.waiters || []).flat().forEach(o => o && o.parent && o.parent.remove(o)); R.waiters = []; }
function tween(o, to, dur, opt = {}) { R.anim.push({ o, from: o.position.clone(), to, dur, t: 0, ...opt }); }
W.board = function (k, done) {
  const grp = R.waiters[k] || [], y = platformY(); let left = grp.length || 1;
  const fin = () => { if (--left <= 0) { R.veh.slots[k].fill(true); done && done(); } };
  if (!grp.length) { fin(); return; }
  if (R.kind === 'truck') {
    const c = grp[0], sl = R.veh.slots[k]; const target = new V3(); sl.crate.getWorldPosition(target);
    tween(c, target, 1.0, { arc: 6, done: () => { world.remove(c); sl.crate.clear(); c.position.set(0, 0, 0); c.rotation.set(0, 0, 0); sl.crate.add(c); fin(); } });
    return;
  }
  grp.forEach((pe, j) => {
    const d = R.track === 'road' ? 2.2 : 2.0, { p } = slotWorld(k, d, isSeat() ? 0 : 1.6); p.y = y + (R.track === 'rail' ? 0.4 : 0.1);
    pe.lookAt(p.x, pe.position.y, p.z);
    setTimeout(() => tween(pe, p, 1.1, { walk: true, shrink: true, done: () => { world.remove(pe); fin(); } }), j * 180);
  });
};
W.unload = function (done) {
  const y = platformY(), filled = R.veh.slots.map((sl, k) => sl.filled() ? k : -1).filter(k => k >= 0);
  if (!filled.length) { done && done(); return; }
  filled.forEach(k => {
    const sl = R.veh.slots[k];
    if (R.kind === 'truck') {
      const box = sl.crate.children[0];
      if (box) { const from = new V3(); box.getWorldPosition(from); sl.crate.remove(box); world.add(box); box.position.copy(from); box.rotation.y = Math.atan2(T(R.veh.s).x, T(R.veh.s).z); const { p } = slotWorld(k, 12.5, (k - 1) * 0.6); p.y = 0.25; tween(box, p, 0.9, { arc: 5 }); }
      sl.fill(false); return;
    }
    sl.fill(false);
    const cnt = isSeat() ? 1 : 2, of = OUTFIT[R.kind];
    for (let j = 0; j < cnt; j++) {
      const pe = MD.person(of ? { ...of } : { cloth: CLOTH[(k + j * 3) % CLOTH.length], bag: R.kind === 'car' ? 0xffd23f : null });
      const { p } = slotWorld(k, 2.2, (j - 0.5) * 1.2); pe.position.set(p.x, y, p.z); pe.scale.setScalar(0.85); world.add(pe);
      const { p: q } = slotWorld(k, R.track === 'road' ? 14 : 10 + j, 6 + j * 2); q.y = y;
      pe.lookAt(q.x, y, q.z); tween(pe, q, 2.2, { walk: true, done: () => world.remove(pe) });
    }
  });
  setTimeout(() => done && done(), 900);
};

/* ================= driving ================= */
W.drive = function (toS, opts = {}) { R.drive = { to: toS, v: R.drive?.v || 0, vmax: opts.vmax || 22, done: opts.done }; R.camMode = 'drive'; R.camT = 0; R.funOn = !!opts.fun; };
W.headStopS = i => headStopS(i);
W.speed = () => (R && R.drive ? R.drive.v : 0);
W.redecorate = function (decor) {
  if (!R) return; R.opt.decor = decor;
  const s = R.veh.s, filled = R.veh.slots.map(sl => sl.filled());
  R.veh.parts.forEach(p => world.remove(p));
  R.veh = makeVehicle(); R.veh.s = s; placeVehicle(s, 0);
  filled.forEach((f, k) => f && R.veh.slots[k] && R.kind !== 'truck' && R.veh.slots[k].fill(true));
};
W.vehS = () => R.veh.s;
W.setBoost = on => { R.boost = on ? 1 : 0; };
W.setCamUser = m => { R.camUser = m; };
W.setCamBoard = () => { R.camMode = 'board'; };
W.setShift = (py, px = 0) => { R.cam.shiftT = py; R.cam.shiftXT = px; };
W.inTunnel = () => isTunnel(R.veh.s);
function isTunnel(s) { if (R.track === 'metro') return P(s).y < -1.5; return R.feats.some(f => f.type === 'tunnel' && Math.abs(s - f.s) < 42); }
W.stationInfo = i => R.st[i];

/* ================= camera ================= */
function snapCam() { const p = P(R.veh.s - R.veh_len / 2), sv = S(R.veh.s); R.cam.pos.copy(p).addScaledVector(sv, 70).add(new V3(0, 40, 0)); R.cam.look.copy(p); }
const SHOTS = ['chase', 'side', 'high', 'front', 'chase', 'aerial'];
function camTarget(dt) {
  const v = R.veh, lead = v.parts[0], mid = v.s - R.veh_len / 2, pm = P(mid), t = T(v.s), sv = S(v.s), tun = isTunnel(v.s) || isTunnel(mid);
  const pos = new V3(), look = new V3();
  if (R.camMode === 'mission' && R.mission) {
    const m = R.mission, c = P(m.s), tm = T(m.s), sm = S(m.s), port = innerWidth / innerHeight < 0.8, fire = m.type === 'fire';
    const back = fire ? (port ? 34 : 19) : (port ? 24 : 17), hh = fire ? (port ? 22 : 15) : (port ? 14 : 10);
    pos.copy(c).addScaledVector(sm, -back).addScaledVector(tm, fire ? -2 : 2).add(new V3(0, hh, 0));
    look.copy(c).addScaledVector(sm, fire ? 8 : 4).addScaledVector(tm, fire ? 0 : 2.5).add(new V3(0, 1.5, 0));
    return { pos, look, k: 2 };
  }
  if (R.camMode === 'board') {
    const under = R.track === 'metro' && P(mid).y < -1.5;
    const dist = under ? 15.5 : 15 + R.veh_len * 0.4 + (R.track === 'road' ? 5 : 0), h = under ? 5.5 : 7 + R.veh_len * 0.12;
    const sd = R.track === 'road' ? -1 : 1;
    pos.copy(pm).addScaledVector(sv, sd * dist).addScaledVector(t, -3).add(new V3(0, h, 0));
    look.copy(pm).addScaledVector(sv, sd > 0 ? 1.5 : 3.5).add(new V3(0, 2.2, 0));
    return { pos, look, k: 1.6 };
  }
  let shot = R.camUser === 'auto' ? SHOTS[Math.floor(R.camT / 7) % SHOTS.length] : R.camUser;
  if (R.track === 'road' && R.funOn) shot = 'chase'; // bé lái xe: luôn nhìn từ sau xe để ◀ ▶ đúng hướng
  if (tun) shot = 'tunnel';
  const lp = lead.position;
  if (shot === 'chase') { pos.copy(lp).addScaledVector(t, -20).add(new V3(0, 9, 0)); look.copy(lp).addScaledVector(t, 10).add(new V3(0, 2, 0)); }
  else if (shot === 'side') { pos.copy(P(v.s - R.veh_len * 0.4)).addScaledVector(sv, -22).addScaledVector(t, 10).add(new V3(0, 5, 0)); look.copy(P(v.s - R.veh_len * 0.4)).add(new V3(0, 2.5, 0)); }
  else if (shot === 'front') { pos.copy(lp).addScaledVector(t, 22).addScaledVector(sv, 7).add(new V3(0, 4, 0)); look.copy(P(v.s - 8)).add(new V3(0, 2.5, 0)); }
  else if (shot === 'high') { pos.copy(lp).addScaledVector(t, -45).add(new V3(0, 38, 0)); look.copy(lp).addScaledVector(t, 25); }
  else if (shot === 'aerial') { pos.copy(lp).addScaledVector(sv, 60).addScaledVector(t, 30).add(new V3(0, 55, 0)); look.copy(lp).addScaledVector(t, 15); }
  else { pos.copy(P(v.s + 15)).addScaledVector(sv, 1.2).add(new V3(0, 3.6, 0)); look.copy(P(v.s - 6)).add(new V3(0, 2.2, 0)); return { pos, look, k: 5 }; }
  return { pos, look, k: shot === 'chase' ? 2.6 : 1.8 };
}

/* ================= update ================= */
const _v = new V3(), FOG_T = new THREE.Color(0x2e3033), FOG_N = new THREE.Color(0xdff4ff);
W.update = function (dt, time) {
  if (!R) { renderer.render(scene, camera); return; }
  // driving
  const v = R.veh; let moving = false;
  if (R.drive) {
    const d = R.drive, rem = d.to - v.s, vmax = d.vmax * (R.boost ? 1.55 : 1), acc = 7;
    d.v = Math.min(vmax, d.v + acc * dt, Math.sqrt(Math.max(0, 2 * acc * 0.9 * rem)) + 0.6);
    const step = Math.min(rem, d.v * dt);
    placeVehicle(v.s + step, step); v.s += step; moving = true; R.camT += dt;
    if (R.track === 'road' && rem < 45) { R.latT = 0; R.lane = 0; }
    R.lat += (R.latT - R.lat) * (1 - Math.exp(-dt * 6));
    if (rem - step < 0.02) { v.s = d.to; d.v = 0; R.funOn = false; if (Math.abs(R.lat) < 0.3) { R.lat = R.latT = 0; R.lane = 0; placeVehicle(v.s, 0); } const cb = d.done; R.drive = null; cb && cb(); }
  }
  ensureChunks(v.s);
  // anims
  for (let i = R.anim.length - 1; i >= 0; i--) {
    const a = R.anim[i]; a.t += dt; const u = Math.min(1, a.t / a.dur), e = u * u * (3 - 2 * u);
    a.o.position.lerpVectors(a.from, a.to, e); if (a.arc) a.o.position.y += Math.sin(Math.PI * u) * a.arc;
    if (a.walk) { const L = a.o.userData.legs; if (L) { L[0].rotation.x = Math.sin(a.t * 12) * 0.6; L[1].rotation.x = -Math.sin(a.t * 12) * 0.6; } a.o.position.y += Math.abs(Math.sin(a.t * 12)) * 0.08; }
    if (a.shrink && u > 0.75) a.o.scale.setScalar(0.85 * (1 - (u - 0.75) * 4 * 0.9));
    if (u >= 1) { R.anim.splice(i, 1); a.done && a.done(); }
  }
  // waiters idle: vẫy tay
  (R.waiters || []).flat().forEach((o, i) => { const A = o.userData.arms; if (A) A[1].rotation.z = 2.3 + Math.sin(time * 5 + i) * 0.4; });
  R.spins.forEach(s => { s.o.rotation[s.axis] += s.v * dt; });
  R.bobs.forEach(b => { b.o.position.y = b.y + Math.sin(time * 1.6 + b.ph) * 0.18; b.o.rotation.z = Math.sin(time + b.ph) * 0.05; });
  updateFx(dt, moving);
  updateFun(dt, time, moving);
  // ground colour by zone
  const want = new THREE.Color(BIOMES[biomeAt(v.s)].ground); R.groundCol.lerp(want, 1 - Math.exp(-dt * 0.8)); ground.material.color.copy(R.groundCol);
  // underground / tunnel atmosphere
  const tun = isTunnel(v.s);
  scene.fog.color.lerp(tun ? FOG_T : FOG_N, 1 - Math.exp(-dt * 3));
  scene.fog.near = lerp(scene.fog.near, tun ? 30 : 160, 1 - Math.exp(-dt * 3)); scene.fog.far = lerp(scene.fog.far, tun ? 140 : 520, 1 - Math.exp(-dt * 3));
  hemi.intensity = lerp(hemi.intensity, tun ? 0.9 : 1.35, 1 - Math.exp(-dt * 3));
  // camera
  const ct = camTarget(dt), k = 1 - Math.exp(-dt * ct.k);
  R.cam.pos.lerp(ct.pos, k); R.cam.look.lerp(ct.look, k);
  camera.position.copy(R.cam.pos); camera.lookAt(R.cam.look);
  const fovT = (innerWidth / innerHeight < 0.8 ? 62 : 48) + (R.boost && moving ? 10 : 0); R.cam.fov = lerp(R.cam.fov, fovT, 1 - Math.exp(-dt * 3)); camera.fov = R.cam.fov;
  R.cam.shift += (R.cam.shiftT - R.cam.shift) * (1 - Math.exp(-dt * 4)); R.cam.shiftX += (R.cam.shiftXT - R.cam.shiftX) * (1 - Math.exp(-dt * 4));
  const w = innerWidth, h = innerHeight;
  if (Math.abs(R.cam.shift) > 0.5 || Math.abs(R.cam.shiftX) > 0.5) camera.setViewOffset(w, h, R.cam.shiftX, R.cam.shift, w, h); else if (camera.view && camera.view.enabled) camera.clearViewOffset();
  camera.updateProjectionMatrix();
  const lp = v.parts[0].position;
  sun.position.set(lp.x + 45, lp.y + 90, lp.z + 30); sun.target.position.copy(lp);
  ground.position.x = lp.x; ground.position.z = lp.z; sky.position.copy(camera.position);
  renderer.render(scene, camera);
};

/* ---------- boost sparkles ---------- */
const fx = [];
let smokeT = 0; const smoke = [];
const RAINBOW = [0xff595e, 0xff924c, 0xffca3a, 0x8ac926, 0x1982c4, 0x6a4c93].map(c => new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: 0.8, depthWrite: false, roughness: 1 }));
function updateSmoke(dt, moving) {
  if (R.kind !== 'train') return;
  const loco = R.veh.parts[0], rainbow = (R.opt.decor || []).includes('rainbow');
  smokeT -= dt;
  if (smokeT <= 0 && smoke.length < 45) {
    smokeT = moving ? 0.09 : 0.5;
    const m = new THREE.Mesh(gc('puff', () => new THREE.SphereGeometry(0.5, 10, 8)), rainbow ? RAINBOW[smoke.length % 6].clone() : new THREE.MeshStandardMaterial({ color: 0xf5f5f5, transparent: true, opacity: 0.75, depthWrite: false, roughness: 1 }));
    m.position.copy(loco.userData.chimney).applyMatrix4(loco.matrixWorld); world.add(m); smoke.push({ m, life: 1, vx: (Math.random() - 0.5) * 0.8, vz: (Math.random() - 0.5) * 0.8 });
  }
  for (let i = smoke.length - 1; i >= 0; i--) { const o = smoke[i]; o.life -= dt * 0.6; o.m.position.y += dt * 2.6; o.m.position.x += o.vx * dt; o.m.position.z += o.vz * dt; o.m.scale.setScalar(0.5 + (1 - o.life) * 2); o.m.material.opacity = Math.max(0, o.life) * 0.7; if (o.life <= 0) { o.m.parent && o.m.parent.remove(o.m); o.m.material.dispose(); smoke.splice(i, 1); } }
}
function updateFx(dt, moving) {
  updateSmoke(dt, moving); const tt = performance.now() / 1000; DC.animateDecor(R.veh.parts, tt);
  R.veh.parts.forEach(p => (p.userData.sirens || []).forEach(s => { s.m.emissiveIntensity = Math.sin(tt * 9 + s.ph) > 0 ? 2.6 : 0.15; }));
  if (R.boost && moving && fx.length < 80) {
    const p = R.veh.parts[R.veh.parts.length - 1].position, m = new THREE.Mesh(gc('spark', () => new THREE.OctahedronGeometry(0.35, 0)), mat([0xffd23f, 0xff70a6, 0x4cc9f0, 0xffffff][fx.length % 4], { emissive: 0xffffff, emissiveIntensity: 0.6 }));
    m.position.set(p.x + (Math.random() - 0.5) * 3, p.y + 1 + Math.random() * 3, p.z + (Math.random() - 0.5) * 3); world.add(m); fx.push({ m, life: 1 });
  }
  for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.life -= dt * 1.2; f.m.position.y += dt * 1.5; f.m.rotation.y += dt * 4; f.m.scale.setScalar(Math.max(0.01, f.life)); if (f.life <= 0) { f.m.parent && f.m.parent.remove(f.m); fx.splice(i, 1); } }
}
W.renderer = () => renderer;

/* ================= phần thưởng khi xe chạy: lái đổi làn, nhặt sao, tránh vật cản ================= */
// Sự kiện gửi ra game.js: W.onEvt(type, data) – 'coin' {n, x, y}, 'bump' {kind}, 'fireLeft' {n}, 'missionDone' {type}, 'picked' {type}
W.onEvt = () => { };
const emit = (t, d) => { try { W.onEvt(t, d || {}); } catch (e) { console.error(e); } };
const LANE = 2.7;
const STAR_MAT = () => mat(0xffd23f, { emissive: 0xffb703, emissiveIntensity: 0.55, metalness: 0.3, roughness: 0.35 });
function starGeo() {
  return gc('star5', () => { const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.42 : 1, a = Math.PI / 2 + i * Math.PI / 5; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? sh.lineTo(x, y) : sh.moveTo(x, y); } sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 1 }); g.center(); return g; });
}
function makeStar(k = 0.75) { const m = new THREE.Mesh(starGeo(), STAR_MAT()); m.scale.setScalar(k); m.castShadow = true; return m; }
function screenOf(o) { const p = new V3(); o.getWorldPosition(p); p.project(camera); return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight, z: p.z }; }
W.spawnFun = function (a, b, opt = {}) {
  clearItems();
  const road = R.track === 'road', avoid = opt.avoid || [], rng = Math.random;
  const ok = s => !avoid.some(x => Math.abs(x - s) < 50) && !R.stationS.some(x => Math.abs(x - s) < 40);
  let lastObs = -99;
  for (let s = a; s < b; s += road ? 13 + rng() * 6 : 16 + rng() * 8) {
    if (!ok(s)) continue;
    if (road) {
      const r = rng();
      if (r < 0.26 && s - lastObs > 24) {
        lastObs = s; const lane = Math.floor(rng() * 3) - 1, kind = ['buffalo', 'cone', 'hole'][Math.floor(rng() * 3)];
        addItem(kind, s, lane * LANE);
        const free = [-1, 0, 1].filter(l => l !== lane); addItem('star', s + 1, free[Math.floor(rng() * 2)] * LANE);
      } else if (r < 0.38) addItem('gift', s, (Math.floor(rng() * 3) - 1) * LANE, opt.emoji);
      else { const lane = Math.floor(rng() * 3) - 1; addItem('star', s, lane * LANE); if (rng() < 0.5) addItem('star', s + 3.2, lane * LANE); }
    } else addItem('star', s, (rng() < 0.5 ? -1 : 1) * (3.6 + rng() * 1.4));
  }
};
function addItem(kind, s, d, emoji) {
  const p = at(s, d), y0 = P(s).y; p.y = y0; let o;
  if (kind === 'star') { o = makeStar(R.track === 'road' ? 0.7 : 0.95); p.y += R.track === 'road' ? 1.3 : 3.0; }
  else if (kind === 'gift') { o = MD.crate(emoji || '🎁', 0xffb703); o.scale.setScalar(0.55); }
  else if (kind === 'buffalo') { o = MD.buffalo(); o.scale.setScalar(0.85); }
  else if (kind === 'cone') { o = new THREE.Group(); [-0.7, 0.7].forEach(x => { const c = new THREE.Mesh(gc('cone', () => new THREE.ConeGeometry(0.4, 1.1, 12)), mat(0xff6d00)); c.position.set(x, 0.55, 0); c.castShadow = true; o.add(c); const st = new THREE.Mesh(gc('coneS', () => new THREE.CylinderGeometry(0.24, 0.3, 0.16, 12)), mat(0xffffff)); st.position.set(x, 0.62, 0); o.add(st); }); }
  else { o = new THREE.Mesh(gc('hole', () => new THREE.CircleGeometry(1.0, 18)), mat(0x2b2b2b, { roughness: 1 })); o.rotation.x = -Math.PI / 2; p.y += 0.09; o.scale.set(1.2, 0.8, 1); }
  o.position.copy(p); if (kind !== 'hole') o.rotation.y = Math.atan2(T(s).x, T(s).z) + (kind === 'buffalo' ? Math.PI / 2 : 0);
  world.add(o); R.items.push({ kind, s, d, o, y: p.y, done: false, ph: Math.random() * 6 });
}
function clearItems() { R.items.forEach(it => it.o.parent && it.o.parent.remove(it.o)); R.items = []; }
W.clearFun = clearItems;
function collect(it) {
  if (it.done) return; it.done = true;
  const sc = screenOf(it.o), n = it.kind === 'gift' ? 1 : 1;
  R.fly.push({ o: it.o, t: 0, y: it.o.position.y }); emit('coin', { n, x: sc.x, y: sc.y, kind: it.kind });
}
W.steer = function (dir) { // dir: +1 = sang phải màn hình, −1 = sang trái
  if (!R || R.track !== 'road' || !R.drive || !R.funOn || R.drive.to - R.veh.s < 45) return false;
  R.lane = Math.max(-1, Math.min(1, R.lane - dir)); R.latT = R.lane * LANE; return true; // camera sau xe: phải màn hình = −S
};
W.lane = () => R.lane;
W.tapAt = function (x, y) {
  if (!R) return false;
  if (R.mission && R.mission.type !== 'fire' && !R.mission.picked) { const t = screenOf(R.mission.target); if (Math.hypot(t.x - x, t.y - y) < 130) { W.missionTap(x, y, true); return true; } }
  let best = null, bd = 80;
  R.items.forEach(it => { if (it.done || it.kind !== 'star') return; const sc = screenOf(it.o); if (sc.z > 1) return; const dd = Math.hypot(sc.x - x, sc.y - y); if (dd < bd) { bd = dd; best = it; } });
  if (best) { collect(best); return true; }
  return false;
};
function updateFun(dt, time, moving) {
  const v = R.veh;
  for (let i = R.items.length - 1; i >= 0; i--) {
    const it = R.items[i];
    if (!it.done && (it.kind === 'star' || it.kind === 'gift')) { it.o.rotation.y += dt * 2.5; it.o.position.y = it.y + Math.sin(time * 3 + it.ph) * 0.18 + (it.kind === 'gift' ? 0.3 : 0); }
    if (R.track === 'road' && !it.done && v.s + 2.2 >= it.s && v.s - 2.5 <= it.s && Math.abs(R.lat - it.d) < 1.45) {
      if (it.kind === 'star' || it.kind === 'gift') collect(it);
      else { it.done = true; if (R.drive) R.drive.v *= 0.35; R.wob = 0.6; emit('bump', { kind: it.kind }); if (it.kind === 'cone') it.o.children.forEach(c => { c.rotation.z = 1.4; c.position.y = 0.4; }); if (it.kind === 'buffalo') tween(it.o, at(it.s, it.d > 0 ? 9 : -9), 1.6, { walk: true }); }
    }
    if (it.s < v.s - 35 && !R.fly.some(f => f.o === it.o)) { it.o.parent && it.o.parent.remove(it.o); R.items.splice(i, 1); }
  }
  for (let i = R.fly.length - 1; i >= 0; i--) { const f = R.fly[i]; f.t += dt; f.o.position.y = f.y + f.t * 9; f.o.rotation.y += dt * 14; f.o.scale.multiplyScalar(1 - dt * 1.6); if (f.t > 0.7) { f.o.parent && f.o.parent.remove(f.o); R.fly.splice(i, 1); } }
  if (R.wob > 0) { R.wob -= dt; const p = v.parts[0]; p.rotation.z += Math.sin(R.wob * 40) * 0.05 * R.wob; }
  // khách nhảy mừng
  for (let i = R.jumps.length - 1; i >= 0; i--) { const j = R.jumps[i]; j.t += dt; j.o.position.y = j.y + Math.abs(Math.sin(j.t * 9)) * 0.9 * Math.max(0, 1 - j.t / 1.1); const A = j.o.userData.arms; if (A) { A[0].rotation.z = -2.6; A[1].rotation.z = 2.6; } if (j.t > 1.1) { j.o.position.y = j.y; if (A) { A[0].rotation.z = -0.25; A[1].rotation.z = 0.25; } R.jumps.splice(i, 1); } }
  updateMission(dt, time);
}
W.cheer = function (k) { (R.waiters[k] || []).forEach(o => { if (!R.jumps.some(j => j.o === o)) R.jumps.push({ o, t: Math.random() * 0.15, y: o.position.y }); }); };

/* ================= nhiệm vụ xe ưu tiên ================= */
W.missionS = i => R.stationS[i] + R.legLen * (R.feats.some(f => f.leg === i) ? 0.78 : 0.5);
const FIRE_D = 10, FIRE_U = [-9, 0, 9];
function hut(col) { const g = new THREE.Group(); rbox(3.4, 2.4, 3.0, 0.12, col, 0, 1.2, 0, g); const rf = new THREE.Mesh(gc('hutRoof', () => new THREE.ConeGeometry(2.8, 1.6, 4)), mat(0x9c4a2b)); rf.position.y = 3.2; rf.rotation.y = Math.PI / 4; rf.castShadow = true; g.add(rf); rbox(0.9, 1.4, 0.1, 0.05, 0x6d4c41, 0, 0.7, 1.52, g); return g; }
const FLAME_M = [mat(0xff5400, { emissive: 0xff3d00, emissiveIntensity: 1.2, transparent: true, opacity: 0.92 }), mat(0xffb703, { emissive: 0xffa000, emissiveIntensity: 1.4, transparent: true, opacity: 0.9 }), mat(0xffe066, { emissive: 0xffd000, emissiveIntensity: 1.6, transparent: true, opacity: 0.85 })];
function flames() { const g = new THREE.Group(); const L = []; for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(gc('flame', () => new THREE.ConeGeometry(0.95, 3.0, 9)), FLAME_M[i % 3]); f.position.set((Math.random() - 0.5) * 3.0, 1.4 + Math.random() * 0.9, (Math.random() - 0.5) * 2.6); f.userData.ph = Math.random() * 6; f.userData.k = 0.7 + Math.random() * 0.6; g.add(f); L.push(f); } g.userData.L = L; return g; }
W.setupMission = function (type) {
  W.endMission();
  const sm = R.veh.s, g = new THREE.Group(); world.add(g);
  const m = R.mission = { type, s: sm, g, fires: [], aimU: 0, aimUT: 0, steer: 0, spray: false, sprayT: 0, drops: [], smokes: [], done: false, picked: false };
  const yaw = Math.atan2(T(sm).x, T(sm).z);
  if (type === 'fire') {
    FIRE_U.forEach(du => {
      const s = sm + du, h = hut([0xfff1c9, 0xffe0b2, 0xe8f4ff][m.fires.length]); h.position.copy(at(s, FIRE_D + 2.2)); h.rotation.y = yaw + Math.PI; g.add(h);
      const fl = flames(); fl.position.copy(at(s, FIRE_D + 2.2)); fl.position.y = 2.0; g.add(fl);
      m.fires.push({ du, level: 1, hut: h, fl, smokeT: 0, out: false });
    });
    const ret = new THREE.Group(); const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 2.0, 32), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ret.add(ring);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16), ring.material); dot.rotation.x = -Math.PI / 2; ret.add(dot);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 10), mat(0x3a86ff, { emissive: 0x3a86ff, emissiveIntensity: 0.5 })); arrow.rotation.x = Math.PI; arrow.position.y = 2.6; ret.add(arrow); ret.userData.arrow = arrow; ret.userData.ring = ring;
    ret.position.copy(at(sm, FIRE_D)); ret.position.y = 0.12; g.add(ret); m.ret = ret;
    emit('fireLeft', { n: 3 });
  } else if (type === 'ambulance') {
    const p = at(sm + 5, 7.6); const st = new THREE.Group(); st.position.copy(p); st.rotation.y = yaw; g.add(st);
    rbox(1.3, 0.25, 2.6, 0.08, 0xffffff, 0, 0.35, 0, st); rbox(1.4, 0.1, 2.7, 0.04, 0xe63946, 0, 0.2, 0, st);
    const pa = MD.person({ cloth: 0x90caf9 }); pa.rotation.x = -Math.PI / 2; pa.position.set(0, 0.85, 1.0); pa.scale.setScalar(0.8); st.add(pa);
    const helper = MD.person({ cloth: 0xffb703 }); helper.position.copy(at(sm + 7.2, 8.6)); helper.scale.setScalar(0.85); helper.rotation.y = yaw + Math.PI; g.add(helper); m.helper = helper;
    m.target = st;
  } else {
    const kid = MD.person({ cloth: 0xff70a6 }); kid.scale.setScalar(0.6); kid.position.copy(at(sm + 5, 7.4)); kid.rotation.y = Math.atan2(-S(sm).x, -S(sm).z); g.add(kid); m.target = kid;
    const tears = [-0.2, 0.2].map(x => { const t = MD.ball(0.07, 0x4cc9f0, x, -0.05, 0.55, kid.userData.head, 8); return t; }); m.tears = tears;
  }
  if (m.target) { const mk = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 10), mat(0xffd23f, { emissive: 0xffb703, emissiveIntensity: 0.8 })); mk.rotation.x = Math.PI; const tp = m.target.position.clone(); mk.position.set(tp.x, 3.6, tp.z); g.add(mk); m.marker = mk; }
  R.camMode = 'mission';
};
W.endMission = function () { const m = R && R.mission; if (!m) return; m.drops.forEach(d => d.m.parent && d.m.parent.remove(d.m)); m.smokes.forEach(d => d.m.parent && d.m.parent.remove(d.m)); m.g.parent && m.g.parent.remove(m.g); R.mission = null; if (R.camMode === 'mission') R.camMode = 'drive'; };
W.mission = () => R && R.mission && { type: R.mission.type, aimU: R.mission.aimU, spray: R.mission.spray, left: R.mission.fires.filter(f => !f.out).length, levels: R.mission.fires.map(f => +f.level.toFixed(2)), done: R.mission.done, picked: R.mission.picked };
W.spray = on => { const m = R && R.mission; if (!m || m.type !== 'fire' || m.done) return; if (on && !m.spray) m.sprayT = 0; m.spray = !!on; };
W.missionSteer = dir => { const m = R && R.mission; if (m) m.steer = dir; };
const _ray = new THREE.Raycaster(), _plane = new THREE.Plane(new V3(0, 1, 0), 0), _hit = new V3();
W.missionAim = function (x, y) {
  const m = R && R.mission; if (!m || m.type !== 'fire') return;
  _ray.setFromCamera({ x: x / innerWidth * 2 - 1, y: -(y / innerHeight) * 2 + 1 }, camera);
  if (!_ray.ray.intersectPlane(_plane, _hit)) return;
  const c = P(m.s), t = T(m.s); m.aimUT = Math.max(-15, Math.min(15, (_hit.x - c.x) * t.x + (_hit.z - c.z) * t.z));
};
W.missionTap = function (x, y, force) {
  const m = R && R.mission; if (!m || m.done) return false;
  if (m.type === 'fire') { if (force) { m.fires.forEach(f => { f.level = 0; }); return true; } W.missionAim(x, y); return true; }
  if (m.picked) return false; m.picked = true; if (m.marker) m.marker.visible = false;
  const v = R.veh, door = at(v.s - 1, 2.0); door.y = 0.05;
  if (m.type === 'ambulance') {
    const doc = MD.person({ ...OUTFIT.ambulance }); doc.scale.setScalar(0.85); doc.position.copy(door); m.g.add(doc);
    const near = at(m.s + 6.4, 7.0); doc.lookAt(near.x, 0, near.z);
    tween(doc, near, 1.0, { walk: true, done: () => { m.helper && (m.helper.userData.arms[1].rotation.z = 2.4); tween(m.target, door.clone().setY(0.05), 1.4, { walk: false, done: () => { m.g.remove(m.target); } }); doc.lookAt(door.x, 0, door.z); tween(doc, door.clone(), 1.4, { walk: true, shrink: true, done: () => { m.g.remove(doc); m.done = true; emit('picked', { type: m.type }); } }); } });
  } else {
    const cop = MD.person({ ...OUTFIT.police }); cop.scale.setScalar(0.85); cop.position.copy(door); m.g.add(cop);
    const near = at(m.s + 6.2, 6.6); cop.lookAt(near.x, 0, near.z);
    (m.tears || []).forEach(t => t.visible = false);
    tween(cop, near, 1.0, { walk: true, done: () => { const kid = m.target; kid.lookAt(door.x, kid.position.y, door.z); cop.lookAt(door.x, 0, door.z); tween(kid, door.clone().setY(kid.position.y), 1.3, { walk: true, shrink: true, done: () => m.g.remove(kid) }); tween(cop, door.clone(), 1.3, { walk: true, shrink: true, done: () => { m.g.remove(cop); m.done = true; emit('picked', { type: m.type }); } }); } });
  }
  return true;
};
const DROP_G = new THREE.SphereGeometry(0.3, 7, 5), DROP_M = new THREE.MeshBasicMaterial({ color: 0x2f9bff, transparent: true, opacity: 0.95, depthWrite: false, depthTest: false });
const SPLASH_M = new THREE.MeshBasicMaterial({ color: 0xe3f4ff, transparent: true, opacity: 0.95, depthWrite: false, depthTest: false });
const JET_N = 46, JET_G = new THREE.SphereGeometry(0.42, 8, 6), JET_M = new THREE.MeshBasicMaterial({ color: 0x4fb3ff, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false });
JET_G.userData.shared = true;
DROP_G.userData.shared = true;
const SMOKE_M = () => new THREE.MeshStandardMaterial({ color: 0x8d8f94, transparent: true, opacity: 0.6, depthWrite: false, roughness: 1 });
function updateMission(dt, time) {
  const m = R.mission; if (!m) return;
  if (m.marker) { m.marker.position.y = 3.6 + Math.sin(time * 4) * 0.3; m.marker.rotation.y += dt * 2; }
  if (m.tears) m.tears.forEach((t, i) => { t.position.y = -0.05 - ((time * 0.8 + i * 0.5) % 1) * 0.4; });
  if (m.type !== 'fire') return;
  // ngắm
  if (m.steer) m.aimUT = Math.max(-15, Math.min(15, m.aimUT + m.steer * 11 * dt));
  m.aimU += (m.aimUT - m.aimU) * (1 - Math.exp(-dt * 10));
  const A = at(m.s + m.aimU, FIRE_D); m.ret.position.set(A.x, 0.12, A.z);
  m.ret.userData.arrow.position.y = 2.6 + Math.sin(time * 6) * 0.25; m.ret.userData.ring.material.color.setHex(m.spray ? 0x4cc9f0 : 0xffd23f);
  // phun nước: hạt bay cung parabol từ vòi tới điểm ngắm
  const truck = R.veh.parts[0]; truck.updateMatrixWorld();
  // tia nước liền (luôn vẽ đè lên xe để bé thấy rõ)
  if (!m.jet) { m.jet = new THREE.InstancedMesh(JET_G, JET_M, JET_N); m.jet.renderOrder = 20; m.jet.frustumCulled = false; m.jet.visible = false; m.g.add(m.jet); m.jetD = new THREE.Object3D(); }
  m.jetL = Math.max(0, Math.min(1, (m.jetL || 0) + (m.spray && !m.done ? dt / 0.35 : -dt / 0.25)));
  m.jet.visible = m.jetL > 0.01;
  if (m.jet.visible) {
    const noz = new V3(0, 3.95, 1.3).applyMatrix4(truck.matrixWorld), Tt = 1.0, G = 16, vel = A.clone().sub(noz).divideScalar(Tt); vel.y += 0.5 * G * Tt;
    const tail = m.spray ? 0 : 1 - m.jetL, head = m.spray ? m.jetL : 1;
    for (let i = 0; i < JET_N; i++) {
      const u = i / (JET_N - 1), on = u <= head && u >= tail, t = u * Tt, w = Math.sin(time * 30 + i * 0.9) * 0.08;
      m.jetD.position.set(noz.x + vel.x * t + w, noz.y + vel.y * t - 0.5 * G * t * t, noz.z + vel.z * t - w);
      m.jetD.scale.setScalar(on ? 0.7 + u * 0.9 : 0.0001); m.jetD.updateMatrix(); m.jet.setMatrixAt(i, m.jetD.matrix);
    }
    m.jet.instanceMatrix.needsUpdate = true;
  }
  if (m.spray && !m.done) {
    m.sprayT += dt;
    const noz = new V3(0, 3.95, 1.3).applyMatrix4(truck.matrixWorld), G = 18;
    // bọt nước bắn lên ở chỗ nước rơi xuống
    if (m.sprayT > 0.35) { m.sacc = (m.sacc || 0) + dt * 70; const ns = Math.floor(m.sacc); m.sacc -= ns; for (let k = 0; k < ns && m.drops.length < 420; k++) { const p0 = A.clone().add(new V3((Math.random() - 0.5) * 1.2, 0.3, (Math.random() - 0.5) * 1.2)), Tt = 0.45 + Math.random() * 0.25, v = new V3((Math.random() - 0.5) * 7, 0, (Math.random() - 0.5) * 7); v.y = 0.5 * G * Tt; const d = new THREE.Mesh(DROP_G, SPLASH_M); d.renderOrder = 21; d.position.copy(p0); d.scale.setScalar(0.6); m.g.add(d); m.drops.push({ m: d, p0, v, t: 0, T: Tt, G, sp: true }); } }
    m.acc = (m.acc || 0) + dt * 90; const nNew = Math.floor(m.acc); m.acc -= nNew;
    for (let k = 0; k < nNew && m.drops.length < 320; k++) {
      const tgt = A.clone().add(new V3((Math.random() - 0.5) * 2.2, 0, (Math.random() - 0.5) * 2.2)), Tt = 0.9 + Math.random() * 0.2;
      const vel = tgt.clone().sub(noz).divideScalar(Tt); vel.y += 0.5 * G * Tt;
      const d = new THREE.Mesh(DROP_G, DROP_M); d.renderOrder = 21; d.position.copy(noz); m.g.add(d); m.drops.push({ m: d, p0: noz.clone(), v: vel, t: (k / Math.max(1, nNew)) * dt, T: Tt, G });
    }
  }
  for (let i = m.drops.length - 1; i >= 0; i--) {
    const d = m.drops[i]; d.t += dt; const t = Math.max(0, d.t);
    d.m.position.set(d.p0.x + d.v.x * t, d.p0.y + d.v.y * t - 0.5 * d.G * t * t, d.p0.z + d.v.z * t);
    d.m.scale.setScalar(d.sp ? 0.6 * (1 - t / d.T * 0.5) : 0.8 + t * 0.8);
    if (d.t >= d.T) { m.g.remove(d.m); m.drops.splice(i, 1); }
  }
  // lửa giảm khi ngắm trúng
  let left = 0;
  m.fires.forEach(f => {
    if (!f.out && m.spray && m.sprayT > 0.35 && Math.abs(m.aimU - f.du) < 4.0) f.level = Math.max(0, f.level - dt / 3.4);
    if (!f.out && f.level <= 0) { f.out = true; f.fl.visible = false; f.smokeT = 4; f.hut.children[0].material = mat(0x8d8478); emit('fireLeft', { n: m.fires.filter(x => !x.out).length }); }
    if (!f.out) { left++; const k = 0.25 + 0.85 * f.level; f.fl.userData.L.forEach(fl => { const u = fl.userData; fl.scale.set(k * u.k, k * u.k * (0.8 + 0.35 * Math.sin(time * 11 + u.ph)), k * u.k); }); }
    if (f.smokeT > 0 || (!f.out && f.level < 0.95 && m.spray)) {
      f.smokeT -= dt; if (Math.random() < dt * 9 && m.smokes.length < 70) { const sm = new THREE.Mesh(gc('puff', () => new THREE.SphereGeometry(0.5, 10, 8)), SMOKE_M()); sm.position.copy(f.fl.position).add(new V3((Math.random() - 0.5) * 2, 0.8, (Math.random() - 0.5) * 2)); m.g.add(sm); m.smokes.push({ m: sm, life: 1 }); }
    }
  });
  for (let i = m.smokes.length - 1; i >= 0; i--) { const o = m.smokes[i]; o.life -= dt * 0.45; o.m.position.y += dt * 2.2; o.m.scale.setScalar(0.8 + (1 - o.life) * 2.6); o.m.material.opacity = Math.max(0, o.life) * 0.6; if (o.life <= 0) { m.g.remove(o.m); o.m.material.dispose(); m.smokes.splice(i, 1); } }
  if (!left && !m.done) { m.done = true; m.spray = false; emit('missionDone', { type: 'fire' }); }
}
/* ---------- tới trạm: gặp người nhà ---------- */
W.meetFamily = function (type, done) {
  const v = R.veh, y = platformY(), g = new THREE.Group(); world.add(g);
  const fam = [MD.person({ cloth: 0x2a9d8f }), MD.person({ cloth: 0xe63946, nonla: type === 'ambulance' })];
  fam.forEach((p, j) => { p.position.copy(at(v.s - 2 + j * 1.4, 7.2)); p.position.y = y; p.scale.setScalar(0.85); const sv = S(v.s); p.rotation.y = Math.atan2(-sv.x, -sv.z); g.add(p); R.jumps.push({ o: p, t: 0, y }); });
  const who = type === 'police' ? MD.person({ cloth: 0xff70a6 }) : MD.person({ cloth: 0x90caf9 }); who.scale.setScalar(type === 'police' ? 0.6 : 0.85);
  const door = at(v.s - 1, 2.2); door.y = y; who.position.copy(door); g.add(who);
  const to = at(v.s - 1.3, 6.4); to.y = y; who.lookAt(to.x, y, to.z);
  tween(who, to, 1.3, { walk: true, done: () => {
    for (let i = 0; i < 6; i++) { const h = sign('❤️', 1, 1, '#ffffff00', '#e63946'); h.position.set(to.x + (Math.random() - 0.5) * 2, y + 2.4 + Math.random(), to.z + (Math.random() - 0.5) * 2); g.add(h); h.lookAt(camera.position); R.fly.push({ o: h, t: -i * 0.12, y: h.position.y }); }
    fam.forEach(p => R.jumps.push({ o: p, t: 0, y }));
    setTimeout(() => { world.remove(g); done && done(); }, 1700);
  } });
};
