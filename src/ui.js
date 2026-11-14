import QB from './questions.js';
/* Question panel UI – dùng chung cho demo và game */
const QUI = (function () {
  'use strict';
  const $ = s => document.querySelector(s);
  let q = null, input = '', toks = [], attempts = 0, locked = false, tiles = [], stack = [], fixed = 0, onDone = null, muted = false;
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
    q = question; onDone = done; input = ''; toks = []; attempts = 0; locked = false; fixed = 0;
    if (q.input === 'text') {
      const letters = q.answer.split(''), abc = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(c => !letters.includes(c));
      tiles = QB.shuffle(letters.concat(QB.shuffle(abc).slice(0, q.answer.length <= 4 ? 2 : 1))).map(ch => ({ ch, used: false })); stack = [];
    }
    $('#qListen').textContent = L().listen;
    $('#qListen').style.display = q.subj === 'math' ? 'none' : ''; // Toán: im lặng để bé tự làm
    fb('', q.input === 'expr' ? '<span class="exh">✏️ Bé viết phép tính: số → dấu + hoặc − → số → dấu = → kết quả</span>' : '');
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
      const last = toks[toks.length - 1], typingNum = last != null && /^\d+$/.test(last);
      const eqAt = toks.indexOf('=');
      let h = '<span class="exl">Phép tính:</span>';
      toks.forEach((t, i) => { h += /^\d+$/.test(t) ? `<span class="tok n ${i === toks.length - 1 && !locked ? 'cur' : ''}">${t}</span>` : `<span class="tok o">${t}</span>`; });
      if (!typingNum && !locked) h += '<span class="tok n cur blink"></span>';
      if (q.unit && eqAt >= 0) h += `<span class="unit">${q.unit}</span>`;
      a.innerHTML = `<div class="expr">${h}</div>`;
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
      const lab = document.createElement('div'); lab.className = 'miclab'; lab.id = 'micLab'; lab.textContent = 'Tap and say the word'; r.appendChild(lab);
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
    const last = toks[toks.length - 1], isNum = t => t != null && /^\d+$/.test(t), hasEq = toks.includes('=');
    if (k === '-') k = '−';
    if (/^[0-9]$/.test(k)) { if (isNum(last)) { if (last.length < 3) toks[toks.length - 1] = last === '0' ? k : last + k; } else toks.push(k); }
    else if (k === '+' || k === '−') { if (hasEq) return; if (isNum(last)) { if (toks.filter(t => t === '+' || t === '−').length >= 2) return; toks.push(k); } else if (last === '+' || last === '−') toks[toks.length - 1] = k; }
    else if (k === '=') { if (!hasEq && isNum(last) && toks.length >= 3) toks.push('='); }
    else if (k === 'Backspace') { if (isNum(last) && last.length > 1) toks[toks.length - 1] = last.slice(0, -1); else toks.pop(); }
    else if (k === 'Enter') { if (toks.length) check(); return; }
    else return;
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
  function clear() { input = ''; toks = []; fixed = 0; if (q.input === 'text') { tiles.forEach(t => t.used = false); stack = []; } render(); }
  function exprEval() {
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
      if (ev.incomplete) { fb('hint', '✏️ Bé viết đủ phép tính, có dấu = và kết quả nhé!'); return; }
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
    const keepExpr = () => { if (ev && ev.exprOk) { toks = toks.slice(0, ev.eqI + 1); render(); } else clear(); };
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
  }
  function markChoice(ok) {
    if (q.input !== 'choice') return;
    document.querySelectorAll('#qAnswer .choice').forEach((b, i) => { const c = q.choices[i]; if (c === input) b.classList.add(ok ? 'right' : 'wrong'); });
  }
  /* ---- speaking ---- */
  function listen() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition, lab = $('#micLab'), mb = $('#micBtn');
    if (!SR) { lab.innerHTML = 'Speech check is not available in this browser. Say the word aloud, then a grown-up taps ✓.'; selfCheck(); return; }
    let r; try { r = new SR(); } catch (e) { selfCheck(); return; }
    r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 5;
    mb.classList.add('on'); lab.textContent = 'Listening…';
    r.onresult = e => {
      const alts = Array.from(e.results[0]).map(a => a.transcript.toLowerCase().trim());
      const hit = alts.some(a => a.split(/\s+/).some(w => w.replace(/[^a-z]/g, '') === q.answer || w.replace(/[^a-z]/g, '') === q.answer + 's'));
      lab.textContent = `I heard: “${alts[0]}”`;
      input = hit ? q.answer : alts[0] || '?'; check();
    };
    r.onerror = e => { mb.classList.remove('on'); lab.innerHTML = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'The microphone is blocked here. Say the word aloud, then a grown-up taps ✓.' : 'I could not hear you. Tap 🎤 and try again.'; if (e.error === 'not-allowed' || e.error === 'service-not-allowed') selfCheck(); };
    r.onend = () => mb.classList.remove('on');
    try { r.start(); } catch (e) { selfCheck(); }
  }
  function selfCheck() { if ($('#selfOk')) return; const b = btn('✓ Said it!', 'k ok', () => { input = q.answer; check(); }); b.id = 'selfOk'; b.style.width = '140px'; $('#qPad').appendChild(b); }
  document.addEventListener('keydown', e => { if (!q || locked) return; key(e.key); if (e.key === 'Backspace') e.preventDefault(); });
  return { show, speak: () => q && speak(q.say, q.sayLang), say: speak, setMuted: m => muted = m, key, get q() { return q; }, check, abort: () => { locked = true; q = null; }, solve: () => { if (q && !locked) { input = q.answer; if (q.calc) toks = q.calc.tokens.slice(); check(); } }, typeExpr: ks => ks.forEach(k => key(k)) };
})();
export default QUI;
