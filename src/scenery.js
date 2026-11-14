// Cảnh vật: đồ vật "nướng" sẵn (gộp hình + màu đỉnh) để vẽ theo lô, landmark từng ga, cầu, hầm
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as MD from './models.js';
const V3 = THREE.Vector3;
const { mat, rbox, cyl, ball, sign, gc } = MD;

export const VMAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 });
export const VMAT_FLAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
export const WATER = new THREE.MeshStandardMaterial({ color: 0x3fa7d6, roughness: 0.15, metalness: 0.1 });
export const WATER_JADE = new THREE.MeshStandardMaterial({ color: 0x3d8f6e, roughness: 0.2 });
export const SEA = new THREE.MeshStandardMaterial({ color: 0x2b9ad6, roughness: 0.2, metalness: 0.05 });
export const SAND = new THREE.MeshStandardMaterial({ color: 0xf1dca0, roughness: 1 });
[WATER, WATER_JADE, SEA, SAND].forEach(m => m.side = THREE.DoubleSide);

/* ---------------- baking ---------------- */
const G = {
  box: new THREE.BoxGeometry(1, 1, 1), rbox: new RoundedBoxGeometry(1, 1, 1, 2, 0.12), ico: new THREE.IcosahedronGeometry(1, 1), ico0: new THREE.IcosahedronGeometry(1, 0),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 8), cyl6: new THREE.CylinderGeometry(1, 1, 1, 6), cone: new THREE.ConeGeometry(1, 1, 8), cone4: new THREE.ConeGeometry(1, 1, 4),
  sph: new THREE.SphereGeometry(1, 12, 8), hemi: new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  prism: (() => { const s = new THREE.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0, 1); s.closePath(); const e = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }); e.translate(0, 0, -0.5); return e; })()
};
const EU = new THREE.Euler(), Q = new THREE.Quaternion(), M4 = new THREE.Matrix4();
function part(g, c, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0]) { return { g, c, p, s, r }; }
export function bake(parts) {
  const geos = parts.map(({ g, c, p, s, r }) => {
    let x = g.index ? g.toNonIndexed() : g.clone();
    Object.keys(x.attributes).forEach(k => { if (k !== 'position' && k !== 'normal') x.deleteAttribute(k); });
    x.applyMatrix4(M4.compose(new V3(...p), Q.setFromEuler(EU.set(...r)), new V3(...s)));
    const col = new THREE.Color(c), n = x.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; }
    x.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return x;
  });
  const out = mergeGeometries(geos); out.computeBoundingSphere(); out.userData.shared = true; return out;
}

