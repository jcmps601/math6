/* ═════════════ 601 方塊對戰：規則（不管畫面、不管連線） ═════════════
   ・場地 10 格寬、22 格高（最上面 2 格看不到，方塊從那裡出來）
   ・7 種方塊，每 7 個一袋洗牌（同一局大家拿到一樣的順序，比較公平）；旋轉用常見的「踢牆」規則，靠牆也轉得動
   ・消掉一排以上就攻擊對手：消 2 排送 1 排、3 排送 2 排、4 排送 4 排；連續消（連擊）再多送；整個場地清空再 +4
   ・被攻擊的排數先排隊：下一個方塊落地時如果有消排，先抵銷；沒消排就從底下冒出灰色垃圾方塊（同一次攻擊的洞在同一行）
   ・新方塊一出來就卡住（或整個方塊落在看不到的地方）＝出局 */
(function () {
  const W = 10, H = 22, HIDE = 2;
  /* 方塊：顏色編號 1～7（0 空、8 垃圾）、出生時的形狀（3×3 或 4×4 的格子座標） */
  const KINDS = {
    I: { c: 5, n: 4, s: [[0, 1], [1, 1], [2, 1], [3, 1]] },
    O: { c: 3, n: 4, s: [[1, 0], [2, 0], [1, 1], [2, 1]] },
    T: { c: 7, n: 3, s: [[1, 0], [0, 1], [1, 1], [2, 1]] },
    S: { c: 4, n: 3, s: [[1, 0], [2, 0], [0, 1], [1, 1]] },
    Z: { c: 1, n: 3, s: [[0, 0], [1, 0], [1, 1], [2, 1]] },
    J: { c: 6, n: 3, s: [[0, 0], [0, 1], [1, 1], [2, 1]] },
    L: { c: 2, n: 3, s: [[2, 0], [0, 1], [1, 1], [2, 1]] },
  };
  const ORDER = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  /* 四個方向：順時針轉 (x,y) → (n-1-y, x) */
  const ROT = {};
  ORDER.forEach(k => {
    const K = KINDS[k], r = [K.s];
    for (let i = 1; i < 4; i++) r.push(k === 'O' ? K.s : r[i - 1].map(([x, y]) => [K.n - 1 - y, x]));
    ROT[k] = r;
  });
  /* 踢牆表（座標 y 朝上寫的，用的時候 y 要反過來） */
  const KJ = { '01': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], '10': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], '12': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], '21': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '23': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], '32': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '30': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '03': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]] };
  const KI = { '01': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], '10': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], '12': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]], '21': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '23': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], '32': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], '30': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]], '03': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]] };
  const LINES = [0, 0, 1, 2, 4], COMBO = [0, 0, 1, 1, 2, 2, 3, 3, 4], PERFECT = 4, MAX_RISE = 8;

  /* 亂數：同一個種子算出一樣的結果 */
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function newPlayer(seed, holeSeed) {
    const P = { b: Array.from({ length: H }, () => Array(W).fill(0)), bagR: rng(seed), holeR: rng(holeSeed == null ? seed ^ 0x9e3779b9 : holeSeed), bag: [], q: [], cur: null, hold: null, held: false,
      combo: -1, inq: [], sent: 0, lines: 0, pieces: 0, dead: false, ev: [] };
    for (let i = 0; i < 5; i++) P.q.push(nextBag(P));
    spawn(P);
    return P;
  }
  function nextBag(P) { if (!P.bag.length) { const b = ORDER.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(P.bagR() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } P.bag = b; } return P.bag.shift(); }
  const cells = (k, r, x, y) => ROT[k][r].map(([a, b]) => [x + a, y + b]);
  function fits(P, k, r, x, y) { return cells(k, r, x, y).every(([a, b]) => a >= 0 && a < W && b >= 0 && b < H && !P.b[b][a]); }
  function spawn(P, kind) {
    const k = kind || P.q.shift(); if (!kind) P.q.push(nextBag(P));
    const p = { k, r: 0, x: k === 'I' || k === 'O' ? 3 : 3, y: 0 };
    P.cur = p; P.held = kind ? P.held : false;
    if (!fits(P, p.k, p.r, p.x, p.y)) { P.dead = true; P.ev.push({ t: 'dead' }); return false; }
    /* 出生後先往下掉一格（像大部分方塊遊戲，從看得到的地方開始） */
    if (fits(P, p.k, p.r, p.x, p.y + 1)) p.y++;
    return true;
  }
  function move(P, dx) { const p = P.cur; if (!p || P.dead) return false; if (fits(P, p.k, p.r, p.x + dx, p.y)) { p.x += dx; return true; } return false; }
  function rotate(P, dir) {   // dir 1 順時針、-1 逆時針
    const p = P.cur; if (!p || P.dead || p.k === 'O') return false;
    const to = (p.r + (dir > 0 ? 1 : 3)) % 4, T = (p.k === 'I' ? KI : KJ)['' + p.r + to];
    for (const [dx, dy] of T) if (fits(P, p.k, to, p.x + dx, p.y - dy)) { p.x += dx; p.y -= dy; p.r = to; return true; }
    return false;
  }
  function down(P) { const p = P.cur; if (!p || P.dead) return false; if (fits(P, p.k, p.r, p.x, p.y + 1)) { p.y++; return true; } return false; }
  function ghostY(P) { const p = P.cur; if (!p) return 0; let y = p.y; while (fits(P, p.k, p.r, p.x, y + 1)) y++; return y; }
  function hardDrop(P) { const p = P.cur; if (!p || P.dead) return 0; const y = ghostY(P), d = y - p.y; p.y = y; lock(P); return d; }
  function hold(P) {
    if (P.dead || P.held || !P.cur) return false;
    const k = P.cur.k; if (P.hold) { const h = P.hold; P.hold = k; spawn(P, h); } else { P.hold = k; spawn(P); }
    P.held = true; return true;
  }
  /* 落地：放進場地 → 消排 → 算攻擊（先抵銷排隊中的垃圾）→ 沒消排就冒垃圾 → 下一個方塊 */
  function lock(P) {
    const p = P.cur; if (!p) return;
    const cs = cells(p.k, p.r, p.x, p.y), col = KINDS[p.k].c;
    cs.forEach(([x, y]) => { P.b[y][x] = col; });
    P.cur = null; P.pieces++;
    if (cs.every(([, y]) => y < HIDE)) { P.dead = true; P.ev.push({ t: 'dead' }); return; }   // 整個方塊都在看不到的地方
    const full = []; for (let y = 0; y < H; y++) if (P.b[y].every(v => v)) full.push(y);
    let atk = 0;
    if (full.length) {
      full.forEach(y => { P.b.splice(y, 1); P.b.unshift(Array(W).fill(0)); });
      P.combo++; P.lines += full.length;
      atk = LINES[full.length] + COMBO[Math.min(P.combo, COMBO.length - 1)];
      const pc = P.b.every(r => r.every(v => !v)); if (pc) atk += PERFECT;
      P.ev.push({ t: 'clear', n: full.length, rows: full, combo: P.combo, pc });
      /* 先抵銷排隊中的垃圾 */
      while (atk > 0 && P.inq.length) { const g = P.inq[0], m = Math.min(atk, g.n); g.n -= m; atk -= m; if (!g.n) P.inq.shift(); P.ev.push({ t: 'cancel', n: m }); }
      if (atk > 0) { P.sent += atk; P.ev.push({ t: 'atk', n: atk }); }
    } else {
      P.combo = -1;
      riseAll(P);
    }
    if (!P.dead) spawn(P);
  }
  /* 排隊的垃圾冒上來（一次最多 8 排，剩下的等下一個方塊） */
  function riseAll(P) {
    let left = MAX_RISE;
    while (left > 0 && P.inq.length && !P.dead) {
      const g = P.inq[0], m = Math.min(left, g.n);
      rise(P, m, g.h); g.n -= m; left -= m; if (!g.n) P.inq.shift();
    }
  }
  function rise(P, n, hole) {
    const h = hole == null ? Math.floor(P.holeR() * W) : hole;
    for (let i = 0; i < n; i++) {
      if (P.b[0].some(v => v)) { P.dead = true; P.ev.push({ t: 'dead' }); return; }   // 頂到最上面
      P.b.shift(); const row = Array(W).fill(8); row[h] = 0; P.b.push(row);
    }
    if (P.cur) { const p = P.cur; while (!fits(P, p.k, p.r, p.x, p.y) && p.y > 0) p.y--; if (!fits(P, p.k, p.r, p.x, p.y)) { P.dead = true; P.ev.push({ t: 'dead' }); } }
    P.ev.push({ t: 'rise', n });
  }
  /* 收到攻擊：先排隊，洞的位置現在就決定（同一次攻擊同一行） */
  function receive(P, n) { if (P.dead || n <= 0) return; P.inq.push({ n, h: Math.floor(P.holeR() * W) }); P.ev.push({ t: 'hit', n }); }
  const pending = P => P.inq.reduce((a, g) => a + g.n, 0);
  /* 場地寫成字串（給同學的小畫面看）：看得到的 20 排 × 10 格，一格一個字 0～8 */
  function pack(P) { let s = ''; for (let y = HIDE; y < H; y++) s += P.b[y].join(''); if (P.cur) { const c = KINDS[P.cur.k].c, a = s.split(''); cells(P.cur.k, P.cur.r, P.cur.x, P.cur.y).forEach(([x, y]) => { if (y >= HIDE) a[(y - HIDE) * W + x] = c; }); s = a.join(''); } return s; }
  /* 下落速度：每 30 秒變快一級 */
  const gravityMs = sec => Math.max(90, Math.round(900 * Math.pow(0.82, Math.floor(sec / 30))));
  window.BK = { W, H, HIDE, KINDS, ORDER, ROT, cells, fits, newPlayer, move, rotate, down, ghostY, hardDrop, hold, lock, receive, rise, pending, pack, gravityMs, rng, LINES, COMBO, PERFECT, VER: 'bk-v1' };
})();
