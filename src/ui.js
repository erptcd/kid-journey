import QB from './questions.js';
/* Question panel UI – dùng chung cho demo và game */
const QUI = (function () {
  'use strict';
  const $ = s => document.querySelector(s);
  let q = null, input = '', toks = [], slots = [], kinds = [], cur = 0, opHint = false, attempts = 0, locked = false, tiles = [], stack = [], fixed = 0, onDone = null, muted = false, heard = '', micMsg = '', showAdult = false;
  const T = {
    vi: { tryAgain: 'Chưa đúng rồi, bé thử lại nhé! 💪', hint: '💡 ', reveal: a => `Đáp án là <b>${a}</b>. Mình nhớ nhé!`, next: 'Đi tiếp ➜', ok: ['Chính xác! 🎉', 'Giỏi quá! 🌟', 'Tuyệt vời! 👏', 'Đúng rồi! 🎈'], listen: '🔊 Nghe' },
    en: { tryAgain: 'Oops! Try again! 💪', hint: '💡 ', reveal: a => `The answer is <b>${a}</b>.`, next: 'Next ➜', ok: null, listen: '🔊 Listen' }
  };
  const L = () => T[q.subj === 'en' ? 'en' : 'vi'];
  function speak(text, lang) {
    if (muted || !text) return;
    try { const s = speechSynthesis; s.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = lang.startsWith('en') ? 0.8 : 0.95; const v = s.getVoices().find(v => (v.lang || '').toLowerCase().replace('_', '-').startsWith(lang.slice(0, 2))); if (v) u.voice = v; s.speak(u); } catch (e) { }
  }
  function show(question, done) {
    q = question; onDone = done; input = ''; toks = []; attempts = 0; heard = ''; micMsg = ''; showAdult = false;
    if (q.input === 'expr') { kinds = q.calc.nums.flatMap((_, i) => i ? ['o', 'n'] : ['n']).concat('r'); slots = kinds.map(() => ''); cur = 0; } locked = false; fixed = 0;
    if (q.input === 'text') {
      const letters = q.answer.split(''), abc = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(c => !letters.includes(c));
      tiles = QB.shuffle(letters.concat(QB.shuffle(abc).slice(0, q.answer.length <= 4 ? 2 : 1))).map(ch => ({ ch, used: false })); stack = [];
    }
    $('#qListen').textContent = L().listen;
    $('#qListen').style.display = q.subj === 'math' ? 'none' : ''; // Toán: im lặng để bé tự làm
    fb('', q.input === 'expr' ? '<span class="exh">✏️ Đọc đề rồi điền vào các ô: số, dấu (+ hoặc −), số và kết quả. Bấm vào ô để sửa.</span>' : '');
    render();
    if (q.autoSay) setTimeout(() => speak(q.say, q.sayLang), 250);
    else if (q.subj === 'en' && q.input !== 'speak') setTimeout(() => speak(q.prompt.replace(/Look at the picture\. /, ''), 'en-US'), 250);
  }
  function fb(cls, html) { const f = $('#qFb'); f.className = 'fb ' + cls; f.innerHTML = html; }
  function render() {
    const box = `<span class="ans ${input ? '' : 'blink'}">${input || ''}</span>`;
    $('#qPrompt').innerHTML = q.eq ? `${q.prompt}<span class="big">${q.eq.replace('?', box)}</span>` : q.big ? `<span class="big">${q.prompt.replace('?', box)}</span>` : q.prompt;
    $('#qVisual').innerHTML = q.visual || '';
    const a = $('#qAnswer'); a.innerHTML = '';
    const r = $('#qPad'); r.innerHTML = '';
    if (q.input === 'number') {
      if (!q.big && !q.eq) a.innerHTML = `<span class="ans ${input ? '' : 'blink'}">${input}</span>${q.unit ? `<span class="unit">${q.unit}</span>` : ''}`;
      const pad = document.createElement('div'); pad.className = 'pad';
      ['7', '8', '9', '4', '5', '6', '1', '2', '3', '⌫', '0', '✓'].forEach(k => pad.appendChild(btn(k, 'k' + (k === '✓' ? ' ok' : k === '⌫' ? ' del' : ''), () => key(k === '⌫' ? 'Backspace' : k === '✓' ? 'Enter' : k))));
      r.appendChild(pad);
    } else if (q.input === 'expr') {
      let h = '<span class="exl">Phép tính:</span>';
      kinds.forEach((kd, i) => {
        if (kd === 'r') h += '<span class="tok eq">=</span>';
        const v = slots[i], c = i === cur && !locked ? ' cur' + (v ? '' : ' blink') : '';
        h += `<span class="tok ${kd === 'o' ? 'op' : 'n'}${c}" data-slot="${i}">${v}</span>`;
      });
      if (q.unit) h += `<span class="unit">${q.unit}</span>`;
      a.innerHTML = `<div class="expr">${h}</div>`;
      a.querySelectorAll('[data-slot]').forEach(el => el.onclick = () => { if (locked) return; cur = +el.dataset.slot; render(); });
      const pad = document.createElement('div'); pad.className = 'pad pad4';
      ['7', '8', '9', '⌫', '4', '5', '6', '+', '1', '2', '3', '−', '0', '=', '✓'].forEach(k => { const b = btn(k, 'k' + (k === '✓' ? ' ok' : k === '⌫' ? ' del' : /[+−=]/.test(k) ? ' op' : '') + (k === '0' ? ' wide' : ''), () => key(k === '⌫' ? 'Backspace' : k === '✓' ? 'Enter' : k)); pad.appendChild(b); });
      r.appendChild(pad);
    } else if (q.input === 'choice') {
      const wrap = document.createElement('div'); wrap.className = q.pics ? 'choices pics' : 'choices';
      q.choices.forEach((c, i) => { const b = btn('', 'choice', () => { if (locked) return; input = c; check(); }); b.innerHTML = q.pics ? q.pics[i] + (q.hideWords ? '' : `<span>${c}</span>`) : c; wrap.appendChild(b); });
      a.appendChild(wrap);
    } else if (q.input === 'text') {
      a.innerHTML = `<div class="slots">${q.answer.split('').map((_, i) => `<div class="slot ${i < fixed ? 'fix' : ''} ${i === input.length ? 'cur' : ''}">${input[i] || ''}</div>`).join('')}</div>`;
      const tw = document.createElement('div'); tw.className = 'tiles';
      tiles.forEach((t, i) => { const b = btn(t.ch, 'tile', () => typeL(t.ch, i)); b.disabled = t.used; tw.appendChild(b); });
      const ta = document.createElement('div'); ta.className = 'tactions';
      ta.append(btn('⌫', 'k del', () => key('Backspace')), btn('✓', 'k ok', () => key('Enter')));
      r.append(tw, ta);
    } else if (q.input === 'speak') {
      const m = btn('🎤', 'mic', listen); m.id = 'micBtn'; r.appendChild(m);
      const lab = document.createElement('div'); lab.className = 'miclab'; lab.id = 'micLab'; lab.innerHTML = micMsg || (heard ? `I heard: “${heard}”` : 'Tap 🎤 and say the word'); r.appendChild(lab);
      const say = btn('🔊 Nghe mẫu', 'k sm', () => speak(q.answer, 'en-US')); say.id = 'sayModel'; r.appendChild(say);
      if (showAdult) adultBtn();
    }
  }
  function btn(t, cls, fn) { const b = document.createElement('button'); b.className = cls; b.textContent = t; b.onclick = fn; return b; }
  function typeL(ch, i) {
    if (locked || input.length >= q.answer.length) return;
    if (i == null) i = tiles.findIndex(t => !t.used && t.ch === ch);
    if (i >= 0) tiles[i].used = true; stack.push(i); input += ch; render();
    if (input.length === q.answer.length) setTimeout(() => { if (!locked && input.length === q.answer.length) check(); }, 250);
  }
  function exprKey(k) {
    if (k === '-') k = '−';
    const kd = kinds[cur], v = slots[cur];
    if (/^[0-9]$/.test(k)) {
      if (kd === 'o') { fb('hint', '✏️ Ô này là dấu: bấm + hoặc −'); opHint = true; return; }
      if (v.length < 3) slots[cur] = v === '0' ? k : v + k;
    } else if (k === '+' || k === '−') {
      if (kd === 'o') { slots[cur] = k; cur = Math.min(kinds.length - 1, cur + 1); }
      else if (kd === 'n' && v && kinds[cur + 1] === 'o') { slots[cur + 1] = k; cur = cur + 2; }
      else return;
    } else if (k === '=' || k === 'Tab' || k === 'ArrowRight') { cur = k === '=' ? kinds.length - 1 : Math.min(kinds.length - 1, cur + 1); }
    else if (k === 'ArrowLeft') cur = Math.max(0, cur - 1);
    else if (k === 'Backspace') { if (v) slots[cur] = v.slice(0, -1); else if (cur > 0) { cur--; slots[cur] = slots[cur].slice(0, -1); } }
    else if (k === 'Enter') { opHint = false; check(); return; }
    else return;
    if (opHint) { opHint = false; fb('', '<span class="exh">✏️ Đọc đề rồi điền vào các ô: số, dấu (+ hoặc −), số và kết quả. Bấm vào ô để sửa.</span>'); }
    render();
  }
  function key(k) {
    if (!q || locked) return;
    if (q.input === 'expr') return exprKey(k);
    if (k === 'Enter') { if (input) check(); return; }
    if (k === 'Backspace') { if (input.length <= fixed) return; input = input.slice(0, -1); if (q.input === 'text') { const t = stack.pop(); if (t >= 0) tiles[t].used = false; } render(); return; }
    if (q.input === 'number' && /^[0-9]$/.test(k) && input.length < 3) { input += k; render(); }
    else if (q.input === 'text' && /^[a-zA-Z]$/.test(k)) typeL(k.toLowerCase());
  }
  function clear() { input = ''; toks = []; fixed = 0; if (q.input === 'expr') { slots = kinds.map(() => ''); cur = 0; } if (q.input === 'text') { tiles.forEach(t => t.used = false); stack = []; } render(); }
  function exprEval() {
    if (slots.some(v => !v)) return { incomplete: true };
    toks = kinds.flatMap((kd, i) => kd === 'r' ? ['=', slots[i]] : [slots[i]]);
    const c = q.calc, eqI = toks.indexOf('=');
    if (eqI < 0 || eqI === toks.length - 1) return { incomplete: true };
    const left = toks.slice(0, eqI), res = +toks[eqI + 1];
    if (left.length % 2 === 0) return { incomplete: true };
    const nums = left.filter((t, i) => i % 2 === 0).map(Number), ops = left.filter((t, i) => i % 2 === 1);
    const exprOk = c.op === '+' ? ops.every(o => o === '+') && nums.length === c.nums.length && nums.slice().sort((x, y) => x - y).join() === c.nums.slice().sort((x, y) => x - y).join()
      : ops.length === 1 && ops[0] === '−' && nums[0] === c.nums[0] && nums[1] === c.nums[1];
    return { exprOk, resOk: res === c.result, eqI };
  }
  function check() {
    if (locked) return;
    let ok, ev = null;
    if (q.input === 'expr') {
      ev = exprEval();
      if (ev.incomplete) { cur = slots.findIndex(v => !v); render(); fb('hint', '✏️ Bé điền đủ tất cả các ô nhé!'); return; }
      ok = ev.exprOk && ev.resOk;
    } else ok = input.trim().toLowerCase() === q.answer.toLowerCase();
    if (ok) {
      locked = true;
      fb('good', q.subj === 'en' ? `${q.praise} 🎉` : QB.pick(T.vi.ok));
      if (q.subj === 'en') speak(q.input === 'choice' && q.answer.length < 4 ? q.praise : q.answer, 'en-US');
      markChoice(true);
      setTimeout(() => onDone && onDone(attempts === 0 ? 'gold' : 'ok'), 1300);
      return;
    }
    attempts++;
    markChoice(false);
    const p = $('#qp'); p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake');
    const why = ev ? (ev.exprOk ? 'Phép tính đúng rồi! Bé tính lại kết quả nhé. ' : ev.resOk ? 'Kết quả đúng rồi, nhưng phép tính chưa đúng. Bé đọc lại đề nhé! ' : '') : '';
    const keepExpr = () => { if (ev && ev.exprOk) { slots[slots.length - 1] = ''; cur = slots.length - 1; render(); } else clear(); };
    if (attempts === 1) { fb('bad', why || L().tryAgain); keepExpr(); }
    else if (attempts === 2) {
      const h = q.subj === 'en' ? q.hintText : q.hint;
      fb('hint', why + L().hint + (h || ''));
      keepExpr();
      if (q.subj === 'en') { speak(q.say, 'en-US'); if (q.input === 'text') { fixed = 1; typeL(q.answer[0]); } }
    } else {
      locked = true;
      const shown = q.calc ? q.calc.text + (q.unit ? ' ' + q.unit : '') : q.answer + (q.unit ? ' ' + q.unit : '');
      fb('hint', L().reveal(q.id === 'c5_tugiac' ? 'hình số ' + (+q.answer + 1) : shown) + ' ');
      const b = btn(L().next, 'next', () => onDone && onDone('miss')); $('#qFb').appendChild(b);
      if (q.subj === 'en') speak(q.answer, 'en-US');
    }
    if (q.input === 'speak' && attempts < 3) { showAdult = true; adultBtn(); setTimeout(() => speak(q.answer, 'en-US'), 700); }
  }
  function markChoice(ok) {
    if (q.input !== 'choice') return;
    document.querySelectorAll('#qAnswer .choice').forEach((b, i) => { const c = q.choices[i]; if (c === input) b.classList.add(ok ? 'right' : 'wrong'); });
  }
  /* ---- speaking: so khớp dễ, lỗi micro/mạng không tính là sai ---- */
  const norm = w => (w || '').toLowerCase().replace(/[^a-z]/g, '');
  function lev(a, b) { const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]); for (let j = 1; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; }
  const SAME = { two: ['to', 'too', 'tu'], four: ['for', 'fore', 'four'], eight: ['ate'], one: ['won', 'wan'], pear: ['pair', 'pare', 'bear'], sea: ['see', 'c'], bee: ['be', 'b'], eye: ['i', 'aye'], tea: ['tee', 't'], pea: ['pee', 'p'], ball: ['bowl', 'bol'], bus: ['bass', 'boss'], cat: ['cut', 'cad', 'kat'], dog: ['dock', 'doug'], fish: ['fis', 'fees'], car: ['card', 'ca', 'cart'], cow: ['how', 'kow'], hat: ['hut', 'had'], bike: ['bite', 'pike'], train: ['trend', 'trains'], plane: ['plain', 'blame'], egg: ['ag', 'eg'], bed: ['bad', 'bet'], red: ['read', 'rat'], blue: ['blew', 'bloo'], night: ['knight'], right: ['write'], son: ['sun'], sun: ['son'], flower: ['flour'], tail: ['tale'], mouse: ['mouth'], horse: ['hoarse', 'house'], sheep: ['ship', 'cheap'], three: ['tree', 'free'], tree: ['three', 'free'], kite: ['kites', 'light'], goat: ['coat', 'god'] };
  function heardOk(alts, ans) {
    const A = norm(ans);
    for (const alt of alts) {
      const ws = alt.split(/\s+/).map(norm).filter(Boolean); if (!ws.length) continue;
      if (ws.join('').includes(A)) return true;
      const cand = ws.concat(ws.slice(1).map((w, i) => ws[i] + w));
      for (const w of cand) {
        if (w === A || w === A + 's' || w === A + 'es' || A === w + 's' || (SAME[A] || []).includes(w)) return true;
        const tol = A.length <= 3 ? (w[0] === A[0] ? 1 : 0) : A.length <= 6 ? 1 : 2;
        if (Math.abs(w.length - A.length) <= 2 && lev(w, A) <= tol) return true;
      }
    }
    return false;
  }
  function micNote(html) { micMsg = html; const l = $('#micLab'); if (l) l.innerHTML = html; }
  function listen() {
    if (locked) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition, mb = $('#micBtn');
    if (!SR) { micNote('Máy/trình duyệt này chưa nghe được tiếng nói (dùng Chrome hoặc Edge). Bé đọc to, rồi người lớn bấm nút bên dưới.'); showAdult = true; adultBtn(); return; }
    if (location.protocol !== 'https:' && !/^(localhost|127\.)/.test(location.hostname)) { micNote('Micro chỉ chạy khi mở game qua https (link GitHub Pages). Người lớn bấm nút bên dưới khi bé đọc đúng.'); showAdult = true; adultBtn(); return; }
    let r; try { r = new SR(); } catch (e) { showAdult = true; adultBtn(); return; }
    r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 5;
    let got = false, err = '';
    mb.classList.add('on'); micNote('Listening… 👂');
    r.onresult = e => {
      got = true;
      const alts = Array.from(e.results[0]).map(a => a.transcript.toLowerCase().trim()).filter(Boolean);
      heard = alts[0] || ''; micMsg = '';
      if (!heard) return;
      const ok = heardOk(alts, q.answer);
      input = ok ? q.answer : heard; check();
      if (!ok) { micNote(`I heard: “${heard}”. Listen and try again! 🔊`); }
    };
    r.onerror = e => {
      err = e.error; mb.classList.remove('on'); showAdult = true; adultBtn();
      if (err === 'not-allowed' || err === 'service-not-allowed') micNote('Micro đang bị chặn. Người lớn bấm biểu tượng 🔒 trên thanh địa chỉ → <b>Micro: Cho phép</b>, rồi bấm 🎤 lại.');
      else if (err === 'network') micNote('Máy cần mạng Internet để nghe tiếng nói. Bé đọc to, người lớn bấm nút bên dưới.');
      else if (err === 'audio-capture') micNote('Không thấy micro. Kiểm tra micro rồi bấm 🎤 lại nhé.');
      else micNote('I could not hear you. Tap 🎤 and say it again! (Không tính là sai)');
    };
    r.onend = () => { mb.classList.remove('on'); if (!got && !err) { micNote('I could not hear you. Tap 🎤 and say it louder! (Không tính là sai)'); showAdult = true; adultBtn(); } };
    try { r.start(); } catch (e) { mb.classList.remove('on'); showAdult = true; adultBtn(); }
  }
  function adultBtn() { if (!q || q.input !== 'speak' || $('#selfOk')) return; const b = btn('👂 Người lớn: bé đọc đúng ✓', 'k ok adult', () => { if (locked) return; input = q.answer; check(); }); b.id = 'selfOk'; $('#qPad').appendChild(b); }
  document.addEventListener('keydown', e => { if (!q || locked) return; key(e.key); if (e.key === 'Backspace') e.preventDefault(); });
  return { show, speak: () => q && speak(q.say, q.sayLang), say: speak, setMuted: m => muted = m, key, get q() { return q; }, check, abort: () => { locked = true; q = null; }, heardOk, solve: () => { if (q && !locked) { input = q.answer; if (q.calc) { slots = q.calc.tokens.filter(t => t !== '='); } check(); } }, typeExpr: ks => ks.forEach(k => key(k)) };
})();
export default QUI;