/* ---------------- prop templates ---------------- */
const P = {};
function prop(name, make) { if (!P[name]) P[name] = make(); return P[name]; }
const leafRing = (top, n, len, droop, col, w = 0.28) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + 0.3, r = [0, a, -(Math.PI / 2 + droop)];
    const dir = new V3(0, 1, 0).applyEuler(new THREE.Euler(...r));
    out.push(part(G.cone4, col, [top[0] + dir.x * len / 2, top[1] + dir.y * len / 2, top[2] + dir.z * len / 2], [w, len, w * 0.25], r));
  }
  return out;
};
const T = {
  tree: () => bake([part(G.cyl, 0x8a5a3b, [0, 1.3, 0], [0.26, 2.6, 0.26]), part(G.ico, 0x4caf50, [0, 3.5, 0], [1.6, 1.5, 1.6]), part(G.ico, 0x5dbb63, [0.95, 3.0, 0.35], [1.1, 1.05, 1.1]), part(G.ico, 0x43a047, [-0.85, 3.1, -0.3], [1.15, 1.1, 1.15]), part(G.ico, 0x66bb6a, [0.1, 4.5, -0.2], [1.0, 0.95, 1.0])]),
  treeTall: () => bake([part(G.cyl, 0x7a5236, [0, 2.6, 0], [0.22, 5.2, 0.22]), part(G.ico, 0x3f9142, [0, 5.8, 0], [2.2, 1.3, 2.2]), part(G.ico, 0x4caf50, [0.6, 6.5, 0.4], [1.4, 0.9, 1.4])]),
  palm: () => { const ps = []; let x = 0, y = 0; for (let i = 0; i < 6; i++) { ps.push(part(G.cyl, 0xa47551, [x + 0.08, y + 0.55, 0], [0.2 - i * 0.012, 1.15, 0.2 - i * 0.012], [0, 0, -0.08 - i * 0.03])); x += 0.1 + i * 0.035; y += 1.08; } const top = [x, y + 0.1, 0]; return bake([...ps, ...leafRing(top, 8, 3.2, 0.35, 0x3e9b3a, 0.42), ...leafRing(top, 5, 2.4, -0.25, 0x58b347, 0.36), part(G.sph, 0x7a5a2c, [x + 0.25, y - 0.25, 0.2], [0.26, 0.26, 0.26]), part(G.sph, 0x6f8f2c, [x - 0.2, y - 0.25, -0.15], [0.26, 0.26, 0.26])]); },
  bamboo: () => { const ps = []; for (let i = 0; i < 11; i++) { const a = i * 2.4, rr = 0.25 + (i % 3) * 0.3, h = 7 + (i % 4) * 0.8, tilt = 0.06 + (i % 3) * 0.05; ps.push(part(G.cyl, i % 2 ? 0x8bc34a : 0x7cb342, [Math.cos(a) * rr, h / 2, Math.sin(a) * rr], [0.08, h, 0.08], [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt])); ps.push(part(G.ico, i % 2 ? 0x33691e : 0x558b2f, [Math.cos(a) * (rr + 0.7), h - 0.6, Math.sin(a) * (rr + 0.7)], [1.0, 0.9, 1.0])); ps.push(part(G.ico, 0x689f38, [Math.cos(a) * (rr + 0.4), h - 2.2, Math.sin(a) * (rr + 0.4)], [0.8, 0.7, 0.8])); } return bake(ps); },
  house: () => bake([part(G.box, 0xfff3d6, [0, 1.5, 0], [5, 3, 4]), part(G.prism, 0xc0522d, [0, 3, 0], [6, 2.2, 5]), part(G.box, 0x6d4c41, [0, 0.95, 2.02], [1.1, 1.9, 0.1]), part(G.box, 0x2f5d8c, [-1.6, 1.7, 2.02], [0.9, 0.8, 0.1]), part(G.box, 0x2f5d8c, [1.6, 1.7, 2.02], [0.9, 0.8, 0.1]), part(G.box, 0xd7ccc8, [0, 0.1, 3], [5.4, 0.2, 2])]),
  tube2: () => tube(2), tube3: () => tube(3), tube4: () => tube(4), tube5: () => tube(5),
  high30: () => high(30), high46: () => high(46),
  apart: () => { const ps = [part(G.box, 0xffffff, [0, 9, 0], [16, 18, 10])]; for (let y = 1.6; y < 18; y += 3) { ps.push(part(G.box, 0x9ec5e8, [0, y + 0.3, 5.02], [15, 1.3, 0.1])); ps.push(part(G.box, 0xdedede, [0, y - 0.5, 5.4], [15.6, 0.25, 0.9])); } ps.push(part(G.box, 0xb0bec5, [0, 18.3, 0], [16.4, 0.6, 10.4])); return bake(ps); },
  villa: () => bake([part(G.box, 0xffffff, [0, 3, 0], [8, 6, 8]), part(G.box, 0x37474f, [0, 6.2, 0], [9.2, 0.4, 9.2]), part(G.box, 0x7fb8e0, [0, 4.3, 4.02], [5, 1.6, 0.1]), part(G.box, 0x7fb8e0, [0, 1.6, 4.02], [3, 1.8, 0.1]), part(G.box, 0x29b6f6, [0, 0.12, 7.2], [6, 0.24, 4]), part(G.box, 0xeceff1, [0, 0.08, 7.2], [7, 0.16, 5])]),
  factory: () => { const ps = [part(G.box, 0xf5f7fa, [0, 3.5, 0], [24, 7, 12]), part(G.box, 0x1e88e5, [0, 5.5, 0], [24.2, 1, 12.2])]; for (let x = -9; x <= 9; x += 6) ps.push(part(G.prism, 0x90a4ae, [x, 7, 0], [6, 2, 12])); ps.push(part(G.cyl, 0xcfd8dc, [9, 10, -4], [0.6, 8, 0.6])); return bake(ps); },
  campus: () => { const ps = [part(G.box, 0xb5523b, [0, 5, 0], [20, 10, 9])]; for (let y = 2; y < 10; y += 3) ps.push(part(G.box, 0xfff8e1, [0, y, 4.52], [18, 1.2, 0.1])); for (let x = -8; x <= 8; x += 4) ps.push(part(G.cyl, 0xffffff, [x, 2.5, 5.2], [0.3, 5, 0.3])); ps.push(part(G.prism, 0x8d3a2a, [0, 10, 0], [21, 2.5, 10])); return bake(ps); },
  field: () => { const ps = [part(G.box, 0xffffff, [0, 0.1, 0], [12, 0.2, 10]), part(G.box, 0xb8a27a, [0, 0.22, 5], [12.4, 0.35, 0.4]), part(G.box, 0xb8a27a, [0, 0.22, -5], [12.4, 0.35, 0.4]), part(G.box, 0xb8a27a, [6, 0.22, 0], [0.4, 0.35, 10]), part(G.box, 0xb8a27a, [-6, 0.22, 0], [0.4, 0.35, 10])]; for (let z = -4; z <= 4; z += 1.6) ps.push(part(G.box, 0xdedede, [0, 0.24, z], [11, 0.12, 0.45])); return bake(ps); },
  hill: () => { const g = G.hemi.clone(); return colorize(g, (v, n) => new THREE.Color(0x6aab4f).offsetHSL(0, 0, (Math.sin(v.x * 5) * Math.cos(v.z * 4)) * 0.04 + v.y * 0.05)); },
  cactus: () => bake([part(G.cyl, 0x5a9e4b, [0, 1.5, 0], [0.38, 3, 0.38]), part(G.sph, 0x5a9e4b, [0, 3, 0], [0.38, 0.38, 0.38]), part(G.cyl, 0x5a9e4b, [0.6, 1.9, 0], [0.22, 1.2, 0.22]), part(G.cyl, 0x5a9e4b, [0.35, 1.4, 0], [0.18, 0.6, 0.18], [0, 0, 1.4]), part(G.cyl, 0x5a9e4b, [-0.55, 1.5, 0], [0.2, 1, 0.2]), part(G.cyl, 0x5a9e4b, [-0.3, 1.1, 0], [0.16, 0.5, 0.16], [0, 0, -1.4]), part(G.sph, 0xffd23f, [0, 3.3, 0], [0.18, 0.18, 0.18])]),
  shrub: () => bake([part(G.ico, 0x7d8f3a, [0, 0.6, 0], [1, 0.8, 1]), part(G.ico, 0x6b7f2e, [0.7, 0.45, 0.3], [0.7, 0.6, 0.7])]),
  grape: () => { const ps = [part(G.box, 0x6aa84f, [0, 2.1, 0], [14, 0.35, 2.4])]; for (let x = -6; x <= 6; x += 3) { ps.push(part(G.box, 0x8d6e63, [x, 1, 0], [0.18, 2, 0.18])); ps.push(part(G.sph, 0x6a1b9a, [x + 1, 1.7, 0.6], [0.3, 0.4, 0.3])); ps.push(part(G.sph, 0x8e24aa, [x - 0.8, 1.7, -0.5], [0.3, 0.4, 0.3])); } return bake(ps); },
  dragon: () => { const ps = []; for (let x = -6; x <= 6; x += 2.4) { ps.push(part(G.box, 0xbdbdbd, [x, 0.9, 0], [0.3, 1.8, 0.3])); ps.push(part(G.ico, 0x4caf50, [x, 2.1, 0], [1.0, 0.7, 1.0])); [[0.6, 0.3], [-0.5, -0.4], [0.1, 0.7]].forEach(([dx, dz]) => ps.push(part(G.sph, 0xe91e63, [x + dx, 2.0, dz], [0.25, 0.3, 0.25]))); } return bake(ps); },
  dune: () => colorize(G.hemi.clone(), v => new THREE.Color(0xe0a15a).offsetHSL(0, 0, v.y * 0.08 + Math.sin(v.x * 8) * 0.02)),
  rubber: () => { const ps = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const x = i * 4 - 6, z = j * 4 - 6; ps.push(part(G.cyl, 0x9e8e7e, [x, 2.6, z], [0.16, 5.2, 0.16])); ps.push(part(G.ico, j % 2 ? 0x2e7d32 : 0x388e3c, [x, 5.6, z], [1.8, 1.1, 1.8])); } return bake(ps); },
  stall: () => { const ps = [part(G.box, 0x8d6e63, [0, 0.6, 0], [3, 1.2, 1.6])]; for (let i = 0; i < 6; i++) ps.push(part(G.box, i % 2 ? 0xffffff : 0xe63946, [-1.25 + i * 0.5, 2.5, 0], [0.5, 0.15, 2.2])); ps.push(part(G.box, 0x555555, [-1.4, 1.3, -0.9], [0.1, 2.4, 0.1]), part(G.box, 0x555555, [1.4, 1.3, -0.9], [0.1, 2.4, 0.1])); return bake(ps); },
  bench: () => bake([part(G.box, 0xa0522d, [0, 0.5, 0], [2.2, 0.12, 0.6]), part(G.box, 0xa0522d, [0, 0.85, -0.28], [2.2, 0.5, 0.1]), part(G.box, 0x333333, [-0.9, 0.25, 0], [0.1, 0.5, 0.5]), part(G.box, 0x333333, [0.9, 0.25, 0], [0.1, 0.5, 0.5])]),
  moto: () => bake([part(G.box, 0xffffff, [0, 0.55, 0], [0.35, 0.4, 1.5]), part(G.cyl, 0x222222, [0, 0.32, 0.6], [0.32, 0.12, 0.32], [0, 0, Math.PI / 2]), part(G.cyl, 0x222222, [0, 0.32, -0.6], [0.32, 0.12, 0.32], [0, 0, Math.PI / 2]), part(G.box, 0x333333, [0, 0.82, -0.2], [0.4, 0.15, 0.8]), part(G.box, 0x888888, [0, 1.05, 0.62], [0.7, 0.06, 0.06])]),
  pole: () => bake([part(G.cyl, 0x8d8d8d, [0, 3.2, 0], [0.12, 6.4, 0.12]), part(G.box, 0x6d6d6d, [0, 6.1, 0], [1.6, 0.12, 0.12])]),
  karst0: () => karst(1), karst1: () => karst(2), karst2: () => karst(3)
};
function tube(f) {
  const H = 3.2, ps = [part(G.box, 0xffffff, [0, f * H / 2, 0], [3.8, f * H, 10])];
  ps.push(part(G.box, 0x37474f, [0, 1.25, 5.02], [3.2, 2.3, 0.1]), part(G.box, 0xff8f00, [0, 2.75, 5.5], [3.8, 0.12, 1.1]));
  for (let i = 1; i < f; i++) { const y = i * H; ps.push(part(G.box, 0x4f6d8a, [0, y + 1.7, 5.02], [2.2, 1.5, 0.1]), part(G.box, 0xeeeeee, [0, y + 0.3, 5.45], [3.4, 0.18, 0.9]), part(G.box, 0x90a4ae, [0, y + 0.75, 5.85], [3.4, 0.7, 0.06])); }
  ps.push(part(G.cyl, 0xcfd8dc, [0.9, f * H + 0.6, -2.5], [0.5, 1.1, 0.5], [0, 0, Math.PI / 2]), part(G.box, 0xb0bec5, [0, f * H + 0.15, 0], [3.9, 0.3, 10.1]));
  return bake(ps);
}
function high(h) {
  const ps = [part(G.box, 0xffffff, [0, h / 2, 0], [12, h, 12])];
  for (let y = 2.2; y < h - 1; y += 3.2) ps.push(part(G.box, 0x6fa3cf, [0, y, 0], [12.2, 1.6, 12.2]));
  ps.push(part(G.box, 0xe0e0e0, [0, h + 1, 0], [8, 2, 8]), part(G.cyl, 0xbdbdbd, [2, h + 3, 2], [0.15, 3, 0.15]));
  return bake(ps);
}
function colorize(g, fn) {
  const p = g.attributes.position, n = g.attributes.normal, a = new Float32Array(p.count * 3), v = new V3(), nn = new V3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); nn.fromBufferAttribute(n, i); const c = fn(v, nn); a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); ['uv'].forEach(k => g.deleteAttribute(k)); g.computeBoundingSphere(); g.userData.shared = true; return g;
}
function karst(seed) {
  const g = new THREE.IcosahedronGeometry(1, 3), p = g.attributes.position, v = new V3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + 0.18 * Math.sin(v.x * 4.1 + seed) * Math.cos(v.z * 3.7 - seed) + 0.1 * Math.sin(v.y * 6 + seed * 2);
    v.multiplyScalar(n); if (v.y < 0) v.y *= 0.3; v.x *= 1 - Math.max(0, v.y) * 0.25; v.z *= 1 - Math.max(0, v.y) * 0.25;
    p.setXYZ(i, v.x, v.y + 0.3, v.z);
  }
  g.computeVertexNormals();
  return colorize(g, (v, n) => { const top = n.y > 0.55 || (Math.sin(v.x * 9 + seed) > 0.6 && n.y > 0.1); return new THREE.Color(top ? 0x3f8f3a : 0x9a9a8a).offsetHSL(0, 0, Math.sin(v.y * 7 + v.x * 3) * 0.04); });
}
export function propGeo(name) { return prop(name, T[name]); }

