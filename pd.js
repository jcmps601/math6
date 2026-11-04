/* 大砲對轟（規則引擎）
   場地 1200 × 600，地形是一條「每一行的地面高度」，砲彈炸到會挖出圓形的坑。
   兩台坦克：r（紅隊，左邊、先打）、b（藍隊，右邊）。每人 100 滴血。
   輪到的人可以先移動一小段（有油量），再調角度、力道、選砲彈，發射一發。
   ・風：每一回合不一樣（-8～8），會把砲彈往左或往右吹。
   ・砲彈：💣 普通彈（不限）、🎆 三連發（每局 2 次）、💥 超級彈（每局 1 次）。
   ・打到坦克或附近就扣血，越近扣越多；自己也會被炸到。
   ・血先歸 0 的人輸；兩台同時歸 0 是和局；兩人各打 15 回合還沒分出勝負，血多的人贏。
   為了兩台平板結果一定一樣：發射的人算好「炸在哪裡、各扣多少血」一起存進棋譜，另一台照著重播。
   一步棋：「坦克位置:角度:力道:砲彈:爆炸1|爆炸2…」，爆炸＝「第幾顆_x_y_紅隊扣血_藍隊扣血」；時間到沒發射＝「坦克位置:-」 */
(function (root) {
  const W = 1200, H = 600, STEP = 4, FLOOR = 556, HP = 100, MAXT = 30, FUEL = 90;
  const GRAV = 0.18, WK = 0.0035, VK = 0.17, SUB = 3;
  const WEAP = {
    n: { name: '普通彈', icon: '💣', D: 30, R: 55, cr: 38, n: 1, lim: 0 },
    t: { name: '三連發', icon: '🎆', D: 13, R: 38, cr: 26, n: 3, lim: 2, spread: 4 },
    s: { name: '超級彈', icon: '💥', D: 48, R: 85, cr: 60, n: 1, lim: 1 }
  };
  /* 固定的亂數（兩台平板算出來一定一樣） */
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const wind = (seed, n) => { const r = rng((seed | 0) * 31 + n * 7919 + 17); r(); return Math.floor((r() + r()) / 2 * 17) - 8; };   // 小風比較常見
  const other = s => s === 'r' ? 'b' : 'r';
  /* 產生地形：幾個波浪加起來＋中間一座山，兩台坦克的地方比較平 */
  function genMap(rnd = Math.random) {
    const n = W / STEP + 1, h = new Array(n);
    const waves = [0, 1, 2, 3].map(k => ({ a: (18 + rnd() * 40) / (k + 1), f: (1.5 + k * 1.7 + rnd()) * Math.PI * 2 / W, p: rnd() * 6.3 }));
    const hillX = W / 2 + (rnd() - .5) * 260, hillH = 70 + rnd() * 120, hillW = 140 + rnd() * 120;
    const base = 400 + (rnd() - .5) * 60;
    const xr = Math.round(110 + rnd() * 90), xb = Math.round(W - 110 - rnd() * 90);
    for (let i = 0; i < n; i++) {
      const x = i * STEP; let y = base;
      for (const w of waves) y += w.a * Math.sin(x * w.f + w.p);
      y -= hillH * Math.exp(-((x - hillX) ** 2) / (2 * hillW * hillW));
      for (const t of [xr, xb]) { const d = Math.abs(x - t); if (d < 70) { const k = 1 - d / 70; y = y * (1 - k * .8) + (base + 20) * k * .8; } }
      h[i] = Math.max(210, Math.min(500, Math.round(y)));
    }
    return 'v1|' + xr + '|' + xb + '|' + h.map(v => v.toString(36).padStart(2, '0')).join('');
  }
  function newGame(rnd = Math.random) { return { map: genMap(rnd), seed: Math.floor(rnd() * 1e9) }; }
  function decode(map) {
    const [, xr, xb, hs] = String(map || '').split('|'), pts = [];
    for (let i = 0; i + 1 < (hs || '').length; i += 2) pts.push(parseInt(hs.slice(i, i + 2), 36));
    const g = new Float64Array(W);
    for (let x = 0; x < W; x++) { const i = Math.floor(x / STEP), f = (x - i * STEP) / STEP, a = pts[i] ?? 400, b = pts[i + 1] ?? a; g[x] = a + (b - a) * f; }
    return { g, xr: +xr || 160, xb: +xb || W - 160 };
  }
  const gAt = (g, x) => g[Math.max(0, Math.min(W - 1, Math.round(x)))];
  /* 坦克的中心（砲塔的位置） */
  const center = (g, x) => [x, gAt(g, x) - 16];
  /* 挖坑：圓形範圍內的土不見了 */
  function crater(g, cx, cy, r) {
    for (let x = Math.max(0, Math.ceil(cx - r)); x <= Math.min(W - 1, Math.floor(cx + r)); x++) {
      const dy = Math.sqrt(r * r - (x - cx) * (x - cx));
      if (cy - dy <= g[x] && g[x] < cy + dy) g[x] = Math.min(FLOOR, cy + dy);
    }
  }
  /* 有沒有被炸到：越近扣越多 */
  function dmgAt(g, tx, ex, ey, w) {
    const [cx, cy] = center(g, tx), d = Math.max(0, Math.hypot(cx - ex, cy - ey) - 10);
    return d >= w.R ? 0 : Math.round(w.D * (1 - .75 * d / w.R));
  }
  function parse(tok) {
    const f = String(tok).split(':'), m = { x: +f[0] };
    if (f[1] === '-' || f.length < 4) { m.pass = true; return m; }
    m.a = +f[1]; m.p = +f[2]; m.w = WEAP[f[3]] ? f[3] : 'n';
    m.imp = (f[4] || '').split('|').filter(Boolean).map(s => { const [k, x, y, dr, db, dh] = s.split('_').map(Number); return { k, x, y, d: { r: dr || 0, b: db || 0 }, hit: dh || 0 }; });
    return m;
  }
  /* 從頭照著棋譜重播一遍 */
  function replay(map, seed, moves) {
    const M = decode(map), S = { g: M.g, T: { r: { x: M.xr, hp: HP, used: { t: 0, s: 0 } }, b: { x: M.xb, hp: HP, used: { t: 0, s: 0 } } }, turn: 'r', n: 0, seed: seed | 0, last: null, over: false };
    const list = moves ? String(moves).split(',').filter(Boolean) : [];
    for (const tok of list) {
      if (S.over) break;
      const m = parse(tok), me = S.T[S.turn];
      if (isFinite(m.x)) me.x = Math.max(20, Math.min(W - 20, m.x));
      if (!m.pass) {
        if (m.w !== 'n') me.used[m.w]++;
        for (const e of m.imp) { crater(S.g, e.x, e.y, WEAP[m.w].cr); S.T.r.hp -= e.d.r; S.T.b.hp -= e.d.b; }
      }
      m.side = S.turn; S.last = m; S.turn = other(S.turn); S.n++;
      check(S);
    }
    S.wind = wind(S.seed, S.n);
    S.legal = S.over ? [] : [1];
    return S;
  }
  function check(S) {
    const r = S.T.r.hp <= 0, b = S.T.b.hp <= 0;
    if (r || b) { S.over = true; if (r && b) { S.draw = true; S.winner = 'draw'; S.reason = '兩台坦克同歸於盡'; } else { S.winner = r ? 'b' : 'r'; S.reason = '把對方的坦克打倒了'; } }
    else if (S.n >= MAXT) { S.over = true; if (S.T.r.hp === S.T.b.hp) { S.draw = true; S.winner = 'draw'; S.reason = '回合用完，血一樣多'; } else { S.winner = S.T.r.hp > S.T.b.hp ? 'r' : 'b'; S.reason = '回合用完，剩下的血比較多'; } }
    S.T.r.hp = Math.max(0, S.T.r.hp); S.T.b.hp = Math.max(0, S.T.b.hp);
  }
  const left = (S, side, w) => w === 'n' ? Infinity : WEAP[w].lim - S.T[side].used[w];
  /* 砲彈怎麼飛：每一小步 */
  function shells(g, x, a, p, w) {
    const W0 = WEAP[w], [cx, cy] = center(g, x), out = [];
    for (let k = 0; k < W0.n; k++) {
      const ang = (a + (W0.n > 1 ? (k - 1) * W0.spread : 0)) * Math.PI / 180, v = p * VK;
      out.push({ k, x: cx + 26 * Math.cos(ang), y: cy - 26 * Math.sin(ang), vx: v * Math.cos(ang), vy: -v * Math.sin(ang), live: true, away: false, t: 0 });
    }
    return out;
  }
  /* 往前算一小步；碰到東西就回傳 {x,y,hit:'r'|'b'|null} 或 'out' */
  function stepShell(s, g, wd, T, me) {
    const dt = 1 / SUB;
    s.vx += wd * WK * dt; s.vy += GRAV * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.t++;
    if (s.x < -80 || s.x > W + 80 || s.y > H + 40) return 'out';
    for (const side of ['r', 'b']) {
      const [cx, cy] = center(g, T[side].x), d = Math.hypot(s.x - cx, s.y - cy);
      if (side === me && !s.away) { if (d > 34) s.away = true; continue; }
      if (d < 24) return { x: s.x, y: s.y, hit: side };
    }
    if (s.x >= 0 && s.x < W && s.y >= g[Math.floor(s.x)]) return { x: s.x, y: Math.min(s.y, FLOOR), hit: null };
    return null;
  }
  /* 發射：算好結果，做成一步棋 */
  function fire(S, x, a, p, w) {
    const side = S.turn, g = Float64Array.from(S.g), T = { r: { ...S.T.r }, b: { ...S.T.b } };
    T[side].x = x; a = Math.round(Math.max(0, Math.min(180, a))); p = Math.round(Math.max(10, Math.min(100, p)));
    if (left(S, side, w) <= 0) w = 'n';
    const sh = shells(g, x, a, p, w), imp = [];
    for (let it = 0; it < SUB * 700 && sh.some(s => s.live); it++) {
      for (const s of sh) {
        if (!s.live) continue;
        const r = stepShell(s, g, S.wind, T, side);
        if (r === 'out') { s.live = false; continue; }
        if (r) {
          s.live = false; const ex = Math.round(r.x), ey = Math.round(r.y), W0 = WEAP[w];
          const d = { r: dmgAt(g, T.r.x, ex, ey, W0), b: dmgAt(g, T.b.x, ex, ey, W0) };
          if (r.hit) d[r.hit] = Math.max(d[r.hit], W0.D);   // 直接打中
          crater(g, ex, ey, W0.cr); imp.push({ k: s.k, x: ex, y: ey, d, hit: r.hit ? (r.hit === 'r' ? 1 : 2) : 0 });
        }
      }
    }
    const tok = [Math.round(x), a, p, w, imp.map(e => [e.k, e.x, e.y, e.d.r, e.d.b, e.hit].join('_')).join('|')].join(':');
    return { tok, imp };
  }
  const pass = x => Math.round(x) + ':-';
  /* 預覽：只畫前面一小段（不會整條告訴你） */
  function preview(S, side, x, a, p, w, ticks = 22) {
    const g = S.g, T = { r: { ...S.T.r }, b: { ...S.T.b } }; T[side].x = x;
    const s = shells(g, x, a, p, 'n')[0], pts = [];
    for (let i = 0; i < ticks * SUB; i++) { const r = stepShell(s, g, S.wind, T, side); if (r) break; if (i % SUB === 0) pts.push([s.x, s.y]); }
    return pts;
  }
  /* 可以開到哪裡：不能爬太陡的坡、不能撞到對方 */
  function canDrive(S, side, from, to) {
    const g = S.g, o = S.T[other(side)].x;
    if (to < 24 || to > W - 24 || Math.abs(to - o) < 70) return false;
    return gAt(g, from) - gAt(g, to) < 6;   // 往上爬一步最多 6 像素
  }
  root.PD = { W, H, HP, MAXT, FUEL, FLOOR, GRAV, WK, VK, SUB, WEAP, rng, wind, genMap, newGame, decode, replay, parse, fire, pass, preview, shells, stepShell, crater, center, gAt, left, canDrive, other };
})(typeof window !== 'undefined' ? window : globalThis);
