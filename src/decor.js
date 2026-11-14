// Cửa hàng trang trí: màu sơn + đồ gắn lên phương tiện (mua bằng sao)
import * as THREE from 'three';
import * as MD from './models.js';
const { mat, rbox, cyl, ball, gc } = MD;

export const PAINTS = [
  { id: 'paint_classic', name: 'Sơn cổ điển', emo: '🎨', price: 0, loco: 0xe63946, cars: [0xffb703, 0x2a9d8f, 0x8338ec, 0xe76f51], metro: 0x1565c0, car: 0xff4d6d, truck: [0xf77f00, 0x2a9d8f] },
  { id: 'paint_ocean', name: 'Sơn biển xanh', emo: '🌊', price: 15, loco: 0x1d4e89, cars: [0x00b4d8, 0x0077b6, 0x48cae4, 0x90e0ef], metro: 0x0096c7, car: 0x0096c7, truck: [0x0077b6, 0x48cae4] },
  { id: 'paint_candy', name: 'Sơn kẹo ngọt', emo: '🍭', price: 15, loco: 0xff70a6, cars: [0xffd6e0, 0xc77dff, 0xff99c8, 0xa0c4ff], metro: 0xc77dff, car: 0xff70a6, truck: [0xff70a6, 0xc77dff] },
  { id: 'paint_jungle', name: 'Sơn rừng xanh', emo: '🌴', price: 20, loco: 0x2d6a4f, cars: [0x52b788, 0x95d5b2, 0x40916c, 0xb7e4c7], metro: 0x2d6a4f, car: 0x40916c, truck: [0x2d6a4f, 0x95d5b2] },
  { id: 'paint_gold', name: 'Sơn vàng đỏ', emo: '🏮', price: 30, loco: 0xc1121f, cars: [0xd4a017, 0xc1121f, 0xd4a017, 0xc1121f], metro: 0xd4a017, car: 0xd4a017, truck: [0xc1121f, 0xd4a017] }
];
export const ITEMS = [
  { id: 'flag', name: 'Cờ đỏ sao vàng', emo: '🚩', price: 8 },
  { id: 'smile', name: 'Mặt cười', emo: '😊', price: 8 },
  { id: 'balloons', name: 'Bóng bay', emo: '🎈', price: 10 },
  { id: 'flowers', name: 'Bồn hoa cửa sổ', emo: '🌸', price: 10, only: ['train', 'metro'] },
  { id: 'star', name: 'Ngôi sao vàng', emo: '⭐', price: 12 },
  { id: 'lanterns', name: 'Đèn lồng đỏ', emo: '🏮', price: 15 },
  { id: 'lights', name: 'Đèn nháy', emo: '✨', price: 20 },
  { id: 'cat', name: 'Mèo con', emo: '🐱', price: 20 },
  { id: 'dog', name: 'Cún con', emo: '🐶', price: 20 },
  { id: 'rainbow', name: 'Khói cầu vồng', emo: '🌈', price: 25, only: ['train'] }
];
export const paintOf = equipped => PAINTS.find(p => equipped.includes(p.id)) || PAINTS[0];

