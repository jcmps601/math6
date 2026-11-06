/* 大砲遊戲共用的規則引擎（大砲對轟 2 人、大砲混戰 2～4 人都用這一份，規則一定一樣）
   ────────────────────────────────────────────────────────────────
   ・發射的那台平板負責算結果（炸在哪、每台坦克扣多少血），寫成「一步棋」存進雲端，其他平板照著重播。
     所以這裡的東西都要是確定的：要亂數一律用 rng(seed)，不能用 Math.random()（只有開新局產生地圖時可以）。
   ・地圖字串
       v2|場地|先手|每人發數|x0,x1,…|地面高度（每 4 px 一個，36 進位 2 碼）     ← 現在用的（1600 × 700）
       m1|x0,x1,…|地面高度          ← 舊的大砲混戰（1600 × 700，草原，先手＝seed % 人數，每人 8 發）
       v1|紅x|藍x|地面高度          ← 舊的大砲對轟（1200 × 600，草原，紅先，每人 15 發）
     浮島的空隙高度記成 900（VOID）。舊地圖照舊的規則重播（沒有掉落傷害、補給箱、滑動），已經在下的房間不會壞。
   ・一步棋
       v2／m1：「玩家:坦克位置:角度:力道:砲彈:爆炸1|爆炸2…」；時間到沒發射＝「玩家:坦克位置:-」
               爆炸＝「第幾顆_x_y_直擊(玩家+1，0 沒有)_扣血0.扣血1.…」
               築牆彈的「爆炸」＝土丘的位置（扣血全 0）；傳送彈的「爆炸」＝傳送後坦克的新位置 x
       v1：「坦克位置:角度:力道:砲彈:第幾顆_x_y_紅扣血_藍扣血_直擊|…」（玩家＝輪到的人）
   ・重播時才算、不寫進棋譜的（兩台一定算得一樣）：掉落傷害、掉進浮島空隙、雪地滑動、岩漿燙傷、補給箱出現和撿到
   ・state.out＝{i玩家: 第幾步的時候離開}，重播到那一步就讓他出局 */
