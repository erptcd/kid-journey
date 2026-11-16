// Test e2e: node test.js  (cần: npm i -D playwright; chạy sau node build.mjs)
// Chạy nhanh nhờ window.__ts (tua thời gian). Kiểm tra: cứu hoả phun nước, ô tô đổi làn, cứu thương, tàu hoả, English Look and say, sổ câu sai, sai 3 lần.
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, 'dist/index.html');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };

async function open(browser, cfg, shotDir) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|net::/.test(m.text())) errs.push(m.text()); });
  await page.addInitScript(c => { if (!sessionStorage.getItem('init')) { localStorage.clear(); Object.entries(c).forEach(([k, v]) => localStorage.setItem('kj_' + k, JSON.stringify(v))); sessionStorage.setItem('init', 1); } window.__ts = 4; }, cfg);
  await page.goto(URL);
  await page.waitForFunction(() => window.__kj && window.__kj.frames() > 3, null, { timeout: 30000 });
  return { page, errs };
}
// trả lời đúng mọi câu đang hiện, chờ tới khi điều kiện đạt
async function playUntil(page, cond, ms = 90000, solve = true) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const r = await page.evaluate(([c, solve]) => { const K = window.__kj; if (new Function('K', 'return ' + c)(K)) return true; if (solve && K.QUI.q && !document.querySelector('#qp').classList.contains('hidden')) K.QUI.solve(); return false; }, [cond, solve]);
    if (r) return true;
    await sleep(150);
  }
  return false;
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const base = { subj: 'math', legs: 2, slots: 2, dir: 1, mathT: ['C2'] };

  console.log('1) Xe cứu hoả: sai 3 lần, sổ câu sai, phun nước dập lửa');
  {
    const { page, errs } = await open(browser, { ...base, veh: 'fire' });
    await page.evaluate(() => { window.__forceMissions = [0]; __kj.start(); });
    await page.waitForFunction(() => __kj.QUI.q && !document.querySelector('#qp').classList.contains('hidden'), null, { timeout: 20000 });
    // sai 3 lần câu đầu
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => { const Q = __kj.QUI, q = Q.q; if (q.input === 'expr') { Q.typeExpr(['9', '+', '9', '=', '9', '9']); Q.key('Enter'); } else if (q.input === 'number') { const w = String(+q.answer + 1); [...w].forEach(c => Q.key(c)); Q.key('Enter'); } else { const c = q.choices.find(x => x !== q.answer); document.querySelectorAll('#qAnswer .choice')[q.choices.indexOf(c)].click(); } });
      await sleep(300);
    }
    ok(await page.$('#qFb .next') !== null, 'sai lần 3 → hiện đáp án + nút đi tiếp');
    await page.click('#qFb .next');
    await sleep(1500);
    const st = await page.evaluate(() => ({ k: __kj.S.k, topic: document.querySelector('#qTopic').textContent, rev: __kj.store.get('review', []).length }));
    ok(st.k === 0, 'không lên khách khi sai 3 lần (k=' + st.k + ')');
    ok(st.topic.includes('Câu tương tự'), 'hỏi câu tương tự: ' + st.topic);
    ok(st.rev >= 1, 'đã ghi vào sổ câu sai (' + st.rev + ')');
    ok(await playUntil(page, "K.S.inMission === 'fire'"), 'tới nhiệm vụ cứu hoả');
    await sleep(800);
    const vis = await page.evaluate(() => ({ steer: !document.querySelector('#steer').classList.contains('hidden'), spray: !document.querySelector('#sprayBtn').classList.contains('hidden'), m: __kj.W.mission() }));
    ok(vis.steer && vis.spray, 'hiện ◀ 💦 ▶');
    ok(vis.m && vis.m.left === 3, '3 đám cháy');
    // ngắm sang trái tới đám −9 bằng phím mũi tên
    await page.keyboard.down('ArrowLeft');
    for (let t = 0; t < 60 && await page.evaluate(() => __kj.W.mission().aimU > -7.5); t++) await sleep(100);
    await page.keyboard.up('ArrowLeft'); await sleep(300);
    const aim = await page.evaluate(() => __kj.W.mission().aimU);
    ok(aim < -6, 'ngắm bằng phím ← (aimU=' + aim.toFixed(1) + ')');
    await page.keyboard.down(' ');
    for (let t = 0; t < 80 && await page.evaluate(() => __kj.W.mission().levels[0] > 0.6); t++) await sleep(100);
    await page.screenshot({ path: 'test-fire.png' });
    await page.keyboard.up(' ');
    await page.setViewportSize({ width: 390, height: 844 }); await sleep(1200); await page.screenshot({ path: 'test-fire-port.png' }); await page.setViewportSize({ width: 1280, height: 760 }); await sleep(500);
    const lv = await page.evaluate(() => __kj.W.mission().levels);
    ok(lv[0] < 1 && lv[2] === 1, 'phun trúng đám trái thì lửa giảm, đám phải còn nguyên ' + JSON.stringify(lv));
    // kéo ngón tay ở giữa màn hình → ngắm đám giữa
    await page.mouse.move(640, 300); await page.mouse.down(); await page.mouse.move(645, 300); await sleep(300);
    const sp = await page.evaluate(() => __kj.W.mission().spray); await page.mouse.up();
    ok(sp, 'giữ ngón tay trên màn hình → phun');
    await page.evaluate(() => __kj.W.missionTap(0, 0, true));
    ok(await playUntil(page, "!K.S.inMission && K.S.mStars === 3", 20000, false), 'dập hết lửa → +3 sao');
    ok(await playUntil(page, "K.S.mode === 'finish'"), 'về đích');
    const fin = await page.evaluate(() => ({ total: __kj.store.get('total', 0), extra: document.querySelector('#finExtra').textContent }));
    ok(fin.total >= 3 && /Nhiệm vụ/.test(fin.extra), 'ví cộng sao nhiệm vụ: ' + fin.total + ' · ' + fin.extra);
    ok(!errs.length, 'không lỗi JS ' + errs.slice(0, 3).join(' | '));
    await page.close();
  }

  console.log('2) Ô tô: đổi làn, nhặt sao');
  {
    const { page, errs } = await open(browser, { ...base, veh: 'car' });
    await page.evaluate(() => __kj.start());
    ok(await playUntil(page, "K.S.steer === 'lanes' && K.W.speed() > 3"), 'xe chạy, hiện ◀ ▶');
    const l = await page.evaluate(() => { const a = __kj.W.steer(1); return [a, __kj.W.lane()]; });
    ok(l[0] && l[1] === -1, 'bấm ▶ đổi làn ' + JSON.stringify(l));
    await page.keyboard.press('ArrowLeft'); await sleep(100);
    ok(await page.evaluate(() => __kj.W.lane()) === 0, 'phím ← về làn giữa');
    await sleep(600); await page.screenshot({ path: 'test-car.png' });
    ok(await playUntil(page, "K.S.mode === 'finish'"), 'về đích');
    console.log('    sao nhặt được:', await page.evaluate(() => __kj.S.coins));
    ok(!errs.length, 'không lỗi JS ' + errs.slice(0, 3).join(' | '));
    await page.close();
  }

  console.log('3) Cứu thương: đón người bệnh, gặp người nhà');
  {
    const { page, errs } = await open(browser, { ...base, veh: 'ambulance' });
    await page.evaluate(() => { window.__forceMissions = [0]; __kj.start(); });
    ok(await playUntil(page, "K.S.inMission === 'ambulance'"), 'tới nhiệm vụ');
    await sleep(500);
    ok(await page.isVisible('#missionBtn'), 'hiện nút đón người bệnh');
    await page.screenshot({ path: 'test-amb.png' });
    await page.click('#missionBtn');
    ok(await playUntil(page, "K.S.carry === 'ambulance'", 20000, false), 'đã đón lên xe');
    ok(await playUntil(page, "K.S.mStars === 2"), 'tới trạm gặp người nhà → +2 sao');
    ok(await playUntil(page, "K.S.mode === 'finish'"), 'về đích');
    ok(!errs.length, 'không lỗi JS ' + errs.slice(0, 3).join(' | '));
    await page.close();
  }

  console.log('4) Tàu hoả: chạm nhặt sao, ôn xen câu sai');
  {
    const { page, errs } = await open(browser, { ...base, veh: 'train', reviewOn: true, review: [{ key: 'x', q: { subj: 'math', id: 'c2_add', topic: 'C2 · Ôn', input: 'number', prompt: '7 + 5 = ?', answer: '12', big: true, sayLang: 'vi-VN' }, wrong: 1, ok: 0, t: 1 }] });
    await page.evaluate(() => __kj.start());
    ok(await playUntil(page, "K.S.mode === 'play' && K.W.speed() > 5"), 'tàu chạy');
    // thử chạm khắp màn hình để nhặt sao
    let got = false;
    for (let t = 0; t < 40 && !got; t++) { got = await page.evaluate(() => { for (let x = 100; x < 1200; x += 60) for (let y = 120; y < 700; y += 60) if (__kj.W.tapAt(x, y)) return true; return false; }); await sleep(150); }
    ok(got, 'chạm trúng ⭐ bên đường');
    ok(await playUntil(page, "K.S.mode === 'finish'"), 'về đích');
    const rv = await page.evaluate(() => __kj.store.get('review', []));
    console.log('    sổ còn', rv.length, 'câu', rv[0] ? '(đúng ' + rv[0].ok + '/2)' : '');
    ok(!errs.length, 'không lỗi JS ' + errs.slice(0, 3).join(' | '));
    await page.close();
  }

  console.log('5) English – Look and say');
  {
    const { page, errs } = await open(browser, { ...base, veh: 'metro', subj: 'en', enT: ['e_speak'] });
    const h = await page.evaluate(() => { const f = __kj.QUI.heardOk; return [f(['to'], 'two'), f(['a cap'], 'cat'), f(['dogs'], 'dog'), f(['ice cream'], 'icecream'), f(['elephant'], 'elefant'), f(['dog'], 'cat'), f(['bike'], 'kite')]; });
    ok(JSON.stringify(h) === '[true,true,true,true,true,false,false]', 'so khớp dễ ' + JSON.stringify(h));
    await page.evaluate(() => __kj.start());
    await page.waitForFunction(() => __kj.QUI.q && __kj.QUI.q.input === 'speak' && !document.querySelector('#qp').classList.contains('hidden'), null, { timeout: 20000 });
    await page.click('#micBtn'); await sleep(400);
    ok(await page.isVisible('#selfOk'), 'không có micro → hiện nút người lớn');
    const lab = await page.textContent('#micLab'); console.log('    ', lab);
    ok(await page.evaluate(() => !document.querySelector('#qFb .next') && document.querySelector('#qFb').className.indexOf('bad') < 0), 'lỗi micro không tính là sai');
    await page.click('#selfOk');
    ok(await playUntil(page, "K.S.mode === 'finish'"), 'về đích');
    ok(!errs.length, 'không lỗi JS ' + errs.slice(0, 3).join(' | '));
    await page.close();
  }
  await browser.close();
  console.log(fails ? `\n${fails} lỗi` : '\nTất cả đạt ✓');
  process.exit(fails ? 1 : 0);
})();
