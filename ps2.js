/* 寵物彈射對戰・陷阱擂台（第二版規則與物理；經典版在 ps.js，兩個互不影響）
   ・每人 3 顆生命：碰撞只有推力，不扣命；落進開著的洞、從左右缺口出界才扣 1 命（同一次出手、同一次回合事件最多扣 1）。
   ・能量水晶：開局 1、最多 3；出手前選 普通（0）／重擊（1，最大速度 850）／護盾（1，被對手撞、被炸推的力 ×0.6，到自己下次出手前）。
   ・炸彈：固定槽位，倒數 2 個完整回合；碰到、倒數到 0、被別顆炸到都會爆（連鎖，每顆每次最多爆一次），只有推力不扣命。
   ・洞口每 2 個完整回合開／關一次，前 1 個完整回合先預告；冰面滑、泥地煞。
   ・8 回合（16 次出手）打完比剩下生命，一樣再比「把對手撞掉幾次」，再一樣才平手。
   ・跟經典版一樣：固定 120 Hz、只用加減乘除和開根號（每台算出來一樣），出手的人把整數速度送出去，其他平板照著播再對齊快照。 */
(function (root) {
  const CFG = {
    W: 960, H: 600, L: 48, T: 48, R: 912, B: 552, PR: 28,
    LIVES: 3, ROUNDS: 8, SHOTS: 16, AIM_S: 15, SIM_S: 4,
    EN0: 1, EN_MAX: 3, COST: 1, GUARD_K: .6,
    HZ: 120, VMAX: 680, VHEAVY: 850, VCAP: 900, DECEL: 220, ICE: 65, MUD: 650, STOP: 18,
    E_WALL: .85, E_PET: .75, E_BUMP: 1.08,
    GAP0: 245, GAP1: 360, GAP_C: 1, PIT_DR: 40,   // 試玩前調整：缺口改成「中心在缺口內」、洞的掉落半徑 34→40（原本太難把人送進陷阱）   // 左右缺口（對齊場地圖的端柱；指導語寫 220–380，圖上實際是 245–360）
    BOMB_R: 22, BLAST_R: 150, BLAST_V: 620, BLAST_MIN: .25, FUSE: 2, BOMB_CD: 1, BOMB_MAX: 4,
    PIT_EVERY: 2, EN_R: 14, EN_MAX_BOARD: 4, SPAWN_DIST: 100, DRAG_FULL: 120, DRAG_MIN: 12
  };
  const EN_SPOTS = [[220, 150], [740, 450], [220, 450], [740, 150], [360, 100], [600, 500], [360, 500], [600, 100]];
  /* 地圖（座標是邏輯座標；出生點往內、避開缺口正前方：先手不能第一發就直接把人撞出界） */
  const MAPS = {
    'bomb-ice': { n: '炸彈冰場',
      spawn: [[180, 140], [780, 460]],
      respawn: [[[150, 150], [150, 450], [300, 110]], [[810, 450], [810, 150], [660, 490]]],
      o: [{ id: 'pitN', t: 'pit', x: 480, y: 170, r: 52, dr: 34, open0: 1 }, { id: 'pitS', t: 'pit', x: 480, y: 430, r: 52, dr: 34, open0: 1 },
        { id: 'ice', t: 'ice', x: 480, y: 300, w: 220, h: 110 }, { id: 'mudL', t: 'mud', x: 250, y: 430, w: 140, h: 80 }, { id: 'mudR', t: 'mud', x: 710, y: 170, w: 140, h: 80 },
        { id: 'bumperN', t: 'bumper', x: 480, y: 80, r: 28 }, { id: 'bumperS', t: 'bumper', x: 480, y: 520, r: 28 }],
      bombs: [{ id: 'bombNW', x: 340, y: 200 }, { id: 'bombSE', x: 620, y: 400 }] }
  };
  /* 炸彈出界練習：自己在 (160,300)、靶子在 (800,300)、示範炸彈在 (720,300) */
  const PRACTICE = { map: 'bomb-ice', spawn: [[160, 300], [800, 300]], bombs: [{ id: 'demo', x: 720, y: 300 }], noPits: 1 };
  const MAP_IDS = Object.keys(MAPS);

  function rnd(S) { let t = (S.rng = (S.rng + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const r2 = v => Math.round(v * 100) / 100;
  const clone = S => JSON.parse(JSON.stringify(S));
  const inRect = (o, x, y) => Math.abs(x - o.x) <= o.w / 2 && Math.abs(y - o.y) <= o.h / 2;
  const bombDefs = S => S.pr ? PRACTICE.bombs : MAPS[S.map].bombs;
  /* 洞現在開著嗎、下一個回合邊界會不會變（用完整回合數算，不用另外存） */
  function pitOpen(S, o, R) { if (S.pr && PRACTICE.noPits) return false; R = R == null ? S.rd : R; return !!(o.open0 ^ (Math.floor(R / CFG.PIT_EVERY) & 1)); }
  const pitWarn = (S, o) => !(S.pr && PRACTICE.noPits) && pitOpen(S, o, S.rd + 1) !== pitOpen(S, o, S.rd);   // 下一個邊界會切換：預告

  /* 這個位置安全嗎（重生、補能量用）：不碰洞（含關著的）、炸彈、反彈墊、牆外 */
  function safe(S, x, y, r, opt) {
    opt = opt || {};
    if (x - r < CFG.L || x + r > CFG.R || y - r < CFG.T || y + r > CFG.B) return false;
    for (const o of MAPS[S.map].o) {
      if (o.t === 'pit' || o.t === 'bumper') { const d = r + o.r + (opt.m || 0); if ((x - o.x) ** 2 + (y - o.y) ** 2 < d * d) return false; }
    }
    for (const b of S.bombs) { if (b.st === 'gone') continue; const d = r + CFG.BOMB_R + (opt.bombGap || 4); if ((x - b.x) ** 2 + (y - b.y) ** 2 < d * d) return false; }
    if (opt.bodies) for (let i = 0; i < S.B.length; i++) { if (i === opt.skip || S.B[i].out) continue; const b = S.B[i], d = opt.bodies; if ((x - b.x) ** 2 + (y - b.y) ** 2 < d * d) return false; }
    if (opt.items) for (const it of S.it) { const d = r + CFG.EN_R + 8; if ((x - it.x) ** 2 + (y - it.y) ** 2 < d * d) return false; }
    return true;
  }

  function newGame(map, seed, first, practice) {
    if (!MAPS[map]) map = MAP_IDS[0];
    const pr = practice ? 1 : 0, sp = pr ? PRACTICE.spawn : MAPS[map].spawn;
    const S = { v: 2, mode: 'trap', map, seed: seed >>> 0, rng: (seed >>> 0) | 0, n: 0, rd: 0, first: pr ? 0 : first ? 1 : 0, turn: pr ? 0 : first ? 1 : 0, pr,
      B: sp.map(([x, y]) => ({ x, y, life: CFG.LIVES, en: CFG.EN0, gd: 0, gh: 0, ko: 0 })),
      it: [], bombs: [], over: 0, win: -1, why: '' };
    S.bombs = bombDefs(S).map(b => ({ id: b.id, x: b.x, y: b.y, st: 'live', fuse: CFG.FUSE, cd: 0 }));
    refill(S, [0, 1, 2, 3]);
    return S;
  }
  function refill(S, order) {
    if (S.pr) return [];
    const ev = [];
    for (const i of order) { if (S.it.length >= CFG.EN_MAX_BOARD) break; const [x, y] = EN_SPOTS[i]; if (S.it.some(t => t.x === x && t.y === y)) continue;
      if (safe(S, x, y, CFG.EN_R, { bodies: CFG.SPAWN_DIST, items: 1, m: 6, bombGap: 30 })) { S.it.push({ t: 'e', x, y }); ev.push({ k: 'spawn', x, y }); } }
    return ev;
  }

  /* ───────── 一次出手（含回合邊界的炸彈、洞口）：可以一步一步跑 ─────────
     act：{a:'s', v:[vx,vy], k:'n'|'h'|'g'} 發射（k：普通／重擊／護盾）、{a:'p'} 略過 */
  function sim(S0, act) {
    const S = clone(S0), me = S.turn, op = 1 - me;
    const st = { S, me, op, act, step: 0, done: false, ev: [], ph: 'act', t0: 0, lost: [0, 0], tag: [[], []], blown: {}, chain: [] };
    S.B.forEach(b => { b.vx = 0; b.vy = 0; b.out = 0; });
    if (act && act.a === 's' && Array.isArray(act.v)) {
      const B = S.B[me]; let k = act.k === 'h' || act.k === 'g' ? act.k : 'n';
      if (k !== 'n' && B.en < CFG.COST) k = 'n';   // 能量不夠：當普通
      if (k !== 'n') { B.en -= CFG.COST; st.ev.push({ k: 'skill', i: me, s: k }); }
      if (k === 'g') B.gd = 1;
      const vm = k === 'h' ? CFG.VHEAVY : CFG.VMAX;
      let vx = +act.v[0] || 0, vy = +act.v[1] || 0; const s = Math.sqrt(vx * vx + vy * vy);
      const lim = (k === 'h' ? CFG.VHEAVY / CFG.VMAX : 1) * Math.min(s, CFG.VMAX);   // 送來的速度以 680 為滿力；重擊等比例放大
      if (s > 0) { vx = vx / s * lim; vy = vy / s * lim; }
      if (Math.sqrt(vx * vx + vy * vy) > vm) { const q = vm / Math.sqrt(vx * vx + vy * vy); vx *= q; vy *= q; }
      B.vx = vx; B.vy = vy; st.heavy = k === 'h';
    } else st.ph = 'post';
    st.run = () => { while (!st.done) step(st); return st; };
    st.next = () => { if (!st.done) step(st); const e = st.ev; st.ev = []; return e; };
    return st;
  }
  const moving = b => !b.out && !b.gh && (b.vx !== 0 || b.vy !== 0);
  function cap(b) { const s = Math.sqrt(b.vx * b.vx + b.vy * b.vy); if (s > CFG.VCAP) { b.vx *= CFG.VCAP / s; b.vy *= CFG.VCAP / s; } }
  function tag(st, i, t) { const T = st.tag[i]; if (T[T.length - 1] !== t) T.push(t); }
  /* 掉出去（落洞／出界）：這次出手、這次回合事件最多扣 1 命 */
  function lose(st, i, why, x, y) {
    const b = st.S.B[i]; if (b.out) return; b.out = 1; b.vx = 0; b.vy = 0;
    st.ev.push({ k: why === 'pit' ? 'fall' : 'outside', i, x, y });
    tag(st, i, why === 'pit' ? '落坑' : '出界');
    if (!st.lost[i]) { st.lost[i] = 1; b.life = Math.max(0, b.life - 1); b.gd = 0; if (st.ph === 'act' && i !== st.me && st.act && st.act.a === 's') st.S.B[st.me].ko++; st.chain.push({ i, tags: st.tag[i].slice() }); }
  }
  /* 炸彈爆炸（用佇列，固定順序處理連鎖） */
  function blast(st, first) {
    const S = st.S, q = [first];
    while (q.length) {
      const bm = q.shift(); if (bm.st !== 'live' || st.blown[bm.id]) continue;
      st.blown[bm.id] = 1; bm.st = 'spent'; bm.cd = S.pr ? 1 : CFG.BOMB_CD + 1; st.ev.push({ k: 'bomb', id: bm.id, x: bm.x, y: bm.y });   // 練習：下一發就補回來
      S.B.forEach((b, i) => {
        if (b.out || b.gh) return;
        let dx = b.x - bm.x, dy = b.y - bm.y; const d = Math.sqrt(dx * dx + dy * dy); if (d > CFG.BLAST_R + CFG.PR) return;
        if (d === 0) { dx = b.x >= 480 ? 1 : -1; dy = 0; } else { dx /= d; dy /= d; }   // 正好在正中間：固定往外推
        let v = CFG.BLAST_V * Math.max(CFG.BLAST_MIN, 1 - Math.max(0, d - CFG.PR) / CFG.BLAST_R);
        if (b.gd && i !== st.me) v *= CFG.GUARD_K;
        b.vx += dx * v; b.vy += dy * v; cap(b); tag(st, i, '炸彈');
      });
      S.bombs.filter(o => o.st === 'live' && !st.blown[o.id]).sort((a, b) => a.id < b.id ? -1 : 1)
        .forEach(o => { if ((o.x - bm.x) ** 2 + (o.y - bm.y) ** 2 <= CFG.BLAST_R * CFG.BLAST_R) q.push(o); });
    }
  }
  function phys(st) {
    const S = st.S, dt = 1 / CFG.HZ, M = MAPS[S.map], R = CFG.PR;
    /* 1. 減速（看底座中心在哪一種地面）、移動 */
    S.B.forEach((b, i) => {
      if (!moving(b)) return;
      let dec = CFG.DECEL;
      for (const o of M.o) if ((o.t === 'ice' || o.t === 'mud') && inRect(o, b.x, b.y)) { dec = o.t === 'ice' ? CFG.ICE : CFG.MUD; tag(st, i, o.t === 'ice' ? '冰面' : '泥地'); }
      const s = Math.sqrt(b.vx * b.vx + b.vy * b.vy), s2 = s - dec * dt;
      if (s2 < CFG.STOP) { b.vx = 0; b.vy = 0; return; }
      b.vx *= s2 / s; b.vy *= s2 / s; b.x += b.vx * dt; b.y += b.vy * dt;
    });
    /* 2. 外框（左右缺口：整個圓都在缺口範圍內才不撞牆；中心過線就出界） */
    const walls = () => S.B.forEach((b, i) => {
      if (b.out || b.gh) return;
      const inGap = CFG.GAP_C ? b.y >= CFG.GAP0 && b.y <= CFG.GAP1 : b.y - R >= CFG.GAP0 && b.y + R <= CFG.GAP1;   // GAP_C：中心在缺口範圍內就算（碰到端柱會被彈開）
      if (inGap && (b.x < CFG.L || b.x > CFG.R)) { lose(st, i, 'edge', b.x < CFG.L ? CFG.L : CFG.R, b.y); return; }
      if (!inGap) {
        if (b.x - R < CFG.L) { b.x = CFG.L + R; if (b.vx < 0) { b.vx = -b.vx * CFG.E_WALL; st.ev.push({ k: 'bounce', x: CFG.L, y: b.y }); } }
        if (b.x + R > CFG.R) { b.x = CFG.R - R; if (b.vx > 0) { b.vx = -b.vx * CFG.E_WALL; st.ev.push({ k: 'bounce', x: CFG.R, y: b.y }); } }
        /* 缺口的端柱：圓的一部分跨過柱子時，用柱子這個點反彈 */
      } else {
        for (const py of [CFG.GAP0, CFG.GAP1]) for (const px of [CFG.L, CFG.R]) {
          const dx = b.x - px, dy = b.y - py, dd = dx * dx + dy * dy; if (dd >= R * R || dd === 0) continue;
          const d = Math.sqrt(dd), nx = dx / d, ny = dy / d; b.x = px + nx * R; b.y = py + ny * R; const vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= 1.85 * vn * nx; b.vy -= 1.85 * vn * ny; }
        }
      }
      if (b.y - R < CFG.T) { b.y = CFG.T + R; if (b.vy < 0) { b.vy = -b.vy * CFG.E_WALL; st.ev.push({ k: 'bounce', x: b.x, y: CFG.T }); } }
      if (b.y + R > CFG.B) { b.y = CFG.B - R; if (b.vy > 0) { b.vy = -b.vy * CFG.E_WALL; st.ev.push({ k: 'bounce', x: b.x, y: CFG.B }); } }
      for (const o of M.o) {
        if (o.t !== 'bumper') continue;
        const dx = b.x - o.x, dy = b.y - o.y, dd = dx * dx + dy * dy, rr = R + o.r; if (dd >= rr * rr) continue;
        const d = Math.sqrt(dd); let nx = 1, ny = 0; if (d > 0) { nx = dx / d; ny = dy / d; }
        b.x = o.x + nx * rr; b.y = o.y + ny * rr; const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= (1 + CFG.E_BUMP) * vn * nx; b.vy -= (1 + CFG.E_BUMP) * vn * ny; cap(b); st.ev.push({ k: 'bounce', x: b.x - nx * R, y: b.y - ny * R, bump: o.id }); tag(st, i, '反彈墊'); }
      }
    });
    walls();
    /* 3. 兩隻互撞（護盾：被對手撞的推力 ×0.6） */
    const a = S.B[0], b = S.B[1];
    if (!a.out && !b.out && !a.gh && !b.gh) {
      const dx = b.x - a.x, dy = b.y - a.y, dd = dx * dx + dy * dy, rr = 2 * R;
      if (dd < rr * rr) {
        const d = Math.sqrt(dd); let nx = 1, ny = 0; if (d > 0) { nx = dx / d; ny = dy / d; }
        const pen = (rr - d) / 2; a.x -= nx * pen; a.y -= ny * pen; b.x += nx * pen; b.y += ny * pen;
        const vrel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (vrel > 0) {
          const j = (1 + CFG.E_PET) * vrel / 2, ja = a.gd ? j * CFG.GUARD_K : j, jb = b.gd ? j * CFG.GUARD_K : j;
          a.vx -= ja * nx; a.vy -= ja * ny; b.vx += jb * nx; b.vy += jb * ny; cap(a); cap(b);
          st.ev.push({ k: 'bump', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, v: vrel, g: (a.gd || b.gd) ? 1 : 0 });
          if (vrel > 60) { tag(st, 0, '碰撞'); tag(st, 1, '碰撞'); }
        }
        walls();
      }
    }
    /* 4. 碰到炸彈就爆、掉進開著的洞、撿能量 */
    S.B.forEach((b, i) => {
      if (b.out || b.gh) return;
      for (const bm of S.bombs) { if (bm.st !== 'live') continue; const d = CFG.BOMB_R + R; if ((b.x - bm.x) ** 2 + (b.y - bm.y) ** 2 < d * d) blast(st, bm); }
    });
    S.B.forEach((b, i) => {
      if (b.out || b.gh) return;
      for (const o of M.o) if (o.t === 'pit' && pitOpen(S, o) && (b.x - o.x) ** 2 + (b.y - o.y) ** 2 < (CFG.PIT_DR || o.dr) ** 2) { lose(st, i, 'pit', o.x, o.y); return; }
    });
    for (let k = 0; k < S.it.length; k++) {
      const it = S.it[k], rr = R + CFG.EN_R; let best = -1, bd = Infinity;
      for (const i of [st.me, st.op]) { const b = S.B[i]; if (!b || b.out || b.gh) continue; const dd = (b.x - it.x) ** 2 + (b.y - it.y) ** 2; if (dd >= rr * rr || b.en >= CFG.EN_MAX) continue; if (dd < bd) { bd = dd; best = i; } }
      if (best < 0) continue; S.B[best].en++; st.ev.push({ k: 'energy', i: best, x: it.x, y: it.y }); S.it.splice(k, 1); k--;
    }
  }
  /* 一步：出手的物理 → 出手後整理 → （完整回合邊界）炸彈倒數、洞口切換、推力 → 結束整理 */
  function step(st) {
    const S = st.S;
    if (st.ph === 'act' || st.ph === 'bound') {
      phys(st); st.step++;
      if (!S.B.some(moving) || st.step - st.t0 >= CFG.SIM_S * CFG.HZ) { S.B.forEach(b => { b.vx = 0; b.vy = 0; }); st.ph = st.ph === 'act' ? 'post' : 'end'; }
      return;
    }
    if (st.ph === 'post') {
      S.n++;
      const full = S.pr || S.n % 2 === 0;
      if (!full) { st.ph = 'end'; return; }
      /* 完整回合邊界：先炸彈、洞口，再算推力 */
      S.rd++; st.lost = [0, 0]; st.tag = [[], []]; st.blown = {};
      st.ev.push({ k: 'round', rd: S.rd });
      const M = MAPS[S.map];
      for (const o of M.o) if (o.t === 'pit' && pitOpen(S, o, S.rd) !== pitOpen(S, o, S.rd - 1)) st.ev.push({ k: pitOpen(S, o, S.rd) ? 'pitOpen' : 'pitClose', id: o.id, x: o.x, y: o.y });
      const fuse = [];
      for (const bm of S.bombs) {
        if (bm.st === 'live') { if (!S.pr) bm.fuse--; if (bm.fuse <= 0) fuse.push(bm); }   // 練習：示範炸彈不自己爆
        else if (bm.st === 'spent') { bm.st = 'gone'; }
        if (bm.st === 'gone' && --bm.cd <= 0) {   // 冷卻完：放得下才補回來，不然下一回合再試
          if (safe(S, bm.x, bm.y, CFG.BOMB_R, { bodies: CFG.PR + CFG.BOMB_R + 30, m: 4 })) { bm.st = 'live'; bm.fuse = CFG.FUSE; st.ev.push({ k: 'bombBack', id: bm.id, x: bm.x, y: bm.y }); } else bm.cd = 1;
        }
      }
      fuse.sort((a, b) => a.id < b.id ? -1 : 1).forEach(bm => blast(st, bm));
      S.B.forEach((b, i) => { if (b.out || b.gh) return; for (const o of M.o) if (o.t === 'pit' && pitOpen(S, o) && (b.x - o.x) ** 2 + (b.y - o.y) ** 2 < (CFG.PIT_DR || o.dr) ** 2) lose(st, i, 'pit', o.x, o.y); });
      st.ph = 'bound'; st.t0 = st.step; return;
    }
    if (st.ph === 'end') { settle(st); st.done = true; }
  }
  /* 結束整理：補能量、判勝負、重生、換人 */
  function settle(st) {
    const S = st.S, ev = st.ev;
    if (S.n % 2 === 0 || S.pr) { const order = EN_SPOTS.map((_, i) => i); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd(S) * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } ev.push(...refill(S, order)); }
    S.B.forEach(b => { b.x = r2(b.x); b.y = r2(b.y); });
    if (S.pr) { const d = S.B[1]; if (d.life <= 0) d.life = CFG.LIVES; }
    judge(S);
    /* 重生：還有命的人回到安全點（離對手最遠，一樣遠照順序），到自己下一次出手前是半透明保護 */
    if (!S.over) S.B.forEach((b, i) => {
      if (!b.out) return;
      if (b.life <= 0) return;
      const cand = S.pr ? [PRACTICE.spawn[i]] : MAPS[S.map].respawn[i], o = S.B[1 - i];
      let best = null, bd = -1;
      for (const [x, y] of cand) { if (!safe(S, x, y, CFG.PR, { bodies: 2 * CFG.PR + 8, skip: i })) continue; const d = (x - o.x) ** 2 + (y - o.y) ** 2; if (d > bd) { bd = d; best = [x, y]; } }
      if (!best) best = cand[0];
      b.x = best[0]; b.y = best[1]; b.out = 0; b.gh = S.pr ? 0 : 1; ev.push({ k: 'respawn', i, x: b.x, y: b.y });
    });
    S.B.forEach(b => { delete b.vx; delete b.vy; if (!b.out) delete b.out; });   // 比賽結束時掉出去的人留著 out（畫面上不畫他）
    if (!S.over) { const nx = S.pr ? 0 : 1 - st.me; S.turn = nx; const B = S.B[nx]; B.gh = 0; B.gd = 0; }   // 輪到誰：解除他的重生保護、上一輪的護盾
    if (st.chain.length) ev.push({ k: 'chain', list: st.chain.map(c => ({ i: c.i, tags: c.tags })) });
    st.ev = ev;
  }
  function judge(S) {
    if (S.pr) return;
    const [a, b] = S.B, end = (w, why) => { S.over = 1; S.win = w; S.why = why; };
    if (a.life <= 0 || b.life <= 0) return a.life <= 0 && b.life <= 0 ? end(2, '兩隻同時用完生命') : end(a.life <= 0 ? 1 : 0, '對手的生命用完了');
    if (S.n >= CFG.SHOTS) {
      if (a.life !== b.life) return end(a.life > b.life ? 0 : 1, '8 回合打完・剩下的生命比較多');
      if (a.ko !== b.ko) return end(a.ko > b.ko ? 0 : 1, '8 回合打完・生命一樣，比把對手撞掉的次數');
      return end(2, '8 回合打完・生命和撞掉次數都一樣');
    }
  }
  function finish(st) { while (!st.done) step(st); return { S: st.S, ev: st.ev }; }
  function apply(S, act) { const st = sim(S, act); st.run(); return st.S; }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  root.PS2 = { CFG, MAPS, MAP_IDS, PRACTICE, EN_SPOTS, newGame, sim, step, finish, apply, judge, clone, same, pitOpen, pitWarn, inRect, safe, VER: 'ps2-v1' };
})(typeof window !== 'undefined' ? window : globalThis);
