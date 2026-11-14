// Procedural "toy" models – style A
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const mc = {};
export function mat(color, o = {}) {
  const k = color + JSON.stringify(o);
  if (!mc[k]) mc[k] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0.0 }, o));
  return mc[k];
}
export const GLASS = () => mat(0x6fbdf2, { roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55 });
const SKIN = [0xffd7b5, 0xf1c27d, 0xe0ac69, 0xffe0c4];
const HAIR = [0x3b2416, 0x1f1a17, 0x6b3e26, 0xc58c4a];

function sh(m) { m.castShadow = true; m.receiveShadow = true; return m; }
const GC = {};
export function gc(key, make) { if (!GC[key]) { GC[key] = make(); GC[key].userData.shared = true; } return GC[key]; }
export function rbox(w, h, d, r, c, x = 0, y = 0, z = 0, p) {
  const m = sh(new THREE.Mesh(gc(`rb${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01))), typeof c === 'number' ? mat(c) : c));
  m.position.set(x, y, z); if (p) p.add(m); return m;
}
export function cyl(rt, rb, h, seg, c, p) {
  const m = sh(new THREE.Mesh(gc(`cy${rt}|${rb}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), typeof c === 'number' ? mat(c) : c)); if (p) p.add(m); return m;
}
export function ball(r, c, x, y, z, p, seg = 16) {
  const m = sh(new THREE.Mesh(gc(`sp${r}|${seg}`, () => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75))), typeof c === 'number' ? mat(c) : c)); m.position.set(x, y, z); if (p) p.add(m); return m;
}
function profile(pts, depth, bevel, c) { // pts in (z,y), extruded across x, centered
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => s.lineTo(p[0], p[1])); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 8 });
  g.translate(0, 0, -depth / 2); g.rotateY(-Math.PI / 2);
  return sh(new THREE.Mesh(g, typeof c === 'number' ? mat(c) : c));
}
function label(text, bg, fg, w = 512, h = 128) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = bg; x.beginPath(); x.roundRect(0, 0, w, h, h * 0.22); x.fill();
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  let s = h * 0.56; x.font = `800 ${s}px 'Baloo 2', sans-serif`;
  while (x.measureText(text).width > w * 0.9) { s -= 2; x.font = `800 ${s}px 'Baloo 2', sans-serif`; }
  x.fillText(text, w / 2, h / 2 + h * 0.04);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function sign(text, w, h, bg = '#2b59c3', fg = '#fff', emissive = false) {
  const t = label(text, bg, fg, 512, Math.round(512 * h / w));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ side: THREE.FrontSide, map: t, transparent: true, alphaTest: 0.05, roughness: 0.6, emissive: emissive ? 0xffffff : 0, emissiveMap: emissive ? t : null, emissiveIntensity: emissive ? 0.9 : 0 }));
  const g = new THREE.Group(); g.add(m); const b = m.clone(); b.rotation.y = Math.PI; g.add(b);
  return g;
}

/* ---------- wheel with spokes ---------- */
function wheel(r, w, tire, rim, x, y, z, p, spokes = true) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const t = cyl(r, r, w, 24, tire); t.rotation.z = Math.PI / 2; g.add(t);
  const side = Math.sign(x) || 1;
  const rm = cyl(r * 0.72, r * 0.72, w * 0.3, 20, rim); rm.rotation.z = Math.PI / 2; rm.position.x = side * w * 0.42; g.add(rm);
  if (spokes) for (let i = 0; i < 3; i++) { const s = rbox(0.06, r * 1.3, 0.12, 0.03, tire, side * w * 0.5, 0, 0, g); s.rotation.x = i * Math.PI / 3; }
  ball(r * 0.18, 0xdddddd, side * w * 0.55, 0, 0, g, 10);
  p.add(g); (p.userData.wheels = p.userData.wheels || []).push({ o: g, r });
  return g;
}

/* ---------- chibi person ---------- */
export function person(opts = {}) {
  const g = new THREE.Group();
  const skin = opts.skin ?? SKIN[Math.floor(Math.random() * SKIN.length)];
  const hair = opts.hair ?? HAIR[Math.floor(Math.random() * HAIR.length)];
  const cloth = opts.cloth ?? 0xff7a3d;
  const headOnly = opts.headOnly;
  const H = new THREE.Group(); g.add(H); H.position.y = headOnly ? 0 : 1.55;
  ball(0.55, skin, 0, 0, 0, H, 20);
  const hr = sh(new THREE.Mesh(gc('hair', () => new THREE.SphereGeometry(0.585, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55)), mat(hair))); hr.rotation.x = -0.35; H.add(hr);
  [-0.2, 0.2].forEach(x => {
    ball(0.085, 0x1d1d1d, x, 0.02, 0.5, H, 12); ball(0.03, 0xffffff, x + 0.03, 0.06, 0.575, H, 8);
    const b = new THREE.Mesh(gc('blush', () => new THREE.CircleGeometry(0.08, 12)), mat(0xff8fa3, { transparent: true, opacity: 0.7 })); b.position.set(x * 1.6, -0.14, 0.47); b.rotation.y = x * 1.1; H.add(b);
  });
  const mouth = new THREE.Mesh(gc('mouth', () => new THREE.TorusGeometry(0.1, 0.022, 6, 12, Math.PI)), mat(0xb5384a)); mouth.rotation.z = Math.PI; mouth.position.set(0, -0.15, 0.52); H.add(mouth);
  if (opts.cap) {
    const cap = cyl(0.5, 0.56, 0.32, 24, opts.cap, H); cap.position.y = 0.48;
    const brim = cyl(0.36, 0.36, 0.05, 20, 0x1d1d1d, H); brim.scale.z = 0.6; brim.position.set(0, 0.33, 0.42);
    ball(0.07, 0xffd23f, 0, 0.5, 0.5, H, 10);
  }
  if (opts.nonla) { const nl = sh(new THREE.Mesh(gc('nonla', () => new THREE.ConeGeometry(1.0, 0.55, 20)), mat(0xf1dca7, { roughness: 0.8 }))); nl.position.y = 0.55; H.add(nl); }
  g.userData.head = H;
  if (headOnly) return g;
  const body = rbox(0.75, 0.75, 0.5, 0.22, cloth, 0, 0.88, 0, g);
  rbox(0.78, 0.12, 0.53, 0.05, 0xffffff, 0, 0.7, 0, g);
  void body;
  g.userData.legs = [-0.18, 0.18].map(x => { const L = new THREE.Group(); L.position.set(x, 0.58, 0); g.add(L); rbox(0.24, 0.55, 0.26, 0.11, opts.pants ?? 0x2b4c8c, 0, -0.28, 0, L); rbox(0.26, 0.14, 0.36, 0.06, 0x3a2a1a, 0, -0.52, 0.05, L); return L; });
  if (opts.bag) rbox(0.55, 0.6, 0.25, 0.1, opts.bag, 0, 0.95, -0.36, g);
  const arms = [-1, 1].map(s => {
    const a = new THREE.Group(); a.position.set(s * 0.45, 1.15, 0); g.add(a);
    rbox(0.2, 0.55, 0.22, 0.09, cloth, 0, -0.22, 0, a); ball(0.12, skin, 0, -0.52, 0, a, 12);
    a.rotation.z = s * 0.25; return a;
  });
  g.userData.arms = arms;
  return g;
}

