/* =========================================================
   Ngân hàng câu hỏi – Hành Trình Bé Giỏi
   Toán 2 (Kết nối tri thức, tập 1) + English (Cambridge Pre A1 Starters)
   Mỗi hàm sinh trả về: { subj, id, topic, prompt, visual, input, answer, choices, hint, say, sayLang, explain }
     input: 'number' | 'choice' | 'text' | 'speak'
   ========================================================= */
const QB = (function () {
  'use strict';
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };
  const MINUS = '−';

  /* ---------------- SVG helpers ---------------- */
  const svg = (w, h, body) => `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="max-width:100%;height:auto" xmlns="http://www.w3.org/2000/svg" font-family="Baloo 2, sans-serif">${body}</svg>`;
  function tensBlocks(c, d) {
    let b = '', x = 6;
    for (let i = 0; i < c; i++) { for (let k = 0; k < 10; k++) b += `<rect x="${x}" y="${6 + k * 13}" width="14" height="12" rx="2" fill="#3a86ff" stroke="#1d4ed8"/>`; x += 20; }
    x += 10;
    for (let i = 0; i < d; i++) b += `<rect x="${x + (i % 3) * 18}" y="${110 - Math.floor(i / 3) * 18}" width="14" height="14" rx="2" fill="#ffb703" stroke="#e09100"/>`;
    return svg(Math.max(120, x + 60), 140, b);
  }
  function numberLine(vals, missIdx) {
    const W = 460, step = (W - 60) / (vals.length - 1);
    let b = `<line x1="16" y1="40" x2="${W - 10}" y2="40" stroke="#22314f" stroke-width="3"/><path d="M${W - 10} 40 l-12 -7 v14z" fill="#22314f"/>`;
    vals.forEach((v, i) => {
      const x = 30 + i * step;
      b += `<line x1="${x}" y1="30" x2="${x}" y2="50" stroke="#22314f" stroke-width="3"/>`;
      b += i === missIdx ? `<rect x="${x - 22}" y="58" width="44" height="34" rx="8" fill="#fff3d6" stroke="#ff7a3d" stroke-width="3"/><text x="${x}" y="84" text-anchor="middle" font-size="24" font-weight="800" fill="#ff7a3d">?</text>`
        : `<text x="${x}" y="84" text-anchor="middle" font-size="24" font-weight="800" fill="#22314f">${v}</text>`;
    });
    return svg(W, 100, b);
  }
  function scaleDial(n, max = 10) {
    let b = `<rect x="40" y="70" width="160" height="110" rx="20" fill="#ff7a3d"/><circle cx="120" cy="120" r="44" fill="#fff" stroke="#22314f" stroke-width="3"/>`;
    for (let i = 0; i < max; i++) {
      const a = -Math.PI / 2 + i / max * Math.PI * 2, x1 = 120 + Math.cos(a) * 36, y1 = 120 + Math.sin(a) * 36, x2 = 120 + Math.cos(a) * 42, y2 = 120 + Math.sin(a) * 42;
      b += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#22314f" stroke-width="2"/><text x="${120 + Math.cos(a) * 28}" y="${124 + Math.sin(a) * 28}" font-size="11" font-weight="700" text-anchor="middle">${i}</text>`;
    }
    const a = -Math.PI / 2 + n / max * Math.PI * 2;
    b += `<line x1="120" y1="120" x2="${120 + Math.cos(a) * 38}" y2="${120 + Math.sin(a) * 38}" stroke="#e63946" stroke-width="3" stroke-linecap="round"/><circle cx="120" cy="120" r="4" fill="#e63946"/>`;
    b += `<rect x="30" y="56" width="180" height="14" rx="7" fill="#9aa5b1"/><text x="120" y="174" font-size="13" font-weight="800" text-anchor="middle" fill="#fff">kg</text>`;
    b += `<text x="120" y="44" font-size="38" text-anchor="middle">${pick(['🍉', '🎃', '🥔', '🍍', '🥥'])}</text>`;
    return svg(240, 190, b);
  }
  function bag(label, color, x) { return `<g transform="translate(${x},0)"><path d="M20 40 Q10 40 10 60 L10 150 Q10 160 20 160 L110 160 Q120 160 120 150 L120 60 Q120 40 110 40 Z" fill="${color}" stroke="#22314f" stroke-width="3"/><path d="M30 40 Q65 20 100 40" fill="none" stroke="#22314f" stroke-width="3"/><text x="65" y="110" text-anchor="middle" font-size="26" font-weight="800" fill="#22314f">${label}</text></g>`; }
  function can(label, x, fill = 0.7) { return `<g transform="translate(${x},0)"><rect x="15" y="40" width="90" height="120" rx="14" fill="#e3f2fd" stroke="#22314f" stroke-width="3"/><rect x="18" y="${40 + 120 * (1 - fill)}" width="84" height="${117 * fill}" rx="11" fill="#4fc3f7"/><rect x="40" y="22" width="40" height="20" rx="5" fill="#90a4ae" stroke="#22314f" stroke-width="3"/><text x="60" y="118" text-anchor="middle" font-size="26" font-weight="800" fill="#0d3b66">${label}</text></g>`; }
  function clock(h, m) {
    let b = `<circle cx="100" cy="100" r="88" fill="#fff" stroke="#ff7a3d" stroke-width="8"/>`;
    for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2 - Math.PI / 2; b += `<text x="${100 + Math.cos(a) * 66}" y="${108 + Math.sin(a) * 66}" text-anchor="middle" font-size="20" font-weight="800" fill="#22314f">${i}</text>`; }
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r1 = i % 5 ? 80 : 76; b += `<line x1="${100 + Math.cos(a) * r1}" y1="${100 + Math.sin(a) * r1}" x2="${100 + Math.cos(a) * 84}" y2="${100 + Math.sin(a) * 84}" stroke="#22314f" stroke-width="${i % 5 ? 1 : 3}"/>`; }
    const ha = ((h % 12) + m / 60) / 12 * Math.PI * 2 - Math.PI / 2, ma = m / 60 * Math.PI * 2 - Math.PI / 2;
    b += `<line x1="100" y1="100" x2="${100 + Math.cos(ha) * 42}" y2="${100 + Math.sin(ha) * 42}" stroke="#22314f" stroke-width="8" stroke-linecap="round"/>`;
    b += `<line x1="100" y1="100" x2="${100 + Math.cos(ma) * 64}" y2="${100 + Math.sin(ma) * 64}" stroke="#e63946" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="100" r="7" fill="#22314f"/>`;
    return svg(200, 200, b);
  }
  const DOW = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  function calendar(y, mo, hl) {
    const first = new Date(y, mo - 1, 1).getDay(), days = new Date(y, mo, 0).getDate();
    const heads = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    let b = `<rect x="0" y="0" width="350" height="44" rx="10" fill="#ff7a3d"/><text x="175" y="31" text-anchor="middle" font-size="22" font-weight="800" fill="#fff">Tháng ${mo} năm ${y}</text>`;
    heads.forEach((t, i) => b += `<text x="${25 + i * 50}" y="70" text-anchor="middle" font-size="16" font-weight="800" fill="${i === 6 ? '#e63946' : '#22314f'}">${t}</text>`);
    const off = (first + 6) % 7;
    for (let d = 1; d <= days; d++) {
      const c = (off + d - 1) % 7, r = Math.floor((off + d - 1) / 7), x = 25 + c * 50, yy = 100 + r * 34;
      if (d === hl) b += `<circle cx="${x}" cy="${yy - 6}" r="15" fill="#ffd23f"/>`;
      b += `<text x="${x}" y="${yy}" text-anchor="middle" font-size="17" font-weight="700" fill="${c === 6 ? '#e63946' : '#22314f'}">${d}</text>`;
    }
    return svg(350, 100 + Math.ceil((off + days) / 7) * 34, b);
  }
  const PT = 'ABCDEFG';
  function polyline(lens) {
    let x = 20, y = 120, b = '', pts = [[x, y]];
    lens.forEach((l, i) => { const dx = 70 + l * 4, dy = i % 2 ? 60 : -60; x += dx; y += dy; pts.push([x, y]); });
    for (let i = 0; i < lens.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      b += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#3a86ff" stroke-width="5" stroke-linecap="round"/>`;
      b += `<text x="${(x1 + x2) / 2 + (i % 2 ? 22 : -22)}" y="${(y1 + y2) / 2 + 6}" text-anchor="middle" font-size="18" font-weight="800" fill="#e76f51">${lens[i]} cm</text>`;
    }
    pts.forEach(([px, py], i) => b += `<circle cx="${px}" cy="${py}" r="6" fill="#22314f"/><text x="${px}" y="${py + (i % 2 ? -14 : 26)}" text-anchor="middle" font-size="18" font-weight="800">${PT[i]}</text>`);
    return { svg: svg(x + 30, 200, b), name: PT.slice(0, lens.length + 1) };
  }
  function segFigure() { // random points + some segments
    const P = [[40, 40], [200, 30], [330, 70], [90, 150], [260, 160]].slice(0, rand(4, 5));
    const all = []; for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) all.push([i, j]);
    const segs = shuffle(all).slice(0, rand(3, Math.min(6, all.length)));
    let b = '';
    segs.forEach(([i, j]) => b += `<line x1="${P[i][0]}" y1="${P[i][1]}" x2="${P[j][0]}" y2="${P[j][1]}" stroke="#3a86ff" stroke-width="4"/>`);
    P.forEach(([x, y], i) => b += `<circle cx="${x}" cy="${y}" r="6" fill="#22314f"/><text x="${x}" y="${y - 12}" text-anchor="middle" font-size="18" font-weight="800">${PT[i]}</text>`);
    return { svg: svg(370, 185, b), n: segs.length };
  }
  function shapeSvg(kind, col) {
    const s = { tri: '<polygon points="50,8 92,88 8,88"/>', quad: pick(['<rect x="10" y="20" width="80" height="60" rx="2"/>', '<polygon points="20,15 85,25 92,85 8,78"/>', '<polygon points="30,15 90,15 70,85 10,85"/>']), circle: '<circle cx="50" cy="50" r="40"/>', penta: '<polygon points="50,6 94,38 77,90 23,90 6,38"/>' }[kind];
    return svg(100, 100, `<g fill="${col}" stroke="#22314f" stroke-width="3">${s}</g>`);
  }

  /* ---------------- story context ---------------- */
  let CTX = { veh: 'tàu', st: 'Vinh', kid: 'bạn nhỏ' };
  function setContext(c) { CTX = Object.assign(CTX, c); }
  const NAMES = ['An', 'Bình', 'Mai', 'Lan', 'Minh', 'Hoa', 'Nam', 'Vy'];

  /* ---------------- MATH (Toán 2 KNTT tập 1) ---------------- */
  const math = [];
  const M = (id, topic, fn) => math.push({ id, topic, gen: () => Object.assign({ subj: 'math', id, topic, sayLang: 'vi-VN' }, fn()) });
  const num = (prompt, answer, extra = {}) => Object.assign({ prompt, answer: String(answer), input: 'number', say: prompt.replace(/<[^>]+>/g, '').replace(/−/g, ' trừ ').replace(/\+/g, ' cộng ').replace(/=/g, ' bằng ').replace(/\?/g, ' bao nhiêu') }, extra);
  const choice = (prompt, answer, choices, extra = {}) => Object.assign({ prompt, answer: String(answer), choices: choices.map(String), input: 'choice', say: prompt.replace(/<[^>]+>/g, '') }, extra);
  function colHint(a, b, op) {
    const ua = a % 10, ub = b % 10, ta = Math.floor(a / 10), tb = Math.floor(b / 10);
    if (op === '+') {
      if (a < 10 && b < 10 && a + b > 10) { const n = 10 - a; return `Tách ${b} = ${n} + ${b - n}. ${a} + ${n} = 10, 10 + ${b - n} = ?`; }
      if (ua + ub >= 10) return `Hàng đơn vị: ${ua} + ${ub} = ${ua + ub}, viết ${ua + ub - 10} nhớ 1. Hàng chục: ${ta} + ${tb} thêm 1 = ?`;
      return `Hàng đơn vị: ${ua} + ${ub} = ${ua + ub}. Hàng chục: ${ta} + ${tb} = ${ta + tb}.`;
    }
    if (a > 10 && a < 20 && b < 10 && ua < b) return `Tách ${b} = ${ua} + ${b - ua}. ${a} ${MINUS} ${ua} = 10, 10 ${MINUS} ${b - ua} = ?`;
    if (ua < ub) return `${ua} không trừ được ${ub}, lấy ${ua + 10} ${MINUS} ${ub} = ${ua + 10 - ub}, viết ${ua + 10 - ub} nhớ 1. Hàng chục: ${ta} ${MINUS} ${tb} ${MINUS} 1 = ?`;
    return `Hàng đơn vị: ${ua} ${MINUS} ${ub} = ${ua - ub}. Hàng chục: ${ta} ${MINUS} ${tb} = ${ta - tb}.`;
  }
  const calc = (a, b, op) => num(`${a} ${op === '+' ? '+' : MINUS} ${b} = ?`, op === '+' ? a + b : a - b, { hint: colHint(a, b, op), big: true });

  // Chủ đề 1 – Ôn tập và bổ sung
  M('c1_cautao', 'C1 · Bài 1: Ôn tập các số đến 100', () => { const c = rand(1, 9), d = rand(0, 9); return num(`Số gồm ${c} chục và ${d} đơn vị là số nào?`, c * 10 + d, { visual: tensBlocks(c, d), hint: `${c} chục là ${c * 10}. ${c * 10} thêm ${d} là ?` }); });
  M('c1_lientruoc', 'C1 · Bài 2: Số liền trước, số liền sau', () => { const n = rand(11, 98), after = Math.random() < 0.5; return num(`Số liền ${after ? 'sau' : 'trước'} của ${n} là số nào?`, after ? n + 1 : n - 1, { visual: numberLine([n - 1, n, n + 1], after ? 2 : 0), hint: after ? `Đếm thêm 1: ${n}, ?` : `Đếm bớt 1 từ ${n}.` }); });
  M('c1_tiaso', 'C1 · Bài 2: Tia số', () => { const step = pick([1, 2, 5, 10]), s = step === 10 ? rand(0, 5) * 10 : rand(0, 80), v = [0, 1, 2, 3, 4, 5].map(i => s + i * step), k = rand(1, 4); return num('Số thích hợp ở ô dấu ? là số nào?', v[k], { visual: numberLine(v, k), hint: `Mỗi vạch cách nhau ${step} đơn vị.` }); });
  M('c1_thanhphan', 'C1 · Bài 3: Số hạng – Tổng, Số bị trừ – Số trừ – Hiệu', () => {
    if (Math.random() < 0.5) { const a = rand(10, 60), b = rand(10, 89 - a); const t = pick(['tong', 'sohang']); if (t === 'tong') return num(`Số hạng thứ nhất là ${a}, số hạng thứ hai là ${b}. Tổng là bao nhiêu?`, a + b, { hint: `Tổng = số hạng + số hạng: ${a} + ${b}` }); return num('Tìm số hạng còn thiếu:', a, { eq: `? + ${b} = ${a + b}`, say: `Số nào cộng ${b} bằng ${a + b}?`, hint: `Lấy tổng trừ số hạng đã biết: ${a + b} ${MINUS} ${b}` }); }
    const a = rand(30, 99), b = rand(10, a - 10); if (Math.random() < 0.6 && (a % 10) >= (b % 10)) return num(`Số bị trừ là ${a}, số trừ là ${b}. Hiệu là bao nhiêu?`, a - b, { hint: `Hiệu = số bị trừ ${MINUS} số trừ` });
    return num('Tìm số trừ còn thiếu:', b, { eq: `${a} ${MINUS} ? = ${a - b}`, say: `${a} trừ số nào bằng ${a - b}?`, hint: `Lấy số bị trừ trừ hiệu: ${a} ${MINUS} ${a - b}` });
  });
  M('c1_honkem', 'C1 · Bài 4: Hơn, kém nhau bao nhiêu', () => { const b = rand(10, 60), d = rand(2, 30), a = b + d; return Math.random() < 0.5 ? num(`${a} hơn ${b} bao nhiêu đơn vị?`, d, { hint: `Lấy số lớn trừ số bé: ${a} ${MINUS} ${b}` }) : num(`${b} kém ${a} bao nhiêu đơn vị?`, d, { hint: `Lấy số lớn trừ số bé: ${a} ${MINUS} ${b}` }); });
  M('c1_sosanh', 'C1 · Bài 5: So sánh (>, <, =)', () => { const a = rand(10, 80), b = rand(1, 15), c = a + b + pick([-3, -1, 0, 0, 1, 4]); const l = a + b; const ans = l > c ? '>' : l < c ? '<' : '='; return choice(`${a} + ${b} ⬜ ${c}`, ans, ['>', '<', '='], { hint: `Tính ${a} + ${b} trước rồi so sánh với ${c}.`, big: true, say: `${a} cộng ${b}, so sánh với ${c}` }); });
  M('c1_khongnho', 'C1 · Bài 5: Cộng, trừ không nhớ trong phạm vi 100', () => { if (Math.random() < 0.5) { const ta = rand(1, 7), tb = rand(1, 8 - ta), ua = rand(0, 8), ub = rand(0, 9 - ua); return calc(ta * 10 + ua, tb * 10 + ub, '+'); } const ta = rand(3, 9), tb = rand(1, ta - 1), ua = rand(1, 9), ub = rand(0, ua); return calc(ta * 10 + ua, tb * 10 + ub, '-'); });

  // Chủ đề 2 – Cộng, trừ trong phạm vi 20
  M('c2_cong10', 'C2 · Bài 7–8: Cộng qua 10 trong phạm vi 20', () => { const a = rand(2, 9), b = rand(11 - a, 9); return calc(a, b, '+'); });
  M('c2_tru10', 'C2 · Bài 11–12: Trừ qua 10 trong phạm vi 20', () => { const a = rand(11, 18), b = rand((a % 10) + 1, 9); return calc(a, b, '-'); });
  M('c2_thembot', 'C2 · Bài 9: Bài toán thêm, bớt một số đơn vị', () => {
    const a = rand(6, 14);
    if (Math.random() < 0.5) { const b = rand(3, 20 - a); return num(`Trên ${CTX.veh} có ${a} ${CTX.kid}. Đến ${CTX.st}, có thêm ${b} ${CTX.kid} lên ${CTX.veh}. Hỏi trên ${CTX.veh} có tất cả bao nhiêu ${CTX.kid}?`, a + b, { story: true, hint: `"Thêm" thì làm phép cộng: ${a} + ${b}` }); }
    const b = rand(2, a - 1); return num(`Trên ${CTX.veh} có ${a} ${CTX.kid}. Đến ${CTX.st}, có ${b} ${CTX.kid} xuống ${CTX.veh}. Hỏi trên ${CTX.veh} còn lại bao nhiêu ${CTX.kid}?`, a - b, { story: true, hint: `"Bớt / xuống" thì làm phép trừ: ${a} ${MINUS} ${b}` });
  });
  M('c2_nhieuhon', 'C2 · Bài 13: Nhiều hơn, ít hơn một số đơn vị', () => {
    const [x, y] = shuffle(NAMES).slice(0, 2), a = rand(6, 13), d = rand(2, 6), obj = pick(['quả bóng', 'ngôi sao', 'cái kẹo', 'bông hoa']);
    if (Math.random() < 0.5) return num(`${x} có ${a} ${obj}. ${y} có nhiều hơn ${x} ${d} ${obj}. Hỏi ${y} có bao nhiêu ${obj}?`, a + d, { story: true, hint: `"Nhiều hơn" thì làm phép cộng: ${a} + ${d}` });
    return num(`${x} có ${a + d} ${obj}. ${y} có ít hơn ${x} ${d} ${obj}. Hỏi ${y} có bao nhiêu ${obj}?`, a, { story: true, hint: `"Ít hơn" thì làm phép trừ: ${a + d} ${MINUS} ${d}` });
  });

  // Chủ đề 3 – Khối lượng, dung tích
  M('c3_kg_can', 'C3 · Bài 15: Ki-lô-gam (đọc cân)', () => { const n = rand(1, 9); return num('Quả trên cân nặng bao nhiêu ki-lô-gam?', n, { visual: scaleDial(n), hint: 'Xem kim đỏ chỉ vào số nào.', unit: 'kg' }); });
  M('c3_kg_toan', 'C3 · Bài 15: Ki-lô-gam (tính)', () => { const a = rand(10, 40), b = rand(5, 30); if (Math.random() < 0.5) return num(`Bao gạo nặng ${a} kg, bao đường nặng ${b} kg. Cả hai bao nặng bao nhiêu ki-lô-gam?`, a + b, { visual: svg(280, 170, bag(a + ' kg', '#fff3d6', 0) + bag(b + ' kg', '#e0f2fe', 150)), unit: 'kg', story: true, hint: `${a} kg + ${b} kg` }); const c = a + b; return num(`${CTX.veh[0].toUpperCase() + CTX.veh.slice(1)} chở ${c} kg hàng. Đến ${CTX.st} dỡ xuống ${b} kg. Trên ${CTX.veh} còn lại bao nhiêu ki-lô-gam hàng?`, a, { unit: 'kg', story: true, hint: `${c} kg ${MINUS} ${b} kg` }); });
  M('c3_lit', 'C3 · Bài 16: Lít', () => { const a = rand(2, 15), b = rand(2, 15); if (Math.random() < 0.5) return num(`Can thứ nhất có ${a} l nước, can thứ hai có ${b} l nước. Cả hai can có bao nhiêu lít nước?`, a + b, { visual: svg(260, 170, can(a + ' l', 0, 0.55) + can(b + ' l', 135, 0.8)), unit: 'l', hint: `${a} l + ${b} l` }); const c = a + b; return num(`Thùng có ${c} l nước. Đã dùng ${b} l. Thùng còn lại bao nhiêu lít nước?`, a, { visual: svg(130, 170, can(c + ' l', 0, 0.9)), unit: 'l', hint: `${c} l ${MINUS} ${b} l` }); });

  // Chủ đề 4 – Cộng, trừ có nhớ trong phạm vi 100
  M('c4_cong21', 'C4 · Bài 19: Cộng có nhớ (số có 2 chữ số + số có 1 chữ số)', () => { const ua = rand(2, 9), ub = rand(10 - ua, 9), ta = rand(1, 8); return calc(ta * 10 + ua, ub, '+'); });
  M('c4_cong22', 'C4 · Bài 20: Cộng có nhớ (2 chữ số + 2 chữ số)', () => { const ua = rand(2, 9), ub = rand(10 - ua, 9), ta = rand(1, 7), tb = rand(1, 8 - ta); return calc(ta * 10 + ua, tb * 10 + ub, '+'); });
  M('c4_tru21', 'C4 · Bài 22: Trừ có nhớ (2 chữ số − 1 chữ số)', () => { const ta = rand(2, 9), ua = rand(0, 8), ub = rand(ua + 1, 9); return calc(ta * 10 + ua, ub, '-'); });
  M('c4_tru22', 'C4 · Bài 23: Trừ có nhớ (2 chữ số − 2 chữ số)', () => { const ta = rand(3, 9), ua = rand(0, 8), ub = rand(ua + 1, 9), tb = rand(1, ta - 1); return calc(ta * 10 + ua, tb * 10 + ub, '-'); });
  M('c4_loivan', 'C4 · Bài 21, 24: Toán có lời văn (có nhớ)', () => {
    const a = rand(25, 68);
    if (Math.random() < 0.5) { const b = rand(12, 99 - a); return num(`Đoàn ${CTX.veh} chở ${a} hành khách. Đến ${CTX.st} có thêm ${b} hành khách lên ${CTX.veh}. Hỏi trên ${CTX.veh} có tất cả bao nhiêu hành khách?`, a + b, { story: true, hint: colHint(a, b, '+') }); }
    const b = rand(8, a - 10); return num(`Đoàn ${CTX.veh} chở ${a} hành khách. Đến ${CTX.st} có ${b} hành khách xuống ${CTX.veh}. Hỏi trên ${CTX.veh} còn lại bao nhiêu hành khách?`, a - b, { story: true, hint: colHint(a, b, '-') });
  });

  // Chủ đề 5 – Hình phẳng
  M('c5_doanthang', 'C5 · Bài 25: Điểm, đoạn thẳng', () => { const f = segFigure(); return num('Hình vẽ bên có bao nhiêu đoạn thẳng?', f.n, { visual: f.svg, hint: 'Đếm từng đoạn màu xanh, đánh dấu đoạn đã đếm.' }); });
  M('c5_thanghang', 'C5 · Bài 25: Ba điểm thẳng hàng', () => {
    const y = 60, pts = [[40, y], [150, y], [260, y]]; const extra = [rand(70, 230), pick([130, 150])];
    const names = shuffle(['A', 'B', 'C', 'D']); const all = [...pts, extra];
    let b = `<line x1="20" y1="${y}" x2="290" y2="${y}" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6 6"/>`;
    all.forEach(([x, yy], i) => b += `<circle cx="${x}" cy="${yy}" r="7" fill="#22314f"/><text x="${x}" y="${yy - 14}" text-anchor="middle" font-size="20" font-weight="800">${names[i]}</text>`);
    const right = names.slice(0, 3).sort().join(', ');
    const wrong = [names[0], names[1], names[3]].sort().join(', '), wrong2 = [names[0], names[2], names[3]].sort().join(', ');
    return choice('Ba điểm nào thẳng hàng?', right, shuffle([right, wrong, wrong2]), { visual: svg(310, 170, b.replace('stroke="#cbd5e1"', 'stroke="#ffffff00"')), hint: 'Đặt thước kẻ: ba điểm nằm trên cùng một đường thẳng.' });
  });
  M('c5_gapkhuc', 'C5 · Bài 26: Độ dài đường gấp khúc', () => { const lens = Array.from({ length: rand(2, 3) }, () => rand(2, 9)); const p = polyline(lens); return num(`Độ dài đường gấp khúc ${p.name} là bao nhiêu xăng-ti-mét?`, lens.reduce((a, b) => a + b, 0), { visual: p.svg, unit: 'cm', hint: 'Cộng độ dài các đoạn thẳng: ' + lens.join(' + ') }); });
  M('c5_tugiac', 'C5 · Bài 26: Hình tứ giác', () => { const cols = shuffle(['#ffd166', '#8ecae6', '#cdb4db', '#b7e4c7']); const opts = shuffle(['tri', 'quad', 'circle', 'penta']); return choice('Hình nào là hình tứ giác?', String(opts.indexOf('quad')), ['0', '1', '2', '3'], { pics: opts.map((k, i) => shapeSvg(k, cols[i])), hideWords: true, hint: 'Hình tứ giác có 4 cạnh và 4 đỉnh.' }); });

  // Chủ đề 6 – Ngày, giờ, tháng
  M('c6_dongho', 'C6 · Bài 29–30: Xem đồng hồ', () => {
    const h = rand(1, 12), m = pick([0, 0, 15, 30]); const lab = (h, m) => m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`;
    const right = lab(h, m), opts = new Set([right]);
    while (opts.size < 4) opts.add(lab(pick([h, (h % 12) + 1, ((h + 10) % 12) + 1, rand(1, 12)]), pick([0, 15, 30])));
    return choice('Đồng hồ chỉ mấy giờ?', right, shuffle([...opts]), { visual: clock(h, m), hint: 'Kim ngắn chỉ giờ, kim dài chỉ phút. Kim dài chỉ số 3 là 15 phút, chỉ số 6 là 30 phút.' });
  });
  M('c6_lich', 'C6 · Bài 31: Ngày – tháng, xem lịch', () => {
    const y = new Date().getFullYear(), mo = pick([10, 11, 12]), d = rand(1, new Date(y, mo, 0).getDate());
    if (Math.random() < 0.65) { const w = DOW[new Date(y, mo - 1, d).getDay()]; return choice(`Ngày ${d} tháng ${mo} là thứ mấy?`, w, shuffle([w, ...shuffle(DOW.filter(x => x !== w)).slice(0, 3)]), { visual: calendar(y, mo, d), hint: 'Tìm số ngày trên tờ lịch rồi dóng lên hàng tên thứ.' }); }
    return num(`Tháng ${mo} có bao nhiêu ngày?`, new Date(y, mo, 0).getDate(), { visual: calendar(y, mo, 0), hint: 'Xem số ngày cuối cùng trên tờ lịch.' });
  });
  M('c6_gio', 'C6 · Bài 29: Ngày – giờ', () => { const h = rand(13, 23); return Math.random() < 0.4 ? num('Một ngày có bao nhiêu giờ?', 24, { hint: 'Một ngày bắt đầu từ 12 giờ đêm hôm trước đến 12 giờ đêm hôm sau.' }) : num(`${h - 12} giờ ${h < 18 ? 'chiều' : 'tối'} còn gọi là mấy giờ?`, h, { hint: `Cộng thêm 12: ${h - 12} + 12` }); });

  /* ---------------- ENGLISH (Pre A1 Starters) ---------------- */
  const V = {
    body: [['arm', '💪'], ['ear', '👂'], ['eye', '👁️'], ['foot', '🦶'], ['hand', '✋'], ['leg', '🦵'], ['mouth', '👄'], ['nose', '👃']],
    animals: [['bird', '🐦'], ['cat', '🐱'], ['chicken', '🐔'], ['cow', '🐄'], ['crocodile', '🐊'], ['dog', '🐶'], ['duck', '🦆'], ['elephant', '🐘'], ['fish', '🐟'], ['frog', '🐸'], ['giraffe', '🦒'], ['goat', '🐐'], ['hippo', '🦛'], ['horse', '🐴'], ['lizard', '🦎'], ['monkey', '🐒'], ['mouse', '🐭'], ['sheep', '🐑'], ['snake', '🐍'], ['spider', '🕷️'], ['tiger', '🐯']],
    clothes: [['bag', '🎒'], ['dress', '👗'], ['glasses', '👓'], ['hat', '👒'], ['jacket', '🧥'], ['jeans', '👖'], ['shirt', '👔'], ['shoe', '👟'], ['sock', '🧦'], ['watch', '⌚'], ['handbag', '👜']],
    people: [['baby', '👶'], ['boy', '👦'], ['girl', '👧'], ['man', '👨'], ['woman', '👩'], ['robot', '🤖'], ['monster', '👾'], ['alien', '👽'], ['balloon', '🎈']],
    food: [['apple', '🍎'], ['banana', '🍌'], ['bread', '🍞'], ['burger', '🍔'], ['cake', '🍰'], ['carrot', '🥕'], ['chips', '🍟'], ['chocolate', '🍫'], ['coconut', '🥥'], ['egg', '🥚'], ['grapes', '🍇'], ['lemon', '🍋'], ['mango', '🥭'], ['meat', '🍖'], ['milk', '🥛'], ['onion', '🧅'], ['orange', '🍊'], ['pear', '🍐'], ['pineapple', '🍍'], ['potato', '🥔'], ['rice', '🍚'], ['tomato', '🍅'], ['watermelon', '🍉'], ['juice', '🧃']],
    home: [['bath', '🛁'], ['bed', '🛏️'], ['chair', '🪑'], ['clock', '🕰️'], ['door', '🚪'], ['flower', '🌸'], ['mirror', '🪞'], ['phone', '📱'], ['sofa', '🛋️'], ['television', '📺'], ['window', '🪟'], ['house', '🏠'], ['box', '📦'], ['picture', '🖼️']],
    school: [['book', '📖'], ['computer', '💻'], ['keyboard', '⌨️'], ['pen', '🖊️'], ['pencil', '✏️'], ['ruler', '📏'], ['letter', '✉️']],
    beach: [['ball', '⚽'], ['baseball', '⚾'], ['basketball', '🏀'], ['camera', '📷'], ['guitar', '🎸'], ['kite', '🪁'], ['piano', '🎹'], ['sea', '🌊'], ['shell', '🐚'], ['sun', '☀️']],
    street: [['bike', '🚲'], ['boat', '⛵'], ['bus', '🚌'], ['car', '🚗'], ['helicopter', '🚁'], ['truck', '🚚'], ['motorbike', '🏍️'], ['plane', '✈️'], ['train', '🚆'], ['tree', '🌳'], ['shop', '🏪']]
  };
  const TOPIC_EN = { body: 'My body', animals: 'At the zoo', clothes: 'Clothes', people: 'Birthday party', food: 'Food', home: 'At home', school: 'At school', beach: 'At the beach', street: 'My street' };
  const ALL = Object.entries(V).flatMap(([t, l]) => l.map(([w, e]) => ({ w, e, t })));
  const NUMW = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const PLURAL = { mouse: 'mice', sheep: 'sheep', fish: 'fish', foot: 'feet', glasses: 'glasses', watch: 'watches', bus: 'buses', box: 'boxes', tomato: 'tomatoes', potato: 'potatoes', baby: 'babies', man: 'men', woman: 'women', grapes: 'grapes', chips: 'chips', jeans: 'jeans', dress: 'dresses', sandwich: 'sandwiches' };
  const pl = w => PLURAL[w] || w + 's';
  const COLOURS = [['red', '#e63946'], ['blue', '#1e88e5'], ['green', '#2e9e4f'], ['yellow', '#ffd23f'], ['orange', '#fb8500'], ['pink', '#ff70a6'], ['purple', '#8338ec'], ['brown', '#8d5524'], ['black', '#222222'], ['grey', '#9aa5b1'], ['white', '#ffffff']];
  const COBJ = {
    ball: '<circle cx="60" cy="60" r="46"/><path d="M20 50 Q60 70 100 50" fill="none" stroke="#22314f" stroke-width="3"/>',
    car: '<path d="M10 80 L14 58 L34 54 L48 34 L86 34 L100 54 L112 60 L112 80 Z"/><circle cx="34" cy="84" r="12" fill="#333"/><circle cx="90" cy="84" r="12" fill="#333"/>',
    hat: '<path d="M16 86 L104 86 L104 96 L16 96 Z M34 86 L40 36 Q60 26 80 36 L86 86 Z"/>',
    kite: '<path d="M60 8 L100 52 L60 104 L20 52 Z"/><path d="M60 104 q10 10 0 14 q-10 4 0 10" fill="none" stroke="#22314f" stroke-width="3"/>',
    bike: '<circle cx="28" cy="80" r="20" fill="none" stroke-width="7"/><circle cx="94" cy="80" r="20" fill="none" stroke-width="7"/><path d="M28 80 L52 46 L82 46 L94 80 M52 46 L62 80 L82 46" fill="none" stroke-width="7"/>',
    sock: '<path d="M40 10 L76 10 L76 66 L100 82 Q112 100 92 108 L50 98 Q36 92 40 76 Z"/>'
  };
  function colourPic(obj, hex) { const stroked = obj === 'bike'; return svg(120, 120, `<g fill="${stroked ? 'none' : hex}" stroke="${stroked ? hex : '#22314f'}" stroke-width="3">${COBJ[obj]}</g>`); }
  const PRAISE = ['Great job!', 'Well done!', 'Excellent!', 'Super!', 'You got it!'];
  const english = [];
  const E = (id, topic, fn) => english.push({ id, topic, gen: (opt = {}) => Object.assign({ subj: 'en', id, topic, sayLang: 'en-US', praise: pick(PRAISE) }, fn(opt)) });
  const poolOf = t => (t && t !== 'all' && V[t]) ? V[t].map(([w, e]) => ({ w, e, t })) : ALL;
  const pic = e => `<div class="emoji-pic">${e}</div>`;

  E('e_write', 'Look and write', o => { const x = pick(poolOf(o.topic)); return { prompt: 'Look at the picture. Write the word.', visual: pic(x.e), answer: x.w, input: 'text', say: x.w, hintText: `It starts with “${x.w[0]}”.`, topicName: TOPIC_EN[x.t] }; });
  E('e_howmany', 'How many?', o => { const x = pick(poolOf(o.topic).filter(v => !['sea', 'sun', 'rice', 'milk', 'juice', 'glasses', 'jeans', 'chips'].includes(v.w))), n = rand(2, 9); return { prompt: `How many ${pl(x.w)} are there?`, visual: `<div class="count-pic">${Array(n).fill(x.e).join(' ')}</div>`, answer: NUMW[n], input: 'text', say: `How many ${pl(x.w)} are there?`, hintText: `Count them: one, two, three…`, numHint: n }; });
  E('e_colour', 'What colour?', () => { const obj = pick(Object.keys(COBJ)), [c, hex] = pick(COLOURS.filter(c => !(obj === 'bike' && c[0] === 'white'))); return { prompt: `What colour is the ${obj}?`, visual: colourPic(obj, hex), answer: c, input: 'text', say: `What colour is the ${obj}?`, hintText: `It starts with “${c[0]}”.` }; });
  E('e_listen', 'Listen and choose', o => { const pool = poolOf(o.topic), x = pick(pool), opts = shuffle([x, ...shuffle(ALL.filter(v => v.w !== x.w)).slice(0, 3)]); return { prompt: 'Listen and choose the right picture.', answer: x.w, input: 'choice', choices: opts.map(v => v.w), pics: opts.map(v => pic(v.e)), say: x.w, autoSay: true, hideWords: true, hintText: 'Tap 🔊 to listen again.' }; });
  E('e_read', 'Read and choose', o => {
    const x = pick(poolOf(o.topic));
    if (Math.random() < 0.5) { const yes = Math.random() < 0.5, y = yes ? x : pick(ALL.filter(v => v.w !== x.w)); const art = /^[aeiou]/.test(y.w) ? 'an' : 'a'; return { prompt: `Look and read. This is ${art} ${y.w}.`, visual: pic(x.e), answer: yes ? 'Yes' : 'No', input: 'choice', choices: ['Yes', 'No'], say: `This is ${art} ${y.w}.`, hintText: `Read the word “${y.w}” and look at the picture again.` }; }
    const opts = shuffle([x, ...shuffle(ALL.filter(v => v.w !== x.w)).slice(0, 2)]); const art = /^[aeiou]/.test(x.w) ? 'an' : 'a';
    return { prompt: `Read and choose. Which one is ${art} ${x.w}?`, answer: x.w, input: 'choice', choices: opts.map(v => v.w), pics: opts.map(v => pic(v.e)), hideWords: true, say: `Which one is ${art} ${x.w}?`, hintText: 'Tap 🔊 to hear the word.' };
  });
  E('e_speak', 'Look and say', o => { const x = pick(poolOf(o.topic)); return { prompt: 'Look at the picture. Say the word.', visual: pic(x.e), answer: x.w, input: 'speak', say: x.w, hintText: `Listen: tap 🔊, then say it again.` }; });

  return { math, english, setContext, TOPIC_EN, V, rand, pick, shuffle };
})();
export default QB;
