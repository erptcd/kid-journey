// Luồng chơi, menu, HUD, sổ tem, bản đồ thu nhỏ, câu thưởng, chuỗi đúng
import { W } from './world.js';
import { TRAIN, METRO, VEHICLES } from './data.js';
import { VN_OUTLINE } from './vnmap.js';
import QB from './questions.js';
import QUI from './ui.js';
import { ITEMS, PAINTS } from './decor.js';

const $ = s => document.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem('kj_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('kj_' + k, JSON.stringify(v)); } catch (e) { } }
};

/* ---------- âm thanh ---------- */
let actx = null, muted = store.get('muted', false);
function ac() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (actx.state === 'suspended') actx.resume().catch(() => { }); return actx; }
function tone(f, dur, type = 'sine', vol = 0.15, delay = 0) { if (muted) return; const c = ac(); if (!c) return; const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05); }
const sfx = {
  tap() { tone(560, 0.05, 'square', 0.03); },
  board() { [660, 880].forEach((f, i) => tone(f, 0.12, 'triangle', 0.12, i * 0.1)); },
  horn(k) { if (k === 'train') [0, 0.6].forEach(d => { tone(392, 0.5, 'square', 0.05, d); tone(494, 0.5, 'square', 0.04, d); }); else if (k === 'metro') { tone(1250, 0.09, 'sine', 0.12); tone(1250, 0.09, 'sine', 0.12, 0.16); } else [0, 0.3].forEach(d => { tone(440, 0.22, 'sawtooth', 0.05, d); tone(554, 0.22, 'sawtooth', 0.04, d); }); },
  stamp() { tone(140, 0.18, 'square', 0.12); tone(90, 0.25, 'sine', 0.2, 0.02); [784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.12, 0.2 + i * 0.12)); },
  boost() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.14, 'square', 0.06, i * 0.06)); },
  buy() { [988, 1319, 1568].forEach((f, i) => tone(f, 0.12, 'triangle', 0.14, i * 0.07)); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.32, 'triangle', 0.16, i * 0.13)); }
};

/* ---------- trạng thái ---------- */
const MATH_TOPICS = [['all', '🌟 Trộn cả HK1'], ['C1', 'Ôn tập & bổ sung'], ['C2', 'Cộng, trừ trong 20'], ['C3', 'Kg và lít'], ['C4', 'Cộng, trừ có nhớ 100'], ['C5', 'Hình phẳng'], ['C6', 'Ngày, giờ, tháng']];
const EN_TYPES = [['e_write', 'Look and write'], ['e_howmany', 'How many?'], ['e_colour', 'What colour?'], ['e_listen', 'Listen and choose'], ['e_read', 'Read and choose'], ['e_speak', 'Look and say 🎤']];
const S = {
  veh: store.get('veh', 'train'), dir: store.get('dir', 1), legs: store.get('legs', 3), slots: store.get('slots', 3),
  subj: store.get('subj', 'math'), mathT: store.get('mathT', ['all']), enT: store.get('enT', EN_TYPES.map(t => t[0])), enTopic: store.get('enTopic', 'all'),
  start: null, mode: 'menu', route: [], si: 0, k: 0, results: [], bonus: 0, streak: 0, boostNext: false, usedQ: new Set(), lastGen: '', camUser: 'auto', newStamps: []
};
const baseList = () => VEHICLES[S.veh].route === 'metro' ? METRO : TRAIN;
const ordered = () => S.dir > 0 ? baseList() : baseList().slice().reverse();
const progKey = () => `prog_${VEHICLES[S.veh].route}_${S.dir}`;
function startIdx() { const L = ordered(); let i = S.start ?? store.get(progKey(), 0); if (i >= L.length - 1) i = 0; return i; }
function routeStations() { const L = ordered(), a = startIdx(), b = Math.min(L.length - 1, a + S.legs); return L.slice(a, b + 1); }
const stopWord = () => VEHICLES[S.veh].stop;