/* ---------- vehicles (front = +z) ---------- */
function passengers(p, n, xs, y, z0, dz) {
  const heads = p.userData.heads = p.userData.heads || [];
  for (let i = 0; i < n; i++) xs.forEach(x => { const h = person({ headOnly: true }); h.scale.setScalar(0.62); h.position.set(x, y, z0 + i * dz); h.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2; h.visible = false; p.add(h); heads.push(h); });
}
// bật/tắt "đầy khách" cho một toa / xe
export function setFilled(p, on) {
  (p.userData.heads || []).forEach((h, i) => { h.visible = on && (i % 5 !== 3); });
  (p.userData.glow || []).forEach(m => { m.material = on ? GLOW() : GLASS(); });
  (p.userData.crates || []).forEach(c => { c.visible = on; });
  p.userData.filled = on;
}
export const GLOW = () => mat(0xfff1b8, { roughness: 0.2, emissive: 0xffd36b, emissiveIntensity: 0.55, transparent: true, opacity: 0.75 });

export function steamLoco(RED = 0xe63946) {
  const g = new THREE.Group(); const DARK = 0x2b2d42, GOLD = 0xffc23d;
  rbox(2.3, 0.45, 8.2, 0.12, DARK, 0, 1.05, 0.2, g);
  rbox(2.5, 0.16, 8.2, 0.06, RED, 0, 1.33, 0.2, g);
  const boiler = cyl(1.05, 1.05, 4.6, 32, RED, g); boiler.rotation.x = Math.PI / 2; boiler.position.set(0, 2.45, 1.4);
  [0, 1.2, 2.4, 3.5].forEach(z => { const b = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.06, 8, 32), mat(GOLD, { metalness: 0.6, roughness: 0.3 })); b.position.set(0, 2.45, -0.75 + z); g.add(b); });
  const sb = cyl(1.09, 1.09, 0.7, 32, DARK, g); sb.rotation.x = Math.PI / 2; sb.position.set(0, 2.45, 3.95);
  const door = cyl(0.8, 0.8, 0.1, 32, 0x41436a, g); door.rotation.x = Math.PI / 2; door.position.set(0, 2.45, 4.32);
  ball(0.12, GOLD, 0, 2.45, 4.38, g, 10);
  const lamp = cyl(0.28, 0.28, 0.35, 20, mat(0xfff3b0, { emissive: 0xffe08a, emissiveIntensity: 1.2 }), g); lamp.rotation.x = Math.PI / 2; lamp.position.set(0, 3.55, 3.95);
  const chim = sh(new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.33, 0], [0.3, 0.55], [0.48, 1.05], [0.55, 1.2], [0.001, 1.2]].map(p => new THREE.Vector2(p[0], p[1])), 24), mat(DARK)));
  chim.position.set(0, 3.25, 3.1); g.add(chim);
  const dome = sh(new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(GOLD, { metalness: 0.6, roughness: 0.3 }))); dome.position.set(0, 3.38, 1.4); g.add(dome);
  // cab
  rbox(2.5, 1.5, 2.6, 0.12, RED, 0, 2.05, -2.2, g);
  [[-1.15, -1.0], [1.15, -1.0], [-1.15, -3.4], [1.15, -3.4]].forEach(([x, z]) => rbox(0.2, 1.4, 0.2, 0.06, RED, x, 3.45, z, g));
  rbox(2.9, 0.28, 3.1, 0.12, DARK, 0, 4.25, -2.2, g);
  rbox(2.5, 1.4, 0.12, 0.04, RED, 0, 3.45, -1.0, g).scale.set(1, 0.3, 1);
  const driver = person({ cap: 0x1d3557, cloth: 0x1d3557 }); driver.scale.setScalar(0.62); driver.position.set(0.35, 1.9, -2.2); driver.rotation.y = 0.3; g.add(driver);
  // cowcatcher
  const cc = profile([[0, 0], [1.1, 0], [0, 0.9]], 2.1, 0.06, RED); cc.position.set(0, 0.55, 4.3); g.add(cc);
  // wheels + rods
  const W = [];
  [-2.1, -0.6, 0.9].forEach(z => [-1.2, 1.2].forEach(x => W.push(wheel(0.72, 0.28, DARK, RED, x, 1.0, z, g))));
  [2.7, 3.7].forEach(z => [-1.15, 1.15].forEach(x => wheel(0.42, 0.24, DARK, RED, x, 0.75, z, g)));
  const rods = [-1, 1].map(s => { const r = rbox(0.1, 0.16, 3.4, 0.05, 0xc0c0c0, s * 1.42, 1.0, -0.6, g); r.material = mat(0xd0d0d0, { metalness: 0.7, roughness: 0.3 }); return r; });
  g.userData.update = (a) => rods.forEach((r, i) => { r.position.y = 1.0 + Math.sin(a + i * 1.57) * 0.35; r.position.z = -0.6 + Math.cos(a + i * 1.57) * 0.35; });
  g.userData.chimney = new THREE.Vector3(0, 4.6, 3.1);
  g.userData.meta = { hw: 1.25, roofY: 4.39, z0: -3.4, z1: -1.0, front: [0, 2.45, 4.42], flag: [1.15, 4.39, -3.3], star: [0, 4.39, -2.2], pet: [0, 3.55, 1.6] };
  return g;
}
export function carriage(color) {
  const g = new THREE.Group();
  rbox(2.3, 0.4, 6.8, 0.1, 0x2b2d42, 0, 1.0, 0, g);
  rbox(2.7, 1.2, 6.6, 0.22, color, 0, 1.85, 0, g);
  rbox(2.72, 0.16, 6.62, 0.06, 0xffffff, 0, 2.5, 0, g);
  const glass = rbox(2.6, 1.0, 6.2, 0.15, GLASS(), 0, 3.05, 0, g); glass.castShadow = false; g.userData.glow = [glass];
  for (let z = -3.05; z <= 3.06; z += 1.22) rbox(2.74, 1.05, 0.18, 0.06, color, 0, 3.05, z, g);
  const roof = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 6.9, 32, 1, false, -Math.PI / 2, Math.PI), mat(0xf8f9fa))); roof.rotation.x = Math.PI / 2; roof.rotation.y = Math.PI; roof.scale.set(1, 1, 0.35); roof.position.set(0, 3.55, 0); g.add(roof);
  passengers(g, 5, [-0.6, 0.6], 3.0, -2.4, 1.22);
  [-2.3, 2.3].forEach(z => [-1.2, 1.2].forEach(x => wheel(0.5, 0.24, 0x2b2d42, 0x9aa0a6, x, 0.85, z, g)));
  g.userData.meta = { hw: 1.36, roofY: 4.05, z0: -3.2, z1: 3.2, winY: 2.42, pet: [0, 4.05, -1.5] };
  return g;
}
export function tramCar(front, dest) {
  const g = new THREE.Group(); const BLUE = 0x1d6fd8, WHITE = 0xf5f7fb;
  rbox(2.7, 1.3, 9, 0.3, BLUE, 0, 1.35, 0, g);
  rbox(2.72, 0.14, 9.02, 0.06, 0xffc23d, 0, 2.05, 0, g);
  const glass = rbox(2.6, 1.5, 8.6, 0.25, GLASS(), 0, 2.85, 0, g); glass.castShadow = false;
  for (let z = -4.2; z <= 4.21; z += 2.1) rbox(2.74, 1.55, 0.2, 0.08, WHITE, 0, 2.85, z, g);
  rbox(2.7, 0.7, 9, 0.3, WHITE, 0, 3.85, 0, g);
  passengers(g, 4, [-0.6, 0.6], 2.75, -3.15, 2.1);
  if (front) {
    const nose = rbox(2.7, 3.1, 1.2, 0.55, WHITE, 0, 2.45, 4.6, g); void nose;
    const ws = rbox(2.3, 1.4, 0.3, 0.2, mat(0x2a3d5c, { roughness: 0.1 }), 0, 2.95, 5.13, g); void ws;
    const d = sign(dest, 1.9, 0.38, '#111', '#ffb703', true); d.position.set(0, 3.95, 5.22); g.add(d);
    [-0.85, 0.85].forEach(x => ball(0.16, mat(0xfff3b0, { emissive: 0xffe08a, emissiveIntensity: 1.5 }), x, 1.55, 5.18, g, 12));
    const driver = person({ cap: 0x1d6fd8, cloth: 0x1d6fd8 }); driver.scale.setScalar(0.55); driver.position.set(0, 1.6, 4.3); g.add(driver);
    // pantograph
    const pg = new THREE.Group(); pg.position.set(0, 4.25, 0.5); g.add(pg);
    [[-0.6, 0.55], [0.6, -0.55]].forEach(([a, b]) => { const r = cyl(0.04, 0.04, 1.3, 6, 0x333333, pg); r.position.set(0, 0.55, 0); r.rotation.z = a; const r2 = cyl(0.04, 0.04, 1.3, 6, 0x333333, pg); r2.position.set(0, 0.55, 0); r2.rotation.x = b; });
    rbox(1.6, 0.08, 0.18, 0.03, 0x333333, 0, 1.15, 0, pg);
  }
  rbox(2.3, 0.35, 8, 0.1, 0x333333, 0, 0.55, 0, g);
  [-3, 3].forEach(z => [-1.1, 1.1].forEach(x => wheel(0.42, 0.22, 0x333333, 0x777777, x, 0.6, z, g, false)));
  return g;
}
export function car(color = 0xff4d6d) { // eslint-disable-line
  const g = new THREE.Group();
  g.add(profile([[-2.2, 0.35], [2.15, 0.35], [2.3, 0.85], [2.05, 1.08], [0.85, 1.22], [-1.85, 1.22], [-2.3, 1.05]], 1.75, 0.16, color));
  const gl = profile([[0.85, 1.2], [0.27, 1.84], [-1.25, 1.84], [-1.85, 1.2]], 1.9, 0, GLASS()); gl.castShadow = false; g.add(gl);
  g.add(profile([[0.32, 1.8], [-1.3, 1.8], [-1.32, 1.95], [0.25, 1.95]], 1.82, 0.08, color));
  [[0.56, -0.74], [-1.55, 0.75]].forEach(([z, a]) => [-0.92, 0.92].forEach(x => { const pl = rbox(0.12, 0.9, 0.12, 0.04, color, x, 1.52, z, g); pl.rotation.x = a; }));
  const driver = person({}); driver.scale.setScalar(0.48); driver.position.set(0.45, 0.72, -0.3); g.add(driver);
  g.userData.seats = [[-0.45, -0.3], [0.5, -1.3], [-0.5, -1.3], [0, -1.35]].map(([x, z]) => { const h = person({ headOnly: true, cloth: 0 }); h.scale.setScalar(0.48); h.position.set(x, 1.46, z); h.visible = false; g.add(h); return h; });
  [-0.65, 0.65].forEach(x => { ball(0.17, mat(0xfff3b0, { emissive: 0xffe08a, emissiveIntensity: 1.3 }), x, 0.85, 2.35, g, 12).scale.set(1.3, 0.8, 0.5); rbox(0.4, 0.18, 0.08, 0.04, mat(0xff2d2d, { emissive: 0xaa0000 }), x, 0.95, -2.42, g); });
  rbox(2.15, 0.3, 0.3, 0.14, 0xdee2e6, 0, 0.5, 2.38, g); rbox(2.15, 0.3, 0.3, 0.14, 0xdee2e6, 0, 0.5, -2.38, g);
  [-1, 1].forEach(s => rbox(0.25, 0.18, 0.12, 0.05, color, s * 1.12, 1.25, 0.75, g));
  [-1.45, 1.45].forEach(z => [-0.98, 0.98].forEach(x => wheel(0.44, 0.34, 0x222222, 0xced4da, x, 0.44, z, g, false)));
  g.userData.meta = { hw: 0.92, roofY: 1.99, z0: -1.3, z1: 0.3, front: [0, 0.72, 2.47], flag: [-0.7, 1.99, -1.2], star: [0, 1.99, -0.5], pet: [0, 1.99, -0.6], small: true };
  g.scale.setScalar(1.15);
  return g;
}
export function truck(ORANGE = 0xf77f00, TEAL = 0x2a9d8f) {
  const g = new THREE.Group();
  rbox(2.2, 0.45, 9.2, 0.12, 0x2b2d42, 0, 1.05, 0, g);
  g.add(profile([[2.3, 0.85], [4.95, 0.85], [5.05, 1.75], [4.98, 2.05], [2.3, 2.05]], 2.25, 0.18, ORANGE));
  const ws = profile([[2.45, 2.0], [4.95, 2.0], [4.72, 3.15], [2.45, 3.15]], 2.45, 0, GLASS()); ws.castShadow = false; g.add(ws);
  g.add(profile([[2.3, 3.1], [4.8, 3.1], [4.72, 3.45], [2.3, 3.45]], 2.4, 0.12, ORANGE));
  rbox(2.6, 1.3, 0.25, 0.08, ORANGE, 0, 2.6, 2.42, g);
  [-1.3, 1.3].forEach(x => { const pl = rbox(0.16, 1.2, 0.16, 0.05, ORANGE, x, 2.58, 4.84, g); pl.rotation.x = -0.2; });
  const driver = person({ cap: 0xf77f00, cloth: 0x2a9d8f }); driver.scale.setScalar(0.58); driver.position.set(0.5, 1.7, 3.7); g.add(driver);
  for (let i = 0; i < 4; i++) rbox(1.7, 0.1, 0.1, 0.03, 0x555555, 0, 1.25 + i * 0.16, 5.15, g);
  [-0.85, 0.85].forEach(x => ball(0.2, mat(0xfff3b0, { emissive: 0xffe08a, emissiveIntensity: 1.3 }), x, 1.45, 5.12, g, 12).scale.set(1, 1, 0.5));
  rbox(2.6, 0.35, 0.35, 0.14, 0xadb5bd, 0, 0.7, 5.2, g);
  const ex = cyl(0.12, 0.12, 2.2, 12, mat(0xd0d0d0, { metalness: 0.8, roughness: 0.25 }), g); ex.position.set(1.25, 3.0, 2.45);
  rbox(2.8, 0.3, 6.6, 0.08, TEAL, 0, 1.4, -1.35, g);
  [-1, 1].forEach(s => rbox(0.14, 0.7, 6.6, 0.05, TEAL, s * 1.33, 1.85, -1.35, g));
  rbox(2.8, 0.7, 0.14, 0.05, TEAL, 0, 1.85, -4.6, g); rbox(2.8, 1.2, 0.18, 0.05, 0x1d6f66, 0, 2.1, 1.85, g);
  g.userData.bed = { y: 1.55, z0: -4.2, z1: 1.4 };
  g.userData.meta = { hw: 1.25, roofY: 3.47, z0: 2.4, z1: 4.7, front: [0, 1.75, 5.3], flag: [1.0, 3.47, 2.6], star: [0, 3.47, 3.5], pet: [0, 3.47, 3.4] };
  [3.6, -1.6, -3.2].forEach(z => [-1.18, 1.18].forEach(x => wheel(0.62, 0.45, 0x222222, 0xced4da, x, 0.62, z, g, false)));
  return g;
}

