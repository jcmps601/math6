/* 寵物彈射對戰：規則與物理（只算資料，不畫畫面；sling.html 負責畫面、操作、連線）
   ・場地 960×600 邏輯座標（x 向右、y 向下），合法範圍 x48–912、y48–552，底座半徑 28，兩隻一樣重。
   ・固定 120 Hz 步進，只用加減乘除和開根號（每台平板、每種瀏覽器算出來都一樣），不用 Math.random。
   ・發射的資料是整數速度 [vx, vy]（由出手的平板把角度、力道換算好），所以各台不用自己算三角函數。
   ・同一個狀態 + 同一個動作 → 一定得到同一個結果；線上對戰時出手的平板算完，把結果快照寫上雲端，其他平板照著播再對齊。
   ・所有寵物的種類、等級、進化都只改外觀，半徑、重量、力道、扣血全部一樣。 */
(function (root) {
  const CFG = {
    W: 960, H: 600, L: 48, T: 48, R: 912, B: 552, PR: 28,
    HP: 100, DMG: 18, DMG_SPEED: 100, GOAL: 5, ROUNDS: 8, SHOTS: 16, AIM_S: 8, SIM_S: 4,
    HEAL: 15, SH_LIFE: 2,
    HZ: 120, VMAX: 680, VCAP: 760, DECEL: 220, STOP: 18,
    E_WALL: .85, E_PET: .75, E_ROCK: .9, E_BUMP: 1.08,
    SPR_MIN: 420, SPR_K: 1.2, SPR_CAP: 720, SPR_TRIG: 50, SPR_R: 26,
    POR_TRIG: 60, POR_R: 24, POR_COOL: .35, POR_MAX: 2,
    GEM_R: 14, HEART_R: 18, SHIELD_R: 18, GEMS_MAX: 4, SPAWN_DIST: 100, SPAWN_MARGIN: 12,
    HEART_ROUND: 3, SHIELD_ROUND: 5, DRAG_FULL: 120, DRAG_MIN: 12
  };
  const GEMS = [[240, 150], [720, 150], [240, 450], [720, 450], [360, 100], [600, 100], [360, 500], [600, 500]];
  const MAPS = {
    meadow: { n: '草地碰撞場', o: [{ id: 'rock1', t: 'rock', x: 480, y: 200, r: 44 }, { id: 'rock2', t: 'rock', x: 480, y: 400, r: 44 }, { id: 'bumper1', t: 'bumper', x: 330, y: 300, r: 34 }, { id: 'bumper2', t: 'bumper', x: 630, y: 300, r: 34 }], heart: [480, 300], shield: [480, 100] },
    spring: { n: '彈簧迴廊', o: [{ id: 'wall1', t: 'wall', x: 480, y: 180, w: 160, h: 32 }, { id: 'wall2', t: 'wall', x: 480, y: 420, w: 160, h: 32 }, { id: 'spring1', t: 'spring', x: 320, y: 300, r: 26, a: 0 }, { id: 'spring2', t: 'spring', x: 640, y: 300, r: 26, a: 180 }], heart: [480, 300], shield: [480, 100] },
    portal: { n: '傳送花園', o: [{ id: 'rock1', t: 'rock', x: 480, y: 160, r: 40 }, { id: 'rock2', t: 'rock', x: 480, y: 440, r: 40 }, { id: 'portalA', t: 'portal-cyan', x: 320, y: 300, r: 38, pair: 'portalB' }, { id: 'portalB', t: 'portal-purple', x: 640, y: 300, r: 38, pair: 'portalA' }], heart: [480, 300], shield: [480, 80] }
  };
  const MAP_IDS = Object.keys(MAPS), SPAWN = [[160, 300], [800, 300]];
  const DIR = { 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] };   // 彈簧方向（不用三角函數）
  const S2 = Math.SQRT1_2;
  const ITEM_R = { g: CFG.GEM_R, h: CFG.HEART_R, s: CFG.SHIELD_R };

  /* 有種子的亂數（只用整數運算，每台一樣） */
  function rnd(S) { let t = (S.rng = (S.rng + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const solid = o => o.t === 'rock' || o.t === 'bumper' || o.t === 'wall';
  const r2 = v => Math.round(v * 100) / 100;
  const clone = S => JSON.parse(JSON.stringify(S));

  /* 圓和長方形牆最近的點 */
  function rectNear(o, x, y) { const hx = o.w / 2, hy = o.h / 2; return [Math.max(o.x - hx, Math.min(o.x + hx, x)), Math.max(o.y - hy, Math.min(o.y + hy, y))]; }
  /* 這個位置放得下嗎（半徑 r、跟障礙至少留 m） */
  function free(S, x, y, r, m, opt) {
    opt = opt || {};
    if (x - r < CFG.L || x + r > CFG.R || y - r < CFG.T || y + r > CFG.B) return false;
    for (const o of MAPS[S.map].o) {
      if (o.t === 'wall') { const [nx, ny] = rectNear(o, x, y), dx = x - nx, dy = y - ny; if (dx * dx + dy * dy < (r + m) * (r + m) || (nx === x && ny === y)) return false; continue; }
      if (!solid(o) && !opt.items) continue;
      const d = r + o.r + m, dx = x - o.x, dy = y - o.y; if (dx * dx + dy * dy < d * d) return false;
    }
    if (opt.bodies) for (let i = 0; i < S.B.length; i++) { if (i === opt.skip) continue; const b = S.B[i], dx = x - b.x, dy = y - b.y, d = opt.bodies; if (dx * dx + dy * dy < d * d) return false; }
    if (opt.others) for (const it of S.it) { const d = r + ITEM_R[it.t] + m, dx = x - it.x, dy = y - it.y; if (dx * dx + dy * dy < d * d) return false; }
    return true;
  }
  const itemOK = (S, t, x, y) => free(S, x, y, ITEM_R[t], CFG.SPAWN_MARGIN, { items: 1, bodies: CFG.SPAWN_DIST, others: 1 });

  /* ───────── 開新的一局 ───────── first：誰先（0 紅、1 藍）；practice：單人練習（對面是不會動手的練習靶） */
  function newGame(map, seed, first, practice) {
    if (!MAPS[map]) map = 'meadow';
    const S = { v: 1, map, seed: seed >>> 0, rng: (seed >>> 0) | 0, n: 0, first: first ? 1 : 0, turn: first ? 1 : 0, pr: practice ? 1 : 0,
      B: SPAWN.map(([x, y]) => ({ x, y, hp: CFG.HP, gem: 0, sh: 0, shL: 0, shK: -1 })), it: [], hd: 0, sd: 0, over: 0, win: -1, why: '' };
    if (practice) { S.first = 0; S.turn = 0; }
    for (const i of [0, 1, 2, 3]) { const [x, y] = GEMS[i]; if (itemOK(S, 'g', x, y)) S.it.push({ t: 'g', x, y }); }
    return S;
  }
  const rounds = S => S.pr ? S.n : Math.floor(S.n / 2);   // 完成幾個完整回合（練習：每發一次算一次）
  const shotsLeft = S => S.pr ? Infinity : CFG.SHOTS - S.n;

  /* ───────── 一次出手的模擬（可以一步一步跑，給畫面播動畫用） ───────── act：{a:'s', v:[vx,vy]} 發射、{a:'p'} 略過 */
  function sim(S0, act) {
    const S = clone(S0), me = S.turn, op = 1 - me, dt = 1 / CFG.HZ, maxSteps = CFG.SIM_S * CFG.HZ;
    const st = { S, me, op, act, step: 0, done: false, ev: [], dmg: 0, spr: {}, sprIn: {}, por: S.B.map(() => ({ cool: -9, arm: true, cnt: 0 })), touch: false };
    S.B.forEach(b => { b.vx = 0; b.vy = 0; });
    if (act && act.a === 's' && Array.isArray(act.v)) {
      let vx = +act.v[0] || 0, vy = +act.v[1] || 0; const s = Math.sqrt(vx * vx + vy * vy);
      if (s > CFG.VMAX) { vx = vx * CFG.VMAX / s; vy = vy * CFG.VMAX / s; }
      S.B[me].vx = vx; S.B[me].vy = vy;
    } else st.done = true;
    for (let i = 0; i < S.B.length; i++) for (const o of MAPS[S.map].o) if (o.t === 'spring') { const b = S.B[i], dx = b.x - o.x, dy = b.y - o.y; st.sprIn[i + o.id] = dx * dx + dy * dy < o.r * o.r; }
    st.run = () => { while (!st.done) step(st); return st; };
    st.next = () => { if (!st.done) step(st); const e = st.ev; st.ev = []; return e; };
    return st;
  }
  const moving = b => b.vx !== 0 || b.vy !== 0;
  function cap(b) { const s = Math.sqrt(b.vx * b.vx + b.vy * b.vy); if (s > CFG.VCAP) { b.vx *= CFG.VCAP / s; b.vy *= CFG.VCAP / s; } }
  function step(st) {
    const S = st.S, dt = 1 / CFG.HZ, M = MAPS[S.map], R = CFG.PR, t = st.step * dt;
    /* 1. 減速、移動 */
    for (const b of S.B) {
      if (!moving(b)) continue;
      const s = Math.sqrt(b.vx * b.vx + b.vy * b.vy), s2 = s - CFG.DECEL * dt;
      if (s2 < CFG.STOP) { b.vx = 0; b.vy = 0; continue; }
      b.vx *= s2 / s; b.vy *= s2 / s; b.x += b.vx * dt; b.y += b.vy * dt;
    }
    /* 2. 撞外框、障礙 */
    const statics = () => S.B.forEach((b, i) => {
      if (b.x - R < CFG.L) { b.x = CFG.L + R; if (b.vx < 0) { b.vx = -b.vx * CFG.E_WALL; st.ev.push({ k: 'bounce', x: CFG.L, y: b.y }); } }
      if (b.x + R > CFG.R) { b.x = CFG.R - R; if (b.vx > 0) { b.vx = -b.vx * CFG.E_WALL; st.ev.push({ k: 'bounce', x: CFG.R, y: b.y }); } }
      if (b.y - R < CFG.T) { b.y = CFG.T + R; if (b.vy < 0) { b.vy = -b.vy * CFG.E_WALL; st.ev.push({ k: 'bounce', x: b.x, y: CFG.T }); } }
      if (b.y + R > CFG.B) { b.y = CFG.B - R; if (b.vy > 0) { b.vy = -b.vy * CFG.E_WALL; st.ev.push({ k: 'bounce', x: b.x, y: CFG.B }); } }
      for (const o of M.o) {
        if (!solid(o)) continue;
        let nx, ny, d, pen, e;
        if (o.t === 'wall') {
          const [cx, cy] = rectNear(o, b.x, b.y), dx = b.x - cx, dy = b.y - cy, dd = dx * dx + dy * dy;
          if (dd >= R * R) continue;
          if (dd > 0) { d = Math.sqrt(dd); nx = dx / d; ny = dy / d; pen = R - d; }
          else {   // 中心跑進牆裡：往最近的那一邊推出去
            const hx = o.w / 2, hy = o.h / 2, l = b.x - (o.x - hx), r = o.x + hx - b.x, u = b.y - (o.y - hy), w = o.y + hy - b.y, m = Math.min(l, r, u, w);
            if (m === l) { nx = -1; ny = 0; pen = l + R; } else if (m === r) { nx = 1; ny = 0; pen = r + R; } else if (m === u) { nx = 0; ny = -1; pen = u + R; } else { nx = 0; ny = 1; pen = w + R; }
          }
          e = CFG.E_WALL;
        } else {
          const dx = b.x - o.x, dy = b.y - o.y, dd = dx * dx + dy * dy, rr = R + o.r;
          if (dd >= rr * rr) continue;
          d = Math.sqrt(dd); if (d === 0) { nx = i ? 1 : -1; ny = 0; } else { nx = dx / d; ny = dy / d; } pen = rr - d;
          e = o.t === 'bumper' ? CFG.E_BUMP : CFG.E_ROCK;
        }
        b.x += nx * pen; b.y += ny * pen;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; cap(b); st.ev.push({ k: 'bounce', x: b.x - nx * R, y: b.y - ny * R, bump: o.t === 'bumper' ? o.id : '' }); }
      }
    });
    statics();
    /* 3. 兩隻互撞（一樣重） */
    if (S.B.length >= 2) {
      const a = S.B[0], b = S.B[1], dx = b.x - a.x, dy = b.y - a.y, dd = dx * dx + dy * dy, rr = 2 * R;
      if (dd < rr * rr) {
        const d = Math.sqrt(dd); let nx, ny; if (d === 0) { nx = 1; ny = 0; } else { nx = dx / d; ny = dy / d; }
        const pen = (rr - d) / 2; a.x -= nx * pen; a.y -= ny * pen; b.x += nx * pen; b.y += ny * pen;
        const vrel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;   // >0 表示正在靠近
        if (vrel > 0) {
          const j = (1 + CFG.E_PET) * vrel / 2; a.vx -= j * nx; a.vy -= j * ny; b.vx += j * nx; b.vy += j * ny; cap(a); cap(b);
          const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
          st.ev.push({ k: 'bump', x: cx, y: cy, v: vrel });
          if (!st.dmg && vrel >= CFG.DMG_SPEED && st.act && st.act.a === 's') {   // 這次出手第一次有效碰撞：對手扣血（護盾擋一次）
            st.dmg = 1; const o = S.B[st.op];
            if (o.sh) { o.sh = 0; o.shL = 0; o.shK = -1; st.ev.push({ k: 'shield', i: st.op, x: o.x, y: o.y }); }
            else { o.hp = Math.max(0, o.hp - CFG.DMG); st.ev.push({ k: 'hit', i: st.op, x: cx, y: cy, dmg: CFG.DMG }); }
          }
        }
        statics();
      }
    }
    /* 4. 彈簧、傳送門 */
    S.B.forEach((b, i) => {
      for (const o of M.o) {
        if (o.t !== 'spring') continue;
        const dx = b.x - o.x, dy = b.y - o.y, inside = dx * dx + dy * dy < o.r * o.r, key = i + o.id, was = st.sprIn[key]; st.sprIn[key] = inside;
        if (!inside || was || st.spr[key]) continue;
        const s = Math.sqrt(b.vx * b.vx + b.vy * b.vy); if (s <= CFG.SPR_TRIG) continue;
        st.spr[key] = 1; const [ux, uy] = DIR[o.a] || DIR[0], v = Math.min(CFG.SPR_CAP, Math.max(CFG.SPR_MIN, s * CFG.SPR_K));
        b.vx = ux * v; b.vy = uy * v; st.ev.push({ k: 'spring', x: o.x, y: o.y, id: o.id, a: o.a });
      }
      const P = st.por[i];
      const ports = M.o.filter(o => o.pair);
      if (!ports.length) return;
      if (!P.arm && ports.every(o => { const dx = b.x - o.x, dy = b.y - o.y; return dx * dx + dy * dy > o.r * o.r; })) P.arm = true;
      for (const o of ports) {
        const dx = b.x - o.x, dy = b.y - o.y; if (dx * dx + dy * dy >= CFG.POR_R * CFG.POR_R) continue;
        const s = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (s <= CFG.POR_TRIG || !P.arm || t - P.cool < CFG.POR_COOL || P.cnt >= CFG.POR_MAX) continue;
        const to = M.o.find(q => q.id === o.pair), ux = b.vx / s, uy = b.vy / s, D = to.r + R + 4;
        const tries = [[ux, uy], [ux * S2 - uy * S2, ux * S2 + uy * S2], [ux * S2 + uy * S2, -ux * S2 + uy * S2], [-uy, ux], [uy, -ux]];   // 原方向、+45、-45、+90、-90
        let ok = null;
        for (const [px, py] of tries) { const x = to.x + px * D, y = to.y + py * D; if (free(S, x, y, R, 0, { bodies: 2 * R, skip: i })) { ok = [x, y, px, py]; break; } }
        if (!ok) continue;   // 出口全被擋住：這次不傳送，直接走過去
        const fx = b.x, fy = b.y; b.x = ok[0]; b.y = ok[1]; b.vx = ok[2] * s; b.vy = ok[3] * s;
        P.cool = t; P.arm = false; P.cnt++; st.ev.push({ k: 'portal', i, from: o.id, to: to.id, fx, fy, x: b.x, y: b.y });
        break;
      }
    });
    /* 5. 撿道具（同時碰到：比較近的拿；一樣近給出手的人） */
    for (let k = 0; k < S.it.length; k++) {
      const it = S.it[k], rr = R + ITEM_R[it.t]; let best = -1, bd = Infinity;
      for (const i of [st.me, st.op]) {
        const b = S.B[i]; if (!b) continue; const dx = b.x - it.x, dy = b.y - it.y, dd = dx * dx + dy * dy;
        if (dd >= rr * rr) continue;
        if (it.t === 'h' && b.hp >= CFG.HP) continue;   // 滿血不吃補血
        if (it.t === 's' && b.sh) continue;             // 已經有護盾不吃第二個
        if (dd < bd) { bd = dd; best = i; }
      }
      if (best < 0) continue;
      const b = S.B[best];
      if (it.t === 'g') { b.gem++; st.ev.push({ k: 'gem', i: best, x: it.x, y: it.y }); }
      else if (it.t === 'h') { const h0 = b.hp; b.hp = Math.min(CFG.HP, b.hp + CFG.HEAL); st.ev.push({ k: 'heart', i: best, x: it.x, y: it.y, heal: b.hp - h0 }); }
      else { b.sh = 1; b.shL = CFG.SH_LIFE; b.shK = S.n; st.ev.push({ k: 'shieldGet', i: best, x: it.x, y: it.y }); }
      S.it.splice(k, 1); k--;
    }
    st.step++;
    if (!S.B.some(moving) || st.step >= CFG.SIM_S * CFG.HZ) { S.B.forEach(b => { b.vx = 0; b.vy = 0; }); st.done = true; }
  }

  /* ───────── 一次出手結束：位置取整、護盾倒數、補寶石、補血護盾、判勝負、換人 ───────── */
  function finish(st) {
    while (!st.done) step(st);
    const S = st.S, me = st.me, ev = [];
    S.B.forEach(b => { b.x = r2(b.x); b.y = r2(b.y); delete b.vx; delete b.vy; });
    const k = S.n; S.n++;
    const B = S.B[me]; if (B.sh && B.shK !== k) { B.shL--; if (B.shL <= 0) { B.sh = 0; B.shL = 0; B.shK = -1; ev.push({ k: 'shieldEnd', i: me }); } }
    if (S.pr) { const d = S.B[1]; if (d.hp <= 0) { d.hp = CFG.HP; ev.push({ k: 'reset', i: 1 }); } }
    const done = S.pr || S.n % 2 === 0;   // 雙方各出手一次＝一個完整回合
    if (done) {
      const R = rounds(S);
      const order = GEMS.map((_, i) => i); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd(S) * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      for (const i of order) { if (S.it.filter(x => x.t === 'g').length >= CFG.GEMS_MAX) break; const [x, y] = GEMS[i]; if (itemOK(S, 'g', x, y)) { S.it.push({ t: 'g', x, y }); ev.push({ k: 'spawn', t: 'g', x, y }); } }
      const M = MAPS[S.map];
      if (!S.hd && R >= CFG.HEART_ROUND && itemOK(S, 'h', M.heart[0], M.heart[1])) { S.hd = 1; S.it.push({ t: 'h', x: M.heart[0], y: M.heart[1] }); ev.push({ k: 'spawn', t: 'h', x: M.heart[0], y: M.heart[1] }); }
      if (!S.sd && R >= CFG.SHIELD_ROUND && itemOK(S, 's', M.shield[0], M.shield[1])) { S.sd = 1; S.it.push({ t: 's', x: M.shield[0], y: M.shield[1] }); ev.push({ k: 'spawn', t: 's', x: M.shield[0], y: M.shield[1] }); }
    }
    judge(S);
    if (!S.over) S.turn = S.pr ? 0 : 1 - me;
    return { S, ev };
  }
  function judge(S) {
    if (S.pr) return;
    const [a, b] = S.B, ka = a.hp <= 0, kb = b.hp <= 0;
    const cmp = why => { if (a.gem !== b.gem) end(a.gem > b.gem ? 0 : 1, why + '・寶石比較多'); else if (a.hp !== b.hp) end(a.hp > b.hp ? 0 : 1, why + '・寶石一樣，比剩下的體力'); else end(2, why + '・寶石和體力都一樣'); };
    const end = (w, why) => { S.over = 1; S.win = w; S.why = why; };
    if (ka || kb) return ka && kb ? end(2, '兩隻同時體力歸零') : end(ka ? 1 : 0, '把對手的體力撞光了');
    if (a.gem >= CFG.GOAL || b.gem >= CFG.GOAL) return cmp('寶石先集滿 5 顆');
    if (S.n >= CFG.SHOTS) return cmp('8 回合打完了');
  }
  /* 一口氣算完一次出手（線上對戰：出手的平板用這個算出權威結果） */
  function apply(S, act) { return finish(sim(S, act)).S; }
  /* 拖曳 → 整數速度（給畫面用；這裡的三角函數只在出手的那台平板算一次） */
  function launch(dx, dy) { const d = Math.sqrt(dx * dx + dy * dy); if (d < CFG.DRAG_MIN) return null; const p = Math.min(1, d / CFG.DRAG_FULL); return [Math.round(-dx / d * p * CFG.VMAX), Math.round(-dy / d * p * CFG.VMAX)]; }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  root.PS = { CFG, MAPS, MAP_IDS, GEMS, SPAWN, ITEM_R, newGame, sim, step, finish, apply, judge, launch, free, rounds, shotsLeft, clone, same, VER: 'ps-v1' };
})(typeof window !== 'undefined' ? window : globalThis);
