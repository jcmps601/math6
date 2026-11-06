/* 601 快樂農場（原創的種菜遊戲）
   ・自己的農場：一開始 6 塊田，農場升級最多 12 塊。買種子 → 種下去 → 澆水 → 等時間長大 → 收成放進倉庫 → 賣掉換金幣
   ・澆水的 💧 要靠練習：每答對 1 題 +1 💧；作物沒水就停在那裡不長。10 題答對 8 題送 1 包 🧴 肥料（剩下的時間減半）
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
  const COLS = 4, ROWS = 3, MAXP = COLS * ROWS, WATER_MAX = 30, START_WATER = 8, HELP_COIN_MAX = 10, TAKE_MAX = 3, STEAL_PER_PLOT = 1, STEAL_WAIT = 60 * 60000;
  /* 偷菜模式（自己選要不要參加）：兩個人都開才能互偷；一天只能切換一次；成熟 1 小時後才能被偷；每塊田最多被偷 1 個；每天最多偷 3 個；被偷的人拿到 🪙1 回禮 */
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
    const ripeAt = Math.max(P.t + G - (P.f || 0), P.wt || 0), stealOK = ripe && Date.now() - ripeAt >= STEAL_WAIT && (P.s || 0) < STEAL_PER_PLOT;   // 成熟 1 小時後才能被偷
    return { C, prog, ripe, thirsty, weed, bug, stage, left, yieldN, wNeed: C.w - (P.w || 0), stealOK, stealIn: ripe ? Math.max(0, STEAL_WAIT - (Date.now() - ripeAt)) : 0 };
  }
  const mmss = ms => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} 小時${m % 60 ? ` ${m % 60} 分` : ''}` : `${m} 分鐘`; };

  /* ───────── 畫畫：用 img/farm 裡的圖 ─────────
     背景 bg.webp（1536×1024）正中間的空草地放 4 × 3 塊田（等角視角）；作物 4 個階段、田地、蟲、雜草都是圖片 */
  const IMG = 'img/farm/', BGW = 1536, BGH = 1024, VB_FULL = [0, 0, BGW, BGH], VB_ZOOM = [350, 90, 880, 690], VB_MINI = [30, 20, 1476, 960];
  const CROPDIM = {"cabbage":[[190,94],[214,184],[441,383],[720,629]],"carrot":[[199,102],[209,210],[421,417],[748,632]],"strawberry":[[174,107],[210,222],[473,408],[724,638]],"tomato":[[239,120],[232,222],[387,479],[640,684]],"corn":[[129,84],[144,149],[280,340],[331,552]],"eggplant":[[160,86],[223,192],[378,400],[623,604]],"sunflower":[[176,119],[193,192],[285,443],[413,678]],"pumpkin":[[183,100],[215,198],[501,432],[709,556]],"watermelon":[[212,113],[234,220],[476,424],[738,611]],"grape":[[197,99],[212,211],[362,508],[651,678]]};   // 每張作物圖的原始大小（同一種作物 4 個階段同一個比例）
  const TW = 196, TH = .345, DX = TW / 2 / .94, DY = TW * TH / .94, CX = 790, CY = 495;   // 田的寬、上面菱形的一半高(÷寬)、間距、中心
  const plotC = k => { const c = k % COLS, r = (k / COLS) | 0; return [CX + ((c - 1.5) - (r - 1)) * DX, CY + ((c - 1.5) + (r - 1)) * DY]; };
  const cropK = id => { const d = CROPDIM[id][3]; return Math.min(TW * .74 / d[0], 190 / d[1]); };
  const cropBox = (id, st) => { const d = CROPDIM[id][st], k = cropK(id); return [d[0] * k, d[1] * k]; };
  const imgT = (href, x, y, w, h, cls) => `<image href="${href}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"${cls ? ` class="${cls}"` : ''} preserveAspectRatio="xMidYMid meet"/>`;
  /* 作物（給 SVG 用）：原點＝作物底部中間 */
  function crop(id, st) { const [w, h] = cropBox(id, st); return imgT(`${IMG}${id}-${st}.webp`, -w / 2, -h, w, h); }
  /* 收成的東西、作物小圖（給一般 HTML 用） */
  const produceImg = (id, cls) => `<img class="${cls || 'fpi'}" src="${IMG}pr-${id}.webp" alt="" draggable="false">`;
  const cropImg = (id, st, cls) => `<img class="${cls || 'fci'}" src="${IMG}${id}-${st == null ? 3 : st}.webp" alt="" draggable="false">`;
  const icon = (n, cls) => `<img class="${cls || 'fic'}" src="${IMG}ic-${n}.webp" alt="" draggable="false">`;
  function produce(id) { return `<image href="${IMG}pr-${id}.webp" x="-16" y="-16" width="32" height="32"/>`; }

  /* 整個農場：F＝農場資料；o.mini 縮圖、o.zoom 只看田、o.pet 寵物 SVG */
  function farmSVG(F, o = {}) {
    const lv = lvOf(F.xp).lv, open = plotsFor(lv), out = [];
    out.push(`<image href="${IMG}bg.webp" x="0" y="0" width="${BGW}" height="${BGH}" preserveAspectRatio="none"/>`);
    if (!o.mini) out.push(`<rect x="1040" y="40" width="350" height="275" fill="transparent" id="fbarn" class="fbarn"><title>倉庫</title></rect>`);   // 點倉庫
    /* 田：從後面畫到前面 */
    const order = [...Array(MAXP).keys()].sort((a, b) => (plotC(a)[1] - plotC(b)[1]) || (plotC(a)[0] - plotC(b)[0]));
    const tops = [];
    for (const k of order) {
      const [x, y] = plotC(k), lock = k >= open, P = F.p && F.p[k], S = lock ? null : stat(P);
      const dia = `${x},${y - TW * TH} ${x + TW / 2},${y} ${x},${y + TW * TH} ${x - TW / 2},${y}`;
      if (lock) {
        out.push(`<g data-k="${k}" class="flock">${imgT(IMG + 'soil-lock.webp', x - TW / 2, y - TW * .367, TW, TW * .79)}<polygon points="${dia}" fill="transparent"/>`
          + (o.mini ? '' : `<g transform="translate(${x + 4} ${y - 30})"><rect x="-30" y="-15" width="60" height="26" rx="13" fill="#fff" opacity=".92"/><image href="img/ui/ic-lock-closed.webp" x="-27" y="-12" width="20" height="20"/><text x="8" y="5" text-anchor="middle" font-size="16" font-weight="900" fill="#7a4f22">Lv${k >= 10 ? 7 : k >= 8 ? 5 : 3}</text></g>`) + '</g>');
        continue;
      }
      const wet = S && !S.empty && !S.thirsty;
      let g = imgT(IMG + (wet ? 'soil-wet.webp' : 'soil-dry.webp'), x - TW / 2, y - TW * TH, TW, TW * .767) + `<polygon points="${dia}" fill="transparent"/>`;
      if (!S.empty) {
        const [w, h] = cropBox(P.c, S.stage), by = y + 8;
        g += `<g class="${S.ripe ? 'fripe' : ''}">${imgT(`${IMG}${P.c}-${S.stage}.webp`, x - w / 2, by - h, w, h)}</g>`;
        if (S.weed) g += imgT(IMG + 'ic-weed.webp', x - TW * .36, y - 14, 46, 46) + imgT(IMG + 'ic-weed.webp', x + TW * .14, y + 18, 38, 38);
        if (S.bug) g += `<g class="fbug">${imgT(IMG + 'ic-bug.webp', x + TW * .12, by - h * .55 - 20, 44, 44)}</g>`;
        if (S.ripe) g += `<g class="fspark">${imgT(IMG + 'ic-spark.webp', x + w * .25, by - h - 18, 44, 44)}</g>`;
        const tag = S.ripe ? 'spark' : S.thirsty ? 'drop' : S.bug ? 'bug' : S.weed ? 'weed' : '';
        if (tag && !o.mini) tops.push(`<g transform="translate(${x} ${by - Math.max(h, 40) - 46})" pointer-events="none"><g class="fbub"><path d="M-24 -24 H24 Q31 -24 31 -17 V13 Q31 20 24 20 H8 L0 30 L-8 20 H-24 Q-31 20 -31 13 V-17 Q-31 -24 -24 -24Z" fill="#fff" stroke="${S.ripe ? '#fcc419' : S.thirsty ? '#74c0fc' : '#ff8787'}" stroke-width="4"/>${imgT(IMG + 'ic-' + tag + '.webp', -19, -21, 38, 38)}</g></g>`);
      }
      out.push(`<g data-k="${k}" class="fplot">${g}</g>`);
    }
    out.push(tops.join(''));   // 頭上的小泡泡最後畫，才不會被後面的作物擋住
    if (night() && !o.mini) out.push(`<rect width="${BGW}" height="${BGH}" fill="#1b1f4b" opacity=".38" pointer-events="none"/><g fill="#fff8d6" pointer-events="none">${[[140, 70], [420, 40], [760, 90], [1180, 60], [1450, 120], [60, 300], [1490, 420]].map(([a, b], i) => `<circle cx="${a}" cy="${b}" r="${i % 2 ? 3 : 4.5}"/>`).join('')}</g>`);
    if (!o.mini) out.push('<g id="ffx" pointer-events="none"></g>');
    const vb = (o.mini ? VB_MINI : o.zoom ? VB_ZOOM : VB_FULL).join(' ');
    return `<svg class="farm${o.mini ? ' mini' : ''}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${out.join('')}</svg>`;
  }

  /* ───────── 自己的資料 ───────── */
  const tst = () => { try { return !!(user && isTest(user.seat)); } catch (e) { return false; } };
  function F() {
    if (!sum) return null;
    if (!sum.farm || !Array.isArray(sum.farm.p)) sum.farm = { xp: 0, water: START_WATER, fert: 1, p: Array(MAXP).fill(0), store: {}, log: [], u: Date.now() };
    const f = sum.farm; f.store = f.store || {}; f.log = f.log || []; while (f.p.length < MAXP) f.p.push(0);
    if (tst()) {   // 測試帳號（98、99）：水、肥料用不完，農場直接 Lv.10（12 塊田、所有種子）
      if ((f.water || 0) < 999) f.water = 999; if ((f.fert || 0) < 99) f.fert = 99;
      if (lvOf(f.xp).lv < 10) { let x = 0; for (let l = 1; l < 10; l++) x += xpNeed(l); f.xp = Math.max(f.xp || 0, x); }
    }
    return f;
  }
  const coins = () => (PET.P() && PET.P().coin) || 0;
  function addCoin(n) { const p = PET.P(); if (p) PET.coinAdd(p, n); }   // 記在寵物的金幣帳本（換平板、同步都不會不見）
  let pubT = 0;
  function save() {
    const f = F(); f.u = Date.now(); saveSum(true);
    clearTimeout(pubT); pubT = setTimeout(() => { if (!user) return; const f = F(); enqueue(`${ROOT}/farm/${user.seat}`, { xp: f.xp | 0, sm: f.sm ? 1 : 0, p: f.p.map(x => x || 0), t: Date.now() }, true); }, 1000);
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
    return `<div class="tkget farmend">🌾 農場：💧 拿到 ${w} 滴水${fert ? '・🧴 拿到 1 包肥料！' : ''}</div>`;
  }

  /* ───────── 我的農場 ───────── */
  let curK = -1, tickT = 0;
  const zoomOn = () => LS.get('learn601_fzoom', innerWidth < 760), zoomSet = v => LS.set('learn601_fzoom', v);   // 手機預設放大
  function page(C) {
    const f = F(), L = lvOf(f.xp);
    C.innerHTML = `<div class="fhead"><div class="flv"><b>🌾 我的農場 Lv.${L.lv}</b><div class="pbar s"><i style="width:${L.cur / L.need * 100}%;background:linear-gradient(90deg,#a9e34b,#74b816)"></i></div><small>經驗 ${L.cur} / ${L.need}</small></div>
        <div class="fres"><span title="水（練習答對 1 題 +1）">💧 <b id="fwater">${f.water || 0}</b></span><span title="肥料（10 題答對 8 題送 1 包）">🧴 <b id="ffert">${f.fert || 0}</b></span><span>🪙 <b id="fcoin">${coins()}</b></span></div><button class="fsm${f.sm ? ' on' : ''}" id="fsm">🥷 偷菜模式：${f.sm ? '開' : '關'}</button></div>
      ${night() ? '<div class="fnight">🌙 晚上 9 點到早上 6 點農場休息，作物會繼續長大，明天早上再來照顧吧！</div>' : ''}
      <div class="fmain"><div class="fbox" id="fbox"><div id="fsvg"></div><button class="fzoom" id="fzoom"></button></div>
        <div class="fside"><div class="finfo" id="finfo"></div><div class="fpinfo" id="fpinfo"></div></div></div>
      <div class="fbar" id="fbar"></div>
      <div class="frow2"><div class="cd fstore" id="fstore"></div><div class="cd flog" id="flog"></div></div>`;
    paint(); paintBar(); paintStore(); paintLog(); info(curK);
    tap(C.querySelector('#fzoom'), () => { zoomSet(!zoomOn()); paint(); paintZoom(); }); paintZoom();
    tap(C.querySelector('#fstore'), storeModal); tap(C.querySelector('#fsm'), smToggle);
    WK = walker(C.querySelector('#fbox'), () => { const p = PET.P(); return p && p.st === 'pet' ? p : null; }, { own: 1, zoom: zoomOn }); paintPetInfo();
    tap(C.querySelector('#fbox'), e => {   // tap：用手指捲動畫面時不會按到田
      if (e.target.closest('.fpet')) return petTap();
      if (e.target.closest('#fbarn')) return storeModal();
      const g = e.target.closest('[data-k]'); if (!g) return; tapPlot(+g.dataset.k);
    });
    clearInterval(tickT); tickT = setInterval(() => { if (!document.getElementById('fbox')) return clearInterval(tickT); paint(); paintPetInfo(); if (curK >= 0) info(curK); }, 15000);
    applyInbox();
  }
  function paint() {
    const box = document.getElementById('fsvg'); if (!box) return;
    const old = document.getElementById('ffx'), kids = old ? [...old.childNodes] : [];   // 還在飛的小特效留下來（不然一重畫就不見）
    box.innerHTML = farmSVG(F(), { zoom: zoomOn() });
    const nf = document.getElementById('ffx'); if (nf) kids.forEach(k => nf.appendChild(k));
    if (WK) WK.redraw();
    markSel();
    const q = id => document.getElementById(id), f = F();
    if (q('fwater')) { q('fwater').textContent = f.water || 0; q('ffert').textContent = f.fert || 0; q('fcoin').textContent = coins(); }
  }
  function paintBar() {
    const B = document.getElementById('fbar'); if (!B) return; B.innerHTML = '';
    [['all', '🧺', '全部收成'], ['water', '💧', '全部澆水'], ['store', '📦', '倉庫'], ['seed', '🌱', '種子一覽']].forEach(([k, i, n]) => { const b = el('button', 'fbtn big', `<span class="fbi">${i}</span>${n}`); tap(b, () => k === 'all' ? harvestAll() : k === 'water' ? waterAll() : k === 'store' ? storeModal() : seedModal(-1)); B.appendChild(b); });
  }
  function paintZoom() { const b = document.getElementById('fzoom'); if (b) b.innerHTML = zoomOn() ? '🔎 看全景' : '🔍 放大田地'; }
  /* 選中的田：場景上加綠框，旁邊顯示作物、狀態和能做的事 */
  function markSel() { document.querySelectorAll('#fsvg [data-k].fsel').forEach(g => g.classList.remove('fsel')); if (curK >= 0) { const g = document.querySelector(`#fsvg [data-k="${curK}"]`); if (g) g.classList.add('fsel'); } }
  function info(k) {
    const e = document.getElementById('finfo'); if (!e) return; markSel();
    if (k == null || k < 0) { e.innerHTML = '<div class="fsh">👆 點一塊田</div><div class="fss">空的田可以種菜；點 💧 的田澆水、點 ✨ 的田收成，蟲和雜草點一下就清掉</div>'; return; }
    const f = F(), P = f.p[k], S = stat(P);
    if (k >= plotsFor(lvOf(f.xp).lv)) { e.innerHTML = `<div class="fsh">🔒 還沒開放的田</div><div class="fss">農場升到 Lv.${k >= 10 ? 7 : k >= 8 ? 5 : 3} 就能用這塊田</div>`; return; }
    if (S.empty) { e.innerHTML = '<div class="fsh">空的田</div><div class="fss">選一種種子種下去吧！</div><div class="fact"><button class="fgo" id="fdo">🌱 種菜</button></div>'; tap(e.querySelector('#fdo'), () => seedModal(k)); return; }
    const chips = [S.ripe ? '<i class="ok">✨ 可以收成</i>' : `<i>⏰ 還要 ${mmss(S.left)}</i>`, S.thirsty ? '<i class="wt">💧 口渴了</i>' : '', S.weed ? '<i class="bd">🌿 有雜草</i>' : '', S.bug ? '<i class="bd">🐛 有蟲</i>' : ''].join('');
    const acts = [S.bug ? ['bug', '🐛 捉蟲'] : null, S.weed ? ['weed', '🌿 拔草'] : null, S.ripe ? ['har', '🧺 收成'] : null, S.thirsty ? ['wat', '💧 澆水'] : null, !S.ripe && !P.fz && (f.fert || 0) > 0 ? ['fer', '🧴 施肥（時間減半）'] : null].filter(Boolean);
    e.innerHTML = `<div class="fsel2">${cropImg(P.c, S.stage, 'fsci')}<div><div class="fsh">${S.C.n}</div><div class="fchips">${chips}</div><div class="fss">預計收成 ${S.yieldN} 個${P.s ? `（被同學摘走 ${P.s} 個）` : ''}</div></div></div>
      ${acts.length ? `<div class="fact">${acts.map(([a, t], n) => `<button class="${n ? 'fgo2' : 'fgo'}" data-a="${a}">${t}</button>`).join('')}</div>` : ''}`;
    e.querySelectorAll('[data-a]').forEach(b => tap(b, () => { const a = b.dataset.a; if (a === 'fer') return fertilize(k); if (a === 'wat') return water(k); if (a === 'har') return harvest(k); tapPlot(k); }));
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
    f.water--; P.w = (P.w || 0) + 1; P.wt = Date.now(); addXp(1); if (!quiet) { fx(k, '💧💧💧', 'water'); snd(600); save(); paint(); info(k); }
    return true;
  }
  function waterAll() {
    if (night()) return; const f = F(); let n = 0; for (let k = 0; k < plotsFor(lvOf(f.xp).lv); k++) if (water(k, true)) n++;
    const e = document.getElementById('finfo');
    if (n) { save(); paint(); snd(600); if (e) e.innerHTML = `💧 澆了 ${n} 塊田！`; } else if (e) e.innerHTML = (f.water || 0) < 1 ? '💧 水用完了！去練習，每答對 1 題就有 1 滴水' : '現在沒有口渴的田';
  }
  function harvest(k, quiet) {
    const f = F(), P = f.p[k], S = stat(P); if (!S.ripe) return 0;
    f.store[P.c] = (f.store[P.c] || 0) + S.yieldN; addXp(S.C.xp); f.p[k] = 0; try { PET.note('hv', 1); } catch (e) { }
    if (!quiet) { cheer(k); fx(k, `${S.C.n} ×${S.yieldN}`, 'har', P.c); snd(880); setTimeout(() => snd(1100), 120); save(); paint(); paintStore(); info(k); }
    return S.yieldN;
  }
  function harvestAll() {
    if (night()) return; const f = F(); let n = 0, k0 = -1; for (let k = 0; k < MAXP; k++) { const c = f.p[k] && f.p[k].c; const y = harvest(k, true); if (y) { n += y; if (k0 < 0) k0 = k; fx(k, `+${y}`, 'har', c); } }
    if (k0 >= 0) cheer(k0);
    const e = document.getElementById('finfo');
    if (n) { save(); paint(); paintStore(); snd(880); setTimeout(() => snd(1100), 120); try { confetti(30); } catch (x) { } if (e) e.innerHTML = `🧺 收成了 ${n} 個，都放進倉庫了！`; } else if (e) e.innerHTML = '還沒有成熟的作物';
  }
  function fertilize(k) {
    const f = F(), P = f.p[k], S = stat(P); if (S.empty || S.ripe || P.fz || (f.fert || 0) < 1) return;
    f.fert--; P.f = (P.f || 0) + Math.round(S.left / 2); P.fz = 1; addXp(1); fx(k, '🧴 長得更快了！', 'water'); snd(760); save(); paint(); info(k);
  }
  function plant(k, id) {
    const f = F(), C = CROPS[id]; if (coins() < C.p) { toast(`🪙 金幣不夠，${C.n}的種子要 ${C.p} 枚`); return false; }
    addCoin(-C.p); f.p[k] = { c: id, t: Date.now() + k, w: 0 }; addXp(1); return true;   // +k：同一秒種的田，蟲和雜草也不一樣
  }
  /* 小特效：在田上面跳出字 */
  function fx(k, text, cls, cropId) {
    const G = document.getElementById('ffx'); if (!G) return; const [X, Y] = plotC(k);
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('transform', `translate(${X} ${Y - 110})`);
    g.innerHTML = (cropId ? `<image href="${IMG}pr-${cropId}.webp" x="-34" y="-104" width="68" height="68"/>` : '') + `<text text-anchor="middle" font-size="36" font-weight="900" fill="${cls === 'water' ? '#1c7ed6' : '#e67700'}" stroke="#fff" stroke-width="8" paint-order="stroke">${text}</text>`;
    g.innerHTML = `<g class="ffx ${cls || ''}">${g.innerHTML}</g>`; G.appendChild(g); setTimeout(() => g.remove(), 1500);
  }
  function modal(html) { const m = el('div', 'pmod', `<div class="pmc fmc">${html}</div>`); document.body.appendChild(m); tap(m, e => { if (e.target === m) m.remove(); }); return m; }
  function seedModal(k) {
    const f = F(), lv = lvOf(f.xp).lv, empty = f.p.slice(0, plotsFor(lv)).filter(x => !x).length;
    const m = modal(`<div class="pmh">🌱 ${k >= 0 ? '要種什麼？' : '種子一覽'}　<small>🪙 ${coins()}</small></div><div class="fseeds">${CK.map(id => { const C = CROPS[id], lock = lv < C.lv; return `<button data-c="${id}" class="${lock ? 'lock' : ''}">${cropImg(id, 3, 'fsc')}<b>${C.n}</b><small>⏰ ${mmss(C.m * 60000)}・💧×${C.w}</small><small>收成 ${C.y} 個・一個賣 🪙${C.s}</small><em>${lock ? (C.lv - lv === 1 ? '🔒 農場再升 1 級就能種' : `🔒 農場升到 Lv.${C.lv} 解鎖`) : `種子 🪙 ${C.p}`}</em></button>`; }).join('')}</div>
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
    const f = F(), list = CK.filter(id => f.store[id] > 0), tot = list.reduce((a, id) => a + f.store[id] * CROPS[id].s, 0), pp = PET.P(), pet = pp && pp.st === 'pet';
    const m = modal(`<div class="pmh">📦 倉庫　<small>🪙 ${coins()}${pet ? `・🐾 ${PET.nameOf(pp)} 🍙${PET.fullNow(pp)}` : ''}</small></div>${list.length ? `<div class="fsto">${list.map(id => `<div class="fsi">${produceImg(id)}<b>${CROPS[id].n} ×${f.store[id]}</b><small>一個 🪙${CROPS[id].s}</small>${pet ? `<button class="fpf" data-f="${id}">🐾 餵</button>` : ''}<button data-s="${id}">賣 1 個</button><button data-a="${id}">全部賣</button></div>`).join('')}</div>
      <button class="go fsell" id="fsellall">💰 全部賣掉（🪙 ${tot}）</button>` : '<div class="ld">倉庫是空的，快去收成吧！</div>'}<button class="pmx">關閉</button>`);
    const sell = (id, n) => { n = Math.min(n, f.store[id] || 0); if (!n) return; f.store[id] -= n; if (!f.store[id]) delete f.store[id]; addCoin(n * CROPS[id].s); save(); try { sfx.ok(); } catch (e) { } m.remove(); storeModal(); paint(); paintStore(); };
    m.querySelectorAll('[data-s]').forEach(b => tap(b, () => sell(b.dataset.s, 1)));
    m.querySelectorAll('[data-a]').forEach(b => tap(b, () => sell(b.dataset.a, 999)));
    m.querySelectorAll('[data-f]').forEach(b => tap(b, () => { const t = PET.feedCrop(b.dataset.f); toast(t || '現在不能餵'); if (t.startsWith('😋')) { m.remove(); storeModal(); paintStore(); if (WK) { WK.hop(); WK.say('好好吃！'); } } }));
    const all = m.querySelector('#fsellall'); if (all) tap(all, () => { list.forEach(id => { addCoin(f.store[id] * CROPS[id].s); delete f.store[id]; }); save(); try { sfx.ticket(); confetti(40); } catch (e) { } toast(`💰 賣了 ${tot} 枚金幣！`); m.remove(); paint(); paintStore(); });
    tap(m.querySelector('.pmx'), () => m.remove());
  }
  function paintStore() {
    const e = document.getElementById('fstore'); if (!e) return; const f = F(), list = CK.filter(id => f.store[id] > 0);
    e.innerHTML = `<div class="fst">📦 倉庫</div>${list.length ? `<div class="fstl">${list.map(id => `<span>${produceImg(id)}×${f.store[id]}</span>`).join('')}</div>` : '<div class="fsmall">還沒有東西，收成後會放在這裡</div>'}`;
  }
  function paintLog() {
    const e = document.getElementById('flog'); if (!e) return; const f = F();
    e.innerHTML = `<div class="fst">📬 農場消息</div>${f.log.length ? f.log.slice(0, 6).map(x => `<div class="flg">${x.m}<small>${ago(x.t)}</small></div>`).join('') : '<div class="fsmall">同學來幫忙或摘菜，會顯示在這裡</div>'}`;
  }
  const ago = t => { const m = Math.floor((Date.now() - t) / 60000); return m < 1 ? '剛剛' : m < 60 ? `${m} 分鐘前` : m < 1440 ? `${Math.floor(m / 60)} 小時前` : `${Math.floor(m / 1440)} 天前`; };
  function snd(f) { try { if (typeof tone === 'function' && sndOn) tone(f, .07, 'triangle', .06); } catch (e) { } }

  /* ───────── 農場裡的寵物：走來走去、提醒要照顧的田；進化以後會幫忙 ─────────
     走的路線是田地外圍一圈草地（農場座標）；晚上回房子旁邊睡覺。
     幫忙次數（每天）：寶寶 0 次（只會提醒）、第一次進化 3 次（捉蟲、拔草）、最終進化 6 次（還會澆水，不用花水） */
  const RING = [[450, 410], [620, 290], [930, 300], [1180, 462], [1100, 612], [940, 722], [700, 742], [560, 672], [400, 522]];
  const SLEEP = [520, 300], PW = 150, SPEED = 120, HELP_N = [0, 3, 6];
  const IDLE = ['♪', '💗', '🌼', '✨', '😊', '🎵'];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  let WK = null;
  function walker(box, get, o) {
    const L = el('div', 'fpetL'), w = el('div', 'fpet', '<div class="fpa"></div><div class="fpb"></div>'); L.appendChild(w); box.appendChild(L);
    let pos = RING[0].slice(), idx = 0, T = 0, busy = 0, alive = 1, key = '', lastK = -1, lastT = 0;   // lastK：剛剛提醒過的田（不要一直跑回同一塊）
    const V = () => o.zoom() ? VB_ZOOM : VB_FULL;
    function place(ms) { const v = V(); w.style.transitionDuration = (ms || 0) + 'ms'; w.style.left = ((pos[0] - v[0]) / v[2] * 100) + '%'; w.style.top = ((pos[1] - v[1]) / v[3] * 100) + '%'; w.style.width = (PW / v[2] * 100) + '%'; }
    function redraw() {
      const p = get(); if (!p) { w.style.display = 'none'; return; } w.style.display = '';
      const lk = PET.look(p, { mood: night() ? 'sleep' : o.own ? PET.moodOf(p) : 'happy' }), k = JSON.stringify(lk);
      if (k !== key) { key = k; w.querySelector('.fpa').innerHTML = PET.petArt(lk); }
    }
    function go(x, y, cb) {
      const d = Math.hypot(x - pos[0], y - pos[1]), ms = Math.max(250, d / SPEED * 1000);
      if (Math.abs(x - pos[0]) > 4) w.classList.toggle('flip', x > pos[0]);
      w.classList.add('walk'); pos = [x, y]; place(ms);
      clearTimeout(go.t); go.t = setTimeout(() => { w.classList.remove('walk'); if (cb) cb(); }, ms);
      return ms;
    }
    function say(t, ms) { const b = w.querySelector('.fpb'); b.innerHTML = t; b.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(() => b.classList.remove('on'), ms || 2600); }
    function hop() { w.classList.remove('hop'); void w.offsetWidth; w.classList.add('hop'); clearTimeout(hop.t); hop.t = setTimeout(() => w.classList.remove('hop'), 700); }
    function sched(ms) { clearTimeout(T); T = setTimeout(tick, ms || 2600 + Math.random() * 4200); }
    function tick() {
      if (!alive || !w.isConnected) return stop();
      if (busy) return sched(1500);
      redraw();
      if (night()) { w.classList.add('zz'); if (Math.hypot(pos[0] - SLEEP[0], pos[1] - SLEEP[1]) > 5) go(SLEEP[0], SLEEP[1]); say('💤', 6000); return sched(9000); }
      w.classList.remove('zz');
      const Fm = o.F ? o.F() : F();
      if (o.own && Math.random() < .4) { const k = needPlot(Fm); if (k >= 0 && !(k === lastK && Date.now() - lastT < 25000)) { lastK = k; lastT = Date.now(); const [x, y] = plotC(k), ms = go(x, y + 26, () => say(hint(Fm, k), 3200)); return sched(ms + 4200); } }
      if (Math.random() < .22) { say(pick(IDLE), 1600); return sched(); }
      idx = (idx + (Math.random() < .5 ? 1 : RING.length - 1)) % RING.length;
      const ms = go(RING[idx][0], RING[idx][1]); sched(ms + 1200 + Math.random() * 3600);
    }
    function stop() { alive = 0; clearTimeout(T); clearTimeout(go.t); }
    place(0); redraw(); sched(900);
    return { place: () => place(0), redraw, go, say, hop, stop, busy: v => { busy = v; }, el: w, pos: () => pos.slice() };
  }
  /* 哪塊田需要照顧（給寵物提醒用） */
  function needPlot(Fm) {
    const n = plotsFor(lvOf(Fm.xp).lv), ks = [];
    for (let k = 0; k < n; k++) { const S = stat(Fm.p[k]); if (!S.empty && (S.ripe || S.thirsty || S.bug || S.weed)) ks.push(k); }
    return ks.length ? pick(ks) : -1;
  }
  function hint(Fm, k) {
    const S = stat(Fm.p[k]), i = n => `<img class="fbi" src="${IMG}ic-${n}.webp" alt="">`;
    return S.bug ? `${i('bug')} 這裡有蟲！` : S.weed ? `${i('weed')} 長雜草了！` : S.ripe ? `${i('spark')} 可以收成了！` : S.thirsty ? `${i('drop')} 口渴了～` : '♪';
  }
  /* 寵物能幫忙的田：蟲、雜草；最終進化還會澆水 */
  function helpPlot(f, st) {
    const n = plotsFor(lvOf(f.xp).lv);
    for (let k = 0; k < n; k++) { const S = stat(f.p[k]); if (!S.empty && (S.bug || S.weed)) return k; }
    if (st >= 2) for (let k = 0; k < n; k++) { const S = stat(f.p[k]); if (!S.empty && S.thirsty) return k; }
    return -1;
  }
  const helpLeft = (f, st) => { const today = dkey(); if (!f.ph || f.ph.d !== today) f.ph = { d: today, n: 0 }; return Math.max(0, HELP_N[st] - f.ph.n); };
  function petTap() {
    const p = PET.P(); if (!p || p.st !== 'pet' || !WK) return;
    if (night()) { WK.say('💤 呼嚕…明天見'); return; }
    const st = PET.stageOf(PET.lvOf(p.xp).lv), f = F(), left = helpLeft(f, st), k = helpPlot(f, st);
    if (st >= 1 && k >= 0 && left > 0) {
      WK.busy(1); WK.say('交給我！', 1500); const [x, y] = plotC(k);
      WK.go(x, y + 26, () => {
        const P2 = f.p[k], S = stat(P2); let t = '';
        if (S.bug) { P2.b = 2; t = '🐛 捉到蟲了'; } else if (S.weed) { P2.g = 2; t = '🌿 拔掉雜草了'; } else if (st >= 2 && S.thirsty) { P2.w = (P2.w || 0) + 1; t = '💧 澆好水了'; }
        if (t) { f.ph.n++; addXp(1); fx(k, `🐾 ${t}`, t[0] === '💧' ? 'water' : ''); snd(760); save(); paint(); if (curK === k) info(k); WK.hop(); WK.say(t + '！'); paintPetInfo(); }
        WK.busy(0);
      });
      return;
    }
    WK.hop(); PET.patJoy(); snd(880);
    WK.say(st === 0 && needPlot(f) >= 0 ? `有田要照顧喔！<small>我 Lv.${PET.EVO[0]} 進化以後就能幫忙</small>`
      : st >= 1 && k >= 0 && left <= 0 ? '今天幫好多次了～明天再幫你！' : pick(['💗 嘿嘿～', '今天也一起加油！', '農場好漂亮！', PET.SPECIES[p.sp].say]), 2800);
  }
  /* 收成的時候寵物跑過來一起開心 */
  function cheer(k) {
    if (!WK || night()) return; const [x, y] = plotC(k);
    WK.go(x - 70, y + 40, () => { WK.hop(); WK.say('🎉 豐收！', 1800); });
  }
  function paintPetInfo() {
    const e = document.getElementById('fpinfo'); if (!e) return; const p = PET.P();
    if (!p || p.st !== 'pet') { e.innerHTML = '🥚 孵出寵物以後，牠會來農場陪你、幫你顧田！'; return; }
    const st = PET.stageOf(PET.lvOf(p.xp).lv), nm = PET.nameOf(p), left = helpLeft(F(), st);
    e.innerHTML = st === 0 ? `🐾 ${nm}會在農場走來走去，提醒你哪塊田要照顧。<b>Lv.${PET.EVO[0]} 進化</b>以後會幫忙捉蟲、拔草！`
      : `🐾 點${nm}，牠會幫忙捉蟲、拔草${st >= 2 ? '、澆水' : ''}（今天還能 <b>${left}</b> 次）${st < 2 ? `。Lv.${PET.EVO[1]} 最終進化以後還會幫忙澆水！` : ''}`;
    e.innerHTML += '<small>倉庫裡的菜可以拿去餵牠，比賣掉划算喔</small>';
  }

  /* 偷菜模式的開關：一天只能切換一次（不能先開著去偷、再關掉保護自己） */
  function smToggle() {
    const f = F(), today = dkey();
    if (f.smd === today) { toast('🥷 偷菜模式今天已經切換過了，明天才能再改'); return; }
    const on = !f.sm;
    const txt = on ? '要打開 🥷 偷菜模式嗎？\n\n・你可以去偷「也有打開」的同學的菜\n・別人也可以偷你的菜（成熟 1 小時後、每塊田最多 1 個，會留 🪙1 回禮給你）\n・今天打開以後，明天才能關掉'
      : '要關掉 🥷 偷菜模式嗎？\n\n・別人就不能偷你的菜了\n・你也不能去偷別人的菜\n・今天關掉以後，明天才能再打開';
    if (!confirm(txt)) return;
    f.sm = on; f.smd = today; save(); render(); toast(on ? '🥷 偷菜模式打開了！' : '🛡️ 偷菜模式關掉了，你的菜很安全');
  }

  /* ───────── 同學做的事：主人打開農場時算進去 ───────── */
  async function applyInbox() {
    if (!(await fbOnline()) || !user) return; let v = null;
    try { v = (await timeout(db.ref(`${ROOT}/farmact/${user.seat}`).get(), 8000)).val(); } catch (e) { return; }
    if (!v) return; const f = F(); let changed = 0;
    for (const [id, a] of Object.entries(v)) {
      const P = f.p[a.k]; const ok = P && P.c && P.t === a.pt;
      if (ok) {
        const S = stat(P), who = seatName(a.f);
        if (a.a === 'w' && (P.w || 0) < S.C.w) { P.w = (P.w || 0) + 1; P.wt = Date.now(); logAdd(`💧 ${who}幫你的${S.C.n}澆水`); changed++; }
        else if (a.a === 'g' && S.weed) { P.g = 2; logAdd(`🌿 ${who}幫你的${S.C.n}拔雜草`); changed++; }
        else if (a.a === 'b' && S.bug) { P.b = 2; logAdd(`🐛 ${who}幫你的${S.C.n}捉蟲`); changed++; }
        else if (a.a === 's' && f.sm && (P.s || 0) < STEAL_PER_PLOT) { P.s = (P.s || 0) + 1; addCoin(1); addXp(1); logAdd(`🥷 ${who}偷摘了 1 個${S.C.n}，留下 🪙1 回禮`); changed++; }
      }
      try { db.ref(`${ROOT}/farmact/${user.seat}/${id}`).remove(); } catch (e) { }
    }
    if (changed) { save(); paint(); paintLog(); toast(`📬 有 ${changed} 則農場消息`); }
  }

  /* ───────── 拜訪同學的農場 ───────── */
  let VC = null;
  async function loadFarms() {
    if (VC && Date.now() - VC.at < 20000) return VC;
    await fbOnline(); let v = null, pets = null;
    if (db && online) { try { const [a, b] = await Promise.all([db.ref(`${ROOT}/farm`).get(), db.ref(`${ROOT}/pet`).get()].map(x => timeout(x, 8000))); v = a.val() || {}; pets = b.val() || {}; } catch (e) { } }
    VC = { at: Date.now(), ok: !!v, v: v || {}, pets: pets || {} }; return VC;
  }
  const normFarm = x => ({ xp: (x && x.xp) | 0, sm: !!(x && x.sm), p: Array.from({ length: MAXP }, (_, k) => (x && x.p && x.p[k]) || 0) });
  async function visitList(C) {
    C.innerHTML = '<div class="ld">讀取中…</div>';
    const R = await loadFarms(); if (!C.isConnected) return;
    if (!R.ok) { C.innerHTML = '<div class="ld">📴 連上網路才看得到同學的農場</div>'; return; }
    const seats = [...SEATS.flat(), ...(isTest(user.seat) ? TEST_SEATS : [])].filter(s => s !== user.seat);
    const cards = seats.map(s => { const x = R.v[s]; if (!x) return null; const Fm = normFarm(x); let help = 0, ripe = 0; Fm.p.forEach(P => { const S = stat(P); if (S.empty) return; if (S.thirsty || S.weed || S.bug) help++; if (S.stealOK && Fm.sm && F().sm) ripe++; }); return { s, Fm, help, ripe, lv: lvOf(Fm.xp).lv }; }).filter(Boolean)
      .sort((a, b) => (b.help + b.ripe) - (a.help + a.ripe) || a.s - b.s);
    const f = F(), today = dkey(), hc = f.hd === today ? f.hc || 0 : 0;
    C.innerHTML = `<div class="fvhead">👫 去同學的農場幫忙：澆水、除草、捉蟲，每次 🪙+1（今天還能拿 ${Math.max(0, HELP_COIN_MAX - hc)} 枚）。${f.sm ? '🥷 你開了偷菜模式：名字旁邊有 🥷 的同學，成熟超過 1 小時的菜可以偷摘 1 個（每天最多 ' + TAKE_MAX + ' 個）' : '想玩偷菜的話，到「我的農場」打開 🥷 偷菜模式（打開以後別人也能偷你的）'}</div>
      ${cards.length ? `<div class="fvg">${cards.map(c => `<button data-s="${c.s}"><div class="fvm">${farmSVG(c.Fm, { mini: 1 })}</div><b>${seatName(c.s)}${c.Fm.sm ? ' 🥷' : ''}　<small>Lv.${c.lv}</small></b><span>${c.help ? `<i class="h">🙋 可以幫忙 ${c.help}</i>` : ''}${c.ripe ? `<i class="r">🥷 可以偷 ${c.ripe}</i>` : ''}${!c.help && !c.ripe ? '<i>一切都好</i>' : ''}</span></button>`).join('')}</div>` : '<div class="ld">同學們還沒開始種菜，邀請大家一起來吧！</div>'}`;
    C.querySelectorAll('[data-s]').forEach(b => tap(b, () => visit(+b.dataset.s)));
  }
  async function visit(s) {
    const R = await loadFarms(); const Fm = normFarm(R.v[s]), pv = R.pets[s];
    let inbox = {}; try { inbox = (await timeout(db.ref(`${ROOT}/farmact/${s}`).get(), 8000)).val() || {}; } catch (e) { }
    /* 已經有人幫過（主人還沒打開）也先算進去，畫面才會對 */
    const mine = new Set();
    for (const [id, a] of Object.entries(inbox)) { const P = Fm.p[a.k]; if (!P || P.t !== a.pt) continue; if (a.a === 'w') P.w = (P.w || 0) + 1; if (a.a === 'g') P.g = 2; if (a.a === 'b') P.b = 2; if (a.a === 's') P.s = (P.s || 0) + 1; if (a.f === user.seat) mine.add(a.k + a.a); }
    const m = modal(`<div class="pmh">🌾 ${seatName(s)}的農場　<small>Lv.${lvOf(Fm.xp).lv}</small></div><div class="fbox vis" id="fvbox"><div id="fvsvg"></div></div><div class="finfo" id="fvinfo">👆 點有 💧🌿🐛 的田幫忙${F().sm && Fm.sm ? '，點 ✨ 的田可以偷摘 1 個 🥷' : ''}</div><div class="fres c"><span>💧 <b id="fvw">${F().water || 0}</b></span><span>🪙 <b id="fvc">${coins()}</b></span></div><button class="pmx">回去</button>`);
    const paintV = () => { m.querySelector('#fvsvg').innerHTML = farmSVG(Fm, {}); m.querySelector('#fvw').textContent = F().water || 0; m.querySelector('#fvc').textContent = coins(); };
    paintV();
    const VW = pv && PET.SPECIES[pv.sp] ? walker(m.querySelector('#fvbox'), () => Object.assign({}, pv, { mood: 'happy' }), { zoom: () => false, F: () => Fm }) : null;
    const msg = t => m.querySelector('#fvinfo').innerHTML = t;
    tap(m.querySelector('#fvbox'), e => {
      if (e.target.closest('.fpet')) { if (VW) { VW.hop(); VW.say(`嗨！我是${PET.NAMES[pv.nm | 0]}`); } return; }
      const g = e.target.closest('[data-k]'); if (!g) return; const k = +g.dataset.k, P = Fm.p[k], S = stat(P);
      if (night()) return msg('🌙 晚上農場在休息，明天再來吧');
      if (S.empty) return msg('這塊田是空的');
      const act = S.bug ? 'b' : S.weed ? 'g' : S.thirsty ? 'w' : S.ripe ? 's' : '';
      if (!act) return msg(`${S.C.n}：還要 ${mmss(S.left)}，現在不需要幫忙`);
      if (act === 's') {   // 偷菜：兩個人都要開偷菜模式、成熟超過 1 小時、每塊田只能被偷 1 個
        if (!F().sm) return msg('🥷 你還沒開偷菜模式，不能偷菜。想玩的話到「我的農場」打開（打開以後別人也能偷你的）');
        if (!Fm.sm) return msg(`${seatName(s)}沒有開偷菜模式，不能偷他的菜喔`);
        if ((P.s || 0) >= STEAL_PER_PLOT) return msg('這塊田已經被偷過了，留給主人吧！');
        if (!S.stealOK) return msg(`${S.C.n}剛成熟，先讓主人收成吧！${mmss(S.stealIn)}後才能偷`);
      }
      if (mine.has(k + act)) return msg('你已經幫過這塊田了');
      const f = F(), today = dkey(); if (f.hd !== today) { f.hd = today; f.hc = 0; f.tk = 0; }
      if (act === 'w' && (f.water || 0) < 1) return msg('💧 你的水用完了，去練習拿水吧！');
      if (act === 's' && (f.tk || 0) >= TAKE_MAX) return msg(`今天已經偷了 ${TAKE_MAX} 個，明天再來吧`);
      const id = `${user.seat}_${k}_${act}_${P.t}`;
      enqueue(`${ROOT}/farmact/${s}/${id}`, { f: user.seat, a: act, k, pt: P.t, t: Date.now() });
      mine.add(k + act);
      if (act === 'w') { f.water--; P.w = (P.w || 0) + 1; }
      if (act === 'g') P.g = 2; if (act === 'b') P.b = 2;
      if (act === 's') { P.s = (P.s || 0) + 1; f.tk = (f.tk || 0) + 1; f.store[P.c] = (f.store[P.c] || 0) + 1; msg(`🥷 偷摘了 1 個${S.C.n}，放進你的倉庫了！（會自動留 🪙1 回禮給主人）`); snd(900); }
      else { addXp(1); if ((f.hc || 0) < HELP_COIN_MAX) { f.hc = (f.hc || 0) + 1; addCoin(1); } msg(`${act === 'w' ? '💧 幫忙澆水' : act === 'g' ? '🌿 幫忙拔雜草' : '🐛 幫忙捉蟲'}了！謝謝你 ❤️${(f.hc || 0) <= HELP_COIN_MAX ? '　🪙+1' : ''}`); snd(700); }
      save(); paintV(); VC = null;
    });
    tap(m.querySelector('.pmx'), () => { if (VW) VW.stop(); m.remove(); if (view === 'farm') render(); });
  }

  /* ───────── 農場頁（左邊選單「農場」）：我的農場、同學的農場 ───────── */
  let tabK = 'mine';
  function farmView(P) {   // 不能叫 view：會蓋掉平台的 view（目前在哪一頁）
    const h = el('div', 'h1', `<span class="tag">🌾</span>快樂農場`); h.style.setProperty('--c', '#74b816'); P.appendChild(h);
    const T = el('div', 'ptabs fk'); [['mine', '🌾 我的農場'], ['visit', '👫 同學的農場']].forEach(([k, n]) => { const b = el('button', tabK === k ? 'on' : '', n); tap(b, () => { if (tabK === k) return; tabK = k; render(); }); T.appendChild(b); });
    P.appendChild(T);
    const C = el('div', 'cd fkc'); P.appendChild(C);
    if (tabK === 'mine') page(C); else visitList(C);
  }

  /* ───────── 首頁的小卡片 ───────── */
  function homeCard() {
    const f = F(), c = el('button', 'cd', ''); c.id = 'farmmini'; let ripe = 0, thirsty = 0, grow = 0;
    f.p.slice(0, plotsFor(lvOf(f.xp).lv)).forEach(P => { const S = stat(P); if (S.empty) return; if (S.ripe) ripe++; else if (S.thirsty) thirsty++; else grow++; });
    c.innerHTML = `<div class="fmv">${farmSVG(f, { mini: 1 })}</div><div class="fmi"><div class="fmt">🌾 我的農場 <small>Lv.${lvOf(f.xp).lv}</small></div><div class="fms">${ripe ? `✨ ${ripe} 塊田可以收成！` : thirsty ? `💧 ${thirsty} 塊田口渴了` : grow ? `🌱 ${grow} 塊田長大中` : '🌱 快去種菜吧！'}　💧 ${f.water || 0}</div></div><span class="pgo">▶</span>`;
    tap(c, () => { view = 'farm'; tabK = 'mine'; paintNavs(); render(); });
    return c;
  }

  /* ───────── 樣式 ───────── */
  const css = `
  .ptabs.fk button.on{color:#5c940d}.fkc{border-top-left-radius:0;border-top-right-radius:0}
  .fsm{border:0;border-radius:14px;padding:.35rem .8rem;font-size:1.05rem;font-weight:900;background:#f1f3f5;color:#868e96;font-family:inherit}.fsm.on{background:#343a40;color:#fff}
  .fhead{display:flex;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:.5rem}
  .flv{flex:1;min-width:12rem}.flv b{font-size:1.4rem;color:#5c940d;display:block}.flv small{font-size:.9rem;color:#888;font-weight:800}.flv .pbar{margin:.25rem 0 .1rem}
  .fres{display:flex;gap:.5rem;flex-wrap:wrap}.fres span{background:#fff;border:3px solid #e9ecef;border-radius:14px;padding:.2rem .7rem;font-size:1.25rem;font-weight:900;color:#495057}
  .fres.c{justify-content:center;margin:.4rem 0}
  .fnight{background:#e7e9ff;color:#5f3dc4;border-radius:14px;padding:.5rem .8rem;font-weight:900;margin-bottom:.5rem}
  .fbox{border-radius:22px;overflow:hidden;touch-action:manipulation;cursor:pointer;box-shadow:0 0 0 3px #d3f9d8;background:#bfe7ff}
  .farm{display:block;width:100%;height:auto}
  .farm .fplot{cursor:pointer}.farm image{pointer-events:none}.farm polygon{pointer-events:all}.farm .fripe{animation:fripe 1.8s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
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
  .fstore{cursor:pointer}.fstl{display:flex;flex-wrap:wrap;gap:.3rem .7rem}.fstl span{display:flex;align-items:center;font-weight:900;color:#555}.fstl .fpi{width:1.9rem;height:1.9rem;object-fit:contain;margin-right:.1rem}
  .fsmall{font-size:.95rem;color:#999;font-weight:800}.flg{font-size:1rem;font-weight:800;color:#555;display:flex;justify-content:space-between;gap:.5rem}.flg small{color:#aaa;flex:none}
  .fmc{max-width:46rem}
  .fseeds{display:grid;grid-template-columns:repeat(auto-fill,minmax(7.6rem,1fr));gap:.55rem;margin-bottom:.7rem}
  .fseeds button{background:linear-gradient(180deg,#fff,#f4fce3);border:3px solid #d8f5a2;border-radius:18px;padding:.4rem .3rem;display:flex;flex-direction:column;align-items:center;font-family:inherit}
  .fseeds .fsc{width:4.6rem;height:5rem;object-fit:contain;object-position:50% 100%}.fseeds b{font-size:1.1rem;color:#444}.fseeds small{font-size:.8rem;color:#888;font-weight:800}.fseeds em{font-style:normal;font-weight:900;color:#e67700;font-size:.95rem;margin-top:.1rem}
  .fseeds button.lock{opacity:.5;filter:grayscale(.6)}.fseeds button:active{transform:scale(.95)}
  .fall{display:block;font-size:1.1rem;font-weight:900;color:#5c940d;margin-bottom:.6rem}.fall input{width:1.3rem;height:1.3rem;vertical-align:middle}
  .fsto{display:flex;flex-direction:column;gap:.4rem;margin-bottom:.7rem;text-align:left}.fsi{display:flex;align-items:center;gap:.6rem;background:#fff9db;border-radius:14px;padding:.35rem .6rem}
  .fsi .fpi{width:2.6rem;height:2.6rem;flex:none;object-fit:contain}.fsi b{flex:1;font-size:1.15rem}.fsi small{color:#888;font-weight:800}.fsi button{border:0;background:#ffe066;color:#e67700;border-radius:12px;padding:.35rem .7rem;font-weight:900;font-family:inherit}
  .fsell{font-size:1.3rem;margin-bottom:.4rem}
  .fvhead{font-size:1.05rem;font-weight:900;color:#5c940d;background:#f4fce3;border-radius:14px;padding:.55rem .8rem;margin-bottom:.7rem}
  .fvg{display:grid;grid-template-columns:repeat(auto-fill,minmax(10rem,1fr));gap:.7rem}
  .fvg button{background:#fff;border:0;border-radius:18px;box-shadow:0 4px 0 #d8f5a2;padding:.4rem;display:flex;flex-direction:column;align-items:center;font-family:inherit}
  .fvg .fvm{width:100%}.fvg .fvm svg{display:block;width:100%;height:auto;border-radius:12px}.fvg b{font-size:1.1rem;color:#5c940d}.fvg b small{color:#888}.fvg span{display:flex;gap:.3rem;flex-wrap:wrap;justify-content:center;margin-top:.2rem}
  .fvg i{font-style:normal;font-size:.85rem;font-weight:900;border-radius:10px;padding:.1rem .45rem;background:#f1f3f5;color:#888}.fvg i.h{background:#e7f5ff;color:#1c7ed6}.fvg i.r{background:#fff9db;color:#e67700}
  .fbox.vis{max-width:40rem;margin:0 auto}
  #farmmini{display:flex;align-items:center;gap:.9rem;width:100%;margin-top:1rem;text-align:left;border:0;background:linear-gradient(135deg,#fff,#f4fce3);cursor:pointer;font-family:inherit}
  #farmmini .fmv{width:7.5rem;flex:none}#farmmini .fmi{flex:1;min-width:0}#farmmini .fmt{font-size:1.4rem;font-weight:900;color:#5c940d}#farmmini .fmt small{font-size:1rem;color:#94d82d}#farmmini .fms{font-size:1.05rem;color:#666;font-weight:800;margin-top:.2rem}#farmmini .pgo{font-size:1.6rem;color:#94d82d}
  .farmend{color:#5c940d}
  .fbox{position:relative}.fpetL{position:absolute;inset:0;pointer-events:none;overflow:hidden}
  .fpet{position:absolute;aspect-ratio:1;transform:translate(-50%,-90%);transition-property:left,top;transition-timing-function:linear;pointer-events:auto;cursor:pointer;z-index:2;touch-action:manipulation}
  .fpet .fpa{width:100%;height:100%;transition:transform .25s}.fpet.flip .fpa{transform:scaleX(-1)}
  .fpet.walk .fpa>.pa{animation:fpw .3s ease-in-out infinite alternate}@keyframes fpw{from{transform:translateY(0) rotate(-4deg)}to{transform:translateY(-7%) rotate(4deg)}}
  .fpet.hop .fpa>.pa{animation:fph .6s ease-out}@keyframes fph{40%{transform:translateY(-32%) scale(.96,1.05)}80%{transform:translateY(0) scale(1.08,.92)}}
  .fpet.zz .fpa>.pa{animation:fpz 3.6s ease-in-out infinite}@keyframes fpz{50%{transform:scale(1.04,.96)}}
  .fpb{position:absolute;left:50%;bottom:88%;transform:translateX(-50%) scale(.6);opacity:0;transition:opacity .2s,transform .2s;background:#fff;border-radius:14px;padding:.25rem .6rem;font-size:clamp(.8rem,1.5vw,1.1rem);font-weight:900;color:#555;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,.18);pointer-events:none;text-align:center;line-height:1.3}
  .fpb.on{opacity:1;transform:translateX(-50%) scale(1)}.fpb small{display:block;font-size:.75em;color:#999}.fpb .fbi{width:1.5em;height:1.5em;vertical-align:-.4em}
  .fpinfo{margin-top:.5rem;background:#fff0f6;border-radius:14px;padding:.5rem .8rem;font-size:1.05rem;font-weight:900;color:#d6336c}.fpinfo b{color:#ae3ec9}.fpinfo small{display:block;color:#f783ac;font-size:.9rem;margin-top:.15rem}
  .fsi .fpf{background:#ffdeeb;color:#d6336c}

  .fmain{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,3fr);gap:.8rem;align-items:start}
  .fside{display:flex;flex-direction:column;gap:.5rem}.fside .finfo,.fside .fpinfo{margin-top:0}
  .fzoom{position:absolute;right:.6rem;top:.6rem;z-index:3;border:0;border-radius:12px;background:rgba(255,255,255,.92);box-shadow:0 2px 6px rgba(0,0,0,.12);font-size:1rem;font-weight:900;color:#2e7554;padding:.3rem .7rem;font-family:inherit}
  .finfo{background:#fff;border:3px solid #eaf4de;color:#33443b}
  .fsh{font-size:1.35rem;font-weight:900;color:#2e7554}.fss{font-size:1rem;color:#657065;font-weight:800;margin-top:.15rem}
  .fsel2{display:flex;gap:.6rem;align-items:center}.fsel2 .fsci{width:4.6rem;height:4.6rem;object-fit:contain;flex:none}
  .fchips{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.2rem}.fchips i{font-style:normal;font-size:.9rem;font-weight:900;border-radius:10px;padding:.1rem .5rem;background:#f1f3f5;color:#657065}.fchips i.ok{background:#fff3bf;color:#e67700}.fchips i.wt{background:#e7f5ff;color:#397cab}.fchips i.bd{background:#fff0f0;color:#b44949}
  .fact{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.6rem}.fact button{flex:1 1 8rem;min-height:3rem;border:0;border-radius:14px;font-size:1.15rem;font-weight:900;font-family:inherit}
  .fgo{background:#2e7554;color:#fff;box-shadow:0 4px 0 #1f5139}.fgo2{background:#fff;color:#2e7554;border:3px solid #cfe5c4!important}
  .farm [data-k].fsel{filter:drop-shadow(0 0 3px #2e7554) drop-shadow(0 0 3px #2e7554) drop-shadow(0 0 6px #9be37a)}
  .fbar{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:.6rem}
  .fbtn.big{display:flex;align-items:center;justify-content:center;gap:.4rem;min-height:3.4rem;font-size:1.2rem;border:3px solid #eaf4de}
  .fbtn .fbi{font-size:1.4rem}
  @media (max-width:900px),(orientation:portrait){.fmain{grid-template-columns:minmax(0,1fr)}.fbar{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media (max-width:700px){.frow2{grid-template-columns:1fr}.fseeds{grid-template-columns:repeat(auto-fill,minmax(6.4rem,1fr))}.fvg{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  window.FARM = { view: farmView, page, visitList, gain, endRound, homeCard, farmSVG, crop, produce, CROPS, stat, F, lvOf, plotsFor, applyInbox };
})();