/* ---------------- scatter per chunk ---------------- */
const TREE_TINTS = [0xffffff, 0xe8ffd8, 0xd8f0c0, 0xf0ffe0, 0xc8e6a0];
const FIELD_TINTS = [0x7ec850, 0x8fd65a, 0x6ab842, 0xc9c55a, 0xe2c25a, 0x7fc8a8];
const TUBE_TINTS = [0xfff1b8, 0xffd6e0, 0xd6ecff, 0xe2f7d4, 0xfde2c4, 0xffffff, 0xf5e1ff];
const HIGH_TINTS = [0xffffff, 0xe3f2fd, 0xfff8e1, 0xf3e5f5, 0xe8f5e9];
const KIND = {
  tree: { geo: ['tree', 'treeTall'], tint: TREE_TINTS, s: [0.85, 1.35], r: 3 },
  palm: { geo: ['palm'], tint: [0xffffff, 0xeeffdd], s: [0.85, 1.25], r: 2 },
  bamboo: { geo: ['bamboo'], tint: [0xffffff, 0xe0f0c8], s: [0.9, 1.2], r: 3.5 },
  house: { geo: ['house'], tint: [0xffffff, 0xfff0d0, 0xf0f8ff, 0xffe8e0], s: [0.9, 1.15], r: 5, face: true },
  tube: { geo: ['tube2', 'tube3', 'tube3', 'tube4', 'tube5'], tint: TUBE_TINTS, s: [0.95, 1.05], r: 5, face: true },
  high: { geo: ['high30', 'high46'], tint: HIGH_TINTS, s: [0.8, 1.2], r: 10, face: true },
  apart: { geo: ['apart'], tint: HIGH_TINTS, s: [0.9, 1.1], r: 11, face: true },
  villa: { geo: ['villa'], tint: [0xffffff, 0xfff8e1], s: [0.9, 1.1], r: 8, face: true },
  factory: { geo: ['factory'], tint: [0xffffff], s: [0.9, 1.1], r: 15, face: true },
  campus: { geo: ['campus'], tint: [0xffffff, 0xffe0d0], s: [0.9, 1.1], r: 13, face: true },
  field: { geo: ['field'], tint: FIELD_TINTS, s: [0.8, 1.4], r: 8, align: true },
  karst: { geo: ['karst0', 'karst1', 'karst2'], tint: [0xffffff, 0xf0f0e8], s: [9, 16], sy: [1.8, 3.2], r: 12, mat: 'flat' },
  hill: { geo: ['hill'], tint: [0xffffff, 0xe8f5d8, 0xd8ecc0], s: [22, 40], sy: [0.35, 0.6], r: 30, mat: 'flat' },
  cactus: { geo: ['cactus'], tint: [0xffffff], s: [0.8, 1.3], r: 1.5 },
  shrub: { geo: ['shrub'], tint: [0xffffff, 0xe0e8c0], s: [0.8, 1.5], r: 1.5 },
  grape: { geo: ['grape'], tint: [0xffffff], s: [0.9, 1.1], r: 8, align: true },
  dragon: { geo: ['dragon'], tint: [0xffffff], s: [0.9, 1.1], r: 7, align: true },
  dune: { geo: ['dune'], tint: [0xffffff, 0xfff0e0], s: [18, 30], sy: [0.25, 0.4], r: 22, mat: 'flat' },
  rubber: { geo: ['rubber'], tint: [0xffffff], s: [0.95, 1.05], r: 10, align: true },
  stall: { geo: ['stall'], tint: [0xffffff], s: [1, 1], r: 2.5, face: true },
  bench: { geo: ['bench'], tint: [0xffffff], s: [1, 1], r: 1.5, face: true },
  moto: { geo: ['moto'], tint: [0xe63946, 0x1e88e5, 0x43a047, 0xffffff, 0xfb8c00], s: [1, 1], r: 1.2 }
};
const _d = new THREE.Object3D(), _c = new THREE.Color();
export function scatterChunk(ctx, biome, s0, s1) {
  const lists = {};
  const seaSide = biome.sea ? -1 : 0;
  for (const [kind, count, dmin, dmax] of biome.items) {
    if (kind === 'sandstrip' || kind === 'boat') continue;
    if (kind === 'buffalo' || kind === 'farmer') { for (let i = 0; i < count; i++) if (ctx.rng() < 0.7) single(ctx, kind, s0, s1, dmin, dmax, seaSide); continue; }
    if (kind === 'pond') { if (ctx.rng() < 0.6) pond(ctx, s0, s1, dmin, dmax); continue; }
    if (kind === 'turbine') { for (let i = 0; i < count; i++) turbine(ctx, s0, s1, dmin, dmax); continue; }
    const K = KIND[kind]; if (!K) continue;
    for (let i = 0; i < count; i++) {
      const s = s0 + ctx.rng() * (s1 - s0);
      let side = ctx.rng() < 0.5 ? -1 : 1; if (seaSide && side === seaSide && kind !== 'palm') side = -seaSide;
      let d = dmin + Math.pow(ctx.rng(), 1.3) * (dmax - dmin); if (seaSide && side === seaSide) d = Math.min(d, 16);
      const sc = K.s[0] + ctx.rng() * (K.s[1] - K.s[0]);
      const pos = ctx.at(s, side * d);
      if (!ctx.free(pos.x, pos.z, K.r * sc, s, side * d)) continue;
      ctx.reserve(pos.x, pos.z, K.r * sc * 0.8);
      const geo = K.geo[Math.floor(ctx.rng() * K.geo.length)];
      const t = ctx.T(s); let yaw;
      if (K.face) { yaw = Math.atan2(-side * ctx.S(s).x, -side * ctx.S(s).z); } else if (K.align) yaw = Math.atan2(t.x, t.z) + (ctx.rng() < 0.5 ? 0 : Math.PI / 2) + (ctx.rng() - 0.5) * 0.15; else yaw = ctx.rng() * Math.PI * 2;
      const sy = K.sy ? sc * (K.sy[0] + ctx.rng() * (K.sy[1] - K.sy[0])) : sc;
      (lists[geo] = lists[geo] || { K, items: [] }).items.push({ x: pos.x, z: pos.z, yaw, sc, sy, tint: K.tint[Math.floor(ctx.rng() * K.tint.length)] });
    }
  }
  for (const [geo, { K, items }] of Object.entries(lists)) {
    const im = new THREE.InstancedMesh(propGeo(geo), K.mat === 'flat' ? VMAT_FLAT : VMAT, items.length);
    items.forEach((o, i) => { _d.position.set(o.x, 0, o.z); _d.rotation.set(0, o.yaw, 0); _d.scale.set(o.sc, o.sy, o.sc); _d.updateMatrix(); im.setMatrixAt(i, _d.matrix); im.setColorAt(i, _c.set(o.tint)); });
    im.castShadow = !['field', 'dune', 'hill'].includes(geo); im.receiveShadow = true; im.computeBoundingSphere(); ctx.add(im);
  }
  if (biome.sea) seaChunk(ctx, s0, s1, biome);
}
function single(ctx, kind, s0, s1, dmin, dmax, seaSide) {
  const s = s0 + ctx.rng() * (s1 - s0); let side = ctx.rng() < 0.5 ? -1 : 1; if (side === seaSide) side = -side;
  const d = dmin + ctx.rng() * (dmax - dmin), pos = ctx.at(s, side * d);
  if (!ctx.free(pos.x, pos.z, 2.5, s, side * d)) return;
  const o = kind === 'buffalo' ? MD.buffalo() : MD.person({ nonla: true, cloth: [0x6d4c41, 0x2e7d32, 0x1565c0][Math.floor(ctx.rng() * 3)], pants: 0x37474f });
  o.position.set(pos.x, 0, pos.z); o.rotation.y = ctx.rng() * 6; if (kind === 'buffalo') o.scale.setScalar(1.1);
  ctx.reserve(pos.x, pos.z, 2.5); ctx.add(o);
}
function pond(ctx, s0, s1, dmin, dmax) {
  const s = (s0 + s1) / 2, side = ctx.rng() < 0.5 ? -1 : 1, d = dmin + ctx.rng() * (dmax - dmin), r = 9 + ctx.rng() * 5, pos = ctx.at(s, side * d);
  if (!ctx.free(pos.x, pos.z, r + 2, s, side * d)) return;
  ctx.reserve(pos.x, pos.z, r + 2);
  const rim = new THREE.Mesh(gc('pondRim', () => new THREE.CircleGeometry(1, 28)), mat(0xd7ccc8)); rim.rotation.x = -Math.PI / 2; rim.scale.setScalar(r + 1.2); rim.position.set(pos.x, 0.04, pos.z); rim.receiveShadow = true; ctx.add(rim);
  const w = new THREE.Mesh(gc('pondRim', () => new THREE.CircleGeometry(1, 28)), WATER); w.rotation.x = -Math.PI / 2; w.scale.setScalar(r); w.position.set(pos.x, 0.07, pos.z); ctx.add(w);
}
function turbine(ctx, s0, s1, dmin, dmax) {
  const s = s0 + ctx.rng() * (s1 - s0), side = ctx.rng() < 0.5 ? -1 : 1, d = dmin + ctx.rng() * (dmax - dmin), pos = ctx.at(s, side * d);
  if (!ctx.free(pos.x, pos.z, 6, s, side * d)) return;
  const g = new THREE.Group(); g.position.set(pos.x, 0, pos.z); g.rotation.y = ctx.rng() * 6;
  const t = cyl(0.45, 0.8, 26, 12, 0xf5f5f5, g); t.position.y = 13;
  rbox(1.2, 1.2, 3, 0.4, 0xf5f5f5, 0, 26.3, 0.5, g);
  const hub = new THREE.Group(); hub.position.set(0, 26.3, 2.1); g.add(hub);
  for (let i = 0; i < 3; i++) { const a = new THREE.Group(); a.rotation.z = i * Math.PI * 2 / 3; const b = rbox(0.9, 11, 0.25, 0.12, 0xffffff, 0, 5.5, 0, a); void b; hub.add(a); }
  ctx.spin(hub, 'z', 0.8); ctx.reserve(pos.x, pos.z, 6); ctx.add(g);
}
function seaChunk(ctx, s0, s1, biome) {
  const a = s0 - 8, b = s1 + 8;
  const q = (d0, d1, y, m) => { const g = ctx.strip(a, b, d0, d1, y); const me = new THREE.Mesh(g, m); me.receiveShadow = true; ctx.add(me); };
  q(-16, -36, 0.04, SAND); q(-32, -520, 0.06, SEA);
  const nb = biome.items.find(i => i[0] === 'boat');
  for (let i = 0; i < (nb ? nb[1] : 0); i++) {
    const s = a + ctx.rng() * (b - a), d = -(50 + ctx.rng() * 120), p = ctx.at(s, d);
    const o = ctx.rng() < 0.4 ? MD.basketBoat() : MD.sampan(ctx.rng() < 0.5); o.position.set(p.x, 0.15, p.z); o.rotation.y = ctx.rng() * 6; if (o.children.length > 1) o.scale.setScalar(1.6); ctx.bob(o); ctx.add(o);
  }
}