/* ---------- builders ---------- */
const LIGHT_MATS = [0xff595e, 0xffca3a, 0x8ac926, 0x1982c4, 0xff70a6].map(c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.2 }));
export function twinkle(t) { LIGHT_MATS.forEach((m, i) => { m.emissiveIntensity = 0.4 + Math.max(0, Math.sin(t * 4 + i * 1.3)) * 1.6; }); }
function flagTex() { const c = document.createElement('canvas'); c.width = 192; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#da251d'; x.fillRect(0, 0, 192, 128); x.fillStyle = '#ffcd00'; x.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 17 : 42, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(96 + Math.cos(a) * r, 64 + Math.sin(a) * r); } x.closePath(); x.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
let FLAG_T = null, SMILE_T = null;
function smileTex() { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#ffd23f'; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.fill(); x.fillStyle = '#22314f'; [44, 84].forEach(cx => { x.beginPath(); x.ellipse(cx, 52, 8, 12, 0, 0, 7); x.fill(); }); x.lineWidth = 9; x.strokeStyle = '#22314f'; x.lineCap = 'round'; x.beginPath(); x.arc(64, 70, 28, 0.2, Math.PI - 0.2); x.stroke(); x.fillStyle = '#ff8fa3'; [30, 98].forEach(cx => { x.beginPath(); x.arc(cx, 76, 9, 0, 7); x.fill(); }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function flag(p, at, k) { const g = new THREE.Group(); g.position.set(...at); g.scale.setScalar(k); p.add(g); cyl(0.05, 0.05, 2.2, 6, 0xdddddd, g).position.y = 1.1; FLAG_T = FLAG_T || flagTex(); const f = new THREE.Mesh(gc('flagPl', () => new THREE.PlaneGeometry(1.4, 0.93)), new THREE.MeshStandardMaterial({ map: FLAG_T, side: THREE.DoubleSide })); f.position.set(0, 1.7, -0.72); f.rotation.y = Math.PI / 2; g.add(f); g.userData.wave = f; return g; }
function balloons(p, x, y, z, k) { const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(k); p.add(g); [[0xff595e, -0.35, 2.4], [0xffca3a, 0.3, 2.7], [0x1982c4, 0, 3.1]].forEach(([c, dx, h]) => { const b = ball(0.42, c, dx, h, 0, g, 14); b.scale.y = 1.15; const s = cyl(0.015, 0.015, h - 0.4, 4, 0xffffff, g); s.position.set(dx / 2, (h - 0.4) / 2, 0); s.rotation.z = -dx * 0.25; }); return g; }
function lantern(p, x, y, z, k = 1) { const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(k); p.add(g); cyl(0.02, 0.02, 0.35, 4, 0x333333, g).position.y = 0.17; const b = ball(0.28, mat(0xd62828, { emissive: 0xff3b1f, emissiveIntensity: 0.5 }), 0, -0.25, 0, g, 12); b.scale.y = 1.2; cyl(0.17, 0.17, 0.08, 10, 0xffc23d, g).position.y = 0.06; cyl(0.17, 0.17, 0.08, 10, 0xffc23d, g).position.y = -0.58; const t = cyl(0.02, 0.06, 0.3, 6, 0xffc23d, g); t.position.y = -0.78; }
function starOn(p, at, k) { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.28 : 0.7, a = Math.PI / 2 + i * Math.PI / 5; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } const m = new THREE.Mesh(gc('starGeo', () => { const e = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2 }); e.translate(0, 0, -0.11); return e; }), mat(0xffd23f, { metalness: 0.5, roughness: 0.25, emissive: 0xffb703, emissiveIntensity: 0.35 })); m.position.set(at[0], at[1] + 0.95 * k, at[2]); m.scale.setScalar(k); m.castShadow = true; p.add(m); cyl(0.04, 0.04, 0.6, 6, 0xbdbdbd, p).position.set(at[0], at[1] + 0.3 * k, at[2]); p.userData.spinStar = m; }
function pet(p, at, k, kind) {
  const g = new THREE.Group(); g.position.set(...at); g.scale.setScalar(k * 0.9); p.add(g);
  const C = kind === 'cat' ? 0xf4a261 : 0xd8b48a, D = kind === 'cat' ? 0xe76f51 : 0x8d6e63;
  rbox(0.9, 0.7, 1.2, 0.3, C, 0, 0.4, 0, g); ball(0.45, C, 0, 1.0, 0.45, g, 16);
  if (kind === 'cat') [-0.22, 0.22].forEach(x => { const e = cyl(0, 0.16, 0.32, 4, D, g); e.position.set(x, 1.45, 0.42); });
  else [-0.36, 0.36].forEach(x => { const e = rbox(0.18, 0.45, 0.28, 0.08, D, x, 0.95, 0.4, g); e.rotation.z = x > 0 ? -0.2 : 0.2; });
  [-0.15, 0.15].forEach(x => ball(0.07, 0x1d1d1d, x, 1.05, 0.86, g, 8)); ball(0.08, kind === 'cat' ? 0xff8fa3 : 0x1d1d1d, 0, 0.92, 0.9, g, 8);
  const t = cyl(0.07, 0.05, 0.8, 6, C, g); t.position.set(0, 0.6, -0.75); t.rotation.x = -0.8; g.userData.tail = t; p.userData.pet = g;
}
function flowerBox(p, m) { [-1, 1].forEach(sd => { const x = sd * (m.hw + 0.14); rbox(0.22, 0.25, (m.z1 - m.z0) * 0.8, 0.06, 0x8d5524, x, m.winY - 0.18, (m.z0 + m.z1) / 2, p); for (let z = m.z0 + 0.6; z < m.z1 - 0.4; z += 0.45) ball(0.13, [0xff595e, 0xffca3a, 0xff70a6, 0xffffff][Math.abs(Math.round(z * 3)) % 4], x, m.winY, z, p, 8); }); }
function lights(p, m) { const geo = gc('bulb', () => new THREE.SphereGeometry(0.09, 8, 6)); let i = 0; [-1, 1].forEach(sd => { for (let z = m.z0; z <= m.z1; z += 0.55) { const b = new THREE.Mesh(geo, LIGHT_MATS[i++ % LIGHT_MATS.length]); b.position.set(sd * (m.hw + 0.04), m.roofY - 0.05, z); p.add(b); } }); }
function smile(p, at, k) { SMILE_T = SMILE_T || smileTex(); const d = new THREE.Mesh(gc('smilePl', () => new THREE.CircleGeometry(0.5, 24)), new THREE.MeshStandardMaterial({ map: SMILE_T, transparent: true })); d.position.set(...at); d.scale.setScalar(k); p.add(d); }

