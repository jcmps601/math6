/* 暗棋規則（臺灣常見玩法）
   棋盤 4 列 × 8 行，32 顆棋全部蓋著、打亂。位置＝列 × 8 ＋ 行（0～31）。棋子：紅方大寫、黑方小寫。
   K 帥將 7 > A 仕士 6 > B 相象 5 > R 俥車 4 > N 傌馬 3 > C 炮包 2 > P 兵卒 1
   輪到的人可以：翻開一顆蓋著的棋，或走自己翻開的棋（上下左右一格）。
   ・先下的人第一顆翻到什麼顏色，他就是那一方；另一個人是另一方。
   ・吃子：大吃小、一樣大可以互吃；兵卒可以吃帥將，帥將不能吃兵卒。蓋著的棋不能吃。
   ・炮包：走路一樣一格，但要吃子一定要「隔一顆棋」跳過去吃（隔的那顆翻開、蓋著都可以，距離不限），
     炮包可以吃任何棋，但不能直接吃旁邊的棋。
   ・對方的棋全部被吃光、或輪到他卻沒有棋可以走 → 他輸。
   ・連續 40 步（兩人加起來）都沒有翻棋也沒有吃子 → 和局。
   一步棋存成：翻棋 'f' ＋ 兩位數位置（例如 f07）；走棋 ＝ 起點兩位數 ＋ 終點兩位數（例如 0809）。 */
(function (root) {
  const W = 8, H = 4, N = 32, IDLE = 40;
  const RANK = { K: 7, A: 6, B: 5, R: 4, N: 3, C: 2, P: 1 };
  const SET = 'KAABBRRNNCCPPPPP';
  const color = p => p === p.toUpperCase() ? 'r' : 'b';
  const other = s => s === 'r' ? 'b' : 'r';
  const up = p => p.toUpperCase();
  function deal(rnd = Math.random) {
    const a = (SET + SET.toLowerCase()).split('');
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.join('');
  }
  const nb = i => { const r = (i / W) | 0, c = i % W, o = []; if (r > 0) o.push(i - W); if (r < H - 1) o.push(i + W); if (c > 0) o.push(i - 1); if (c < W - 1) o.push(i + 1); return o; };
  function canEat(a, t) {
    const ra = RANK[up(a)], rt = RANK[up(t)];
    if (ra === 1 && rt === 7) return true;
    if (ra === 7 && rt === 1) return false;
    return ra >= rt;
  }
  /* 炮包隔一顆跳吃：沿四個方向，跳過第一顆棋後遇到的第一顆棋 */
  function jumps(B, i) {
    const out = [], r = (i / W) | 0, c = i % W;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let rr = r + dr, cc = c + dc, screen = false;
      while (rr >= 0 && rr < H && cc >= 0 && cc < W) {
        const j = rr * W + cc;
        if (B[j]) { if (!screen) screen = true; else { out.push(j); break; } }
        rr += dr; cc += dc;
      }
    }
    return out;
  }
  /* side＝哪一位玩家（'r'＝先下的人、'b'＝後下的人）；col[side]＝他是紅方還是黑方（還沒翻過就是 null） */
  function legal(S, side) {
    const mine = S.col[side], L = [];
    for (let i = 0; i < N; i++) { const x = S.b[i]; if (x && !x.up) L.push(['f', i]); }
    if (!mine) return L;
    for (let i = 0; i < N; i++) {
      const x = S.b[i]; if (!x || !x.up || color(x.p) !== mine) continue;
      const cannon = up(x.p) === 'C';
      for (const j of nb(i)) {
        const y = S.b[j];
        if (!y) L.push(['m', i, j]);
        else if (!cannon && y.up && color(y.p) !== mine && canEat(x.p, y.p)) L.push(['m', i, j]);
      }
      if (cannon) for (const j of jumps(S.b, i)) { const y = S.b[j]; if (y.up && color(y.p) !== mine) L.push(['m', i, j]); }
    }
    return L;
  }
  const p2 = n => String(n).padStart(2, '0');
  const enc = m => m[0] === 'f' ? 'f' + p2(m[1]) : p2(m[1]) + p2(m[2]);
  const dec = x => x[0] === 'f' ? ['f', +x.slice(1, 3)] : ['m', +x.slice(0, 2), +x.slice(2, 4)];
  const same = (a, b) => a[0] === b[0] && a[1] === b[1] && (a[0] === 'f' || a[2] === b[2]);
  /* 從一開始照著棋譜走一遍，算出現在的盤面、輪到誰、誰贏 */
  function replay(deck, moves) {
    const S = { b: String(deck || '').split('').map(p => ({ p, up: false })), turn: 'r', col: { r: null, b: null }, last: null, idle: 0, caps: { r: [], b: [] }, n: 0 };
    const list = moves ? String(moves).split(',').filter(Boolean) : [];
    for (const x of list) {
      const m = dec(x);
      if (!legal(S, S.turn).some(l => same(l, m))) { S.bad = true; break; }
      if (m[0] === 'f') {
        const t = S.b[m[1]]; t.up = true;
        if (!S.col[S.turn]) { S.col[S.turn] = color(t.p); S.col[other(S.turn)] = other(color(t.p)); }
        S.idle = 0;
      } else {
        const t = S.b[m[2]];
        if (t) { S.caps[S.turn].push(t.p); S.idle = 0; } else S.idle++;
        S.b[m[2]] = S.b[m[1]]; S.b[m[1]] = null;
      }
      S.last = m; S.turn = other(S.turn); S.n++;
    }
    S.legal = legal(S, S.turn);
    if (S.col.r) {
      const left = s => S.b.filter(x => x && color(x.p) === S.col[s]).length;
      if (left(S.turn) === 0) { S.over = true; S.winner = other(S.turn); S.reason = '吃光對方的棋'; }
      else if (!S.legal.length) { S.over = true; S.winner = other(S.turn); S.reason = '對方沒有棋可以走'; }
    }
    if (!S.over && S.idle >= IDLE) { S.over = true; S.draw = true; S.reason = `連續 ${IDLE} 步沒有翻棋也沒有吃子`; }
    return S;
  }
  root.AQ = { W, H, N, IDLE, RANK, deal, legal, replay, enc, dec, same, color, other, canEat, jumps };
})(typeof window !== 'undefined' ? window : globalThis);
