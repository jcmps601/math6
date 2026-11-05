/* 大砲混戰（規則引擎）——2～4 台坦克一起打，從「大砲對轟」pd.js 改來的
   場地 1600 × 700（上面多一點天空，砲彈飛高也看得到），地形是一條「每一行的地面高度」，砲彈炸到會挖出圓形的坑。
   ・玩家 0～3（最多 4 人）。輪流打，被打倒（血 0）或離開的人跳過。
   ・模式：ffa 各自為戰（剩最後一台贏）、team 2 對 2（0、2 一隊＝紅隊；1、3 一隊＝藍隊，剩一隊贏）。
   ・砲彈：💣 普通彈（不限）、🎆 三連發（2 次）、🏀 彈跳彈（2 次，碰到地面會彈一下再爆）、💥 超級彈（1 次）。
   ・每個人大約打 8 發，回合用完：剩下的血（隊伍加起來）最多的贏。
   為了每台平板結果一定一樣：發射的人算好「炸在哪裡、每台坦克各扣多少血」一起存進棋譜，其他人照著重播。
   一步棋：「玩家:坦克位置:角度:力道:砲彈:爆炸1|爆炸2…」，爆炸＝「第幾顆_x_y_直擊(玩家+1，0 沒有)_扣血0.扣血1.扣血2.扣血3」
   時間到沒發射＝「玩家:坦克位置:-」。
   中途離開：state.out = {i玩家: 第幾步的時候離開}，重播到那一步就讓他出局（坦克消失）。 */
