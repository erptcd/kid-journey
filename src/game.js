// Luồng chơi, menu, HUD, sổ tem, bản đồ thu nhỏ, câu thưởng, chuỗi đúng
import { W } from './world.js';
import { TRAIN, METRO, VEHICLES } from './data.js';
import { VN_OUTLINE } from './vnmap.js';
import QB from './questions.js';
import QUI from './ui.js';
import { ITEMS, PAINTS } from './decor.js';
import { sfx, sfx2, spray as sndSpray, audio, setMuted as sndMute, engineStart, engineStop, engineUpdate } from './sound.js';

const $ = s => document.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem('kj_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('kj_' + k, JSON.stringify(v)); } catch (e) { } }
};

/* ---------- âm thanh ---------- */
let muted = store.get('muted', false); sndMute(muted);
const ac = audio;

/* ---------- trạng thái ---------- */
const MATH_TOPICS = [['all', '🌟 Trộn cả HK1'], ['C1', 'Ôn tập & bổ sung'], ['C2', 'Cộng, trừ trong 20'], ['C3', 'Kg và lít'], ['C4', 'Cộng, trừ có nhớ 100'], ['C5', 'Hình phẳng'], ['C6', 'Ngày, giờ, tháng']];
const EN_TYPES = [['e_write', 'Look and write'], ['e_howmany', 'How many?'], ['e_colour', 'What colour?'], ['e_listen', 'Listen and choose'], ['e_read', 'Read and choose'], ['e_speak', 'Look and say 🎤']];
const S = {
  veh: store.get('veh', 'train'), dir: store.get('dir', 1), legs: store.get('legs', 3), slots: store.get('slots', 3),
  subj: store.get('subj', 'math'), mathT: store.get('mathT', ['all']), enT: store.get('enT', EN_TYPES.map(t => t[0])), enTopic: store.get('enTopic', 'all'),
  start: null, mode: 'menu', route: [], si: 0, k: 0, results: [], bonus: 0, streak: 0, boostNext: false, usedQ: new Set(), lastGen: '', camUser: 'auto', newStamps: [],
  coins: 0, mStars: 0, carry: null, missionLegs: [], steer: null, inMission: null, usedRev: new Set()
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
  $('#reviewBtn').textContent = `📝 ${store.get('review', []).length}`;
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
  const word = VEHICLES[S.veh].slotTitle;
  $('#slotTitle').textContent = word;
  const sc = $('#slotChips'); sc.innerHTML = ''; [1, 2, 3, 4].forEach(n => chip(sc, String(n), S.slots === n, () => { S.slots = n; store.set('slots', n); }));
  const key = S.veh + S.dir + startIdx() + S.slots;
  if (key !== previewKey) { previewKey = key; setupWorld(); }
}
function setupWorld() {
  S.route = routeStations();
  const info = W.setup({ kind: S.veh, stations: S.route, slots: S.slots, legLen: 300, seed: 11 + startIdx() * 97 + (S.dir > 0 ? 0 : 5), dir: S.dir, stopWord: stopWord(), decor: equipped(), missions: S.mode === 'play' ? S.missionLegs : [] });
  S.info = info; W.prepareWaiters(0); W.setCamBoard(); frameSide();
}
// Khi có bảng menu/cửa hàng bên phải: dời khung hình để thấy phương tiện ở nửa trái
function frameSide(on = true) { if (!on) return W.setShift(0, 0); if (innerWidth > 820) W.setShift(0, innerWidth * 0.2); else W.setShift(innerHeight * 0.22, 0); }
function showMenu() {
  S.mode = 'menu'; QUI.abort(); clearBonus(); engineStop(); setSteer(null); hideMissionBtn(); S.inMission = null; S.carry = null; try { W.endMission(); W.clearFun(); } catch (e) { }
  ['#hud', '#qp', '#fin', '#banner', '#mini', '#passport', '#shop', '#review'].forEach(s => $(s).classList.add('hidden'));
  $('#menu').classList.remove('hidden'); previewKey = ''; renderMenu();
}

