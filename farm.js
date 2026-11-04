/* 601 快樂農場（原創的種菜遊戲）
   ・自己的農場：一開始 6 塊田，農場升級最多 12 塊。買種子 → 種下去 → 澆水 → 等時間長大 → 收成放進倉庫 → 賣掉換金幣
   ・澆水的 💧 要靠練習：每答對 1 題 +1 💧；作物沒水就停在那裡不長。10 題答對 8 題送 1 包 🧪 肥料（剩下的時間減半）
   ・長大途中可能長雜草 🌿、來蟲 🐛：沒處理的話，收成少 1 個
   ・拜訪同學：幫忙澆水、除草、捉蟲（自己拿經驗和金幣）；成熟的菜可以偷摘 1 個（每塊田最多被摘 2 個，主人看得到是誰）
   ・晚上 9 點到早上 6 點農場休息：作物照樣長，但不能操作（不要半夜爬起來偷菜）
   資料：自己的農場 sum.farm（跟著摘要同步）；公開給同學看 learn/farm/座號；同學做的事 learn/farmact/主人/編號（主人下次打開時算進去） */
(function () {
  /* ───────── 作物 ───────── p 種子價錢、m 幾分鐘長大、w 要澆幾次水、y 收成幾個、s 一個賣多少、xp 經驗、lv 農場幾級才能種 */
  const CROPS = {
    cabbage: { n: '小白菜', lv: 1, p: 2, m: 3, w: 1, y: 3, s: 1, xp: 2, c: '#8ce99a' },
    carrot: { n: '紅蘿蔔', lv: 1, p: 3, m: 10, w: 1, y: 4, s: 1, xp: 3, c: '#69db7c' },
    strawberry: { n: '草莓', lv: 2, p: 5, m: 20, w: 2, y: 5, s: 2, xp: 5, c: '#51cf66' },
    tomato: { n: '番茄', lv: 3, p: 6, m: 30, w: 2, y: 5, s: 2, xp: 6, c: '#40c057' },
    corn: { n: '玉米', lv: 4, p: 8, m: 60, w: 2, y: 5, s: 3, xp: 8, c: '#94d82d' },
    eggplant: { n: '茄子', lv: 5, p: 10, m: 90, w: 2, y: 6, s: 3, xp: 10, c: '#51cf66' },
    sunflower: { n: '向日葵', lv: 6, p: 12, m: 120, w: 3, y: 4, s: 5, xp: 12, c: '#69db7c' },
    pumpkin: { n: '南瓜', lv: 7, p: 15, m: 240, w: 3, y: 3, s: 9, xp: 16, c: '#40c057' },
    watermelon: { n: '西瓜', lv: 8, p: 18, m: 360, w: 3, y: 3, s: 12, xp: 20, c: '#37b24d' },
    grape: { n: '葡萄', lv: 10, p: 25, m: 480, w: 3, y: 6, s: 8, xp: 26, c: '#40c057' }
  };
  const CK = Object.keys(CROPS);
  const COLS = 4, ROWS = 3, MAXP = COLS * ROWS, WATER_MAX = 30, START_WATER = 8, HELP_COIN_MAX = 10, TAKE_MAX = 5, STEAL_PER_PLOT = 2;
  const plotsFor = lv => lv >= 7 ? 12 : lv >= 5 ? 10 : lv >= 3 ? 8 : 6;
  const xpNeed = lv => 15 + 10 * (lv - 1);
  function lvOf(xp) { let lv = 1, x = xp || 0; while (x >= xpNeed(lv) && lv < 50) { x -= xpNeed(lv); lv++; } return { lv, cur: x, need: xpNeed(lv) }; }
  const night = () => PET.night();
  /* 每塊田的小亂數（同一次種植一定一樣，所以每台平板看到的蟲、雜草一樣） */
  const hash = n => { let a = (n | 0) * 2654435761 >>> 0; a ^= a >>> 15; a = Math.imul(a, 2246822519) >>> 0; a ^= a >>> 13; return (a >>> 0) / 4294967296; };

  /* 一塊田現在怎樣：{c 作物, t 種下的時間, w 澆了幾次, f 肥料省下的毫秒, g 雜草(0 沒有、2 拔掉), b 蟲, s 被摘幾個} */
  function stat(P) {
    if (!P || !P.c || !CROPS[P.c]) return { empty: 1 };
    const C = CROPS[P.c], G = C.m * 60000, el = Date.now() - P.t + (P.f || 0);
    const cap = (P.w || 0) / C.w;                                   // 澆了幾成的水，就最多長到幾成
    const prog = Math.max(0, Math.min(1, el / G, cap));
    const ripe = prog >= 1, thirsty = !ripe && prog >= cap - 1e-9 && (P.w || 0) < C.w;
    const wAt = .3 + hash(P.t) * .4, bAt = .4 + hash(P.t + 7) * .4;
    const weed = hash(P.t + 3) < .5 && prog >= wAt && P.g !== 2, bug = hash(P.t + 11) < .4 && prog >= bAt && P.b !== 2;
    const stage = ripe ? 3 : prog >= .55 ? 2 : prog >= .15 ? 1 : 0;
    const left = ripe ? 0 : Math.max(0, G - el);
    const yieldN = Math.max(1, C.y - (weed ? 1 : 0) - (bug ? 1 : 0) - (P.s || 0));
    return { C, prog, ripe, thirsty, weed, bug, stage, left, yieldN, wNeed: C.w - (P.w || 0) };
  }
  const mmss = ms => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} 小時${m % 60 ? ` ${m % 60} 分` : ''}` : `${m} 分鐘`; };

  /* ───────── 畫畫 ───────── */
  const IA = .6, IB = .3;
  const iso = (x, y, z = 0) => [+((x - y) * IA).toFixed(1), +((x + y) * IB - z).toFixed(1)];
  const pts = a => a.map(p => p.join(',')).join(' ');
  const PS = 84, GAP = 10, OX = 182, OY = 172, FW = 600, FH = 520, CS = 1.4;   // CS＝作物放大倍數   // 田的大小、間距、第一塊田的位置、整個農場的大小
  const plotXY = k => [OX + (k % COLS) * (PS + GAP), OY + ((k / COLS) | 0) * (PS + GAP)];
  /* 作物：原點＝田的中間，往上畫 */
  function crop(id, st) {
    const C = CROPS[id], lf = C.c, dk = '#2f9e44';
    if (st === 0) return `<ellipse cx="0" cy="0" rx="12" ry="5" fill="#8a5a2b"/><ellipse cx="-4" cy="-2" rx="2.4" ry="1.8" fill="#f5d77a"/><ellipse cx="4" cy="-1" rx="2.4" ry="1.8" fill="#f5d77a"/>`;
    if (st === 1) return `<path d="M0 0 V-12" stroke="${dk}" stroke-width="2.5"/><path d="M0 -10 Q-12 -16 -12 -6 Q-6 -6 0 -10Z M0 -12 Q12 -20 12 -9 Q6 -8 0 -12Z" fill="${lf}" stroke="${dk}" stroke-width="1.5"/>`;
    if (st === 2) return `<g fill="${lf}" stroke="${dk}" stroke-width="1.6"><path d="M0 0 Q-20 -8 -18 -22 Q-6 -16 0 0Z"/><path d="M0 0 Q20 -8 18 -22 Q6 -16 0 0Z"/><path d="M0 0 Q-10 -24 0 -34 Q10 -24 0 0Z"/><path d="M0 0 Q-24 0 -22 -10 Q-10 -8 0 0Z"/><path d="M0 0 Q24 0 22 -10 Q10 -8 0 0Z"/></g><path d="M0 0 V-26" stroke="${dk}" stroke-width="1.4" opacity=".6"/>`;
    switch (id) {
      case 'cabbage': return `<g stroke="#2f9e44" stroke-width="1.6"><ellipse cx="-11" cy="-8" rx="11" ry="8" fill="#69db7c"/><ellipse cx="11" cy="-8" rx="11" ry="8" fill="#69db7c"/><ellipse cx="0" cy="-14" rx="15" ry="13" fill="#b2f2bb"/><path d="M-7 -18 Q0 -28 7 -18 Q2 -12 0 -4 Q-2 -12 -7 -18Z" fill="#d3f9d8"/></g><path d="M0 -4 V-24 M-8 -10 Q-4 -16 0 -14 M8 -10 Q4 -16 0 -14" stroke="#40c057" stroke-width="1.2" fill="none"/><ellipse cx="-6" cy="-20" rx="3" ry="2" fill="#fff" opacity=".6"/>`;
      case 'carrot': return `<g fill="#ff922b" stroke="#d9480f" stroke-width="1.6">${[-10, 0, 10].map(x => `<path d="M${x - 6} -2 Q${x} 6 ${x + 6} -2Z"/>`).join('')}</g><g stroke="#2f9e44" stroke-width="2.2" fill="none" stroke-linecap="round">${[-10, 0, 10].map(x => `<path d="M${x} -2 Q${x - 8} -14 ${x - 6} -26 M${x} -2 Q${x} -16 ${x + 2} -30 M${x} -2 Q${x + 8} -14 ${x + 7} -24"/>`).join('')}</g><g fill="#69db7c">${[-16, -10, -4, 2, 8, 14].map((x, i) => `<circle cx="${x}" cy="${-24 - (i % 2) * 5}" r="3"/>`).join('')}</g>`;
      case 'strawberry': return `<g fill="#51cf66" stroke="#2f9e44" stroke-width="1.5"><path d="M0 0 Q-22 -4 -18 -16 Q-6 -12 0 0Z"/><path d="M0 0 Q22 -4 18 -16 Q6 -12 0 0Z"/><path d="M0 0 Q-8 -20 2 -24 Q8 -12 0 0Z"/></g>${[[-12, -4], [10, -6], [0, -12]].map(([x, y]) => `<g transform="translate(${x} ${y})"><path d="M-6 -4 Q0 10 6 -4 Q0 -7 -6 -4Z" fill="#ff6b6b" stroke="#c92a2a" stroke-width="1.4"/><path d="M-4 -5 L0 -8 L4 -5" fill="#40c057"/><g fill="#fff3bf"><circle cx="-2" cy="-1" r=".9"/><circle cx="2" cy="0" r=".9"/><circle cx="0" cy="3" r=".9"/></g></g>`).join('')}<g transform="translate(12 -20)"><circle r="4" fill="#fff" stroke="#dee2e6"/><circle r="1.6" fill="#ffd43b"/></g>`;
      case 'tomato': return `<path d="M0 2 V-44" stroke="#a8743a" stroke-width="3"/><g fill="#40c057" stroke="#2f9e44" stroke-width="1.4"><path d="M0 -10 Q-18 -14 -16 -24 Q-6 -20 0 -10Z"/><path d="M0 -22 Q18 -26 16 -36 Q6 -32 0 -22Z"/><path d="M0 -34 Q-14 -40 -10 -48 Q-2 -42 0 -34Z"/></g>${[[-9, -14, 7], [9, -26, 7.5], [-6, -36, 6], [8, -8, 6]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fa5252" stroke="#c92a2a" stroke-width="1.4"/><path d="M${x - 3} ${y - r + 1} L${x} ${y - r - 2} L${x + 3} ${y - r + 1}" stroke="#2f9e44" stroke-width="2" fill="none"/><circle cx="${x - r / 3}" cy="${y - r / 3}" r="${r / 4}" fill="#fff" opacity=".6"/>`).join('')}`;
      case 'corn': return `<path d="M0 2 V-58" stroke="#74b816" stroke-width="4"/><g fill="#94d82d" stroke="#5c940d" stroke-width="1.4"><path d="M0 -10 Q-26 -14 -24 -30 Q-10 -20 0 -14Z"/><path d="M0 -24 Q26 -28 24 -44 Q10 -34 0 -28Z"/><path d="M0 -40 Q-18 -50 -14 -62 Q-4 -50 0 -44Z"/></g>${[[-7, -26, -18], [8, -36, 16]].map(([x, y, a]) => `<g transform="translate(${x} ${y}) rotate(${a})"><ellipse rx="5.5" ry="12" fill="#ffd43b" stroke="#f59f00" stroke-width="1.4"/><g fill="#ffe066">${[-7, -3, 1, 5].map(yy => `<circle cx="-2" cy="${yy}" r="1.4"/><circle cx="2" cy="${yy + 1.5}" r="1.4"/>`).join('')}</g><path d="M-6 6 Q-8 -6 -2 -12 M6 6 Q8 -6 2 -12" stroke="#94d82d" stroke-width="2.5" fill="none"/></g>`).join('')}<path d="M0 -58 l-5 -8 M0 -58 l0 -10 M0 -58 l5 -8" stroke="#e9c46a" stroke-width="2" stroke-linecap="round"/>`;
      case 'eggplant': return `<g fill="#51cf66" stroke="#2f9e44" stroke-width="1.4"><path d="M0 0 Q-24 -10 -20 -26 Q-8 -18 0 -4Z"/><path d="M0 0 Q24 -10 20 -26 Q8 -18 0 -4Z"/><path d="M0 -4 Q-6 -30 4 -36 Q10 -20 0 -4Z"/></g>${[[-9, -14, 15], [9, -18, -12]].map(([x, y, a]) => `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M0 -6 Q-8 -2 -7 10 Q-4 20 0 20 Q6 20 7 10 Q8 -2 0 -6Z" fill="#9c36b5" stroke="#5f3dc4" stroke-width="1.4"/><path d="M-5 -6 L0 -10 L5 -6 L0 -2Z" fill="#40c057"/><ellipse cx="-3" cy="4" rx="1.8" ry="4" fill="#fff" opacity=".45"/></g>`).join('')}`;
      case 'sunflower': return `<path d="M0 2 V-48" stroke="#5c940d" stroke-width="3.5"/><g fill="#69db7c" stroke="#2f9e44" stroke-width="1.4"><path d="M0 -14 Q-16 -22 -18 -12 Q-8 -8 0 -14Z"/><path d="M0 -26 Q16 -34 18 -24 Q8 -20 0 -26Z"/></g><g transform="translate(0 -54)">${[...Array(14)].map((_, i) => `<ellipse cx="0" cy="-12" rx="4" ry="8" fill="#ffd43b" stroke="#f59f00" stroke-width="1.2" transform="rotate(${i * 360 / 14})"/>`).join('')}<circle r="9" fill="#8a5a2b"/><g fill="#5c3d1e">${[[-3, -3], [3, -2], [0, 3], [-4, 3], [4, 3]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2"/>`).join('')}</g><circle cx="-3" cy="-4" r="2" fill="#c08850"/></g>`;
      case 'pumpkin': return `<path d="M-22 -4 Q-30 -16 -18 -22 M20 -2 Q32 -10 26 -20" stroke="#2f9e44" stroke-width="2.4" fill="none"/><path d="M-26 -16 Q-36 -28 -22 -30 Q-18 -22 -26 -16Z" fill="#51cf66" stroke="#2f9e44" stroke-width="1.4"/><g stroke="#d9480f" stroke-width="1.6"><ellipse cx="-10" cy="-12" rx="11" ry="12" fill="#ff922b"/><ellipse cx="10" cy="-12" rx="11" ry="12" fill="#ff922b"/><ellipse cx="0" cy="-13" rx="10" ry="13" fill="#ffa94d"/></g><path d="M0 -25 Q2 -33 8 -34" stroke="#5c940d" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="-4" cy="-19" rx="3" ry="4" fill="#fff" opacity=".4"/>`;
      case 'watermelon': return `<path d="M18 -2 Q30 -8 28 -18" stroke="#2f9e44" stroke-width="2.4" fill="none"/><path d="M22 -14 Q34 -24 24 -28 Q18 -22 22 -14Z" fill="#51cf66" stroke="#2f9e44" stroke-width="1.4"/><ellipse cx="0" cy="-12" rx="20" ry="14" fill="#2b8a3e" stroke="#1b5e20" stroke-width="1.6"/>${[-12, -4, 4, 12].map(x => `<path d="M${x} -25 Q${x + 4} -12 ${x} 1" stroke="#51cf66" stroke-width="3" fill="none"/>`).join('')}<ellipse cx="-8" cy="-19" rx="4" ry="2.5" fill="#fff" opacity=".35"/>`;
      case 'grape': return `<path d="M-18 2 V-46 M18 2 V-46 M-22 -44 H22" stroke="#a8743a" stroke-width="3.5" stroke-linecap="round"/><g fill="#69db7c" stroke="#2f9e44" stroke-width="1.4"><path d="M-14 -44 Q-24 -56 -8 -56 Q-4 -48 -14 -44Z"/><path d="M6 -44 Q2 -58 18 -54 Q18 -46 6 -44Z"/><path d="M-4 -46 Q-2 -58 8 -52Z"/></g>${[[-8, -36], [9, -34]].map(([x, y]) => `<g transform="translate(${x} ${y})">${[[0, 0], [-4, 4], [4, 4], [-6, 9], [0, 9], [6, 9], [-3, 14], [3, 14], [0, 19]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="3.4" fill="#9c36b5" stroke="#5f3dc4" stroke-width="1"/>`).join('')}<circle cx="-1" cy="1" r="1" fill="#fff" opacity=".7"/></g>`).join('')}`;
    }
    return '';
  }
  /* 收成的東西（倉庫、飛起來的小圖） */
  function produce(id) {
    switch (id) {
      case 'cabbage': return `<ellipse cx="0" cy="2" rx="13" ry="11" fill="#b2f2bb" stroke="#2f9e44" stroke-width="1.6"/><path d="M-6 -2 Q0 -12 6 -2 Q2 4 0 10 Q-2 4 -6 -2Z" fill="#d3f9d8" stroke="#40c057" stroke-width="1"/>`;
      case 'carrot': return `<path d="M-5 -6 Q0 18 5 -6Z" fill="#ff922b" stroke="#d9480f" stroke-width="1.6"/><path d="M0 -6 Q-6 -14 -4 -18 M0 -6 Q0 -16 2 -20 M0 -6 Q6 -14 6 -17" stroke="#2f9e44" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
      case 'strawberry': return `<path d="M-9 -4 Q0 16 9 -4 Q0 -9 -9 -4Z" fill="#ff6b6b" stroke="#c92a2a" stroke-width="1.6"/><path d="M-6 -6 L0 -11 L6 -6" fill="#40c057"/><g fill="#fff3bf"><circle cx="-3" cy="0" r="1"/><circle cx="3" cy="1" r="1"/><circle cx="0" cy="5" r="1"/></g>`;
      case 'tomato': return `<circle r="11" fill="#fa5252" stroke="#c92a2a" stroke-width="1.6"/><path d="M-5 -10 L0 -14 L5 -10 L0 -8Z" fill="#40c057"/><circle cx="-4" cy="-4" r="3" fill="#fff" opacity=".55"/>`;
      case 'corn': return `<g transform="rotate(-25)"><ellipse rx="6.5" ry="13" fill="#ffd43b" stroke="#f59f00" stroke-width="1.6"/><path d="M-7 8 Q-9 -6 -2 -12 M7 8 Q9 -6 2 -12" stroke="#94d82d" stroke-width="3" fill="none"/></g>`;
      case 'eggplant': return `<g transform="rotate(-20)"><path d="M0 -10 Q-9 -6 -8 6 Q-4 16 0 16 Q7 16 8 6 Q9 -6 0 -10Z" fill="#9c36b5" stroke="#5f3dc4" stroke-width="1.6"/><path d="M-5 -10 L0 -14 L5 -10 L0 -6Z" fill="#40c057"/></g>`;
      case 'sunflower': return `${[...Array(12)].map((_, i) => `<ellipse cx="0" cy="-9" rx="3.5" ry="6" fill="#ffd43b" stroke="#f59f00" stroke-width="1" transform="rotate(${i * 30})"/>`).join('')}<circle r="7" fill="#8a5a2b"/>`;
      case 'pumpkin': return `<g stroke="#d9480f" stroke-width="1.6"><ellipse cx="-6" cy="2" rx="8" ry="10" fill="#ff922b"/><ellipse cx="6" cy="2" rx="8" ry="10" fill="#ff922b"/><ellipse cx="0" cy="1" rx="7" ry="11" fill="#ffa94d"/></g><path d="M0 -10 Q2 -15 6 -15" stroke="#5c940d" stroke-width="3" fill="none"/>`;
      case 'watermelon': return `<path d="M-14 -2 A14 14 0 0 0 14 -2Z" fill="#ff6b6b" stroke="#2b8a3e" stroke-width="3"/><g fill="#212529"><circle cx="-6" cy="2" r="1.3"/><circle cx="0" cy="4" r="1.3"/><circle cx="6" cy="2" r="1.3"/></g>`;
      case 'grape': return `${[[0, -8], [-5, -3], [5, -3], [-7, 3], [0, 3], [7, 3], [-3, 9], [3, 9], [0, 14]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="4" fill="#9c36b5" stroke="#5f3dc4" stroke-width="1"/>`).join('')}<path d="M0 -12 Q4 -16 8 -14" stroke="#2f9e44" stroke-width="2.5" fill="none"/>`;
    }
    return '';
  }
  const bugArt = `<g class="fbug"><ellipse cx="0" cy="0" rx="6" ry="5" fill="#fa5252" stroke="#c92a2a" stroke-width="1.2"/><path d="M0 -5 V5" stroke="#212529" stroke-width="1.2"/><circle cx="-2.5" cy="-1" r="1.3" fill="#212529"/><circle cx="2.5" cy="1.5" r="1.3" fill="#212529"/><circle cx="0" cy="-6" r="2.8" fill="#212529"/><circle cx="-1" cy="-6.6" r=".8" fill="#fff"/><circle cx="1.2" cy="-6.6" r=".8" fill="#fff"/></g>`;
  const weedArt = `<g fill="#5c940d" stroke="#2b8a3e" stroke-width="1"><path d="M0 0 Q-8 -6 -7 -14 Q-2 -8 0 0Z"/><path d="M0 0 Q8 -6 7 -14 Q2 -8 0 0Z"/><path d="M0 0 Q-2 -12 1 -18 Q3 -10 0 0Z"/></g>`;

  /* 農場上的建築、樹、池塘（原點＝底部中間） */
  const sh = (rx = 24) => `<ellipse cx="0" cy="-2" rx="${rx}" ry="${rx * .3}" fill="#000" opacity=".13"/>`;
  function house() {
    return sh(46) + `<path d="M-40 -2 L-40 -46 L0 -60 L40 -46 L40 -2 L0 12Z" fill="#fff4e6" stroke="#c9a27a" stroke-width="2"/><path d="M0 12 V-60" stroke="#e8d2b5" stroke-width="2"/><path d="M0 12 L40 -2 L40 -46 L0 -32Z" fill="#ffe8cc"/>
      <path d="M-48 -42 L0 -96 L48 -42 L0 -28Z" fill="#ff6b6b" stroke="#c92a2a" stroke-width="2.4" stroke-linejoin="round"/><path d="M0 -96 L48 -42 L0 -28Z" fill="#fa5252"/>${[-30, -18, -6, 6, 18, 30].map(x => `<path d="M${x} ${-42 - (40 - Math.abs(x)) * .28} L${x} ${-34 - (40 - Math.abs(x)) * .1}" stroke="#e03131" stroke-width="1.4" opacity=".6"/>`).join('')}
      <rect x="20" y="-104" width="10" height="22" fill="#adb5bd" stroke="#868e96" stroke-width="2"/><g class="fsmk" fill="#f1f3f5"><circle cx="25" cy="-112" r="5"/><circle cx="30" cy="-122" r="6"/><circle cx="26" cy="-134" r="7"/></g>
      <path d="M-22 4 L-22 -22 Q-14 -30 -6 -22 L-6 -2Z" fill="#a8743a" stroke="#7a4f22" stroke-width="2"/><circle cx="-10" cy="-10" r="1.6" fill="#ffd43b"/>
      <path d="M-36 -24 L-28 -26 L-28 -38 L-36 -36Z" fill="#a5d8ff" stroke="#c9a27a" stroke-width="1.6"/><path d="M10 -20 L26 -26 L26 -40 L10 -34Z" fill="#a5d8ff" stroke="#c9a27a" stroke-width="1.6"/><path d="M18 -23 V-37 M10 -27 L26 -33" stroke="#c9a27a" stroke-width="1.2"/>
      <g transform="translate(-30 -2)"><ellipse rx="8" ry="3" fill="#69db7c"/><circle cx="-4" cy="-4" r="3" fill="#ff8fab"/><circle cx="3" cy="-5" r="3" fill="#ffd43b"/></g>`;
  }
  function barn() {
    return sh(42) + `<path d="M-36 -2 L-36 -50 L0 -62 L36 -50 L36 -2 L0 10Z" fill="#e03131" stroke="#a51111" stroke-width="2"/><path d="M0 10 L36 -2 L36 -50 L0 -38Z" fill="#c92a2a"/>
      <path d="M-42 -46 L-18 -82 L18 -94 L42 -58 L36 -50 L0 -62 L-36 -50Z" fill="#fff4e6" stroke="#c9a27a" stroke-width="2" stroke-linejoin="round"/><path d="M0 -62 L18 -94 L42 -58Z" fill="#ffe8cc" stroke="#c9a27a" stroke-width="2"/>
      <path d="M-24 2 L-24 -30 L-4 -36 L-4 -4Z" fill="#fff4e6" stroke="#a51111" stroke-width="2"/><path d="M-24 -30 L-4 -4 M-24 2 L-4 -36" stroke="#e03131" stroke-width="2.2"/>
      <circle cx="-14" cy="-50" r="6" fill="#ffe066" stroke="#e67700" stroke-width="1.6"/><text x="-14" y="-47" text-anchor="middle" font-size="7" font-weight="900" fill="#e67700">倉</text>`;
  }
  const tree = (s = 1) => `<g transform="scale(${s})">${sh(18)}<rect x="-4" y="-26" width="8" height="26" rx="3" fill="#a8743a" stroke="#7a4f22" stroke-width="2"/><g stroke="#2f9e44" stroke-width="2"><circle cx="-11" cy="-32" r="13" fill="#51cf66"/><circle cx="11" cy="-32" r="13" fill="#51cf66"/><circle cx="0" cy="-44" r="16" fill="#69db7c"/></g><circle cx="-5" cy="-50" r="5" fill="#fff" opacity=".35"/><circle cx="6" cy="-36" r="2.6" fill="#ff6b6b"/><circle cx="-9" cy="-28" r="2.6" fill="#ff6b6b"/><circle cx="10" cy="-26" r="2.4" fill="#ff6b6b"/></g>`;
  const pine = (s = 1) => `<g transform="scale(${s})">${sh(14)}<rect x="-3" y="-14" width="6" height="12" fill="#a8743a"/><g fill="#2f9e44" stroke="#1b7a33" stroke-width="2" stroke-linejoin="round"><path d="M-18 -12 L0 -36 L18 -12Z"/><path d="M-14 -28 L0 -50 L14 -28Z"/><path d="M-10 -42 L0 -60 L10 -42Z"/></g></g>`;
  const scarecrow = () => sh(14) + `<path d="M0 0 V-44 M-18 -30 H18" stroke="#a8743a" stroke-width="3.5" stroke-linecap="round"/><path d="M-12 -32 L12 -32 L10 -14 L-10 -14Z" fill="#4dabf7" stroke="#1c7ed6" stroke-width="1.6"/><path d="M-4 -32 L0 -20 L4 -32" fill="#ff922b"/><circle cx="0" cy="-42" r="8" fill="#ffe8a1" stroke="#c9a227" stroke-width="1.6"/><circle cx="-3" cy="-43" r="1.3" fill="#495057"/><circle cx="3" cy="-43" r="1.3" fill="#495057"/><path d="M-3 -38 Q0 -36 3 -38" stroke="#495057" stroke-width="1.2" fill="none"/><path d="M-13 -48 L13 -48 L8 -56 L-8 -56Z" fill="#e8b65a" stroke="#a8743a" stroke-width="1.6"/><path d="M-18 -30 l-4 4 M18 -30 l4 4" stroke="#ffe066" stroke-width="2.5" stroke-linecap="round"/>`;
  const flowerTuft = c => `<path d="M0 0 V-6" stroke="#2f9e44" stroke-width="1.4"/><circle cx="0" cy="-7" r="2.6" fill="${c}"/><circle cx="0" cy="-7" r="1" fill="#fff3bf"/>`;
  const grassTuft = `<path d="M-3 0 Q-4 -5 -6 -7 M0 0 Q0 -6 1 -9 M3 0 Q4 -5 6 -6" stroke="#40c057" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;

  /* 整個農場：F＝農場資料，o.mini 縮圖、o.vis 拜訪同學（顯示能幫忙的） */
  function farmSVG(F, o = {}) {
    const lv = lvOf(F.xp).lv, open = plotsFor(lv), out = [], items = [];
    const [lx, ly] = iso(0, FH), [bx, by] = iso(FW, FH), [rx, ry] = iso(FW, 0), D = 34;
    /* 天空 */
    const x0 = lx - 24, w = rx - lx + 48, y0 = -140, h = by + D + 46 - y0;
    if (!o.mini) out.push(`<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="url(#fsky)"/><circle cx="${x0 + w - 70}" cy="${y0 + 55}" r="26" fill="#ffe066"/><circle cx="${x0 + w - 70}" cy="${y0 + 55}" r="42" fill="#ffe066" opacity=".22"/>
      <g class="fcl" fill="#fff" opacity=".92"><g><circle cx="${x0 + 80}" cy="${y0 + 50}" r="15"/><circle cx="${x0 + 100}" cy="${y0 + 42}" r="20"/><circle cx="${x0 + 122}" cy="${y0 + 52}" r="14"/></g><g><circle cx="${x0 + w * .45}" cy="${y0 + 28}" r="11"/><circle cx="${x0 + w * .45 + 16}" cy="${y0 + 22}" r="14"/><circle cx="${x0 + w * .45 + 32}" cy="${y0 + 30}" r="10"/></g></g>
      <path d="M${x0} ${ly + 30} Q${x0 + w * .3} ${ly - 10} ${x0 + w * .55} ${ly + 20} T${x0 + w} ${ly} V${y0 + h} H${x0}Z" fill="#d3f9d8" opacity=".7"/>`);
    /* 島：土的側面、草地 */
    out.push(`<path d="M${lx} ${ly} L${bx} ${by} L${bx} ${by + D} L${(lx + bx) / 2} ${(ly + by) / 2 + D + 20} L${lx} ${ly + D}Z" fill="url(#fdL)"/><path d="M${bx} ${by} L${rx} ${ry} L${rx} ${ry + D} L${(rx + bx) / 2} ${(ry + by) / 2 + D + 20} L${bx} ${by + D}Z" fill="url(#fdR)"/>`);
    out.push(`<path d="M${lx} ${ly + 12} L${bx} ${by + 12} L${rx} ${ry + 12}" stroke="#8a5a2b" stroke-width="3" fill="none" opacity=".3"/>`);
    out.push(`<polygon points="${pts([iso(0, 0), iso(FW, 0), iso(FW, FH), iso(0, FH)])}" fill="url(#fgr)" stroke="#51cf66" stroke-width="4" stroke-linejoin="round"/>`);
    /* 小路（從農舍到田） */
    out.push(`<polygon points="${pts([iso(120, 150), iso(150, 150), iso(150, 470), iso(120, 470)])}" fill="#f2d7a7" opacity=".9"/><polygon points="${pts([iso(120, 142), iso(OX + COLS * (PS + GAP), 142), iso(OX + COLS * (PS + GAP), 164), iso(120, 164)])}" fill="#f2d7a7" opacity=".9"/>`);
    /* 草地上的小草、小花（每座農場固定） */
    if (!o.mini) for (let i = 0; i < 46; i++) { const x = hash(i * 13 + 1) * FW, y = hash(i * 17 + 5) * FH; if (x > OX - 10 && x < OX + COLS * (PS + GAP) && y > OY - 10 && y < OY + ROWS * (PS + GAP)) continue; const [X, Y] = iso(x, y); out.push(`<g transform="translate(${X} ${Y}) scale(1.4)">${i % 3 ? grassTuft : flowerTuft(['#ff8fab', '#ffd43b', '#b197fc', '#fff'][i % 4])}</g>`); }
    /* 池塘 */
    const pond = [iso(30, 410), iso(130, 410), iso(130, 500), iso(30, 500)];
    out.push(`<g><ellipse cx="${(pond[0][0] + pond[2][0]) / 2}" cy="${(pond[0][1] + pond[2][1]) / 2}" rx="50" ry="24" fill="#74c0fc" stroke="#e9ecef" stroke-width="5"/><ellipse cx="${(pond[0][0] + pond[2][0]) / 2 - 10}" cy="${(pond[0][1] + pond[2][1]) / 2 - 4}" rx="22" ry="7" fill="#fff" opacity=".35"/><g fill="#51cf66"><ellipse cx="${(pond[0][0] + pond[2][0]) / 2 + 18}" cy="${(pond[0][1] + pond[2][1]) / 2 + 6}" rx="8" ry="4"/><ellipse cx="${(pond[0][0] + pond[2][0]) / 2 - 22}" cy="${(pond[0][1] + pond[2][1]) / 2 + 8}" rx="7" ry="3.5"/></g><circle cx="${(pond[0][0] + pond[2][0]) / 2 + 18}" cy="${(pond[0][1] + pond[2][1]) / 2 + 3}" r="2.6" fill="#ff8fab"/>
      <g class="fduck" transform="translate(${(pond[0][0] + pond[2][0]) / 2 - 4} ${(pond[0][1] + pond[2][1]) / 2})"><ellipse cx="0" cy="0" rx="8" ry="5" fill="#fff" stroke="#adb5bd" stroke-width="1"/><circle cx="6" cy="-6" r="4" fill="#fff" stroke="#adb5bd" stroke-width="1"/><path d="M9 -6 l4 1 l-4 1Z" fill="#ff922b"/><circle cx="7" cy="-7" r=".9" fill="#212529"/></g></g>`);
    /* 田 */
    for (let k = 0; k < MAXP; k++) {
      const [x, y] = plotXY(k), lock = k >= open, P = F.p && F.p[k], S = lock ? null : stat(P);
      const top = [iso(x, y, 5), iso(x + PS, y, 5), iso(x + PS, y + PS, 5), iso(x, y + PS, 5)], sideL = [iso(x, y + PS, 5), iso(x + PS, y + PS, 5), iso(x + PS, y + PS, 0), iso(x, y + PS, 0)], sideR = [iso(x + PS, y, 5), iso(x + PS, y + PS, 5), iso(x + PS, y + PS, 0), iso(x + PS, y, 0)];
      const [cx, cy] = iso(x + PS / 2, y + PS / 2, 5), d = (x + y) / 70;
      if (lock) {
        items.push({ d, html: `<g data-k="${k}" class="flock"><polygon points="${pts(top)}" fill="#8ce99a" stroke="#69db7c" stroke-width="1.5" stroke-dasharray="5 4"/><g transform="translate(${cx} ${cy + 4}) scale(1.3)"><path d="M0 0 V-22" stroke="#a8743a" stroke-width="3"/><rect x="-15" y="-34" width="30" height="16" rx="3" fill="#e0ad73" stroke="#a8743a" stroke-width="1.6"/><text y="-22.5" text-anchor="middle" font-size="9" font-weight="900" fill="#7a4f22">🔒Lv${k >= 10 ? 7 : k >= 8 ? 5 : 3}</text></g></g>` });
        continue;
      }
      const wet = S && !S.empty && !S.thirsty, soil = wet ? ['#8a5a2b', '#6e4522', '#5c3a1c'] : ['#c9935b', '#a8703a', '#8a5a2b'];
      let g = `<polygon points="${pts(sideL)}" fill="${soil[1]}"/><polygon points="${pts(sideR)}" fill="${soil[2]}"/><polygon points="${pts(top)}" fill="${soil[0]}" stroke="${wet ? '#5c3a1c' : '#8a5a2b'}" stroke-width="1.5"/>`;
      for (const a of [.25, .5, .75]) { const p1 = iso(x + 5, y + PS * a, 5), p2 = iso(x + PS - 5, y + PS * a, 5); g += `<path d="M${p1.join(' ')} L${p2.join(' ')}" stroke="${wet ? '#5c3a1c' : '#8a5a2b'}" stroke-width="2.2" opacity=".55" stroke-linecap="round"/>`; }
      if (S.thirsty && !S.empty) g += `<path d="M${iso(x + 14, y + 18, 5).join(' ')} l6 3 l-2 5 M${iso(x + 38, y + 40, 5).join(' ')} l-5 2 l3 4" stroke="#7a4f22" stroke-width="1.4" fill="none"/>`;
      let c = '';
      if (!S.empty) {
        c += `<g transform="translate(${cx} ${cy + 4}) scale(${CS * (S.stage === 3 ? 1.05 : .95)})" class="${S.ripe ? 'fripe' : ''}">${crop(P.c, S.stage)}</g>`;
        if (S.weed) c += `<g transform="translate(${iso(x + 14, y + PS - 12, 5).join(' ')}) scale(1.3)">${weedArt}</g><g transform="translate(${iso(x + PS - 12, y + 14, 5).join(' ')}) scale(1.1)">${weedArt}</g>`;
        if (S.bug) c += `<g transform="translate(${cx + 12} ${cy - 20}) scale(1.4)">${bugArt}</g>`;
        if (S.ripe) c += `<g class="fspark" transform="translate(${cx} ${cy - 44}) scale(1.4)"><path d="M-16 -6 l2 -5 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2Z M14 -14 l1.5 -4 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5Z" fill="#fff3bf" stroke="#fcc419" stroke-width="1"/></g>`;
        /* 頭上的小泡泡：口渴、可以收成、要幫忙 */
        const tag = S.ripe ? '✨' : S.thirsty ? '💧' : S.bug ? '🐛' : S.weed ? '🌿' : '';
        if (tag && !o.mini) c += `<g class="fbub" transform="translate(${cx} ${cy - (S.stage >= 2 ? 92 : 52)})"><path d="M-15 -15 H15 Q20 -15 20 -10 V8 Q20 13 15 13 H5 L0 20 L-5 13 H-15 Q-20 13 -20 8 V-10 Q-20 -15 -15 -15Z" fill="#fff" stroke="${S.ripe ? '#fcc419' : S.thirsty ? '#74c0fc' : '#ff8787'}" stroke-width="2.5"/><text y="5" text-anchor="middle" font-size="17">${tag}</text></g>`;
      }
      items.push({ d, html: `<g data-k="${k}" class="fplot">${g}${c}</g>` });
    }
    /* 建築、樹、稻草人、寵物 */
    const put = (x, y, html, s = 1) => { const [X, Y] = iso(x, y); items.push({ d: (x + y) / 70, html: `<g transform="translate(${X} ${Y}) scale(${s})" pointer-events="none">${html}</g>` }); };
    put(66, 250, house(), 1.15);
    if (!o.mini) items.push({ d: (520 + 70) / 70, html: `<g transform="translate(${iso(520, 70).join(' ')}) scale(1.1)" id="fbarn" class="fbarn">${barn()}</g>` }); else put(520, 70, barn(), 1.1);
    put(150, 40, tree(1.05)); put(250, 34, pine(1.05)); put(40, 60, pine(1.1)); put(40, 150, tree(1)); put(340, 40, tree(.95)); put(580, 250, tree(1.1)); put(580, 470, pine(1)); put(330, 500, tree(.95)); put(230, 500, pine(.9)); put(30, 320, tree(.95)); put(440, 40, tree(.9));
    put(OX - 34, OY + ROWS * (PS + GAP) + 20, scarecrow(), 1.2);
    if (o.pet) put(120, 360, `<svg x="-36" y="-70" width="72" height="72" viewBox="0 0 200 200" overflow="visible">${o.pet}</svg>`);
    /* 前面的圍籬 */
    for (let x = 10; x <= FW - 10; x += 34) put(x, FH - 6, `<path d="M0 0 V-18" stroke="#c98b4b" stroke-width="5" stroke-linecap="round"/><path d="M-2 -12 L22 -24" stroke="#e0ad73" stroke-width="3.5" opacity="${x < FW - 30 ? 1 : 0}"/>`);
    for (let y = 10; y <= FH - 10; y += 34) put(FW - 6, y, `<path d="M0 0 V-18" stroke="#c98b4b" stroke-width="5" stroke-linecap="round"/><path d="M2 -12 L-22 -24" stroke="#e0ad73" stroke-width="3.5" opacity="${y < FH - 30 ? 1 : 0}"/>`);
    items.sort((a, b) => a.d - b.d);
    out.push(items.map(i => i.html).join(''));
    if (!o.mini) out.push(`<g class="fbfly" pointer-events="none"><g transform="translate(${iso(400, 380).join(' ')})"><path d="M0 0 q-6 -8 -9 0 q3 6 9 0 q6 -8 9 0 q-3 6 -9 0" fill="#ffc9de" stroke="#f06595" stroke-width="1"/></g></g><g class="fbfly b2" pointer-events="none"><g transform="translate(${iso(200, 40).join(' ')})"><path d="M0 0 q-5 -7 -8 0 q3 5 8 0 q5 -7 8 0 q-3 5 -8 0" fill="#fff3bf" stroke="#fcc419" stroke-width="1"/></g></g><g id="ffx"></g>`);
    const defs = `<defs><linearGradient id="fsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3ff"/><stop offset=".75" stop-color="#e3f6ff"/><stop offset="1" stop-color="#f4fce3"/></linearGradient>
      <linearGradient id="fgr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a9e34b"/><stop offset=".5" stop-color="#8ce99a"/><stop offset="1" stop-color="#69db7c"/></linearGradient>
      <linearGradient id="fdL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9a066"/><stop offset="1" stop-color="#a86b34"/></linearGradient><linearGradient id="fdR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c08850"/><stop offset="1" stop-color="#8a5a2b"/></linearGradient></defs>`;
    let vb = o.mini ? `${lx - 10} -120 ${rx - lx + 20} ${by + D + 150}` : `${x0} ${y0} ${w} ${h}`;
    if (o.zoom && !o.mini) {   // 放大：只看田的部分（手機上比較好點）
      const ax = OX - 30, ay = OY - 30, bx2 = OX + COLS * (PS + GAP) + 10, by2 = OY + ROWS * (PS + GAP) + 10;
      const c = [iso(ax, ay), iso(bx2, ay), iso(bx2, by2), iso(ax, by2)], X1 = Math.min(...c.map(q => q[0])), X2 = Math.max(...c.map(q => q[0])), Y1 = Math.min(...c.map(q => q[1])) - 110, Y2 = Math.max(...c.map(q => q[1])) + 10;
      vb = `${X1} ${Y1} ${X2 - X1} ${Y2 - Y1}`;
    }
    return `<svg class="farm${o.mini ? ' mini' : ''}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${defs}${out.join('')}</svg>`;
  }

  /* ───────── 自己的資料 ───────── */
  function F() {
    if (!sum) return null;
    if (!sum.farm || !Array.isArray(sum.farm.p)) sum.farm = { xp: 0, water: START_WATER, fert: 1, p: Array(MAXP).fill(0), store: {}, log: [], u: Date.now() };
    const f = sum.farm; f.store = f.store || {}; f.log = f.log || []; while (f.p.length < MAXP) f.p.push(0);
    return f;
  }
  const coins = () => (PET.P() && PET.P().coin) || 0;
  function addCoin(n) { const p = PET.P(); if (!p) return; p.coin = Math.max(0, (p.coin || 0) + n); p.u = Date.now(); }
  let pubT = 0;
  function save() {
    const f = F(); f.u = Date.now(); saveSum(true);
    clearTimeout(pubT); pubT = setTimeout(() => { if (!user) return; const f = F(); enqueue(`${ROOT}/farm/${user.seat}`, { xp: f.xp | 0, p: f.p.map(x => x || 0), t: Date.now() }, true); }, 1000);
  }
  function addXp(n) {
    const f = F(), b = lvOf(f.xp).lv; f.xp = (f.xp || 0) + n; const a = lvOf(f.xp).lv;
    if (a > b) setTimeout(() => {
      const un = CK.filter(k => CROPS[k].lv > b && CROPS[k].lv <= a).map(k => CROPS[k].n), more = plotsFor(a) - plotsFor(b);
      toast(`🎉 農場升到 Lv.${a}！` + (un.length ? `可以種：${un.join('、')}` : '') + (more ? `　多了 ${more} 塊田！` : '')); try { sfx.ticket(); confetti(60); } catch (e) { }
    }, 600);
  }
  const logAdd = t => { const f = F(); f.log.unshift({ t: Date.now(), m: t }); f.log = f.log.slice(0, 20); };

  /* 練習答對：💧 +1（learn.html 的 finish 會呼叫） */
  function gain(res) {
    if (res !== 'ok' && res !== 'ok2') return 0; const f = F(); if (!f) return 0;
    if ((f.water || 0) >= WATER_MAX) return 0;
    f.water = (f.water || 0) + 1; if (round) round.fw = (round.fw || 0) + 1; return 1;
  }
  /* 一輪練完：10 題答對 8 題送肥料 */
  function endRound(first, N) {
    const f = F(); if (!f) return '';
    let fert = 0; if (N >= 10 && first >= 8) { f.fert = (f.fert || 0) + 1; fert = 1; saveSum(true); }
    const w = round && round.fw || 0; if (!w && !fert) return '';
    return `<div class="tkget farmend">🌾 農場：💧 拿到 ${w} 滴水${fert ? '・🧪 拿到 1 包肥料！' : ''}</div>`;
  }

  /* ───────── 我的農場 ───────── */
  let curK = -1, tickT = 0;
  const zoomOn = () => LS.get('learn601_fzoom', innerWidth < 760), zoomSet = v => LS.set('learn601_fzoom', v);   // 手機預設放大
  function page(C) {
    const f = F(), L = lvOf(f.xp);
    C.innerHTML = `<div class="fhead"><div class="flv"><b>🌾 我的農場 Lv.${L.lv}</b><div class="pbar s"><i style="width:${L.cur / L.need * 100}%;background:linear-gradient(90deg,#a9e34b,#74b816)"></i></div><small>經驗 ${L.cur} / ${L.need}</small></div>
        <div class="fres"><span title="水（練習答對 1 題 +1）">💧 <b id="fwater">${f.water || 0}</b></span><span title="肥料（10 題答對 8 題送 1 包）">🧪 <b id="ffert">${f.fert || 0}</b></span><span>🪙 <b id="fcoin">${coins()}</b></span></div></div>
      ${night() ? '<div class="fnight">🌙 晚上 9 點到早上 6 點農場休息，作物會繼續長大，明天早上再來照顧吧！</div>' : ''}
      <div class="fbox" id="fbox"></div><div class="fbar" id="fbar"></div><div class="finfo" id="finfo">👆 點空的田可以種菜；點 💧 的田澆水、點 ✨ 的田收成</div>
      <div class="frow2"><div class="cd fstore" id="fstore"></div><div class="cd flog" id="flog"></div></div>`;
    paint(); paintBar(); paintStore(); paintLog();
    C.querySelector('#fbox').addEventListener('pointerdown', e => {
      if (e.target.closest('#fbarn')) { e.preventDefault(); return storeModal(); }
      const g = e.target.closest('[data-k]'); if (!g) return; e.preventDefault(); tapPlot(+g.dataset.k);
    });
    clearInterval(tickT); tickT = setInterval(() => { if (!document.getElementById('fbox')) return clearInterval(tickT); paint(); if (curK >= 0) info(curK); }, 15000);
    applyInbox();
  }
  function paint() {
    const box = document.getElementById('fbox'); if (!box) return; const p = PET.P();
    box.innerHTML = farmSVG(F(), { zoom: zoomOn(), pet: p && p.st === 'pet' ? PET.petSVG(PET.look(p, { mood: PET.moodOf(p) })) : null });
    const q = id => document.getElementById(id), f = F();
    if (q('fwater')) { q('fwater').textContent = f.water || 0; q('ffert').textContent = f.fert || 0; q('fcoin').textContent = coins(); }
  }
  function paintBar() {
    const B = document.getElementById('fbar'); if (!B) return; B.innerHTML = '';
    [['all', '🧺 全部收成'], ['water', '💧 全部澆水'], ['store', '🏠 倉庫'], ['seed', '🌱 種子一覽'], ['zoom', zoomOn() ? '🔍 看整個農場' : '🔍 放大田地']].forEach(([k, n]) => { const b = el('button', 'fbtn', n); tap(b, () => k === 'all' ? harvestAll() : k === 'water' ? waterAll() : k === 'store' ? storeModal() : k === 'zoom' ? (zoomSet(!zoomOn()), paint(), paintBar()) : seedModal(-1)); B.appendChild(b); });
  }
  function info(k) {
    const e = document.getElementById('finfo'); if (!e) return; const f = F(), P = f.p[k], S = stat(P);
    if (k >= plotsFor(lvOf(f.xp).lv)) { e.innerHTML = `🔒 農場升到 Lv.${k >= 10 ? 7 : k >= 8 ? 5 : 3} 就能用這塊田`; return; }
    if (S.empty) { e.innerHTML = '這塊田是空的，點一下就能種菜'; return; }
    e.innerHTML = `<b>${S.C.n}</b>　${S.ripe ? '✨ 可以收成了！' : `還要 ${mmss(S.left)}${S.thirsty ? '・💧 口渴了，要澆水才會繼續長' : ''}`}${S.weed ? '・🌿 有雜草' : ''}${S.bug ? '・🐛 有蟲' : ''}　<small>預計收成 ${S.yieldN} 個${P.s ? `（被同學摘走 ${P.s} 個）` : ''}</small>
      ${!S.ripe && !P.fz && (F().fert || 0) > 0 ? ' <button class="fmini" id="fuse">🧪 施肥（剩下的時間減半）</button>' : ''}`;
    const b = document.getElementById('fuse'); if (b) tap(b, () => fertilize(k));
  }
  function tapPlot(k) {
    curK = k; const f = F();
    if (k >= plotsFor(lvOf(f.xp).lv)) { info(k); snd(300); return; }
    if (night()) { info(k); const e = document.getElementById('finfo'); if (e) e.innerHTML = '🌙 農場在休息，明天早上 6 點以後再來照顧'; return; }
    const P = f.p[k], S = stat(P);
    if (S.empty) return seedModal(k);
    if (S.bug) { P.b = 2; addXp(1); addCoin(1); fx(k, '🐛 捉到了！🪙+1'); snd(700); save(); paint(); return info(k); }
    if (S.weed) { P.g = 2; addXp(1); addCoin(1); fx(k, '🌿 拔掉了！🪙+1'); snd(650); save(); paint(); return info(k); }
    if (S.ripe) return harvest(k);
    if (S.thirsty) return water(k);
    info(k); snd(440);
  }
  function water(k, quiet) {
    const f = F(), P = f.p[k], S = stat(P); if (S.empty || S.ripe || !S.thirsty) return false;
    if ((f.water || 0) < 1) { if (!quiet) { const e = document.getElementById('finfo'); if (e) e.innerHTML = '💧 水用完了！<b>去練習</b>，每答對 1 題就有 1 滴水'; } return false; }
    f.water--; P.w = (P.w || 0) + 1; addXp(1); if (!quiet) { fx(k, '💧💧💧', 'water'); snd(600); save(); paint(); info(k); }
    return true;
  }
  function waterAll() {
    if (night()) return; const f = F(); let n = 0; for (let k = 0; k < plotsFor(lvOf(f.xp).lv); k++) if (water(k, true)) n++;
    const e = document.getElementById('finfo');
    if (n) { save(); paint(); snd(600); if (e) e.innerHTML = `💧 澆了 ${n} 塊田！`; } else if (e) e.innerHTML = (f.water || 0) < 1 ? '💧 水用完了！去練習，每答對 1 題就有 1 滴水' : '現在沒有口渴的田';
  }
  function harvest(k, quiet) {
    const f = F(), P = f.p[k], S = stat(P); if (!S.ripe) return 0;
    f.store[P.c] = (f.store[P.c] || 0) + S.yieldN; addXp(S.C.xp); f.p[k] = 0;
    if (!quiet) { fx(k, `${S.C.n} ×${S.yieldN}`, 'har', P.c); snd(880); setTimeout(() => snd(1100), 120); save(); paint(); paintStore(); info(k); }
    return S.yieldN;
  }
  function harvestAll() {
    if (night()) return; const f = F(); let n = 0; for (let k = 0; k < MAXP; k++) { const c = f.p[k] && f.p[k].c; const y = harvest(k, true); if (y) { n += y; fx(k, `+${y}`, 'har', c); } }
    const e = document.getElementById('finfo');
    if (n) { save(); paint(); paintStore(); snd(880); setTimeout(() => snd(1100), 120); try { confetti(30); } catch (x) { } if (e) e.innerHTML = `🧺 收成了 ${n} 個，都放進倉庫了！`; } else if (e) e.innerHTML = '還沒有成熟的作物';
  }
  function fertilize(k) {
    const f = F(), P = f.p[k], S = stat(P); if (S.empty || S.ripe || P.fz || (f.fert || 0) < 1) return;
    f.fert--; P.f = (P.f || 0) + Math.round(S.left / 2); P.fz = 1; addXp(1); fx(k, '🧪 長得更快了！', 'water'); snd(760); save(); paint(); info(k);
  }
  function plant(k, id) {
    const f = F(), C = CROPS[id]; if (coins() < C.p) { toast(`🪙 金幣不夠，${C.n}的種子要 ${C.p} 枚`); return false; }
    addCoin(-C.p); f.p[k] = { c: id, t: Date.now() + k, w: 0 }; addXp(1); return true;   // +k：同一秒種的田，蟲和雜草也不一樣
  }
  /* 小特效：在田上面跳出字 */
  function fx(k, text, cls, cropId) {
    const G = document.getElementById('ffx'); if (!G) return; const [x, y] = plotXY(k), [X, Y] = iso(x + PS / 2, y + PS / 2, 5);
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'ffx ' + (cls || '')); g.setAttribute('transform', `translate(${X} ${Y - 60})`);
    g.innerHTML = (cropId ? `<g transform="translate(0 -18) scale(1.1)">${produce(cropId)}</g>` : '') + `<text text-anchor="middle" font-size="18" font-weight="900" fill="${cls === 'water' ? '#1c7ed6' : '#e67700'}" stroke="#fff" stroke-width="4" paint-order="stroke">${text}</text>`;
    G.appendChild(g); setTimeout(() => g.remove(), 1500);
  }
  function modal(html) { const m = el('div', 'pmod', `<div class="pmc fmc">${html}</div>`); document.body.appendChild(m); tap(m, e => { if (e.target === m) m.remove(); }); return m; }
  function seedModal(k) {
    const f = F(), lv = lvOf(f.xp).lv, empty = f.p.slice(0, plotsFor(lv)).filter(x => !x).length;
    const m = modal(`<div class="pmh">🌱 ${k >= 0 ? '要種什麼？' : '種子一覽'}　<small>🪙 ${coins()}</small></div><div class="fseeds">${CK.map(id => { const C = CROPS[id], lock = lv < C.lv; return `<button data-c="${id}" class="${lock ? 'lock' : ''}"><svg viewBox="-30 -70 60 78">${crop(id, 3)}</svg><b>${C.n}</b><small>⏰ ${mmss(C.m * 60000)}・💧×${C.w}</small><small>收成 ${C.y} 個・一個賣 🪙${C.s}</small><em>${lock ? `🔒 農場 Lv.${C.lv}` : `種子 🪙 ${C.p}`}</em></button>`; }).join('')}</div>
      ${k >= 0 && empty > 1 ? `<label class="fall"><input type="checkbox" id="fallchk"> 空的田（${empty} 塊）全部種一樣的</label>` : ''}<button class="pmx">關閉</button>`);
    m.querySelectorAll('[data-c]').forEach(b => tap(b, () => {
      const id = b.dataset.c, C = CROPS[id]; if (lv < C.lv) { toast(`農場升到 Lv.${C.lv} 才能種${C.n}`); return; }
      if (k < 0) return;
      const all = m.querySelector('#fallchk') && m.querySelector('#fallchk').checked; let n = 0;
      if (all) { for (let i = 0; i < plotsFor(lv); i++) if (!f.p[i]) { if (!plant(i, id)) break; n++; } }
      else if (plant(k, id)) n = 1;
      if (n) { m.remove(); save(); paint(); snd(500); fx(k, `🌱 種了${n > 1 ? ` ${n} 塊` : ''}${C.n}`); info(k); }
    }));
    tap(m.querySelector('.pmx'), () => m.remove());
  }
  function storeModal() {
    const f = F(), list = CK.filter(id => f.store[id] > 0), tot = list.reduce((a, id) => a + f.store[id] * CROPS[id].s, 0);
    const m = modal(`<div class="pmh">🏠 倉庫　<small>🪙 ${coins()}</small></div>${list.length ? `<div class="fsto">${list.map(id => `<div class="fsi"><svg viewBox="-20 -22 40 42">${produce(id)}</svg><b>${CROPS[id].n} ×${f.store[id]}</b><small>一個 🪙${CROPS[id].s}</small><button data-s="${id}">賣 1 個</button><button data-a="${id}">全部賣</button></div>`).join('')}</div>
      <button class="go fsell" id="fsellall">💰 全部賣掉（🪙 ${tot}）</button>` : '<div class="ld">倉庫是空的，快去收成吧！</div>'}<button class="pmx">關閉</button>`);
    const sell = (id, n) => { n = Math.min(n, f.store[id] || 0); if (!n) return; f.store[id] -= n; if (!f.store[id]) delete f.store[id]; addCoin(n * CROPS[id].s); save(); try { sfx.ok(); } catch (e) { } m.remove(); storeModal(); paint(); paintStore(); };
    m.querySelectorAll('[data-s]').forEach(b => tap(b, () => sell(b.dataset.s, 1)));
    m.querySelectorAll('[data-a]').forEach(b => tap(b, () => sell(b.dataset.a, 999)));
    const all = m.querySelector('#fsellall'); if (all) tap(all, () => { list.forEach(id => { addCoin(f.store[id] * CROPS[id].s); delete f.store[id]; }); save(); try { sfx.ticket(); confetti(40); } catch (e) { } toast(`💰 賣了 ${tot} 枚金幣！`); m.remove(); paint(); paintStore(); });
    tap(m.querySelector('.pmx'), () => m.remove());
  }
  function paintStore() {
    const e = document.getElementById('fstore'); if (!e) return; const f = F(), list = CK.filter(id => f.store[id] > 0);
    e.innerHTML = `<div class="fst">🏠 倉庫</div>${list.length ? `<div class="fstl">${list.map(id => `<span><svg viewBox="-16 -18 32 34">${produce(id)}</svg>×${f.store[id]}</span>`).join('')}</div>` : '<div class="fsmall">還沒有東西，收成後會放在這裡</div>'}`;
    tap(e, storeModal);
  }
  function paintLog() {
    const e = document.getElementById('flog'); if (!e) return; const f = F();
    e.innerHTML = `<div class="fst">📬 農場消息</div>${f.log.length ? f.log.slice(0, 6).map(x => `<div class="flg">${x.m}<small>${ago(x.t)}</small></div>`).join('') : '<div class="fsmall">同學來幫忙或摘菜，會顯示在這裡</div>'}`;
  }
  const ago = t => { const m = Math.floor((Date.now() - t) / 60000); return m < 1 ? '剛剛' : m < 60 ? `${m} 分鐘前` : m < 1440 ? `${Math.floor(m / 60)} 小時前` : `${Math.floor(m / 1440)} 天前`; };
  function snd(f) { try { if (typeof tone === 'function' && sndOn) tone(f, .07, 'triangle', .06); } catch (e) { } }

  /* ───────── 同學做的事：主人打開農場時算進去 ───────── */
  async function applyInbox() {
    await fbReady; if (!db || !online || !user) return; let v = null;
    try { v = (await timeout(db.ref(`${ROOT}/farmact/${user.seat}`).get(), 8000)).val(); } catch (e) { return; }
    if (!v) return; const f = F(); let changed = 0;
    for (const [id, a] of Object.entries(v)) {
      const P = f.p[a.k]; const ok = P && P.c && P.t === a.pt;
      if (ok) {
        const S = stat(P), who = seatName(a.f);
        if (a.a === 'w' && (P.w || 0) < S.C.w) { P.w = (P.w || 0) + 1; logAdd(`💧 ${who}幫你的${S.C.n}澆水`); changed++; }
        else if (a.a === 'g' && S.weed) { P.g = 2; logAdd(`🌿 ${who}幫你的${S.C.n}拔雜草`); changed++; }
        else if (a.a === 'b' && S.bug) { P.b = 2; logAdd(`🐛 ${who}幫你的${S.C.n}捉蟲`); changed++; }
        else if (a.a === 's' && (P.s || 0) < STEAL_PER_PLOT) { P.s = (P.s || 0) + 1; logAdd(`😝 ${who}偷摘了 1 個${S.C.n}`); changed++; }
      }
      try { db.ref(`${ROOT}/farmact/${user.seat}/${id}`).remove(); } catch (e) { }
    }
    if (changed) { save(); paint(); paintLog(); toast(`📬 有 ${changed} 則農場消息`); }
  }

  /* ───────── 拜訪同學的農場 ───────── */
  let VC = null;
  async function loadFarms() {
    if (VC && Date.now() - VC.at < 20000) return VC;
    await fbReady; let v = null, pets = null;
    if (db && online) { try { const [a, b] = await Promise.all([db.ref(`${ROOT}/farm`).get(), db.ref(`${ROOT}/pet`).get()].map(x => timeout(x, 8000))); v = a.val() || {}; pets = b.val() || {}; } catch (e) { } }
    VC = { at: Date.now(), ok: !!v, v: v || {}, pets: pets || {} }; return VC;
  }
  const normFarm = x => ({ xp: (x && x.xp) | 0, p: Array.from({ length: MAXP }, (_, k) => (x && x.p && x.p[k]) || 0) });
  async function visitList(C) {
    C.innerHTML = '<div class="ld">讀取中…</div>';
    const R = await loadFarms(); if (!C.isConnected) return;
    if (!R.ok) { C.innerHTML = '<div class="ld">📴 連上網路才看得到同學的農場</div>'; return; }
    const seats = [...SEATS.flat(), ...(isTest(user.seat) ? TEST_SEATS : [])].filter(s => s !== user.seat);
    const cards = seats.map(s => { const x = R.v[s]; if (!x) return null; const Fm = normFarm(x); let help = 0, ripe = 0; Fm.p.forEach(P => { const S = stat(P); if (S.empty) return; if (S.thirsty || S.weed || S.bug) help++; if (S.ripe && (P.s || 0) < STEAL_PER_PLOT) ripe++; }); return { s, Fm, help, ripe, lv: lvOf(Fm.xp).lv }; }).filter(Boolean)
      .sort((a, b) => (b.help + b.ripe) - (a.help + a.ripe) || a.s - b.s);
    const f = F(), today = dkey(), hc = f.hd === today ? f.hc || 0 : 0;
    C.innerHTML = `<div class="fvhead">👫 去同學的農場幫忙：澆水、除草、捉蟲，每次 🪙+1（今天還能拿 ${Math.max(0, HELP_COIN_MAX - hc)} 枚）。成熟的菜可以偷摘 1 個 😝</div>
      ${cards.length ? `<div class="fvg">${cards.map(c => `<button data-s="${c.s}"><img alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(farmSVG(c.Fm, { mini: 1 }))}"><b>${seatName(c.s)}　<small>Lv.${c.lv}</small></b><span>${c.help ? `<i class="h">🙋 可以幫忙 ${c.help}</i>` : ''}${c.ripe ? `<i class="r">✨ 成熟 ${c.ripe}</i>` : ''}${!c.help && !c.ripe ? '<i>一切都好</i>' : ''}</span></button>`).join('')}</div>` : '<div class="ld">同學們還沒開始種菜，邀請大家一起來吧！</div>'}`;
    C.querySelectorAll('[data-s]').forEach(b => tap(b, () => visit(+b.dataset.s)));
  }
  async function visit(s) {
    const R = await loadFarms(); const Fm = normFarm(R.v[s]), pv = R.pets[s];
    let inbox = {}; try { inbox = (await timeout(db.ref(`${ROOT}/farmact/${s}`).get(), 8000)).val() || {}; } catch (e) { }
    /* 已經有人幫過（主人還沒打開）也先算進去，畫面才會對 */
    const mine = new Set();
    for (const [id, a] of Object.entries(inbox)) { const P = Fm.p[a.k]; if (!P || P.t !== a.pt) continue; if (a.a === 'w') P.w = (P.w || 0) + 1; if (a.a === 'g') P.g = 2; if (a.a === 'b') P.b = 2; if (a.a === 's') P.s = (P.s || 0) + 1; if (a.f === user.seat) mine.add(a.k + a.a); }
    const m = modal(`<div class="pmh">🌾 ${seatName(s)}的農場　<small>Lv.${lvOf(Fm.xp).lv}</small></div><div class="fbox vis" id="fvbox"></div><div class="finfo" id="fvinfo">👆 點有 💧🌿🐛 的田幫忙，點 ✨ 的田偷摘 1 個</div><div class="fres c"><span>💧 <b id="fvw">${F().water || 0}</b></span><span>🪙 <b id="fvc">${coins()}</b></span></div><button class="pmx">回去</button>`);
    const paintV = () => { m.querySelector('#fvbox').innerHTML = farmSVG(Fm, { pet: pv && PET.SPECIES[pv.sp] ? PET.petSVG(Object.assign({}, pv, { mood: 'happy' })) : null }); m.querySelector('#fvw').textContent = F().water || 0; m.querySelector('#fvc').textContent = coins(); };
    paintV();
    const msg = t => m.querySelector('#fvinfo').innerHTML = t;
    m.querySelector('#fvbox').addEventListener('pointerdown', e => {
      const g = e.target.closest('[data-k]'); if (!g) return; e.preventDefault(); const k = +g.dataset.k, P = Fm.p[k], S = stat(P);
      if (night()) return msg('🌙 晚上農場在休息，明天再來吧');
      if (S.empty) return msg('這塊田是空的');
      const act = S.bug ? 'b' : S.weed ? 'g' : S.thirsty ? 'w' : S.ripe ? 's' : '';
      if (!act) return msg(`${S.C.n}：還要 ${mmss(S.left)}，現在不需要幫忙`);
      if (mine.has(k + act)) return msg('你已經幫過這塊田了');
      const f = F(), today = dkey(); if (f.hd !== today) { f.hd = today; f.hc = 0; f.tk = 0; }
      if (act === 'w' && (f.water || 0) < 1) return msg('💧 你的水用完了，去練習拿水吧！');
      if (act === 's') { if ((P.s || 0) >= STEAL_PER_PLOT) return msg('這塊田已經被摘太多了，留一點給主人吧！'); if ((f.tk || 0) >= TAKE_MAX) return msg(`今天已經摘了 ${TAKE_MAX} 個，明天再來吧`); }
      const id = `${user.seat}_${k}_${act}_${P.t}`;
      enqueue(`${ROOT}/farmact/${s}/${id}`, { f: user.seat, a: act, k, pt: P.t, t: Date.now() });
      mine.add(k + act);
      if (act === 'w') { f.water--; P.w = (P.w || 0) + 1; }
      if (act === 'g') P.g = 2; if (act === 'b') P.b = 2;
      if (act === 's') { P.s = (P.s || 0) + 1; f.tk = (f.tk || 0) + 1; f.store[P.c] = (f.store[P.c] || 0) + 1; msg(`😝 偷摘了 1 個${S.C.n}，放進你的倉庫了！`); snd(900); }
      else { addXp(1); if ((f.hc || 0) < HELP_COIN_MAX) { f.hc = (f.hc || 0) + 1; addCoin(1); } msg(`${act === 'w' ? '💧 幫忙澆水' : act === 'g' ? '🌿 幫忙拔雜草' : '🐛 幫忙捉蟲'}了！謝謝你 ❤️${(f.hc || 0) <= HELP_COIN_MAX ? '　🪙+1' : ''}`); snd(700); }
      saveSum(true); paintV(); VC = null;
    });
    tap(m.querySelector('.pmx'), () => { m.remove(); if (view === 'park') render(); });
  }

  /* ───────── 首頁的小卡片 ───────── */
  function homeCard() {
    const f = F(), c = el('button', 'cd', ''); c.id = 'farmmini'; let ripe = 0, thirsty = 0, grow = 0;
    f.p.slice(0, plotsFor(lvOf(f.xp).lv)).forEach(P => { const S = stat(P); if (S.empty) return; if (S.ripe) ripe++; else if (S.thirsty) thirsty++; else grow++; });
    c.innerHTML = `<div class="fmv">${farmSVG(f, { mini: 1 })}</div><div class="fmi"><div class="fmt">🌾 我的農場 <small>Lv.${lvOf(f.xp).lv}</small></div><div class="fms">${ripe ? `✨ ${ripe} 塊田可以收成！` : thirsty ? `💧 ${thirsty} 塊田口渴了` : grow ? `🌱 ${grow} 塊田長大中` : '🌱 快去種菜吧！'}　💧 ${f.water || 0}</div></div><span class="pgo">▶</span>`;
    tap(c, () => { view = 'park'; if (window.PARK) PARK._mode('farm'); paintNavs(); render(); });
    return c;
  }

  /* ───────── 樣式 ───────── */
  const css = `
  .fhead{display:flex;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:.5rem}
  .flv{flex:1;min-width:12rem}.flv b{font-size:1.4rem;color:#5c940d;display:block}.flv small{font-size:.9rem;color:#888;font-weight:800}.flv .pbar{margin:.25rem 0 .1rem}
  .fres{display:flex;gap:.5rem;flex-wrap:wrap}.fres span{background:#fff;border:3px solid #e9ecef;border-radius:14px;padding:.2rem .7rem;font-size:1.25rem;font-weight:900;color:#495057}
  .fres.c{justify-content:center;margin:.4rem 0}
  .fnight{background:#e7e9ff;color:#5f3dc4;border-radius:14px;padding:.5rem .8rem;font-weight:900;margin-bottom:.5rem}
  .fbox{border-radius:22px;overflow:hidden;touch-action:manipulation;cursor:pointer;box-shadow:inset 0 0 0 3px #d3f9d8}
  .farm{display:block;width:100%;height:auto}
  .farm .fplot{cursor:pointer}.farm .fripe{animation:fripe 1.8s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
  @keyframes fripe{50%{transform:scale(1.06)}}
  .farm .fbub{animation:fbub 1.6s ease-in-out infinite}@keyframes fbub{50%{transform:translateY(-3px)}}.farm .fbub{transform-box:fill-box}
  .farm .fspark{animation:fspark 1.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes fspark{50%{opacity:.3}}
  .farm .fbug{animation:fbug .5s ease-in-out infinite alternate}@keyframes fbug{to{transform:translateX(2px) rotate(8deg)}}
  .farm .fsmk circle{animation:fsmk 3s ease-out infinite;opacity:0}.farm .fsmk circle:nth-child(2){animation-delay:1s}.farm .fsmk circle:nth-child(3){animation-delay:2s}
  @keyframes fsmk{0%{opacity:0;transform:translateY(6px)}30%{opacity:.8}100%{opacity:0;transform:translateY(-14px)}}
  .farm .fcl{animation:fcl 50s linear infinite}@keyframes fcl{50%{transform:translateX(50px)}}
  .farm .fduck{animation:fduck 6s ease-in-out infinite}@keyframes fduck{50%{transform:translate(12px,4px)}}
  .farm .fbfly{animation:fbfly 7s ease-in-out infinite}.farm .fbfly.b2{animation-duration:9s;animation-direction:reverse}@keyframes fbfly{25%{transform:translate(30px,-20px)}50%{transform:translate(60px,0)}75%{transform:translate(20px,15px)}}
  .farm .fbarn{cursor:pointer}
  .farm .ffx{animation:ffx 1.5s ease-out forwards}@keyframes ffx{0%{opacity:0;transform:translateY(8px) scale(.7)}20%{opacity:1;transform:translateY(0) scale(1.1)}100%{opacity:0;transform:translateY(-34px)}}
  .farm .ffx{transform-box:fill-box}
  .fbar{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.7rem}.fbtn{border:0;border-radius:16px;padding:.55rem 1rem;font-size:1.15rem;font-weight:900;background:#fff;color:#5c940d;box-shadow:0 4px 0 #d8f5a2;font-family:inherit}.fbtn:active{transform:translateY(3px);box-shadow:0 1px 0 #d8f5a2}
  .finfo{margin-top:.6rem;background:#f4fce3;border-radius:14px;padding:.55rem .8rem;font-size:1.1rem;font-weight:900;color:#5c940d;min-height:1.6rem}.finfo small{color:#888;font-size:.9rem}
  .fmini{border:0;background:#e5dbff;color:#5f3dc4;border-radius:12px;padding:.25rem .6rem;font-weight:900;font-family:inherit;font-size:1rem}
  .frow2{display:grid;grid-template-columns:1fr 1fr;gap:.7rem;margin-top:.7rem}.fst{font-size:1.15rem;font-weight:900;color:#666;margin-bottom:.3rem}
  .fstore{cursor:pointer}.fstl{display:flex;flex-wrap:wrap;gap:.3rem .7rem}.fstl span{display:flex;align-items:center;font-weight:900;color:#555}.fstl svg{width:1.7rem;height:1.7rem}
  .fsmall{font-size:.95rem;color:#999;font-weight:800}.flg{font-size:1rem;font-weight:800;color:#555;display:flex;justify-content:space-between;gap:.5rem}.flg small{color:#aaa;flex:none}
  .fmc{max-width:46rem}
  .fseeds{display:grid;grid-template-columns:repeat(auto-fill,minmax(7.6rem,1fr));gap:.55rem;margin-bottom:.7rem}
  .fseeds button{background:linear-gradient(180deg,#fff,#f4fce3);border:3px solid #d8f5a2;border-radius:18px;padding:.4rem .3rem;display:flex;flex-direction:column;align-items:center;font-family:inherit}
  .fseeds svg{width:4.2rem;height:5rem}.fseeds b{font-size:1.1rem;color:#444}.fseeds small{font-size:.8rem;color:#888;font-weight:800}.fseeds em{font-style:normal;font-weight:900;color:#e67700;font-size:.95rem;margin-top:.1rem}
  .fseeds button.lock{opacity:.5;filter:grayscale(.6)}.fseeds button:active{transform:scale(.95)}
  .fall{display:block;font-size:1.1rem;font-weight:900;color:#5c940d;margin-bottom:.6rem}.fall input{width:1.3rem;height:1.3rem;vertical-align:middle}
  .fsto{display:flex;flex-direction:column;gap:.4rem;margin-bottom:.7rem;text-align:left}.fsi{display:flex;align-items:center;gap:.6rem;background:#fff9db;border-radius:14px;padding:.35rem .6rem}
  .fsi svg{width:2.4rem;height:2.4rem;flex:none}.fsi b{flex:1;font-size:1.15rem}.fsi small{color:#888;font-weight:800}.fsi button{border:0;background:#ffe066;color:#e67700;border-radius:12px;padding:.35rem .7rem;font-weight:900;font-family:inherit}
  .fsell{font-size:1.3rem;margin-bottom:.4rem}
  .fvhead{font-size:1.05rem;font-weight:900;color:#5c940d;background:#f4fce3;border-radius:14px;padding:.55rem .8rem;margin-bottom:.7rem}
  .fvg{display:grid;grid-template-columns:repeat(auto-fill,minmax(10rem,1fr));gap:.7rem}
  .fvg button{background:#fff;border:0;border-radius:18px;box-shadow:0 4px 0 #d8f5a2;padding:.4rem;display:flex;flex-direction:column;align-items:center;font-family:inherit}
  .fvg img{width:100%;height:auto}.fvg b{font-size:1.1rem;color:#5c940d}.fvg b small{color:#888}.fvg span{display:flex;gap:.3rem;flex-wrap:wrap;justify-content:center;margin-top:.2rem}
  .fvg i{font-style:normal;font-size:.85rem;font-weight:900;border-radius:10px;padding:.1rem .45rem;background:#f1f3f5;color:#888}.fvg i.h{background:#e7f5ff;color:#1c7ed6}.fvg i.r{background:#fff9db;color:#e67700}
  .fbox.vis{max-width:40rem;margin:0 auto}
  #farmmini{display:flex;align-items:center;gap:.9rem;width:100%;margin-top:1rem;text-align:left;border:0;background:linear-gradient(135deg,#fff,#f4fce3);cursor:pointer;font-family:inherit}
  #farmmini .fmv{width:7.5rem;flex:none}#farmmini .fmi{flex:1;min-width:0}#farmmini .fmt{font-size:1.4rem;font-weight:900;color:#5c940d}#farmmini .fmt small{font-size:1rem;color:#94d82d}#farmmini .fms{font-size:1.05rem;color:#666;font-weight:800;margin-top:.2rem}#farmmini .pgo{font-size:1.6rem;color:#94d82d}
  .farmend{color:#5c940d}
  @media (max-width:700px){.frow2{grid-template-columns:1fr}.fseeds{grid-template-columns:repeat(auto-fill,minmax(6.4rem,1fr))}.fvg{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  window.FARM = { page, visitList, gain, endRound, homeCard, farmSVG, crop, produce, CROPS, stat, F, lvOf, plotsFor, applyInbox };
})();