// Gắn đồ trang trí lên các phần của phương tiện
export function applyDecor(parts, kind, equipped) {
  const has = id => equipped.includes(id);
  parts.forEach((p, i) => {
    const m = p.userData.meta; if (!m) return;
    const lead = i === 0, k = m.small ? 0.55 : 1;
    if (lead && has('flag') && m.flag) flag(p, m.flag, k);
    if (lead && has('smile') && m.front) smile(p, m.front, k * (kind === 'train' ? 1.4 : 1));
    if (lead && has('star') && m.star) starOn(p, m.star, k);
    const roofPart = kind === 'train' ? i >= 1 : true;
    if (has('balloons') && roofPart && (kind !== 'metro' || i > 0 || parts.length === 1)) balloons(p, m.small ? 0.3 : m.hw * 0.5, m.roofY, (m.z0 + m.z1) / 2 + (m.small ? -0.4 : 1.5), k);
    if (has('lanterns') && !(kind === 'train' && lead)) { const n = m.small ? 1 : 3; for (let j = 0; j < n; j++) [-1, 1].forEach(sd => lantern(p, sd * (m.hw + 0.12), m.roofY - (m.small ? 0.25 : 0.35), m.small ? -0.4 : m.z0 + (j + 0.5) * (m.z1 - m.z0) / n, k)); }
    if (has('flowers') && m.winY && !m.small && (kind === 'train' ? i >= 1 : true)) flowerBox(p, m);
    if (has('lights')) lights(p, m);
    const petIdx = kind === 'train' ? 1 : kind === 'metro' ? Math.min(1, parts.length - 1) : 0;
    if (i === petIdx && m.pet) { if (has('cat')) pet(p, [m.pet[0] + (has('dog') ? -0.5 : 0), m.pet[1], m.pet[2]], k, 'cat'); if (has('dog')) pet(p, [m.pet[0] + (has('cat') ? 0.6 : 0), m.pet[1], m.pet[2] + (has('cat') ? 0.6 : 0)], k, 'dog'); }
  });
}
export function animateDecor(parts, t) {
  twinkle(t);
  parts.forEach(p => { if (p.userData.spinStar) p.userData.spinStar.rotation.y = t * 1.5; if (p.userData.pet?.userData.tail) p.userData.pet.userData.tail.rotation.z = Math.sin(t * 6) * 0.5; });
}