export function metroCar(front, dest, BLUE = 0x1565c0) {
  const g = new THREE.Group(); const WHITE = 0xf4f6f9, CYAN = 0x29b6f6;
  rbox(2.9, 3.0, 10, 0.35, WHITE, 0, 2.1, 0, g);
  rbox(2.94, 0.28, 10.02, 0.08, BLUE, 0, 1.25, 0, g);
  rbox(2.94, 0.1, 10.02, 0.04, CYAN, 0, 1.47, 0, g);
  const gl = rbox(2.96, 1.05, 8.6, 0.2, GLASS(), 0, 2.55, -0.2, g); gl.castShadow = false; g.userData.glow = [gl];
  [-3.3, 0, 3.0].forEach(z => [-1, 1].forEach(sd => { rbox(0.08, 2.2, 1.3, 0.04, 0x5c6b7a, sd * 1.47, 1.95, z, g); rbox(0.09, 0.8, 0.5, 0.04, GLASS(), sd * 1.48, 2.45, z - 0.33, g); rbox(0.09, 0.8, 0.5, 0.04, GLASS(), sd * 1.48, 2.45, z + 0.33, g); }));
  passengers(g, 4, [-0.65, 0.65], 2.45, -3.6, 2.2);
  rbox(2.5, 0.35, 9.2, 0.1, 0x37474f, 0, 0.5, 0, g);
  if (front) {
    const nose = profile([[4.6, 0.6], [5.6, 0.6], [5.9, 1.5], [5.4, 3.3], [4.6, 3.55]], 2.6, 0.14, WHITE); g.add(nose);
    const ws = profile([[5.2, 2.0], [5.75, 1.75], [5.42, 3.15], [4.9, 3.25]], 2.95, 0, mat(0x1b2a3a, { roughness: 0.08, metalness: 0.3 })); ws.position.x = 0; g.add(ws);
    rbox(2.7, 0.28, 0.6, 0.1, BLUE, 0, 1.25, 5.55, g);
    const d = sign(dest, 1.6, 0.32, '#111', '#ffb703', true); d.position.set(0, 3.25, 5.18); d.rotation.x = -0.35; g.add(d);
    [-0.9, 0.9].forEach(x => ball(0.15, mat(0xfff3b0, { emissive: 0xffe08a, emissiveIntensity: 1.6 }), x, 1.6, 5.85, g, 12).scale.set(1.5, 0.7, 0.6));
    const driver = person({ cap: 0x1565c0, cloth: 0x1565c0 }); driver.scale.setScalar(0.55); driver.position.set(0, 1.3, 4.7); g.add(driver);
    const pg = new THREE.Group(); pg.position.set(0, 3.6, 2.5); g.add(pg);
    [[0.6, 1], [-0.6, -1]].forEach(([a]) => { const r = cyl(0.04, 0.04, 1.2, 6, 0x333333, pg); r.position.set(0, 0.45, a * 0.3); r.rotation.x = a; });
    rbox(1.5, 0.07, 0.16, 0.03, 0x333333, 0, 0.95, 0, pg);
  }
  [-3.5, 3.5].forEach(z => [-1.1, 1.1].forEach(x => wheel(0.42, 0.22, 0x333333, 0x777777, x, 0.55, z, g, false)));
  g.userData.meta = { hw: 1.47, roofY: 3.62, z0: -4.6, z1: 4.6, winY: 1.95, front: front ? [0, 1.25, 5.97] : null, flag: [0.95, 3.62, 3.6], star: [0, 3.62, 2.2], pet: [0, 3.62, -2] };
  return g;
}

