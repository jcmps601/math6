/* ═════════════ 601 方塊對戰：規則（不管畫面、不管連線） ═════════════
   ・場地 10 格寬、22 格高（最上面 2 格看不到，方塊從那裡出來）
   ・7 種方塊，每 7 個一袋洗牌（同一局大家拿到一樣的順序，比較公平）；旋轉用常見的「踢牆」規則，靠牆也轉得動
   ・攻擊（跟 FB《Tetris Battle》一樣）：消 1/2/3/4 排送 0/1/2/4 排；T 轉消 1/2/3 排送 2/4/6（T 轉迷你 1）；
     連續兩次大招（4 排或 T 轉）多送一半（B2B）；連擊（連續每塊都有消）再多送 1,1,2,2,3,3,4…；整個場地清空送 10 排
   ・被攻擊的排數先排隊：下一個方塊落地時如果有消排，先抵銷；沒消排就從底下冒出灰色垃圾排
   ・垃圾排上沒有洞，而是一顆「炸彈」（每 2 排換一個位置）：方塊落在炸彈正上方，炸彈就爆炸、把那一整排炸掉（算消排，也能攻擊）
     爆完方塊掉下去，又壓到下一顆炸彈，就連環爆
   ・被頂到最上面＝被 KO：場地清空、排隊的垃圾也清掉，馬上繼續玩（KO 算給最後一個打我的人） */
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
  const LINES = [0, 0, 1, 2, 4], TSPIN = [0, 2, 4, 6], TMINI = 1, COMBO = [0, 1, 1, 2, 2, 3, 3, 4], PERFECT = 10, MAX_RISE = 8, BOMB = 9, JUNK = 8;

  /* 亂數：同一個種子算出一樣的結果 */
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function newPlayer(seed, holeSeed) {
    const P = { b: Array.from({ length: H }, () => Array(W).fill(0)), bagR: rng(seed), holeR: rng(holeSeed == null ? seed ^ 0x9e3779b9 : holeSeed), bag: [], q: [], cur: null, hold: null, held: false,
      combo: -1, b2b: false, inq: [], sent: 0, lines: 0, pieces: 0, dead: false, ko: 0, from: '', ev: [] };
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
    if (!fits(P, p.k, p.r, p.x, p.y)) { koMe(P); return true; }
    /* 出生後先往下掉一格（像大部分方塊遊戲，從看得到的地方開始） */
    if (fits(P, p.k, p.r, p.x, p.y + 1)) p.y++;
    return true;
  }
  /* 被 KO：記一次，場地、排隊的垃圾都清掉，重新出方塊（這一個方塊重來） */
  function koMe(P) {
    P.ko++; P.ev.push({ t: 'ko', by: P.from || '' }); P.from = '';
    P.b = Array.from({ length: H }, () => Array(W).fill(0)); P.inq = []; P.combo = -1; P.b2b = false;
    const k = P.cur ? P.cur.k : P.q.shift(); if (!P.cur) P.q.push(nextBag(P));
    P.cur = { k, r: 0, x: 3, y: 1 }; P.held = false;
  }
  function move(P, dx) { const p = P.cur; if (!p || P.dead) return false; if (fits(P, p.k, p.r, p.x + dx, p.y)) { p.x += dx; p.lr = 0; return true; } return false; }
  function rotate(P, dir) {   // dir 1 順時針、-1 逆時針
    const p = P.cur; if (!p || P.dead || p.k === 'O') return false;
    const to = (p.r + (dir > 0 ? 1 : 3)) % 4, T = (p.k === 'I' ? KI : KJ)['' + p.r + to];
    for (let i = 0; i < T.length; i++) { const [dx, dy] = T[i]; if (fits(P, p.k, to, p.x + dx, p.y - dy)) { p.x += dx; p.y -= dy; p.r = to; p.lr = 1; p.kick = i; return true; } }
    return false;
  }
  function down(P) { const p = P.cur; if (!p || P.dead) return false; if (fits(P, p.k, p.r, p.x, p.y + 1)) { p.y++; p.lr = 0; return true; } return false; }
  function ghostY(P) { const p = P.cur; if (!p) return 0; let y = p.y; while (fits(P, p.k, p.r, p.x, y + 1)) y++; return y; }
  function hardDrop(P) { const p = P.cur; if (!p || P.dead) return 0; const y = ghostY(P), d = y - p.y; p.y = y; if (d) p.lr = 0; lock(P); return d; }
  function hold(P) {
    if (P.dead || P.held || !P.cur) return false;
    const k = P.cur.k; if (P.hold) { const h = P.hold; P.hold = k; spawn(P, h); } else { P.hold = k; spawn(P); }
    P.held = true; return true;
  }
  /* T 轉：T 方塊最後一個動作是旋轉，而且中心的 4 個角有 3 個以上被擋住；正面兩個角都擋住（或用了最遠的踢牆）＝T 轉，否則＝T 轉迷你 */
  function tspin(P, p) {
    if (p.k !== 'T' || !p.lr) return 0;
    const cx = p.x + 1, cy = p.y + 1, blk = (x, y) => x < 0 || x >= W || y >= H || (y >= 0 && !!P.b[y][x]);
    const C = [[cx - 1, cy - 1], [cx + 1, cy - 1], [cx + 1, cy + 1], [cx - 1, cy + 1]].map(([x, y]) => blk(x, y));   // 左上 右上 右下 左下
    if (C.filter(Boolean).length < 3) return 0;
    const front = [[0, 1], [1, 2], [2, 3], [3, 0]][p.r];   // 朝上、右、下、左時，正面的兩個角
    return C[front[0]] && C[front[1]] || p.kick === 4 ? 2 : 1;
  }
  /* 落地：放進場地 → 消排（滿的排＋被壓到的炸彈排，會連環爆）→ 算攻擊（先抵銷排隊中的垃圾）→ 沒消排就冒垃圾 → 下一個方塊 */
  function lock(P) {
    const p = P.cur; if (!p) return;
    const ts = tspin(P, p);
    const cs = cells(p.k, p.r, p.x, p.y), col = KINDS[p.k].c;
    cs.forEach(([x, y]) => { P.b[y][x] = col; });
    P.cur = null; P.pieces++;
    if (cs.every(([, y]) => y < HIDE)) { koMe(P); return; }   // 整個方塊都在看不到的地方
    /* 方塊的格子做記號，炸彈有沒有被壓到才知道（爆完方塊會跟著往下掉） */
    let mk = Array.from({ length: H }, () => Array(W).fill(0)); cs.forEach(([x, y]) => { mk[y][x] = 1; });
    let nFull = 0, nBomb = 0; const rows = [];
    for (let guard = 0; guard < H; guard++) {
      const kill = [];
      for (let y = 0; y < H; y++) {
        if (P.b[y].every(v => v && v !== BOMB)) { kill.push(y); nFull++; continue; }
        const bx = P.b[y].indexOf(BOMB); if (bx >= 0 && y > 0 && mk[y - 1][bx]) { kill.push(y); nBomb++; }
      }
      if (!kill.length) break;
      if (!guard) rows.push(...kill);
      kill.sort((a, b) => a - b).forEach(y => { P.b.splice(y, 1); P.b.unshift(Array(W).fill(0)); mk.splice(y, 1); mk.unshift(Array(W).fill(0)); });
      if (nBomb) P.ev.push({ t: 'bomb', n: kill.length });
    }
    const n = nFull + nBomb;
    let atk = 0;
    if (n || ts) {
      if (n) { P.combo++; P.lines += n; } else P.combo = -1;
      const big = n >= 4 || (ts && n > 0);
      atk = ts === 2 ? TSPIN[Math.min(3, n)] : ts === 1 ? (n ? Math.max(TMINI, LINES[Math.min(4, n)]) : 0) : LINES[Math.min(4, n)] + (n > 4 ? n - 4 : 0);
      const b2b = big && P.b2b; if (b2b) atk = Math.floor(atk * 1.5);
      if (n) P.b2b = big;   // 消排了：這次是大招就接得上下一次，普通消排就斷掉
      if (n) atk += COMBO[Math.min(Math.max(P.combo, 0), COMBO.length - 1)] + (P.combo >= COMBO.length ? 4 - COMBO[COMBO.length - 1] : 0);
      const pc = n > 0 && P.b.every(r => r.every(v => !v)); if (pc) atk = PERFECT;
      P.ev.push({ t: 'clear', n, rows, combo: P.combo, pc, ts, b2b, bomb: nBomb });
      if (n) {
        while (atk > 0 && P.inq.length) { const g = P.inq[0], m = Math.min(atk, g.n); g.n -= m; atk -= m; if (!g.n) P.inq.shift(); P.ev.push({ t: 'cancel', n: m }); }
        if (atk > 0) { P.sent += atk; P.ev.push({ t: 'atk', n: atk }); }
      } else riseAll(P);
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
    let h = hole == null ? Math.floor(P.holeR() * W) : hole;
    for (let i = 0; i < n; i++) {
      if (P.b[0].some(v => v)) { koMe(P); P.ev.push({ t: 'rise', n }); return; }   // 頂到最上面＝KO
      if (i && i % 2 === 0) h = (h + 1 + Math.floor(P.holeR() * (W - 1))) % W;   // 每 2 排換一個炸彈位置
      P.b.shift(); const row = Array(W).fill(JUNK); row[h] = BOMB; P.b.push(row);
    }
    if (P.cur) { const p = P.cur; while (!fits(P, p.k, p.r, p.x, p.y) && p.y > 0) p.y--; if (!fits(P, p.k, p.r, p.x, p.y)) koMe(P); }
    P.ev.push({ t: 'rise', n });
  }
  /* 收到攻擊：先排隊，洞的位置現在就決定（同一次攻擊同一行） */
  function receive(P, n, from) { if (P.dead || n <= 0) return; P.inq.push({ n, h: Math.floor(P.holeR() * W) }); if (from) P.from = from; P.ev.push({ t: 'hit', n }); }
  const pending = P => P.inq.reduce((a, g) => a + g.n, 0);
  /* 場地寫成字串（給同學的小畫面看）：看得到的 20 排 × 10 格，一格一個字 0～9（8 垃圾、9 炸彈） */
  function pack(P) { let s = ''; for (let y = HIDE; y < H; y++) s += P.b[y].join(''); if (P.cur) { const c = KINDS[P.cur.k].c, a = s.split(''); cells(P.cur.k, P.cur.r, P.cur.x, P.cur.y).forEach(([x, y]) => { if (y >= HIDE) a[(y - HIDE) * W + x] = c; }); s = a.join(''); } return s; }
  /* 場地堆多高（時間到同分時，比誰比較低） */
  const height = P => { const t = P.b.findIndex(r => r.some(v => v)); return t < 0 ? 0 : H - t; };
  /* 下落速度：每 30 秒變快一級 */
  const gravityMs = sec => Math.max(90, Math.round(900 * Math.pow(0.82, Math.floor(sec / 30))));
  window.BK = { W, H, HIDE, KINDS, ORDER, ROT, cells, fits, newPlayer, move, rotate, down, ghostY, hardDrop, hold, lock, receive, rise, pending, pack, height, gravityMs, rng, LINES, COMBO, PERFECT, TSPIN, BOMB, JUNK, VER: 'bk-v2' };
})();