/* ---------------- landmarks (dựng 1 lần cho mỗi ga) ---------------- */
export function landmark(ctx, id, s, side) {
  const add = o => ctx.add(o);
  const placeAt = (ds, d) => { const p = ctx.at(s + ds, side * d); return p; };
  const yawFace = ss => Math.atan2(-side * ctx.S(ss).x, -side * ctx.S(ss).z);
  if (id === 'hoguom') {
    const c = placeAt(20, 52); ctx.reserve(c.x, c.z, 34);
    const rim = new THREE.Mesh(new THREE.CircleGeometry(30, 48), mat(0xcfd8dc)); rim.rotation.x = -Math.PI / 2; rim.position.set(c.x, 0.04, c.z); rim.receiveShadow = true; add(rim);
    const w = new THREE.Mesh(new THREE.CircleGeometry(27, 48), WATER_JADE); w.rotation.x = -Math.PI / 2; w.position.set(c.x, 0.08, c.z); add(w);
    const isl = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.8, 0.6, 18), mat(0x7cb342)); isl.position.set(c.x - 4, 0.3, c.z + 3); add(isl);
    const tw = new THREE.Group(); tw.position.set(c.x - 4, 0.6, c.z + 3); add(tw);
    [[2.6, 2.2, 1.1], [2.1, 1.8, 3.1], [1.6, 1.4, 4.7]].forEach(([w2, h2, y]) => { rbox(w2, h2, w2, 0.08, 0xf3e5c8, 0, y, 0, tw); [0, 1, 2, 3].forEach(k => { const a = k * Math.PI / 2; rbox(0.5, h2 * 0.55, 0.06, 0.05, 0x5d4037, Math.sin(a) * (w2 / 2 + 0.01), y - 0.1, Math.cos(a) * (w2 / 2 + 0.01), tw).rotation.y = a; }); });
    const cap = new THREE.Mesh(gc('cone4', () => new THREE.ConeGeometry(1, 1, 4)), mat(0x8d6e63)); cap.scale.set(1.3, 1.2, 1.3); cap.rotation.y = Math.PI / 4; cap.position.y = 6.0; tw.add(cap);
    // cầu đỏ
    const a0 = placeAt(5, 27), a1 = new V3(c.x + 12, 0, c.z - 10);
    const mid = a0.clone().lerp(a1, 0.5).setY(2.2);
    const bc = new THREE.QuadraticBezierCurve3(a0.clone().setY(0.4), mid, a1.clone().setY(0.4));
    const br = new THREE.Mesh(new THREE.TubeGeometry(bc, 24, 0.9, 6), mat(0xd62828)); br.scale.y = 1; br.castShadow = true; add(br);
    const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a0.clone().setY(1.6), mid.clone().setY(3.4), a1.clone().setY(1.6)), 24, 0.12, 5), mat(0xb71c1c)); add(rail);
    const pav = new THREE.Group(); pav.position.copy(a1); add(pav); rbox(4, 2.5, 4, 0.1, 0xfff3e0, 0, 1.25, 0, pav); const pr = new THREE.Mesh(gc('cone4', () => new THREE.ConeGeometry(1, 1, 4)), mat(0x5d4037)); pr.scale.set(3.6, 1.8, 3.6); pr.rotation.y = Math.PI / 4; pr.position.y = 3.3; pav.add(pr);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, p = new V3(c.x + Math.cos(a) * 32, 0, c.z + Math.sin(a) * 32); const t = new THREE.Mesh(propGeo('tree'), VMAT); t.position.copy(p); t.scale.setScalar(1.1); t.castShadow = true; add(t); }
  } else if (id === 'phominh') {
    const c = placeAt(30, 42); ctx.reserve(c.x, c.z, 10);
    const g = new THREE.Group(); g.position.copy(c); add(g);
    rbox(9, 1, 9, 0.2, 0xbcaaa4, 0, 0.5, 0, g);
    for (let i = 0; i < 14; i++) { const w = 5 - i * 0.24, y = 1 + i * 1.15; rbox(w, 1, w, 0.08, 0xb4532a, 0, y + 0.5, 0, g); rbox(w + 0.5, 0.18, w + 0.5, 0.05, 0xd7a07a, 0, y + 1.05, 0, g); }
    const tip = cyl(0, 0.9, 2.2, 8, 0x8d3a1a, g); tip.position.y = 18.4;
  } else if (id === 'trangan') {
    const q = ctx.strip(s - 90, s + 160, -26, -46, 0.07); add(new THREE.Mesh(q, WATER));
    for (let i = 0; i < 4; i++) { const p = ctx.at(s - 60 + i * 55, -36); const b = MD.sampan(true); b.position.set(p.x, 0.15, p.z); b.rotation.y = Math.atan2(ctx.T(s).x, ctx.T(s).z) + Math.PI / 2; ctx.bob(b); add(b); }
    ctx.blockStrip(s - 90, s + 160, -24, -48);
    const items = []; for (let i = 0; i < 9; i++) { const p = ctx.at(s - 80 + i * 28, -(58 + (i % 3) * 22)); if (ctx.free(p.x, p.z, 10, s, -60)) items.push(p); }
    const im = new THREE.InstancedMesh(propGeo('karst1'), VMAT_FLAT, items.length); items.forEach((p, i) => { const k = 10 + (i % 4) * 2.5; _d.position.copy(p); _d.rotation.set(0, i, 0); _d.scale.set(k, k * 2.6, k); _d.updateMatrix(); im.setMatrixAt(i, _d.matrix); ctx.reserve(p.x, p.z, 10); }); im.castShadow = true; im.computeBoundingSphere(); add(im);
  } else if (id === 'hue') {
    ctx.blockStrip(s - 70, s + 110, -22, -40);
    add(new THREE.Mesh(ctx.strip(s - 120, s + 160, -22, -40, 0.07), WATER));
    const dboat = new THREE.Group(); const p0 = ctx.at(s + 10, -31); dboat.position.set(p0.x, 0.2, p0.z); dboat.rotation.y = Math.atan2(ctx.T(s).x, ctx.T(s).z); add(dboat); ctx.bob(dboat);
    rbox(1.8, 0.8, 9, 0.3, 0xd62828, 0, 0.3, 0, dboat); rbox(1.6, 1.4, 3, 0.2, 0xffc23d, 0, 1.2, -1, dboat); const hd = cyl(0.25, 0.5, 2.4, 8, 0xffc23d, dboat); hd.position.set(0, 1.4, 4.8); hd.rotation.x = -0.6; ball(0.5, 0x2e7d32, 0, 2.4, 5.6, dboat, 10);
    const wl = ctx.at(s + 30, 0); const sv = ctx.S(s + 30);
    const wall = new THREE.Group(); wall.position.copy(wl).addScaledVector(sv, side * 62); wall.rotation.y = yawFace(s + 30); add(wall); ctx.reserve(wall.position.x, wall.position.z, 30);
    rbox(70, 5, 4, 0.2, 0x8d8072, 0, 2.5, 0, wall);
    rbox(24, 7, 9, 0.25, 0x9b8b7a, 0, 3.5, 0.5, wall);
    [-7, 0, 7].forEach(x => rbox(x ? 2.4 : 3.2, x ? 3.6 : 4.6, 0.3, 0.1, 0x3b2f2a, x, x ? 1.8 : 2.3, 5.1, wall));
    const pv = (w, y, d) => { rbox(w, 2.6, d, 0.1, 0xc62828, 0, y + 1.3, 0.5, wall); const rf = new THREE.Mesh(gc('prismRoof', () => { const sh = new THREE.Shape(); sh.moveTo(-0.6, 0); sh.lineTo(0.6, 0); sh.lineTo(0.42, 0.45); sh.lineTo(-0.42, 0.45); sh.closePath(); const e = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }); e.translate(0, 0, -0.5); return e; }), mat(0xf2b134)); rf.scale.set(w * 1.05, 3.4, d * 1.25); rf.position.set(0, y + 2.6, 0.5); rf.castShadow = true; wall.add(rf); };
    pv(18, 7, 6); pv(11, 11.1, 4.5);
    const fp = cyl(0.12, 0.12, 10, 6, 0x9e9e9e, wall); fp.position.set(0, 18, 0.5); const fl = sign('★', 2.4, 1.6, '#da251d', '#ffde00'); fl.position.set(1.25, 21.8, 0.5); wall.add(fl);
    const tm = ctx.at(s + 120, side * 48); ctx.reserve(tm.x, tm.z, 8); const tg = new THREE.Group(); tg.position.copy(tm); add(tg);
    for (let i = 0; i < 7; i++) { const r = 2.6 - i * 0.25, y = i * 2.4; const b = cyl(r, r, 2.0, 8, 0xe2b59a, tg); b.position.y = y + 1; const rr = cyl(r + 0.5, r + 0.6, 0.35, 8, 0x8d4a2c, tg); rr.position.y = y + 2.15; }
    const tp = cyl(0, 0.5, 2.4, 8, 0x8d4a2c, tg); tp.position.y = 18;
  } else if (id === 'caurong') {
    const sR = s + 70, c = ctx.at(sR, side * 75), t = ctx.T(sR);
    ctx.blockStrip(s - 10, s + 150, side * 58, side * 92);
    add(new THREE.Mesh(ctx.strip(s - 20, s + 160, side * 62, side * 88, 0.07), WATER));
    const g = new THREE.Group(); g.position.copy(c); g.rotation.y = Math.atan2(t.x, t.z) + Math.PI / 2; add(g);
    rbox(4, 0.6, 40, 0.1, 0xbdbdbd, 0, 2.2, 0, g);
    const pts = []; for (let i = 0; i <= 60; i++) { const z = -20 + i * 40 / 60; pts.push(new V3(0, 4 + Math.sin(i / 60 * Math.PI * 3) * 3 + 1.5, z)); }
    const body = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.75, 10), mat(0xffc107, { metalness: 0.3, roughness: 0.35 })); body.castShadow = true; g.add(body);
    const head = new THREE.Group(); head.position.set(0, 5.6, 21); g.add(head);
    rbox(1.6, 1.4, 2.6, 0.5, 0xffc107, 0, 0, 0.6, head); [-0.5, 0.5].forEach(x => { ball(0.18, 0xd62828, x, 0.5, 1.6, head, 8); const h = cyl(0.05, 0.15, 1.4, 6, 0xffa000, head); h.position.set(x, 1.1, 0); h.rotation.x = -0.6; });
    for (let i = 0; i < 6; i++) { const hp = ctx.at(sR + (i - 3) * 16, side * (100 + (i % 2) * 18)); if (!ctx.free(hp.x, hp.z, 9, sR, side * 100)) continue; const b = new THREE.Mesh(propGeo(i % 2 ? 'high46' : 'high30'), VMAT); b.position.copy(hp); b.castShadow = true; add(b); ctx.reserve(hp.x, hp.z, 9); }
  } else if (id === 'cham') {
    const c = placeAt(35, 44); ctx.reserve(c.x, c.z, 14);
    const hill = new THREE.Mesh(propGeo('hill'), VMAT_FLAT); hill.position.copy(c); hill.scale.set(16, 4, 16); add(hill);
    [[0, 0, 1], [-6, 3, 0.7], [5, -4, 0.75]].forEach(([x, z, k]) => {
      const g = new THREE.Group(); g.position.set(c.x + x, 3.6, c.z + z); g.scale.setScalar(k); add(g);
      rbox(5, 6, 5, 0.15, 0xb5532d, 0, 3, 0, g);
      [0, 1, 2, 3].forEach(i => { const a = i * Math.PI / 2; rbox(1.2, 5.4, 0.3, 0.06, 0xa0482a, Math.sin(a) * 2.55, 3, Math.cos(a) * 2.55, g).rotation.y = a; });
      rbox(4, 2, 4, 0.12, 0xb5532d, 0, 7, 0, g); rbox(3, 1.6, 3, 0.1, 0xb5532d, 0, 8.8, 0, g); rbox(2, 1.3, 2, 0.08, 0xb5532d, 0, 10.2, 0, g);
      const tp = new THREE.Mesh(gc('cone4', () => new THREE.ConeGeometry(1, 1, 4)), mat(0xa0482a)); tp.scale.set(1.1, 2.2, 1.1); tp.rotation.y = Math.PI / 4; tp.position.y = 11.9; g.add(tp);
    });
  } else if (id === 'ganh') {
    for (let i = 0; i < 70; i++) { const p = ctx.at(s - 30 + (i % 14) * 4.2, -(20 + Math.floor(i / 14) * 2.6 + Math.sin(i) * 1)); const h = 1 + ((i * 7) % 5) * 0.5; const c = new THREE.Mesh(gc('hex', () => new THREE.CylinderGeometry(1.2, 1.2, 1, 6)), mat(i % 3 ? 0x4e4e58 : 0x5f5f6a, { flatShading: true })); c.scale.y = h; c.position.set(p.x, h / 2, p.z); c.castShadow = true; add(c); }
  } else if (id === 'tower') {
    const c = placeAt(60, 75); ctx.reserve(c.x, c.z, 16);
    const g = new THREE.Group(); g.position.copy(c); add(g);
    const tiers = [[14, 40], [12, 30], [10, 26], [8, 18], [5.5, 12]]; let y = 0;
    tiers.forEach(([w, h]) => { const b = new THREE.Mesh(gc(`tw${w}`, () => new THREE.BoxGeometry(w, 1, w)), mat(0x7fb3d5, { metalness: 0.4, roughness: 0.2 })); b.scale.y = h; b.position.y = y + h / 2; b.castShadow = true; g.add(b); for (let yy = y + 4; yy < y + h; yy += 8) { const band = new THREE.Mesh(gc(`twb${w}`, () => new THREE.BoxGeometry(w + 0.3, 0.5, w + 0.3)), mat(0xeceff1)); band.position.y = yy; g.add(band); } y += h; });
    const sp = cyl(0.2, 1.2, 14, 8, 0xeceff1, g); sp.position.y = y + 7;
  } else if (id === 'wheel') {
    const c = placeAt(30, 50); ctx.reserve(c.x, c.z, 18);
    const g = new THREE.Group(); g.position.copy(c); g.rotation.y = yawFace(s + 30) + Math.PI / 2; add(g);
    [-1.5, 1.5].forEach(z => { [-1, 1].forEach(sd => { const l = cyl(0.3, 0.4, 19, 8, 0xeceff1, g); l.position.set(sd * 4.5, 8.8, z); l.rotation.z = sd * 0.26; }); });
    const wh = new THREE.Group(); wh.position.y = 17; g.add(wh); ctx.spin(wh, 'z', 0.25);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(13, 0.35, 8, 48), mat(0xff5d8f)); wh.add(ring);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const sp = cyl(0.12, 0.12, 13, 6, 0xffffff, wh); sp.position.set(Math.cos(a) * 6.5, Math.sin(a) * 6.5, 0); sp.rotation.z = a - Math.PI / 2; const cab = rbox(1.6, 1.6, 1.6, 0.4, [0xff595e, 0xffca3a, 0x8ac926, 0x1982c4, 0x6a4c93][i % 5], Math.cos(a) * 13, Math.sin(a) * 13 - 1.2, 0, wh); void cab; }
    [[-14, 0x6a4c93], [14, 0x1982c4]].forEach(([x, col]) => { const t = cyl(2, 2.4, 9, 12, 0xfff3e0, g); t.position.set(x, 4.5, 6); const r = cyl(0, 2.9, 4, 12, col, g); r.position.set(x, 11, 6); });
  }
}