/* ---------- extra props ---------- */
export function crate(emoji, color = 0xc8964f) {
  const g = new THREE.Group();
  rbox(2.3, 1.5, 1.5, 0.1, color, 0, 0.75, 0, g);
  [-0.6, 0.6].forEach(z => rbox(2.34, 1.54, 0.16, 0.04, 0x8d5f2c, 0, 0.75, z, g));
  [-1, 1].forEach(sd => { const l = sign(emoji, 1.0, 1.0, '#fff8e1', '#000'); l.position.set(sd * 1.17, 0.78, 0); l.rotation.y = sd * Math.PI / 2; g.add(l); });
  return g;
}
export function buffalo() {
  const g = new THREE.Group(); const C = 0x4a4e57;
  rbox(1.5, 1.3, 2.6, 0.5, C, 0, 1.4, 0, g);
  rbox(0.9, 0.9, 1.0, 0.35, C, 0, 1.7, 1.6, g);
  rbox(0.6, 0.45, 0.4, 0.18, 0x6c707a, 0, 1.5, 2.15, g);
  [-1, 1].forEach(s => { const h = new THREE.Mesh(gc('horn', () => new THREE.TorusGeometry(0.55, 0.09, 8, 16, Math.PI * 0.9)), mat(0xe9e2d0)); h.position.set(s * 0.3, 2.25, 1.55); h.rotation.set(0, s * 0.3, s > 0 ? -0.2 : Math.PI + 0.2); g.add(h); ball(0.08, 0x111111, s * 0.33, 1.85, 2.1, g, 8); });
  [[-0.5, -0.8], [0.5, -0.8], [-0.5, 0.8], [0.5, 0.8]].forEach(([x, z]) => rbox(0.32, 0.9, 0.32, 0.12, C, x, 0.45, z, g));
  const t = cyl(0.05, 0.05, 1, 6, C, g); t.position.set(0, 1.2, -1.4); t.rotation.x = 0.4;
  return g;
}
export function sampan(rower = true) {
  const g = new THREE.Group();
  const s = new THREE.Shape(); s.moveTo(-3.2, 0.6); s.quadraticCurveTo(-2.4, -0.1, 0, -0.1); s.quadraticCurveTo(2.4, -0.1, 3.2, 0.6); s.lineTo(-3.2, 0.6);
  const geo = gc('sampan', () => { const e = new THREE.ExtrudeGeometry(s, { depth: 1.3, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 2 }); e.translate(0, 0, -0.65); e.rotateY(Math.PI / 2); return e; });
  const hull = new THREE.Mesh(geo, mat(0x8d5524)); hull.castShadow = true; g.add(hull);
  if (rower) { const p = person({ nonla: true, cloth: 0x2e7d32, pants: 0x222222 }); p.scale.setScalar(0.6); p.position.set(0, 0.35, -1.6); g.add(p); const oar = cyl(0.05, 0.05, 3, 6, 0x6b4423, g); oar.position.set(0.6, 0.8, -1.9); oar.rotation.x = 0.9; }
  return g;
}
export function basketBoat() { const g = new THREE.Group(); const b = new THREE.Mesh(gc('basket', () => new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), mat(0x5d7a8c)); b.scale.set(1, 0.5, 1); b.position.y = 0.45; g.add(b); return g; }
export function stationVN(name, prov, wall = 0xfff1c9) {
  const g = new THREE.Group();
  rbox(14, 6, 7, 0.2, wall, 0, 3, 0, g);
  rbox(5, 8.5, 7.4, 0.2, wall, 0, 4.25, 0, g);
  const r = new THREE.Mesh(gc('roofVN', () => { const s = new THREE.Shape(); s.moveTo(-8, 0); s.lineTo(8, 0); s.lineTo(6, 2.4); s.lineTo(-6, 2.4); s.closePath(); const e = new THREE.ExtrudeGeometry(s, { depth: 8, bevelEnabled: false }); e.translate(0, 0, -4); return e; }), mat(0xb5462e)); r.position.y = 6; r.castShadow = true; g.add(r);
  const r2 = new THREE.Mesh(gc('roofVN2', () => { const s = new THREE.Shape(); s.moveTo(-3, 0); s.lineTo(3, 0); s.lineTo(0, 2.2); s.closePath(); const e = new THREE.ExtrudeGeometry(s, { depth: 8.2, bevelEnabled: false }); e.translate(0, 0, -4.1); return e; }), mat(0xb5462e)); r2.position.y = 8.5; g.add(r2);
  for (let i = -5; i <= 5; i += 2.5) if (Math.abs(i) > 2) { rbox(1.3, 2, 0.2, 0.08, 0x355070, i, 3, -3.55, g); rbox(1.3, 2, 0.2, 0.08, 0x355070, i, 3, 3.55, g); }
  rbox(2.2, 3.2, 0.2, 0.1, 0x6b4423, 0, 1.6, -3.75, g); rbox(2.2, 3.2, 0.2, 0.1, 0x6b4423, 0, 1.6, 3.75, g);
  [-1, 1].forEach(sd => { const sg = sign('GA ' + name.toUpperCase(), 7.5, 1.3, '#c1121f', '#fff3b0'); sg.position.set(0, 6.9, sd * 3.85); if (sd < 0) sg.rotation.y = Math.PI; g.add(sg); });
  return g;
}
export function shelter(name, color = 0x1d6fd8) {
  const g = new THREE.Group();
  [-2.6, 2.6].forEach(z => cyl(0.12, 0.12, 3, 8, 0x555b6e, g).position.set(0.8, 1.5, z));
  rbox(2.4, 0.2, 6.4, 0.08, color, 0.3, 3.05, 0, g);
  rbox(0.1, 1.6, 5.2, 0.04, GLASS(), 1.2, 1.6, 0, g);
  rbox(0.5, 0.5, 2.4, 0.08, 0x8d6e63, 0.7, 0.55, 0, g);
  [-1, 1].forEach(sd => { const sg = sign(name, 4.4, 0.8, '#1d6fd8', '#fff'); sg.position.set(0.3, 3.75, 0); sg.rotation.y = sd * Math.PI / 2; g.add(sg); });
  return g;
}
export function metroStation(name) { // ga trên cao, gốc toạ độ = mặt sàn
  const g = new THREE.Group();
  rbox(5, 0.6, 24, 0.12, 0xe0e4ea, 0, -0.3, 0, g);
  rbox(0.25, 0.08, 24, 0.04, 0xffd23f, -2.35, 0.03, 0, g);
  const roof = new THREE.Mesh(gc('mroof', () => new THREE.CylinderGeometry(7, 7, 26, 32, 1, true, -Math.PI / 2.6, Math.PI / 1.3)), mat(0xf4f6f9, { side: THREE.DoubleSide, roughness: 0.4 }));
  roof.rotation.x = Math.PI / 2; roof.rotation.y = Math.PI; roof.scale.set(1, 1, 0.4); roof.position.set(-1.5, 6.5, 0); roof.castShadow = true; g.add(roof);
  [-9, 0, 9].forEach(z => cyl(0.18, 0.18, 5.6, 10, 0x90a4ae, g).position.set(2.2, 2.8, z));
  rbox(0.08, 1.2, 22, 0.03, GLASS(), 2.45, 0.6, 0, g);
  [-1, 1].forEach(sd => { const sg = sign(name, 5.2, 0.9, '#1565c0', '#fff'); sg.position.set(2.0, 4.2, sd * 7); sg.rotation.y = Math.PI / 2; g.add(sg); });
  return g;
}

