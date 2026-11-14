// Lõi 3D: đường đi dài, dựng cảnh theo từng đoạn, ga, phương tiện, khách lên toa, máy quay
import * as THREE from 'three';
import * as MD from './models.js';
import * as SC from './scenery.js';
import { BIOMES } from './data.js';
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
  R = { opt, st, n, legLen, track, kind: opt.kind, slots: opt.slots, trackHalf: track === 'road' ? 5.2 : 3.4, chunks: new Map(), spins: [], bobs: [], tweens: [], stationS: [], feats: [], anim: [], camMode: 'board', camUser: 'auto', boost: 0, waiters: [], delivered: [] };
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
  else add(MD.truck(paint.truck[0], paint.truck[1]), 0);
  DC.applyDecor(parts, R.kind, decor);
  const off = []; let acc = 0; gaps.forEach(g => { acc += g; off.push(acc); });
  R.veh_len = acc + (R.kind === 'car' ? 5 : R.kind === 'truck' ? 9 : 8);
  const v = { parts, off, s: 0, y: R.track === 'rail' ? 0.32 : R.track === 'metro' ? 0.2 : 0.05, slots: [] };
  for (let k = 0; k < n; k++) {
    if (R.kind === 'train' || R.kind === 'metro') { const part = parts[R.kind === 'train' ? k + 1 : k], oi = R.kind === 'train' ? k + 1 : k; v.slots.push({ dz: () => -off[oi], fill: on => MD.setFilled(part, on), filled: () => !!part.userData.filled }); }
    else if (R.kind === 'car') { const car = parts[0], h = car.userData.seats[k % 4]; v.slots.push({ dz: () => 0, fill: on => { h.visible = on; }, filled: () => h.visible }); }
    else { const tr = parts[0], bed = tr.userData.bed, c = new THREE.Group(); tr.add(c); const z = n === 1 ? (bed.z0 + bed.z1) / 2 : bed.z0 + 0.9 + k * ((bed.z1 - bed.z0 - 1.8) / (n - 1)); c.position.set(0, bed.y, z); c.visible = false; v.slots.push({ dz: () => z, crate: c, fill: on => { c.visible = on; }, filled: () => c.visible }); }
  }
  return v;
}
function placeVehicle(s, ds) {
  const v = R.veh, a = new V3(), b = new V3();
  v.parts.forEach((p, i) => {
    const ss = s - v.off[i]; P(ss, a); P(ss + 1.5, b);
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
      const cnt = R.kind === 'car' ? 1 : 3;
      for (let j = 0; j < cnt; j++) {
        const pe = MD.person({ cloth: CLOTH[(k * 3 + j + stationIdx) % CLOTH.length], nonla: rural && j === 1 && R.kind !== 'car', bag: R.kind === 'car' ? 0xffd23f : (j === 2 ? 0x6d4c41 : null), cap: R.kind === 'car' && k % 2 ? 0xffffff : null });
        const d = (R.track === 'road' ? 6.4 : R.track === 'metro' ? (R.st[stationIdx].under ? 5.2 : 5.0) : 4.6) + (j % 2) * 0.9, { p } = slotWorld(k, d, (j - 1) * 1.1);
        pe.position.set(p.x, y, p.z); pe.scale.setScalar(R.kind === 'car' ? 0.95 : 0.85);
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
    const d = R.track === 'road' ? 2.2 : 2.0, { p } = slotWorld(k, d, R.kind === 'car' ? 0 : 1.6); p.y = y + (R.track === 'rail' ? 0.4 : 0.1);
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
    const cnt = R.kind === 'car' ? 1 : 2;
    for (let j = 0; j < cnt; j++) {
      const pe = MD.person({ cloth: CLOTH[(k + j * 3) % CLOTH.length], bag: R.kind === 'car' ? 0xffd23f : null });
      const { p } = slotWorld(k, 2.2, (j - 0.5) * 1.2); pe.position.set(p.x, y, p.z); pe.scale.setScalar(0.85); world.add(pe);
      const { p: q } = slotWorld(k, R.track === 'road' ? 14 : 10 + j, 6 + j * 2); q.y = y;
      pe.lookAt(q.x, y, q.z); tween(pe, q, 2.2, { walk: true, done: () => world.remove(pe) });
    }
  });
  setTimeout(() => done && done(), 900);
};

/* ================= driving ================= */
W.drive = function (toS, opts = {}) { R.drive = { to: toS, v: R.drive?.v || 0, vmax: opts.vmax || 22, done: opts.done }; R.camMode = 'drive'; R.camT = 0; };
W.headStopS = i => headStopS(i);
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
  if (R.camMode === 'board') {
    const under = R.track === 'metro' && P(mid).y < -1.5;
    const dist = under ? 15.5 : 15 + R.veh_len * 0.4 + (R.track === 'road' ? 5 : 0), h = under ? 5.5 : 7 + R.veh_len * 0.12;
    const sd = R.track === 'road' ? -1 : 1;
    pos.copy(pm).addScaledVector(sv, sd * dist).addScaledVector(t, -3).add(new V3(0, h, 0));
    look.copy(pm).addScaledVector(sv, sd > 0 ? 1.5 : 3.5).add(new V3(0, 2.2, 0));
    return { pos, look, k: 1.6 };
  }
  let shot = R.camUser === 'auto' ? SHOTS[Math.floor(R.camT / 7) % SHOTS.length] : R.camUser;
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
    if (rem - step < 0.02) { v.s = d.to; d.v = 0; const cb = d.done; R.drive = null; cb && cb(); }
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
  updateSmoke(dt, moving); DC.animateDecor(R.veh.parts, performance.now() / 1000);
  if (R.boost && moving && fx.length < 80) {
    const p = R.veh.parts[R.veh.parts.length - 1].position, m = new THREE.Mesh(gc('spark', () => new THREE.OctahedronGeometry(0.35, 0)), mat([0xffd23f, 0xff70a6, 0x4cc9f0, 0xffffff][fx.length % 4], { emissive: 0xffffff, emissiveIntensity: 0.6 }));
    m.position.set(p.x + (Math.random() - 0.5) * 3, p.y + 1 + Math.random() * 3, p.z + (Math.random() - 0.5) * 3); world.add(m); fx.push({ m, life: 1 });
  }
  for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.life -= dt * 1.2; f.m.position.y += dt * 1.5; f.m.rotation.y += dt * 4; f.m.scale.setScalar(Math.max(0.01, f.life)); if (f.life <= 0) { f.m.parent && f.m.parent.remove(f.m); fx.splice(i, 1); } }
}
W.renderer = () => renderer;
