/* 大砲遊戲共用的畫面、動畫、操作（大砲對轟、大砲混戰都用這一份）——規則在 tank.js
   TKV.mount({cv, ctl, host})：host 提供
     state() → {map, seed, moves, out, mode}　canAct() 現在能不能操作　solo() 同一台平板輪流
     me() → 我是第幾個玩家（-1＝觀戰）　names() → [名字…]　skins() → [造型代號…]
     send(一步)　live(瞄準)　idle() 動畫播完
   坦克圖：img/game/tank-{造型}-body-v2（車身，朝右）＋ tank-{造型}-barrel-v2（砲管，左端圓軸是旋轉中心）；進階以上的造型是 -v4，接點寫在 V4。
   圖只是外觀：被打中的判定、彈道照 tank.js，不會因為造型不同而改變（每台平板才算得一樣）。
   每款砲口位置不同：瞄準點和砲彈畫面上從該款的砲口（muzzleAt）出發，飛幾步後接回真正的彈道（blendK），落點完全不變。 */
(function (root) {
  const TK = root.TK;
  let W = TK.W, H = TK.H;
  const FONT = "'PingFang TC','Microsoft JhengHei','Noto Sans TC',sans-serif";
  const TURN_MS = 40000;
  /* 隊伍顏色（換了造型也分得出敵我：頭上一條隊伍色條＋名字） */
  const TEAMC = {
    ffa: [{ main: '#ef4444', dark: '#b91c1c', name: '紅' }, { main: '#3b82f6', dark: '#1d4ed8', name: '藍' }, { main: '#22c55e', dark: '#15803d', name: '綠' }, { main: '#f59e0b', dark: '#b45309', name: '黃' }],
    team: [{ main: '#ef4444', dark: '#b91c1c', name: '紅隊' }, { main: '#3b82f6', dark: '#1d4ed8', name: '藍隊' }, { main: '#ef4444', dark: '#b91c1c', name: '紅隊' }, { main: '#3b82f6', dark: '#1d4ed8', name: '藍隊' }]
  };
  const SKINS = ['forest', 'desert', 'glacier', 'ember', 'volt', 'nebula', 'rhino', 'falcon', 'tortoise', 'stormwolf', 'auroracorn', 'abyssshark', 'solardragon', 'phoenix', 'astraltemple'];
  const SKIN_N = { forest: '森林嫩葉', desert: '暖金沙丘', glacier: '冰藍山嶺', ember: '珊瑚烈焰', volt: '青綠閃電', nebula: '紫夜星辰', rhino: '鐵角犀衛', falcon: '疾風獵鷹', tortoise: '森甲巨龜', stormwolf: '雷霆天狼', auroracorn: '極光獨角獸', abyssshark: '深海巨鯊', solardragon: '曜日龍皇', phoenix: '熾天鳳凰', astraltemple: '星穹聖殿' };
  /* 每款車身量好的砲塔接口（車身圖 256 px 寬的座標）和履帶底 */
  const PORT = { forest: [171, 71], desert: [170, 72], glacier: [176, 59], ember: [170, 70], volt: [175, 61], nebula: [170, 63] };
  /* 進階、史詩、傳說九款：車身圖都裁成 256 寬。p 砲塔接口、bot 履帶底（車身圖高度）、piv 砲管旋轉中心、w/h 砲管圖大小、k 砲管縮放（對車身） */
  const V4 = {"rhino":{"p":[175.8,42.3],"bot":164,"piv":[23.4,22.3],"w":200,"h":45,"k":0.6192},"falcon":{"p":[168.5,37.2],"bot":123,"piv":[15.4,16.4],"w":200,"h":32,"k":0.6352},"tortoise":{"p":[188.2,57.6],"bot":167,"piv":[20.0,19.6],"w":200,"h":39,"k":0.7986},"stormwolf":{"p":[193.6,52.1],"bot":159,"piv":[21.3,20.9],"w":200,"h":42,"k":0.6148},"auroracorn":{"p":[190.1,74.2],"bot":199,"piv":[20.6,20.6],"w":200,"h":41,"k":0.7587},"abyssshark":{"p":[196.9,61.6],"bot":177,"piv":[21.5,22.2],"w":200,"h":44,"k":0.6422},"solardragon":{"p":[180.1,67.6],"bot":177,"piv":[15.6,20.8],"w":200,"h":39,"k":0.7828},"phoenix":{"p":[185.0,58.5],"bot":187,"piv":[17.4,19.9],"w":200,"h":39,"k":0.739},"astraltemple":{"p":[173.4,92.2],"bot":203,"piv":[17.9,19.9],"w":200,"h":38,"k":0.818}};
  const ART = sk => V4[sk] ? 'v4' : 'v2', bodyName = sk => `tank-${sk}-body-${ART(sk)}`, barName = sk => `tank-${sk}-barrel-${ART(sk)}`;
  /* 每款砲管圖量出來的砲口尖端 x（砲管圖座標） */
  const MUZ_X = {"forest":197,"desert":197,"glacier":197,"ember":197,"volt":197,"nebula":197,"rhino":200,"falcon":200,"tortoise":200,"stormwolf":200,"auroracorn":200,"abyssshark":200,"solardragon":200,"phoenix":200,"astraltemple":200};
  const BODY_W = 256, BODY_BOTTOM = 182, BAR_PIV = [28, 37.5], BAR_W = 200, BAR_H = 72;
  const TANK_WW = 66, BAR_K = .62;   // 車身在場地上 66 寬；砲管縮到跟砲塔接口一樣粗
  const IMGC = {};
  const img = n => { let i = IMGC[n]; if (!i) { i = IMGC[n] = new Image(); i.src = 'img/game/' + n + '.webp'; } return i; };
  const ok = i => i && i.complete && i.naturalWidth > 0;
  SKINS.forEach(s => { img(bodyName(s)); img(barName(s)); });
  /* 進階、史詩、傳說九款：基本彈換成跟坦克同造型的砲彈（圖檔彈頭朝右，飛的時候跟著方向轉）。其他武器、初階坦克照舊 */
  const SHELL_SK = SKINS.slice(6), shellName = sk => `tank-${sk}-shell-v1`, SHELL_L = 40;   // 場上長 40（基本彈圓球直徑 14、坦克 66 寬；縮小的手機畫面也看得出造型）
  SHELL_SK.forEach(s => img(shellName(s)));
  ['wind-left', 'wind-right', 'health', 'wait'].forEach(n => img(`tank-ui-${n}-v2`));
  /* 場地背景（GPT 畫的，16:7；下面 1/3 是淡色，地面由程式畫才能炸出坑） */
  const bgImg = site => img(`tank-bg-${site}`);

  /* 砲彈圖示：普通、三連發、超級用 V3 的圖；彈跳、散花、傳送用 GPT 第二版畫的圖；
     鑽地、築牆已經拿掉（只剩 11-06 開的舊房間用得到），用程式畫的 */
  const WIMG = { n: 'img/game/ammo-normal.webp', t: 'img/game/ammo-triple.webp', s: 'img/game/ammo-super.webp', b: 'img/game/ammo-bounce.webp', c: 'img/game/ammo-cluster.webp', p: 'img/game/ammo-teleport.webp' };
  function drawnIcon(w) {
    const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d');
    const ball = (x, y, r, a, b) => { const gr = g.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = '#fff3dc'; g.lineWidth = 4; g.stroke(); };
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (w === 'b') { ball(48, 44, 26, '#ffb35c', '#e8590c'); g.strokeStyle = '#8a3b0a'; g.lineWidth = 3; g.beginPath(); g.moveTo(22, 44); g.lineTo(74, 44); g.moveTo(48, 18); g.lineTo(48, 70); g.stroke(); g.beginPath(); g.arc(30, 44, 22, -1, 1); g.stroke(); g.beginPath(); g.arc(66, 44, 22, Math.PI - 1, Math.PI + 1); g.stroke(); g.strokeStyle = '#c9a27a'; g.lineWidth = 4; g.beginPath(); g.ellipse(48, 86, 22, 5, 0, 0, 7); g.stroke(); }
    else if (w === 'c') { ball(40, 40, 20, '#ff9ad5', '#d6336c'); [[74, 30], [78, 52], [66, 72], [44, 78], [22, 70]].forEach(([x, y], k) => ball(x, y, 8, ['#ffd43b', '#74c0fc', '#8ce99a', '#ffa8a8', '#b197fc'][k], ['#f59f00', '#1c7ed6', '#2f9e44', '#e03131', '#7048e8'][k])); }
    else if (w === 'd') { g.save(); g.translate(48, 50); g.rotate(.5); const gr = g.createLinearGradient(-20, 0, 20, 0); gr.addColorStop(0, '#adb5bd'); gr.addColorStop(.5, '#f1f3f5'); gr.addColorStop(1, '#868e96'); g.fillStyle = gr; g.beginPath(); g.moveTo(-18, -30); g.lineTo(18, -30); g.lineTo(0, 36); g.closePath(); g.fill(); g.strokeStyle = '#fff3dc'; g.lineWidth = 4; g.stroke(); g.strokeStyle = '#495057'; g.lineWidth = 3; for (let k = 0; k < 4; k++) { const y = -22 + k * 13, hw = 16 - k * 4; g.beginPath(); g.moveTo(-hw, y); g.lineTo(hw, y + 7); g.stroke(); } g.fillStyle = '#f08c00'; g.fillRect(-20, -40, 40, 12); g.restore(); g.fillStyle = '#a0522d'; [[18, 82, 7], [78, 80, 6], [30, 88, 4]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }); }
    else if (w === 'w') { g.fillStyle = '#8b5a2b'; g.beginPath(); g.moveTo(8, 84); g.quadraticCurveTo(48, 6, 88, 84); g.closePath(); g.fill(); g.strokeStyle = '#fff3dc'; g.lineWidth = 4; g.stroke(); g.fillStyle = '#c98b4b'; for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - r; k++) { const x = 20 + r * 9 + k * 18, y = 74 - r * 16; g.fillRect(x, y, 15, 12); } g.fillStyle = '#6cd35c'; g.beginPath(); g.ellipse(48, 30, 14, 6, 0, 0, 7); g.fill(); }
    else if (w === 'p') { const gr = g.createRadialGradient(48, 48, 4, 48, 48, 38); gr.addColorStop(0, '#f3d9fa'); gr.addColorStop(.5, '#b197fc'); gr.addColorStop(1, '#5f3dc4'); g.fillStyle = gr; g.beginPath(); g.arc(48, 48, 36, 0, 7); g.fill(); g.strokeStyle = '#fff3dc'; g.lineWidth = 4; g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); for (let t = 0; t < 14; t += .2) { const r = 3 + t * 2.2, x = 48 + r * Math.cos(t), y = 48 + r * Math.sin(t); t ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    return c.toDataURL('image/png');
  }
  const ICON = {}; const wIcon = w => ICON[w] || (ICON[w] = WIMG[w] || drawnIcon(w));
  const WSHOW = { n: '普通', t: '三連發', b: '彈跳', c: '散花', d: '鑽地', w: '築牆', p: '傳送', s: '超級' };

  /* 場地的顏色、裝飾 */
  const LOOK = {
    grass: { sky: ['#5fb6ff', '#bfe6ff', '#fff3d6'], hills: ['#a5c8e8', '#8fb8a8'], dirt: ['#c98b4b', '#a86b34', '#6e4522'], top: ['#3f9d3a', '#6cd35c'], edge: '#5a3818', floor: '#3aa0e0', deco: 'tree' },
    desert: { sky: ['#6fb9ef', '#ffe7b0', '#ffd08a'], hills: ['#f0c27a', '#dfa75c'], dirt: ['#f2c46d', '#dda24a', '#a8722f'], top: ['#e2ae55', '#f7d58b'], edge: '#9a6a2a', floor: '#e9b866', deco: 'cactus' },
    snow: { sky: ['#8fbdea', '#d6e8fa', '#f5f9ff'], hills: ['#c9d9ec', '#b0c4dd'], dirt: ['#a3b0c2', '#8592a6', '#5b6678'], top: ['#e9f2fb', '#ffffff'], edge: '#5b6678', floor: '#a5d8ff', deco: 'pine' },
    volcano: { sky: ['#ff8e5e', '#ffbf8a', '#ffe1b8'], hills: ['#8a5a52', '#6e4640'], dirt: ['#7a4a3a', '#5c3529', '#3a2019'], top: ['#5b4a3a', '#7d6550'], edge: '#2a140e', floor: '#ff5a1f', deco: 'rock' },
    islands: { sky: ['#5fbaff', '#c3eaff', '#eefbff'], hills: [], dirt: ['#c98b4b', '#a86b34', '#6e4522'], top: ['#3f9d3a', '#6cd35c'], edge: '#5a3818', floor: '#3aa0e0', deco: 'palm' },
    moon: { sky: ['#0b1033', '#1d2a5c', '#353b74'], hills: ['#2c3360', '#3a4275'], dirt: ['#b8b8c8', '#9898ac', '#6a6a80'], top: ['#cfd0de', '#e6e7f0'], edge: '#55556a', floor: '#1d2240', deco: 'rockm', stars: 1 },
    canyon: { sky: ['#78c4ff', '#ffd9a8', '#ffb98a'], hills: ['#d98a5e', '#c4744a'], dirt: ['#d9774a', '#b85a33', '#7a3a20'], top: ['#8aa64a', '#a9c25e'], edge: '#5a2a14', floor: '#3aa0e0', deco: 'shrub' }
  };

  /* 操作區的樣式（兩款遊戲共用；用 #pdCtl 開頭，蓋過頁面原本的） */
  const CSS = `
#pdCtl .pdw{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.3rem;flex:0 0 auto;width:14rem;align-content:center}
#pdCtl .pdw button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;min-width:0;min-height:2.9rem;padding:.15rem .1rem;border:3px solid #e9d5ae;background:#fff;border-radius:12px;font-weight:900;color:#7a5a32;font-size:.78rem;position:relative;line-height:1.05}
#pdCtl .pdw button img{width:1.9rem;height:1.9rem;object-fit:contain;pointer-events:none}
#pdCtl .pdw button b{font-size:.76rem;white-space:nowrap}
#pdCtl .pdw button em{position:absolute;top:-.45rem;right:-.35rem;margin:0;font-style:normal;font-size:.72rem;background:#7a5a32;color:#fff;border-radius:999px;padding:.05rem .32rem;line-height:1.15}
#pdCtl .pdw button.bonus em{background:#e8590c}
#pdCtl .pdw button.on{border-color:#f59f00;background:#fff3bf;color:#c2410c}
#pdCtl .pdw button:disabled{opacity:.38}
#pdCtl .pdk label{display:flex;align-items:center;justify-content:center;gap:.2rem}
#pdCtl .tki{width:1.2rem;height:1.2rem;object-fit:contain;pointer-events:none;vertical-align:middle}
#pdCtl .pdk button{min-width:2.75rem;min-height:2.75rem}
#pdCtl .pdk button.mv{background:#fff;box-shadow:0 4px 0 #d9b97f;border:2px solid #e9d5ae;padding:0;display:grid;place-items:center}
#pdCtl .pdk button.mv .tki{width:2.1rem;height:2.1rem}
#pdCtl #pdFire{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;min-width:6.8rem;min-height:3.4rem}
#pdCtl #pdFire .tki{width:2.6rem;height:2.6rem}
#pdCtl .pdbar.fuel b{font-size:.95rem}
.tkst{border-collapse:collapse;margin:0 auto;font-weight:900;color:#5c4326;font-size:1rem;background:#fff;border-radius:14px;overflow:hidden}
.tkst th{font-size:.82rem;color:#9a7a52;padding:.25rem .55rem;background:#fbf3e2}
.tkst td{padding:.25rem .55rem;text-align:center;border-top:1px solid #f0e2c4}
.tkst td:first-child{text-align:left;white-space:nowrap}
.tkst td i{display:inline-block;width:.8rem;height:.8rem;border-radius:50%;margin-right:.35rem;vertical-align:-.05rem}
.tkst small{display:block;font-size:.72rem;color:#b89a6a}
@media (orientation:portrait),(max-width:760px){#pdCtl .pdw{width:auto;flex:1 1 100%}#pdCtl .pdk.pda{flex:1 1 100%}}
@media (orientation:landscape) and (max-height:560px){#pdCtl .pdw{width:auto}#pdCtl .pdw button b{display:none}#pdCtl .pdw button{min-height:2.75rem}#pdCtl .pdw button em{top:.05rem;right:.05rem;font-size:.62rem;padding:0 .25rem}#pdCtl .pdk button{min-width:2.75rem;min-height:2.75rem;width:2.75rem;height:2.75rem}#pdCtl #pdFire{min-height:3rem}#pdCtl #pdFire .tki{width:1.9rem;height:1.9rem}}`;
  if (typeof document !== 'undefined') { const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); }
  let cv, ctx, ctl, host, dpr = 1, K = 1, raf = 0, running = false;
  let key = '', outKey = '', shown = null, shownN = 0, queue = [], anim = null, pendingFire = false;
  const V = { g: null, gv: 0, T: [], wind: 0, turn: 0, crates: [] };
  let aim = [], drive = { i: -1, x: 0, fuel: TK.FUEL }, live = null, lastShot = [], turnAt = 0, turnKey = '';
  let parts = [], texts = [], shells = [], shake = 0, banner = null, deco = null, clouds = [], tPrev = 0, hold = null, liveT = 0, timeoutSent = '', big = null;
  const COL = i => (TEAMC[shown && shown.mode === 'team' ? 'team' : 'ffa'])[i] || TEAMC.ffa[0];
  const nm = i => (host.names()[i] || COL(i).name + '色坦克');
  const BLEND = 12;   // 畫面上的砲口差，飛幾步之內接回真正的彈道
  const skinOf = i => { const s = host.skins && host.skins()[i]; return SKINS.includes(s) ? s : SKINS[i % 2 ? 2 : 0]; };
  const L = () => LOOK[shown && shown.site] || LOOK.grass;

  /* ───────── 音效 ───────── */
  let AC = null;
  const ac = () => { try { AC = AC || new (root.AudioContext || root.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { } return AC; };
  function tone(f, d, type = 'triangle', v = .08, at = 0, f2) { const a = ac(); if (!a) return; try { const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d); } catch (e) { } }
  function noise(d, v = .3, lp = 900) { const a = ac(); if (!a) return; try { const n = Math.floor(a.sampleRate * d), b = a.createBuffer(1, n, a.sampleRate), c = b.getChannelData(0); for (let i = 0; i < n; i++)c[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2); const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; const g = a.createGain(); g.gain.value = v; s.connect(f); f.connect(g); g.connect(a.destination); s.start(); } catch (e) { } }
  const snd = {
    fire() { noise(.25, .25, 1400); tone(140, .25, 'sine', .15, 0, 60); },
    boom(b) { noise(b ? .9 : .55, b ? .55 : .4, b ? 700 : 1000); tone(90, b ? .7 : .4, 'sine', .25, 0, 35); },
    pop() { noise(.15, .2, 2400); tone(500, .1, 'triangle', .06, 0, 900); },
    clang() { tone(880, .15, 'square', .05); tone(1320, .2, 'triangle', .05, .03); },
    boing() { tone(260, .22, 'sine', .12, 0, 620); },
    drill() { tone(120, .5, 'sawtooth', .05, 0, 60); noise(.4, .15, 600); },
    wall() { noise(.35, .3, 500); tone(110, .3, 'sine', .15, 0, 70); },
    tele() { [660, 880, 1175, 1568].forEach((f, k) => tone(f, .12, 'sine', .06, k * .06)); },
    gift() { [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, .18, 'triangle', .07, k * .07)); },
    sizzle() { noise(.5, .2, 3000); },
    turn() { tone(660, .12, 'triangle', .07); tone(990, .18, 'triangle', .07, .1); },
    tick() { tone(1200, .05, 'square', .03); },
    click() { tone(520, .04, 'triangle', .04); },
    drive() { tone(70 + Math.random() * 20, .08, 'sawtooth', .025); },
    pass() { tone(400, .2, 'triangle', .06, 0, 200); }
  };

  /* ───────── 工具 ───────── */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  const groundY = x => { const v = TK.gAt(V.g, x); return v >= TK.VOID - 1 ? H + 60 : v; };
  const tankCenter = i => [V.T[i].x, V.T[i].y - 16];
  /* 某一台坦克在 x、角度 a 時，畫面上的砲管轉軸和砲口（跟 drawTank 同一套算法） */
  function barrelAt(i, x, a) {
    const sk = skinOf(i), g = V4[sk], s = TANK_WW / BODY_W, P = g ? g.p : PORT[sk], bot = g ? g.bot : BODY_BOTTOM, rad = a * Math.PI / 180, face = Math.cos(rad) >= 0 ? 1 : -1, tilt = slope(x) * .8;
    const lx = (P[0] - BODY_W / 2) * s * face, ly = (P[1] - bot) * s, y0 = groundY(x) + 1;
    const px = x + lx * Math.cos(tilt) - ly * Math.sin(tilt), py = y0 + lx * Math.sin(tilt) + ly * Math.cos(tilt);
    const L = (MUZ_X[sk] - (g ? g.piv[0] : BAR_PIV[0])) * s * (g ? g.k : BAR_K);
    return { px, py, mx: px + L * Math.cos(rad), my: py - L * Math.sin(rad) };
  }
  const blendK = i => { const k = 1 - i / BLEND; return k > 0 ? k * k : 0; };
  /* 預覽的彈道點：第一點放到砲口，之後慢慢接回真正的彈道 */
  function fromMuzzle(pts, i, x, a) { if (!pts.length) return pts; const B = barrelAt(i, x, a), dx = B.mx - pts[0][0], dy = B.my - pts[0][1]; return pts.map(([X, Y], n) => [X + dx * blendK(n), Y + dy * blendK(n)]); }
  const shellXY = s => { const f = s.mzx != null ? blendK(s.t / TK.SUB) : 0; return [s.x + (s.mzx || 0) * f, s.y + (s.mzy || 0) * f]; };   // mzx、mzy 只給畫面用（tank.js 的 dx、dy 是鑽地彈的彈道，不能共用）
  const slope = x => Math.atan2(groundY(x + 14) - groundY(x - 14), 28);
  const angTxt = a => a < 90 ? `${a}°▶` : a > 90 ? `◀${180 - a}°` : '▲90°';
  const cur = () => host.state() || {};

  /* ───────── 掛上去 ───────── */
  function mount(o) { cv = o.cv; ctl = o.ctl; host = o.host; ctx = cv.getContext('2d'); buildCtl(); bindInput(); addEventListener('resize', fit); fit(); }
  function start() { if (running) return; running = true; tPrev = performance.now(); fit(); raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); stopHold(); }
  function fit() {
    if (!cv) return; const box = cv.parentElement.getBoundingClientRect(); if (!box.width || !box.height) return;
    let w = box.width, h = w * H / W; if (h > box.height) { h = box.height; w = h * W / H; }
    cv.style.width = Math.floor(w) + 'px'; cv.style.height = Math.floor(h) + 'px';
    dpr = Math.min(2, root.devicePixelRatio || 1); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); K = cv.width / W; deco && (deco.bg = null);
  }
  const rp = n => { const st = cur(); return TK.replay(st.map, st.seed, (st.moves || '').split(',').filter(Boolean).slice(0, n).join(','), st.out, st.mode); };

  /* ───────── 跟主程式的狀態同步 ───────── */
  function update() {
    const st = cur(); if (!st.map) return;
    const k = st.map + '#' + st.seed + '#' + (st.mode || ''), toks = (st.moves || '').split(',').filter(Boolean), ok2 = JSON.stringify(st.out || {});
    if (k !== key || toks.length < shownN) { reset(st, toks); return; }
    if (ok2 !== outKey) { outKey = ok2; if (!anim) { shown = rp(shownN); snapView(); startTurn(true); } }
    const already = shownN + queue.length + (anim ? 1 : 0);
    for (let i = already; i < toks.length; i++) queue.push({ i, tok: toks[i] });
    if (!anim && queue.length) next();
    paintCtl();
  }
  function reset(st, toks) {
    key = st.map + '#' + st.seed + '#' + (st.mode || ''); outKey = JSON.stringify(st.out || {}); queue = []; anim = null; shells = []; parts = []; texts = []; pendingFire = false; live = null; turnKey = ''; big = null;
    shown = rp(toks.length); shownN = toks.length;
    const sizeChanged = W !== shown.W || H !== shown.H; W = shown.W; H = shown.H; if (sizeChanged) fit();
    const g0 = TK.decode(st.map); aim = g0.xs.map(x => ({ a: x < W / 2 ? 45 : 135, p: 60, w: 'n', f: x < W / 2 ? 1 : -1 })); lastShot = g0.xs.map(() => null);
    V.T = g0.xs.map((x, i) => ({ x, tx: x, hp: TK.HP, y: 0, flash: 0, dead: 0, a: aim[i].a }));
    makeDeco(st.seed); snapView(true); startTurn(); paintCtl(); buildWeapons();
  }
  function snapView(hard) {
    V.g = Float64Array.from(shown.g); V.gv++; V.wind = shown.wind; V.turn = shown.turn; V.crates = shown.crates.map(c => ({ ...c }));
    shown.T.forEach((s, i) => { const t = V.T[i] || (V.T[i] = { flash: 0 }); t.tx = s.x; if (hard || Math.abs(t.x - s.x) > 200) t.x = s.x; t.hp = s.hp; if (hard) t.y = groundY(t.x); t.dead = s.hp <= 0 ? 1 : 0; t.out = s.out; t.a = aim[i] ? aim[i].a : 45; });
  }
  function startTurn(quiet) {
    const tk = key + '|' + shownN + '|' + shown.turn; if (turnKey === tk) return; turnKey = tk; turnAt = performance.now(); timeoutSent = '';
    const s = shown.turn; drive = { i: s, x: shown.T[s].x, fuel: TK.FUEL }; live = null;
    if (aim[s] && aim[s].w !== 'n' && TK.left(shown, s, aim[s].w) <= 0) aim[s].w = 'n';
    if (shown.over) return;
    const mine = host.canAct();
    banner = { t: host.solo() ? `輪到 ${nm(s)}` : mine ? '🎯 輪到你了！' : `${nm(s)} 瞄準中…`, c: COL(s).main, life: shownN || quiet ? 90 : 110 };
    if (mine) snd.turn();
  }
  function setLive(v) { if (!v || anim || !shown || v.n !== shownN || v.s !== shown.turn || host.canAct()) return; live = v; }
  const busy = () => !!anim || queue.length > 0 || pendingFire;
  const turnAge = () => busy() || !shown || shown.over ? 0 : performance.now() - turnAt;

  /* ───────── 一步一步播動畫 ───────── */
  function next() {
    if (anim) return;
    if (!queue.length) { startTurn(); paintCtl(); host.idle && host.idle(); return; }
    const q = queue.shift(), pre = rp(q.i);
    shown = pre; shownN = q.i; snapView();
    const m = TK.parse(q.tok, pre), side = m.i;
    if (pre.over || side !== pre.turn || !TK.alive(pre, side)) { shown = rp(q.i + 1); shownN = q.i + 1; snapView(); return next(); }   // 不算的一步：直接跳過
    const fromX = live && live.s === side ? live.x : (drive.i === side ? drive.x : pre.T[side].x);
    anim = { m, side, pre, q, ph: 'drive', t: 0, fromX, toX: isFinite(m.x) ? m.x : pre.T[side].x, fromA: V.T[side].a, ii: 0 };
    V.T[side].x = fromX; V.T[side].tx = fromX; live = null; pendingFire = false; paintCtl();
  }
  function finish() {
    const q = anim.q, side = anim.side; anim = null; shells = [];
    shown = rp(q.i + 1); shownN = q.i + 1; outKey = JSON.stringify(cur().out || {});
    snapView();
    /* 這一步之後發生的事：撿到補給箱、掉落、岩漿、滑動、掉進空隙、新的補給箱 */
    for (const e of shown.ev) {
      const t = V.T[e.i];
      if (e.k === 'crate') { snd.gift(); big = { t: `🎁 ${nm(e.i)} 拿到「${TK.WEAP[e.w].name}」！`, s: '下一回合起可以用', w: e.w, c: COL(e.i).main, life: 170 }; for (let k = 0; k < 24; k++) { const a = Math.random() * 6.3; parts.push({ x: e.x, y: groundY(e.x) - 20, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4 - 2, g: .15, life: 50, max: 50, r: 3 + Math.random() * 3, c: 'star' }); } }
      else if (e.k === 'fall') texts.push({ x: t.x, y: t.y - 120, t: `-${e.d} 摔下去了`, c: '#dc2626', life: 90, s: 32, vy: -.5 });
      else if (e.k === 'lava') { snd.sizzle(); texts.push({ x: t.x, y: t.y - 120, t: '-10 好燙！', c: '#ea580c', life: 90, s: 34, vy: -.5 }); for (let k = 0; k < 14; k++)parts.push({ x: t.x + (Math.random() - .5) * 40, y: t.y, vx: (Math.random() - .5), vy: -1 - Math.random() * 2, life: 60, max: 60, r: 8 + Math.random() * 8, c: 'smoke' }); }
      else if (e.k === 'void') texts.push({ x: t.x, y: H - 140, t: `${nm(e.i)} 掉下去了！`, c: '#7c2d12', life: 120, s: 38, vy: -.3 });
      else if (e.k === 'slide') texts.push({ x: t.tx, y: groundY(t.tx) - 110, t: '溜～', c: '#1c7ed6', life: 60, s: 28 });
      else if (e.k === 'drop') { const c = V.crates.find(z => z.id === e.id); if (c) c.fall = 1; }
    }
    if (shown.ev.some(e => e.k === 'void')) setTimeout(() => shown.ev.filter(e => e.k === 'void').forEach(e => bigBoom(e.i, true)), 50);
    next();
  }
  function stepAnim() {
    const A = anim, T = V.T[A.side]; A.t++;
    if (A.ph === 'drive') {
      const d = A.toX - T.x; if (Math.abs(d) > 1.5) { T.x += Math.sign(d) * 2.4; T.tx = T.x; if (A.t % 6 === 0) snd.drive(); return; }
      T.x = T.tx = A.toX; A.ph = A.m.pass ? 'pass' : 'aim'; A.t = 0; return;
    }
    if (A.ph === 'pass') { if (A.t === 1) { snd.pass(); texts.push({ x: T.x, y: T.y - 110, t: '⏰ 時間到', c: '#64748b', life: 70, s: 34 }); } if (A.t > 60) finish(); return; }
    if (A.ph === 'aim') {
      const tA = A.m.a; T.a = lerp(A.fromA, tA, Math.min(1, A.t / 18)); if (A.t < 22) return;
      T.a = tA; aim[A.side].a = tA; aim[A.side].p = A.m.p; aim[A.side].w = A.m.w; aim[A.side].f = tA < 90 ? 1 : tA > 90 ? -1 : aim[A.side].f;
      A.ph = 'fly'; A.t = 0;
      A.F = TK.launch(A.pre, V.g, A.side, T.x, A.m.a, A.m.p, A.m.w); A.F.crates = V.crates.map(c => ({ ...c }));
      shells = A.F.sh; { const B = barrelAt(A.side, T.x, A.m.a), r = A.m.a * Math.PI / 180, dx = B.mx - (T.x + 26 * Math.cos(r)), dy = B.my - (groundY(T.x) - 16 - 26 * Math.sin(r)); shells.forEach(s => { s.trail = []; s.mzx = dx; s.mzy = dy; }); }
      lastShot[A.side] = { x: T.x, a: A.m.a, p: A.m.p };
      snd.fire(); const Bf = barrelAt(A.side, T.x, A.m.a), ang = A.m.a * Math.PI / 180;
      for (let i = 0; i < 10; i++)parts.push({ x: Bf.mx, y: Bf.my, vx: Math.cos(ang) * (2 + Math.random() * 3) + (Math.random() - .5), vy: -Math.sin(ang) * (2 + Math.random() * 3) + (Math.random() - .5), life: 25, max: 25, r: 6 + Math.random() * 6, c: 'smoke' });
      T.kick = 8; return;
    }
    if (A.ph === 'fly') {
      for (let sub = 0; sub < TK.SUB; sub++) {
        const evN = A.F.ev.length, b0 = A.F.sh.map(s => s.bounced);
        const hits = TK.stepFlight(A.F);
        A.F.sh.forEach((s, k) => { if (!s.trail) s.trail = []; if (b0[k] != null && s.bounced > b0[k]) { snd.boing(); texts.push({ x: s.x, y: s.y - 40, t: '彈！', c: '#f97316', life: 40, s: 26 }); dust(s.x, s.y, 8); } });
        for (const e of A.F.ev.slice(evN)) { if (e.k === 'split') { snd.pop(); parts.push({ x: e.x, y: e.y, r: 30, life: 12, max: 12, c: 'flash' }); } if (e.k === 'drill') { snd.drill(); dust(e.x, e.y, 14); } }
        shells = A.F.sh;
        for (const r of hits) { const e = A.m.imp[A.ii]; if (!e) continue; A.ii++; boom(e, A.m.w, r.s.sub, A); }
      }
      for (const s of A.F.sh) if (s.live && s.t % 3 === 0) { (s.trail = s.trail || []).push(shellXY(s)); if (s.trail.length > 26) s.trail.shift(); }
      if (!A.F.sh.some(s => s.live)) { while (A.ii < A.m.imp.length) boom(A.m.imp[A.ii++], A.m.w, A.m.w === 'c', A); A.ph = 'settle'; A.t = 0; }
      else if (A.t > 60 * 18) A.F.sh.forEach(s => s.live = false);
      return;
    }
    if (A.ph === 'settle') {
      const falling = V.T.some(t => !t.out && Math.abs(t.y - groundY(t.x)) > 1 && t.y < H);
      if ((A.t > 50 && !falling && parts.length < 40) || A.t > 220) finish();
    }
  }
  const dust = (x, y, n) => { for (let i = 0; i < n; i++) { const a = -Math.PI * Math.random(); parts.push({ x, y, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, g: .25, life: 40, max: 40, r: 2 + Math.random() * 3, c: 'dirt' }); } };
  function boom(e, w, sub, A) {
    const W0 = TK.WEAP[w];
    for (const c of [...(A && A.F ? A.F.crates : [])]) if (TK.crateNear(shown, V.g, c, e.x, e.y)) { A.F.crates = A.F.crates.filter(z => z !== c); V.crates = V.crates.filter(z => z.id !== c.id); }
    if (W0.wall) { TK.mound(shown, V.g, e.x, e.y); V.gv++; snd.wall(); shake = Math.max(shake, 8); dust(e.x, e.y, 26); texts.push({ x: e.x, y: e.y - 90, t: '築牆！', c: '#8b5a2b', life: 70, s: 30 }); return; }
    if (W0.tele) {
      const t = V.T[A ? A.side : 0]; snd.tele();
      const spark = (x, y) => { for (let k = 0; k < 26; k++) { const a = Math.random() * 6.3, v = 1 + Math.random() * 4; parts.push({ x, y: y - 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 45, max: 45, r: 3 + Math.random() * 3, c: 'star' }); } };
      spark(t.x, t.y); t.x = t.tx = e.x; t.y = groundY(e.x) - 2; spark(t.x, t.y); texts.push({ x: e.x, y: t.y - 110, t: '傳送！', c: '#7048e8', life: 70, s: 32 }); return;
    }
    const P = sub ? TK.WEAP.c : W0, bg = w === 's', R = P.R * .9;
    TK.crater(shown, V.g, e.x, e.y, TK.crR(shown, w, sub)); V.gv++;
    snd.boom(bg); shake = Math.max(shake, bg ? 22 : (w === 't' || sub) ? 8 : w === 'd' ? 16 : 14);
    parts.push({ x: e.x, y: e.y, r: R, life: 16, max: 16, c: 'flash' });
    const n = bg ? 46 : (w === 't' || sub) ? 12 : 28;
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = Math.random() * (bg ? 7 : 5) + 1; parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, life: 26 + Math.random() * 18, max: 44, r: 3 + Math.random() * (bg ? 9 : 6), c: 'fire' }); }
    dust(e.x, e.y, Math.round(n * .8));
    for (let i = 0; i < (bg ? 10 : 4); i++)parts.push({ x: e.x + (Math.random() - .5) * 30, y: e.y - Math.random() * 20, vx: (Math.random() - .5) * .8 + V.wind * .05, vy: -.4 - Math.random() * .6, life: 80 + Math.random() * 40, max: 120, r: 12 + Math.random() * 14, c: 'smoke' });
    V.T.forEach((t, j) => {
      const d = e.d[j]; if (!d || t.dead || t.out) return;
      t.hp = Math.max(0, t.hp - d); t.flash = 14; t.shakeT = 12;
      texts.push({ x: t.x, y: t.y - 116, t: '-' + d, c: '#dc2626', life: 80, s: d >= 25 ? 50 : 40, vy: -.6 });
      if (e.hit === j + 1) { texts.push({ x: t.x, y: t.y - 72, t: '直擊！', c: '#f59f00', life: 80, s: 32, vy: -.6 }); snd.clang(); }
      if (t.hp <= 0 && !t.dead) { t.dead = 1; setTimeout(() => bigBoom(j), 250); }
    });
  }
  function bigBoom(i, fell) {
    const [x, y] = tankCenter(i); if (!fell) { snd.boom(true); shake = 26; }
    parts.push({ x, y, r: 90, life: 20, max: 20, c: 'flash' });
    for (let k = 0; k < 50; k++) { const a = Math.random() * Math.PI * 2, v = Math.random() * 8 + 2; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 40 + Math.random() * 20, max: 60, r: 4 + Math.random() * 9, c: 'fire' }); }
    for (let k = 0; k < 14; k++)parts.push({ x: x + (Math.random() - .5) * 40, y, vx: (Math.random() - .5), vy: -.6 - Math.random(), life: 140, max: 140, r: 16 + Math.random() * 18, c: 'smoke' });
    texts.push({ x, y: Math.min(y, H - 60) - 130, t: '💥 KO!', c: '#7c2d12', life: 110, s: 60, vy: -.4 });
  }

  /* ───────── 背景、裝飾（每局固定） ───────── */
  function makeDeco(seed) {
    const r = TK.rng((seed | 0) + 99), lk = L(), hills = [0, 1].map(k => { const a = [], ph = r() * 6, f = 2.5 + r() * 2 + k; for (let x = 0; x <= W; x += 20)a.push([x, H - 300 + k * 60 - (60 + 50 * k) * (.5 + .5 * Math.sin(x / W * Math.PI * f + ph)) - 30 * Math.sin(x / 90 + ph * 2)]); return a; });
    const xs = shown.T.map(t => t.x), trees = [], g0 = TK.decode(cur().map).g;
    for (let i = 0; i < 22; i++) { const x = 40 + r() * (W - 80); if (xs.some(t => Math.abs(x - t) < 60) || g0[Math.round(x)] >= TK.VOID - 1 || (shown.sp.lava && g0[Math.round(x)] > shown.sp.lava - 5)) continue; trees.push({ x, k: lk.deco, v: r(), s: .7 + r() * .6, c: ['#22c55e', '#16a34a', '#4ade80'][Math.floor(r() * 3)], f: ['#f472b6', '#facc15', '#fb923c', '#a78bfa'][Math.floor(r() * 4)] }); }
    trees.forEach(t => t.y0 = TK.gAt(g0, t.x));
    clouds = [...Array(lk.stars ? 0 : 9)].map(() => ({ x: r() * W, y: H - 550 + r() * 170, s: .6 + r() * .8, v: .3 + r() * .5 }));
    const stars = lk.stars ? [...Array(90)].map(() => [r() * W, r() * H * .6, .6 + r() * 1.6]) : null;
    deco = { hills, trees, sunX: 160 + r() * 300, bg: null, g0, stars };
    terrainCache.v = -1;
  }
  function drawBG(c) {
    const bi = bgImg(shown.site), useImg = ok(bi), bk = useImg ? 'img' : 'vec';
    if (!deco.bg || deco.bg.width !== cv.width || deco.bgKey !== bk) {
      const lk = L(), o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height; const b = o.getContext('2d'); b.setTransform(K, 0, 0, K, 0, 0);
      deco.bgKey = bk;
      if (useImg) {   // 背景圖：照比例蓋滿（舊的 1200×600 場地會裁掉一點左右）
        const r = Math.max(W / bi.naturalWidth, H / bi.naturalHeight), w = bi.naturalWidth * r, h = bi.naturalHeight * r;
        b.drawImage(bi, (W - w) / 2, H - h, w, h); deco.bg = o;
        c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(deco.bg, 0, 0); c.restore(); return;
      }
      const sky = b.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, lk.sky[0]); sky.addColorStop(.55, lk.sky[1]); sky.addColorStop(1, lk.sky[2]); b.fillStyle = sky; b.fillRect(0, 0, W, H);
      if (deco.stars) { b.fillStyle = '#fff'; deco.stars.forEach(([x, y, s]) => { b.globalAlpha = .4 + s / 3; b.beginPath(); b.arc(x, y, s, 0, 7); b.fill(); }); b.globalAlpha = 1;
        const ex = W - 260, ey = 150; const eg = b.createRadialGradient(ex - 15, ey - 15, 5, ex, ey, 46); eg.addColorStop(0, '#9ad1ff'); eg.addColorStop(1, '#2b6cb0'); b.fillStyle = eg; b.beginPath(); b.arc(ex, ey, 44, 0, 7); b.fill(); b.fillStyle = '#63c370'; b.beginPath(); b.ellipse(ex - 10, ey - 6, 16, 10, .4, 0, 7); b.fill(); b.beginPath(); b.ellipse(ex + 16, ey + 14, 10, 6, -.3, 0, 7); b.fill(); }
      else {
        const sx = deco.sunX, sy = H - 540, sun = shown.site === 'volcano' ? '#ffd8a8' : '#ffe066', sg = b.createRadialGradient(sx, sy, 10, sx, sy, 120); sg.addColorStop(0, 'rgba(255,248,200,1)'); sg.addColorStop(.25, 'rgba(255,230,120,.9)'); sg.addColorStop(1, 'rgba(255,230,120,0)'); b.fillStyle = sg; b.fillRect(sx - 130, sy - 130, 260, 260);
        b.fillStyle = sun; b.beginPath(); b.arc(sx, sy, 34, 0, 7); b.fill();
      }
      if (shown.site === 'volcano') { b.fillStyle = 'rgba(80,40,30,.25)'; for (let k = 0; k < 5; k++) { b.beginPath(); b.arc(W / 2 + (k - 2) * 30, H - 520 - k * 30, 40 + k * 12, 0, 7); b.fill(); } }
      lk.hills.forEach((col, k) => { b.fillStyle = col; b.beginPath(); b.moveTo(0, H); deco.hills[k].forEach(([x, y]) => b.lineTo(x, y + 80)); b.lineTo(W, H); b.closePath(); b.fill(); });
      if (shown.site === 'islands') { b.fillStyle = '#7cc8f0'; b.fillRect(0, H - 70, W, 70); b.fillStyle = 'rgba(255,255,255,.8)'; for (let k = 0; k < 12; k++) { const x = (k * 151) % W, y = H - 140 + (k % 3) * 18; b.beginPath(); b.ellipse(x, y, 60, 14, 0, 0, 7); b.fill(); } }
      deco.bg = o;
    }
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(deco.bg, 0, 0); c.restore();
  }
  function drawClouds(c, dt) {
    if (deco.bgKey === 'img') return;   // 背景圖已經有雲
    for (const k of clouds) {
      k.x += (k.v * .25 + V.wind * .09) * dt; if (k.x > W + 120) k.x = -120; if (k.x < -120) k.x = W + 120;
      c.save(); c.translate(k.x, k.y); c.scale(k.s, k.s); c.fillStyle = shown.site === 'volcano' ? 'rgba(120,90,80,.55)' : 'rgba(255,255,255,.88)';
      c.beginPath(); c.arc(0, 0, 26, 0, 7); c.arc(28, -12, 32, 0, 7); c.arc(60, 0, 26, 0, 7); c.arc(30, 8, 26, 0, 7); c.fill(); c.restore();
    }
  }
  let terrainCache = { v: -1, k: 0, cv: null };
  function drawTerrain(c, now) {
    const lk = L(), VD = TK.VOID - 1;
    if (terrainCache.v !== V.gv || terrainCache.k !== cv.width) {
      const o = terrainCache.cv || document.createElement('canvas'); o.width = cv.width; o.height = cv.height; const b = o.getContext('2d'); b.setTransform(K, 0, 0, K, 0, 0); b.clearRect(0, 0, W, H);
      const g = V.g, path = new Path2D();
      /* 地面：浮島的空隙不畫（一段一段畫） */
      let on = false;
      for (let x = 0; x < W; x += 2) { const y = g[x]; if (y >= VD) { if (on) { path.lineTo(x, H); path.closePath(); on = false; } continue; } if (!on) { path.moveTo(x, H); on = true; } path.lineTo(x, y); }
      if (on) { path.lineTo(W, g[W - 1] >= VD ? H : g[W - 1]); path.lineTo(W, H); path.closePath(); }
      const dirt = b.createLinearGradient(0, H - 380, 0, H); dirt.addColorStop(0, lk.dirt[0]); dirt.addColorStop(.45, lk.dirt[1]); dirt.addColorStop(1, lk.dirt[2]);
      b.fillStyle = dirt; b.fill(path);
      b.save(); b.clip(path); const r = TK.rng(7);
      for (let i = 0; i < 210; i++) { const x = r() * W, y = H - 370 + r() * 360; b.fillStyle = r() < .5 ? 'rgba(60,40,25,.3)' : 'rgba(255,240,210,.22)'; b.beginPath(); b.ellipse(x, y, 3 + r() * 6, 2 + r() * 3, r() * 3, 0, 7); b.fill(); }
      b.strokeStyle = 'rgba(60,35,20,.16)'; b.lineWidth = 3; for (let k = 1; k < 5; k++) { b.beginPath(); for (let x = 0; x <= W; x += 8) { const y = Math.min(H, g[Math.min(W - 1, x)]) + k * 34 + 6 * Math.sin(x / 40 + k); x ? b.lineTo(x, y) : b.moveTo(x, y); } b.stroke(); }
      b.restore();
      const g0 = deco.g0; b.lineCap = 'round';
      const seg = (col, w, dy) => { b.strokeStyle = col; b.lineWidth = w; b.beginPath(); let o2 = false; for (let x = 0; x < W; x += 2) { const top = g[x] < VD && Math.abs(g[x] - g0[x]) < 1.5; if (top) { o2 ? b.lineTo(x, g[x] + dy) : b.moveTo(x, g[x] + dy); o2 = true; } else o2 = false; } b.stroke(); };
      seg(lk.top[0], shown.site === 'snow' ? 16 : 12, 4); seg(lk.top[1], shown.site === 'snow' ? 10 : 7, 0);
      b.strokeStyle = lk.edge; b.lineWidth = 3; b.beginPath(); on = false; for (let x = 0; x < W; x += 2) { const hole = g[x] < VD && Math.abs(g[x] - g0[x]) >= 1.5; if (hole) { on ? b.lineTo(x, g[x]) : b.moveTo(x, g[x]); on = true; } else on = false; } b.stroke();
      for (const t of deco.trees) { const x = Math.round(t.x); if (Math.abs(g[x] - t.y0) > 3) continue; drawDeco(b, t, g[x]); }
      terrainCache = { v: V.gv, k: cv.width, cv: o };
    }
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(terrainCache.cv, 0, 0); c.restore();
    /* 岩漿池（火山）：地面比岩漿高度低的地方 */
    const lava = shown.sp.lava;
    if (lava) {
      const gl = c.createLinearGradient(0, lava, 0, lava + 60); gl.addColorStop(0, '#ffb21f'); gl.addColorStop(1, '#ff4d1a'); c.fillStyle = gl;
      /* 一段一段：上緣是岩漿表面（會波動），下緣沿著坑底 */
      for (let x = 0; x < W; x += 2) {
        if (!(V.g[x] > lava && V.g[x] < VD)) continue;
        let e = x; while (e + 2 < W && V.g[e + 2] > lava && V.g[e + 2] < VD) e += 2;
        c.beginPath(); for (let q = x; q <= e; q += 2) c.lineTo(q, lava + 2 * Math.sin(q / 18 + now / 300)); for (let q = e; q >= x; q -= 2) c.lineTo(q, V.g[q]); c.closePath(); c.fill();
        x = e;
      }
      c.fillStyle = 'rgba(255,240,180,.7)'; for (let x = 0; x < W; x += 37) { const y = V.g[x]; if (y > lava + 6 && y < VD) { c.beginPath(); c.arc(x + 6 * Math.sin(now / 400 + x), lava + 6, 2.5, 0, 7); c.fill(); } }
    }
    /* 最底下：水、冰、岩漿、沙、月面 */
    const fl = shown.FLOOR + 16, fc = lk.floor;
    c.fillStyle = fc; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 20)c.lineTo(x, fl + (shown.site === 'desert' || shown.site === 'moon' ? 0 : 4 * Math.sin(x / 50 + now / 500))); c.lineTo(W, H); c.closePath(); c.fill();
    if (shown.site !== 'desert' && shown.site !== 'moon') { c.fillStyle = 'rgba(255,255,255,.35)'; for (let x = 0; x < W; x += 60) { const y = fl + 4 + 4 * Math.sin(x / 50 + now / 500); c.fillRect(x + 10 + 10 * Math.sin(now / 700 + x), y, 22, 3); } }
  }
  function drawDeco(b, t, y) {
    b.save(); b.translate(t.x, y); b.scale(t.s, t.s);
    const k = t.k;
    if (k === 'tree' && t.v < .55) { b.fillStyle = '#8b5a2b'; b.fillRect(-4, -34, 8, 34); b.fillStyle = t.c; b.beginPath(); b.arc(0, -46, 20, 0, 7); b.arc(-14, -34, 14, 0, 7); b.arc(14, -34, 14, 0, 7); b.fill(); b.fillStyle = 'rgba(255,255,255,.25)'; b.beginPath(); b.arc(-6, -54, 7, 0, 7); b.fill(); }
    else if (k === 'tree' || k === 'shrub') { if (t.v < .8) { b.fillStyle = k === 'shrub' ? '#7a9a3a' : t.c; b.beginPath(); b.arc(-10, -8, 11, 0, 7); b.arc(6, -12, 13, 0, 7); b.arc(18, -6, 9, 0, 7); b.fill(); } else { b.strokeStyle = '#16a34a'; b.lineWidth = 2.5; b.beginPath(); b.moveTo(0, 0); b.lineTo(0, -18); b.stroke(); b.fillStyle = t.f; for (let i = 0; i < 5; i++) { b.beginPath(); b.arc(6 * Math.cos(i * 1.256), -18 + 6 * Math.sin(i * 1.256), 4, 0, 7); b.fill(); } } }
    else if (k === 'cactus') { b.fillStyle = '#3f9d3a'; rr(b, -6, -48, 12, 48, 6); b.fill(); rr(b, -20, -36, 8, 20, 4); b.fill(); rr(b, -20, -22, 18, 7, 3); b.fill(); rr(b, 12, -42, 8, 22, 4); b.fill(); rr(b, 2, -26, 18, 7, 3); b.fill(); }
    else if (k === 'pine') { b.fillStyle = '#6b4226'; b.fillRect(-3, -12, 6, 12); b.fillStyle = '#2f7a4a'; for (let i = 0; i < 3; i++) { b.beginPath(); b.moveTo(-20 + i * 4, -10 - i * 14); b.lineTo(20 - i * 4, -10 - i * 14); b.lineTo(0, -34 - i * 14); b.closePath(); b.fill(); } b.fillStyle = '#fff'; b.beginPath(); b.moveTo(-8, -56); b.lineTo(8, -56); b.lineTo(0, -62); b.closePath(); b.fill(); }
    else if (k === 'palm') { b.strokeStyle = '#a0662f'; b.lineWidth = 6; b.beginPath(); b.moveTo(0, 0); b.quadraticCurveTo(6, -30, 0, -56); b.stroke(); b.fillStyle = '#2f9e44'; for (let i = 0; i < 5; i++) { b.save(); b.translate(0, -56); b.rotate(-2.6 + i * .9); b.beginPath(); b.ellipse(16, 0, 18, 5, 0, 0, 7); b.fill(); b.restore(); } }
    else if (k === 'rock' || k === 'rockm') { b.fillStyle = k === 'rock' ? '#4a3a33' : '#8d8da3'; b.beginPath(); b.moveTo(-16, 0); b.lineTo(-10, -14); b.lineTo(4, -18); b.lineTo(16, -6); b.lineTo(14, 0); b.closePath(); b.fill(); }
    b.restore();
  }
  /* 補給箱：木箱＋問號；剛出現時從天上掛著降落傘掉下來 */
  function drawCrates(c, now, dt) {
    for (const k of V.crates) {
      const gy = groundY(k.x); if (gy > H) continue;
      if (k.fall) { k.fy = k.fy == null ? -40 : k.fy + 3.2 * dt; if (k.fy >= gy) { k.fy = null; k.fall = 0; dust(k.x, gy, 10); } }
      const y = k.fall ? k.fy : gy;
      c.save(); c.translate(k.x, y);
      if (k.fall) { c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-14, -28); c.lineTo(-26, -60); c.moveTo(14, -28); c.lineTo(26, -60); c.stroke(); c.fillStyle = '#ff6b6b'; c.beginPath(); c.arc(0, -60, 28, Math.PI, 0); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -60, 28, Math.PI * 1.33, Math.PI * 1.66); c.lineTo(0, -60); c.fill(); }
      const bob = k.fall ? 0 : Math.sin(now / 300 + k.x) * 1.5;
      c.fillStyle = '#c98b4b'; rr(c, -15, -30 + bob, 30, 28, 5); c.fill(); c.strokeStyle = '#7a4a1f'; c.lineWidth = 3; c.stroke();
      c.beginPath(); c.moveTo(-15, -16 + bob); c.lineTo(15, -16 + bob); c.stroke();
      c.fillStyle = '#fff3bf'; c.font = `900 18px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 0, -16 + bob); c.textBaseline = 'alphabetic';
      c.restore();
    }
  }

  /* ───────── 坦克 ───────── */
  function drawTank(c, i, now) {
    const t = V.T[i]; if (t.out || t.y > H + 40) return;
    const C = COL(i), sk = skinOf(i), tilt = slope(t.x) * .8, face = Math.cos(t.a * Math.PI / 180) >= 0 ? 1 : -1;
    let jx = 0; if (t.shakeT > 0) { jx = (Math.random() - .5) * 6; t.shakeT--; }
    const body = img(bodyName(sk)), bar = img(barName(sk)), dead = t.dead, g = V4[sk];
    c.save(); c.translate(t.x + jx, t.y + 1); c.rotate(tilt);
    if (t.kick > 0) { c.translate(-Math.cos(t.a * Math.PI / 180) * t.kick * .4, 0); t.kick *= .8; if (t.kick < .3) t.kick = 0; }
    c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(0, 1, 32, 5, 0, 0, 7); c.fill();
    if (ok(body) && ok(bar)) {
      const s = TANK_WW / BODY_W, P = g ? g.p : PORT[sk], bot = g ? g.bot : BODY_BOTTOM, bh = body.naturalHeight / body.naturalWidth * BODY_W * s;
      c.save(); c.scale(face, 1); if (dead) c.globalAlpha = .55;
      /* 砲管：圓軸中心對準砲塔接口，跟著角度轉（朝左時整台鏡射） */
      const la = (face > 0 ? t.a : 180 - t.a) * Math.PI / 180 + face * tilt;   // 整台車跟著地形斜，砲管要轉回來，指的方向才等於瞄準角度
      const barrel = () => { c.save(); c.translate((P[0] - BODY_W / 2) * s, (P[1] - bot) * s); c.rotate(-la); const bs = s * (g ? g.k : BAR_K), pv = g ? g.piv : BAR_PIV, bw = g ? g.w : BAR_W, bh2 = g ? g.h : BAR_H; c.drawImage(bar, -pv[0] * bs, -pv[1] * bs, bw * bs, bh2 * bs); c.restore(); };
      if (!g) barrel();                                  // 基本款：砲管根部藏在車身後面
      c.drawImage(body, -BODY_W / 2 * s, -bot * s, BODY_W * s, bh);
      if (g) barrel();                                   // 進階以上：砲管的圓軸蓋在砲塔接口上
      if (t.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = t.flash / 14 * .5; c.drawImage(body, -BODY_W / 2 * s, -bot * s, BODY_W * s, bh); t.flash--; }
      c.restore();
      if (dead) { c.fillStyle = 'rgba(40,40,40,.35)'; c.beginPath(); c.ellipse(0, -22, 30, 20, 0, 0, 7); c.fill(); }
    } else drawVecTank(c, t, C, dead);
    c.restore();
    /* 頭上：隊伍色條＋名字（換造型也分得出敵我）、血條 */
    const hp = t.hp, bw = 76, x0 = t.x - bw / 2, y0 = t.y - 74;
    t.hpShow = t.hpShow == null ? hp : lerp(t.hpShow, hp, .08);
    const me = host.me() === i, label = nm(i) + (me ? '（我）' : '');
    c.font = `900 20px ${FONT}`; const tw = Math.max(bw, c.measureText(label).width + 22);
    c.fillStyle = dead ? '#9ca3af' : C.main; rr(c, t.x - tw / 2, y0 - 34, tw, 27, 13.5); c.fill();
    if (me) { c.strokeStyle = '#fff3bf'; c.lineWidth = 3; c.stroke(); }
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, t.x, y0 - 20); c.textBaseline = 'alphabetic';
    c.fillStyle = 'rgba(255,255,255,.9)'; rr(c, x0 - 3, y0 - 3, bw + 6, 15, 7); c.fill();
    c.fillStyle = '#e5e7eb'; rr(c, x0, y0, bw, 9, 4.5); c.fill();
    c.fillStyle = '#fca5a5'; rr(c, x0, y0, bw * t.hpShow / 100, 9, 4.5); c.fill();
    c.fillStyle = hp > 50 ? '#22c55e' : hp > 25 ? '#f59e0b' : '#ef4444'; if (hp > 0) { rr(c, x0, y0, Math.max(6, bw * hp / 100), 9, 4.5); c.fill(); }
    if (!anim && !shown.over && V.turn === i && !dead) { const by = y0 - 58 + 5 * Math.sin(now / 180); c.fillStyle = C.main; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(t.x - 13, by); c.lineTo(t.x + 13, by); c.lineTo(t.x, by + 15); c.closePath(); c.stroke(); c.fill(); }
  }
  /* 圖還沒載入好時的簡單坦克 */
  function drawVecTank(c, t, C, dead) {
    c.save(); c.translate(0, -18); c.rotate(-t.a * Math.PI / 180); c.fillStyle = dead ? '#444' : '#4b5563'; rr(c, 0, -4.5, 34, 9, 4); c.fill(); c.restore();
    c.fillStyle = dead ? '#2b2b2b' : '#374151'; rr(c, -28, -12, 56, 13, 6.5); c.fill();
    c.fillStyle = dead ? '#555' : C.main; c.beginPath(); c.moveTo(-26, -12); c.lineTo(-20, -24); c.lineTo(20, -24); c.lineTo(26, -12); c.closePath(); c.fill();
    c.beginPath(); c.arc(0, -24, 14, Math.PI, 0); c.closePath(); c.fill();
  }

  /* ───────── 瞄準線、砲彈、粒子、文字 ───────── */
  function drawAim(c) {
    if (anim || shown.over || pendingFire || !host.canAct()) return;
    const s = shown.turn, A = aim[s];
    const Ls = lastShot[s]; if (Ls) { const pts = fromMuzzle(TK.preview(shown, s, Ls.x, Ls.a, Ls.p, 400), s, Ls.x, Ls.a); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.setLineDash([3, 7]); c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.setLineDash([]); }
    const pts = fromMuzzle(TK.preview(shown, s, drive.x, A.a, A.p, 24), s, drive.x, A.a);
    pts.forEach(([x, y], i) => { if (i % 2) return; c.fillStyle = `rgba(255,255,255,${.95 - i / pts.length * .7})`; c.beginPath(); c.arc(x, y, 4.6 - i / pts.length * 2, 0, 7); c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; c.stroke(); });
    const Bp = barrelAt(s, drive.x, A.a), cx = Bp.px, cy = Bp.py, a1 = -A.a * Math.PI / 180, base = A.a <= 90 ? 0 : -Math.PI;
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, 52, Math.min(a1, base), Math.max(a1, base)); c.stroke();
    c.font = `900 22px ${FONT}`; c.textAlign = 'center'; const lx = cx + 76 * Math.cos(a1), ly = cy + 76 * Math.sin(a1);
    const tx = Math.min(90, A.a <= 90 ? A.a : 180 - A.a) + '°';
    c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.35)'; c.strokeText(tx, lx, ly); c.fillStyle = '#fff'; c.fillText(tx, lx, ly);
  }
  function drawShells(c) {
    for (const s of shells) {
      if (s.trail && s.trail.length) { for (let i = 0; i < s.trail.length; i++) { const [x, y] = s.trail[i], k = i / s.trail.length; c.fillStyle = `rgba(255,255,255,${k * .55})`; c.beginPath(); c.arc(x, y, 1 + k * 4, 0, 7); c.fill(); } }
      if (!s.live) continue;
      const [X, Y] = shellXY(s);
      const w = anim && anim.m.w, bg = w === 's', r = bg ? 9 : (w === 't' || s.sub) ? 5 : 7;
      if (bg) { const gl = c.createRadialGradient(X, Y, 0, X, Y, 26); gl.addColorStop(0, 'rgba(255,200,80,.9)'); gl.addColorStop(1, 'rgba(255,120,0,0)'); c.fillStyle = gl; c.beginPath(); c.arc(X, Y, 26, 0, 7); c.fill(); }
      const sk = (!w || w === 'n') && !s.sub && anim ? skinOf(anim.side) : null, si = sk && SHELL_SK.includes(sk) ? img(shellName(sk)) : null;
      if (si && ok(si)) {
        const L = SHELL_L, h = L * si.naturalHeight / si.naturalWidth;
        c.save(); c.translate(X, Y); c.rotate(Math.atan2(s.vy || 0, s.vx || 1));
        c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 4; c.shadowOffsetY = 1;   // 淡淡的影子：亮的場地也看得清楚
        c.drawImage(si, -L / 2, -h / 2, L, h); c.restore();
        continue;
      }
      const col = { s: '#7c2d12', b: '#ea580c', c: '#d6336c', d: '#868e96', w: '#8b5a2b', p: '#7048e8' }[w] || '#1f2937';
      c.fillStyle = s.sub ? ['#f59f00', '#1c7ed6', '#2f9e44', '#e03131', '#7048e8'][s.k % 5] : col; c.beginPath(); c.arc(X, Y, r, 0, 7); c.fill();
      if (w === 'p') { c.strokeStyle = '#e5dbff'; c.lineWidth = 2; c.beginPath(); c.arc(X, Y, r + 4 + Math.sin(performance.now() / 80) * 2, 0, 7); c.stroke(); }
      if (s.drill > 0) dust(X, Y, 1);
      c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(X - r * .35, Y - r * .35, r * .35, 0, 7); c.fill();
    }
  }
  function drawParts(c, dt) {
    for (const p of parts) {
      p.life -= dt; const k = Math.max(0, p.life / p.max);
      if (p.vx != null) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += p.g * dt; if (p.c === 'fire') { p.vx *= .94; p.vy *= .94; } if (p.c === 'smoke') { p.r += .25 * dt; } if (p.c === 'dirt' && p.x >= 0 && p.x < W && p.y > groundY(p.x) && groundY(p.x) < H) { p.vy *= -.25; p.vx *= .5; p.y = groundY(p.x); } }
      if (p.c === 'flash') { const r = Math.max(.1, p.r * (1.2 - k * .6)); const gr = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); gr.addColorStop(0, `rgba(255,255,230,${k})`); gr.addColorStop(.4, `rgba(255,200,60,${k * .8})`); gr.addColorStop(1, 'rgba(255,120,0,0)'); c.fillStyle = gr; c.beginPath(); c.arc(p.x, p.y, r, 0, 7); c.fill(); }
      else if (p.c === 'fire') { c.fillStyle = k > .6 ? `rgba(255,240,150,${k})` : k > .3 ? `rgba(255,150,40,${k})` : `rgba(120,60,30,${k})`; c.beginPath(); c.arc(p.x, p.y, p.r * (.4 + k * .6), 0, 7); c.fill(); }
      else if (p.c === 'dirt') { c.fillStyle = shown && shown.site === 'snow' ? `rgba(240,248,255,${Math.min(1, k * 2)})` : `rgba(110,70,35,${Math.min(1, k * 2)})`; c.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r); }
      else if (p.c === 'star') { c.fillStyle = `rgba(255,224,102,${k})`; c.beginPath(); for (let q = 0; q < 10; q++) { const a = q * Math.PI / 5, rr2 = q % 2 ? p.r * .45 : p.r; c.lineTo(p.x + rr2 * Math.cos(a), p.y + rr2 * Math.sin(a)); } c.fill(); }
      else { c.fillStyle = `rgba(110,110,120,${k * .45})`; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); }
    }
    parts = parts.filter(p => p.life > 0); if (parts.length > 600) parts.splice(0, parts.length - 600);
    for (const t of texts) {
      t.life -= dt; t.y += (t.vy || -.5) * dt; const k = Math.min(1, t.life / 25), pop = 1 + Math.max(0, (t.age = (t.age || 0) + dt) < 8 ? (8 - t.age) / 16 : 0);
      c.save(); c.globalAlpha = Math.max(0, k); c.font = `900 ${t.s * pop}px ${FONT}`; c.textAlign = 'center'; c.lineWidth = 6; c.strokeStyle = '#fff'; c.strokeText(t.t, t.x, t.y); c.fillStyle = t.c; c.fillText(t.t, t.x, t.y); c.restore();
    }
    texts = texts.filter(t => t.life > 0);
  }

  /* ───────── 上方的資訊列：每個人一張小卡（左邊一半、右邊一半），中間是風和倒數 ───────── */
  const CW = 262, CH = 64;
  function cardXY(i, n) { const Lh = Math.ceil(n / 2), cw = Math.min(CW, (W - 260) / n - 10); return { x: i < Lh ? 12 + i * (cw + 10) : W - 12 - cw - (n - 1 - i) * (cw + 10), w: cw }; }
  function drawHUD(c) {
    const me = host.me(), n = V.T.length, heart = img('tank-ui-health-v2');
    for (let i = 0; i < n; i++) {
      const t = V.T[i], C = COL(i), { x, w: cw } = cardXY(i, n), y = 10, act = !shown.over && !anim && V.turn === i, gone = t.out, dead = t.dead || gone;
      c.save(); c.shadowColor = 'rgba(0,0,0,.18)'; c.shadowBlur = 8; c.fillStyle = dead ? 'rgba(235,235,235,.92)' : 'rgba(255,253,246,.95)'; rr(c, x, y, cw, CH, 18); c.fill(); c.restore();
      c.fillStyle = dead ? '#9ca3af' : C.main; rr(c, x, y, 10, CH, 5); c.fill();   // 隊伍色條
      if (act) { c.strokeStyle = C.main; c.lineWidth = 5; rr(c, x, y, cw, CH, 18); c.stroke(); }
      if (me === i) { c.fillStyle = C.main; rr(c, x + cw - 50, y - 6, 46, 20, 10); c.fill(); c.fillStyle = '#fff'; c.font = `900 14px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('我', x + cw - 27, y + 4); }
      const sk = img(bodyName(skinOf(i)));
      if (ok(sk)) { c.save(); if (dead) c.globalAlpha = .5; const s = 48 / sk.naturalWidth; c.drawImage(sk, x + 14, y + CH / 2 - sk.naturalHeight * s / 2, 48, sk.naturalHeight * s); c.restore(); }
      c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = dead ? '#6b7280' : '#1f2937'; c.font = `900 21px ${FONT}`;
      let name = nm(i); if (name.length > 7) name = name.slice(0, 7) + '…'; c.fillText(name, x + 68, y + 20);
      const hb = cw - 84 - 18, hx = x + 68 + 18;
      if (gone) { c.fillStyle = '#6b7280'; c.font = `900 18px ${FONT}`; c.fillText('離開了', x + 68, y + 46); }
      else {
        if (ok(heart)) c.drawImage(heart, x + 66, y + 37, 18, 18);
        c.fillStyle = '#e5e7eb'; rr(c, hx, y + 38, hb, 16, 8); c.fill();
        const v = Math.max(0, t.hp); c.fillStyle = v > 50 ? '#22c55e' : v > 25 ? '#f59e0b' : '#ef4444'; if (v > 0) { rr(c, hx, y + 38, Math.max(10, hb * v / 100), 16, 8); c.fill(); }
        c.fillStyle = '#111'; c.font = `900 14px ${FONT}`; c.textAlign = 'center'; c.fillText(v > 0 ? v + ' / 100' : 'KO', hx + hb / 2, y + 47);
      }
      c.textBaseline = 'alphabetic';
    }
    /* 風（圖示朝風吹的方向，數字是大小） */
    const wd = V.wind, cx = W / 2, cy = 10; c.save(); c.shadowColor = 'rgba(0,0,0,.18)'; c.shadowBlur = 8; c.fillStyle = 'rgba(255,253,246,.95)'; rr(c, cx - 110, cy, 220, CH, 18); c.fill(); c.restore();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#475569'; c.font = `900 18px ${FONT}`; c.fillText('風', cx - 84, cy + 20);
    c.font = `900 13px ${FONT}`; c.fillStyle = '#64748b'; c.fillText(`剩 ${Math.max(0, shown.maxT - shown.a)} 發`, cx - 84, cy + 47);
    c.fillStyle = '#e2e8f0'; c.fillRect(cx - 58, cy + 10, 2, 44);
    const n2 = Math.abs(wd), wi = img(wd < 0 ? 'tank-ui-wind-left-v2' : 'tank-ui-wind-right-v2');
    if (!n2) { c.fillStyle = '#64748b'; c.font = `900 26px ${FONT}`; c.fillText('無風', cx + 22, cy + 34); }
    else {
      if (ok(wi)) c.drawImage(wi, cx - 46, cy + 8, 72, 48);
      c.font = `900 32px 'Avenir Next',Arial,sans-serif`; c.fillStyle = n2 >= 6 ? '#dc2626' : n2 >= 3 ? '#d97706' : '#0f172a'; c.fillText(n2, cx + 70, cy + 35);
    }
    c.textBaseline = 'alphabetic';
    /* 場地名稱 */
    c.font = `900 15px ${FONT}`; c.fillStyle = 'rgba(255,255,255,.9)'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.25)'; const sn = TK.SITES[shown.site].n; c.strokeText(sn, cx, cy + CH + 66); c.fillText(sn, cx, cy + CH + 66);
    /* 倒數：在風的下面 */
    if (!shown.over && !anim) {
      const left = Math.max(0, (turnMs() - (performance.now() - turnAt)) / 1000), tx = cx, ty = cy + CH + 30;
      c.fillStyle = 'rgba(255,253,246,.95)'; c.beginPath(); c.arc(tx, ty, 26, 0, 7); c.fill();
      c.strokeStyle = '#e2e8f0'; c.lineWidth = 6; c.beginPath(); c.arc(tx, ty, 20, 0, 7); c.stroke();
      c.strokeStyle = left <= 8 ? '#ef4444' : COL(V.turn).main; c.beginPath(); c.arc(tx, ty, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left / (turnMs() / 1000)); c.stroke();
      c.fillStyle = left <= 8 ? '#ef4444' : '#0f172a'; c.font = `900 18px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(Math.ceil(left), tx, ty + 1); c.textBaseline = 'alphabetic';
    }
    if (banner && banner.life > 0) {
      banner.life--; const k = Math.min(1, banner.life / 20), age = 90 - banner.life, sc = age < 10 ? .6 + age * .04 : 1;
      c.save(); c.globalAlpha = k; c.translate(W / 2, H / 2 - 60); c.scale(sc, sc); c.font = `900 66px ${FONT}`; c.textAlign = 'center'; c.lineWidth = 11; c.strokeStyle = '#fff'; c.strokeText(banner.t, 0, 0); c.fillStyle = banner.c; c.fillText(banner.t, 0, 0); c.restore();
    }
    /* 撿到補給箱：大大的提示 */
    if (big && big.life > 0) {
      big.life--; const k = Math.min(1, big.life / 20), age = 170 - big.life, sc = age < 12 ? .5 + age * .042 : 1;
      c.save(); c.globalAlpha = k; c.translate(W / 2, H / 2 + 10); c.scale(sc, sc);
      c.fillStyle = 'rgba(255,253,246,.96)'; c.strokeStyle = big.c; c.lineWidth = 6; rr(c, -360, -70, 720, 140, 30); c.fill(); c.stroke();
      const ic = big.w && IMGC['__w' + big.w]; if (ic && ok(ic)) c.drawImage(ic, -340, -50, 100, 100);
      c.textAlign = 'left'; c.fillStyle = '#1f2937'; c.font = `900 38px ${FONT}`; c.fillText(big.t, -225, -6); c.fillStyle = '#9a7a52'; c.font = `900 24px ${FONT}`; c.fillText(big.s, -225, 34);
      c.restore();
    }
  }
  const turnMs = () => host.solo() ? 60000 : TURN_MS;

  /* ───────── 主迴圈 ───────── */
  function loop(now) { if (!running) return; raf = requestAnimationFrame(loop); frame(now); }
  function frame(now) {
    if (!shown || !V.g) return;
    let dt = Math.max(0, Math.min(3, (now - tPrev) / (1000 / 60))); tPrev = Math.max(tPrev, now);
    if (anim) { let steps = Math.round(dt) || 1; while (steps-- > 0 && anim) stepAnim(); }
    for (const t of V.T) { if (Math.abs(t.x - t.tx) > .5 && !(anim && anim.ph === 'drive')) t.x = lerp(t.x, t.tx, .12); const gy = groundY(t.x); if (t.y < gy) t.y = Math.min(gy, t.y + 4 * dt); else t.y = gy; }
    if (!anim && !shown.over) {
      const s = shown.turn;
      if (host.canAct()) { V.T[s].x = V.T[s].tx = drive.x; V.T[s].a = lerp(V.T[s].a, aim[s].a, .35); }
      else if (live && live.s === s) { V.T[s].x = V.T[s].tx = lerp(V.T[s].x, live.x, .2); V.T[s].a = lerp(V.T[s].a, live.a, .25); }
      timer();
    }
    const c = ctx; c.setTransform(K, 0, 0, K, 0, 0);
    let sx = 0, sy = 0; if (shake > .3) { sx = (Math.random() - .5) * shake; sy = (Math.random() - .5) * shake; shake *= .9; } else shake = 0;
    drawBG(c); c.setTransform(K, 0, 0, K, sx * K, sy * K);
    drawClouds(c, dt); drawTerrain(c, now); drawCrates(c, now, dt);
    drawAim(c);
    for (let i = 0; i < V.T.length; i++) drawTank(c, i, now);
    drawShells(c); drawParts(c, dt);
    c.setTransform(K, 0, 0, K, 0, 0); drawHUD(c);
    if (hold) holdTick(now);
  }
  function timer() {
    const left = turnMs() - (performance.now() - turnAt);
    if (host.canAct() && !pendingFire) {
      const sec = Math.ceil(left / 1000); if (sec <= 5 && sec > 0 && sec !== timer.last) { timer.last = sec; snd.tick(); }
      if (left <= 0 && timeoutSent !== turnKey) { timeoutSent = turnKey; pendingFire = true; paintCtl(); host.send(TK.pass(shown, shown.turn, drive.x)); }
    }
  }

  /* ───────── 操作 ───────── */
  const UI = n => `<img class="tki" src="img/game/tank-ui-${n}-v2.webp" alt="" draggable="false">`;
  function buildCtl() {
    ctl.innerHTML = `
      <div class="pdw" id="pdW"></div>
      <div class="pdk pda"><label>${UI('angle')}角度</label><button data-k="a-" aria-label="砲管放低">▼</button><b id="pdA">45°</b><button data-k="a+" aria-label="砲管抬高">▲</button><button class="flip" data-k="flip" aria-label="轉向">⇄</button></div>
      <div class="pdk"><label>${UI('power')}力道</label><button data-k="p-" aria-label="力道變小">−</button><div class="pdbar" id="pdPB"><i></i><b id="pdP">60</b></div><button data-k="p+" aria-label="力道變大">＋</button></div>
      <div class="pdk"><label>${UI('fuel')}移動</label><button data-k="x-" class="mv" aria-label="往左開">${UI('move-left')}</button><div class="pdbar fuel" id="pdFB"><i></i><b id="pdF"></b></div><button data-k="x+" class="mv" aria-label="往右開">${UI('move-right')}</button></div>
      <button id="pdFire">${UI('fire')}<span>發射</span></button>
      <div id="pdWait"></div>`;
    ctl.querySelectorAll('[data-k]').forEach(b => {
      b.addEventListener('pointerdown', e => { e.preventDefault(); if (!myInput()) return; try { b.setPointerCapture(e.pointerId); } catch (x) { } act(b.dataset.k); if (b.dataset.k !== 'flip') hold = { k: b.dataset.k, at: performance.now() + 320, b }; });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, stopHold));
    });
    ctl.querySelector('#pdFire').addEventListener('pointerdown', e => { e.preventDefault(); fireNow(); });
    const pb = ctl.querySelector('#pdPB'); const setP = e => { if (!myInput()) return; const r = pb.getBoundingClientRect(); aim[shown.turn].p = clamp(Math.round((e.clientX - r.left) / r.width * 100), 10, 100); sendLive(); paintCtl(); };
    pb.addEventListener('pointerdown', e => { e.preventDefault(); try { pb.setPointerCapture(e.pointerId); } catch (x) { } setP(e); pb.onpointermove = setP; });
    pb.addEventListener('pointerup', () => pb.onpointermove = null);
  }
  /* 砲彈按鈕：這一局有的才放（舊房間只有當時的 3～4 種），4×2 格子 */
  function buildWeapons() {
    const box = ctl.querySelector('#pdW'), list = TK.weapons(shown); if (box.dataset.k === list.join('')) return; box.dataset.k = list.join('');
    box.style.gridTemplateColumns = `repeat(${list.length > 6 ? 4 : list.length > 4 ? 3 : list.length},minmax(0,1fr))`;
    box.innerHTML = list.map(k => `<button data-w="${k}"><img src="${wIcon(k)}" alt=""><b>${WSHOW[k]}</b><em></em></button>`).join('');
    list.forEach(k => { const im = new Image(); im.src = wIcon(k); IMGC['__w' + k] = im; });
    box.querySelectorAll('[data-w]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); if (!myInput()) return; const s = shown.turn; if (TK.left(shown, s, b.dataset.w) <= 0) return; aim[s].w = b.dataset.w; snd.click(); paintCtl(); }));
  }
  function stopHold() { hold = null; }
  function holdTick(now) { if (!hold) return; if (!myInput()) return stopHold(); if (now >= hold.at) { act(hold.k, true); hold.at = now + (hold.k[0] === 'x' ? 16 : 55); } }
  const myInput = () => !!shown && !shown.over && !anim && !queue.length && !pendingFire && host.canAct();
  function act(k, rep) {
    const s = shown.turn, A = aim[s];
    if (k === 'a+') { if (A.a < 90) A.a++; else if (A.a > 90) A.a--; if (!rep) snd.click(); }
    else if (k === 'a-') { const f = A.a < 90 ? 1 : A.a > 90 ? -1 : (A.f || 1); A.a = clamp(A.a + (f > 0 ? -1 : 1), 0, 180); if (!rep) snd.click(); }
    else if (k === 'flip') { A.a = 180 - A.a; A.f = -(A.f || 1); snd.click(); }
    else if (k === 'p+' || k === 'p-') { A.p = clamp(A.p + (k === 'p+' ? 1 : -1), 10, 100); if (!rep) snd.click(); }
    else if (k === 'x+' || k === 'x-') {
      const d = k === 'x+' ? 2 : -2;
      for (let i = 0; i < (rep ? 1 : 3); i++) {
        const to = drive.x + d, cost = TK.driveCost(shown, drive.x, to);
        if (drive.fuel < cost) { if (!rep) texts.push({ x: drive.x, y: groundY(drive.x) - 110, t: '沒油了', c: '#64748b', life: 40, s: 24 }); break; }
        if (!TK.canDrive(shown, s, drive.x, to)) { if (!rep) texts.push({ x: drive.x, y: groundY(drive.x) - 110, t: '開不過去', c: '#64748b', life: 40, s: 24 }); break; }
        drive.x = to; drive.fuel -= cost;
      }
      if (Math.random() < .3) snd.drive();
    }
    if (A.a !== 90) A.f = A.a < 90 ? 1 : -1;
    sendLive(); paintCtl();
  }
  function sendLive() { const now = performance.now(); if (now - liveT < 140) { clearTimeout(sendLive.t); sendLive.t = setTimeout(sendLive, 150); return; } liveT = now; if (!host.solo() && shown) host.live({ s: shown.turn, n: shownN, x: Math.round(drive.x), a: aim[shown.turn].a }); }
  function fireNow() {
    if (!myInput()) return; const s = shown.turn, A = aim[s];
    const f = TK.fire(shown, drive.x, A.a, A.p, A.w); pendingFire = true; paintCtl(); host.send(f.tok);
  }
  function bindInput() {
    let drag = false;
    const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
    const aimAt = e => { const s = shown.turn, [x, y] = pt(e), cx = drive.x, cy = groundY(drive.x) - 20; let a = Math.atan2(-(y - cy), x - cx) * 180 / Math.PI; if (a < -90) a = 180; else if (a < 0) a = 0; aim[s].a = Math.round(clamp(a, 0, 180)); if (aim[s].a !== 90) aim[s].f = aim[s].a < 90 ? 1 : -1; aim[s].p = Math.round(clamp(Math.hypot(x - cx, y - cy) / 3, 10, 100)); sendLive(); paintCtl(); };
    cv.addEventListener('pointerdown', e => { ac(); if (!myInput()) return; e.preventDefault(); drag = true; try { cv.setPointerCapture(e.pointerId); } catch (x) { } aimAt(e); });
    cv.addEventListener('pointermove', e => { if (drag && myInput()) aimAt(e); });
    ['pointerup', 'pointercancel'].forEach(ev => cv.addEventListener(ev, () => drag = false));
    addEventListener('keydown', e => {
      if (!running || !myInput()) return; const m = { ArrowUp: 'a+', ArrowDown: 'a-', ArrowRight: 'p+', ArrowLeft: 'p-', KeyD: 'x+', KeyA: 'x-', KeyQ: 'flip', KeyF: 'flip' }[e.code];
      if (m) { e.preventDefault(); act(m, e.repeat); } else if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); fireNow(); }
      else if (e.key >= '1' && e.key <= '8') { const w = TK.weapons(shown)[+e.key - 1]; if (w && TK.left(shown, shown.turn, w) > 0) { aim[shown.turn].w = w; paintCtl(); } }
    });
  }
  function paintCtl() {
    if (!ctl || !shown || !aim.length) return;
    buildWeapons();
    const s = shown.turn, A = aim[s], on = myInput(), me = host.me();
    ctl.classList.toggle('off', !on); ctl.style.setProperty('--fc', COL(s).main); ctl.style.setProperty('--fd', COL(s).dark);
    ctl.querySelectorAll('[data-w]').forEach(b => { const w = b.dataset.w, n = TK.left(shown, s, w), bonus = shown.T[s].bonus[w] || 0; b.classList.toggle('on', A.w === w); b.classList.toggle('bonus', bonus > 0); b.disabled = !on || n <= 0; b.querySelector('em').textContent = n === Infinity ? '∞' : '×' + Math.max(0, n); });
    ctl.querySelector('#pdA').textContent = angTxt(A.a);
    ctl.querySelector('#pdP').textContent = A.p; ctl.querySelector('#pdPB i').style.width = A.p + '%';
    const fuel = drive.i === s ? drive.fuel : TK.FUEL;
    ctl.querySelector('#pdFB i').style.width = (fuel / TK.FUEL * 100) + '%'; ctl.querySelector('#pdF').textContent = Math.round(fuel / TK.FUEL * 100) + '%';
    ctl.querySelectorAll('[data-k],#pdFire').forEach(b => b.disabled = !on);
    const w = ctl.querySelector('#pdWait');
    w.textContent = shown.over ? '' : anim || queue.length ? '💥 砲彈飛行中…' : pendingFire ? '發射！' : on ? '' : host.solo() ? '' :
      me < 0 ? `👀 觀戰中：${nm(s)} 瞄準中…` : !TK.alive(shown, me) ? `💀 你被打倒了，看看誰會贏！（${nm(s)} 瞄準中）` : `⏳ ${nm(s)} 瞄準中…`;
  }
  function unlock() { pendingFire = false; timeoutSent = ''; paintCtl(); }
  /* 結算用：每個人的命中率、最遠的一砲、最痛的一擊 */
  function statsHTML(S, names) {
    if (!S || !S.T) return '';
    const n = names || [], row = (t, i) => { const st = t.st; return `<tr><td><i style="background:${(TEAMC[S.mode === 'team' ? 'team' : 'ffa'][i] || TEAMC.ffa[0]).main}"></i>${n[i] || '玩家' + (i + 1)}</td><td>${st.shots ? Math.round(st.hits / st.shots * 100) + '%' : '—'}<small>${st.hits}/${st.shots}</small></td><td>${st.far ? Math.round(st.far / 10) + ' 公尺' : '—'}</td><td>${st.best ? '-' + st.best : '—'}</td></tr>`; };
    return `<table class="tkst"><tr><th></th><th>命中率</th><th>最遠一砲</th><th>最痛一擊</th></tr>${S.T.map(row).join('')}</table>`;
  }
  root.TKV = { mount, start, stop, update, setLive, busy, fit, unlock, turnAge, shown: () => shown, statsHTML, wIcon, SKINS, SKIN_N, bodyName, _age: ms => { turnAt -= ms; }, _tick: n => { for (let k = 0; k < n && running; k++) frame(tPrev + 1000 / 60); }, _dbg: () => ({ shownN, queue: queue.length, anim: anim && anim.ph, aim, drive, V, pendingFire }) };
})(window);