/* ---------- xe ưu tiên: đèn còi nhấp nháy ---------- */
function lightBar(p, y, z, w, cols = [0xff1f1f, 0x1f5bff]) {
  const g = new THREE.Group(); g.position.set(0, y, z); p.add(g);
  rbox(w, 0.16, 0.5, 0.06, 0x2b2d42, 0, 0.08, 0, g);
  (p.userData.sirens = p.userData.sirens || []);
  cols.forEach((c, i) => { const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1, roughness: 0.2, transparent: true, opacity: 0.92 }); const l = new THREE.Mesh(gc(`lens${w}`, () => new RoundedBoxGeometry(w / 2 - 0.08, 0.26, 0.42, 2, 0.1)), m); l.position.set((i ? 1 : -1) * w / 4, 0.29, 0); g.add(l); p.userData.sirens.push({ m, ph: i * Math.PI }); });
  return g;
}
function seatHeads(g, pos, cap, k = 0.48) { return pos.map(([x, y, z]) => { const h = person({ headOnly: true, cap }); h.scale.setScalar(k); h.position.set(x, y, z); h.visible = false; g.add(h); return h; }); }
export function policeCar() {
  const g = car(0xf5f7fa);
  g.userData.seats.forEach(h => g.remove(h));
  g.userData.seats = seatHeads(g, [[-0.45, 1.46, -0.3], [0.5, 1.46, -1.3], [-0.5, 1.46, -1.3], [0, 1.46, -1.35]], 0x1d3557);
  [-1, 1].forEach(sd => { rbox(0.06, 0.26, 3.6, 0.03, 0x1d4ed8, sd * 1.04, 0.72, 0.1, g); const l = sign('CẢNH SÁT', 2.0, 0.4, '#ffffff00', '#1d4ed8'); l.position.set(sd * 1.06, 1.02, -0.45); l.rotation.y = sd * Math.PI / 2; g.add(l); });
  rbox(1.7, 0.07, 1.0, 0.03, 0x1d4ed8, 0, 1.235, 1.6, g);
  lightBar(g, 1.99, -0.45, 1.3);
  rbox(1.8, 0.35, 0.25, 0.08, 0x2b2d42, 0, 0.62, 2.5, g);
  const ant = cyl(0.015, 0.015, 0.9, 4, 0x333333, g); ant.position.set(-0.6, 2.4, -1.6);
  return g;
}
export function ambulance() {
  const g = new THREE.Group(), WH = 0xf8f9fb, RED = 0xe53935;
  rbox(2.0, 0.4, 5.6, 0.1, 0x2b2d42, 0, 0.75, 0, g);
  g.add(profile([[0.9, 0.6], [2.75, 0.6], [2.9, 1.15], [2.65, 1.45], [1.75, 1.6], [1.3, 2.55], [0.9, 2.6]], 2.05, 0.14, WH));
  const ws = profile([[1.74, 1.63], [1.33, 2.48], [0.98, 2.48], [0.98, 1.63]], 2.36, 0, GLASS()); ws.castShadow = false; g.add(ws);
  rbox(2.36, 2.5, 3.8, 0.18, WH, 0, 1.9, -1.0, g);
  rbox(2.4, 0.3, 3.84, 0.06, RED, 0, 1.25, -1.0, g); [-1, 1].forEach(sd => rbox(0.05, 0.3, 1.8, 0.03, RED, sd * 1.19, 1.25, 1.85, g));
  [-1, 1].forEach(sd => { const w = rbox(0.06, 0.75, 1.5, 0.05, GLASS(), sd * 1.17, 2.4, -0.45, g); w.castShadow = false;
    const c = sign('✚', 0.95, 0.95, '#ffffff', '#e53935'); c.position.set(sd * 1.2, 2.25, -2.0); c.rotation.y = sd * Math.PI / 2; g.add(c);
    const t = sign('CẤP CỨU 115', 2.4, 0.38, '#ffffff00', '#e53935'); t.position.set(sd * 1.2, 1.62, -1.0); t.rotation.y = sd * Math.PI / 2; g.add(t); });
  const back = sign('✚', 1.0, 1.0, '#ffffff', '#e53935'); back.position.set(0, 2.2, -2.92); g.add(back);
  rbox(0.04, 2.0, 0.06, 0.02, 0x9e9e9e, 0, 1.9, -2.91, g);
  lightBar(g, 2.6, 1.15, 1.6, [0xff1f1f, 0xff1f1f]);
  rbox(2.1, 0.32, 0.3, 0.12, 0xdee2e6, 0, 0.6, 2.95, g);
  [-0.65, 0.65].forEach(x => ball(0.15, mat(0xfff3b0, { emissive: 0xffe08a, emissiveIntensity: 1.3 }), x, 1.0, 2.88, g, 12).scale.set(1.3, 0.8, 0.5));
  const driver = person({ cloth: 0xffffff, cap: 0xffffff }); driver.scale.setScalar(0.5); driver.position.set(0.45, 0.85, 1.35); g.add(driver);
  g.userData.seats = seatHeads(g, [[-0.45, 1.62, 1.35], [0.5, 2.2, -0.45], [-0.5, 2.2, -0.45], [0, 2.2, -1.3]], 0xffffff, 0.5);
  [1.9, -2.0].forEach(z => [-1.0, 1.0].forEach(x => wheel(0.48, 0.38, 0x222222, 0xced4da, x, 0.48, z, g, false)));
  g.userData.meta = { hw: 1.18, roofY: 3.15, z0: -2.8, z1: 0.8, front: [0, 1.05, 2.97], flag: [0.95, 3.15, -2.5], star: [0, 3.15, -1.2], pet: [0.2, 3.15, -1.9] };
  return g;
}
export function fireTruck() {
  const g = new THREE.Group(), RED = 0xd62828, SIL = mat(0xcfd8dc, { metalness: 0.6, roughness: 0.3 });
  rbox(2.2, 0.45, 10, 0.12, 0x2b2d42, 0, 1.0, 0, g);
  g.add(profile([[1.9, 0.85], [5.0, 0.85], [5.15, 1.7], [5.05, 2.1], [1.9, 2.1]], 2.35, 0.16, RED));
  const ws = profile([[2.0, 2.05], [5.05, 2.05], [4.85, 3.2], [2.0, 3.2]], 2.6, 0, GLASS()); ws.castShadow = false; g.add(ws);
  g.add(profile([[1.9, 3.15], [4.9, 3.15], [4.82, 3.5], [1.9, 3.5]], 2.5, 0.12, RED));
  [-1.32, 1.32].forEach(x => { rbox(0.16, 1.2, 0.16, 0.05, RED, x, 2.62, 3.45, g); const pl = rbox(0.16, 1.18, 0.16, 0.05, RED, x, 2.6, 4.95, g); pl.rotation.x = -0.17; });
  rbox(2.68, 0.18, 10, 0.05, 0xffffff, 0, 1.6, 0, g);
  rbox(2.6, 2.3, 6.7, 0.15, RED, 0, 2.15, -1.55, g);
  [-1, 1].forEach(sd => {
    for (let i = 0; i < 3; i++) { const z = -4.0 + i * 2.15; rbox(0.06, 1.5, 1.8, 0.04, SIL, sd * 1.31, 2.3, z, g); for (let y = 1.7; y < 3.0; y += 0.22) rbox(0.07, 0.04, 1.7, 0.01, 0x9aa5b1, sd * 1.33, y, z, g); }
    const t = sign('CỨU HOẢ 114', 3.4, 0.42, '#ffffff00', '#ffffff'); t.position.set(sd * 1.33, 3.12, -1.55); t.rotation.y = sd * Math.PI / 2; g.add(t);
    const reel = new THREE.Mesh(gc('reel', () => new THREE.TorusGeometry(0.42, 0.14, 8, 18)), mat(0xffc23d)); reel.position.set(sd * 1.38, 1.95, 1.2); reel.rotation.y = Math.PI / 2; g.add(reel);
  });
  // thang trên nóc
  const lad = new THREE.Group(); lad.position.set(0, 3.55, -0.6); lad.rotation.x = -0.05; g.add(lad);
  [-0.42, 0.42].forEach(x => rbox(0.1, 0.14, 8.4, 0.03, SIL, x, 0, 0, lad));
  for (let z = -4; z <= 4; z += 0.5) rbox(0.84, 0.06, 0.06, 0.02, SIL, 0, 0, z, lad);
  const tt = cyl(0.7, 0.8, 0.35, 16, SIL, g); tt.position.set(0, 3.42, -4.2);
  const cannon = cyl(0.09, 0.12, 0.9, 8, SIL, g); cannon.position.set(0, 3.75, 1.0); cannon.rotation.x = Math.PI / 2.4;
  lightBar(g, 3.52, 3.6, 2.0, [0xff1f1f, 0xff1f1f]);
  rbox(2.6, 0.38, 0.38, 0.14, 0xdee2e6, 0, 0.75, 5.25, g);
  for (let i = 0; i < 4; i++) rbox(1.6, 0.08, 0.08, 0.02, 0xdee2e6, 0, 1.25 + i * 0.14, 5.16, g);
  [-0.85, 0.85].forEach(x => ball(0.19, mat(0xfff3b0, { emissive: 0xffe08a, emissiveIntensity: 1.3 }), x, 1.6, 5.13, g, 12).scale.set(1, 1, 0.5));
  const driver = person({ cloth: 0xe9a23b, cap: 0xd62828 }); driver.scale.setScalar(0.58); driver.position.set(0.55, 1.65, 4.2); g.add(driver);
  g.userData.seats = seatHeads(g, [[-0.55, 2.55, 4.2], [-0.62, 2.55, 2.75], [0.62, 2.55, 2.75], [0, 2.55, 2.75]], 0xd62828, 0.58);
  [3.7, -1.9, -3.5].forEach(z => [-1.18, 1.18].forEach(x => wheel(0.62, 0.45, 0x222222, 0xced4da, x, 0.62, z, g, false)));
  g.userData.meta = { hw: 1.3, roofY: 3.5, z0: 1.9, z1: 4.9, front: [0, 1.75, 5.32], flag: [1.05, 3.5, 2.1], star: [0, 3.5, 2.6], pet: [0.85, 3.27, 0.6] };
  return g;
}
export function taxi() {
  const g = car(0xffc61a);
  const top = new THREE.Group(); top.position.set(0, 1.99, -0.5); g.add(top);
  rbox(1.0, 0.36, 0.42, 0.08, 0xffffff, 0, 0.2, 0, top);
  [-1, 1].forEach(sd => { const s = sign('TAXI', 0.9, 0.3, '#ffffff', '#22314f'); s.position.set(0, 0.2, sd * 0.215); if (sd < 0) s.rotation.y = Math.PI; top.add(s); });
  [-1, 1].forEach(sd => { for (let i = 0; i < 8; i++) rbox(0.05, 0.12, 0.22, 0.02, i % 2 ? 0x22314f : 0xffffff, sd * 1.04, 0.8 + (i % 2 ? 0 : 0), -1.4 + i * 0.26, g); });
  return g;
}
