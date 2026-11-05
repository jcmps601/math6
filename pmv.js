/* 大砲混戰（畫面、動畫、操作）——規則在 pm.js；從大砲對轟的 pdv.js 改成 2～4 人
   PMV.mount({cv, ctl, host})：host 提供
     state() → {map, seed, moves, out, mode}　canAct() 現在能不能操作　solo() 同一台平板輪流
     me() → 我是第幾個玩家（-1＝觀戰）　names() → [名字…]　send(一步)　live(瞄準)　idle() 動畫播完 */
(function (root) {
  const PM = root.PM, W = PM.W, H = PM.H;
  const PAL = {
    ffa: [{ main: '#ef4444', dark: '#b91c1c', light: '#fca5a5', name: '紅' }, { main: '#3b82f6', dark: '#1d4ed8', light: '#93c5fd', name: '藍' }, { main: '#22c55e', dark: '#15803d', light: '#86efac', name: '綠' }, { main: '#f59e0b', dark: '#b45309', light: '#fcd34d', name: '黃' }],
    team: [{ main: '#ef4444', dark: '#b91c1c', light: '#fca5a5', name: '紅隊' }, { main: '#3b82f6', dark: '#1d4ed8', light: '#93c5fd', name: '藍隊' }, { main: '#f97316', dark: '#c2410c', light: '#fdba74', name: '紅隊' }, { main: '#06b6d4', dark: '#0e7490', light: '#67e8f9', name: '藍隊' }]
  };
  const TURN_MS = 40000;
  const FONT = "'PingFang TC','Microsoft JhengHei','Noto Sans TC',sans-serif";
  let cv, ctx, ctl, host, dpr = 1, K = 1, raf = 0, running = false;
  let key = '', outKey = '', shown = null, shownN = 0, queue = [], anim = null, pendingFire = false;
  const V = { g: null, gv: 0, T: [], wind: 0, turn: 0 };
  let aim = [], drive = { i: -1, x: 0, fuel: PM.FUEL }, live = null, lastShot = [], turnAt = 0, turnKey = '';
  let parts = [], texts = [], shells = [], shake = 0, banner = null, deco = null, clouds = [], tPrev = 0, hold = null, liveT = 0, timeoutSent = '';
  const COL = i => (PAL[shown && shown.mode === 'team' ? 'team' : 'ffa'])[i] || PAL.ffa[0];
  const nm = i => (host.names()[i] || COL(i).name + '色坦克');

  /* ───────── 音效 ───────── */
  let AC = null;
  const ac = () => { try { AC = AC || new (root.AudioContext || root.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { } return AC; };
  function tone(f, d, type = 'triangle', v = .08, at = 0, f2) { const a = ac(); if (!a) return; try { const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d); } catch (e) { } }
  function noise(d, v = .3, lp = 900) { const a = ac(); if (!a) return; try { const n = Math.floor(a.sampleRate * d), b = a.createBuffer(1, n, a.sampleRate), c = b.getChannelData(0); for (let i = 0; i < n; i++)c[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2); const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; const g = a.createGain(); g.gain.value = v; s.connect(f); f.connect(g); g.connect(a.destination); s.start(); } catch (e) { } }
  const snd = {
    fire() { noise(.25, .25, 1400); tone(140, .25, 'sine', .15, 0, 60); },
    boom(big) { noise(big ? .9 : .55, big ? .55 : .4, big ? 700 : 1000); tone(90, big ? .7 : .4, 'sine', .25, 0, 35); },
    clang() { tone(880, .15, 'square', .05); tone(1320, .2, 'triangle', .05, .03); },
    boing() { tone(260, .22, 'sine', .12, 0, 620); },
    turn() { tone(660, .12, 'triangle', .07); tone(990, .18, 'triangle', .07, .1); },
    tick() { tone(1200, .05, 'square', .03); },
    click() { tone(520, .04, 'triangle', .04); },
    drive() { tone(70 + Math.random() * 20, .08, 'sawtooth', .025); },
    pass() { tone(400, .2, 'triangle', .06, 0, 200); }
  };

  /* ───────── 工具 ───────── */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  const groundY = x => PM.gAt(V.g, x);
  const tankCenter = i => [V.T[i].x, V.T[i].y - 16];
  const slope = x => Math.atan2(groundY(x + 14) - groundY(x - 14), 28);
  const angTxt = a => a < 90 ? `${a}°▶` : a > 90 ? `◀${180 - a}°` : '▲90°';
  const cur = () => host.state() || {};

  /* ───────── 掛上去 ───────── */
  function mount(o) { cv = o.cv; ctl = o.ctl; host = o.host; ctx = cv.getContext('2d'); buildCtl(); bindInput(); addEventListener('resize', fit); fit(); }
  function start() { if (running) return; running = true; tPrev = performance.now(); fit(); raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); stopHold(); }
  function fit() {
    if (!cv) return; const box = cv.parentElement.getBoundingClientRect(); if (!box.width || !box.height) return;
    let w = box.width, h = w * H / W; if (h > box.height) { h = box.height; w = h * W / H; }
    cv.style.width = Math.floor(w) + 'px'; cv.style.height = Math.floor(h) + 'px';
    dpr = Math.min(2, root.devicePixelRatio || 1); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); K = cv.width / W; deco && (deco.bg = null);
  }
  const rp = n => { const st = cur(); return PM.replay(st.map, st.seed, (st.moves || '').split(',').filter(Boolean).slice(0, n).join(','), st.out, st.mode); };

  /* ───────── 跟主程式的狀態同步 ───────── */
  function update() {
    const st = cur(); if (!st.map) return;
    const k = st.map + '#' + st.seed + '#' + (st.mode || ''), toks = (st.moves || '').split(',').filter(Boolean), ok = JSON.stringify(st.out || {});
    if (k !== key || toks.length < shownN) { reset(st, toks); return; }
    if (ok !== outKey) { outKey = ok; if (!anim) { shown = rp(shownN); snapView(); startTurn(true); } }
    const already = shownN + queue.length + (anim ? 1 : 0);
    for (let i = already; i < toks.length; i++) queue.push({ i, tok: toks[i] });
    if (!anim && queue.length) next();
    paintCtl();
  }
  function reset(st, toks) {
    key = st.map + '#' + st.seed + '#' + (st.mode || ''); outKey = JSON.stringify(st.out || {}); queue = []; anim = null; shells = []; parts = []; texts = []; pendingFire = false; live = null; turnKey = '';
    shown = rp(toks.length); shownN = toks.length;
    const g0 = PM.decode(st.map); aim = g0.xs.map(x => ({ a: x < W / 2 ? 45 : 135, p: 60, w: 'n', f: x < W / 2 ? 1 : -1 })); lastShot = g0.xs.map(() => null);
    V.T = g0.xs.map((x, i) => ({ x, hp: PM.HP, y: 0, flash: 0, dead: 0, a: aim[i].a }));
    makeDeco(st.seed); snapView(); startTurn(); paintCtl();
  }
  function snapView() {
    V.g = Float64Array.from(shown.g); V.gv++; V.wind = shown.wind; V.turn = shown.turn;
    shown.T.forEach((s, i) => { const t = V.T[i] || (V.T[i] = { flash: 0 }); t.x = s.x; t.hp = s.hp; t.y = groundY(t.x); t.dead = s.hp <= 0 ? 1 : 0; t.out = s.out; t.a = aim[i] ? aim[i].a : 45; });
  }
  function startTurn(quiet) {
    const tk = key + '|' + shownN + '|' + shown.turn; if (turnKey === tk) return; turnKey = tk; turnAt = performance.now(); timeoutSent = '';
    const s = shown.turn; drive = { i: s, x: shown.T[s].x, fuel: PM.FUEL }; live = null;
    if (aim[s] && aim[s].w !== 'n' && PM.left(shown, s, aim[s].w) <= 0) aim[s].w = 'n';
    if (shown.over) return;
    const mine = host.canAct();
    banner = { t: host.solo() ? `輪到 ${nm(s)}` : mine ? '🎯 輪到你了！' : `${nm(s)} 瞄準中…`, c: COL(s).main, life: shownN || quiet ? 90 : 110 };
    if (mine) snd.turn();
  }
  function setLive(v) { if (!v || anim || !shown || v.n !== shownN || v.s !== shown.turn || host.canAct()) return; live = v; }
  const busy = () => !!anim || queue.length > 0 || pendingFire;
  const turnAge = () => busy() || !shown || shown.over ? 0 : performance.now() - turnAt;

  /* ───────── 一步一步播動畫 ───────── */
  function next() {
    if (anim) return;
    if (!queue.length) { startTurn(); paintCtl(); host.idle && host.idle(); return; }
    const q = queue.shift(), pre = rp(q.i);
    shown = pre; shownN = q.i; snapView();
    const m = PM.parse(q.tok), side = m.i;
    if (pre.over || side !== pre.turn || !PM.alive(pre, side)) { shown = rp(q.i + 1); shownN = q.i + 1; snapView(); return next(); }   // 不算的一步：直接跳過
    const fromX = live && live.s === side ? live.x : (drive.i === side ? drive.x : pre.T[side].x);
    anim = { m, side, pre, q, ph: 'drive', t: 0, fromX, toX: isFinite(m.x) ? m.x : pre.T[side].x, fromA: V.T[side].a, done: {} };
    V.T[side].x = fromX; live = null; pendingFire = false; paintCtl();
  }
  function finish() {
    const q = anim.q; anim = null; shells = [];
    shown = rp(q.i + 1); shownN = q.i + 1; outKey = JSON.stringify(cur().out || {});
    const keepG = V.g; snapView();
    if (keepG && keepG.length === V.g.length) { let same = true; for (let i = 0; i < W; i += 7) if (Math.abs(keepG[i] - V.g[i]) > 2) { same = false; break; } if (same) V.g = keepG; }
    next();
  }
  function stepAnim() {
    const A = anim, T = V.T[A.side]; A.t++;
    if (A.ph === 'drive') {
      const d = A.toX - T.x; if (Math.abs(d) > 1.5) { T.x += Math.sign(d) * 2.4; if (A.t % 6 === 0) snd.drive(); return; }
      T.x = A.toX; A.ph = A.m.pass ? 'pass' : 'aim'; A.t = 0; return;
    }
    if (A.ph === 'pass') { if (A.t === 1) { snd.pass(); texts.push({ x: T.x, y: T.y - 100, t: '⏰ 時間到', c: '#64748b', life: 70, s: 34 }); } if (A.t > 60) finish(); return; }
    if (A.ph === 'aim') {
      const tA = A.m.a; T.a = lerp(A.fromA, tA, Math.min(1, A.t / 18)); if (A.t < 22) return;
      T.a = tA; aim[A.side].a = tA; aim[A.side].p = A.m.p; aim[A.side].w = A.m.w; aim[A.side].f = tA < 90 ? 1 : tA > 90 ? -1 : aim[A.side].f;
      A.ph = 'fly'; A.t = 0; A.TT = PM.tanksOf(A.pre, A.side, T.x);
      shells = PM.shells(V.g, T.x, A.m.a, A.m.p, A.m.w).map(s => ({ ...s, trail: [] }));
      lastShot[A.side] = { x: T.x, a: A.m.a, p: A.m.p };
      snd.fire(); const [cx, cy] = tankCenter(A.side), ang = A.m.a * Math.PI / 180;
      for (let i = 0; i < 10; i++)parts.push({ x: cx + 30 * Math.cos(ang), y: cy - 30 * Math.sin(ang), vx: Math.cos(ang) * (2 + Math.random() * 3) + (Math.random() - .5), vy: -Math.sin(ang) * (2 + Math.random() * 3) + (Math.random() - .5), life: 25, max: 25, r: 6 + Math.random() * 6, c: 'smoke' });
      T.kick = 8; return;
    }
    if (A.ph === 'fly') {
      for (let sub = 0; sub < PM.SUB; sub++) for (const s of shells) {
        if (!s.live) continue;
        const imp = A.m.imp.find(e => e.k === s.k && !A.done[e.k + '_' + e.x]);
        const b0 = s.bounced, r = PM.stepShell(s, V.g, A.pre.wind, A.TT, A.side);
        if (s.bounced > b0) { snd.boing(); for (let i = 0; i < 8; i++)parts.push({ x: s.x, y: s.y, vx: (Math.random() - .5) * 4, vy: -Math.random() * 3, g: .25, life: 40, max: 40, r: 2 + Math.random() * 2, c: 'dirt' }); texts.push({ x: s.x, y: s.y - 40, t: '彈！', c: '#f97316', life: 40, s: 26 }); }
        if (s.t % 3 === 0) { s.trail.push([s.x, s.y]); if (s.trail.length > 26) s.trail.shift(); }
        const near = imp && Math.hypot(s.x - imp.x, s.y - imp.y) < 7;
        if (r || near) { s.live = false; if (imp) { A.done[imp.k + '_' + imp.x] = 1; boom(imp, A.m.w); } }
      }
      if (!shells.some(s => s.live)) { for (const e of A.m.imp) if (!A.done[e.k + '_' + e.x]) { A.done[e.k + '_' + e.x] = 1; boom(e, A.m.w); } A.ph = 'settle'; A.t = 0; }
      else if (A.t > 60 * 16) { shells.forEach(s => s.live = false); }
      return;
    }
    if (A.ph === 'settle') {
      const falling = V.T.some(t => Math.abs(t.y - groundY(t.x)) > 1);
      if ((A.t > 50 && !falling && parts.length < 40) || A.t > 200) finish();
    }
  }
  function boom(e, w) {
    const W0 = PM.WEAP[w], big = w === 's';
    PM.crater(V.g, e.x, e.y, W0.cr); V.gv++;
    snd.boom(big); shake = Math.max(shake, big ? 22 : w === 't' ? 9 : 14);
    parts.push({ x: e.x, y: e.y, r: W0.R * .9, life: 16, max: 16, c: 'flash' });
    const n = big ? 46 : w === 't' ? 14 : 28;
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = Math.random() * (big ? 7 : 5) + 1; parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, life: 26 + Math.random() * 18, max: 44, r: 3 + Math.random() * (big ? 9 : 6), c: 'fire' }); }
    for (let i = 0; i < n * .8; i++) { const a = -Math.PI * Math.random(), v = Math.random() * 6 + 2; parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: .25, life: 60 + Math.random() * 30, max: 90, r: 2 + Math.random() * 3, c: 'dirt' }); }
    for (let i = 0; i < (big ? 10 : 5); i++)parts.push({ x: e.x + (Math.random() - .5) * 30, y: e.y - Math.random() * 20, vx: (Math.random() - .5) * .8 + V.wind * .05, vy: -.4 - Math.random() * .6, life: 80 + Math.random() * 40, max: 120, r: 12 + Math.random() * 14, c: 'smoke' });
    V.T.forEach((t, j) => {
      const d = e.d[j]; if (!d || t.dead || t.out) return;
      t.hp = Math.max(0, t.hp - d); t.flash = 14; t.shakeT = 12;
      texts.push({ x: t.x, y: t.y - 110, t: '-' + d, c: '#dc2626', life: 80, s: d >= 25 ? 50 : 40, vy: -.6 });
      if (e.hit === j + 1) { texts.push({ x: t.x, y: t.y - 66, t: '直擊！', c: '#f59f00', life: 80, s: 32, vy: -.6 }); snd.clang(); }
      if (t.hp <= 0 && !t.dead) { t.dead = 1; setTimeout(() => bigBoom(j), 250); }
    });
  }
  function bigBoom(i) {
    const [x, y] = tankCenter(i); snd.boom(true); shake = 26;
    parts.push({ x, y, r: 90, life: 20, max: 20, c: 'flash' });
    for (let k = 0; k < 50; k++) { const a = Math.random() * Math.PI * 2, v = Math.random() * 8 + 2; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 40 + Math.random() * 20, max: 60, r: 4 + Math.random() * 9, c: 'fire' }); }
    for (let k = 0; k < 14; k++)parts.push({ x: x + (Math.random() - .5) * 40, y, vx: (Math.random() - .5), vy: -.6 - Math.random(), life: 140, max: 140, r: 16 + Math.random() * 18, c: 'smoke' });
    texts.push({ x, y: y - 130, t: '💥 KO!', c: '#7c2d12', life: 110, s: 60, vy: -.4 });
  }

  /* ───────── 背景、裝飾（每局固定） ───────── */
  function makeDeco(seed) {
    const r = PM.rng((seed | 0) + 99), hills = [0, 1].map(k => { const a = [], ph = r() * 6, f = 2.5 + r() * 2 + k; for (let x = 0; x <= W; x += 20)a.push([x, 400 + k * 60 - (60 + 50 * k) * (.5 + .5 * Math.sin(x / W * Math.PI * f + ph)) - 30 * Math.sin(x / 90 + ph * 2)]); return a; });
    const xs = shown.T.map(t => t.x), trees = [];
    for (let i = 0; i < 20; i++) { const x = 40 + r() * (W - 80); if (xs.some(t => Math.abs(x - t) < 60)) continue; trees.push({ x, k: r() < .55 ? 'tree' : r() < .5 ? 'bush' : 'flower', s: .7 + r() * .6, c: ['#22c55e', '#16a34a', '#4ade80'][Math.floor(r() * 3)], f: ['#f472b6', '#facc15', '#fb923c', '#a78bfa'][Math.floor(r() * 4)] }); }
    const g0 = PM.decode(cur().map).g;
    trees.forEach(t => t.y0 = PM.gAt(g0, t.x));
    clouds = [...Array(9)].map(() => ({ x: r() * W, y: 150 + r() * 170, s: .6 + r() * .8, v: .3 + r() * .5 }));
    deco = { hills, trees, sunX: 160 + r() * 300, bg: null, g0 };
    terrainCache.v = -1;
  }
  function drawBG(c) {
    if (!deco.bg || deco.bg.width !== cv.width) {
      const o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height; const b = o.getContext('2d'); b.setTransform(K, 0, 0, K, 0, 0);
      const sky = b.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#5fb6ff'); sky.addColorStop(.55, '#bfe6ff'); sky.addColorStop(1, '#fff3d6'); b.fillStyle = sky; b.fillRect(0, 0, W, H);
      const sx = deco.sunX, sg = b.createRadialGradient(sx, 160, 10, sx, 160, 120); sg.addColorStop(0, 'rgba(255,248,200,1)'); sg.addColorStop(.25, 'rgba(255,230,120,.9)'); sg.addColorStop(1, 'rgba(255,230,120,0)'); b.fillStyle = sg; b.fillRect(sx - 130, 30, 260, 260);
      b.fillStyle = '#ffe066'; b.beginPath(); b.arc(sx, 160, 34, 0, 7); b.fill();
      ['#a5c8e8', '#8fb8a8'].forEach((col, k) => { b.fillStyle = col; b.beginPath(); b.moveTo(0, H); deco.hills[k].forEach(([x, y]) => b.lineTo(x, y + 80)); b.lineTo(W, H); b.closePath(); b.fill(); });
      deco.bg = o;
    }
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(deco.bg, 0, 0); c.restore();
  }
  function drawClouds(c, dt) {
    for (const k of clouds) {
      k.x += (k.v * .25 + V.wind * .09) * dt; if (k.x > W + 120) k.x = -120; if (k.x < -120) k.x = W + 120;
      c.save(); c.translate(k.x, k.y); c.scale(k.s, k.s); c.fillStyle = 'rgba(255,255,255,.88)';
      c.beginPath(); c.arc(0, 0, 26, 0, 7); c.arc(28, -12, 32, 0, 7); c.arc(60, 0, 26, 0, 7); c.arc(30, 8, 26, 0, 7); c.fill(); c.restore();
    }
  }
  let terrainCache = { v: -1, k: 0, cv: null };
  function drawTerrain(c, now) {
    if (terrainCache.v !== V.gv || terrainCache.k !== cv.width) {
      const o = terrainCache.cv || document.createElement('canvas'); o.width = cv.width; o.height = cv.height; const b = o.getContext('2d'); b.setTransform(K, 0, 0, K, 0, 0); b.clearRect(0, 0, W, H);
      const g = V.g, path = new Path2D(); path.moveTo(0, H); for (let x = 0; x < W; x += 2)path.lineTo(x, g[x]); path.lineTo(W, g[W - 1]); path.lineTo(W, H); path.closePath();
      const dirt = b.createLinearGradient(0, 320, 0, H); dirt.addColorStop(0, '#c98b4b'); dirt.addColorStop(.45, '#a86b34'); dirt.addColorStop(1, '#6e4522');
      b.fillStyle = dirt; b.fill(path);
      b.save(); b.clip(path); const r = PM.rng(7);
      for (let i = 0; i < 210; i++) { const x = r() * W, y = 330 + r() * 360; b.fillStyle = r() < .5 ? 'rgba(90,55,25,.35)' : 'rgba(255,230,190,.22)'; b.beginPath(); b.ellipse(x, y, 3 + r() * 6, 2 + r() * 3, r() * 3, 0, 7); b.fill(); }
      b.strokeStyle = 'rgba(80,45,20,.18)'; b.lineWidth = 3; for (let k = 1; k < 5; k++) { b.beginPath(); for (let x = 0; x <= W; x += 8) { const y = g[Math.min(W - 1, x)] + k * 34 + 6 * Math.sin(x / 40 + k); x ? b.lineTo(x, y) : b.moveTo(x, y); } b.stroke(); }
      b.restore();
      const g0 = deco.g0;
      b.lineCap = 'round';
      const seg = (col, w, dy) => { b.strokeStyle = col; b.lineWidth = w; b.beginPath(); let on = false; for (let x = 0; x < W; x += 2) { const grass = Math.abs(g[x] - g0[x]) < 1.5; if (grass) { on ? b.lineTo(x, g[x] + dy) : b.moveTo(x, g[x] + dy); on = true; } else on = false; } b.stroke(); };
      seg('#3f9d3a', 12, 4); seg('#6cd35c', 7, 0);
      b.strokeStyle = '#5a3818'; b.lineWidth = 3; b.beginPath(); let on = false; for (let x = 0; x < W; x += 2) { const hole = Math.abs(g[x] - g0[x]) >= 1.5; if (hole) { on ? b.lineTo(x, g[x]) : b.moveTo(x, g[x]); on = true; } else on = false; } b.stroke();
      for (const t of deco.trees) { const x = Math.round(t.x); if (Math.abs(g[x] - t.y0) > 3) continue; drawTree(b, t, g[x]); }
      terrainCache = { v: V.gv, k: cv.width, cv: o };
    }
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(terrainCache.cv, 0, 0); c.restore();
    c.fillStyle = '#3aa0e0'; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 20)c.lineTo(x, 672 + 4 * Math.sin(x / 50 + now / 500)); c.lineTo(W, H); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; for (let x = 0; x < W; x += 60) { const y = 676 + 4 * Math.sin(x / 50 + now / 500); c.fillRect(x + 10 + 10 * Math.sin(now / 700 + x), y, 22, 3); }
  }
  function drawTree(b, t, y) {
    b.save(); b.translate(t.x, y); b.scale(t.s, t.s);
    if (t.k === 'tree') { b.fillStyle = '#8b5a2b'; b.fillRect(-4, -34, 8, 34); b.fillStyle = t.c; b.beginPath(); b.arc(0, -46, 20, 0, 7); b.arc(-14, -34, 14, 0, 7); b.arc(14, -34, 14, 0, 7); b.fill(); b.fillStyle = 'rgba(255,255,255,.25)'; b.beginPath(); b.arc(-6, -54, 7, 0, 7); b.fill(); }
    else if (t.k === 'bush') { b.fillStyle = t.c; b.beginPath(); b.arc(-10, -8, 11, 0, 7); b.arc(6, -12, 13, 0, 7); b.arc(18, -6, 9, 0, 7); b.fill(); }
    else { b.strokeStyle = '#16a34a'; b.lineWidth = 2.5; b.beginPath(); b.moveTo(0, 0); b.lineTo(0, -18); b.stroke(); b.fillStyle = t.f; for (let i = 0; i < 5; i++) { b.beginPath(); b.arc(6 * Math.cos(i * 1.256), -18 + 6 * Math.sin(i * 1.256), 4, 0, 7); b.fill(); } b.fillStyle = '#fff7ad'; b.beginPath(); b.arc(0, -18, 3, 0, 7); b.fill(); }
    b.restore();
  }

  /* ───────── 坦克 ───────── */
  function drawTank(c, i, now) {
    const t = V.T[i]; if (t.out) return;   // 離開的人：坦克不見了
    const C = COL(i), tilt = slope(t.x), face = Math.cos(t.a * Math.PI / 180) >= 0 ? 1 : -1;
    let jx = 0; if (t.shakeT > 0) { jx = (Math.random() - .5) * 6; t.shakeT--; }
    c.save(); c.translate(t.x + jx, t.y); c.scale(1.15, 1.15); c.rotate(tilt * .8);
    if (t.kick > 0) { c.translate(-Math.cos(t.a * Math.PI / 180) * t.kick * .4, 0); t.kick *= .8; if (t.kick < .3) t.kick = 0; }
    c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(0, 2, 30, 5, 0, 0, 7); c.fill();
    const dead = t.dead;
    c.save(); c.translate(0, -18); c.rotate(-t.a * Math.PI / 180 - tilt * .8);
    c.fillStyle = dead ? '#444' : '#4b5563'; rr(c, 0, -4.5, 34, 9, 4); c.fill(); c.fillStyle = dead ? '#333' : '#374151'; rr(c, 28, -6, 9, 12, 3); c.fill(); c.restore();
    c.fillStyle = dead ? '#2b2b2b' : '#374151'; rr(c, -28, -12, 56, 13, 6.5); c.fill();
    c.fillStyle = dead ? '#555' : '#9ca3af'; for (let k = -2; k <= 2; k++) { c.beginPath(); c.arc(k * 10.5, -5.5, 4, 0, 7); c.fill(); }
    c.fillStyle = dead ? '#444' : '#6b7280'; for (let k = -2; k <= 2; k++) { c.beginPath(); c.arc(k * 10.5, -5.5, 1.6, 0, 7); c.fill(); }
    const body = c.createLinearGradient(0, -26, 0, -10); body.addColorStop(0, dead ? '#555' : C.light); body.addColorStop(1, dead ? '#333' : C.main);
    c.fillStyle = body; c.beginPath(); c.moveTo(-26, -12); c.lineTo(-20, -24); c.lineTo(20, -24); c.lineTo(26, -12); c.closePath(); c.fill();
    c.strokeStyle = dead ? '#222' : C.dark; c.lineWidth = 2; c.stroke();
    c.fillStyle = dead ? '#444' : C.main; c.beginPath(); c.arc(0, -24, 14, Math.PI, 0); c.closePath(); c.fill(); c.strokeStyle = dead ? '#222' : C.dark; c.stroke();
    if (!dead) {
      const blink = (Math.floor(now / 2600 + i * .37) % 4 === 0 && now % 2600 < 140);
      const lx = Math.cos(t.a * Math.PI / 180) * 2.2, ly = -Math.sin(t.a * Math.PI / 180) * 1.5;
      for (const ex of [-5, 5]) {
        c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex + face * 1.5, -29, 3.6, blink ? .6 : 4.4, 0, 0, 7); c.fill();
        if (!blink) { c.fillStyle = '#111'; c.beginPath(); c.arc(ex + face * 1.5 + lx, -29 + ly, 2, 0, 7); c.fill(); }
      }
      if (t.flash > 10) { c.strokeStyle = '#111'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-8, -34); c.lineTo(-2, -31); c.moveTo(8, -34); c.lineTo(2, -31); c.stroke(); }
    } else { c.strokeStyle = '#ddd'; c.lineWidth = 1.8; for (const ex of [-5, 5]) { c.beginPath(); c.moveTo(ex - 3, -32); c.lineTo(ex + 3, -26); c.moveTo(ex + 3, -32); c.lineTo(ex - 3, -26); c.stroke(); } }
    if (t.flash > 0) { c.globalAlpha = t.flash / 14 * .7; c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -16, 30, 0, 7); c.fill(); c.globalAlpha = 1; t.flash--; }
    c.restore();
    /* 頭上的血條、名字 */
    const hp = t.hp, bw = 70, x0 = t.x - bw / 2, y0 = t.y - 72;
    t.hpShow = t.hpShow == null ? hp : lerp(t.hpShow, hp, .08);
    c.fillStyle = 'rgba(255,255,255,.85)'; rr(c, x0 - 3, y0 - 3, bw + 6, 15, 7); c.fill();
    c.fillStyle = '#e5e7eb'; rr(c, x0, y0, bw, 9, 4.5); c.fill();
    c.fillStyle = '#fca5a5'; rr(c, x0, y0, bw * t.hpShow / 100, 9, 4.5); c.fill();
    c.fillStyle = hp > 50 ? '#22c55e' : hp > 25 ? '#f59e0b' : '#ef4444'; if (hp > 0) { rr(c, x0, y0, Math.max(6, bw * hp / 100), 9, 4.5); c.fill(); }
    const label = nm(i) + (host.me() === i ? '（我）' : '');
    c.font = `900 21px ${FONT}`; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = '#fff'; c.strokeText(label, t.x, y0 - 9); c.fillStyle = C.dark; c.fillText(label, t.x, y0 - 9);
    if (!anim && !shown.over && V.turn === i && !dead) { const by = y0 - 48 + 5 * Math.sin(now / 180); c.fillStyle = C.main; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(t.x - 13, by); c.lineTo(t.x + 13, by); c.lineTo(t.x, by + 15); c.closePath(); c.stroke(); c.fill(); }
  }

  /* ───────── 瞄準線、砲彈、粒子、文字 ───────── */
  function drawAim(c) {
    if (anim || shown.over || pendingFire || !host.canAct()) return;
    const s = shown.turn, A = aim[s];
    const L = lastShot[s]; if (L) { const pts = PM.preview(shown, s, L.x, L.a, L.p, 400); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.setLineDash([3, 7]); c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.setLineDash([]); }
    const pts = PM.preview(shown, s, drive.x, A.a, A.p, 24);
    pts.forEach(([x, y], i) => { if (i % 2) return; c.fillStyle = `rgba(255,255,255,${.95 - i / pts.length * .7})`; c.beginPath(); c.arc(x, y, 4.6 - i / pts.length * 2, 0, 7); c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; c.stroke(); });
    const cx = drive.x, cy = groundY(drive.x) - 20, a1 = -A.a * Math.PI / 180, base = A.a <= 90 ? 0 : -Math.PI;
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, 50, Math.min(a1, base), Math.max(a1, base)); c.stroke();
    c.font = `900 22px ${FONT}`; c.textAlign = 'center'; const lx = cx + 72 * Math.cos(a1), ly = cy + 72 * Math.sin(a1);
    const tx = Math.min(90, A.a <= 90 ? A.a : 180 - A.a) + '°';
    c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.35)'; c.strokeText(tx, lx, ly); c.fillStyle = '#fff'; c.fillText(tx, lx, ly);
  }
  function drawShells(c) {
    for (const s of shells) {
      if (s.trail.length) { for (let i = 0; i < s.trail.length; i++) { const [x, y] = s.trail[i], k = i / s.trail.length; c.fillStyle = `rgba(255,255,255,${k * .55})`; c.beginPath(); c.arc(x, y, 1 + k * 4, 0, 7); c.fill(); } }
      if (!s.live) continue;
      const w = anim && anim.m.w, big = w === 's', r = big ? 9 : w === 't' ? 5 : 7;
      if (big) { const gl = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, 26); gl.addColorStop(0, 'rgba(255,200,80,.9)'); gl.addColorStop(1, 'rgba(255,120,0,0)'); c.fillStyle = gl; c.beginPath(); c.arc(s.x, s.y, 26, 0, 7); c.fill(); }
      c.fillStyle = big ? '#7c2d12' : w === 'b' ? '#ea580c' : '#1f2937'; c.beginPath(); c.arc(s.x, s.y, r, 0, 7); c.fill();
      if (w === 'b') { c.strokeStyle = '#7c2d12'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(s.x - r, s.y); c.lineTo(s.x + r, s.y); c.moveTo(s.x, s.y - r); c.lineTo(s.x, s.y + r); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(s.x - r * .35, s.y - r * .35, r * .35, 0, 7); c.fill();
    }
  }
  function drawParts(c, dt) {
    for (const p of parts) {
      p.life -= dt; const k = Math.max(0, p.life / p.max);
      if (p.vx != null) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += p.g * dt; if (p.c === 'fire') { p.vx *= .94; p.vy *= .94; } if (p.c === 'smoke') { p.r += .25 * dt; } if (p.c === 'dirt' && p.x >= 0 && p.x < W && p.y > groundY(p.x)) { p.vy *= -.25; p.vx *= .5; p.y = groundY(p.x); } }
      if (p.c === 'flash') { const r = p.r * (1.2 - k * .6); const gr = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); gr.addColorStop(0, `rgba(255,255,230,${k})`); gr.addColorStop(.4, `rgba(255,200,60,${k * .8})`); gr.addColorStop(1, 'rgba(255,120,0,0)'); c.fillStyle = gr; c.beginPath(); c.arc(p.x, p.y, r, 0, 7); c.fill(); }
      else if (p.c === 'fire') { c.fillStyle = k > .6 ? `rgba(255,240,150,${k})` : k > .3 ? `rgba(255,150,40,${k})` : `rgba(120,60,30,${k})`; c.beginPath(); c.arc(p.x, p.y, p.r * (.4 + k * .6), 0, 7); c.fill(); }
      else if (p.c === 'dirt') { c.fillStyle = `rgba(110,70,35,${Math.min(1, k * 2)})`; c.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r); }
      else { c.fillStyle = `rgba(110,110,120,${k * .45})`; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); }
    }
    parts = parts.filter(p => p.life > 0); if (parts.length > 500) parts.splice(0, parts.length - 500);
    for (const t of texts) {
      t.life -= dt; t.y += (t.vy || -.5) * dt; const k = Math.min(1, t.life / 25), pop = 1 + Math.max(0, (t.age = (t.age || 0) + dt) < 8 ? (8 - t.age) / 16 : 0);
      c.save(); c.globalAlpha = Math.max(0, k); c.font = `900 ${t.s * pop}px ${FONT}`; c.textAlign = 'center'; c.lineWidth = 6; c.strokeStyle = '#fff'; c.strokeText(t.t, t.x, t.y); c.fillStyle = t.c; c.fillText(t.t, t.x, t.y); c.restore();
    }
    texts = texts.filter(t => t.life > 0);
  }

  /* ───────── 上方的資訊列：每個人一張小卡（左邊一半、右邊一半），中間是風和倒數 ───────── */
  const CW = 262, CH = 64;
  function cardXY(i, n) { const L = Math.ceil(n / 2); return i < L ? 12 + i * (CW + 10) : W - 12 - CW - (n - 1 - i) * (CW + 10); }
  function drawHUD(c) {
    const me = host.me(), n = V.T.length;
    for (let i = 0; i < n; i++) {
      const t = V.T[i], C = COL(i), x = cardXY(i, n), y = 10, act = !shown.over && !anim && V.turn === i, gone = t.out, dead = t.dead || gone;
      c.save(); c.shadowColor = 'rgba(0,0,0,.18)'; c.shadowBlur = 8; c.fillStyle = dead ? 'rgba(235,235,235,.92)' : 'rgba(255,255,255,.94)'; rr(c, x, y, CW, CH, 18); c.fill(); c.restore();
      if (act) { c.strokeStyle = C.main; c.lineWidth = 5; rr(c, x, y, CW, CH, 18); c.stroke(); }
      if (me === i) { c.fillStyle = C.main; rr(c, x + CW - 50, y - 6, 46, 20, 10); c.fill(); c.fillStyle = '#fff'; c.font = `900 14px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('我', x + CW - 27, y + 4); }
      const bx = x + 32; c.fillStyle = dead ? '#9ca3af' : C.main; c.beginPath(); c.arc(bx, y + 32, 22, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.font = `900 ${shown.mode === 'team' ? 17 : 23}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(shown.mode === 'team' ? (i % 2 ? '藍' : '紅') : String(i + 1), bx, y + 33);
      c.textAlign = 'left'; c.fillStyle = dead ? '#6b7280' : '#1f2937'; c.font = `900 22px ${FONT}`;
      let name = nm(i); if (name.length > 8) name = name.slice(0, 8) + '…'; c.fillText(name, x + 62, y + 20);
      const hb = CW - 78, hx = x + 62;
      if (gone) { c.fillStyle = '#6b7280'; c.font = `900 18px ${FONT}`; c.fillText('離開了', hx, y + 46); }
      else {
        c.fillStyle = '#e5e7eb'; rr(c, hx, y + 38, hb, 16, 8); c.fill();
        const v = Math.max(0, t.hp); c.fillStyle = v > 50 ? '#22c55e' : v > 25 ? '#f59e0b' : '#ef4444'; if (v > 0) { rr(c, hx, y + 38, Math.max(10, hb * v / 100), 16, 8); c.fill(); }
        c.fillStyle = '#111'; c.font = `900 14px ${FONT}`; c.textAlign = 'center'; c.fillText(v > 0 ? v + ' / 100' : 'KO', hx + hb / 2, y + 47);
      }
      c.textBaseline = 'alphabetic';
    }
    /* 風 */
    const wd = V.wind, cx = W / 2, cy = 10; c.save(); c.shadowColor = 'rgba(0,0,0,.18)'; c.shadowBlur = 8; c.fillStyle = 'rgba(255,255,255,.94)'; rr(c, cx - 110, cy, 220, CH, 18); c.fill(); c.restore();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#475569'; c.font = `900 22px ${FONT}`; c.fillText('風', cx - 82, cy + 23);
    c.font = `900 13px ${FONT}`; c.fillStyle = '#64748b'; c.fillText(`剩 ${Math.max(0, shown.maxT - shown.a)} 發`, cx - 82, cy + 49);
    c.fillStyle = '#e2e8f0'; c.fillRect(cx - 56, cy + 10, 2, 44);
    const n2 = Math.abs(wd), dir = Math.sign(wd), col = n2 >= 6 ? '#ef4444' : n2 >= 3 ? '#f59e0b' : '#0ea5e9';
    if (!n2) { c.fillStyle = '#64748b'; c.font = `900 26px ${FONT}`; c.fillText('無風', cx + 26, cy + 34); }
    else {
      const k = Math.ceil(n2 / 3), ax = cx + 6, aw = 30;
      c.fillStyle = col;
      for (let i = 0; i < k; i++) { const x = ax + dir * ((i - (k - 1) / 2) * aw * .62); c.beginPath(); c.moveTo(x + dir * 12, cy + 33); c.lineTo(x - dir * 8, cy + 19); c.lineTo(x - dir * 8, cy + 47); c.closePath(); c.fill(); }
      c.font = `900 30px 'Avenir Next',Arial,sans-serif`; c.fillStyle = '#0f172a'; c.fillText(n2, cx + 80, cy + 35);
    }
    c.textBaseline = 'alphabetic';
    /* 倒數：在風的下面 */
    if (!shown.over && !anim) {
      const left = Math.max(0, (turnMs() - (performance.now() - turnAt)) / 1000), tx = cx, ty = cy + CH + 34;
      c.fillStyle = 'rgba(255,255,255,.94)'; c.beginPath(); c.arc(tx, ty, 26, 0, 7); c.fill();
      c.strokeStyle = '#e2e8f0'; c.lineWidth = 6; c.beginPath(); c.arc(tx, ty, 20, 0, 7); c.stroke();
      c.strokeStyle = left <= 8 ? '#ef4444' : COL(V.turn).main; c.beginPath(); c.arc(tx, ty, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left / (turnMs() / 1000)); c.stroke();
      c.fillStyle = left <= 8 ? '#ef4444' : '#0f172a'; c.font = `900 18px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(Math.ceil(left), tx, ty + 1); c.textBaseline = 'alphabetic';
    }
    if (banner && banner.life > 0) {
      banner.life--; const k = Math.min(1, banner.life / 20), age = 90 - banner.life, sc = age < 10 ? .6 + age * .04 : 1;
      c.save(); c.globalAlpha = k; c.translate(W / 2, H / 2 - 40); c.scale(sc, sc); c.font = `900 66px ${FONT}`; c.textAlign = 'center'; c.lineWidth = 11; c.strokeStyle = '#fff'; c.strokeText(banner.t, 0, 0); c.fillStyle = banner.c; c.fillText(banner.t, 0, 0); c.restore();
    }
  }
  const turnMs = () => host.solo() ? 60000 : TURN_MS;

  /* ───────── 主迴圈 ───────── */
  function loop(now) {
    if (!running) return; raf = requestAnimationFrame(loop);
    if (!shown || !V.g) return;
    let dt = Math.min(3, (now - tPrev) / (1000 / 60)); tPrev = now;
    if (anim) { let steps = Math.round(dt) || 1; while (steps-- > 0 && anim) stepAnim(); }
    for (const t of V.T) { const gy = groundY(t.x); if (t.y < gy) t.y = Math.min(gy, t.y + 4 * dt); else t.y = gy; }
    if (!anim && !shown.over) {
      const s = shown.turn;
      if (host.canAct()) { V.T[s].x = drive.x; V.T[s].a = lerp(V.T[s].a, aim[s].a, .35); }
      else if (live && live.s === s) { V.T[s].x = lerp(V.T[s].x, live.x, .2); V.T[s].a = lerp(V.T[s].a, live.a, .25); }
      timer();
    }
    const c = ctx; c.setTransform(K, 0, 0, K, 0, 0);
    let sx = 0, sy = 0; if (shake > .3) { sx = (Math.random() - .5) * shake; sy = (Math.random() - .5) * shake; shake *= .9; } else shake = 0;
    drawBG(c); c.setTransform(K, 0, 0, K, sx * K, sy * K);
    drawClouds(c, dt); drawTerrain(c, now);
    drawAim(c);
    for (let i = 0; i < V.T.length; i++) drawTank(c, i, now);
    drawShells(c); drawParts(c, dt);
    c.setTransform(K, 0, 0, K, 0, 0); drawHUD(c);
    if (hold) holdTick(now);
  }
  function timer() {
    const left = turnMs() - (performance.now() - turnAt);
    if (host.canAct() && !pendingFire) {
      const sec = Math.ceil(left / 1000); if (sec <= 5 && sec > 0 && sec !== timer.last) { timer.last = sec; snd.tick(); }
      if (left <= 0 && timeoutSent !== turnKey) { timeoutSent = turnKey; pendingFire = true; paintCtl(); host.send(PM.pass(shown.turn, drive.x)); }
    }
  }

  /* ───────── 操作 ───────── */
  function buildCtl() {
    ctl.innerHTML = `
      <div class="pdw" id="pdW">${PM.WK_.map(k => { const w = PM.WEAP[k]; return `<button data-w="${k}" data-noico><span>${w.icon}</span><b>${w.name}</b><em></em></button>`; }).join('')}</div>
      <div class="pdk pda"><label>角度</label><button data-k="a-" aria-label="砲管放低">▼</button><b id="pdA">45°</b><button data-k="a+" aria-label="砲管抬高">▲</button><button class="flip" data-k="flip" aria-label="轉向">⇄</button></div>
      <div class="pdk"><label>力道</label><button data-k="p-" aria-label="力道變小">−</button><div class="pdbar" id="pdPB"><i></i><b id="pdP">60</b></div><button data-k="p+" aria-label="力道變大">＋</button></div>
      <div class="pdk"><label>移動</label><button data-k="x-" aria-label="往左開">◀</button><div class="pdbar fuel" id="pdFB"><i></i><b>⛽</b></div><button data-k="x+" aria-label="往右開">▶</button></div>
      <button id="pdFire">🔥 發射</button>
      <div id="pdWait"></div>`;
    ctl.querySelectorAll('[data-w]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); if (!myInput()) return; const s = shown.turn; if (PM.left(shown, s, b.dataset.w) <= 0) return; aim[s].w = b.dataset.w; snd.click(); paintCtl(); }));
    ctl.querySelectorAll('[data-k]').forEach(b => {
      b.addEventListener('pointerdown', e => { e.preventDefault(); if (!myInput()) return; try { b.setPointerCapture(e.pointerId); } catch (x) { } act(b.dataset.k); if (b.dataset.k !== 'flip') hold = { k: b.dataset.k, at: performance.now() + 320, b }; });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, stopHold));
    });
    ctl.querySelector('#pdFire').addEventListener('pointerdown', e => { e.preventDefault(); fireNow(); });
    const pb = ctl.querySelector('#pdPB'); const setP = e => { if (!myInput()) return; const r = pb.getBoundingClientRect(); aim[shown.turn].p = clamp(Math.round((e.clientX - r.left) / r.width * 100), 10, 100); sendLive(); paintCtl(); };
    pb.addEventListener('pointerdown', e => { e.preventDefault(); try { pb.setPointerCapture(e.pointerId); } catch (x) { } setP(e); pb.onpointermove = setP; });
    pb.addEventListener('pointerup', () => pb.onpointermove = null);
  }
  function stopHold() { hold = null; }
  function holdTick(now) { if (!hold) return; if (!myInput()) return stopHold(); if (now >= hold.at) { act(hold.k, true); hold.at = now + (hold.k[0] === 'x' ? 16 : 55); } }
  const myInput = () => !!shown && !shown.over && !anim && !queue.length && !pendingFire && host.canAct();
  function act(k, rep) {
    const s = shown.turn, A = aim[s];
    if (k === 'a+') { if (A.a < 90) A.a++; else if (A.a > 90) A.a--; if (!rep) snd.click(); }
    else if (k === 'a-') { const f = A.a < 90 ? 1 : A.a > 90 ? -1 : (A.f || 1); A.a = clamp(A.a + (f > 0 ? -1 : 1), 0, 180); if (!rep) snd.click(); }
    else if (k === 'flip') { A.a = 180 - A.a; A.f = -(A.f || 1); snd.click(); }
    else if (k === 'p+' || k === 'p-') { A.p = clamp(A.p + (k === 'p+' ? 1 : -1), 10, 100); if (!rep) snd.click(); }
    else if (k === 'x+' || k === 'x-') {
      const d = k === 'x+' ? 2 : -2;
      for (let i = 0; i < (rep ? 1 : 3); i++) { if (drive.fuel < 2) break; const to = drive.x + d; if (!PM.canDrive(shown, s, drive.x, to)) { if (!rep) texts.push({ x: drive.x, y: groundY(drive.x) - 100, t: '開不過去', c: '#64748b', life: 40, s: 24 }); break; } drive.x = to; drive.fuel -= 2; }
      if (Math.random() < .3) snd.drive();
    }
    if (A.a !== 90) A.f = A.a < 90 ? 1 : -1;
    sendLive(); paintCtl();
  }
  function sendLive() { const now = performance.now(); if (now - liveT < 140) { clearTimeout(sendLive.t); sendLive.t = setTimeout(sendLive, 150); return; } liveT = now; if (!host.solo() && shown) host.live({ s: shown.turn, n: shownN, x: Math.round(drive.x), a: aim[shown.turn].a }); }
  function fireNow() {
    if (!myInput()) return; const s = shown.turn, A = aim[s];
    const f = PM.fire(shown, drive.x, A.a, A.p, A.w); pendingFire = true; paintCtl(); host.send(f.tok);
  }
  function bindInput() {
    let drag = false;
    const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
    const aimAt = e => { const s = shown.turn, [x, y] = pt(e), cx = drive.x, cy = groundY(drive.x) - 20; let a = Math.atan2(-(y - cy), x - cx) * 180 / Math.PI; if (a < -90) a = 180; else if (a < 0) a = 0; aim[s].a = Math.round(clamp(a, 0, 180)); if (aim[s].a !== 90) aim[s].f = aim[s].a < 90 ? 1 : -1; aim[s].p = Math.round(clamp(Math.hypot(x - cx, y - cy) / 3, 10, 100)); sendLive(); paintCtl(); };
    cv.addEventListener('pointerdown', e => { ac(); if (!myInput()) return; e.preventDefault(); drag = true; try { cv.setPointerCapture(e.pointerId); } catch (x) { } aimAt(e); });
    cv.addEventListener('pointermove', e => { if (drag && myInput()) aimAt(e); });
    ['pointerup', 'pointercancel'].forEach(ev => cv.addEventListener(ev, () => drag = false));
    addEventListener('keydown', e => {
      if (!running || !myInput()) return; const m = { ArrowUp: 'a+', ArrowDown: 'a-', ArrowRight: 'p+', ArrowLeft: 'p-', KeyD: 'x+', KeyA: 'x-', KeyQ: 'flip', KeyF: 'flip' }[e.code];
      if (m) { e.preventDefault(); act(m, e.repeat); } else if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); fireNow(); }
      else if (e.key >= '1' && e.key <= '4') { const w = PM.WK_[+e.key - 1]; if (PM.left(shown, shown.turn, w) > 0) { aim[shown.turn].w = w; paintCtl(); } }
    });
  }
  function paintCtl() {
    if (!ctl || !shown || !aim.length) return;
    const s = shown.turn, A = aim[s], on = myInput(), me = host.me();
    ctl.classList.toggle('off', !on); ctl.style.setProperty('--fc', COL(s).main); ctl.style.setProperty('--fd', COL(s).dark);
    ctl.querySelectorAll('[data-w]').forEach(b => { const w = b.dataset.w, n = PM.left(shown, s, w); b.classList.toggle('on', A.w === w); b.disabled = !on || n <= 0; b.querySelector('em').textContent = n === Infinity ? '∞' : '×' + Math.max(0, n); });
    ctl.querySelector('#pdA').textContent = angTxt(A.a);
    ctl.querySelector('#pdP').textContent = A.p; ctl.querySelector('#pdPB i').style.width = A.p + '%';
    ctl.querySelector('#pdFB i').style.width = (drive.i === s ? drive.fuel / PM.FUEL * 100 : 100) + '%';
    ctl.querySelectorAll('[data-k],#pdFire').forEach(b => b.disabled = !on);
    const w = ctl.querySelector('#pdWait');
    w.textContent = shown.over ? '' : anim || queue.length ? '💥 砲彈飛行中…' : pendingFire ? '發射！' : on ? '' : host.solo() ? '' :
      me < 0 ? `👀 觀戰中：${nm(s)} 瞄準中…` : !PM.alive(shown, me) ? `💀 你被打倒了，看看誰會贏！（${nm(s)} 瞄準中）` : `⏳ ${nm(s)} 瞄準中…`;
  }
  function unlock() { pendingFire = false; timeoutSent = ''; paintCtl(); }
  root.PMV = { mount, start, stop, update, setLive, busy, fit, unlock, turnAge, shown: () => shown, _age: ms => { turnAt -= ms; }, _dbg: () => ({ shownN, queue: queue.length, anim: anim && anim.ph, aim, drive, V, pendingFire }) };
})(window);