/* ---------- chơi ---------- */
function start() {
  ac(); engineStart(S.veh); S.mode = 'play'; S.si = 0; S.k = 0; S.results = []; S.bonus = 0; S.usedQ = new Set(); S.newStamps = []; S.boostNext = false; W.setBoost(false); S.coins = 0; S.mStars = 0; S.carry = null; S.inMission = null; S.usedRev = new Set();
  S.missionLegs = [];
  if (VEHICLES[S.veh].track === 'road') { const n = routeStations().length - 1; for (let i = 0; i < n; i++) S.missionLegs.push(i); } // xe đường bộ: chặng nào cũng có nhiệm vụ
  if (window.__forceMissions) S.missionLegs = window.__forceMissions.slice(); // dùng cho test.js
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
    QB.setContext({ veh: VEHICLES[S.veh].ctx, st: `${stopWord().toLowerCase()} ${S.route[i + 1].name}`, kid: VEHICLES[S.veh].kid });
    setTimeout(ask, first ? 600 : 300);
  });
}
function allGens() { return [...QB.math, ...QB.english]; }
function similar(q0) {
  const g = allGens().find(x => x.id === q0.id); if (!g) return pickQuestion(true);
  let q, n = 0; do { q = g.gen({ topic: S.enTopic }); n++; } while (q && q.prompt + q.answer === q0.prompt + q0.answer && n < 12);
  return q;
}
function reviewPick() {
  if (!store.get('reviewOn', false) || Math.random() >= 0.35) return null;
  const L = store.get('review', []).filter(e => e.q.subj === S.subj && !S.usedRev.has(e.key));
  if (!L.length) return null;
  const e = L[Math.floor(Math.random() * L.length)]; S.usedRev.add(e.key);
  return Object.assign({}, e.q, { _rev: e.key });
}
function pickQuestion(noReview) {
  if (!noReview) { const r = reviewPick(); if (r) return r; }
  let pool;
  if (S.subj === 'math') pool = QB.math.filter(t => S.mathT.includes('all') || S.mathT.includes(t.topic.split(' · ')[0]));
  else pool = QB.english.filter(t => S.enT.includes(t.id));
  let q, g, n = 0;
  do { g = pool[Math.floor(Math.random() * pool.length)]; if (pool.length > 1 && g.id === S.lastGen && n < 5) { n++; continue; } q = g.gen({ topic: S.enTopic }); n++; } while ((!q || S.usedQ.has(q.prompt + q.answer)) && n < 25);
  S.lastGen = g.id; S.usedQ.add(q.prompt + q.answer); return q;
}
function ask(retryOf) {
  if (S.mode !== 'play') return;
  const q = retryOf ? similar(retryOf) : pickQuestion();
  $('#qTopic').textContent = `${retryOf ? '🔁 Câu tương tự · ' : q._rev ? '📝 Ôn lại · ' : ''}${slotLabel(S.k)} · ${q.subj === 'math' ? q.topic.split(' · ')[1] : 'Starters · ' + q.topic}`;
  showPanel();
  QUI.show(q, res => onAnswer(res, q));
}
function slotLabel(k) { return `${VEHICLES[S.veh].slotName} ${k + 1}/${S.slots}`; }
function showPanel() { const qp = $('#qp'); qp.classList.remove('hidden'); qp.style.animation = 'none'; void qp.offsetWidth; qp.style.animation = ''; requestAnimationFrame(() => W.setShift(qp.offsetHeight * 0.5)); }
function hidePanel() { $('#qp').classList.add('hidden'); W.setShift(0); }
function onAnswer(res, q) {
  if (S.mode !== 'play') return;
  S.results.push(res); noteReview(q, res);
  if (res === 'miss') { // sai 3 lần: không lên khách, phải làm câu tương tự
    S.streak = 0; renderHud(); hidePanel();
    banner('💪 Mình làm một câu tương tự nhé!', 1800);
    setTimeout(() => ask(q), 900); return;
  }
  if (res === 'gold') { S.streak++; if (S.streak % 3 === 0) { S.boostNext = true; setTimeout(() => { banner('🔥 Đúng 3 câu liền! Chặng tới được TĂNG TỐC!', 2200); sfx.boost(); }, 900); } } else S.streak = 0;
  renderHud(); hidePanel();
  celebrate(res);
  W.cheer(S.k);
  setTimeout(() => { sfx.board(); W.board(S.k, () => { S.k++; renderHud(); if (S.k < S.slots) setTimeout(ask, 350); else setTimeout(depart, 500); }); }, 950);
}
const PRAISE = ['Bé giỏi quá! 🎉', 'Tuyệt vời! 🌟', 'Đúng rồi, siêu ghê! 👏', 'Khách vui lắm! 🎈', 'Hoan hô bé! 🥳'];
function celebrate(res) {
  sfx2.cheer(); burstConfetti(36);
  const pr = $('#praise'); pr.textContent = res === 'gold' ? PRAISE[Math.floor(Math.random() * PRAISE.length)] : 'Làm đúng rồi! 👍'; pr.classList.remove('hidden'); pr.style.animation = 'none'; void pr.offsetWidth; pr.style.animation = '';
  setTimeout(() => pr.classList.add('hidden'), 1300);
  if (res === 'gold') flyStar(innerWidth / 2, innerHeight * 0.55);
}
function flyStar(x, y, txt = '⭐') {
  const t = $('#starPill').getBoundingClientRect(), d = document.createElement('div'); d.className = 'flystar'; d.textContent = txt;
  d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d);
  requestAnimationFrame(() => requestAnimationFrame(() => { d.style.left = (t.left + t.width / 2) + 'px'; d.style.top = (t.top + t.height / 2) + 'px'; d.style.transform = 'translate(-50%,-50%) scale(.5)'; d.style.opacity = '.3'; }));
  setTimeout(() => { d.remove(); const p = $('#starPill'); p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop'); }, 750);
}
function burstConfetti(n) { const c = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c']; for (let i = 0; i < n; i++) { const d = document.createElement('div'); d.className = 'confetti burst'; d.style.left = (35 + Math.random() * 30) + 'vw'; d.style.top = '45vh'; d.style.background = c[i % 6]; d.style.setProperty('--dx', ((Math.random() - 0.5) * 70) + 'vw'); d.style.setProperty('--dy', (-20 - Math.random() * 40) + 'vh'); d.style.animationDuration = (1.2 + Math.random() * 0.8) + 's'; document.body.appendChild(d); setTimeout(() => d.remove(), 2200); } }
/* ---------- sổ câu sai ---------- */
const plain = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
function noteReview(q, res) {
  if (!q) return;
  const L = store.get('review', []), key = q._rev || (q.id + '|' + plain(q.prompt) + '|' + q.answer), i = L.findIndex(e => e.key === key);
  if (res === 'gold') { if (i >= 0) { L[i].ok = (L[i].ok || 0) + 1; if (L[i].ok >= 2) L.splice(i, 1); store.set('review', L); } return; }
  const qq = Object.assign({}, q); delete qq._rev;
  if (i >= 0) { L[i].wrong++; L[i].ok = 0; L[i].t = Date.now(); } else L.unshift({ key, q: qq, wrong: 1, ok: 0, t: Date.now() });
  store.set('review', L.slice(0, 60));
}
function showReview() {
  const L = store.get('review', []);
  $('#rvOn').checked = store.get('reviewOn', false);
  $('#rvBody').innerHTML = L.length ? L.map(e => { const q = e.q, ans = q.calc ? q.calc.text : q.answer + (q.unit ? ' ' + q.unit : ''); return `<div class="rv-item"><span class="rv-s">${q.subj === 'math' ? '➕' : '🔤'}</span><div class="rv-q"><div>${plain(q.prompt).slice(0, 160) || q.topic}${q.eq ? ' ' + plain(q.eq) : ''}</div><div class="rv-a">Đáp án: <b>${ans}</b> · <small>${q.topic}</small></div></div><span class="rv-n">sai ${e.wrong}<br><small>đúng ${e.ok || 0}/2</small></span></div>`; }).join('') : '<p style="font-weight:700">Chưa có câu sai nào. Bé giỏi quá! 🌟</p>';
  $('#rvClear').textContent = 'Xoá sổ'; $('#review').classList.remove('hidden');
}
function depart() {
  if (S.mode !== 'play') return;
  const i = S.si, next = S.route[i + 1], road = VEHICLES[S.veh].track === 'road';
  sfx.horn(S.veh); W.setBoost(S.boostNext); if (S.boostNext) { $('#speedfx').classList.remove('hidden'); } S.boostNext = false;
  banner(`${VEHICLES[S.veh].emoji} Đang đến ${stationLabel(next)}…`, 2400);
  if (i === 0) setTimeout(() => S.mode === 'play' && banner(road ? '◀ ▶ Bé lái xe nhặt ⭐, tránh trâu, cọc, ổ gà nhé!' : '✨ Chạm vào ⭐ bên đường để nhặt sao!', 3200), 2500);
  const f = S.info.feats.find(f => f.leg === i), target = W.headStopS(i + 1), mS = S.missionLegs.includes(i) ? W.missionS(i) : null;
  W.spawnFun(W.vehS() + 22, target - 40, { avoid: [f && f.s, mS].filter(x => x != null), emoji: next.emo });
  const stops = [];
  if (mS != null) stops.push({ s: mS, fn: c => mission(c) });
  if (f) stops.push({ s: f.s - 62, fn: c => bonus(f, c) });
  stops.sort((a, b) => a.s - b.s);
  const driveTo = (s, done) => { setSteer(road ? 'lanes' : null); W.drive(s, { fun: true, done: () => { setSteer(null); done(); } }); };
  const goStation = () => driveTo(target, () => {
    W.setBoost(false); $('#speedfx').classList.add('hidden'); W.setCamBoard(); sfx.brake(S.veh); W.clearFun();
    const unload = () => W.unload(() => { W.prepareWaiters(i + 1); arriveAt(i + 1); });
    if (S.carry) { const t = S.carry; S.carry = null; banner(MISSION_TXT[t].meet, 2000); W.meetFamily(t, () => { S.mStars += 2; renderHud(); sfx2.cheer(); burstConfetti(30); flyStar(innerWidth / 2, innerHeight / 2, '💖'); banner(t === 'truck' ? '🌟 Giao hàng giỏi quá! +2 ⭐' : '💖 Người nhà cảm ơn bé! +2 ⭐', 2200); setTimeout(unload, 900); }); }
    else unload();
  });
  const step = () => { if (S.mode !== 'play') return; const nx = stops.shift(); if (!nx) return goStation(); driveTo(nx.s, () => nx.fn(step)); };
  step();
}
/* ---------- nhiệm vụ xe ưu tiên ---------- */
const MISSION_TXT = {
  fire: { start: '🔥 Có cháy! ◀ ▶ để ngắm, bấm 💦 để phun, bấm 🛑 để dừng', done: '💦 Bé dập tắt hết đám cháy! +3 ⭐', stars: 3 },
  ambulance: { start: '🚑 Có người bị ốm bên đường! Bấm vào người bệnh để đón', btn: '🚑 Đón người bệnh', picked: '🚑 Đã đón người bệnh! Mình chở tới trạm sau nhé', meet: '💐 Người nhà đón người bệnh!' },
  police: { start: '🚓 Có bé bị lạc đang khóc! Bấm vào bé để giúp', btn: '🚓 Giúp bé lạc', picked: '🚓 Đã đón bé lạc! Mình đưa bé tới trạm sau gặp bố mẹ nhé', meet: '👨‍👩‍👧 Bé lạc đã gặp lại bố mẹ!' },
  car: { start: '🧒 Có em bé vẫy tay bên đường! Bấm vào em bé để đón', btn: '🧒 Đón em bé', picked: '🚗 Đã đón em bé! Mình chở em tới trạm sau gặp bố mẹ nhé', meet: '👨‍👩‍👧 Em bé về với bố mẹ rồi!' },
  taxi: { start: '🙋 Có khách vẫy taxi! Bấm vào khách để đón', btn: '🙋 Đón khách', picked: '🚕 Khách đã lên xe! Chở khách tới trạm sau nhé', meet: '🧳 Khách tới nơi, người nhà ra đón!' },
  truck: { start: '📦 Bác nông dân nhờ chở hàng! Bấm vào đống hàng để chất lên xe', btn: '📦 Chất hàng lên xe', picked: '🚚 Đã chất hàng! Chở tới trạm sau giao nhé', meet: '🏪 Giao hàng xong, cô bán hàng cảm ơn!' }
};
let missionCont = null;
function mission(cont) {
  if (S.mode !== 'play') return;
  const type = S.veh, T = MISSION_TXT[type]; S.inMission = type; missionCont = cont;
  W.setBoost(false); $('#speedfx').classList.add('hidden');
  sfx2.alarm(); W.setupMission(type); banner(T.start, 3600);
  if (type === 'fire') { setSteer('fire'); setSpray(false); setTimeout(() => { const m = W.mission(); if (S.inMission === 'fire' && m && m.left) banner(`🔥 Còn ${m.left} đám cháy`, 60000); }, 3700); }
  else { const b = $('#missionBtn'); b.textContent = T.btn; b.classList.remove('hidden'); }
}
function hideMissionBtn() { $('#missionBtn').classList.add('hidden'); }
function missionEnd(stars, txt) {
  const cont = missionCont; missionCont = null; S.inMission = null;
  if (stars) { S.mStars += stars; renderHud(); flyStar(innerWidth / 2, innerHeight / 2, '🏅'); }
  sfx2.cheer(); burstConfetti(40); banner(txt, 2600);
  setTimeout(() => { W.endMission(); if (S.mode === 'play' && cont) cont(); }, 2200);
}
W.onEvt = (t, d) => {
  if (S.mode !== 'play') return;
  if (t === 'coin') { S.coins += d.n; renderHud(); sfx2.coin(); flyStar(d.x, d.y, d.kind === 'gift' ? '🎁' : '⭐'); }
  else if (t === 'bump') { sfx2.bump(); banner({ buffalo: '🐃 Ối, con trâu! Lái tránh nhé', cone: '🚧 Cẩn thận cọc chắn đường!', hole: '🕳️ Ổ gà! Xe chậm lại rồi' }[d.kind], 1500); }
  else if (t === 'fireLeft' && S.inMission === 'fire') { if (d.n > 0) banner(`🔥 Còn ${d.n} đám cháy`, 60000); }
  else if (t === 'missionDone') { setSteer(null); setSpray(false); missionEnd(MISSION_TXT.fire.stars, MISSION_TXT.fire.done); }
  else if (t === 'picked') { hideMissionBtn(); S.carry = d.type; missionEnd(0, MISSION_TXT[d.type].picked); }
};
/* ---------- điều khiển: ◀ ▶, 💦, vuốt, kéo ngón ---------- */
function setSteer(mode) {
  S.steer = mode; const el = $('#steer');
  el.classList.toggle('hidden', !mode); el.dataset.mode = mode || '';
  $('#sprayBtn').classList.toggle('hidden', mode !== 'fire');
  if (mode !== 'fire') { setSpray(false); W.missionSteer(0); }
}
let spraying = false;
function setSpray(on) {
  spraying = !!on && S.steer === 'fire'; W.spray(spraying); sndSpray(spraying);
  const b = $('#sprayBtn'); b.classList.toggle('on', spraying); b.classList.toggle('hint', !spraying && S.steer === 'fire');
  b.innerHTML = spraying ? '<span>🛑</span><small>Dừng</small>' : '<span>💦</span><small>Phun</small>';
}
const toggleSpray = () => setSpray(!spraying);
function steerBtn(el, dir) {
  el.addEventListener('pointerdown', e => { e.preventDefault(); if (S.steer === 'lanes') W.steer(dir); else if (S.steer === 'fire') W.missionSteer(dir); el.classList.add('on'); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.addEventListener(ev, () => { el.classList.remove('on'); if (S.steer === 'fire') W.missionSteer(0); }));
}
steerBtn($('#stL'), -1); steerBtn($('#stR'), 1);
// Bé tự bấm 💦 để phun, bấm 🛑 để dừng (bấm 1 lần, không cần giữ)
$('#sprayBtn').addEventListener('pointerdown', e => { e.preventDefault(); sfx.tap(); toggleSpray(); });
$('#missionBtn').onclick = () => { sfx.tap(); W.missionTap(0, 0, true); hideMissionBtn(); };
{
  const cv = document.getElementById('c'); let p0 = null, drag = false;
  cv.addEventListener('pointerdown', e => {
    if (S.mode !== 'play') return;
    if (S.steer === 'fire') { drag = true; cv.setPointerCapture(e.pointerId); W.missionAim(e.clientX, e.clientY); return; } // chạm/kéo chỉ để ngắm, không tự phun
    p0 = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  cv.addEventListener('pointermove', e => { if (drag && S.steer === 'fire') W.missionAim(e.clientX, e.clientY); });
  const up = e => {
    if (drag) { drag = false; return; }
    if (!p0 || S.mode !== 'play') return; const dx = e.clientX - p0.x, dy = e.clientY - p0.y; p0 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) && S.steer === 'lanes') { W.steer(dx > 0 ? 1 : -1); return; }
    if (Math.hypot(dx, dy) < 25) { if (W.tapAt(e.clientX, e.clientY) && S.inMission && S.inMission !== 'fire') hideMissionBtn(); }
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', () => { drag = false; p0 = null; });
}
document.addEventListener('keydown', e => {
  if (S.mode !== 'play' || !S.steer) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { const d = e.key === 'ArrowLeft' ? -1 : 1; if (S.steer === 'lanes') { if (!e.repeat) W.steer(d); } else W.missionSteer(d); e.preventDefault(); }
  if (e.key === ' ' && S.steer === 'fire') { if (!e.repeat) toggleSpray(); e.preventDefault(); }
});
document.addEventListener('keyup', e => {
  if (S.steer !== 'fire') return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') W.missionSteer(0);
});
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
  S.mode = 'finish'; hidePanel(); engineStop();
  const gold = S.results.filter(r => r === 'gold').length, total = S.results.length, extra = S.bonus + S.coins + S.mStars;
  store.set('total', store.get('total', 0) + gold + extra);
  const L = ordered(), endIdx = L.indexOf(S.route[S.route.length - 1]); store.set(progKey(), endIdx >= L.length - 1 ? 0 : endIdx); S.start = null;
  $('#finStars').textContent = '⭐'.repeat(gold) + '☆'.repeat(total - gold) + (S.bonus ? '  +' + '🌟'.repeat(S.bonus) : '');
  $('#finExtra').innerHTML = [S.coins ? `✨ Nhặt dọc đường: <b>${S.coins}</b> ⭐` : '', S.mStars ? `🏅 Nhiệm vụ: <b>${S.mStars}</b> ⭐` : ''].filter(Boolean).join(' · ');
  const r = total ? gold / total : 0;
  $('#finMsg').textContent = r === 1 ? `Hoàn hảo! Bé đúng hết ngay lần đầu! 🏆 Được ${gold + extra} sao.` : r >= 0.6 ? `Giỏi lắm! Bé được ${gold + extra} sao.` : `Bé được ${gold + extra} sao. Chơi tiếp để giỏi hơn nhé!`;
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
  $('#shopMsg').textContent = msg || 'Câu đúng ngay lần đầu, câu thưởng, sao nhặt dọc đường và nhiệm vụ đều cho ⭐. Dùng sao để trang trí phương tiện!';
}

/* ---------- HUD ---------- */
let bannerT = 0;
function banner(t, ms) { const b = $('#banner'); b.textContent = t; b.classList.remove('hidden'); b.style.opacity = 1; clearTimeout(bannerT); if (ms) bannerT = setTimeout(() => { b.style.opacity = 0; setTimeout(() => b.classList.add('hidden'), 300); }, ms); }
function renderHud() {
  const cur = S.route[S.si], nx = S.route[S.si + 1];
  $('#hudRoute').innerHTML = nx ? `<b>${cur.emo} ${cur.name}</b> → ${nx.emo} ${nx.name} <small>(${S.si + 1}/${S.route.length - 1})</small>` : `<b>${cur.emo} ${cur.name}</b>`;
  const gold = S.results.filter(r => r === 'gold').length; $('#starPill').textContent = `⭐ ${gold + S.bonus + S.coins + S.mStars}`;
  $('#streak').innerHTML = `🔥 ${'●'.repeat(S.streak % 3)}${'○'.repeat(3 - S.streak % 3)}`;
  const sl = $('#slots'); sl.innerHTML = Array.from({ length: S.slots }, (_, k) => `<span class="${k < S.k ? 'on' : ''}">${VEHICLES[S.veh].icon}</span>`).join('');
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
$('#reviewBtn').onclick = () => { sfx.tap(); showReview(); };
$('#rvClose').onclick = () => { $('#review').classList.add('hidden'); renderMenu(); };
$('#rvOn').onchange = () => store.set('reviewOn', $('#rvOn').checked);
$('#rvClear').onclick = () => { const b = $('#rvClear'); if (b.textContent !== 'Bấm lần nữa để xoá') { b.textContent = 'Bấm lần nữa để xoá'; return; } store.set('review', []); showReview(); };
$('#shopBtn').onclick = () => { sfx.tap(); openShop('menu'); };
$('#finShopBtn').onclick = () => { sfx.tap(); openShop('fin'); };
$('#shopClose').onclick = () => { sfx.tap(); closeShop(); };
const CAMS = [['auto', '🎥 Tự động'], ['chase', '🎥 Sau tàu'], ['side', '🎥 Bên hông'], ['high', '🎥 Trên cao']];
$('#camBtn').onclick = () => { const i = (CAMS.findIndex(c => c[0] === S.camUser) + 1) % CAMS.length; S.camUser = CAMS[i][0]; W.setCamUser(S.camUser); $('#camBtn').title = CAMS[i][1]; banner(CAMS[i][1], 1000); };
function setMute() { $('#muteBtn').textContent = muted ? '🔇' : '🔊'; QUI.setMuted(muted); sndMute(muted); }
$('#muteBtn').onclick = () => { muted = !muted; store.set('muted', muted); setMute(); try { if (muted) speechSynthesis.cancel(); } catch (e) { } };
$('#qListen').onclick = () => QUI.speak();
document.addEventListener('keydown', e => { if (S.mode === 'menu' && e.key === 'Enter') start(); });
setMute();

/* ---------- vòng lặp ---------- */
W.init(document.getElementById('c'));
let last = performance.now(), frames = 0;
function loop(now) { const dt = Math.min(0.05, (now - last) / 1000) * (window.__ts || 1); last = now; W.update(dt, now / 1000); if (S.mode === 'play') { updateMini(); engineUpdate(W.speed(), dt, !!VEHICLES[S.veh].siren); } frames++; requestAnimationFrame(loop); }
window.__kj = { S, W, start, showMenu, frames: () => frames, QUI, store, setSpray };
const fontsReady = document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]) : Promise.resolve();
fontsReady.then(() => { $('#loading').remove(); showMenu(); requestAnimationFrame(loop); });