(function (root) {
  const W = 1600, H = 700, STEP = 4, FLOOR = 656, HP = 100, FUEL = 90, PER = 8;
  const GRAV = 0.18, WK = 0.0035, VK = 0.17, SUB = 3;
  const WEAP = {
    n: { name: '普通彈', icon: '💣', D: 30, R: 55, cr: 38, n: 1, lim: 0 },
    t: { name: '三連發', icon: '🎆', D: 13, R: 38, cr: 26, n: 3, lim: 2, spread: 4 },
    b: { name: '彈跳彈', icon: '🏀', D: 30, R: 52, cr: 34, n: 1, lim: 2, bn: 1 },
    s: { name: '超級彈', icon: '💥', D: 48, R: 85, cr: 60, n: 1, lim: 1 }
  };
  const WK_ = Object.keys(WEAP);
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const wind = (seed, n) => { const r = rng((seed | 0) * 31 + n * 7919 + 17); r(); return Math.floor((r() + r()) / 2 * 17) - 8; };
  const teamOf = (S, i) => S.mode === 'team' ? i % 2 : i;
  const maxT = n => n * PER;

  /* 地形：波浪＋每兩台坦克中間一座山；坦克站的地方比較平。
     ffa：誰站哪裡用亂數排；team：左到右是 紅 藍 紅 藍（0 1 2 3）。 */
  function genMap(n, mode, rnd = Math.random) {
    n = Math.max(2, Math.min(4, n | 0));
    const cnt = W / STEP + 1, h = new Array(cnt);
    const waves = [0, 1, 2, 3].map(k => ({ a: (16 + rnd() * 34) / (k + 1), f: (1.5 + k * 1.7 + rnd()) * Math.PI * 2 / W, p: rnd() * 6.3 }));
    const base = 510 + (rnd() - .5) * 50, M = 130, sp = (W - 2 * M) / (n - 1);
    const pos = []; for (let i = 0; i < n; i++) pos.push(Math.round(M + i * sp + (i === 0 ? rnd() * 40 : i === n - 1 ? -rnd() * 40 : (rnd() - .5) * Math.min(90, sp * .3))));
    const hills = []; for (let i = 0; i + 1 < n; i++) hills.push({ x: (pos[i] + pos[i + 1]) / 2 + (rnd() - .5) * sp * .25, h: 50 + rnd() * (n > 2 ? 110 : 150), w: 80 + rnd() * (sp * .22) });
    for (let i = 0; i < cnt; i++) {
      const x = i * STEP; let y = base;
      for (const w of waves) y += w.a * Math.sin(x * w.f + w.p);
      for (const hl of hills) y -= hl.h * Math.exp(-((x - hl.x) ** 2) / (2 * hl.w * hl.w));
      for (const t of pos) { const d = Math.abs(x - t); if (d < 70) { const k = 1 - d / 70; y = y * (1 - k * .8) + (base + 20) * k * .8; } }
      h[i] = Math.max(300, Math.min(600, Math.round(y)));
    }
    let order = pos.map((_, i) => i);
    if (mode !== 'team') for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const xs = new Array(n); order.forEach((p, i) => xs[i] = pos[p]);   // 玩家 i 站在 xs[i]
    return 'm1|' + xs.join(',') + '|' + h.map(v => v.toString(36).padStart(2, '0')).join('');
  }
  function newGame(n, mode, rnd = Math.random) { return { map: genMap(n, mode, rnd), seed: Math.floor(rnd() * 1e9), mode: mode === 'team' && n === 4 ? 'team' : 'ffa', n }; }
  function decode(map) {
    const [, xs, hs] = String(map || '').split('|'), pts = [];
    for (let i = 0; i + 1 < (hs || '').length; i += 2) pts.push(parseInt(hs.slice(i, i + 2), 36));
    const g = new Float64Array(W);
    for (let x = 0; x < W; x++) { const i = Math.floor(x / STEP), f = (x - i * STEP) / STEP, a = pts[i] ?? 500, b = pts[i + 1] ?? a; g[x] = a + (b - a) * f; }
    const X = String(xs || '').split(',').map(Number).filter(isFinite);
    return { g, xs: X.length >= 2 ? X : [200, W - 200] };
  }
  const gAt = (g, x) => g[Math.max(0, Math.min(W - 1, Math.round(x)))];
  const center = (g, x) => [x, gAt(g, x) - 16];
  function crater(g, cx, cy, r) {
    for (let x = Math.max(0, Math.ceil(cx - r)); x <= Math.min(W - 1, Math.floor(cx + r)); x++) {
      const dy = Math.sqrt(r * r - (x - cx) * (x - cx));
      if (cy - dy <= g[x] && g[x] < cy + dy) g[x] = Math.min(FLOOR, cy + dy);
    }
  }
  function dmgAt(g, tx, ex, ey, w) {
    const [cx, cy] = center(g, tx), d = Math.max(0, Math.hypot(cx - ex, cy - ey) - 10);
    return d >= w.R ? 0 : Math.round(w.D * (1 - .75 * d / w.R));
  }
  function parse(tok) {
    const f = String(tok).split(':'), m = { i: +f[0] | 0, x: +f[1] };
    if (f[2] === '-' || f.length < 5) { m.pass = true; return m; }
    m.a = +f[2]; m.p = +f[3]; m.w = WEAP[f[4]] ? f[4] : 'n';
    m.imp = (f[5] || '').split('|').filter(Boolean).map(s => { const [k, x, y, hit, ds] = s.split('_'); return { k: +k, x: +x, y: +y, hit: +hit || 0, d: String(ds || '').split('.').map(v => +v || 0) }; });
    return m;
  }
  const alive = (S, i) => !!S.T[i] && !S.T[i].out && S.T[i].hp > 0;
  function nextAlive(S, from) { for (let d = 1; d <= S.n; d++) { const j = (from + d) % S.n; if (alive(S, j)) return j; } return from; }
  /* 從頭照著棋譜重播一遍；out＝{i0:第幾步離開,…} */
  function replay(map, seed, moves, out, mode) {
    const M = decode(map), n = M.xs.length;
    const S = { g: M.g, n, mode: mode === 'team' && n === 4 ? 'team' : 'ffa', T: M.xs.map(x => ({ x, hp: HP, used: { t: 0, s: 0, b: 0 }, out: false, ko: -1, shots: 0 })), turn: (seed >>> 0) % n, k: 0, a: 0, seed: seed | 0, last: null, over: false, maxT: maxT(n) };
    const list = moves ? String(moves).split(',').filter(Boolean) : [];
    const outs = Object.entries(out || {}).map(([k, v]) => [+String(k).replace(/\D/g, ''), +v]).filter(([i, v]) => i >= 0 && i < n && isFinite(v)).sort((a, b) => a[1] - b[1]);
    const applyOut = upto => {
      let ch = false; const before = S.T.map((_, i) => alive(S, i));
      for (const [i, at] of outs) if (at <= upto && !S.T[i].out) { S.T[i].out = true; if (S.T[i].ko < 0) S.T[i].ko = S.k; ch = true; }
      if (ch) { if (!alive(S, S.turn)) S.turn = nextAlive(S, S.turn); check(S, before, true); }
    };
    for (let idx = 0; idx < list.length; idx++) {
      applyOut(idx); if (S.over) break;
      const m = parse(list[idx]); S.k = idx + 1;
      if (m.i !== S.turn || !alive(S, m.i)) { m.skip = true; S.last = m; continue; }   // 不是他（已經輪過了、離開了）就不算
      const me = S.T[m.i], before = S.T.map((_, i) => alive(S, i));
      if (isFinite(m.x)) me.x = Math.max(20, Math.min(W - 20, m.x));
      if (!m.pass) {
        if (m.w !== 'n') me.used[m.w]++;
        me.shots++;
        for (const e of m.imp) { crater(S.g, e.x, e.y, WEAP[m.w].cr); for (let j = 0; j < n; j++) if (!S.T[j].out && S.T[j].hp > 0) S.T[j].hp -= e.d[j] || 0; }
      }
      for (let j = 0; j < n; j++) if (S.T[j].hp <= 0 && S.T[j].ko < 0) { S.T[j].hp = 0; S.T[j].ko = S.k; }
      S.a++; S.last = m; S.turn = nextAlive(S, m.i);
      check(S, before);
    }
    if (!S.over) applyOut(Infinity);
    S.k = list.length;
    S.wind = wind(S.seed, S.a);
    return S;
  }
  /* 結束了沒：只剩一隊（或一個人）、全部倒下、回合用完 */
  function check(S, before, byOut) {
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
  const left = (S, i, w) => w === 'n' ? Infinity : WEAP[w].lim - S.T[i].used[w];
  function shells(g, x, a, p, w) {
    const W0 = WEAP[w], [cx, cy] = center(g, x), out = [];
    for (let k = 0; k < W0.n; k++) {
      const ang = (a + (W0.n > 1 ? (k - 1) * W0.spread : 0)) * Math.PI / 180, v = p * VK;
      out.push({ k, x: cx + 26 * Math.cos(ang), y: cy - 26 * Math.sin(ang), vx: v * Math.cos(ang), vy: -v * Math.sin(ang), live: true, away: false, t: 0, bn: W0.bn || 0, bounced: 0 });
    }
    return out;
  }
  /* 往前算一小步：T＝[{x, on}]（on＝還活著、擋得到砲彈）；碰到東西回傳 {x,y,hit:玩家或 -1}，飛出去回傳 'out' */
  function stepShell(s, g, wd, T, me) {
    const dt = 1 / SUB;
    s.vx += wd * WK * dt; s.vy += GRAV * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.t++;
    if (s.x < -80 || s.x > W + 80 || s.y > H + 40) return 'out';
    for (let i = 0; i < T.length; i++) {
      if (!T[i].on) continue;
      const [cx, cy] = center(g, T[i].x), d = Math.hypot(s.x - cx, s.y - cy);
      if (i === me && !s.away) { if (d > 34) s.away = true; continue; }
      if (d < 24) return { x: s.x, y: s.y, hit: i };
    }
    if (s.x >= 0 && s.x < W && s.y >= g[Math.floor(s.x)]) {
      if (s.bn > 0 && s.vy > 0) { s.bn--; s.bounced++; s.y = g[Math.floor(s.x)] - 1; s.vy = -Math.abs(s.vy) * .62; s.vx *= .8; s.away = true; return null; }
      return { x: s.x, y: Math.min(s.y, FLOOR), hit: -1 };
    }
    return null;
  }
  const tanksOf = (S, i, x) => S.T.map((t, j) => ({ x: j === i ? x : t.x, on: alive(S, j) }));
  /* 發射：算好結果，做成一步棋 */
  function fire(S, x, a, p, w) {
    const me = S.turn, g = Float64Array.from(S.g), T = tanksOf(S, me, x);
    a = Math.round(Math.max(0, Math.min(180, a))); p = Math.round(Math.max(10, Math.min(100, p)));
    if (!WEAP[w] || left(S, me, w) <= 0) w = 'n';
    const sh = shells(g, x, a, p, w), imp = [];
    for (let it = 0; it < SUB * 900 && sh.some(s => s.live); it++) {
      for (const s of sh) {
        if (!s.live) continue;
        const r = stepShell(s, g, S.wind, T, me);
        if (r === 'out') { s.live = false; continue; }
        if (r) {
          s.live = false; const ex = Math.round(r.x), ey = Math.round(r.y), W0 = WEAP[w];
          const d = T.map((t, j) => t.on ? dmgAt(g, t.x, ex, ey, W0) : 0);
          if (r.hit >= 0) d[r.hit] = Math.max(d[r.hit], W0.D);
          crater(g, ex, ey, W0.cr); imp.push({ k: s.k, x: ex, y: ey, hit: r.hit >= 0 ? r.hit + 1 : 0, d });
        }
      }
    }
    const tok = [me, Math.round(x), a, p, w, imp.map(e => [e.k, e.x, e.y, e.hit, e.d.join('.')].join('_')).join('|')].join(':');
    return { tok, imp };
  }
  const pass = (i, x) => (i | 0) + ':' + Math.round(x) + ':-';
  function preview(S, i, x, a, p, ticks = 22) {
    const g = S.g, T = tanksOf(S, i, x);
    const s = shells(g, x, a, p, 'n')[0], pts = [];
    for (let k = 0; k < ticks * SUB; k++) { const r = stepShell(s, g, S.wind, T, i); if (r) break; if (k % SUB === 0) pts.push([s.x, s.y]); }
    return pts;
  }
  /* 可以開到哪裡：不能爬太陡、不能撞到別台（倒下的也算障礙；離開的坦克已經不見了） */
  function canDrive(S, i, from, to) {
    if (to < 24 || to > W - 24) return false;
    for (let j = 0; j < S.n; j++) if (j !== i && !S.T[j].out && Math.abs(to - S.T[j].x) < 70) return false;
    return gAt(S.g, from) - gAt(S.g, to) < 6;
  }
  root.PM = { W, H, HP, FUEL, FLOOR, PER, GRAV, WK, VK, SUB, WEAP, WK_, rng, wind, genMap, newGame, decode, replay, parse, fire, pass, preview, shells, stepShell, crater, center, gAt, left, canDrive, alive, nextAlive, teamOf, result, places, maxT, tanksOf };
})(typeof window !== 'undefined' ? window : globalThis);
