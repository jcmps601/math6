/* 大砲遊戲共用的規則引擎（大砲對轟 2 人、大砲混戰 2～4 人都用這一份，規則一定一樣）
   ────────────────────────────────────────────────────────────────
   ・發射的那台平板負責算結果（炸在哪、每台坦克扣多少血），寫成「一步棋」存進雲端，其他平板照著重播。
     所以這裡的東西都要是確定的：要亂數一律用 rng(seed)，不能用 Math.random()（只有開新局產生地圖時可以）。
   ・地圖字串
       v3|場地|先手|每人發數|x0,x1,…|地面高度（每 4 px 一個，36 進位 2 碼）     ← 現在用的（1600 × 700，6 種砲彈）
       v2|…（同上）                  ← 2026-11-06 開的房間：8 種砲彈（還有鑽地彈、築牆彈），照當時規則重播
       m1|x0,x1,…|地面高度          ← 舊的大砲混戰（1600 × 700，草原，先手＝seed % 人數，每人 8 發）
       v1|紅x|藍x|地面高度          ← 舊的大砲對轟（1200 × 600，草原，紅先，每人 15 發）
     浮島的空隙高度記成 900（VOID）。舊地圖照舊的規則重播（沒有掉落傷害、補給箱、滑動），已經在下的房間不會壞。
   ・一步棋
       v3／v2／m1：「玩家:坦克位置:角度:力道:砲彈:爆炸1|爆炸2…」；時間到沒發射＝「玩家:坦克位置:-」
               爆炸＝「第幾顆_x_y_直擊(玩家+1，0 沒有)_扣血0.扣血1.…」
               築牆彈的「爆炸」＝土丘的位置（扣血全 0）；傳送彈的「爆炸」＝傳送後坦克的新位置 x
       v1：「坦克位置:角度:力道:砲彈:第幾顆_x_y_紅扣血_藍扣血_直擊|…」（玩家＝輪到的人）
   ・重播時才算、不寫進棋譜的（兩台一定算得一樣）：掉落傷害、掉進浮島空隙、雪地滑動、岩漿燙傷、補給箱出現和撿到
   ・state.out＝{i玩家: 第幾步的時候離開}，重播到那一步就讓他出局
   ・一起打王（mode 'boss'，2026-11）：地圖「b3|場地|0|輪數|玩家x…,魔王x|地面高度|魔王代號」，最後一台是魔王（S.bi）。
     玩家輪流打一發、再換魔王打一發，算一輪；輪數用完還沒打倒＝輸。隊友不會互相傷害，補血彈打到隊友是補血（扣血記成負的）。
     魔王怎麼打由 bossMove(S) 決定（亂數用 rng(seed)，誰的平板算都一樣），算好寫成一步棋，跟玩家一樣存進棋譜。
     地圖「b4」（2026-11-21 起）：右邊一整塊平台（x ≥ 1020，炸不壞），魔王每一回合先走到新的位置再攻擊（普通走 60～150、困難走 120～260、地獄走 150～300），
     玩家不能一直用同一個角度、力道；舊的「b3」房間照當時規則（魔王站著不動）。 */