(function (root) {
  const VER = 2;                              // 房間版本：不一樣的平板不能一起玩（算出來會不一樣）
  const HP = 100, FUEL = 180, SUB = 3, STEP = 4, VOID = 900;
  const GRAV = 0.18, WK = 0.0035, VK = 0.17;
  /* 場地：重力倍數、風倍數、坑的倍數、岩漿高度、浮島空隙、雪地會滑 */
  const SITES = {
    grass: { n: '草原', grav: 1, wind: 1, cr: 1, tip: '一般的丘陵' },
    desert: { n: '沙漠', grav: 1, wind: 1, cr: 1.3, tip: '沙子軟，炸出來的坑比較大' },
    snow: { n: '雪地', grav: 1, wind: 1, cr: 1, slide: 1, tip: '坡很陡，停在斜坡上會往下滑' },
    volcano: { n: '火山', grav: 1, wind: 1, cr: 1, lava: 595, tip: '掉到岩漿裡，每回合扣 10 滴血' },
    islands: { n: '浮島', grav: 1, wind: 1, cr: 1, voids: 1, tip: '掉進島和島中間的空隙就出局' },
    moon: { n: '月球', grav: .6, wind: .3, cr: 1, tip: '重力小、風很弱，砲彈飛得又高又遠' },
    canyon: { n: '峽谷', grav: 1, wind: 1, cr: 1, tip: '兩邊高、中間很深，要用高拋' }
  };
  const SITE_KEYS = Object.keys(SITES);
  /* 砲彈（次數＝每局每人） */
  const WEAP = {
    n: { name: '普通彈', D: 30, R: 55, cr: 38, n: 1, lim: 0 },
    t: { name: '三連發', D: 13, R: 38, cr: 26, n: 3, lim: 2, spread: 4 },
    b: { name: '彈跳彈', D: 30, R: 52, cr: 34, n: 1, lim: 2, bn: 1 },
    c: { name: '散花彈', D: 12, R: 32, cr: 22, n: 1, lim: 2, split: 5 },
    d: { name: '鑽地彈', D: 20, R: 50, cr: 54, n: 1, lim: 2, drill: 72 },
    w: { name: '築牆彈', D: 0, R: 0, cr: 0, n: 1, lim: 2, wall: 1 },
    p: { name: '傳送彈', D: 0, R: 0, cr: 0, n: 1, lim: 1, tele: 1 },
    s: { name: '超級彈', D: 48, R: 85, cr: 60, n: 1, lim: 1 }
  };
  const WK_ = Object.keys(WEAP), CRATE_W = ['c', 'd', 'w', 'p'];
  const WALL_W = 50, WALL_H = 60;            // 土丘：半寬 50、頂上平的（大約 70 寬）、高 60
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const windRaw = (seed, n) => { const r = rng((seed | 0) * 31 + n * 7919 + 17); r(); return Math.floor((r() + r()) / 2 * 17) - 8; };
  const teamOf = (S, i) => S.mode === 'team' ? i % 2 : i;
  const enemy = (S, i, j) => i !== j && teamOf(S, i) !== teamOf(S, j);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ═════════════ 地圖 ═════════════ */
  /* 出生點：n 個人平均排開；有些場地只能站在某些地方（島上、高台、火山兩邊） */
  function spawnSpots(n, site, W, rnd, isl) {
    const M = 130, out = [];
    if (site === 'canyon') {   // 兩邊高台
      const L = Math.ceil(n / 2), R = n - L, a = [];
      for (let i = 0; i < L; i++) a.push(110 + (L === 1 ? 120 : i * 240) + (rnd() - .5) * 40);
      for (let i = 0; i < R; i++) a.push(W - 110 - (R === 1 ? 120 : (R - 1 - i) * 240) + (rnd() - .5) * 40);
      return a.map(Math.round);
    }
    if (site === 'volcano') {   // 火山兩邊
      const segs = [[M, W / 2 - 200], [W / 2 + 200, W - M]], len = segs.reduce((s, [a, b]) => s + b - a, 0);
      for (let i = 0; i < n; i++) { let d = n === 1 ? 0 : i * len / (n - 1); for (const [a, b] of segs) { if (d <= b - a + .01) { out.push(Math.round(a + Math.min(d, b - a))); break; } d -= b - a; } }
      return out.map(x => x + Math.round((rnd() - .5) * 30));
    }
    if (site === 'islands') {   // 每個人站在島上（離島邊至少 70）
      const k = isl.length;
      for (let i = 0; i < n; i++) {
        const j = Math.round(n === 1 ? 0 : i * (k - 1) / (n - 1)), [a, b] = isl[j], same = [];
        for (let q = 0; q < n; q++) if (Math.round(n === 1 ? 0 : q * (k - 1) / (n - 1)) === j) same.push(q);
        const pos = same.indexOf(i), cnt = same.length;
        out.push(Math.round(a + 70 + (b - a - 140) * (cnt === 1 ? .5 : pos / (cnt - 1))));
      }
      return out;
    }
    const sp = (W - 2 * M) / (n - 1);
    for (let i = 0; i < n; i++) out.push(Math.round(M + i * sp + (i === 0 ? rnd() * 40 : i === n - 1 ? -rnd() * 40 : (rnd() - .5) * Math.min(90, sp * .3))));
    return out;
  }
  function genTerrain(n, site, rnd) {
    const W = 1600, cnt = W / STEP + 1, h = new Array(cnt);
    let isl = null;
    if (site === 'islands') {   // 3～4 塊島，中間是空的
      const k = n <= 2 ? 3 : 4, gap = 95 + rnd() * 35, w = (W - 60 - gap * (k - 1)) / k; isl = [];
      for (let i = 0; i < k; i++) { const a = 30 + i * (w + gap); isl.push([Math.round(a), Math.round(a + w)]); }
    }
    const pos = spawnSpots(n, site, W, rnd, isl);
    const A = { grass: 1, desert: .5, snow: 1.45, volcano: .6, islands: .55, moon: .55, canyon: .4 }[site] || 1;
    const waves = [0, 1, 2, 3].map(k => ({ a: (16 + rnd() * 34) * A / (k + 1), f: (1.5 + k * 1.7 + rnd()) * (site === 'snow' ? 1.6 : 1) * Math.PI * 2 / W, p: rnd() * 6.3 }));
    const base = { grass: 510, desert: 520, snow: 500, volcano: 545, islands: 470, moon: 520, canyon: 0 }[site] + (rnd() - .5) * 40;
    const sorted = [...pos].sort((a, b) => a - b);
    const hills = [];
    if (site !== 'canyon' && site !== 'islands' && site !== 'volcano') for (let i = 0; i + 1 < n; i++) { const a = sorted[i], b = sorted[i + 1], sp = b - a; if (site === 'volcano' && a < W / 2 && b > W / 2) continue; hills.push({ x: (a + b) / 2 + (rnd() - .5) * sp * .25, h: (50 + rnd() * (n > 2 ? 110 : 150)) * (site === 'desert' ? .55 : site === 'snow' ? 1.35 : 1), w: 80 + rnd() * (sp * .22) }); }
    const dunes = { f: (2 * Math.PI) / (150 + rnd() * 60), p: rnd() * 6 };
    const pools = [];   // 岩漿池：放在坦克和坦克中間、場地兩邊、火山腳（離坦克至少 100）
    if (site === 'volcano') { const c = [330, W - 330, W / 2 - 310, W / 2 + 310, 40, W - 40]; for (let k = 0; k + 1 < sorted.length; k++) { const m = (sorted[k] + sorted[k + 1]) / 2; if (Math.abs(m - W / 2) > 220) c.push(m); } c.map(x => x + (rnd() - .5) * 30).filter(x => pos.every(t => Math.abs(t - x) > 100)).slice(0, 3).forEach(x => pools.push({ x, w: 28 + rnd() * 10 })); }
    const craters = []; if (site === 'moon') for (let i = 0; i < 11; i++) craters.push({ x: rnd() * W, r: 30 + rnd() * 70, d: 14 + rnd() * 34 });
    const cy0 = 350 + rnd() * 30, cy1 = 595 + rnd() * 20;
    for (let i = 0; i < cnt; i++) {
      const x = i * STEP; let y = base;
      for (const w of waves) y += w.a * Math.sin(x * w.f + w.p);
      for (const hl of hills) y -= hl.h * Math.exp(-((x - hl.x) ** 2) / (2 * hl.w * hl.w));
      if (site === 'desert') y += 16 * Math.sin(x * dunes.f + dunes.p);
      if (site === 'volcano') {
        const d = Math.abs(x - W / 2); y -= 290 * Math.exp(-(d * d) / (2 * 150 * 150)); if (d < 40) y += 45 * (1 - d / 40);   // 火山口
        for (const p of pools) y += 120 * Math.exp(-((x - p.x) ** 2) / (2 * p.w * p.w));   // 岩漿池
      }
      if (site === 'moon') for (const c of craters) { const d = Math.abs(x - c.x); if (d < c.r) y += c.d * (1 - (d / c.r) ** 2); }
      if (site === 'canyon') { const L = .3 * W, R = .7 * W, s = v => v * v * (3 - 2 * v); const k = x < L ? 0 : x > R ? 0 : Math.min(s(clamp((x - L) / 170, 0, 1)), s(clamp((R - x) / 170, 0, 1))); y += cy0 + (cy1 - cy0) * k; }
      h[i] = y;
    }
    /* 坦克站的地方弄平（站得穩、雪地也不會一開始就滑） */
    for (const t of pos) { const gi = Math.round(t / STEP), lvl = h[gi]; for (let i = 0; i < cnt; i++) { const d = Math.abs(i * STEP - t); if (d < 70) { const k = 1 - d / 70; h[i] = h[i] * (1 - k * .85) + lvl * k * .85; } } for (let i = 0; i < cnt; i++) if (Math.abs(i * STEP - t) <= 26) h[i] = lvl; }
    for (let i = 0; i < cnt; i++) {
      let v = Math.max(site === 'canyon' ? 330 : 300, Math.min(site === 'volcano' ? 640 : 610, Math.round(h[i])));
      if (isl) { const x = i * STEP; if (!isl.some(([a, b]) => x >= a && x <= b)) v = VOID; else { const e = Math.min(...isl.filter(([a, b]) => x >= a && x <= b).map(([a, b]) => Math.min(x - a, b - x))); if (e < 24) v = Math.round(v + (24 - e) * 2.2); } }
      h[i] = v;
    }
    return { pos, h };
  }
  /* 開新的一局：site 可以是場地代號或 'random'；first＝誰先打（不給就用亂數）；per＝每人幾發 */
  function newGame(n, mode, opt = {}, rnd = Math.random) {
    n = clamp(n | 0, 2, 4); mode = mode === 'team' && n === 4 ? 'team' : 'ffa';
    const site = SITES[opt.site] ? opt.site : SITE_KEYS[Math.floor(rnd() * SITE_KEYS.length)];
    const per = opt.per || (n === 2 ? 15 : 8), first = opt.first != null ? ((opt.first | 0) % n + n) % n : Math.floor(rnd() * n);
    const { pos, h } = genTerrain(n, site, rnd);
    const idx = [...pos.keys()].sort((a, b) => pos[a] - pos[b]);
    if (mode !== 'team') for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const xs = idx.map(p => pos[p]);   // 玩家 i 站在 xs[i]（2 對 2：左到右 紅 藍 紅 藍）
    if (mode === 'team') xs.sort((a, b) => a - b);
    const map = ['v2', site, first, per, xs.join(','), h.map(v => v.toString(36).padStart(2, '0')).join('')].join('|');
    return { map, seed: Math.floor(rnd() * 1e9), mode, n, site };
  }
  function decode(map) {
    const f = String(map || '').split('|');
    let W = 1600, H = 700, xs, hs, site = 'grass', first = null, per = 8, legacy = '';
    if (f[0] === 'v2') { site = SITES[f[1]] ? f[1] : 'grass'; first = +f[2] || 0; per = +f[3] || 8; xs = f[4]; hs = f[5]; }
    else if (f[0] === 'm1') { legacy = 'm1'; xs = f[1]; hs = f[2]; }
    else { legacy = 'v1'; W = 1200; H = 600; per = 15; first = 0; xs = (f[1] || '160') + ',' + (f[2] || '1040'); hs = f[3]; }
    const pts = []; for (let i = 0; i + 1 < (hs || '').length; i += 2) pts.push(parseInt(hs.slice(i, i + 2), 36));
    const g = new Float64Array(W), dflt = H - 200;
    for (let x = 0; x < W; x++) {
      const i = Math.floor(x / STEP), fr = (x - i * STEP) / STEP, a = pts[i] ?? dflt, b = pts[i + 1] ?? a;
      g[x] = (a >= VOID) !== (b >= VOID) ? (fr < .5 ? a : b) : a + (b - a) * fr;   // 島的邊是直的
    }
    const X = String(xs || '').split(',').map(Number).filter(isFinite);
    return { W, H, FLOOR: H - 44, g, xs: X.length >= 2 ? X : [200, W - 200], site, first, per, legacy };
  }
  const gAt = (g, x) => g[clamp(Math.round(x), 0, g.length - 1)];
  const center = (g, x) => [x, gAt(g, x) - 16];
  const isVoid = (g, x) => gAt(g, x) >= VOID - 1;
  function crater(S, g, cx, cy, r) {
    for (let x = Math.max(0, Math.ceil(cx - r)); x <= Math.min(S.W - 1, Math.floor(cx + r)); x++) {
      if (g[x] >= VOID - 1) continue;
      const dy = Math.sqrt(r * r - (x - cx) * (x - cx));
      if (cy - dy <= g[x] && g[x] < cy + dy) g[x] = Math.min(S.FLOOR, cy + dy);
    }
  }
  /* 築牆彈：在落點堆一座土丘（浮島上也可以搭出一座橋） */
  function mound(S, g, x0, y0) {
    const top = Math.min(y0, gAt(g, x0) < VOID - 1 ? gAt(g, x0) : y0);
    for (let x = Math.max(0, Math.ceil(x0 - WALL_W)); x <= Math.min(S.W - 1, Math.floor(x0 + WALL_W)); x++) {
      const d = Math.abs(x - x0), c = d < 16 ? 1 : Math.cos((d - 16) / (WALL_W - 16) * Math.PI / 2), y = Math.max(120, top - WALL_H * c * c);   // 平頂的土丘
      if (y < g[x]) g[x] = y;
    }
  }
  const crR = (S, w, sub) => (sub ? WEAP.c.cr : WEAP[w].cr) * S.sp.cr;
  function dmgAt(g, tx, ex, ey, P) {
    if (!P.D) return 0;
    const [cx, cy] = center(g, tx), d = Math.max(0, Math.hypot(cx - ex, cy - ey) - 10);
    return d >= P.R ? 0 : Math.round(P.D * (1 - .75 * d / P.R));
  }

  /* ═════════════ 棋譜 ═════════════ */
  function parse(tok, S) {
    const f = String(tok).split(':');
    if (S && S.legacy === 'v1') {   // 舊的大砲對轟：沒有玩家欄位
      const m = { i: S.turn, x: +f[0] };
      if (f[1] === '-' || f.length < 4) { m.pass = true; return m; }
      m.a = +f[1]; m.p = +f[2]; m.w = WEAP[f[3]] ? f[3] : 'n';
      m.imp = (f[4] || '').split('|').filter(Boolean).map(s => { const [k, x, y, dr, db, dh] = s.split('_').map(Number); return { k, x, y, hit: dh || 0, d: [dr || 0, db || 0] }; });
      return m;
    }
    const m = { i: +f[0] | 0, x: +f[1] };
    if (f[2] === '-' || f.length < 5) { m.pass = true; return m; }
    m.a = +f[2]; m.p = +f[3]; m.w = WEAP[f[4]] ? f[4] : 'n';
    m.imp = (f[5] || '').split('|').filter(Boolean).map(s => { const [k, x, y, hit, ds] = s.split('_'); return { k: +k, x: +x, y: +y, hit: +hit || 0, d: String(ds || '').split('.').map(v => +v || 0) }; });
    return m;
  }
  const alive = (S, i) => !!S.T[i] && !S.T[i].out && S.T[i].hp > 0;
  function nextAlive(S, from) { for (let d = 1; d <= S.n; d++) { const j = (from + d) % S.n; if (alive(S, j)) return j; } return from; }
  /* 這一局可以用哪些砲彈（舊地圖只有當時有的） */
  const weapons = S => S.legacy === 'v1' ? ['n', 't', 's'] : S.legacy === 'm1' ? ['n', 't', 'b', 's'] : WK_;
  const left = (S, i, w) => w === 'n' ? Infinity : !weapons(S).includes(w) ? 0 : WEAP[w].lim - S.T[i].used[w] + (S.T[i].bonus[w] || 0);
  /* 補給箱：每 4 回合從天上掉一個（位置、裡面裝什麼都用 rng(seed) 決定） */
  function dropCrate(S) {
    if (S.crates.length >= 2) return;
    const r = rng(((S.seed ^ 0x5bd1e995) >>> 0) + S.a * 7919);
    for (let t = 0; t < 14; t++) {
      const x = Math.round(80 + r() * (S.W - 160)), w = CRATE_W[Math.floor(r() * CRATE_W.length)];
      if (isVoid(S.g, x) || (S.sp.lava && gAt(S.g, x) > S.sp.lava - 4)) continue;
      if (S.T.some(t => !t.out && Math.abs(t.x - x) < 60) || S.crates.some(c => Math.abs(c.x - x) < 90)) continue;
      S.crates.push({ id: ++S.cid, x, w }); S.ev.push({ k: 'drop', x, id: S.cid }); return;
    }
  }
  const crateNear = (S, g, c, x, y) => Math.abs(x - c.x) < 34 && Math.abs(y - (gAt(g, c.x) - 14)) < 50;
  function takeCrate(S, i, c) { S.crates = S.crates.filter(z => z !== c); S.T[i].bonus[c.w] = (S.T[i].bonus[c.w] || 0) + 1; S.ev.push({ k: 'crate', i, w: c.w, x: c.x }); }
  /* 雪地：停在斜坡上會往下滑（最多 40 px，碰到別台就停） */
  function slide(S, j) {
    const t = S.T[j], g = S.g, x0 = t.x;
    for (let k = 0; k < 40; k++) {
      const s = (gAt(g, t.x + 8) - gAt(g, t.x - 8)) / 16; if (Math.abs(s) < .3) break;
      const nx = t.x + Math.sign(s); if (nx < 24 || nx > S.W - 24 || isVoid(g, nx)) break;
      if (S.T.some((o, q) => q !== j && !o.out && Math.abs(o.x - nx) < 64)) break;
      t.x = nx;
    }
    if (t.x !== x0) S.ev.push({ k: 'slide', i: j, dx: t.x - x0 });
  }
  /* 從頭照著棋譜重播一遍 */
  function replay(map, seed, moves, out, mode) {
    const M = decode(map), n = M.xs.length, sp = SITES[M.site];
    const S = {
      W: M.W, H: M.H, FLOOR: M.FLOOR, site: M.site, sp, legacy: M.legacy, g: M.g, n, mode: mode === 'team' && n === 4 ? 'team' : 'ffa',
      T: M.xs.map(x => ({ x, hp: HP, used: { t: 0, b: 0, c: 0, d: 0, w: 0, p: 0, s: 0 }, bonus: {}, out: false, ko: -1, st: { shots: 0, hits: 0, far: 0, best: 0 } })),
      turn: M.first != null ? M.first % n : (seed >>> 0) % n, k: 0, a: 0, seed: seed | 0, last: null, over: false, maxT: n * M.per, per: M.per, crates: [], cid: 0, ev: []
    };
    S.first = S.turn;
    const list = moves ? String(moves).split(',').filter(Boolean) : [];
    const outs = Object.entries(out || {}).map(([k, v]) => [+String(k).replace(/\D/g, ''), +v]).filter(([i, v]) => i >= 0 && i < n && isFinite(v)).sort((a, b) => a[1] - b[1]);
    const applyOut = upto => {
      let ch = false; const before = S.T.map((_, i) => alive(S, i));
      for (const [i, at] of outs) if (at <= upto && !S.T[i].out) { S.T[i].out = true; if (S.T[i].ko < 0) S.T[i].ko = S.k; ch = true; }
      if (ch) { if (!alive(S, S.turn)) S.turn = nextAlive(S, S.turn); check(S, before, true); }
    };
    for (let idx = 0; idx < list.length; idx++) {
      applyOut(idx); if (S.over) break;
      const m = parse(list[idx], S); S.k = idx + 1; S.ev = [];
      if (m.i !== S.turn || !alive(S, m.i)) { m.skip = true; S.last = m; continue; }   // 不是他（已經輪過了、離開了）就不算
      applyMove(S, m);
    }
    if (!S.over) applyOut(Infinity);
    S.k = list.length;
    S.wind = Math.round(windRaw(S.seed, S.a) * sp.wind);
    return S;
  }
  function applyMove(S, m) {
    const i = m.i, me = S.T[i], g = S.g, before = S.T.map((_, j) => alive(S, j)), L = S.legacy;
    const xPrev = me.x;
    if (isFinite(m.x)) me.x = clamp(m.x, 20, S.W - 20);
    const yb = S.T.map(t => gAt(g, t.x)), x0 = me.x;
    let tele = false;
    if (!m.pass) {
      if (m.w !== 'n') me.used[m.w]++;
      me.st.shots++;
      let dealt = 0;
      for (const e of m.imp) {
        const Wp = WEAP[m.w];
        if (Wp.wall) mound(S, g, e.x, e.y);
        else if (Wp.tele) { me.x = clamp(e.x, 24, S.W - 24); tele = true; S.ev.push({ k: 'tele', i, x: me.x }); }
        else {
          crater(S, g, e.x, e.y, crR(S, m.w, m.w === 'c'));
          for (let j = 0; j < S.n; j++) if (!S.T[j].out && S.T[j].hp > 0) { const d = e.d[j] || 0; S.T[j].hp -= d; if (enemy(S, i, j)) dealt += d; }
        }
        if (!Wp.tele) me.st.far = Math.max(me.st.far, Math.round(Math.abs(e.x - x0)));
        if (!L) for (const c of [...S.crates]) if (crateNear(S, g, c, e.x, e.y)) takeCrate(S, i, c);
      }
      if (dealt > 0) me.st.hits++;
      me.st.best = Math.max(me.st.best, dealt);
    }
    if (!L) {
      /* 坦克腳下的地被炸掉：掉下去超過 30 px，每多 10 px 扣 2 滴血（最多 20）；掉進浮島空隙就出局 */
      S.T.forEach((t, j) => {
        if (t.out || t.hp <= 0 || (j === i && tele)) return;
        if (isVoid(g, t.x)) { t.hp = 0; S.ev.push({ k: 'void', i: j }); return; }
        const drop = gAt(g, t.x) - yb[j];
        if (drop > 30) { const d = Math.min(20, Math.floor((drop - 30) / 10) * 2); if (d > 0) { t.hp -= d; S.ev.push({ k: 'fall', i: j, d }); } }
      });
      for (const c of [...S.crates]) if (isVoid(g, c.x)) S.crates = S.crates.filter(z => z !== c);
      /* 開車經過補給箱、或砲彈炸到補給箱 → 拿到 1 發特殊砲彈（下一回合起可以用） */
      if (me.hp > 0 && !me.out) for (const c of [...S.crates]) if (c.x >= Math.min(xPrev, x0) - 28 && c.x <= Math.max(xPrev, x0) + 28) takeCrate(S, i, c);
      if (S.sp.slide) S.T.forEach((t, j) => { if (!t.out && t.hp > 0) slide(S, j); });
      if (S.sp.lava && me.hp > 0 && !me.out && gAt(g, me.x) > S.sp.lava) { me.hp -= 10; S.ev.push({ k: 'lava', i, d: 10 }); }
    }
    for (let j = 0; j < S.n; j++) if (S.T[j].hp <= 0 && S.T[j].ko < 0) { S.T[j].hp = 0; S.T[j].ko = S.k; }
    S.a++; S.last = m; S.turn = nextAlive(S, i);
    if (!L && S.a % 4 === 0) dropCrate(S);
    check(S, before);
  }
  /* 結束了沒：只剩一隊（或一個人）、全部倒下、回合用完 */
  function check(S, before, byOut) {
    if (S.over) return;
    const groups = new Set(); for (let i = 0; i < S.n; i++) if (alive(S, i)) groups.add(teamOf(S, i));
    const mem = gs => { const a = []; for (let i = 0; i < S.n; i++) if (gs.has(teamOf(S, i)) && !S.T[i].out) a.push(i); return a; };
    if (groups.size === 1) { S.over = true; S.win = mem(groups); S.winner = S.win.join(','); S.reason = byOut ? '其他人都離開了' : S.mode === 'team' ? '把對方整隊打倒了' : '打倒了所有對手'; }
    else if (groups.size === 0) {
      const gs = new Set(); before.forEach((a, i) => { if (a) gs.add(teamOf(S, i)); });
      S.over = true; S.draw = true; S.win = mem(gs); S.winner = 'd:' + S.win.join(','); S.reason = '最後同歸於盡，平手';
    } else if (S.a >= S.maxT) {
      const sc = {}; for (let i = 0; i < S.n; i++) if (alive(S, i)) sc[teamOf(S, i)] = (sc[teamOf(S, i)] || 0) + S.T[i].hp;
      const best = Math.max(...Object.values(sc)), top = new Set(Object.keys(sc).filter(k => sc[k] === best).map(Number));
      S.over = true; S.win = mem(top);
      if (top.size > 1) { S.draw = true; S.winner = 'd:' + S.win.join(','); S.reason = '回合用完，血一樣多'; }
      else { S.winner = S.win.join(','); S.reason = '回合用完，剩下的血最多'; }
    }
  }
  /* 我這局的結果：1 贏、0 輸、2 平手 */
  function result(winner, i) {
    const w = String(winner || ''); if (!w || w === 'none') return null;
    const d = w.startsWith('d:'), L = (d ? w.slice(2) : w).split(',').filter(Boolean).map(Number);
    return L.includes(+i) ? (d ? 2 : 1) : 0;
  }
  /* 名次（各自為戰）：贏的第 1，接著越晚倒下越前面；離開的最後 */
  function places(S) {
    const win = new Set(S.win || []), kk = i => S.T[i].out ? -1 : S.T[i].ko < 0 ? 1e9 : S.T[i].ko;
    const idx = [...Array(S.n).keys()].sort((a, b) => (win.has(b) - win.has(a)) || (kk(b) - kk(a)) || (S.T[b].hp - S.T[a].hp));
    let p = 0; return idx.map((i, n) => { if (!n || !(win.has(i) && win.has(idx[n - 1]))) p = n + 1; return { i, place: p, win: win.has(i) }; });
  }

  /* ═════════════ 砲彈飛行（發射的平板算結果、畫面播動畫，用同一份） ═════════════ */
  const tanksOf = (S, i, x) => S.T.map((t, j) => ({ x: j === i ? x : t.x, on: alive(S, j) }));
  function launch(S, g, i, x, a, p, w) {
    const W0 = WEAP[w], [cx, cy] = center(g, x), sh = [];
    for (let k = 0; k < W0.n; k++) {
      const ang = (a + (W0.n > 1 ? (k - 1) * W0.spread : 0)) * Math.PI / 180, v = p * VK;
      sh.push({ k, x: cx + 26 * Math.cos(ang), y: cy - 26 * Math.sin(ang), vx: v * Math.cos(ang), vy: -v * Math.sin(ang), live: true, away: false, t: 0, bn: W0.bn || 0, bounced: 0, sub: 0, drill: 0 });
    }
    return { S, g, i, w, sh, T: tanksOf(S, i, x), crates: S.legacy ? [] : S.crates.slice(), wind: S.wind, grav: GRAV * S.sp.grav, ev: [] };
  }
  /* 往前算一小步；回傳這一步發生的碰撞 [{s, x, y, hit}]（hit＝打到的玩家，-1 沒有；crate＝打到補給箱） */
  function stepFlight(F) {
    const S = F.S, g = F.g, W0 = WEAP[F.w], dt = 1 / SUB, out = [];
    for (const s of F.sh.slice()) {
      if (!s.live) continue;
      if (s.drill > 0) {   // 鑽地中：直直往前鑽
        s.x += s.dx; s.y += s.dy; s.drill -= Math.hypot(s.dx, s.dy); s.t++;
        const hit = F.T.findIndex((t, q) => t.on && q !== F.i && Math.hypot(s.x - t.x, s.y - (gAt(g, t.x) - 16)) < 24);
        if (hit >= 0 || s.drill <= 0 || s.y >= S.FLOOR || s.x < 0 || s.x >= S.W) { s.live = false; out.push({ s, x: clamp(s.x, 0, S.W - 1), y: Math.min(s.y, S.FLOOR), hit }); }
        continue;
      }
      s.vx += F.wind * WK * dt; s.vy += F.grav * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.t++;
      if (s.x < -80 || s.x > S.W + 80 || s.y > S.H + 40) { s.live = false; continue; }
      if (W0.split && !s.sub && s.vy >= 0 && s.t > 6) {   // 散花彈：飛到最高點分成 5 顆
        s.live = false; F.ev.push({ k: 'split', x: s.x, y: s.y });
        for (let j = 0; j < W0.split; j++) F.sh.push({ k: j, x: s.x, y: s.y, vx: s.vx + (j - 2) * 1.15, vy: .4 + Math.abs(j - 2) * .15, live: true, away: true, t: 0, bn: 0, bounced: 0, sub: 1, drill: 0 });
        continue;
      }
      let hit = -1;
      for (let q = 0; q < F.T.length; q++) {
        const T = F.T[q]; if (!T.on) continue;
        const [cx, cy] = center(g, T.x), d = Math.hypot(s.x - cx, s.y - cy);
        if (q === F.i && !s.away) { if (d > 34) s.away = true; continue; }
        if (d < 24) { hit = q; break; }
      }
      if (hit >= 0) { s.live = false; out.push({ s, x: s.x, y: s.y, hit }); continue; }
      const c = F.crates.find(c => Math.hypot(s.x - c.x, s.y - (gAt(g, c.x) - 14)) < 20);
      if (c) { s.live = false; out.push({ s, x: s.x, y: s.y, hit: -1, crate: c.id }); continue; }
      if (s.x >= 0 && s.x < S.W && s.y >= g[Math.floor(s.x)] && g[Math.floor(s.x)] < VOID - 1) {
        if (s.bn > 0 && s.vy > 0) { s.bn--; s.bounced++; s.y = g[Math.floor(s.x)] - 1; s.vy = -Math.abs(s.vy) * .62; s.vx *= .8; s.away = true; continue; }
        if (W0.drill && !s.sub) { const v = Math.hypot(s.vx, s.vy) || 1; s.dx = s.vx / v * 2; s.dy = Math.max(.7, s.vy / v * 2); s.drill = W0.drill; F.ev.push({ k: 'drill', x: s.x, y: s.y }); continue; }
        s.live = false; out.push({ s, x: s.x, y: Math.min(s.y, S.FLOOR), hit: -1 });
      }
    }
    return out;
  }
  /* 一個碰撞變成「爆炸紀錄」，並且改地形（模擬裡後面的砲彈會碰到新地形） */
  function resolveHit(F, r) {
    const S = F.S, g = F.g, w = F.w, W0 = WEAP[w], ex = Math.round(r.x), ey = Math.round(r.y), n = S.n;
    if (W0.wall) { mound(S, g, ex, ey); return { k: r.s.k, x: ex, y: ey, hit: 0, d: new Array(n).fill(0) }; }
    if (W0.tele) {
      let tx = clamp(ex, 24, S.W - 24);
      for (let it = 0; it < 4; it++) { const o = S.T.findIndex((t, q) => q !== F.i && !t.out && Math.abs(t.x - tx) < 62); if (o < 0) break; tx = clamp(S.T[o].x + (tx >= S.T[o].x ? 62 : -62), 24, S.W - 24); }
      if (isVoid(g, tx)) return null;   // 落到空隙：傳送失敗
      F.T[F.i].x = tx; return { k: r.s.k, x: tx, y: Math.round(gAt(g, tx)), hit: 0, d: new Array(n).fill(0) };
    }
    const P = r.s.sub ? WEAP.c : W0;
    const d = F.T.map(t => t.on ? dmgAt(g, t.x, ex, ey, P) : 0);
    if (r.hit >= 0) d[r.hit] = Math.max(d[r.hit], P.D);
    crater(S, g, ex, ey, crR(S, w, r.s.sub));
    return { k: r.s.k, x: ex, y: ey, hit: r.hit >= 0 ? r.hit + 1 : 0, d };
  }
  /* 發射：算好結果，做成一步棋 */
  function fire(S, x, a, p, w) {
    const me = S.turn, g = Float64Array.from(S.g);
    a = Math.round(clamp(a, 0, 180)); p = Math.round(clamp(p, 10, 100));
    if (!WEAP[w] || left(S, me, w) <= 0) w = 'n';
    const F = launch(S, g, me, x, a, p, w), imp = [];
    for (let it = 0; it < SUB * 1400 && F.sh.some(s => s.live); it++) {
      for (const r of stepFlight(F)) {
        const e = resolveHit(F, r); if (!e) continue; imp.push(e);
        for (const c of [...F.crates]) if (crateNear(S, g, c, e.x, e.y)) F.crates = F.crates.filter(z => z !== c);
      }
    }
    let tok;
    if (S.legacy === 'v1') tok = [Math.round(x), a, p, w, imp.map(e => [e.k, e.x, e.y, e.d[0], e.d[1], e.hit].join('_')).join('|')].join(':');
    else tok = [me, Math.round(x), a, p, w, imp.map(e => [e.k, e.x, e.y, e.hit, e.d.join('.')].join('_')).join('|')].join(':');
    return { tok, imp };
  }
  const pass = (S, i, x) => S.legacy === 'v1' ? Math.round(x) + ':-' : (i | 0) + ':' + Math.round(x) + ':-';
  /* 預覽：只畫前面一小段 */
  function preview(S, i, x, a, p, ticks = 22) {
    const g = S.g, F = launch(S, g, i, x, a, p, 'n'), s = F.sh[0], pts = [];
    for (let k = 0; k < ticks * SUB; k++) { const r = stepFlight(F); if (r.length || !s.live) break; if (k % SUB === 0) pts.push([s.x, s.y]); }
    return pts;
  }
  /* 開車：不能爬太陡、不能撞到別台、不能開進浮島空隙。耗油：上坡比較多、下坡比較少（最少 0.6） */
  function canDrive(S, i, from, to) {
    if (to < 24 || to > S.W - 24 || isVoid(S.g, to)) return false;
    for (let j = 0; j < S.n; j++) if (j !== i && !S.T[j].out && Math.abs(to - S.T[j].x) < 70) return false;
    return gAt(S.g, from) - gAt(S.g, to) < 6;
  }
  function driveCost(S, from, to) {
    const dx = Math.abs(to - from) || 1, up = (gAt(S.g, from) - gAt(S.g, to)) / dx;
    return dx * Math.max(.6, 1 + up * 2.4);
  }
  /* 補給箱、各種砲彈的中文名字（畫面用） */
  root.TK = { VER, W: 1600, H: 700, HP, FUEL, SUB, GRAV, WK, VK, VOID, WEAP, WK_, SITES, SITE_KEYS, CRATE_W, rng, windRaw, newGame, decode, replay, parse, fire, pass, preview, launch, stepFlight, resolveHit, crater, mound, center, gAt, isVoid, left, weapons, canDrive, driveCost, alive, nextAlive, teamOf, enemy, result, places, tanksOf, crateNear, crR };
})(typeof window !== 'undefined' ? window : globalThis);