/* ---------- menu ---------- */
function chip(parent, label, sel, fn, cls = 'chip') { const b = document.createElement('button'); b.className = cls + (sel ? ' sel' : ''); b.innerHTML = label; b.onclick = () => { sfx.tap(); fn(); renderMenu(); }; parent.appendChild(b); return b; }
let previewKey = '';
function renderMenu() {
  $('#total').textContent = '⭐ ' + store.get('total', 0);
  $('#stampCount').textContent = `📖 ${store.get('stamps', []).length}`;
  const vl = $('#vehList'); vl.innerHTML = '';
  Object.entries(VEHICLES).forEach(([k, v]) => chip(vl, `<span class="em">${v.emoji}</span><span class="nm">${v.short}</span><span class="sub">${v.name}</span>`, S.veh === k, () => { S.veh = k; S.start = null; store.set('veh', k); }, 'opt'));
  // hành trình
  const L = ordered(), a = startIdx();
  const sel = $('#startSel'); sel.innerHTML = L.slice(0, -1).map((x, i) => `<option value="${i}" ${i === a ? 'selected' : ''}>${stopWord()} ${x.name} (${x.prov})</option>`).join('');
  sel.onchange = () => { S.start = +sel.value; renderMenu(); };
  const dl = $('#dirChips'); dl.innerHTML = '';
  const [n0, n1] = VEHICLES[S.veh].route === 'metro' ? ['Bến Thành', 'Suối Tiên'] : ['Bắc', 'Nam'];
  chip(dl, `${n0} → ${n1}`, S.dir > 0, () => { S.dir = 1; S.start = null; store.set('dir', 1); }); chip(dl, `${n1} → ${n0}`, S.dir < 0, () => { S.dir = -1; S.start = null; store.set('dir', -1); });
  const lg = $('#legChips'); lg.innerHTML = ''; [2, 3, 4, 5].forEach(n => chip(lg, String(n), S.legs === n, () => { S.legs = n; store.set('legs', n); }));
  const rs = routeStations(); $('#routeLine').innerHTML = rs.map(x => `<span>${x.emo} ${x.name}</span>`).join('<b>→</b>');
  // môn
  document.querySelectorAll('[data-subj]').forEach(b => { b.classList.toggle('sel', b.dataset.subj === S.subj); b.onclick = () => { sfx.tap(); S.subj = b.dataset.subj; store.set('subj', S.subj); renderMenu(); }; });
  const oc = $('#optChips'); oc.innerHTML = '';
  if (S.subj === 'math') {
    $('#optTitle').textContent = 'Chủ đề Toán 2 (Kết nối tri thức, HK1)';
    MATH_TOPICS.forEach(([id, lab]) => chip(oc, lab, S.mathT.includes(id), () => { if (id === 'all') S.mathT = ['all']; else { S.mathT = S.mathT.filter(x => x !== 'all'); S.mathT = S.mathT.includes(id) ? S.mathT.filter(x => x !== id) : [...S.mathT, id]; if (!S.mathT.length) S.mathT = ['all']; } store.set('mathT', S.mathT); }));
    $('#enTopicWrap').classList.add('hidden');
  } else {
    $('#optTitle').textContent = 'English – Cambridge Pre A1 Starters';
    EN_TYPES.forEach(([id, lab]) => chip(oc, lab, S.enT.includes(id), () => { S.enT = S.enT.includes(id) ? S.enT.filter(x => x !== id) : [...S.enT, id]; if (!S.enT.length) S.enT = [id]; store.set('enT', S.enT); }));
    $('#enTopicWrap').classList.remove('hidden');
    const ts = $('#enTopic'); ts.innerHTML = `<option value="all">All topics</option>` + Object.entries(QB.TOPIC_EN).map(([k, v]) => `<option value="${k}" ${S.enTopic === k ? 'selected' : ''}>${v}</option>`).join('');
    ts.onchange = () => { S.enTopic = ts.value; store.set('enTopic', S.enTopic); };
  }
  const word = { train: 'Số toa (số câu mỗi ga)', metro: 'Số toa (số câu mỗi ga)', car: 'Số bạn cần đón mỗi trạm', truck: 'Số thùng hàng mỗi trạm' }[S.veh];
  $('#slotTitle').textContent = word;
  const sc = $('#slotChips'); sc.innerHTML = ''; [2, 3, 4].forEach(n => chip(sc, String(n), S.slots === n, () => { S.slots = n; store.set('slots', n); }));
  const key = S.veh + S.dir + startIdx() + S.slots;
  if (key !== previewKey) { previewKey = key; setupWorld(); }
}
function setupWorld() {
  S.route = routeStations();
  const info = W.setup({ kind: S.veh, stations: S.route, slots: S.slots, legLen: 300, seed: 11 + startIdx() * 97 + (S.dir > 0 ? 0 : 5), dir: S.dir, stopWord: stopWord(), decor: equipped() });
  S.info = info; W.prepareWaiters(0); W.setCamBoard(); frameSide();
}
// Khi có bảng menu/cửa hàng bên phải: dời khung hình để thấy phương tiện ở nửa trái
function frameSide(on = true) { if (!on) return W.setShift(0, 0); if (innerWidth > 820) W.setShift(0, innerWidth * 0.2); else W.setShift(innerHeight * 0.22, 0); }
function showMenu() {
  S.mode = 'menu'; QUI.abort(); clearBonus();
  ['#hud', '#qp', '#fin', '#banner', '#mini', '#passport', '#shop'].forEach(s => $(s).classList.add('hidden'));
  $('#menu').classList.remove('hidden'); previewKey = ''; renderMenu();
}