(function (root) {
  const VER = 8;                              // 房間版本：不一樣的平板不能一起玩（算出來會不一樣）。3＝拿掉鑽地彈、築牆彈；4＝加了一起打王；5＝魔王會移動；6＝地獄魔王（隕石）；7＝魔王的頭也打得到、頭是弱點；8＝魔王的新技能（b5 地圖）、可以 1 個人打
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
    s: { name: '超級彈', D: 48, R: 85, cr: 60, n: 1, lim: 1 },
    /* 一起打王：補血彈（玩家用，打到隊友補血、打到魔王一點點傷害）；下面幾種是魔王的招式（玩家不能用） */
    h: { name: '補血彈', D: 6, R: 80, cr: 0, n: 1, lim: 3, heal: 26 },
    R: { name: '岩石彈', D: 24, R: 62, cr: 40, n: 1, lim: 0 },
    Q: { name: '岩石三連', D: 17, R: 52, cr: 32, n: 3, lim: 0, spread: 6 },
    Z: { name: '雷電球', D: 28, R: 56, cr: 34, n: 1, lim: 0 },
    X: { name: '雷電三連', D: 21, R: 52, cr: 30, n: 3, lim: 0, spread: 5 },
    Y: { name: '砲彈雨', D: 16, R: 50, cr: 28, n: 1, lim: 0, rain: 1 },
    G: { name: '護盾', D: 0, R: 0, cr: 0, n: 0, lim: 0, guard: 1 },
    /* 地獄魔王（暗焰魔龍王）：M＝瞄準打一發，同時在一台坦克腳下畫紅圈；下一次輪到魔王，F 隕石就砸在紅圈（玩家要開車躲開） */
    P: { name: '暗焰球', D: 30, R: 58, cr: 36, n: 1, lim: 0 },
    K: { name: '暗焰三連', D: 22, R: 52, cr: 32, n: 3, lim: 0, spread: 5 },
    M: { name: '暗焰鎖定', D: 30, R: 58, cr: 36, n: 1, lim: 0, mark: 1 },
    F: { name: '暗焰隕石', D: 46, R: 85, cr: 50, n: 1, lim: 0, meteor: 1 },
    /* 2026-11-23 魔王新技能（只有 b5 地圖用）。warn＝打一發的同時預告「下一回合要放大招」，大招寫在 S.pend，下一次輪到魔王就放 */
    e: { name: '岩石彈', D: 24, R: 62, cr: 40, n: 1, lim: 0, warn: 'E' },          // 岩甲巨獸：打一發＋蓄力（下一回合地震）
    E: { name: '地震重踏', D: 0, R: 0, cr: 0, n: 0, lim: 0, quake: 1 },             // 全場在地上的坦克都受傷，離魔王越近越痛
    W: { name: '岩牆', D: 0, R: 0, cr: 0, n: 1, lim: 0, wall: 1, ww: 60, wh: 115 },  // 在魔王前面丟一塊大石頭變成石牆（玩家可以炸掉）
    L: { name: '連鎖閃電', D: 26, R: 54, cr: 32, n: 1, lim: 0, chain: [14, 11, 8], cd: 300 },   // 打中一台後，電流跳到附近（300 以內）的坦克
    v: { name: '雷電球', D: 28, R: 56, cr: 34, n: 1, lim: 0, warn: 'V' },          // 雷霆機甲龍：打一發＋地上畫黃色區（下一回合落雷）
    V: { name: '雷暴', D: 30, R: 72, cr: 30, n: 1, lim: 0, storm: 1 },
    B: { name: '火焰吐息', D: 12, R: 46, cr: 18, n: 6, lim: 0, breath: 4, burn: 8 },  // 一次噴 6 團火，落地的地方燒到下一次輪到魔王；站在上面扣 8
    o: { name: '暗焰球', D: 30, R: 58, cr: 36, n: 1, lim: 0, warn: 'O' },          // 暗焰魔龍王血剩 30%：打一發＋全場警告（下一回合末日隕石）
    O: { name: '末日隕石', D: 40, R: 88, cr: 46, n: 1, lim: 0, doom: 1 }
  };
  /* 魔王：hp＝每個玩家給幾滴血；w、h＝身體大小（被打中的範圍是橢圓）；seq＝招式順序（A 瞄準打、Y 砲彈雨、G 護盾），血剩一半以下「狂暴」：瞄準打變三連發
     parts＝被打中的範圍：幾個橢圓 [離魔王腳底中間往右, 往下, 橫半徑, 直半徑]（照魔王圖量的：身體、手、頭），最後一個是頭＝弱點（傷害 ×WEAK）
     err＝瞄準時故意偏多少度（越小越準）；M＝鎖定（只有地獄魔王有）：打一發＋畫紅圈，下一回合隕石砸紅圈
     b5 地圖（2026-11-23）改用 hp5、seq5、so（1 個人打的時候魔王血乘多少：困難、地獄所有攻擊都打你一個，打 8 折）（每一回合固定放什麼招，'-'＝放上一回合預告的大招）；地獄魔王血剩 30% 會預告一次末日隕石 */
  const BOSS = {
    rock: { n: '岩甲巨獸', hp: 135, w: 250, h: 170, err: 7, shot: 'R', shot3: 'Q', seq: ['A', 'A', 'Y', 'A', 'G'], rounds: 10, coin: 30, mv: [60, 150], hp5: 200, so: 1, seq5: ['A', 'W', 'e', '-', 'A', 'Y', 'G', 'A', 'e', '-'], parts: [[0, -82, 115, 78], [-108, -95, 55, 52]] },
    thunder: { n: '雷霆機甲龍', hp: 195, w: 220, h: 190, err: 4, shot: 'Z', shot3: 'X', seq: ['A', 'Y', 'A', 'G', 'A', 'Y'], rounds: 10, coin: 60, mv: [120, 260], hp5: 210, so: .8, seq5: ['A', 'L', 'v', '-', 'A', 'G', 'L', 'v', '-', 'Y'], parts: [[0, -91, 101, 87], [-75, -87, 50, 60], [-95, -172, 60, 45]] },
    hell: { n: '暗焰魔龍王', hp: 235, w: 230, h: 210, err: 2, shot: 'P', shot3: 'K', seq: ['A', 'Y', 'M', 'A', 'G', 'A', 'M'], rounds: 10, coin: 100, mv: [150, 300], hp5: 250, so: .8, seq5: ['B', 'A', 'M', '-', 'G', 'B', 'M', '-', 'A', 'B'], lock: 'thunder', parts: [[0, -101, 106, 97], [-55, -108, 60, 90], [-140, -143, 35, 55], [-85, -218, 50, 50]] }
  };
  const BOSS_SITES = ['grass', 'desert', 'snow', 'moon'], BOSS_FLAT = 150, BOSS_W = ['n', 't', 'b', 'c', 'h', 's'];
  const BOSS_P0 = 1020, BOSS_X0 = 1140, BOSS_X1 = 1400, PL_MAX = 860;   // b4：魔王的平台從 1020 開始；魔王在 1140～1400 走動；玩家站在 860 以左
  const WK_ = Object.keys(WEAP);
  /* 現在（v3）用的砲彈、補給箱裡會開到的砲彈。鑽地彈、築牆彈老師試玩後拿掉了；
     v2 地圖（2026-11-06 那一天開的房間）照當時的規則：8 種砲彈、補給箱是散花／鑽地／築牆／傳送 */
  const W3 = ['n', 't', 'b', 'c', 'p', 's'], CRATE_W = ['c', 'p', 'b', 't'], CRATE_V2 = ['c', 'd', 'w', 'p'];
  const WALL_W = 50, WALL_H = 60;            // 土丘：半寬 50、頂上平的（大約 70 寬）、高 60
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const windRaw = (seed, n) => { const r = rng((seed | 0) * 31 + n * 7919 + 17); r(); return Math.floor((r() + r()) / 2 * 17) - 8; };
  const teamOf = (S, i) => S.mode === 'boss' ? (i === S.bi ? 1 : 0) : S.mode === 'team' ? i % 2 : i;
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
    for (const t of pos) { const gi = Math.round(t / STEP), lvl = site === 'volcano' ? Math.min(h[gi], 560) : h[gi]; /* 火山：出生點一定高過岩漿 */ for (let i = 0; i < cnt; i++) { const d = Math.abs(i * STEP - t); if (d < 70) { const k = 1 - d / 70; h[i] = h[i] * (1 - k * .85) + lvl * k * .85; } } for (let i = 0; i < cnt; i++) if (Math.abs(i * STEP - t) <= 26) h[i] = lvl; }
    for (let i = 0; i < cnt; i++) {
      let v = Math.max(site === 'canyon' ? 330 : 300, Math.min(site === 'volcano' ? 640 : 610, Math.round(h[i])));
      if (isl) { const x = i * STEP; if (!isl.some(([a, b]) => x >= a && x <= b)) v = VOID; else { const e = Math.min(...isl.filter(([a, b]) => x >= a && x <= b).map(([a, b]) => Math.min(x - a, b - x))); if (e < 24) v = Math.round(v + (24 - e) * 2.2); } }
      h[i] = v;
    }
    return { pos, h };
  }
  /* 開新的一局：site 可以是場地代號或 'random'；first＝誰先打（不給就用亂數）；per＝每人幾發；
     mv:'v2'＝在 11-06 開的舊房間裡再來一局（照當時的規則，房間裡還沒更新的平板才算得一樣） */
  function newGame(n, mode, opt = {}, rnd = Math.random) {
    if (mode === 'boss') return newBoss(n, opt, rnd);
    n = clamp(n | 0, 2, 4); mode = mode === 'team' && n === 4 ? 'team' : 'ffa';
    const site = SITES[opt.site] ? opt.site : SITE_KEYS[Math.floor(rnd() * SITE_KEYS.length)];
    const per = opt.per || (n === 2 ? 15 : 8), first = opt.first != null ? ((opt.first | 0) % n + n) % n : Math.floor(rnd() * n);
    const { pos, h } = genTerrain(n, site, rnd);
    const idx = [...pos.keys()].sort((a, b) => pos[a] - pos[b]);
    if (mode !== 'team') for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    let xs = idx.map(p => pos[p]);   // 玩家 i 站在 xs[i]
    /* 2 對 2：同一隊站同一邊（紅隊＝玩家 0、2，藍隊＝玩家 1、3）；哪一隊在左邊隨機 */
    if (mode === 'team') { const s = xs.slice().sort((a, b) => a - b), L = rnd() < .5; xs = L ? [s[0], s[2], s[1], s[3]] : [s[2], s[0], s[3], s[1]]; }
    const map = [opt.mv === 'v2' ? 'v2' : 'v3', site, first, per, xs.join(','), h.map(v => v.toString(36).padStart(2, '0')).join('')].join('|');
    return { map, seed: Math.floor(rnd() * 1e9), mode, n, site };
  }
  /* 一起打王：n 個玩家站左邊、魔王站最右邊（腳下弄平一大塊） */
  function newBoss(n, opt, rnd) {
    n = clamp(n | 0, 1, 4); const kind = BOSS[opt.boss] ? opt.boss : 'rock', site = BOSS_SITES.includes(opt.site) ? opt.site : BOSS_SITES[Math.floor(rnd() * BOSS_SITES.length)];
    const { pos, h } = genTerrain(n + 1, site, rnd), bx = BOSS_X1;
    /* 玩家站在左邊（130～860 平均排開），每個人腳下弄平 */
    let xs = [...Array(n).keys()].map(i => Math.round(n === 1 ? 300 + rnd() * 200 : 130 + i * (PL_MAX - 130) / (n - 1) + (rnd() - .5) * 40));
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; }
    for (const t of xs) { const gi = Math.round(t / STEP), lvl = h[gi]; for (let i = 0; i < h.length; i++) { const d = Math.abs(i * STEP - t); if (d <= 26) h[i] = lvl; else if (d < 70) { const k = 1 - d / 70; h[i] = Math.round(h[i] * (1 - k * .85) + lvl * k * .85); } } }
    /* 右邊一整塊平台給魔王走 */
    const lvl = h[Math.round(bx / STEP)];
    for (let i = 0; i < h.length; i++) { const x = i * STEP; if (x >= BOSS_P0) h[i] = lvl; else if (x > BOSS_P0 - 80) { const k = (x - (BOSS_P0 - 80)) / 80; h[i] = Math.round(h[i] * (1 - k) + lvl * k); } }
    const per = opt.per || BOSS[kind].rounds;
    const map = ['b5', site, 0, per, [...xs, bx].join(','), h.map(v => v.toString(36).padStart(2, '0')).join(''), kind].join('|');
    return { map, seed: Math.floor(rnd() * 1e9), mode: 'boss', n, site };
  }
  function decode(map) {
    const f = String(map || '').split('|');
    let W = 1600, H = 700, xs, hs, site = 'grass', first = null, per = 8, legacy = '', mv = f[0];
    let boss = '';
    if (f[0] === 'v3' || f[0] === 'v2' || f[0] === 'b3' || f[0] === 'b4' || f[0] === 'b5') { site = SITES[f[1]] ? f[1] : 'grass'; first = +f[2] || 0; per = +f[3] || 8; xs = f[4]; hs = f[5]; if (f[0][0] === 'b') boss = BOSS[f[6]] ? f[6] : 'rock'; }
    else if (f[0] === 'm1') { legacy = 'm1'; xs = f[1]; hs = f[2]; }
    else { legacy = 'v1'; W = 1200; H = 600; per = 15; first = 0; xs = (f[1] || '160') + ',' + (f[2] || '1040'); hs = f[3]; }
    const pts = []; for (let i = 0; i + 1 < (hs || '').length; i += 2) pts.push(parseInt(hs.slice(i, i + 2), 36));
    const g = new Float64Array(W), dflt = H - 200;
    for (let x = 0; x < W; x++) {
      const i = Math.floor(x / STEP), fr = (x - i * STEP) / STEP, a = pts[i] ?? dflt, b = pts[i + 1] ?? a;
      g[x] = (a >= VOID) !== (b >= VOID) ? (fr < .5 ? a : b) : a + (b - a) * fr;   // 島的邊是直的
    }
    const X = String(xs || '').split(',').map(Number).filter(isFinite);
    return { W, H, FLOOR: H - 44, g, xs: X.length >= 2 ? X : [200, W - 200], site, first, per, legacy, mv, boss, bm: f[0] === 'b4' || f[0] === 'b5', sk: f[0] === 'b5' };
  }
  const gAt = (g, x) => g[clamp(Math.round(x), 0, g.length - 1)];
  const center = (g, x) => [x, gAt(g, x) - 16];
  const isVoid = (g, x) => gAt(g, x) >= VOID - 1;
  function crater(S, g, cx, cy, r) {
    for (let x = Math.max(0, Math.ceil(cx - r)); x <= Math.min(S.W - 1, Math.floor(cx + r)); x++) {
      if (g[x] >= VOID - 1) continue;
      if (S.boss && (S.bm ? x >= BOSS_P0 : Math.abs(x - S.bossX) <= BOSS_FLAT)) continue;   // 魔王腳下的地（b4：整塊平台）炸不掉
      const dy = Math.sqrt(r * r - (x - cx) * (x - cx));
      if (cy - dy <= g[x] && g[x] < cy + dy) g[x] = Math.min(S.FLOOR, cy + dy);
    }
  }
  /* 築牆彈：在落點堆一座土丘（浮島上也可以搭出一座橋） */
  function mound(S, g, x0, y0, ww = WALL_W, wh = WALL_H) {
    const top = Math.min(y0, gAt(g, x0) < VOID - 1 ? gAt(g, x0) : y0);
    for (let x = Math.max(0, Math.ceil(x0 - ww)); x <= Math.min(S.W - 1, Math.floor(x0 + ww)); x++) {
      const d = Math.abs(x - x0), c = d < 16 ? 1 : Math.cos((d - 16) / (ww - 16) * Math.PI / 2), y = Math.max(120, top - wh * c * c);   // 平頂的土丘
      if (y < g[x]) g[x] = y;
    }
  }
  const crR = (S, w, sub) => (sub ? WEAP.c.cr : WEAP[w].cr) * S.sp.cr;
  function dmgAt(g, tx, ex, ey, P) {
    if (!P.D) return 0;
    const [cx, cy] = center(g, tx), d = Math.max(0, Math.hypot(cx - ex, cy - ey) - 10);
    return d >= P.R ? 0 : Math.round(P.D * (1 - .75 * d / P.R));
  }
  /* 魔王的身體：橢圓（中心、半徑），嘴巴＝魔王的砲口 */
  const bossBody = S => { const B = BOSS[S.boss]; return { cx: S.bossX, cy: S.bossY - B.h * .48, rx: B.w * .46, ry: B.h * .46 }; };
  const bossMouth = (S, x = S.bossX) => { const B = BOSS[S.boss]; return [x - B.w * .44, S.bossY - B.h * .62]; };
  /* 2026-11-21：原本只有身體一個橢圓，打頭會直接穿過去 → 改成身體、手、頭好幾塊（BOSS.parts），頭是弱點 */
  const WEAK = 1.3;
  const bossParts = S => BOSS[S.boss].parts.map(([dx, dy, rx, ry]) => ({ cx: S.bossX + dx, cy: S.bossY + dy, rx, ry }));
  const kOf = (b, x, y, pad = 0) => Math.hypot((x - b.cx) / (b.rx + pad), (y - b.cy) / (b.ry + pad));
  const inBoss = (S, x, y, pad = 0) => bossParts(S).some(b => kOf(b, x, y, pad) < 1);
  const bossWeak = (S, x, y) => { const P = bossParts(S); return kOf(P[P.length - 1], x, y) < 1.15; };   // 爆炸點在頭上（含邊緣一點點）＝打中弱點
  /* 爆炸離魔王最近的那一塊邊緣多遠 */
  function bossDmg(S, ex, ey, P) {
    if (!P.D) return 0; const d = Math.min(...bossParts(S).map(b => Math.max(0, (kOf(b, ex, ey) - 1) * Math.min(b.rx, b.ry))));
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
  const weapons = S => S.legacy === 'v1' ? ['n', 't', 's'] : S.legacy === 'm1' ? ['n', 't', 'b', 's'] : S.mv === 'v2' ? WK_ : S.boss ? BOSS_W : W3;
  const left = (S, i, w) => S.boss && i === S.bi ? (WEAP[w] ? Infinity : 0) : w === 'n' ? Infinity : !weapons(S).includes(w) ? 0 : WEAP[w].lim - (S.T[i].used[w] || 0) + (S.T[i].bonus[w] || 0);
  /* 補給箱：每 4 回合從天上掉一個（位置、裡面裝什麼都用 rng(seed) 決定） */
  function dropCrate(S) {
    if (S.crates.length >= 2) return;
    const r = rng(((S.seed ^ 0x5bd1e995) >>> 0) + S.a * 7919);
    for (let t = 0; t < 14; t++) {
      /* 一起打魔王沒有傳送彈：補給箱只掉魔王模式用得到的砲彈（2026-11-23：以前會掉傳送彈，撿到也不能用） */
      const CW = (S.mv === 'v2' ? CRATE_V2 : CRATE_W).filter(k => !S.boss || BOSS_W.includes(k)), x = Math.round(80 + r() * (S.W - 160)), w = CW[Math.floor(r() * CW.length)];
      if (isVoid(S.g, x) || (S.sp.lava && gAt(S.g, x) > S.sp.lava - 4)) continue;
      if (S.bm && x > BOSS_P0 - 60) continue;   // b4：補給箱不掉在魔王的平台上
      if (S.T.some((t, q) => !t.out && Math.abs(t.x - x) < (S.boss && q === S.bi ? BOSS_FLAT + 40 : 60)) || S.crates.some(c => Math.abs(c.x - x) < 90)) continue;
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
    const M = decode(map), n = M.xs.length, sp = SITES[M.site], bi = M.boss ? n - 1 : -1;
    const S = {
      W: M.W, H: M.H, FLOOR: M.FLOOR, site: M.site, sp, legacy: M.legacy, mv: M.mv, g: M.g, n, mode: M.boss ? 'boss' : mode === 'team' && n === 4 ? 'team' : 'ffa',
      T: M.xs.map(x => ({ x, hp: HP, max: HP, used: { t: 0, b: 0, c: 0, d: 0, w: 0, p: 0, s: 0, h: 0 }, bonus: {}, out: false, ko: -1, st: { shots: 0, hits: 0, far: 0, best: 0, dmg: 0, heal: 0 } })),
      turn: M.first != null ? M.first % n : (seed >>> 0) % n, k: 0, a: 0, seed: seed | 0, last: null, over: false, maxT: n * M.per, per: M.per, crates: [], cid: 0, ev: []
    };
    if (M.boss) { const B = BOSS[M.boss]; Object.assign(S, { boss: M.boss, bm: M.bm, sk: M.sk, bi, bossX: M.xs[bi], bossY: gAt(M.g, M.xs[bi]), shield: false, bt: 0, mark: null, pend: null, burn: null, doom: false, walls: [] }); S.T[bi].hp = S.T[bi].max = M.sk ? Math.round(B.hp5 * (n - 1) * [B.so, 1, 1.05, 1.15][n - 2]) : Math.round(B.hp * (n - 1) * [1, 1, 1.05, 1.15][n - 2]); }   // 人多的時候魔王血再多一點（4 個人一起打太輕鬆）
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
    const i = m.i, me = S.T[i], g = S.g, before = S.T.map((_, j) => alive(S, j)), L = S.legacy, isB = !!S.boss && i === S.bi;
    const xPrev = me.x;
    if (isB) { S.shield = false; S.bt++; if (S.bm && isFinite(m.x)) S.bossX = clamp(Math.round(m.x), BOSS_X0, BOSS_X1); m.x = S.bossX; if (!m.pass && m.w === 'G') { S.shield = true; S.ev.push({ k: 'guard' }); } S.burn = null; }   // b4：魔王先走到新位置；燒著的地面熄掉
    if (isFinite(m.x)) me.x = clamp(m.x, 20, S.W - 20);
    const yb = S.T.map(t => gAt(g, t.x)), x0 = me.x;
    let tele = false;
    if (!m.pass) {
      if (m.w !== 'n' && !isB) me.used[m.w] = (me.used[m.w] || 0) + 1;
      me.st.shots++;
      let dealt = 0;
      for (const e of m.imp) {
        const Wp = WEAP[m.w];
        if (Wp.wall) { if (Wp.wh && S.walls) { const x0 = Math.max(0, Math.ceil(e.x - Wp.ww)), b = []; for (let x = x0; x <= Math.min(S.W - 1, Math.floor(e.x + Wp.ww)); x++) b.push(g[x]); S.walls.push({ x0, b }); } mound(S, g, e.x, e.y, Wp.ww, Wp.wh); }   // 岩牆：記下原本的地面高度（畫面把高出來的部分畫成石頭）
        else if (Wp.tele) { me.x = clamp(e.x, 24, S.W - 24); tele = true; S.ev.push({ k: 'tele', i, x: me.x }); }
        else {
          crater(S, g, e.x, e.y, crR(S, m.w, m.w === 'c'));
          for (let j = 0; j < S.n; j++) if (!S.T[j].out && S.T[j].hp > 0) {
            const d = e.d[j] || 0;
            if (d < 0) { const add = Math.min(-d, S.T[j].max - S.T[j].hp); S.T[j].hp += add; me.st.heal += add; continue; }   // 補血
            S.T[j].hp -= d; if (enemy(S, i, j)) dealt += d;
          }
        }
        if (!Wp.tele) me.st.far = Math.max(me.st.far, Math.round(Math.abs(e.x - x0)));
        if (!L) for (const c of [...S.crates]) if (crateNear(S, g, c, e.x, e.y)) { if (isB) S.crates = S.crates.filter(z => z !== c); else takeCrate(S, i, c); }
      }
      if (dealt > 0) me.st.hits++;
      me.st.best = Math.max(me.st.best, dealt); me.st.dmg += dealt;
    }
    if (!L) {
      /* 坦克腳下的地被炸掉：掉下去超過 30 px，每多 10 px 扣 2 滴血（最多 20）；掉進浮島空隙就出局 */
      S.T.forEach((t, j) => {
        if (t.out || t.hp <= 0 || (j === i && tele) || (S.boss && j === S.bi)) return;
        if (isVoid(g, t.x)) { t.hp = 0; S.ev.push({ k: 'void', i: j }); return; }
        const drop = gAt(g, t.x) - yb[j];
        if (drop > 30) { const d = Math.min(20, Math.floor((drop - 30) / 10) * 2); if (d > 0) { t.hp -= d; S.ev.push({ k: 'fall', i: j, d }); } }
      });
      for (const c of [...S.crates]) if (isVoid(g, c.x)) S.crates = S.crates.filter(z => z !== c);
      /* 開車經過補給箱、或砲彈炸到補給箱 → 拿到 1 發特殊砲彈（下一回合起可以用） */
      if (me.hp > 0 && !me.out && !isB) for (const c of [...S.crates]) if (c.x >= Math.min(xPrev, x0) - 28 && c.x <= Math.max(xPrev, x0) + 28) takeCrate(S, i, c);
      if (S.sp.slide) S.T.forEach((t, j) => { if (!t.out && t.hp > 0 && !(S.boss && j === S.bi)) slide(S, j); });
      if (S.sp.lava && me.hp > 0 && !me.out && !isB && gAt(g, me.x) > S.sp.lava) { me.hp -= 10; S.ev.push({ k: 'lava', i, d: 10 }); }
      /* b5：火焰吐息燒過的地面，玩家這一回合結束時還站在上面就扣血（開車離開就沒事） */
      if (S.burn && !isB && me.hp > 0 && !me.out && S.burn.some(bx => Math.abs(bx - me.x) < BURN_R)) { me.hp -= WEAP.B.burn; S.ev.push({ k: 'burn', i, d: WEAP.B.burn }); }
    }
    for (let j = 0; j < S.n; j++) if (S.T[j].hp <= 0 && S.T[j].ko < 0) { S.T[j].hp = 0; S.T[j].ko = S.k; }
    if (isB && !m.pass && WEAP[m.w].meteor) S.mark = null;   // 隕石砸下來了
    if (isB && S.sk && !m.pass) {
      const Wp = WEAP[m.w];
      if (Wp.quake || Wp.storm || Wp.doom) S.pend = null;   // 大招放完了
      if (Wp.breath) { S.burn = m.imp.filter(e => Math.abs(e.y - gAt(g, e.x)) < 30 && e.x < BOSS_P0 - 40).map(e => e.x); if (!S.burn.length) S.burn = null; else S.ev.push({ k: 'burn0', xs: S.burn }); }
      if (Wp.warn) { S.pend = warnOf(S, Wp.warn); if (Wp.warn === 'O') S.doom = true; }
      if (S.pend) S.ev.push({ k: 'warn', w: S.pend.k, xs: S.pend.xs || null });
    }
    if (isB && !m.pass && WEAP[m.w].mark) {   // 鎖定：挑一台還活著的坦克，在它腳下畫紅圈（亂數用 seed，每台平板算出來都一樣）
      const r = rng(((S.seed ^ 0x51ed27) >>> 0) + S.a * 313), pl = [...Array(S.n).keys()].filter(j => j !== S.bi && alive(S, j));
      if (pl.length) { const j = pl[Math.floor(r() * pl.length)]; S.mark = { x: Math.round(S.T[j].x), i: j }; S.ev.push({ k: 'mark', i: j, x: S.mark.x }); }
    }
    S.a++; S.last = m; S.turn = nextAlive(S, i);
    if (!L && S.a % 4 === 0) dropCrate(S);
    check(S, before);
  }
  /* 結束了沒：只剩一隊（或一個人）、全部倒下、回合用完 */
  function check(S, before, byOut) {
    if (S.over) return;
    if (S.boss) {
      const pl = [...Array(S.n).keys()].filter(i => i !== S.bi), team = pl.filter(i => !S.T[i].out);
      if (!alive(S, S.bi)) { S.over = true; S.win = team; S.winner = team.join(',') || 'none'; S.reason = `打倒了${BOSS[S.boss].n}！`; }
      else if (!pl.some(i => alive(S, i))) { S.over = true; S.win = [S.bi]; S.winner = String(S.bi); S.reason = byOut && !pl.some(i => !S.T[i].out) ? '大家都離開了' : '全隊都被打倒了'; }
      else if (S.bt >= S.per) { S.over = true; S.win = [S.bi]; S.winner = String(S.bi); S.reason = `${S.per} 輪用完了，魔王還沒倒下`; }   // 魔王打完第 per 次＝一輪結束
      return;
    }
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
    const W0 = WEAP[w], isB = !!S.boss && i === S.bi, [cx, cy] = isB ? bossMouth(S, S.bm ? x : S.bossX) : center(g, x), sh = [];
    if (W0.rain) {   // 砲彈雨：每個還活著的玩家頭上掉一顆（位置用亂數偏一點）
      const r = rng(((S.seed ^ 0x2545f491) >>> 0) + S.a * 131);
      S.T.forEach((t, j) => { if (j === i || !alive(S, j)) return; sh.push({ k: sh.length, x: clamp(t.x + (r() - .5) * 200, 10, S.W - 10), y: -30 - r() * 120, vx: (r() - .5) * .6, vy: 1.5, live: true, away: true, t: 0, bn: 0, bounced: 0, sub: 0, drill: 0 }); });
      return { S, g, i, w, sh, T: tanksOf(S, i, x), crates: S.legacy ? [] : S.crates.slice(), wind: S.wind, grav: GRAV * S.sp.grav, ev: [] };
    }
    if (W0.meteor && S.mark) {   // 隕石：從右上方斜斜砸向紅圈（不受風影響；起點往回推算，剛好落在紅圈中間）
      const gv = GRAV * S.sp.grav, vx = -1.9, vy = 3, y0 = -60, yg = gAt(g, S.mark.x) - 16, t = (-vy + Math.sqrt(vy * vy + 2 * gv * (yg - y0))) / gv;
      sh.push({ k: 0, x: S.mark.x - vx * t, y: y0, vx, vy, live: true, away: true, t: 0, bn: 0, bounced: 0, sub: 0, drill: 0, nw: 1 });
      return { S, g, i, w, sh, T: tanksOf(S, i, x), crates: S.legacy ? [] : S.crates.slice(), wind: S.wind, grav: GRAV * S.sp.grav, ev: [] };
    }
    if ((W0.storm || W0.doom) && S.pend && S.pend.xs) {   // b5 落雷（直直打下來）／末日隕石（從右上方斜斜砸下來），都剛好落在預告範圍的中間
      const gv = GRAV * S.sp.grav;
      S.pend.xs.forEach((tx, k) => {
        const vx = W0.storm ? 0 : -1.9, vy = W0.storm ? 10 : 3, y0 = W0.storm ? -40 : -60 - k * 70, yg = gAt(g, tx) - 16, t = (-vy + Math.sqrt(vy * vy + 2 * gv * (yg - y0))) / gv;
        sh.push({ k, x: tx - vx * t, y: y0, vx, vy, live: true, away: true, t: 0, bn: 0, bounced: 0, sub: 0, drill: 0, nw: 1 });
      });
      return { S, g, i, w, sh, T: tanksOf(S, i, x), crates: S.legacy ? [] : S.crates.slice(), wind: S.wind, grav: GRAV * S.sp.grav, ev: [] };
    }
    for (let k = 0; k < W0.n; k++) {
      const ang = (a + (W0.n > 1 && W0.spread ? (k - 1) * W0.spread : 0)) * Math.PI / 180, v = (W0.breath ? p + (k - (W0.n - 1) / 2) * W0.breath : p) * VK;   // 火焰吐息：同一個角度、力道一團比一團大，噴成一長排
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
      if (!s.nw) s.vx += F.wind * WK * dt; s.vy += F.grav * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.t++;
      if (s.x < -80 || s.x > S.W + 80 || s.y > S.H + 40) { s.live = false; continue; }
      if (W0.split && !s.sub && s.vy >= 0 && s.t > 6) {   // 散花彈：飛到最高點分成 5 顆
        s.live = false; F.ev.push({ k: 'split', x: s.x, y: s.y });
        for (let j = 0; j < W0.split; j++) F.sh.push({ k: j, x: s.x, y: s.y, vx: s.vx + (j - 2) * 1.15, vy: .4 + Math.abs(j - 2) * .15, live: true, away: true, t: 0, bn: 0, bounced: 0, sub: 1, drill: 0 });
        continue;
      }
      let hit = -1;
      for (let q = 0; q < F.T.length; q++) {
        const T = F.T[q]; if (!T.on) continue;
        if (S.boss && q === S.bi) { if (q !== F.i && inBoss(S, s.x, s.y)) { hit = q; break; } continue; }   // 魔王：身體是一個大橢圓；自己的砲彈不會打到自己
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
    if (W0.wall) { mound(S, g, ex, ey, W0.ww, W0.wh); return { k: r.s.k, x: ex, y: ey, hit: 0, d: new Array(n).fill(0) }; }
    if (W0.tele) {
      let tx = clamp(ex, 24, S.W - 24);
      for (let it = 0; it < 4; it++) { const o = S.T.findIndex((t, q) => q !== F.i && !t.out && Math.abs(t.x - tx) < 62); if (o < 0) break; tx = clamp(S.T[o].x + (tx >= S.T[o].x ? 62 : -62), 24, S.W - 24); }
      /* 兩台坦克靠很近時，推開幾次還是會疊在其中一台上：往兩邊找最近的空位，找不到就傳送失敗 */
      const clash = x => S.T.some((t, q) => q !== F.i && !t.out && Math.abs(t.x - x) < 62);
      if (clash(tx)) { let fx = null; for (let d = 2; d <= 240 && fx == null; d += 2) for (const c of [tx + d, tx - d]) if (c >= 24 && c <= S.W - 24 && !isVoid(g, c) && !clash(c)) { fx = c; break; } if (fx == null) return null; tx = fx; }
      if (isVoid(g, tx)) return null;   // 落到空隙：傳送失敗
      F.T[F.i].x = tx; return { k: r.s.k, x: tx, y: Math.round(gAt(g, tx)), hit: 0, d: new Array(n).fill(0) };
    }
    const P = r.s.sub ? WEAP.c : W0;
    const d = F.T.map((t, j) => !t.on ? 0 : S.boss && j === S.bi ? bossDmg(S, ex, ey, P) : dmgAt(g, t.x, ex, ey, P));
    if (r.hit >= 0) d[r.hit] = Math.max(d[r.hit], P.D);
    if (S.boss) {   // 一起打王：隊友不互相傷害、補血彈補隊友、魔王的護盾擋一半
      const fromB = F.i === S.bi;
      for (let j = 0; j < n; j++) {
        if (j === S.bi) { let v = fromB ? 0 : d[j]; if (v > 0 && bossWeak(S, ex, ey)) v = Math.round(v * WEAK); d[j] = S.shield ? Math.round(v / 2) : v; continue; }   // 打中頭（弱點）傷害 ×1.5，護盾再減半
        if (fromB) continue;
        if (W0.heal) { const t = F.T[j]; if (!t.on) { d[j] = 0; continue; } const [cx, cy] = center(g, t.x), dd = Math.max(0, Math.hypot(cx - ex, cy - ey) - 10); d[j] = r.hit === j ? -(W0.heal + 6) : dd >= W0.R ? 0 : -Math.round(W0.heal * (1 - .5 * dd / W0.R)); }
        else d[j] = 0;
      }
      if (fromB && W0.chain) {   // 連鎖閃電：從被打中最痛的那台開始，跳到附近還沒被電到的坦克
        const pl = [...Array(n).keys()].filter(j => j !== S.bi && F.T[j].on), done = [];
        let cur = pl.filter(j => d[j] > 0).sort((a, b) => d[b] - d[a])[0];
        if (cur != null) { done.push(cur); for (const c of W0.chain) { const nx = pl.filter(j => !done.includes(j) && Math.abs(F.T[j].x - F.T[cur].x) <= W0.cd).sort((a, b) => Math.abs(F.T[a].x - F.T[cur].x) - Math.abs(F.T[b].x - F.T[cur].x))[0]; if (nx == null) break; d[nx] += c; done.push(nx); cur = nx; } }
      }
    }
    crater(S, g, ex, ey, crR(S, w, r.s.sub));
    return { k: r.s.k, x: ex, y: ey, hit: r.hit >= 0 ? r.hit + 1 : 0, d };
  }
  /* 發射：算好結果，做成一步棋 */
  function fire(S, x, a, p, w) {
    const me = S.turn, g = Float64Array.from(S.g);
    a = Math.round(clamp(a, 0, 180)); p = Math.round(clamp(p, 10, 100));
    if (!WEAP[w] || left(S, me, w) <= 0) w = 'n';   // 不能用的砲彈（用完了、這一版沒有）一律改成普通彈
    const F = launch(S, g, me, x, a, p, w), imp = [];
    if (WEAP[w].quake) {   // 地震重踏：沒有砲彈，每台站在地上的坦克都扣血（離魔王 300 以內扣 26，越遠越少，1100 以外扣 10）
      const bx = S.bm ? clamp(Math.round(x), BOSS_X0, BOSS_X1) : S.bossX;
      for (let j = 0; j < S.n; j++) { if (j === S.bi || !alive(S, j)) continue; const t = S.T[j], dd = new Array(S.n).fill(0); dd[j] = Math.round(10 + 16 * clamp(1 - (bx - t.x - 300) / 800, 0, 1)); imp.push({ k: imp.length, x: Math.round(t.x), y: Math.round(gAt(g, t.x)), hit: 0, d: dd }); }
    }
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
  /* b5 預告：下一回合的大招打哪裡（亂數用 seed，每台平板算出來都一樣）
     V 雷暴：每台還活著的坦克腳下一塊黃色區（最多 3 塊）；O 末日隕石：每台坦克腳下＋另外 1 塊，中間一定留安全的空位 */
  const BURN_R = 42;
  function warnOf(S, k) {
    if (k === 'E') return { k };
    const r = rng(((S.seed ^ 0x3c6ef372) >>> 0) + S.a * 541), pl = [...Array(S.n).keys()].filter(j => j !== S.bi && alive(S, j));
    const xs = pl.slice(0, 3).map(j => Math.round(S.T[j].x + (r() - .5) * 40));
    if (k === 'O') for (let t = 0; t < 30 && xs.length < pl.length + 1; t++) { const x = Math.round(100 + r() * (PL_MAX - 100)); if (xs.every(q => Math.abs(q - x) > 260)) xs.push(x); }
    return { k, xs, r: k === 'O' ? WEAP.O.R : WEAP.V.R };
  }
  const pass = (S, i, x) => S.legacy === 'v1' ? Math.round(x) + ':-' : (i | 0) + ':' + Math.round(x) + ':-';
  /* 魔王這一回合要怎麼打：照招式順序；瞄準打＝挑一台坦克（常常挑血最少的），試很多角度、力道找最接近的，再故意偏一點 */
  function bossMove(S) {
    const B = BOSS[S.boss], bi = S.bi, r = rng(((S.seed ^ 0x9e3779b9) >>> 0) + S.a * 977), rage = S.T[bi].hp <= S.T[bi].max / 2;
    const seq = S.sk ? B.seq5 : B.seq; let act = seq[S.bt % seq.length];
    const pl = [...Array(S.n).keys()].filter(j => j !== bi && alive(S, j));
    if (!pl.length) return pass(S, bi, S.bossX);
    /* b4：先決定走到哪裡（往一邊走一段；走不下就往另一邊），玩家每一輪都要重新瞄準 */
    let nx = S.bossX;
    if (S.bm) { const d = Math.round(B.mv[0] + r() * (B.mv[1] - B.mv[0])), dir = r() < .5 ? -1 : 1; nx = S.bossX + dir * d; if (nx < BOSS_X0 || nx > BOSS_X1) nx = S.bossX - dir * d; nx = clamp(nx, BOSS_X0, BOSS_X1); }
    if (S.mark) return fire(S, nx, 150, 50, 'F').tok;   // 上一回合畫了紅圈：這一回合隕石砸下來
    if (S.sk) {
      if (S.pend) return fire(S, nx, 150, 50, S.pend.k).tok;   // 上一回合預告的大招
      if (act === '-') act = 'A';
      if (S.boss === 'hell' && !S.doom && S.T[bi].hp <= S.T[bi].max * .3) act = 'o';   // 地獄魔王血剩 30%：預告末日隕石（一場只有一次）
      if (act === 'W') {   // 岩牆：丟一塊大石頭到自己前面（x 940～980）
        const tx = 940 + Math.round(r() * 40); let bw = null;
        for (let a = 95; a <= 175; a += 4) for (let p = 15; p <= 80; p += 3) { const e = Math.abs(simX(S, nx, a, p) - tx); if (!bw || e < bw.e) bw = { a, p, e }; }
        return fire(S, nx, bw.a, bw.p, 'W').tok;
      }
    }
    if (act === 'G') return fire(S, nx, 150, 50, 'G').tok;
    if (act === 'Y') return fire(S, nx, 150, 50, 'Y').tok;
    const low = pl.slice().sort((a, b) => S.T[a].hp - S.T[b].hp)[0], tgt = r() < .45 ? low : pl[Math.floor(r() * pl.length)];
    const tx = S.T[tgt].x, g = S.g;
    let best = null;
    const sim = (a, p) => simX(S, nx, a, p);
    for (let a = 100; a <= 170; a += 5) for (let p = 30; p <= 100; p += 5) { const x = sim(a, p), e = Math.abs(x - tx); if (!best || e < best.e) best = { a, p, e }; }
    for (let a = best.a - 4; a <= best.a + 4; a++) for (let p = best.p - 4; p <= best.p + 4; p++) { if (p < 10 || p > 100) continue; const x = sim(a, p), e = Math.abs(x - tx); if (e < best.e) best = { a, p, e }; }
    const err = B.err * (rage ? .7 : 1), a = clamp(Math.round(best.a + (r() - .5) * 2 * err), 91, 179), p = clamp(Math.round(best.p + (r() - .5) * err * .8), 10, 100);
    const W5 = { M: 'M', e: 'e', v: 'v', o: 'o', L: 'L', B: 'B' };
    return fire(S, nx, a, p, W5[act] || (rage ? B.shot3 : B.shot)).tok;
  }
  /* 魔王試打一發普通彈（不打到任何坦克）會落在哪個 x */
  function simX(S, nx, a, p) { const F = launch(S, Float64Array.from(S.g), S.bi, nx, a, p, 'n'), s = F.sh[0]; F.T = F.T.map(t => ({ ...t, on: false })); for (let k = 0; k < SUB * 900 && s.live; k++) { const h = stepFlight(F); if (h.length) return h[0].x; } return s.x; }
  /* 預覽：只畫前面一小段 */
  function preview(S, i, x, a, p, ticks = 22) {
    const g = S.g, F = launch(S, g, i, x, a, p, 'n'), s = F.sh[0], pts = [];
    for (let k = 0; k < ticks * SUB; k++) { const r = stepFlight(F); if (r.length || !s.live) break; if (k % SUB === 0) pts.push([s.x, s.y]); }
    return pts;
  }
  /* 開車：不能爬太陡、不能撞到別台、不能開進浮島空隙。耗油：上坡比較多、下坡比較少（最少 0.6） */
  function canDrive(S, i, from, to) {
    if (to < 24 || to > S.W - 24 || isVoid(S.g, to)) return false;
    if (S.bm && i !== S.bi && to > BOSS_P0 - 60) return false;   // b4：玩家不能開上魔王的平台
    for (let j = 0; j < S.n; j++) if (j !== i && !S.T[j].out && Math.abs(to - S.T[j].x) < (S.boss && j === S.bi ? BOSS_FLAT + 20 : 70)) return false;
    return gAt(S.g, from) - gAt(S.g, to) < 6;
  }
  function driveCost(S, from, to) {
    const dx = Math.abs(to - from) || 1, up = (gAt(S.g, from) - gAt(S.g, to)) / dx;
    return dx * Math.max(.6, 1 + up * 2.4);
  }
  /* 補給箱、各種砲彈的中文名字（畫面用） */
  root.TK = { VER, W: 1600, H: 700, HP, FUEL, SUB, GRAV, WK, VK, VOID, WEAP, WK_, SITES, SITE_KEYS, CRATE_W, rng, windRaw, newGame, decode, replay, parse, fire, pass, preview, launch, stepFlight, resolveHit, crater, mound, center, gAt, isVoid, left, weapons, canDrive, driveCost, alive, nextAlive, teamOf, enemy, result, places, tanksOf, crateNear, crR, BOSS, BOSS_SITES, bossMove, bossBody, bossMouth, bossParts, bossWeak, WEAK };
})(typeof window !== 'undefined' ? window : globalThis);