/* ---------------- features: sông & cầu, núi & hầm ---------------- */
export function riverFeature(ctx, s, kind) {
  const t = ctx.T(s), c = ctx.at(s, 0), yaw = Math.atan2(t.x, t.z);
  ctx.blockRiver(c, t, 17);
  const mk = (w, l, y, m) => { const me = new THREE.Mesh(new THREE.PlaneGeometry(w, l), m); me.rotation.x = -Math.PI / 2; me.rotation.z = yaw; me.position.set(c.x, y, c.z); me.receiveShadow = true; ctx.add(me); };
  mk(900, 34, 0.035, SAND); mk(900, 26, 0.075, WATER);
  for (let i = 0; i < 2; i++) { const d = (i ? 1 : -1) * (40 + i * 30); const p = ctx.at(s, d); const b = MD.sampan(true); b.position.set(p.x, 0.15, p.z); b.rotation.y = yaw + Math.PI / 2; ctx.bob(b); ctx.add(b); }
  if (kind === 'metro') return;
  const g = new THREE.Group(); g.position.copy(c); g.rotation.y = yaw; ctx.add(g);
  if (kind === 'road') {
    rbox(10, 0.8, 34, 0.1, 0xbdbdbd, 0, 0.25, 0, g);
    [-1, 1].forEach(sd => { rbox(0.3, 1.0, 34, 0.08, 0xeceff1, sd * 4.9, 1.1, 0, g); for (let z = -15; z <= 15; z += 6) { const a = new THREE.Mesh(gc('arch', () => new THREE.TorusGeometry(3, 0.25, 6, 16, Math.PI)), mat(0x1e88e5)); a.position.set(sd * 4.9, 1.4, z); a.rotation.y = Math.PI / 2; g.add(a); } });
    return;
  }
  const STEEL = 0x52677a;
  rbox(5.2, 0.4, 36, 0.05, 0x37474f, 0, 0.12, 0, g);
  [-1, 1].forEach(sd => {
    const x = sd * 2.7;
    rbox(0.35, 0.35, 36, 0.05, STEEL, x, 0.5, 0, g); rbox(0.35, 0.35, 30, 0.05, STEEL, x, 6.2, 0, g);
    for (let z = -15; z <= 15; z += 5) { rbox(0.25, 5.8, 0.25, 0.04, STEEL, x, 3.3, z, g); if (z < 15) { const dg = rbox(0.2, 7.6, 0.2, 0.04, STEEL, x, 3.3, z + 2.5, g); dg.rotation.x = (z / 5) % 2 ? 0.7 : -0.7; } }
    const e1 = rbox(0.3, 7.3, 0.3, 0.04, STEEL, x, 3.3, -16.5, g); e1.rotation.x = -0.45; const e2 = rbox(0.3, 7.3, 0.3, 0.04, STEEL, x, 3.3, 16.5, g); e2.rotation.x = 0.45;
  });
  for (let z = -15; z <= 15; z += 5) rbox(5.6, 0.25, 0.25, 0.04, STEEL, 0, 6.3, z, g);
}
export function tunnelFeature(ctx, s, half = 40) {
  const t = ctx.T(s), c = ctx.at(s, 0), yaw = Math.atan2(t.x, t.z);
  ctx.reserve(c.x, c.z, 70);
  const mg = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const p = mg.attributes.position, v = new V3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 1 + 0.08 * Math.sin(v.x * 7) * Math.cos(v.z * 5); p.setXYZ(i, v.x * n, v.y * n, v.z * n); }
  mg.computeVertexNormals();
  colorize(mg, (vv, n) => new THREE.Color(n.y > 0.45 ? 0x5a9a48 : 0x8f8a78).offsetHSL(0, 0, Math.sin(vv.x * 11) * 0.03));
  const m = new THREE.Mesh(mg, VMAT_FLAT); m.scale.set(95, 30, half - 2); m.position.copy(c); m.rotation.y = yaw; m.castShadow = true; m.receiveShadow = true; ctx.add(m);
  const wall = mat(0x5f6368, { side: THREE.DoubleSide, roughness: 0.95 });
  [[-4.2, -4.2, 0, 7.6], [4.2, 4.2, 0, 7.6]].forEach(([d0, d1]) => { const g = ctx.wall(s - half - 1, s + half + 1, d0, 0, 7.6); ctx.add(new THREE.Mesh(g, wall)); });
  ctx.add(new THREE.Mesh(ctx.strip(s - half - 1, s + half + 1, -4.3, 4.3, 7.6), wall));
  for (let ss = s - half + 4; ss < s + half; ss += 8) { const lp = ctx.at(ss, 4.1); const l = new THREE.Mesh(gc('lamp', () => new THREE.BoxGeometry(0.2, 0.4, 1.2)), mat(0xfff3b0, { emissive: 0xffd36b, emissiveIntensity: 2 })); l.position.set(lp.x, 5.6, lp.z); l.rotation.y = yaw; ctx.add(l); }
  [-1, 1].forEach(e => {
    const ps = s + e * (half + 0.5), pc = ctx.at(ps, 0);
    const sh = new THREE.Shape(); sh.moveTo(-9, 0); sh.lineTo(9, 0); sh.lineTo(9, 11); sh.lineTo(-9, 11); sh.closePath();
    const hole = new THREE.Path(); hole.moveTo(-4.3, 0); hole.lineTo(4.3, 0); hole.lineTo(4.3, 5.4); hole.absarc(0, 5.4, 4.3, 0, Math.PI, false); hole.lineTo(-4.3, 0); sh.holes.push(hole);
    const pg = new THREE.ExtrudeGeometry(sh, { depth: 1.6, bevelEnabled: false }); pg.translate(0, 0, -0.8);
    const portal = new THREE.Mesh(pg, mat(0x9e9a90)); portal.position.copy(pc); portal.rotation.y = yaw; portal.castShadow = true; ctx.add(portal);
    const lab = sign('HẦM', 3, 0.9, '#37474f', '#ffd23f'); lab.position.set(pc.x, 9.6, pc.z); lab.rotation.y = yaw + (e < 0 ? Math.PI : 0); lab.translateZ(0.9); ctx.add(lab);
  });
}