/* ---------- chơi ---------- */
function start() {
  ac(); S.mode = 'play'; S.si = 0; S.k = 0; S.results = []; S.bonus = 0; S.usedQ = new Set(); S.newStamps = []; S.boostNext = false; W.setBoost(false);
  setupWorld();
  $('#menu').classList.add('hidden'); $('#fin').classList.add('hidden'); $('#hud').classList.remove('hidden'); $('#mini').classList.remove('hidden'); frameSide(false);
  drawMini(); renderHud();
  arriveAt(0, true);
}
function stationLabel(x) { return `${stopWord()} ${x.name}`; }
function arriveAt(i, first) {
  const x = S.route[i];
  banner(`${x.emo} ${stationLabel(x)} · ${x.prov}`, 2400);
  giveStamp(x, () => {
    if (i >= S.route.length - 1) return finish();
    S.si = i; S.k = 0; renderHud();
    QB.setContext({ veh: VEHICLES[S.veh].ctx, st: `${stopWord().toLowerCase()} ${S.route[i + 1].name}`, kid: { train: 'hành khách', metro: 'hành khách', car: 'bạn nhỏ', truck: 'thùng hàng' }[S.veh] });
    setTimeout(ask, first ? 600 : 300);
  });
}
function pickQuestion() {
  let pool;
  if (S.subj === 'math') pool = QB.math.filter(t => S.mathT.includes('all') || S.mathT.includes(t.topic.split(' · ')[0]));
  else pool = QB.english.filter(t => S.enT.includes(t.id));
  let q, g, n = 0;
  do { g = pool[Math.floor(Math.random() * pool.length)]; if (pool.length > 1 && g.id === S.lastGen && n < 5) { n++; continue; } q = g.gen({ topic: S.enTopic }); n++; } while ((!q || S.usedQ.has(q.prompt + q.answer)) && n < 25);
  S.lastGen = g.id; S.usedQ.add(q.prompt + q.answer); return q;
}
function ask() {
  if (S.mode !== 'play') return;
  const q = pickQuestion();
  $('#qTopic').textContent = `${slotLabel(S.k)} · ${q.subj === 'math' ? q.topic.split(' · ')[1] : 'Starters · ' + q.topic}`;
  showPanel();
  QUI.show(q, res => onAnswer(res));
}
function slotLabel(k) { return { train: `Toa ${k + 1}/${S.slots}`, metro: `Toa ${k + 1}/${S.slots}`, car: `Bạn ${k + 1}/${S.slots}`, truck: `Thùng hàng ${k + 1}/${S.slots}` }[S.veh]; }
function showPanel() { const qp = $('#qp'); qp.classList.remove('hidden'); qp.style.animation = 'none'; void qp.offsetWidth; qp.style.animation = ''; requestAnimationFrame(() => W.setShift(qp.offsetHeight * 0.5)); }
function hidePanel() { $('#qp').classList.add('hidden'); W.setShift(0); }
function onAnswer(res) {
  if (S.mode !== 'play') return;
  S.results.push(res);
  if (res === 'gold') { S.streak++; if (S.streak % 3 === 0) { S.boostNext = true; banner('🔥 Đúng 3 câu liền! Chặng tới được TĂNG TỐC!', 2200); sfx.boost(); } } else S.streak = 0;
  renderHud(); hidePanel();
  sfx.board();
  W.board(S.k, () => { S.k++; renderHud(); if (S.k < S.slots) setTimeout(ask, 350); else setTimeout(depart, 500); });
}
function depart() {
  if (S.mode !== 'play') return;
  const i = S.si, next = S.route[i + 1];
  sfx.horn(S.veh); W.setBoost(S.boostNext); if (S.boostNext) { $('#speedfx').classList.remove('hidden'); } S.boostNext = false;
  banner(`${VEHICLES[S.veh].emoji} Đang đến ${stationLabel(next)}…`, 2600);
  const f = S.info.feats.find(f => f.leg === i), target = W.headStopS(i + 1);
  const goStation = () => W.drive(target, { done: () => { W.setBoost(false); $('#speedfx').classList.add('hidden'); W.setCamBoard(); W.unload(() => { W.prepareWaiters(i + 1); arriveAt(i + 1); }); } });
  if (f) W.drive(f.s - 62, { done: () => bonus(f, goStation) }); else goStation();
}
/* ---------- câu thưởng ---------- */
let bonusTimer = null;
function clearBonus() { clearInterval(bonusTimer); bonusTimer = null; $('#bonusBar').classList.add('hidden'); }
function bonus(f, cont) {
  if (S.mode !== 'play') return;
  const what = f.type === 'tunnel' ? 'chui qua hầm' : 'qua cầu';
  banner(`⚡ Câu thưởng! Trả lời nhanh để ${what}`, 2000);
  const q = pickQuestion(); $('#qTopic').textContent = `⚡ Câu thưởng · ${what}`;
  showPanel(); let left = 25; const bar = $('#bonusBar'); bar.classList.remove('hidden'); bar.firstElementChild.style.width = '100%';
  let done = false; const end = (txt) => { if (done) return; done = true; clearBonus(); hidePanel(); banner(txt, 1800); setTimeout(cont, 600); };
  bonusTimer = setInterval(() => { left -= 0.1; bar.firstElementChild.style.width = Math.max(0, left / 25 * 100) + '%'; if (left <= 0) { QUI.abort(); end('⏰ Hết giờ rồi! Mình đi tiếp nhé'); } }, 100);
  QUI.show(q, res => { if (res !== 'miss') { S.bonus++; renderHud(); end('🌟 Giỏi quá! Được thêm 1 sao thưởng'); } else end('Không sao, mình đi tiếp nhé!'); });
}
/* ---------- tem ga ---------- */
function giveStamp(x, cont) {
  const have = store.get('stamps', []);
  if (have.includes(x.id)) { setTimeout(cont, 400); return; }
  have.push(x.id); store.set('stamps', have); S.newStamps.push(x);
  const el = $('#stampPop'); el.innerHTML = stampHtml(x, true) + `<div class="sp-t">Bé nhận được tem mới!</div>`; el.classList.remove('hidden');
  sfx.stamp();
  setTimeout(() => { el.classList.add('hidden'); cont(); }, 2300);
}
function stampHtml(x, on) { return `<div class="stamp ${on ? '' : 'off'}"><div class="st-e">${on ? x.emo : '?'}</div><div class="st-n">${x.name}</div><div class="st-p">${on ? x.prov : ''}</div><div class="st-f">${on ? x.fame : ''}</div></div>`; }
function showPassport() {
  const have = new Set(store.get('stamps', []));
  const sec = (title, list) => `<h3>${title} <small>${list.filter(x => have.has(x.id)).length}/${list.length}</small></h3><div class="stamps">${list.map(x => stampHtml(x, have.has(x.id))).join('')}</div>`;
  $('#ppBody').innerHTML = sec('🚂 Đường sắt Bắc – Nam', TRAIN) + sec('🚇 Metro số 1', METRO);
  $('#passport').classList.remove('hidden');
}
/* ---------- kết thúc ---------- */
function finish() {
  S.mode = 'finish'; hidePanel();
  const gold = S.results.filter(r => r === 'gold').length, total = S.results.length;
  store.set('total', store.get('total', 0) + gold + S.bonus);
  const L = ordered(), endIdx = L.indexOf(S.route[S.route.length - 1]); store.set(progKey(), endIdx >= L.length - 1 ? 0 : endIdx); S.start = null;
  $('#finStars').textContent = '⭐'.repeat(gold) + '☆'.repeat(total - gold) + (S.bonus ? '  +' + '🌟'.repeat(S.bonus) : '');
  const r = total ? gold / total : 0;
  $('#finMsg').textContent = r === 1 ? 'Hoàn hảo! Bé đúng hết ngay lần đầu! 🏆' : r >= 0.6 ? `Giỏi lắm! Bé được ${gold + S.bonus} sao.` : `Bé được ${gold + S.bonus} sao. Chơi tiếp để giỏi hơn nhé!`;
  $('#finWallet').textContent = `Bé đang có ${store.get('total', 0)} ⭐ để mua đồ trang trí`;
  $('#finStamps').innerHTML = S.newStamps.length ? `<div class="fs-t">Tem mới:</div><div class="stamps small">${S.newStamps.map(x => stampHtml(x, true)).join('')}</div>` : '';
  const nx = L[store.get(progKey(), 0)];
  $('#againBtn').textContent = endIdx >= L.length - 1 ? 'Đi lại từ đầu tuyến 🔁' : `Đi tiếp từ ${stopWord()} ${nx.name} ➜`;
  setTimeout(() => { $('#fin').classList.remove('hidden'); sfx.win(); confetti(); }, 500);
}
function confetti() { const c = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c']; for (let i = 0; i < 90; i++) { const d = document.createElement('div'); d.className = 'confetti'; d.style.left = Math.random() * 100 + 'vw'; d.style.background = c[i % 6]; d.style.animationDuration = (2 + Math.random() * 2.5) + 's'; d.style.animationDelay = Math.random() * 0.8 + 's'; document.body.appendChild(d); setTimeout(() => d.remove(), 5500); } }

/* ---------- cửa hàng trang trí ---------- */
const owned = () => store.get('owned', ['paint_classic']);
function equipped() { return store.get('equip', ['paint_classic']); }
let shopTab = 'items', shopFrom = 'menu';
function openShop(from) {
  shopFrom = from; $('#shop').classList.remove('hidden');
  if (from === 'menu') $('#menu').classList.add('hidden'); else $('#fin').classList.add('hidden');
  frameSide();
  renderShop();
}
function closeShop() { $('#shop').classList.add('hidden'); if (shopFrom === 'menu') { $('#menu').classList.remove('hidden'); renderMenu(); } else { $('#fin').classList.remove('hidden'); frameSide(false); } }
function renderShop(msg) {
  const wallet = store.get('total', 0), own = owned(), eq = equipped();
  $('#shopWallet').textContent = `⭐ ${wallet}`;
  document.querySelectorAll('[data-stab]').forEach(b => { b.classList.toggle('sel', b.dataset.stab === shopTab); b.onclick = () => { sfx.tap(); shopTab = b.dataset.stab; renderShop(); }; });
  const list = shopTab === 'items' ? ITEMS : PAINTS, g = $('#shopGrid'); g.innerHTML = '';
  list.forEach(it => {
    const has = own.includes(it.id), on = eq.includes(it.id), d = document.createElement('button');
    const note = it.only && !it.only.includes(S.veh) ? `<span class="sh-note">chỉ cho ${it.only.map(v => ({ train: 'tàu hoả', metro: 'metro' }[v])).join(', ')}</span>` : '';
    d.className = 'sh-item' + (on ? ' on' : '') + (!has && it.price > wallet ? ' poor' : '');
    d.innerHTML = `<span class="sh-e">${it.emo}</span><span class="sh-n">${it.name}</span>${note}<span class="sh-p">${has ? (on ? '✅ Đang dùng' : 'Bấm để dùng') : `⭐ ${it.price}`}</span>`;
    d.onclick = () => {
      let e = equipped();
      if (!has) {
        if (it.price > store.get('total', 0)) { sfx.tap(); return renderShop(`Còn thiếu ${it.price - store.get('total', 0)} ⭐. Chơi thêm để kiếm sao nhé!`); }
        store.set('total', store.get('total', 0) - it.price); store.set('owned', [...owned(), it.id]); sfx.buy();
        if (shopTab === 'paints') e = e.filter(x => !x.startsWith('paint_')); e = [...e, it.id]; msg = `🎉 Bé đã mua ${it.name}!`;
      } else if (shopTab === 'paints') { e = [...e.filter(x => !x.startsWith('paint_')), it.id]; sfx.tap(); }
      else { e = on ? e.filter(x => x !== it.id) : [...e, it.id]; sfx.tap(); }
      store.set('equip', e); W.redecorate(e); renderShop(msg);
    };
    g.appendChild(d);
  });
  $('#shopMsg').textContent = msg || 'Mỗi câu đúng ngay lần đầu được 1 ⭐. Dùng sao để trang trí phương tiện!';
}

/* ---------- HUD ---------- */
let bannerT = 0;
function banner(t, ms) { const b = $('#banner'); b.textContent = t; b.classList.remove('hidden'); b.style.opacity = 1; clearTimeout(bannerT); if (ms) bannerT = setTimeout(() => { b.style.opacity = 0; setTimeout(() => b.classList.add('hidden'), 300); }, ms); }
function renderHud() {
  const cur = S.route[S.si], nx = S.route[S.si + 1];
  $('#hudRoute').innerHTML = nx ? `<b>${cur.emo} ${cur.name}</b> → ${nx.emo} ${nx.name} <small>(${S.si + 1}/${S.route.length - 1})</small>` : `<b>${cur.emo} ${cur.name}</b>`;
  const gold = S.results.filter(r => r === 'gold').length; $('#starPill').textContent = `⭐ ${gold + S.bonus}`;
  $('#streak').innerHTML = `🔥 ${'●'.repeat(S.streak % 3)}${'○'.repeat(3 - S.streak % 3)}`;
  const sl = $('#slots'); sl.innerHTML = Array.from({ length: S.slots }, (_, k) => `<span class="${k < S.k ? 'on' : ''}">${{ train: '🚃', metro: '🚃', car: '🧒', truck: '📦' }[S.veh]}</span>`).join('');
}
/* ---------- bản đồ thu nhỏ ---------- */
const PX = lon => (lon - 102) * 13 + 4, PY = lat => (23.6 - lat) * 13 + 4;
function drawMini() {
  const m = $('#mini');
  if (VEHICLES[S.veh].route === 'metro') {
    const L = METRO, w = 230;
    m.innerHTML = `<svg viewBox="0 0 ${w} 60" width="${w}" height="60"><line x1="10" y1="30" x2="${w - 10}" y2="30" stroke="#1565c0" stroke-width="5" stroke-linecap="round"/>${L.map((x, i) => { const on = S.route.includes(x); return `<circle cx="${10 + i * (w - 20) / 13}" cy="30" r="${on ? 5 : 3.5}" fill="${x.under ? '#90a4ae' : '#fff'}" stroke="#1565c0" stroke-width="2"/>`; }).join('')}<circle id="miniDot" r="6" fill="#e63946" stroke="#fff" stroke-width="2"/><text x="10" y="54" font-size="10" font-weight="700" fill="#22314f">Bến Thành</text><text x="${w - 10}" y="54" font-size="10" font-weight="700" text-anchor="end" fill="#22314f">Suối Tiên</text><text x="10" y="14" font-size="10" fill="#607d8b">ngầm ●</text></svg>`;
    m.dataset.kind = 'metro';
  } else {
    const d = 'M' + VN_OUTLINE.map(([lo, la]) => `${PX(lo).toFixed(1)},${PY(la).toFixed(1)}`).join('L') + 'Z';
    const line = 'M' + TRAIN.map(x => `${PX(x.lon).toFixed(1)},${PY(x.lat).toFixed(1)}`).join('L');
    m.innerHTML = `<svg viewBox="0 0 104 206" width="104" height="206"><path d="${d}" fill="#c8e6c9" stroke="#66bb6a" stroke-width="1"/><path d="${line}" fill="none" stroke="#8d6e63" stroke-width="1.6" stroke-dasharray="3 2"/>${TRAIN.map(x => `<circle cx="${PX(x.lon)}" cy="${PY(x.lat)}" r="${S.route.includes(x) ? 2.6 : 1.6}" fill="${S.route.includes(x) ? '#ff7a3d' : '#5d4037'}"/>`).join('')}<circle id="miniDot" r="4" fill="#e63946" stroke="#fff" stroke-width="1.5"/><text x="60" y="30" font-size="8" font-weight="700" fill="#2e7d32">Hà Nội</text><text x="62" y="186" font-size="8" font-weight="700" fill="#2e7d32">Sài Gòn</text></svg>`;
    m.dataset.kind = 'vn';
  }
}
function updateMini() {
  const dot = document.getElementById('miniDot'); if (!dot || !S.info) return;
  const s = W.vehS(), ss = S.info.stationS; let i = 0; while (i < ss.length - 2 && s > ss[i + 1]) i++;
  const u = Math.max(0, Math.min(1, (s - ss[i]) / (ss[i + 1] - ss[i]))), a = S.route[i], b = S.route[i + 1] || a;
  if ($('#mini').dataset.kind === 'metro') { const ia = METRO.indexOf(a), ib = METRO.indexOf(b), w = 230; const x = 10 + (ia + (ib - ia) * u) * (w - 20) / 13; dot.setAttribute('cx', x); dot.setAttribute('cy', 30); }
  else { dot.setAttribute('cx', PX(a.lon + (b.lon - a.lon) * u)); dot.setAttribute('cy', PY(a.lat + (b.lat - a.lat) * u)); }
}

/* ---------- sự kiện ---------- */
$('#goBtn').onclick = () => { sfx.tap(); start(); };
$('#againBtn').onclick = () => { sfx.tap(); S.start = null; previewKey = ''; start(); };
// Nút dành cho phụ huynh: phải giữ 2 giây mới về menu (tránh bé bấm nhầm đổi xe giữa chừng)
function holdButton(el, ms, onDone, hint) {
  let t0 = 0, raf = 0;
  const stop = () => { cancelAnimationFrame(raf); t0 = 0; el.style.setProperty('--p', 0); };
  const tick = () => { if (!t0) return; const p = Math.min(1, (performance.now() - t0) / ms); el.style.setProperty('--p', p); if (p >= 1) { stop(); onDone(); } else raf = requestAnimationFrame(tick); };
  el.addEventListener('pointerdown', e => { e.preventDefault(); t0 = performance.now(); raf = requestAnimationFrame(tick); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.addEventListener(ev, () => { if (t0) banner(hint, 1800); stop(); }));
  el.addEventListener('contextmenu', e => e.preventDefault());
}
holdButton($('#homeBtn'), 2000, () => { sfx.tap(); showMenu(); }, '🔒 Phụ huynh giữ nút 2 giây để về menu');
holdButton($('#menuBtn'), 2000, () => { sfx.tap(); showMenu(); }, '🔒 Phụ huynh giữ nút 2 giây để đổi xe / môn học');
$('#ppBtn').onclick = () => { sfx.tap(); showPassport(); };
$('#stampCount').onclick = () => { sfx.tap(); showPassport(); };
$('#ppClose').onclick = () => $('#passport').classList.add('hidden');
$('#shopBtn').onclick = () => { sfx.tap(); openShop('menu'); };
$('#finShopBtn').onclick = () => { sfx.tap(); openShop('fin'); };
$('#shopClose').onclick = () => { sfx.tap(); closeShop(); };
const CAMS = [['auto', '🎥 Tự động'], ['chase', '🎥 Sau tàu'], ['side', '🎥 Bên hông'], ['high', '🎥 Trên cao']];
$('#camBtn').onclick = () => { const i = (CAMS.findIndex(c => c[0] === S.camUser) + 1) % CAMS.length; S.camUser = CAMS[i][0]; W.setCamUser(S.camUser); $('#camBtn').title = CAMS[i][1]; banner(CAMS[i][1], 1000); };
function setMute() { $('#muteBtn').textContent = muted ? '🔇' : '🔊'; QUI.setMuted(muted); }
$('#muteBtn').onclick = () => { muted = !muted; store.set('muted', muted); setMute(); try { if (muted) speechSynthesis.cancel(); } catch (e) { } };
$('#qListen').onclick = () => QUI.speak();
document.addEventListener('keydown', e => { if (S.mode === 'menu' && e.key === 'Enter') start(); });
setMute();

/* ---------- vòng lặp ---------- */
W.init(document.getElementById('c'));
let last = performance.now(), frames = 0;
function loop(now) { const dt = Math.min(0.05, (now - last) / 1000) * (window.__ts || 1); last = now; W.update(dt, now / 1000); if (S.mode === 'play') updateMini(); frames++; requestAnimationFrame(loop); }
window.__kj = { S, W, start, showMenu, frames: () => frames, QUI };
const fontsReady = document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]) : Promise.resolve();
fontsReady.then(() => { $('#loading').remove(); showMenu(); requestAnimationFrame(loop); });
