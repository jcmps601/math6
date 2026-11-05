/* 601 電子寵物（新版）
   ・練習答對 → 寵物拿經驗、金幣。每天前 20 題答對「元氣加倍」拿全額，之後減半；完成每日任務 +30 經驗、+10 金幣；吃飽又開心經驗 ×1.2
   ・等級最高 Lv.30：Lv.7 第一次進化、Lv.18 最終進化。Lv.18 送普通蛋、Lv.30 送稀有蛋；達成學習成就送稀有／傳說蛋
   ・20 種寵物（初始 8、稀有 8、傳說 4），全部住在「寵物屋」，一次帶一隻在身邊；圖鑑記錄拿過的寵物
   ・配件 4 個部位（帽子、眼鏡、脖子、背後）所有寵物共用；異色每隻各自買；房間可以換
   ・畫法：有圖（img/pet/種類-型態.webp，寫在 ART 裡）就用圖，還沒有圖的用 SVG 畫；配件疊在上面
   資料都在 sum.pet（跟著摘要同步）；公開給同學看的樣子在 learn/pet/座號 */
(function () {
  /* ───────── 寵物 ───────── r：0 初始、1 稀有、2 傳說；f：三個型態的名字；pal：顏色；emo：還沒有圖時的小標記 */
  const C3 = (m, l, d) => ({ m, l, d });
  const firstN = () => (sum && sum.first) || 0, totN = () => (sum && sum.total) || 0;
  const daysN = () => sum ? Object.values(sum.days || {}).filter(v => v > 0).length : 0;
  const stk = () => { try { return streak(); } catch (e) { return 0; } };
  const mathU = () => UN.filter(u => u.g && u.s === 'math');
  const star3 = k => ((sum && sum.best && sum.best[k]) || 0) >= 9;
  const A = () => (P() && P().ach) || {};
  const SPECIES = {
    chick: { n: '啾啾鳥', f: ['啾啾', '啾翼', '晴空鳥'], r: 0, pal: C3('#ffd84d', '#fff4bf', '#d39a00'), say: '啾啾！' },
    cat: { n: '喵喵貓', f: ['喵喵', '星喵', '月光喵'], r: 0, pal: C3('#ffb067', '#ffe8cf', '#dc6f17'), say: '喵～' },
    dragon: { n: '火火龍', f: ['火火', '焰焰', '炎龍王'], r: 0, pal: C3('#7fe0b8', '#dcfbec', '#2c9e74'), say: '呼～噴一點點火！' },
    bunny: { n: '跳跳兔', f: ['跳跳', '蹦蹦', '花冠兔'], r: 0, pal: C3('#ffa8c5', '#ffe3ee', '#e0608f'), say: '蹦蹦跳跳！' },
    blob: { n: 'QQ 果凍', f: ['QQ', '布丁 QQ', '彩虹 QQ'], r: 0, pal: C3('#8cc8ff', '#e3f2ff', '#3a86d4'), say: '咕嚕咕嚕～' },
    bear: { n: '圓圓熊', f: ['圓圓', '森森', '大樹熊'], r: 0, pal: C3('#c99a72', '#f3dfcb', '#86552f'), say: '抱抱！' },
    dog: { n: '汪汪狗', f: ['汪汪', '勇勇', '守護犬'], r: 0, pal: C3('#f6dcb8', '#fff6ea', '#a5713d'), say: '汪汪！' },
    penguin: { n: '咕咕企鵝', f: ['咕咕', '滑滑', '冰晶企鵝'], r: 0, pal: C3('#5f82c2', '#f4f8ff', '#2c4170'), say: '咕咕～' },
    otter: { n: '波波海獺', f: ['波波', '浪浪', '海潮獺'], r: 1, emo: '🦦', pal: C3('#c9a27e', '#f8ecdf', '#8a6240'), say: '噗噗～',
      need: '一次就答對累計 300 題', pr: () => [firstN(), 300] },
    fox: { n: '燈燈狐', f: ['小燈', '燈燈狐', '千燈狐'], r: 1, emo: '🦊', pal: C3('#fff6e6', '#ffffff', '#d9a441'), say: '暖暖的～',
      need: '連續 7 天完成每日任務', pr: () => [stk(), 7] },
    hedgehog: { n: '栗栗蝟', f: ['栗栗', '栗刺刺', '栗子騎士'], r: 1, emo: '🦔', pal: C3('#b98257', '#f6e3cc', '#74482a'), say: '刺刺的喔！',
      need: '錯題本練會 20 題', pr: () => [A().wb || 0, 20] },
    deer: { n: '星角鹿', f: ['小星鹿', '星角鹿', '銀河鹿'], r: 1, emo: '🦌', pal: C3('#e6bb85', '#fbecd8', '#a7743e'), say: '一閃一閃～',
      need: '4 個單元都拿到 3 顆星', pr: () => [mathU().filter(u => star3(u.key)).length, 4] },
    panda: { n: '竹竹貓熊', f: ['竹竹', '拳拳', '竹林大師'], r: 1, emo: '🐼', pal: C3('#f8f9fa', '#ffffff', '#343a40'), say: '哈！嘿！',
      need: '練習天數滿 30 天', pr: () => [daysN(), 30] },
    octopus: { n: '墨墨章魚', f: ['墨墨', '彩墨', '畫家章魚'], r: 1, emo: '🐙', pal: C3('#c3a6ff', '#f0e8ff', '#7b52d6'), say: '畫一張畫給你！',
      need: '4 週都有參加打魔王', pr: () => [A().bw || 0, 4] },
    robot: { n: '齒輪寶', f: ['齒輪寶', '螺絲俠', '超算機器人'], r: 1, emo: '🤖', pal: C3('#dfe7ef', '#ffffff', '#4a90c8'), say: '嗶嗶，計算完成！',
      need: '答滿 300 題，而且一次就答對 80% 以上', pr: () => { const t = totN(), r = t ? Math.round(firstN() / t * 100) : 0; return [t >= 300 && r >= 80 ? 1 : 0, 1, `已經答 ${Math.min(t, 300)}/300 題・一次就答對 ${r}%`]; } },
    mushroom: { n: '菇菇', f: ['菇菇', '傘傘菇', '森林菇王'], r: 1, emo: '🍄', pal: C3('#fff1dc', '#fffaf2', '#e8735a'), say: '菇菇～',
      need: '農場收成 30 次', pr: () => [A().hv || 0, 30] },
    whale: { n: '星空鯨', f: ['小星鯨', '夜光鯨', '銀河鯨王'], r: 2, emo: '🐳', pal: C3('#5866d8', '#e3e7ff', '#2a338f'), say: '噗～星星水花！',
      need: '一次就答對累計 1,500 題', pr: () => [firstN(), 1500] },
    lion: { n: '福氣獅', f: ['獅獅', '守門獅', '福氣獅王'], r: 2, emo: '🦁', pal: C3('#ffd166', '#fff4cf', '#d9480f'), say: '福氣來囉！',
      need: '連續 21 天完成每日任務', pr: () => [stk(), 21] },
    unicorn: { n: '彩虹馬', f: ['小彩', '彩虹駒', '天馬獨角獸'], r: 2, emo: '🦄', pal: C3('#fbfbff', '#ffffff', '#b197fc'), say: '彩虹出來了！',
      need: '圖鑑收集 8 隻寵物', pr: () => [dexN(), 8] },
    turtle: { n: '智慧龜', f: ['算算龜', '學者龜', '智慧神龜'], r: 2, emo: '🐢', pal: C3('#8fdcb4', '#e6fbef', '#3e9a6b'), say: '慢慢想，一定會懂！',
      need: '所有單元和綜合都 3 顆星，而且一次就答對累計 1,000 題', pr: () => { const us = [...mathU(), MIX], n = us.filter(u => star3(u.key)).length; return [n === us.length && firstN() >= 1000 ? 1 : 0, 1, `3 顆星 ${n}/${us.length}・一次就答對 ${Math.min(firstN(), 1000)}/1000`]; } }
  };
  const SP_KEYS = Object.keys(SPECIES), STARTERS = SP_KEYS.filter(k => !SPECIES[k].r);
  const TIER = ['', '稀有', '傳說'], EGG_N = ['普通蛋', '稀有蛋', '傳說蛋'];
  /* 有圖的寵物（img/pet/種類-0/1/2.webp）。圖還沒來之前是空的，全部用 SVG 畫 */
  const ART = new Set(Object.keys(SPECIES));
  const ROOM_ART = new Set(['home', 'meadow', 'beach', 'space']);   // img/pet/room-房間.webp
  const IMG = 'img/pet/';
  const PA = {"chick":[[101.6,136.2,22.2,62.6,99.4,136.7,185.8],[94.1,109.7,23.7,37.7,60.6,161.6,185.8],[89.4,78.1,23.1,6.2,20.9,188.1,185.8]],"cat":[[94.6,120.8,37.6,48.7,76.2,151.0,186.1],[83.0,90.2,39.8,27.5,36.3,172.2,186.1],[73.1,63.4,36.1,18.0,5.6,184.9,186.1]],"dragon":[[93.6,114.2,28.2,48.9,83.0,150.8,185.3],[63.8,104.3,27.5,36.6,65.0,162.7,185.6],[82.0,86.2,25.5,6.0,50.7,193.6,185.6]],"bunny":[[81.8,120.5,34.0,43.5,30.4,155.9,185.9],[65.4,100.2,34.3,29.7,5.8,169.7,185.9],[71.0,91.9,31.5,37.3,6.1,179.7,185.9]],"blob":[[103.5,131.8,46.2,41.2,71.1,158.5,186.0],[104.4,109.9,46.4,28.1,44.9,171.3,186.0],[103.8,104.8,51.8,10.4,22.5,182.3,185.7]],"bear":[[107.7,95.6,43.1,40.6,48.1,159.1,185.9],[111.5,75.1,40.5,38.8,17.1,161.2,185.9],[110.5,61.8,35.9,14.7,6.4,178.2,185.9]],"dog":[[89.3,101.6,40.8,25.6,55.9,160.1,185.9],[83.1,83.2,43.6,15.6,17.0,183.8,185.9],[67.9,60.1,34.6,6.1,20.6,193.9,185.9]],"penguin":[[106.1,111.9,44.6,35.8,57.3,163.9,186.0],[109.3,86.8,44.8,27.6,27.1,172.1,186.0],[109.1,69.4,41.3,14.3,6.0,185.4,186.0]],"otter":[[109.8,88.1,41.4,38.4,43.8,161.3,185.9],[90.9,68.8,43.6,23.9,16.8,175.8,185.9],[80.3,64.0,44.4,12.6,5.8,188.3,185.9]],"fox":[[90.2,118.1,31.6,36.9,61.0,162.5,185.6],[75.5,103.1,33.4,16.2,40.8,183.5,185.9],[66.1,100.7,33.4,10.5,31.9,186.8,185.6]],"hedgehog":[[88.8,131.0,36.7,37.3,73.6,162.7,185.9],[73.7,114.3,39.5,23.6,48.3,175.8,185.9],[77.2,102.3,35.6,23.6,32.6,175.8,185.9]],"deer":[[87.2,99.2,31.9,52.1,54.7,147.2,185.7],[87.7,82.4,26.8,42.6,24.9,156.7,185.7],[75.0,72.7,21.9,28.9,6.0,170.8,185.7]],"panda":[[103.7,90.1,41.7,41.8,42.1,157.3,185.9],[113.3,73.3,51.5,15.3,17.3,183.8,185.6],[95.3,51.1,47.8,29.8,5.8,190.2,185.9]],"octopus":[[104.8,117.8,38.4,39.5,69.6,159.9,186.0],[104.2,102.5,41.9,21.2,50.7,178.2,186.0],[101.0,95.2,41.8,5.7,40.0,194.0,186.0]],"robot":[[95.9,115.5,46.9,44.5,47.4,155.2,186.0],[97.0,93.1,43.2,27.3,21.6,172.7,186.0],[89.7,82.6,37.1,6.5,33.7,192.9,186.0]],"mushroom":[[99.8,114.6,35.1,40.5,53.4,158.9,185.9],[96.0,108.7,35.9,23.0,20.5,176.7,185.6],[92.9,102.3,33.3,5.8,11.7,193.9,185.6]],"whale":[[83.1,151.5,36.5,41.9,89.7,157.5,186.0],[61.6,136.8,28.0,21.8,61.4,177.7,186.2],[60.9,130.4,21.7,5.5,63.2,194.0,186.2]],"lion":[[109.5,105.7,33.9,43.3,54.8,156.4,186.2],[83.1,89.4,38.0,22.2,35.3,177.3,186.2],[87.5,76.1,35.3,21.7,25.3,188.9,186.2]],"unicorn":[[81.7,99.4,34.8,44.5,50.1,155.2,185.7],[65.9,68.8,33.4,20.2,12.2,179.5,185.7],[86.9,66.3,31.6,5.9,10.9,193.7,185.7]],"turtle":[[122.1,72.5,44.3,43.8,40.5,155.5,185.8],[114.6,50.1,40.6,27.0,19.5,172.3,185.8],[108.2,46.5,35.6,9.6,6.9,189.8,185.8]]};   // 每隻寵物三個型態：[眼睛中心x, 眼睛y, 兩眼距離, 身體左, 上, 右, 下]（200×200 座標，由切圖程式算出）
  const AR = {"bow":0.668,"flower":0.578,"cap":0.723,"party":1.128,"beret":0.656,"tophat":0.715,"magic":0.859,"chef":0.801,"crown":0.727,"helmet":0.848,"halo":0.496,"grad":0.668,"round":0.434,"heart":0.418,"sun":0.406,"star":0.465,"goggle":0.707,"bowtie":0.613,"bell":0.922,"scarf":1.02,"medal":1.099,"lei":0.926,"rainbow":0.949,"balloon":1.326,"wings-l":1.163,"wings-r":1.176,"wings":0.555,"cape-l":1.381,"cape-r":1.349,"cape":0.645,"rocket-l":1.494,"rocket-r":1.513,"rocket":0.707,"swings-l":1.146,"swings-r":1.153,"swings":0.543};   // 配件圖的高÷寬
  /* 有圖的配件放哪裡：用眼睛的位置和兩眼距離 d 來算。w 寬（幾個 d），x/y 中心（離眼睛幾個 d）；t＝y 是上緣、b＝y 是下緣 */
  const AP = {
    bow: { w: 1.25, x: .95, y: -1.05 }, flower: { w: 1.15, x: .95, y: -1.0 }, cap: { w: 2.3, x: 0, y: -.6, a: 'b' }, party: { w: 1.35, x: .15, y: -.95, a: 'b' },
    beret: { w: 2.4, x: .1, y: -.8, a: 'b' }, tophat: { w: 2.2, x: 0, y: -.85, a: 'b' }, magic: { w: 2.5, x: 0, y: -.8, a: 'b' }, chef: { w: 2.1, x: 0, y: -.9, a: 'b' },
    crown: { w: 1.9, x: 0, y: -.95, a: 'b' }, helmet: { w: 3.5, x: 0, y: .25 }, halo: { w: 2.0, x: 0, y: -1.9 }, grad: { w: 2.6, x: 0, y: -.8, a: 'b' },
    round: { w: 2.15, x: 0, y: 0 }, heart: { w: 2.2, x: 0, y: 0 }, sun: { w: 2.25, x: 0, y: 0 }, star: { w: 2.35, x: 0, y: 0 }, goggle: { w: 2.45, x: .22, y: .05 },
    bowtie: { w: 1.2, x: 0, y: 1.2 }, bell: { w: 1.5, x: 0, y: 1.15 }, scarf: { w: 1.85, x: 0, y: .78, a: 't' }, medal: { w: 1.3, x: 0, y: .9, a: 't' }, lei: { w: 1.9, x: 0, y: 1.2 }, rainbow: { w: 1.85, x: 0, y: .78, a: 't' },
    balloon: { w: 1.6, x: 1.55, y: -1.05 }, wings: { w: 1.45, x: 1.3, y: .9, p: 1 }, cape: { w: 1.1, x: .75, y: 1.55, p: 1 }, rocket: { w: .85, x: 1.25, y: 1.4, p: 1 }, swings: { w: 1.5, x: 1.3, y: .85, p: 1 }
  };
  function accImg(id, q) {
    const P = AP[id]; if (!P) return ''; const [ex, ey, d] = q;
    const one = (name, cx) => { const w = P.w * d, h = w * (AR[name] || 1), cy = ey + P.y * d; let y = P.a === 'b' ? cy - h : P.a === 't' ? cy : cy - h / 2;
      if (P.p) y = Math.min(y, q[6] - h - 2);   // 背後的東西不要超出腳底
      return `<image href="${IMG}acc-${name}.webp" x="${(cx - w / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"/>`; };
    return P.p ? one(id + '-l', ex - P.x * d) + one(id + '-r', ex + P.x * d) : one(id, ex + P.x * d);
  }

  /* ───────── 配件：k 部位（h 帽子、g 眼鏡、k 脖子、b 背後），lv 最高等級要到幾級才能買，p 價錢 ───────── */
  const ITEMS = {
    bow: { k: 'h', n: '蝴蝶結', lv: 1, p: 20 }, flower: { k: 'h', n: '小花', lv: 2, p: 30 }, cap: { k: 'h', n: '棒球帽', lv: 3, p: 45 }, party: { k: 'h', n: '派對帽', lv: 4, p: 55 },
    beret: { k: 'h', n: '畫家帽', lv: 5, p: 65 }, tophat: { k: 'h', n: '紳士帽', lv: 8, p: 100 }, magic: { k: 'h', n: '魔法師帽', lv: 11, p: 140 }, chef: { k: 'h', n: '廚師帽', lv: 14, p: 170 },
    crown: { k: 'h', n: '皇冠', lv: 18, p: 250 }, helmet: { k: 'h', n: '太空頭盔', lv: 22, p: 300 }, halo: { k: 'h', n: '天使光環', lv: 25, p: 350 }, grad: { k: 'h', n: '學士帽', lv: 30, p: 500 },
    round: { k: 'g', n: '圓眼鏡', lv: 2, p: 30 }, heart: { k: 'g', n: '愛心眼鏡', lv: 4, p: 50 }, sun: { k: 'g', n: '墨鏡', lv: 6, p: 80 }, star: { k: 'g', n: '星星眼鏡', lv: 9, p: 120 }, goggle: { k: 'g', n: '潛水鏡', lv: 16, p: 200 },
    bowtie: { k: 'k', n: '小領結', lv: 1, p: 20 }, bell: { k: 'k', n: '鈴鐺項圈', lv: 3, p: 40 }, scarf: { k: 'k', n: '圍巾', lv: 5, p: 60 }, medal: { k: 'k', n: '金牌', lv: 10, p: 130 },
    lei: { k: 'k', n: '花圈', lv: 17, p: 220 }, rainbow: { k: 'k', n: '彩虹圍巾', lv: 24, p: 320 },
    balloon: { k: 'b', n: '彩色氣球', lv: 8, p: 110 }, wings: { k: 'b', n: '天使翅膀', lv: 12, p: 160 }, cape: { k: 'b', n: '英雄披風', lv: 15, p: 200 }, rocket: { k: 'b', n: '火箭背包', lv: 20, p: 280 }, swings: { k: 'b', n: '星星翅膀', lv: 27, p: 400 }
  };
  const SLOTS = [['h', '👒 帽子'], ['g', '👓 眼鏡'], ['k', '🎀 脖子'], ['b', '🪽 背後']];
  /* 異色：在原本的樣子上套一層色調（每隻寵物各自買，等級看這隻寵物） */
  const XS = [
    { n: '原色', f: '', lv: 1, p: 0, c: '#dee2e6' },
    { n: '晨曦', f: 'hue-rotate(-28deg) saturate(1.25)', lv: 10, p: 80, c: '#ff9f80' },
    { n: '薄荷', f: 'hue-rotate(80deg) saturate(1.05)', lv: 15, p: 150, c: '#63e6be' },
    { n: '夜空', f: 'hue-rotate(205deg) saturate(.95) brightness(.96)', lv: 20, p: 220, c: '#748ffc' },
    { n: '閃亮金', f: 'sepia(.6) saturate(2.2) hue-rotate(-12deg) brightness(1.08)', lv: 25, p: 300, c: '#fcc419' }
  ];
  const ROOMS = [{ id: 'home', n: '溫馨小房間', lv: 1, p: 0 }, { id: 'meadow', n: '草原', lv: 7, p: 100 }, { id: 'beach', n: '海邊', lv: 14, p: 180 }, { id: 'space', n: '星空', lv: 20, p: 260 }];
  const FOODS = [
    { id: 'apple', i: '🍎', n: '蘋果', p: 3, f: 20, j: 0 },
    { id: 'rice', i: '🍙', n: '飯糰', p: 6, f: 35, j: 0 },
    { id: 'milk', i: '🥛', n: '牛奶', p: 5, f: 15, j: 10 },
    { id: 'cake', i: '🍰', n: '草莓蛋糕', p: 12, f: 30, j: 20 },
    { id: 'feast', i: '🍱', n: '豪華便當', p: 18, f: 70, j: 10 }
  ];
  /* 農場收成的菜也可以餵（比賣掉划算）：飽足＝6＋賣價×5（最多 45），水果多一點開心 */
  const FRUIT = { strawberry: 1, watermelon: 1, grape: 1 };
  const cropFood = id => { const C = window.FARM && FARM.CROPS[id]; return C ? { f: Math.min(45, 6 + C.s * 5), j: FRUIT[id] ? 8 : 0 } : null; };
  const NAMES = ['小布丁', '麻糬', '湯圓', '小餅乾', '奶茶', '豆花', '芒果', '布布', '泡芙', '棉花糖', '小可', '多多', '咪咪', '球球', '嘟嘟', '樂樂',
    '皮皮', '丸子', '小星', '月月', '雲朵', '珍珠', '可樂', '花生', '小米', '橘橘', '莓莓', '蜜蜜', '豆豆', '糖糖', '阿福', '旺旺', '跳跳', '小熊', '奇奇', '妞妞'];
  const STICKERS = ['👍', '❤️', '😆', '🌟', '🎉'];
  const EGG_NEED = [50, 100, 150], START_COIN = 30, FULL_DECAY = 2.5, JOY_DECAY = 3, PLAY_MS = 20 * 60 * 1000;
  const GAIN = { ok: [2, 10], ok2: [1, 5] }, LATE = { ok: [1, 5], ok2: [0, 3] }, BOOST_N = 20, DAY_XP = 30, DAY_COIN = 10, CARE_K = 1.2;
  const OLD_DEF = { chick: 1, cat: 5, dragon: 2, bunny: 0, blob: 3, bear: 7 }, OLD_COLOR_PRICE = 30;

  /* ───────── 等級 ───────── 升下一級要 100＋60×(等級－1)；Lv.7、Lv.18 進化；最高 Lv.30 */
  const MAXLV = 30, EVO = [7, 18];
  const xpNeed = lv => 100 + 60 * (lv - 1);
  const cum = lv => 100 * (lv - 1) + 30 * (lv - 1) * (lv - 2);   // 升到這一級總共要多少經驗
  function lvOf(xp) { let lv = 1, x = xp || 0; while (lv < MAXLV && x >= xpNeed(lv)) { x -= xpNeed(lv); lv++; } return { lv, cur: x, need: xpNeed(lv), max: lv >= MAXLV }; }
  const stageOf = lv => lv >= EVO[1] ? 2 : lv >= EVO[0] ? 1 : 0;
  const STAGE_N = ['寶寶', '第一次進化', '最終進化'];
  const night = (d = new Date()) => night.f != null ? night.f : d.getHours() >= 21 || d.getHours() < 6;   // night.f：測試用，強制白天/晚上
  const formName = (sp, lv) => (SPECIES[sp] || SPECIES.chick).f[stageOf(lv || 1)];

  /* ───────── 畫寵物 ───────── 回傳 HTML：背後配件 → 身體（SVG 或圖）→ 前面配件，一層一層疊 */
  let uid = 0;
  const SC = [.8, .91, 1], HY = { bunny: 4, blob: -4 };
  function petArt(o) {
    const sp = SPECIES[o.sp] ? o.sp : 'chick', st = o.stage != null ? o.stage : stageOf(o.lv || 1), mood = o.mood || 'ok', id = 'p' + (++uid);
    const pic = ART.has(sp), q = pic && PA[sp] && PA[sp][st], T = pic ? '' : `translate(100 182) scale(${SC[st]}) translate(-100 -182)`, xs = XS[o.x | 0] || XS[0];
    const AC = id => q ? accImg(id, q) : acc(id, sp);
    const fil = o.sil ? 'brightness(0) opacity(.2)' : xs.f;
    const L = [];
    if (st === 2 && !o.sil && !pic) L.push(`<svg class="pal" viewBox="0 0 200 200"><defs><radialGradient id="${id}a"><stop offset=".55" stop-color="#fff7c2" stop-opacity=".9"/><stop offset="1" stop-color="#fff7c2" stop-opacity="0"/></radialGradient></defs><circle cx="100" cy="118" r="84" fill="url(#${id}a)"/></svg>`);
    if (!o.sil && o.b && ITEMS[o.b] && ITEMS[o.b].k === 'b') L.push(`<svg class="pal" viewBox="0 0 200 200"><g transform="${T}">${AC(o.b)}</g></svg>`);
    if (pic) L.push(`<svg class="pab" viewBox="0 0 200 200"${fil ? ` style="filter:${fil}"` : ''}><ellipse cx="100" cy="186" rx="${q ? Math.min(80, (q[5] - q[3]) * .42).toFixed(1) : 60}" ry="7" fill="#000" opacity=".13"/><image href="${IMG}${sp}-${st}.webp" x="4" y="4" width="192" height="184" preserveAspectRatio="xMidYMax meet"/></svg>`
      + (mood === 'sleep' ? '<span class="pmood">💤</span>' : mood === 'sad' ? '<span class="pmood">💧</span>' : ''));
    else L.push(bodySVG(sp, st, o.sil ? 'ok' : mood, id, fil, T));
    if (!o.sil) {
      const fr = ['k', 'g', 'h'].filter(k => o[k] && ITEMS[o[k]] && ITEMS[o[k]].k === k).map(k => AC(o[k])).join('');
      if (fr) L.push(`<svg class="pal" viewBox="0 0 200 200"><g transform="${T}">${fr}</g></svg>`);
      if ((o.x | 0) === 4) L.push(`<span class="pspk"><i style="background-image:url(${IMG}fx-shine.webp)"></i><i style="background-image:url(${IMG}fx-shine.webp)"></i><i style="background-image:url(${IMG}fx-shine.webp)"></i></span>`);
    }
    return `<div class="pa${o.cls ? ' ' + o.cls : ''}">${L.join('')}</div>`;
  }
  const petSVG = petArt;   // 舊名字（其他檔案還在用）
  function bodySVG(sp, st, mood, id, fil, T) {
    const C = SPECIES[sp].pal, g = [];
    g.push(`<ellipse cx="100" cy="184" rx="${46 * SC[st] + 4}" ry="8" fill="#000" opacity=".12"/>`);
    g.push(`<g transform="${T}">`);
    g.push(back(sp, C, st));
    const blobby = sp === 'blob' || sp === 'whale';
    const body = blobby ? 'M100 56 C108 74 160 90 160 128 C160 160 134 178 100 178 C66 178 40 160 40 128 C40 90 92 74 100 56Z'
      : 'M100 64 C141 64 160 92 160 124 C160 158 134 178 100 178 C66 178 40 158 40 124 C40 92 59 64 100 64Z';
    g.push(`<path d="${body}" fill="url(#${id}b)" stroke="${C.d}" stroke-width="3.5" ${blobby ? 'fill-opacity=".92"' : ''}/>`);
    if (sp === 'penguin') g.push(`<path d="M100 82 C126 82 140 104 140 132 C140 160 124 174 100 174 C76 174 60 160 60 132 C60 104 74 82 100 82Z" fill="${C.l}"/>`);
    else if (sp === 'panda') g.push(`<ellipse cx="100" cy="150" rx="31" ry="22" fill="#fff"/>`);
    else if (sp !== 'blob') g.push(`<ellipse cx="100" cy="148" rx="31" ry="23" fill="${C.l}" opacity=".95"/>`);
    if (sp === 'dragon') g.push(`<path d="M80 140 H120 M78 150 H122 M82 160 H118" stroke="${C.d}" stroke-width="2.5" opacity=".35" stroke-linecap="round"/>`);
    g.push(`<ellipse cx="72" cy="88" rx="13" ry="7" fill="#fff" opacity=".55" transform="rotate(-28 72 88)"/><circle cx="88" cy="78" r="3" fill="#fff" opacity=".6"/>`);
    /* 手、腳 */
    const wing = sp === 'chick' || sp === 'penguin', wc = sp === 'penguin' ? C.d : C.m;
    if (wing) g.push(`<path d="M44 124 Q26 134 36 150 Q48 146 52 134Z" fill="${wc}" stroke="${C.d}" stroke-width="3"/><path d="M156 124 Q174 134 164 150 Q152 146 148 134Z" fill="${wc}" stroke="${C.d}" stroke-width="3"/>`);
    else if (!blobby) g.push(`<ellipse cx="47" cy="138" rx="9" ry="13" fill="${sp === 'panda' ? '#343a40' : C.m}" stroke="${C.d}" stroke-width="3" transform="rotate(25 47 138)"/><ellipse cx="153" cy="138" rx="9" ry="13" fill="${sp === 'panda' ? '#343a40' : C.m}" stroke="${C.d}" stroke-width="3" transform="rotate(-25 153 138)"/>`);
    if (sp === 'chick') g.push(`<path d="M76 172 l-6 9 M80 173 v10 M84 172 l6 9 M116 172 l-6 9 M120 173 v10 M124 172 l6 9" stroke="#f08c00" stroke-width="3.5" stroke-linecap="round"/>`);
    else if (sp === 'penguin') g.push(`<ellipse cx="80" cy="177" rx="13" ry="6" fill="#ffa94d" stroke="#e8590c" stroke-width="2.5"/><ellipse cx="120" cy="177" rx="13" ry="6" fill="#ffa94d" stroke="#e8590c" stroke-width="2.5"/>`);
    else if (!blobby) g.push(`<ellipse cx="78" cy="176" rx="14" ry="7.5" fill="${sp === 'panda' ? '#343a40' : C.m}" stroke="${C.d}" stroke-width="3"/><ellipse cx="122" cy="176" rx="14" ry="7.5" fill="${sp === 'panda' ? '#343a40' : C.m}" stroke="${C.d}" stroke-width="3"/>`);
    g.push(front(sp, C, st));
    g.push(face(sp, mood));
    if (SPECIES[sp].emo) g.push(`<text x="100" y="${blobby ? 60 : 70}" font-size="30" text-anchor="middle" dominant-baseline="middle">${SPECIES[sp].emo}</text>`);
    g.push('</g>');
    const defs = `<defs><radialGradient id="${id}b" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="${C.l}"/><stop offset=".45" stop-color="${C.m}"/><stop offset="1" stop-color="${C.d}" stop-opacity=".85"/></radialGradient></defs>`;
    return `<svg class="psvg pab" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"${fil ? ` style="filter:${fil}"` : ''}>${defs}${g.join('')}</svg>`;
  }
  /* 身體後面的東西：耳朵、尾巴、翅膀 */
  function back(sp, C, st) {
    const s = (a) => `fill="${C.m}" stroke="${C.d}" stroke-width="3.5" stroke-linejoin="round" ${a || ''}`;
    if (sp === 'cat') return `<path d="M150 160 Q186 150 178 112 Q174 100 166 108 Q172 140 146 148Z" ${s()}/>
      <path d="M58 92 L62 50 L94 72Z" ${s()}/><path d="M142 92 L138 50 L106 72Z" ${s()}/><path d="M66 82 L68 60 L84 72Z" fill="#ffb3c7"/><path d="M134 82 L132 60 L116 72Z" fill="#ffb3c7"/>${st >= 1 ? `<path d="${starPath(178, 110, 9, 4)}" fill="#ffe066" stroke="#e67700" stroke-width="2"/>` : ''}`;
    if (sp === 'bunny') return `<circle cx="156" cy="160" r="13" fill="#fff" stroke="${C.d}" stroke-width="3"/>
      <ellipse cx="78" cy="42" rx="14" ry="36" ${s('transform="rotate(-10 78 42)"')}/><ellipse cx="122" cy="42" rx="14" ry="36" ${s('transform="rotate(10 122 42)"')}/>
      <ellipse cx="78" cy="44" rx="6.5" ry="26" fill="#ffb3c7" transform="rotate(-10 78 44)"/><ellipse cx="122" cy="44" rx="6.5" ry="26" fill="#ffb3c7" transform="rotate(10 122 44)"/>`;
    if (sp === 'bear' || sp === 'panda') { const e = sp === 'panda' ? '#343a40' : C.m, i = sp === 'panda' ? '#495057' : C.l; return `<circle cx="62" cy="76" r="17" fill="${e}" stroke="${C.d}" stroke-width="3.5"/><circle cx="138" cy="76" r="17" fill="${e}" stroke="${C.d}" stroke-width="3.5"/><circle cx="62" cy="76" r="8.5" fill="${i}"/><circle cx="138" cy="76" r="8.5" fill="${i}"/>`; }
    if (sp === 'dragon') return (st >= 1 ? `<path d="M50 112 Q14 84 20 124 Q30 118 34 132 Q40 120 50 130Z" ${s('fill-opacity=".9"')}/><path d="M150 112 Q186 84 180 124 Q170 118 166 132 Q160 120 150 130Z" ${s('fill-opacity=".9"')}/>` : '')
      + `<path d="M148 160 Q182 162 184 136 L194 140 L188 124 L176 132 Q176 150 146 148Z" ${s()}/>
      <path d="M78 70 Q70 46 82 36 Q86 54 92 66Z" fill="#fff3bf" stroke="#d9a400" stroke-width="3"/><path d="M122 70 Q130 46 118 36 Q114 54 108 66Z" fill="#fff3bf" stroke="#d9a400" stroke-width="3"/>`;
    if (sp === 'dog') return `<path d="M148 158 Q176 150 172 126 Q168 120 163 127 Q166 144 146 150Z" ${s()}/>
      <path d="M66 74 Q40 72 38 104 Q40 130 58 126 Q62 100 76 86Z" fill="${C.d}" stroke="${C.d}" stroke-width="3" stroke-linejoin="round"/>
      ${st >= 1 ? `<path d="M126 84 Q134 44 152 52 Q156 70 140 90Z" fill="${C.d}" stroke="${C.d}" stroke-width="3" stroke-linejoin="round"/>` : `<path d="M134 74 Q160 72 162 104 Q160 130 142 126 Q138 100 124 86Z" fill="${C.d}" stroke="${C.d}" stroke-width="3" stroke-linejoin="round"/>`}`;
    return '';
  }
  /* 身體前面的東西：鳥嘴、鬍鬚、鼻子、頭上的毛 */
  function front(sp, C, st) {
    if (sp === 'chick') return `<path d="M100 66 Q92 46 100 40 Q104 54 104 66 M100 66 Q110 44 120 46 Q108 56 104 68" fill="${C.m}" stroke="${C.d}" stroke-width="3" stroke-linejoin="round"/>${st === 2 ? `<path d="M96 64 Q80 44 88 36 Q96 50 100 62Z" fill="#8cc8ff" stroke="#3a86d4" stroke-width="2.5"/>` : ''}`;
    if (sp === 'cat') return `<path d="M58 124 H40 M58 131 L42 136 M142 124 H160 M142 131 L158 136" stroke="${C.d}" stroke-width="2.5" stroke-linecap="round" opacity=".7"/><path d="${starPath(100, 82, 7, 3)}" fill="#fff3bf" stroke="${C.d}" stroke-width="1.5"/>`;
    if (sp === 'bear') return `<ellipse cx="100" cy="129" rx="19" ry="13" fill="${C.l}"/>${st >= 1 ? '<path d="M100 66 Q92 52 100 46 Q108 52 100 66Z" fill="#69db7c" stroke="#2f9e44" stroke-width="2.5"/>' : ''}`;
    if (sp === 'panda') return `<ellipse cx="80" cy="113" rx="13" ry="15" fill="#343a40" transform="rotate(-20 80 113)"/><ellipse cx="120" cy="113" rx="13" ry="15" fill="#343a40" transform="rotate(20 120 113)"/><ellipse cx="100" cy="129" rx="16" ry="11" fill="#fff"/>${st >= 1 ? '<path d="M56 86 Q100 70 144 86" stroke="#2f9e44" stroke-width="7" fill="none" stroke-linecap="round"/>' : ''}`;
    if (sp === 'dog') return `<ellipse cx="100" cy="129" rx="21" ry="14" fill="${C.l}"/>${st >= 1 ? `<path d="${starPath(100, 80, 8, 3.5)}" fill="${C.d}" opacity=".7"/>` : ''}${st === 2 ? `<path d="${starPath(100, 154, 15, 7)}" fill="#ffe066" stroke="#e67700" stroke-width="2"/>` : ''}`;
    if (sp === 'penguin') return (st >= 1 ? `<path d="M100 66 Q94 52 100 44 Q106 52 100 66 M100 66 Q86 56 88 48 Q98 54 100 66 M100 66 Q114 56 112 48 Q102 54 100 66" fill="#fff" stroke="#a5c8ff" stroke-width="2"/>` : '')
      + (st === 2 ? `<path d="M84 66 L88 48 L94 62 L100 42 L106 62 L112 48 L116 66Z" fill="#d0ebff" stroke="#4dabf7" stroke-width="2.5" stroke-linejoin="round"/>` : '');
    if (sp === 'blob') return `<path d="M100 58 Q96 44 86 42 Q90 52 100 58 Q104 44 116 40 Q112 54 100 58Z" fill="#69db7c" stroke="#2f9e44" stroke-width="2.5"/>${st >= 1 ? '<circle cx="132" cy="96" r="5" fill="#fff" opacity=".7"/>' : ''}<ellipse cx="128" cy="150" rx="9" ry="5" fill="#fff" opacity=".35"/>`;
    if (sp === 'bunny') return `<path d="M96 120 Q100 124 104 120" stroke="#e64980" stroke-width="3" fill="#ff8fab"/>${st >= 1 ? `<g transform="translate(140 64)">${[0, 72, 144, 216, 288].map(a => `<circle cx="${7 * Math.cos(a * Math.PI / 180)}" cy="${7 * Math.sin(a * Math.PI / 180)}" r="5.5" fill="#fff0f6" stroke="#f06595" stroke-width="1.5"/>`).join('')}<circle r="4" fill="#ffd43b"/></g>` : ''}`;
    return '';
  }
  /* 臉：心情不一樣，眼睛、嘴巴不一樣 */
  function face(sp, mood) {
    const ink = '#2b2b3a', out = [], eyeW = sp === 'panda' ? '#fff' : '#fff';
    out.push(`<ellipse cx="64" cy="126" rx="10" ry="6" fill="#ff8fab" opacity=".55"/><ellipse cx="136" cy="126" rx="10" ry="6" fill="#ff8fab" opacity=".55"/>`);
    const eyeInk = sp === 'panda' ? '#111' : ink;
    if (mood === 'happy') out.push(`<path d="M70 114 Q80 102 90 114 M110 114 Q120 102 130 114" stroke="${sp === 'panda' ? '#fff' : ink}" stroke-width="5" fill="none" stroke-linecap="round"/>`);
    else if (mood === 'sleep') out.push(`<path d="M70 112 Q80 119 90 112 M110 112 Q120 119 130 112" stroke="${sp === 'panda' ? '#fff' : ink}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`);
    else {
      out.push(`<g class="peye"><ellipse cx="80" cy="112" rx="8" ry="10" fill="${eyeInk}"/><ellipse cx="120" cy="112" rx="8" ry="10" fill="${eyeInk}"/>
        <circle cx="77" cy="107.5" r="3.2" fill="${eyeW}"/><circle cx="117" cy="107.5" r="3.2" fill="${eyeW}"/><circle cx="83" cy="116" r="1.5" fill="${eyeW}"/><circle cx="123" cy="116" r="1.5" fill="${eyeW}"/></g>`);
      if (mood === 'sad') out.push(`<path d="M68 98 L86 102 M132 98 L114 102" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`);
    }
    if (sp === 'chick') out.push(`<path d="M92 123 L100 117 L108 123 L100 131Z" fill="#ffa94d" stroke="#e8590c" stroke-width="2.5" stroke-linejoin="round"/>`);
    else if (sp === 'penguin') out.push(`<path d="M93 122 L100 118 L107 122 L100 129Z" fill="#ffa94d" stroke="#e8590c" stroke-width="2.5" stroke-linejoin="round"/>`);
    else {
      if (sp === 'bear' || sp === 'dog' || sp === 'panda') out.push(`<ellipse cx="100" cy="123" rx="6" ry="4.5" fill="${ink}"/>`);
      if (mood === 'happy') out.push(`<path d="M88 128 Q100 146 112 128Z" fill="#c2255c" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><path d="M94 135 Q100 142 106 135" fill="#ff8fab"/>`);
      else if (mood === 'sad') out.push(`<path d="M91 136 Q100 128 109 136" stroke="${ink}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`);
      else if (mood === 'sleep') out.push(`<ellipse cx="100" cy="133" rx="4" ry="5" fill="${ink}" opacity=".8"/>`);
      else if (sp !== 'bunny') out.push(`<path d="M90 129 Q95 135 100 129 Q105 135 110 129" stroke="${ink}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
    return out.join('');
  }
  /* 配件（座標跟身體一樣是 200×200） */
  function acc(k, sp) {
    const hy = HY[sp] || 0;
    switch (k) {
      case 'bow': return `<g transform="translate(128 ${74 + hy}) rotate(15)"><path d="M0 0 L-20 -12 Q-24 0 -20 12Z M0 0 L20 -12 Q24 0 20 12Z" fill="#ff6b9a" stroke="#c2255c" stroke-width="2.5" stroke-linejoin="round"/><circle r="6" fill="#ff8fab" stroke="#c2255c" stroke-width="2.5"/></g>`;
      case 'flower': return `<g transform="translate(130 ${76 + hy})">${[0, 72, 144, 216, 288].map(a => `<circle cx="${10 * Math.cos(a * Math.PI / 180)}" cy="${10 * Math.sin(a * Math.PI / 180)}" r="8" fill="#ffc9de" stroke="#f06595" stroke-width="2"/>`).join('')}<circle r="6" fill="#ffd43b" stroke="#f59f00" stroke-width="2"/></g>`;
      case 'cap': return `<g transform="translate(0 ${hy})"><path d="M62 84 Q64 46 100 46 Q136 46 138 84Z" fill="#4dabf7" stroke="#1c7ed6" stroke-width="3"/><path d="M132 80 Q162 78 168 88 Q150 92 130 88Z" fill="#339af0" stroke="#1c7ed6" stroke-width="3" stroke-linejoin="round"/><path d="M100 46 V84" stroke="#1c7ed6" stroke-width="2" opacity=".5"/><circle cx="100" cy="46" r="5" fill="#fff" stroke="#1c7ed6" stroke-width="2"/></g>`;
      case 'party': return `<g transform="translate(0 ${hy})"><path d="M80 76 L104 22 L124 74 Q102 82 80 76Z" fill="#b197fc" stroke="#7048e8" stroke-width="3" stroke-linejoin="round"/><path d="M88 60 L116 56 M95 42 L110 40" stroke="#ffd43b" stroke-width="5" stroke-linecap="round"/><circle cx="104" cy="22" r="7" fill="#ff8787" stroke="#e03131" stroke-width="2.5"/></g>`;
      case 'beret': return `<g transform="translate(0 ${hy})"><path d="M60 76 Q58 52 98 50 Q140 48 142 70 Q120 80 60 76Z" fill="#e03131" stroke="#a51111" stroke-width="3"/><path d="M98 50 L100 40" stroke="#a51111" stroke-width="4" stroke-linecap="round"/></g>`;
      case 'tophat': return `<g transform="translate(0 ${hy})"><rect x="76" y="28" width="48" height="44" rx="6" fill="#343a40" stroke="#212529" stroke-width="3"/><rect x="76" y="58" width="48" height="9" fill="#e64980"/><ellipse cx="100" cy="73" rx="38" ry="8" fill="#495057" stroke="#212529" stroke-width="3"/><rect x="84" y="34" width="6" height="18" rx="3" fill="#fff" opacity=".25"/></g>`;
      case 'magic': return `<g transform="translate(0 ${hy})"><path d="M70 76 L102 12 Q106 6 110 14 L132 76Z" fill="#845ef7" stroke="#5f3dc4" stroke-width="3" stroke-linejoin="round"/><ellipse cx="100" cy="77" rx="46" ry="9" fill="#7048e8" stroke="#5f3dc4" stroke-width="3"/><path d="${starPath(104, 48, 8, 3.5)}" fill="#ffe066"/><path d="M114 30 a6 6 0 1 0 4 9 a5 5 0 1 1 -4 -9Z" fill="#fff3bf"/><circle cx="88" cy="64" r="2.5" fill="#fff"/></g>`;
      case 'chef': return `<g transform="translate(0 ${hy})"><circle cx="80" cy="44" r="17" fill="#fff" stroke="#ced4da" stroke-width="3"/><circle cx="120" cy="44" r="17" fill="#fff" stroke="#ced4da" stroke-width="3"/><circle cx="100" cy="34" r="20" fill="#fff" stroke="#ced4da" stroke-width="3"/><rect x="74" y="50" width="52" height="26" rx="6" fill="#fff" stroke="#ced4da" stroke-width="3"/><path d="M86 56 V72 M100 56 V72 M114 56 V72" stroke="#e9ecef" stroke-width="3"/></g>`;
      case 'crown': return `<g transform="translate(0 ${hy})"><path d="M70 76 L68 40 L84 56 L100 32 L116 56 L132 40 L130 76Z" fill="#ffd43b" stroke="#e67700" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="62" r="6" fill="#ff6b6b" stroke="#c92a2a" stroke-width="2"/><circle cx="80" cy="66" r="4" fill="#4dabf7"/><circle cx="120" cy="66" r="4" fill="#69db7c"/><circle cx="68" cy="40" r="4" fill="#ffe066" stroke="#e67700" stroke-width="2"/><circle cx="100" cy="32" r="4" fill="#ffe066" stroke="#e67700" stroke-width="2"/><circle cx="132" cy="40" r="4" fill="#ffe066" stroke="#e67700" stroke-width="2"/></g>`;
      case 'helmet': return `<g transform="translate(0 ${hy})"><circle cx="100" cy="112" r="66" fill="#e7f5ff" fill-opacity=".22" stroke="#ced4da" stroke-width="6"/><path d="M52 70 Q70 52 92 50" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".85"/><path d="M100 46 V26" stroke="#adb5bd" stroke-width="4"/><circle cx="100" cy="24" r="6" fill="#ff6b6b" stroke="#c92a2a" stroke-width="2"/><path d="M48 156 Q100 176 152 156" stroke="#adb5bd" stroke-width="8" fill="none" stroke-linecap="round"/></g>`;
      case 'halo': return `<g transform="translate(0 ${hy})"><ellipse cx="100" cy="38" rx="32" ry="10" fill="none" stroke="#fff3bf" stroke-width="12" opacity=".6"/><ellipse cx="100" cy="38" rx="32" ry="10" fill="none" stroke="#fcc419" stroke-width="6"/></g>`;
      case 'grad': return `<g transform="translate(0 ${hy})"><path d="M74 56 V74 Q100 86 126 74 V56Z" fill="#343a40" stroke="#212529" stroke-width="3"/><path d="M100 30 L154 50 L100 68 L46 50Z" fill="#495057" stroke="#212529" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="49" r="4" fill="#fcc419"/><path d="M100 49 L142 56 L144 80" stroke="#fcc419" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M139 80 h10 l-2 12 h-6Z" fill="#fcc419"/></g>`;
      case 'round': return `<g fill="#fff" fill-opacity=".18" stroke="#5c4033" stroke-width="3.5"><circle cx="80" cy="112" r="15"/><circle cx="120" cy="112" r="15"/><path d="M95 110 Q100 105 105 110" fill="none"/></g>`;
      case 'heart': return `<g fill="#ff6b9a" fill-opacity=".75" stroke="#c2255c" stroke-width="3" stroke-linejoin="round">${[80, 120].map(x => `<path d="M${x} 124 L${x - 15} 110 Q${x - 18} 98 ${x - 8} 98 Q${x - 2} 98 ${x} 104 Q${x + 2} 98 ${x + 8} 98 Q${x + 18} 98 ${x + 15} 110Z"/>`).join('')}<path d="M95 108 H105" fill="none"/></g>`;
      case 'sun': return `<g><path d="M62 104 Q62 100 66 100 H94 Q98 100 97 104 L95 118 Q94 124 88 124 H72 Q64 124 63 118Z M138 104 Q138 100 134 100 H106 Q102 100 103 104 L105 118 Q106 124 112 124 H128 Q136 124 137 118Z" fill="#212529" stroke="#000" stroke-width="2"/><path d="M97 105 H103" stroke="#000" stroke-width="3"/><path d="M68 106 L76 106 M110 106 L118 106" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/></g>`;
      case 'star': return `<g fill="#ffd43b" fill-opacity=".85" stroke="#e67700" stroke-width="2.5" stroke-linejoin="round">${[80, 120].map(x => `<path d="${starPath(x, 112, 17, 8)}"/>`).join('')}<path d="M96 110 H104" fill="none"/></g>`;
      case 'goggle': return `<g><path d="M44 110 H156" stroke="#1c7ed6" stroke-width="7" stroke-linecap="round"/><rect x="62" y="98" width="34" height="26" rx="12" fill="#74c0fc" fill-opacity=".55" stroke="#1971c2" stroke-width="4"/><rect x="104" y="98" width="34" height="26" rx="12" fill="#74c0fc" fill-opacity=".55" stroke="#1971c2" stroke-width="4"/><path d="M96 110 H104" stroke="#1971c2" stroke-width="4"/><path d="M68 104 l8 0 M110 104 l8 0" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>`;
      case 'bowtie': return `<g transform="translate(100 154)"><path d="M0 0 L-18 -10 Q-21 0 -18 10Z M0 0 L18 -10 Q21 0 18 10Z" fill="#ff6b6b" stroke="#c92a2a" stroke-width="2.5" stroke-linejoin="round"/><circle r="5" fill="#ff8787" stroke="#c92a2a" stroke-width="2.5"/></g>`;
      case 'bell': return `<g><path d="M62 148 Q100 162 138 148" stroke="#e03131" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="100" cy="160" r="9" fill="#ffd43b" stroke="#e67700" stroke-width="2.5"/><path d="M95 162 H105" stroke="#e67700" stroke-width="2"/><circle cx="97" cy="157" r="2" fill="#fff"/></g>`;
      case 'scarf': return `<g><path d="M58 142 Q100 160 142 142 L144 154 Q100 172 56 154Z" fill="#ff8787" stroke="#e03131" stroke-width="3" stroke-linejoin="round"/><path d="M122 156 L130 186 L116 184 L112 158Z" fill="#ff8787" stroke="#e03131" stroke-width="3" stroke-linejoin="round"/><path d="M72 152 L76 146 M88 156 L91 150 M104 157 L106 151" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/></g>`;
      case 'medal': return `<g><path d="M86 140 L100 162 L114 140" stroke="#4dabf7" stroke-width="7" fill="none" stroke-linejoin="round"/><circle cx="100" cy="166" r="11" fill="#ffd43b" stroke="#e67700" stroke-width="2.5"/><path d="${starPath(100, 166, 6.5, 3)}" fill="#fff3bf"/></g>`;
      case 'lei': { const cs = ['#ff8787', '#ffd43b', '#f783ac', '#69db7c', '#74c0fc', '#ffa94d'], pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10, x = 58 + 84 * t, y = 146 + Math.sin(t * Math.PI) * 16; pts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7.5" fill="${cs[i % cs.length]}" stroke="#fff" stroke-width="2"/>`); } return `<g>${pts.join('')}</g>`; }
      case 'rainbow': return `<g><path d="M58 140 Q100 158 142 140 L144 158 Q100 176 56 158Z" fill="#fff" stroke="#adb5bd" stroke-width="2.5"/>${['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'].map((c, i) => `<path d="M${60 + i * 14} ${144 + Math.sin((i + .5) / 6 * Math.PI) * 9} l12 1 l0 14 l-12 -1Z" fill="${c}"/>`).join('')}<path d="M118 158 L126 188 L112 186 L108 160Z" fill="#9775fa" stroke="#7048e8" stroke-width="2.5" stroke-linejoin="round"/><path d="M112 168 l13 1 M114 176 l13 1" stroke="#ffd43b" stroke-width="4"/></g>`;
      case 'balloon': return `<g><path d="M146 132 Q150 100 158 74 M146 132 Q156 104 176 84 M146 132 Q148 110 138 86" stroke="#868e96" stroke-width="2" fill="none"/><ellipse cx="160" cy="58" rx="16" ry="20" fill="#ff6b6b" stroke="#c92a2a" stroke-width="2.5"/><ellipse cx="182" cy="74" rx="14" ry="18" fill="#ffd43b" stroke="#e67700" stroke-width="2.5"/><ellipse cx="136" cy="70" rx="14" ry="18" fill="#4dabf7" stroke="#1c7ed6" stroke-width="2.5"/><ellipse cx="154" cy="50" rx="4" ry="6" fill="#fff" opacity=".6"/></g>`;
      case 'wings': return `<g fill="#fff" stroke="#adb5bd" stroke-width="3" stroke-linejoin="round"><path d="M64 120 Q20 86 12 104 Q14 120 26 124 Q14 132 24 144 Q36 146 44 140 Q40 154 56 152 Q66 140 70 132Z"/><path d="M136 120 Q180 86 188 104 Q186 120 174 124 Q186 132 176 144 Q164 146 156 140 Q160 154 144 152 Q134 140 130 132Z"/></g>`;
      case 'cape': return `<g><path d="M60 124 Q30 150 34 186 Q100 196 166 186 Q170 150 140 124Z" fill="#e03131" stroke="#a51111" stroke-width="3" stroke-linejoin="round"/><path d="M52 150 Q46 168 48 182 M148 150 Q154 168 152 182" stroke="#ff8787" stroke-width="3" fill="none" opacity=".7"/></g>`;
      case 'rocket': return `<g>${[38, 162].map(x => `<g transform="translate(${x} 0)"><path d="M0 84 Q12 96 12 116 V150 H-12 V116 Q-12 96 0 84Z" fill="#dee2e6" stroke="#868e96" stroke-width="3"/><circle cx="0" cy="112" r="5" fill="#4dabf7" stroke="#1c7ed6" stroke-width="2"/><path d="M-12 150 h24 l-4 8 h-16Z" fill="#ff6b6b" stroke="#c92a2a" stroke-width="2"/><path d="M-7 160 Q0 186 7 160Z" fill="#ffd43b" stroke="#fd7e14" stroke-width="2"/></g>`).join('')}</g>`;
      case 'swings': return `<g fill="#ffe066" stroke="#f59f00" stroke-width="2.5" stroke-linejoin="round">${[[48, 104, 22], [28, 132, 16], [52, 150, 12], [152, 104, 22], [172, 132, 16], [148, 150, 12]].map(([x, y, r]) => `<path d="${starPath(x, y, r, r * .45)}"/>`).join('')}</g>`;
    }
    return '';
  }
  function starPath(cx, cy, R, r) { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1); } return d + 'Z'; }
  /* 一個配件單獨畫在小框框裡（商店用） */
  function itemSVG(k) {
    if (AR[k]) return `<img class="isvg" src="${IMG}acc-${k}.webp" alt="" draggable="false">`;
    const I = ITEMS[k], VB = { bow: '100 50 56 48', flower: '106 52 48 48', bowtie: '72 134 56 40', helmet: '30 16 140 168', halo: '60 20 80 36', lei: '46 132 108 40', balloon: '116 30 84 110', grad: '40 24 120 72', cape: '24 112 152 90' };
    const vb = VB[k] || (I.k === 'h' ? '50 8 100 80' : I.k === 'g' ? '40 92 120 38' : I.k === 'k' ? '50 132 100 58' : '6 74 188 116');
    return `<svg class="isvg" viewBox="${vb}">${acc(k)}</svg>`;
  }
  /* 蛋：p＝孵化進度 0～1（越接近越多裂痕）；t＝0 普通、1 稀有、2 傳說 */
  function eggSVG(p, cls, t) {
    const tt = t | 0;
    return `<svg class="psvg${cls ? ' ' + cls : ''}" viewBox="0 0 200 200">${p >= 1 ? '<circle cx="100" cy="112" r="84" fill="#fff3bf" opacity=".55"/>' : ''}<ellipse cx="100" cy="184" rx="44" ry="8" fill="#000" opacity=".12"/><image href="${IMG}egg-${tt}${p >= .6 ? 'c' : ''}.webp" x="24" y="14" width="152" height="172" preserveAspectRatio="xMidYMax meet"/></svg>`;
  }
  function eggSVGold(p, cls, t) {
    const id = 'e' + (++uid), cr = [], tt = t | 0;
    if (p >= .3) cr.push('M76 96 l8 6 l-4 8 l9 5');
    if (p >= .6) cr.push('M126 110 l-8 4 l5 8 l-9 6');
    if (p >= .9) cr.push('M92 70 l6 8 l8 -4 l6 7');
    const G = [['#fffdf5', '#ffeec2', '#f2c46d', '#d9a441'], ['#f8f0ff', '#d9c8ff', '#9b7be0', '#7b52d6'], ['#fffbe0', '#ffe066', '#f59f00', '#e67700']][tt];
    const deco = tt === 0 ? '<circle cx="78" cy="132" r="11" fill="#ffa8c5" opacity=".75"/><circle cx="124" cy="146" r="8" fill="#8cc8ff" opacity=".8"/><circle cx="120" cy="84" r="9" fill="#7fe0b8" opacity=".8"/><circle cx="90" cy="160" r="6" fill="#ffd84d"/><circle cx="96" cy="100" r="5" fill="#c3a6ff"/>'
      : tt === 1 ? [[80, 128, 10], [124, 146, 7], [118, 86, 8], [92, 160, 5], [100, 104, 5]].map(([x, y, r]) => `<path d="${starPath(x, y, r, r * .45)}" fill="#f1f3f5" stroke="#adb5bd" stroke-width="1.5"/>`).join('')
        : '<path d="M48 120 Q100 96 152 120" stroke="#ff6b6b" stroke-width="7" fill="none" opacity=".7"/><path d="M46 134 Q100 110 154 134" stroke="#4dabf7" stroke-width="7" fill="none" opacity=".7"/><path d="M48 148 Q100 124 152 148" stroke="#69db7c" stroke-width="7" fill="none" opacity=".7"/><circle cx="100" cy="84" r="8" fill="#e599f7" stroke="#fff" stroke-width="2"/><circle cx="76" cy="160" r="5" fill="#74c0fc" stroke="#fff" stroke-width="2"/><circle cx="126" cy="162" r="5" fill="#ff8787" stroke="#fff" stroke-width="2"/>';
    return `<svg class="psvg${cls ? ' ' + cls : ''}" viewBox="0 0 200 200"><defs><radialGradient id="${id}" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="${G[0]}"/><stop offset=".6" stop-color="${G[1]}"/><stop offset="1" stop-color="${G[2]}"/></radialGradient></defs>
      ${tt === 2 ? '<circle cx="100" cy="110" r="88" fill="#fff3bf" opacity=".5"/>' : ''}<ellipse cx="100" cy="182" rx="44" ry="8" fill="#000" opacity=".12"/>
      <path d="M100 32 C140 32 158 98 158 128 C158 162 132 180 100 180 C68 180 42 162 42 128 C42 98 60 32 100 32Z" fill="url(#${id})" stroke="${G[3]}" stroke-width="3.5"/>${deco}
      <ellipse cx="78" cy="70" rx="11" ry="6" fill="#fff" opacity=".7" transform="rotate(-30 78 70)"/>
      ${cr.length ? `<path d="${cr.join(' ')}" stroke="#a0722a" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : ''}</svg>`;
  }

  /* ───────── 資料 ───────── sum.pet：
     帶在身邊的那隻：sp 種類、nm 名字、xp 經驗、h/g/k/b 配件、x 異色、xo 買過的異色、e18/e30 拿過蛋了沒
     其他：st 'egg'|'pet'、ex 第一顆蛋的經驗、coin、full/ft、joy/jt、own 買過的配件、box 其他寵物、eggs 蛋籃、dex 圖鑑、got 拿過的成就蛋、
     ach 成就計數 {wb 錯題練會、bw 打魔王幾週、bk 上次是哪一週、hv 收成次數}、rooms/room 房間、dd/dn 今天答對幾題、gd 每日任務獎勵、evo 等著看進化 */
  const PF = ['nm', 'xp', 'h', 'g', 'k', 'b', 'x', 'xo', 'e18', 'e30'];
  function P() {
    if (!sum) return null;
    if (!sum.pet) sum.pet = { st: 'egg', ex: 0, coin: START_COIN, xp: 0, own: {}, v: 2, u: Date.now() };
    const p = sum.pet; if (p.v !== 2) migrate(p);
    p.box = p.box || {}; p.eggs = p.eggs || []; p.dex = p.dex || {}; p.got = p.got || {}; p.ach = p.ach || {}; p.own = p.own || {}; p.rooms = p.rooms || {};
    return p;
  }
  /* 舊版的寵物換到新版：等級不會掉（照新版同一個等級換算經驗），以前買的顏色退錢 */
  function migrate(p) {
    if (p.st === 'pet' && SPECIES[p.sp]) {
      let lv = 1, x = p.xp || 0; const on = l => 50 + 25 * (l - 1); while (x >= on(lv) && lv < 99) { x -= on(lv); lv++; }
      const frac = x / on(lv); lv = Math.min(MAXLV, lv); p.xp = cum(lv) + Math.round(frac * xpNeed(lv));
      p.dex = Object.assign({}, p.dex, { [p.sp]: 1 });
    }
    if (p.cols) { const n = Object.keys(p.cols).filter(i => p.cols[i] && +i !== OLD_DEF[p.sp]).length; if (n) { p.coin = (p.coin || 0) + n * OLD_COLOR_PRICE; p.refund = n * OLD_COLOR_PRICE; } delete p.cols; }
    delete p.c; p.x = 0; p.xo = {}; p.v = 2; p.u = Date.now();
  }
  const hours = t => t ? Math.max(0, (Date.now() - t) / 3600e3) : 0;
  const fullNow = p => Math.max(0, Math.round((p.full ?? 80) - hours(p.ft) * FULL_DECAY));
  const joyNow = p => Math.max(0, Math.round((p.joy ?? 80) - hours(p.jt) * JOY_DECAY));
  const setFull = (p, v) => { p.full = Math.max(0, Math.min(100, v)); p.ft = Date.now(); };
  const setJoy = (p, v) => { p.joy = Math.max(0, Math.min(100, v)); p.jt = Date.now(); };
  const cared = p => p.st === 'pet' && fullNow(p) >= 50 && joyNow(p) >= 50;
  function moodOf(p) { if (night()) return 'sleep'; const f = fullNow(p), j = joyNow(p); return f < 25 || j < 25 ? 'sad' : f >= 60 && j >= 60 ? 'happy' : 'ok'; }
  /* 畫一隻寵物要的資料（自己的、寵物屋裡的、同學的都可以） */
  function look(p, extra) { return Object.assign({ sp: p.sp, h: p.h, g: p.g, k: p.k, b: p.b, x: p.x | 0, lv: p.lv != null ? p.lv : lvOf(p.xp || 0).lv }, extra || {}); }
  const mine = p => p.st === 'pet' ? [Object.assign({ sp: p.sp, on: 1 }, pick(p)), ...Object.entries(p.box).map(([sp, r]) => Object.assign({ sp }, r))] : [];
  const pick = p => { const r = {}; PF.forEach(k => { if (p[k] != null) r[k] = p[k]; }); return r; };
  const owned = (p, sp) => (p.st === 'pet' && p.sp === sp) || !!p.box[sp];
  function dexN() { const p = P(); return p ? Object.keys(p.dex).filter(k => SPECIES[k]).length : 0; }
  const maxLv = p => Math.max(1, ...mine(p).map(r => lvOf(r.xp || 0).lv));
  const nameOf = p => NAMES[p.nm | 0] || '寵物';
  function save(p) { p.u = Date.now(); saveSum(true); pub(p); }
  /* 公開給同學看的樣子：有變才上傳 */
  function pub(p) {
    if (!user || !p || p.st !== 'pet') return;
    const v = { sp: p.sp, nm: p.nm | 0, lv: lvOf(p.xp || 0).lv, c: p.x | 0, x: p.x | 0, h: p.h || '', g: p.g || '', k: p.k || '', b: p.b || '', dx: dexN() }, key = JSON.stringify(v);
    if (LS.get('learn601_petpub_' + user.seat, '') === key) return;
    LS.set('learn601_petpub_' + user.seat, key); enqueue(`${ROOT}/pet/${user.seat}`, Object.assign({ t: Date.now() }, v), true);
  }

  /* ───────── 練習答完一題（learn.html 的 finish 會呼叫）：回傳拿到的金幣 ───────── */
  function gain(res) {
    const p = P(); if (!p || !GAIN[res]) return 0;
    const today = dkey(); if (p.dd !== today) { p.dd = today; p.dn = 0; }
    p.dn = (p.dn || 0) + 1; const G = p.dn <= BOOST_N ? GAIN[res] : LATE[res];
    let coin = G[0], xp = G[1];
    if (((sum.days || {})[today] || 0) >= GOAL && p.gd !== today) { p.gd = today; xp += DAY_XP; coin += DAY_COIN; if (round) round.pday = 1; }
    try { const wk = bossWk(); if (p.ach.bk !== wk) { p.ach.bk = wk; p.ach.bw = (p.ach.bw || 0) + 1; } } catch (e) { }
    p.coin = (p.coin || 0) + coin; if (round) round.pc = (round.pc || 0) + coin;
    if (p.st === 'egg') {
      const was = p.ex || 0; p.ex = was + xp;
      if (was < EGG_NEED[0] && p.ex >= EGG_NEED[0]) toast('🥚 你的蛋在動了！快去「寵物」看看');
    } else {
      xp = Math.round(xp * (cared(p) ? CARE_K : 1));
      const b = lvOf(p.xp || 0).lv, mb = maxLv(p); p.xp = (p.xp || 0) + xp; if (round) round.px = (round.px || 0) + xp;
      const a = lvOf(p.xp).lv;
      const e = p.eggs[0]; if (e) { const need = EGG_NEED[e.t | 0], w = e.ex || 0; e.ex = Math.min(need, w + G[1]); if (w < need && e.ex >= need) setTimeout(() => toast(`🥚 蛋籃裡的${EGG_N[e.t | 0]}要孵化了！去「寵物屋」看看`), 2200); }
      if (a > b) levelUp(p, b, a, mb);
    }
    checkAch(p); p.u = Date.now(); pub(p);
    return coin;
  }
  function levelUp(p, b, a, mb) {
    const sb = stageOf(b), sa = stageOf(a), ma = maxLv(p);
    if (sa > sb) p.evo = { f: sb, t: sa };
    const un = Object.values(ITEMS).filter(I => I.lv > mb && I.lv <= ma).map(I => I.n);
    const nx = EVO.find(v => v > a);
    setTimeout(() => {
      toast(`🎉 ${nameOf(p)}升到 Lv.${a}！` + (sa > sb ? '✨ 牠好像要進化了，快去寵物頁看看！' : nx ? `（再 ${nx - a} 級進化）` : '') + (un.length ? `　可以買：${un.join('、')}` : ''));
      try { sfx.ticket(); confetti(sa > sb ? 90 : 50); } catch (e) { }
    }, 900);
  }
  /* 成就、里程碑：達成就送蛋（只送一次） */
  function checkAch(p) {
    if (!p || p.st !== 'pet') return;
    const got = [];
    const lv = lvOf(p.xp || 0).lv;
    if (lv >= EVO[1] && !p.e18) {
      p.e18 = 1; const left = STARTERS.filter(k => !p.dex[k] && !p.eggs.some(e => e.t === 0));
      if (left.length) { p.eggs.push({ t: 0, ex: 0 }); got.push('🥚 養到最終進化，得到一顆普通蛋！'); } else { p.coin = (p.coin || 0) + 100; got.push('🎁 養到最終進化，得到 🪙100！'); }
    }
    if (lv >= MAXLV && !p.e30) {
      p.e30 = 1; const left = SP_KEYS.filter(k => SPECIES[k].r === 1 && !p.dex[k] && !p.got[k]);
      if (left.length) { const sp = left[Math.floor(Math.random() * left.length)]; p.got[sp] = 1; p.eggs.push({ t: 1, sp, ex: 0 }); got.push('🥚 滿級了！得到一顆稀有蛋！'); } else { p.coin = (p.coin || 0) + 200; got.push('🎁 滿級了！得到 🪙200！'); }
    }
    SP_KEYS.forEach(sp => {
      const S = SPECIES[sp]; if (!S.r || p.got[sp] || p.dex[sp]) return;
      const r = S.pr(); if (r[0] >= r[1]) { p.got[sp] = 1; p.eggs.push({ t: S.r, sp, ex: 0 }); got.push(`🥚 達成「${S.need}」！得到一顆${EGG_N[S.r]}！`); }
    });
    got.forEach((t, i) => setTimeout(() => { toast(t); try { sfx.win(); confetti(80); } catch (e) { } }, 1600 + i * 2600));
  }
  /* 其他地方的事件：wb 錯題練會一題、hv 農場收成一次 */
  function note(k, n) { const p = P(); if (!p) return; p.ach[k] = (p.ach[k] || 0) + (n || 1); checkAch(p); p.u = Date.now(); }
  function endMsg() {
    const c = round && round.pc || 0; if (!c) return '';
    const p = P(), boost = Math.min(p.dn || 0, BOOST_N);
    return `<div class="tkget petend">🪙 拿到 ${c} 枚金幣${round.px ? `・${nameOf(p)}經驗 +${round.px}` : p.st === 'egg' ? `・🥚 孵蛋進度 ${Math.min(100, Math.round((p.ex || 0) / EGG_NEED[0] * 100))}%` : ''}${round.pday ? '・✅ 每日任務獎勵 +30 經驗' : ''}<small class="pboost">⚡ 今天的元氣加倍 ${boost} / ${BOOST_N}${boost >= BOOST_N ? '（之後經驗減半，明天再加倍）' : ''}</small></div>`;
  }

  /* ───────── 首頁的小卡片 ───────── */
  function homeCard() {
    const p = P(), c = el('button', 'cd', ''); c.id = 'petmini';
    if (p.st === 'egg') {
      const pr = Math.min(1, (p.ex || 0) / EGG_NEED[0]);
      c.innerHTML = `<div class="pmv">${eggSVG(pr, pr >= 1 ? 'wob' : '')}</div><div class="pmi"><div class="pmt">🐾 我的寵物</div>
        <div class="pms">${pr >= 1 ? '🥚 蛋在動了！點我孵化' : `答對題目就能孵蛋（${Math.round(pr * 100)}%）`}</div><div class="pbar s"><i style="width:${pr * 100}%;background:linear-gradient(90deg,#ffd43b,#ff922b)"></i></div></div><span class="pgo">▶</span>`;
    } else {
      const L = lvOf(p.xp || 0), e = p.eggs[0], er = e && (e.ex || 0) >= EGG_NEED[e.t | 0];
      if (p.evo) c.classList.add('glow');
      c.innerHTML = `<div class="pmv">${petArt(look(p, { mood: moodOf(p) }))}</div><div class="pmi"><div class="pmt">🐾 ${nameOf(p)} <small>${formName(p.sp, L.lv)}・Lv.${L.lv}</small></div>
        <div class="pmb"><span>🍙</span><div class="pbar s"><i class="f" style="width:${fullNow(p)}%"></i></div><span>💖</span><div class="pbar s"><i class="j" style="width:${joyNow(p)}%"></i></div></div>
        <div class="pms">${p.evo ? '✨ 牠要進化了！點我看看' : er ? '🥚 蛋籃裡的蛋要孵化了！' : `🪙 ${p.coin || 0}　${moodLine(p, true)}`}</div></div><span class="pgo">▶</span>`;
    }
    tap(c, () => { view = 'pet'; paintNavs(); render(); });
    return c;
  }
  function moodLine(p, short) {
    if (night()) return short ? '😴 睡覺中' : '😴 Zzz…（晚上要睡覺囉，明天見）';
    const f = fullNow(p), j = joyNow(p);
    if (f < 25) return short ? '肚子好餓…' : '肚子咕嚕咕嚕叫…可以給我吃點心嗎？';
    if (j < 25) return short ? '好無聊…' : '好無聊喔…陪我玩一下好不好？';
    if (cared(p)) return short ? '✨ 精神很好' : pick2(['今天也一起練習吧！', '我最喜歡你了！', '答對題目我就會長大喔！', SPECIES[p.sp].say]);
    return short ? '還不錯' : pick2(['有點餓了…', '摸摸我的頭～', SPECIES[p.sp].say]);
  }
  const pick2 = a => a[Math.floor(Math.random() * a.length)];

  /* ───────── 寵物頁 ───────── */
  let tab = 'food', mod = null;
  function page(Pn) {
    const p = P(), h = el('div', 'h1', `<span class="tag">🐾</span>我的寵物`); h.style.setProperty('--c', '#f06595'); Pn.appendChild(h);
    if (p.st === 'egg') return eggPage(Pn, p);
    const L = lvOf(p.xp || 0), st = stageOf(L.lv), S = SPECIES[p.sp];
    const Sg = el('div', 'cd pstage' + (night() ? ' night' : '')); Sg.id = 'pstage';
    Sg.innerHTML = `${roomArt(p.room)}<div class="ptag"><b>${nameOf(p)}</b><small>${S.f[st]}（${S.n}）${S.r ? `<i class="ptier r${S.r}">${TIER[S.r]}</i>` : ''}</small></div><div class="pcoin">🪙 <b id="pcoin">${p.coin || 0}</b></div>
      <div class="pbub" id="pbub">${moodLine(p)}</div><div class="ppet" id="ppet">${petArt(look(p, { mood: moodOf(p), cls: 'big' }))}</div><div id="pfx"></div><div id="plikes"></div>`;
    Pn.appendChild(Sg);
    tap(Sg.querySelector('#ppet'), () => act('pat'));
    /* 狀態 */
    const nx = EVO.find(v => v > L.lv), today = dkey(), dn = p.dd === today ? p.dn || 0 : 0;
    const B = el('div', 'cd pstat');
    B.innerHTML = `<div class="prow"><span class="pl">Lv.${L.lv}</span><div class="pbar x"><i style="width:${L.max ? 100 : L.cur / L.need * 100}%"></i><b>${L.max ? '🏆 滿級了！' : `經驗 ${L.cur} / ${L.need}`}</b></div></div>
      <div class="pevo1">${nx ? `✨ 再 <b>${nx - L.lv}</b> 級（Lv.${nx}）進化成「${S.f[stageOf(nx)]}」` : L.max ? '🎓 最終型態・滿級' : `🌟 已經是最終型態！Lv.${MAXLV} 滿級還有稀有蛋`}</div>
      <div class="prow"><span class="pl">🍙 飽足</span><div class="pbar"><i class="f" id="pbf" style="width:${fullNow(p)}%"></i><b id="pbft">${fullNow(p)}</b></div></div>
      <div class="prow"><span class="pl">💖 開心</span><div class="pbar"><i class="j" id="pbj" style="width:${joyNow(p)}%"></i><b id="pbjt">${joyNow(p)}</b></div></div>
      <div class="pcare" id="pcare">${careLine(p)}</div>
      <div class="pday"><span>⚡ 元氣加倍 <b>${Math.min(dn, BOOST_N)}</b> / ${BOOST_N}</span><span>${p.gd === today ? '✅' : '⬜'} 每日任務獎勵 +30 經驗</span></div>`;
    Pn.appendChild(B);
    const A = el('div', 'pacts');
    [['pat', '🖐️', '摸摸頭'], ['play', '⚽', '一起玩'], ['food', '🍽️', '餵點心'], ['wear', '👒', '換造型'], ['name', '✏️', '改名字']].forEach(([k, i, n]) => {
      const b = el('button', 'pact', `<span>${i}</span>${n}`); b.dataset.k = k;
      tap(b, () => { if (k === 'food' || k === 'wear') { tab = k; paintTab(); document.getElementById('ptabs').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } else if (k === 'name') pickName(null); else act(k); });
      A.appendChild(b);
    });
    Pn.appendChild(A); paintPlay();
    /* 分頁：點心、衣櫃、寵物屋、全班的寵物 */
    const er = p.eggs[0] && (p.eggs[0].ex || 0) >= EGG_NEED[p.eggs[0].t | 0];
    const T = el('div', 'ptabs'); T.id = 'ptabs';
    [['food', '🍽️ 點心'], ['wear', '👒 衣櫃'], ['house', `🏠 寵物屋${er ? '<i class="pdot"></i>' : ''}`], ['class', '🐾 全班']].forEach(([k, n]) => { const b = el('button', '', n); b.dataset.k = k; tap(b, () => { tab = k; paintTab(); }); T.appendChild(b); });
    Pn.appendChild(T);
    const C = el('div', 'cd ptab'); C.id = 'ptab'; Pn.appendChild(C); paintTab();
    Pn.appendChild(el('div', 'phow', `💡 一次就答對：經驗 +10、🪙+2；第二次才答對：經驗 +5、🪙+1。每天前 ${BOOST_N} 題答對拿全額，之後減半。完成每日任務再 +30 經驗、🪙+10；吃飽又開心經驗 ×1.2！`));
    loadLikes();
    if (p.refund) { const n = p.refund; delete p.refund; save(p); setTimeout(() => toast(`🎨 換顏色改成「異色」了，以前買的顏色退還 🪙${n}`), 600); }
    if (p.evo) setTimeout(showEvo, 500);
    clearInterval(page.t); page.t = setInterval(() => { if (view !== 'pet' || !document.getElementById('pstage')) return clearInterval(page.t); refresh(); }, 60000);
  }
  /* 房間：有圖用圖，沒有圖用 SVG */
  function roomArt(id) {
    const r = ROOMS.find(x => x.id === id) || ROOMS[0], n = night();
    if (ROOM_ART.has(r.id)) return `<div class="proom pimg" style="background-image:url(img/pet/room-${r.id}.webp)">${n ? '<i class="pnight"></i>' : ''}</div>`;
    if (r.id === 'home') return roomSVG();
    const sky = n ? ['#262b5c', '#3b3f6b'] : r.id === 'space' ? ['#1d1b4b', '#4b3f8f'] : ['#9bd4ff', '#e3f4ff'];
    let g = `<defs><linearGradient id="rs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs><rect width="400" height="260" fill="url(#rs)"/>`;
    if (r.id === 'meadow') g += `<circle cx="330" cy="50" r="22" fill="${n ? '#fff3bf' : '#ffe066'}"/><g fill="#fff" opacity=".9"><ellipse cx="80" cy="54" rx="30" ry="12"/><ellipse cx="104" cy="46" rx="22" ry="12"/></g>
        <path d="M0 170 Q90 120 190 160 Q290 120 400 158 V260 H0Z" fill="${n ? '#3d6b4f' : '#8ce99a'}"/><path d="M0 196 Q120 170 220 192 Q320 172 400 190 V260 H0Z" fill="${n ? '#2f5a40' : '#69db7c'}"/>
        <g transform="translate(46 150)"><rect x="-6" y="0" width="12" height="44" fill="#a0703c"/><circle cx="0" cy="-8" r="30" fill="${n ? '#2b8a3e' : '#40c057'}"/><circle cx="-18" cy="6" r="18" fill="${n ? '#2b8a3e' : '#51cf66'}"/><circle cx="18" cy="6" r="18" fill="${n ? '#2b8a3e' : '#51cf66'}"/></g>
        ${[[110, 220, '#ff8fab'], [300, 214, '#ffd43b'], [350, 232, '#b197fc'], [80, 238, '#ffffff'], [250, 240, '#ff8787']].map(([x, y, c]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map(a => `<circle cx="${5 * Math.cos(a * Math.PI / 180)}" cy="${5 * Math.sin(a * Math.PI / 180)}" r="4" fill="${c}"/>`).join('')}<circle r="3" fill="#fcc419"/></g>`).join('')}`;
    else if (r.id === 'beach') g += `<circle cx="80" cy="56" r="24" fill="${n ? '#fff3bf' : '#ffe066'}"/><path d="M0 150 H400 V190 H0Z" fill="${n ? '#2c4f86' : '#4dabf7'}"/><path d="M0 158 Q25 152 50 158 T100 158 T150 158 T200 158 T250 158 T300 158 T350 158 T400 158" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>
        <path d="M0 184 Q200 168 400 184 V260 H0Z" fill="${n ? '#b8a27a' : '#ffe8a3'}"/><g transform="translate(340 110)"><path d="M0 0 Q10 40 4 90" stroke="#a0703c" stroke-width="9" fill="none"/><path d="M0 0 Q-40 -10 -56 14 M0 0 Q-30 -30 -10 -44 M0 0 Q30 -30 50 -12 M0 0 Q36 0 46 30" stroke="${n ? '#2b8a3e' : '#40c057'}" stroke-width="10" fill="none" stroke-linecap="round"/></g>
        <path d="${starPath(70, 226, 10, 4.5)}" fill="#ff922b"/><path d="M120 236 q8 -12 16 0Z" fill="#ffc9de" stroke="#f783ac" stroke-width="2"/>`;
    else if (r.id === 'space') g += `${[...Array(26)].map((_, i) => `<circle cx="${(i * 97) % 400}" cy="${(i * 53) % 170}" r="${i % 3 ? 1.6 : 2.6}" fill="#fff" opacity=".85"/>`).join('')}<circle cx="320" cy="60" r="24" fill="#fff3bf"/><circle cx="331" cy="52" r="20" fill="${sky[0]}"/>
        <g transform="translate(80 70)"><circle r="24" fill="#ff922b"/><ellipse rx="40" ry="9" fill="none" stroke="#ffd43b" stroke-width="5" transform="rotate(-18)"/></g>
        <path d="M0 196 Q60 176 120 190 Q200 170 280 188 Q340 176 400 190 V260 H0Z" fill="#c5b8ff"/><path d="M0 216 Q100 200 200 214 Q300 200 400 212 V260 H0Z" fill="#a597f0"/>`;
    return `<svg class="proom" viewBox="0 0 400 260" preserveAspectRatio="xMidYMax slice">${g}${n && r.id !== 'space' ? '<rect width="400" height="260" fill="#1b1f4b" opacity=".25"/>' : ''}</svg>`;
  }
  function roomSVG() {
    const n = night();
    return `<svg class="proom" viewBox="0 0 400 260" preserveAspectRatio="xMidYMax slice">
      <rect width="400" height="260" fill="${n ? '#3b3f6b' : '#fff3e0'}"/><rect y="0" width="400" height="12" fill="${n ? '#2f3358' : '#ffe0b2'}"/>
      ${[...Array(9)].map((_, i) => `<rect x="${i * 46 + 8}" y="0" width="22" height="190" fill="${n ? '#ffffff08' : '#ffffff55'}"/>`).join('')}
      <g transform="translate(36 36)"><rect width="96" height="78" rx="10" fill="${n ? '#1b1f3f' : '#bfe6ff'}" stroke="${n ? '#8d7f6c' : '#c98b4b'}" stroke-width="7"/>
        ${n ? '<circle cx="66" cy="26" r="13" fill="#fff3bf"/><circle cx="72" cy="22" r="11" fill="#1b1f3f"/><circle cx="24" cy="20" r="2" fill="#fff"/><circle cx="40" cy="48" r="1.6" fill="#fff"/><circle cx="80" cy="56" r="1.8" fill="#fff"/>'
        : '<circle cx="72" cy="24" r="11" fill="#ffe066"/><g fill="#fff"><circle cx="26" cy="46" r="10"/><circle cx="38" cy="42" r="12"/><circle cx="50" cy="48" r="9"/></g>'}
        <path d="M48 0 V78 M0 39 H96" stroke="${n ? '#8d7f6c' : '#c98b4b'}" stroke-width="5"/></g>
      <g transform="translate(318 96)"><rect x="-16" y="40" width="32" height="34" rx="6" fill="#e8590c"/><path d="M0 40 Q-30 10 -14 -6 Q-2 10 0 40 Q4 0 22 -4 Q26 20 0 40" fill="#51cf66" stroke="#2f9e44" stroke-width="3"/></g>
      <rect y="190" width="400" height="70" fill="${n ? '#6b5b4b' : '#f5c58a'}"/><path d="M0 190 H400" stroke="${n ? '#5a4a3b' : '#e0a764'}" stroke-width="5"/>
      ${[...Array(8)].map((_, i) => `<path d="M${i * 56} 190 L${i * 56 - 30} 260" stroke="${n ? '#5a4a3b' : '#e7b077'}" stroke-width="3"/>`).join('')}
      <ellipse cx="200" cy="232" rx="124" ry="22" fill="${n ? '#8e6fb8' : '#ffc9de'}"/><ellipse cx="200" cy="232" rx="100" ry="15" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="6 7" opacity=".6"/></svg>`;
  }
  function careLine(p) {
    if (cared(p)) return `✨ 吃飽又開心：練習經驗 ×${CARE_K}！`;
    const f = fullNow(p), j = joyNow(p);
    return `再讓${nameOf(p)}${f < 50 ? '吃飽一點' : ''}${f < 50 && j < 50 ? '、' : ''}${j < 50 ? '開心一點' : ''}，練習經驗就會 ×${CARE_K}`;
  }
  function refresh() {
    const p = P(), s = document.getElementById('pstage'); if (!s || p.st !== 'pet') return;
    const f = fullNow(p), j = joyNow(p), q = id => document.getElementById(id);
    q('pbf').style.width = f + '%'; q('pbft').textContent = f; q('pbj').style.width = j + '%'; q('pbjt').textContent = j;
    q('pcoin').textContent = p.coin || 0; q('pcare').textContent = careLine(p);
    q('ppet').innerHTML = petArt(look(p, { mood: q('ppet').dataset.mood || moodOf(p), cls: 'big' }));
    paintPlay();
  }
  function say(t, ms) { const b = document.getElementById('pbub'); if (!b) return; b.textContent = t; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); clearTimeout(say.t); if (ms) say.t = setTimeout(() => { const p = P(); if (b.isConnected) b.textContent = moodLine(p); }, ms); }
  function fx(html, cls, n = 1) {
    const F = document.getElementById('pfx'); if (!F) return;
    for (let i = 0; i < n; i++) { const e = el('span', 'pf ' + (cls || ''), html); e.style.left = (42 + Math.random() * 16) + '%'; e.style.animationDelay = (i * .12) + 's'; F.appendChild(e); setTimeout(() => e.remove(), 1800); }
  }
  function bounce(cls, mood, ms) {
    const w = document.getElementById('ppet'); if (!w) return;
    w.dataset.mood = mood || ''; refresh();
    w.classList.remove('hop', 'squish', 'spin', 'nom'); void w.offsetWidth; w.classList.add(cls);
    clearTimeout(bounce.t); bounce.t = setTimeout(() => { w.dataset.mood = ''; w.classList.remove(cls); refresh(); }, ms || 1200);
  }
  /* 摸摸頭：一小時最多加 10 次開心（農場裡點寵物也算） */
  function patJoy() {
    const p = P(); if (!p || p.st !== 'pet') return false;
    const hr = Math.floor(Date.now() / 3600e3); if (!p.pat || p.pat.h !== hr) p.pat = { h: hr, n: 0 };
    p.pat.n++; const ok = p.pat.n <= 10; if (ok) setJoy(p, joyNow(p) + 2); save(p); return ok;
  }
  function act(k) {
    const p = P(); if (p.st !== 'pet') return;
    if (night() && k !== 'pat') { say('😴 噓…牠在睡覺，明天早上再一起玩吧', 2500); return; }
    if (k === 'pat') {
      patJoy();
      fx('💗', 'heart', 3); bounce('squish', night() ? 'sleep' : 'happy', 900);
      say(night() ? '呼嚕…Zzz' : pick2(['嘿嘿，好舒服～', '再摸一下！', '我好喜歡你喔！', SPECIES[p.sp].say]), 2200);
      tone2(880, .08);
    } else if (k === 'play') {
      const left = PLAY_MS - (Date.now() - (p.pt || 0));
      if (left > 0) { say(`玩累了，休息一下…（${Math.ceil(left / 60000)} 分鐘後再玩）`, 2500); return; }
      p.pt = Date.now(); setJoy(p, joyNow(p) + 20); setFull(p, fullNow(p) - 5);
      const S = document.getElementById('pstage'), ball = el('div', 'pball', '⚽'); S.appendChild(ball); setTimeout(() => ball.remove(), 1700);
      setTimeout(() => { bounce('hop', 'happy', 1300); fx('⭐', 'star', 4); }, 650);
      say('耶！好好玩！', 2500); tone2(660, .1); setTimeout(() => tone2(990, .12), 120); save(p);
    }
  }
  function paintPlay() { const p = P(), b = document.querySelector('.pact[data-k=play]'); if (!b) return; const left = PLAY_MS - (Date.now() - (p.pt || 0)); b.classList.toggle('cool', left > 0); b.querySelector('span').textContent = left > 0 ? '⏳' : '⚽'; }
  function tone2(f, d) { try { if (typeof tone === 'function' && sndOn) tone(f, d, 'triangle', .07); } catch (e) { } }
  function feed(F) {
    const p = P(), f = fullNow(p);
    if (night()) { say('😴 牠睡著了，明天早上再吃吧', 2200); return; }
    if (f >= 100) { say('吃不下了啦～肚子好飽！', 2000); return; }
    if ((p.coin || 0) < F.p) { say(`金幣不夠…還差 ${F.p - (p.coin || 0)} 枚，去練習賺金幣吧！`, 2600); return; }
    p.coin -= F.p; setFull(p, f + F.f); if (F.j) setJoy(p, joyNow(p) + F.j);
    eatFx(`<img src="${IMG}food-${F.id}.webp" alt="">`, F.n); save(p); refresh(); paintTab();
  }
  function eatFx(icon, n) {
    const S = document.getElementById('pstage'); if (S) { const e = el('div', 'pfood', icon); S.appendChild(e); setTimeout(() => e.remove(), 1100); }
    setTimeout(() => { bounce('nom', 'happy', 1200); fx('😋', 'heart', 1); }, 700);
    say(pick2(['好好吃！', '謝謝你！', '嗯～最喜歡' + n + '了！']), 2300); tone2(520, .08); setTimeout(() => tone2(780, .1), 150);
  }
  /* 餵農場收成的菜：倉庫少 1 個（寵物頁、農場倉庫都會用） */
  function feedCrop(id) {
    const p = P(), Fm = window.FARM && FARM.F(), V = cropFood(id); if (!p || p.st !== 'pet' || !Fm || !V) return '';
    if (night()) return '😴 寵物睡著了，明天早上再餵吧';
    if (!(Fm.store[id] > 0)) return '倉庫裡沒有了';
    const f = fullNow(p); if (f >= 100) return `${nameOf(p)}吃不下了，肚子好飽！`;
    Fm.store[id]--; if (!Fm.store[id]) delete Fm.store[id]; Fm.u = Date.now();
    setFull(p, f + V.f); if (V.j) setJoy(p, joyNow(p) + V.j); save(p);
    return `😋 ${nameOf(p)}吃了${FARM.CROPS[id].n}！🍙+${V.f}${V.j ? ` 💖+${V.j}` : ''}`;
  }
  /* 自己做的確認視窗（不用瀏覽器的 confirm） */
  function ask(html, yes, no) {
    return new Promise(res => {
      const m = el('div', 'pmod pask', `<div class="pmc"><div class="pmh2">${html}</div><div class="pbtns"><button class="go" data-a="1">${yes || '好'}</button><button class="gray pmx" data-a="0">${no || '取消'}</button></div></div>`);
      document.body.appendChild(m);
      m.querySelectorAll('[data-a]').forEach(b => tap(b, () => { m.remove(); res(b.dataset.a === '1'); }));
      tap(m, e => { if (e.target === m) { m.remove(); res(false); } });
    });
  }
  function paintTab() {
    const C = document.getElementById('ptab'), p = P(); if (!C) return;
    document.querySelectorAll('#ptabs button').forEach(b => b.classList.toggle('on', b.dataset.k === tab));
    if (tab === 'food') {
      const Fm = window.FARM && FARM.F(), crops = Fm ? Object.keys(FARM.CROPS).filter(id => Fm.store[id] > 0) : [];
      C.innerHTML = `<div class="pgrid">${FOODS.map((F, i) => `<button class="pitem${(p.coin || 0) < F.p ? ' poor' : ''}" data-f="${i}"><img class="fii" src="${IMG}food-${F.id}.webp" alt=""><b>${F.n}</b><small>🍙+${F.f}${F.j ? ` 💖+${F.j}` : ''}</small><em>🪙 ${F.p}</em></button>`).join('')}</div>
        <div class="psec">🌾 農場收成的菜 <small>比賣掉划算喔</small></div>${crops.length ? `<div class="pgrid">${crops.map(id => { const V = cropFood(id); return `<button class="pitem" data-c="${id}"><img class="fci" src="img/farm/pr-${id}.webp" alt=""><b>${FARM.CROPS[id].n} ×${Fm.store[id]}</b><small>🍙+${V.f}${V.j ? ` 💖+${V.j}` : ''}</small><em>免費</em></button>`; }).join('')}</div>` : '<div class="pnone">倉庫裡還沒有菜。去「農場」種菜，收成以後可以拿來餵寵物！</div>'}`;
      C.querySelectorAll('[data-f]').forEach(b => tap(b, () => feed(FOODS[+b.dataset.f])));
      C.querySelectorAll('[data-c]').forEach(b => tap(b, () => { const id = b.dataset.c, t = feedCrop(id); if (t.startsWith('😋')) { eatFx(`<img src="img/farm/pr-${id}.webp" alt="">`, FARM.CROPS[id].n); refresh(); paintTab(); } else say(t, 2200); }));
    } else if (tab === 'wear') {
      const own = p.own, ML = maxLv(p), L = lvOf(p.xp || 0).lv; let h = '';
      SLOTS.forEach(([k, n]) => {
        h += `<div class="psec">${n}</div><div class="pgrid">`;
        Object.entries(ITEMS).filter(([, I]) => I.k === k).forEach(([id, I]) => {
          const on = p[k] === id, has = own[id], lock = !has && ML < I.lv;
          h += `<button class="pitem w${on ? ' on' : ''}${lock ? ' lock' : ''}" data-i="${id}">${itemSVG(id)}<b>${I.n}</b><em>${on ? '✅ 穿著' : has ? '換上' : lock ? `🔒 Lv.${I.lv}` : `🪙 ${I.p}`}</em></button>`;
        });
        h += '</div>';
      });
      h += `<div class="psec">🎨 異色 <small>每隻寵物各自買・看${nameOf(p)}的等級</small></div><div class="pgrid cols">`;
      XS.forEach((x, i) => { const cur = (p.x | 0) === i, has = !i || (p.xo || {})[i], lock = !has && L < x.lv; h += `<button class="pcol${cur ? ' on' : ''}${lock ? ' lock' : ''}" data-x="${i}" style="--m:${x.c}"><i>${i === 4 ? '✨' : ''}</i><small>${x.n}</small><em>${cur ? '✅' : has ? '換上' : lock ? `🔒Lv.${x.lv}` : `🪙${x.p}`}</em></button>`; });
      h += `</div><div class="psec">🏡 房間</div><div class="pgrid rooms">`;
      ROOMS.forEach(r => { const cur = (p.room || 'home') === r.id, has = !r.p || p.rooms[r.id], lock = !has && ML < r.lv; h += `<button class="proomb${cur ? ' on' : ''}${lock ? ' lock' : ''}" data-r="${r.id}"><span class="prv">${roomArt(r.id)}</span><b>${r.n}</b><em>${cur ? '✅ 使用中' : has ? '換上' : lock ? `🔒 Lv.${r.lv}` : `🪙 ${r.p}`}</em></button>`; });
      C.innerHTML = h + '</div>';
      C.querySelectorAll('[data-i]').forEach(b => tap(b, () => wear(b.dataset.i)));
      C.querySelectorAll('[data-x]').forEach(b => tap(b, () => shiny(+b.dataset.x)));
      C.querySelectorAll('[data-r]').forEach(b => tap(b, () => room(b.dataset.r)));
    } else if (tab === 'house') house(C);
    else classPets(C);
  }
  async function wear(id) {
    const p = P(), I = ITEMS[id];
    if (p[I.k] === id) { p[I.k] = ''; save(p); refresh(); paintTab(); return; }   // 再點一次＝脫下來
    if (!p.own[id]) {
      if (maxLv(p) < I.lv) { say(`寵物升到 Lv.${I.lv} 才能買${I.n}喔！`, 2200); return; }
      if ((p.coin || 0) < I.p) { say(`金幣不夠…還差 ${I.p - (p.coin || 0)} 枚`, 2200); return; }
      if (!(await ask(`<div class="paski">${itemSVG(id)}</div>用 🪙${I.p} 買「${I.n}」嗎？<small>買了以後每一隻寵物都可以戴</small>`, '買！'))) return;
      p.coin -= I.p; p.own[id] = 1; try { sfx.ticket(); } catch (e) { }
    }
    p[I.k] = id; save(p); refresh(); paintTab(); bounce('spin', 'happy', 1000); fx('✨', 'star', 4); say(pick2(['好看嗎？', '我變漂亮了！', '酷吧！']), 2200);
  }
  async function shiny(i) {
    const p = P(), x = XS[i], L = lvOf(p.xp || 0).lv; p.xo = p.xo || {};
    if ((p.x | 0) === i) return;
    if (i && !p.xo[i]) {
      if (L < x.lv) { say(`${nameOf(p)}升到 Lv.${x.lv} 才能變成${x.n}色喔！`, 2200); return; }
      if ((p.coin || 0) < x.p) { say(`金幣不夠…還差 ${x.p - (p.coin || 0)} 枚`, 2200); return; }
      if (!(await ask(`<div class="paskp">${petArt(look(p, { x: i, mood: 'happy' }))}</div>用 🪙${x.p} 讓${nameOf(p)}變成「${x.n}」異色嗎？`, '變身！'))) return;
      p.coin -= x.p; p.xo[i] = 1;
    }
    p.x = i; save(p); refresh(); paintTab(); bounce('spin', 'happy', 1000); fx(i === 4 ? '✨' : '🎨', 'star', 4);
  }
  async function room(id) {
    const p = P(), r = ROOMS.find(x => x.id === id); if ((p.room || 'home') === id) return;
    if (r.p && !p.rooms[id]) {
      if (maxLv(p) < r.lv) { say(`寵物升到 Lv.${r.lv} 才能搬到${r.n}喔！`, 2200); return; }
      if ((p.coin || 0) < r.p) { say(`金幣不夠…還差 ${r.p - (p.coin || 0)} 枚`, 2200); return; }
      if (!(await ask(`用 🪙${r.p} 買「${r.n}」房間嗎？`, '買！'))) return;
      p.coin -= r.p; p.rooms[id] = 1;
    }
    p.room = id; save(p); render();
  }

  /* ───────── 寵物屋：蛋籃、我的寵物、圖鑑 ───────── */
  function house(C) {
    const p = P(), list = mine(p);
    let h = `<div class="psec">🧺 蛋籃 <small>答題的經驗也會讓蛋長大，一次孵一顆</small></div>`;
    h += p.eggs.length ? `<div class="peggs">${p.eggs.map((e, i) => { const need = EGG_NEED[e.t | 0], pr = i ? 0 : Math.min(1, (e.ex || 0) / need); return `<button class="pegg${!i && pr >= 1 ? ' ready' : ''} t${e.t | 0}" data-e="${i}"><span class="pev">${eggSVG(pr, !i && pr >= 1 ? 'wob' : '', e.t)}</span><b>${EGG_N[e.t | 0]}</b><small>${i ? '排隊中' : pr >= 1 ? '👆 點我孵化！' : `孵化 ${Math.round(pr * 100)}%`}</small></button>`; }).join('')}</div>`
      : '<div class="pnone">現在沒有蛋。寵物養到 Lv.18 最終進化、或達成下面圖鑑的條件，就會得到新的蛋！</div>';
    h += `<div class="psec">🏠 我的寵物（${list.length}） <small>點一下換牠帶在身邊（只有帶在身邊的會升級）</small></div><div class="pcls mine">${list.map(r => { const lv = lvOf(r.xp || 0).lv; return `<button data-s="${r.sp}" class="${r.on ? 'on' : ''}">${petArt(look(r, { mood: 'ok' }))}<b>${NAMES[r.nm | 0]}</b><small>${formName(r.sp, lv)}・Lv.${lv}</small>${r.on ? '<em>✅ 在身邊</em>' : ''}</button>`; }).join('')}</div>`;
    h += `<div class="psec">📖 圖鑑 ${dexN()} / ${SP_KEYS.length}</div>`;
    [[0, '初始寵物'], [1, '★ 稀有寵物'], [2, '★★ 傳說寵物']].forEach(([t, n]) => {
      h += `<div class="pdxh r${t}">${n}${t ? '' : '<small>第一顆蛋可以選；寵物養到 Lv.18 會得到普通蛋，再選一隻</small>'}</div><div class="pdex">`;
      SP_KEYS.filter(k => SPECIES[k].r === t).forEach(sp => {
        const S = SPECIES[sp], r = list.find(x => x.sp === sp), has = !!p.dex[sp], lv = r ? lvOf(r.xp || 0).lv : 1, inEgg = p.eggs.some(e => e.sp === sp);
        let cnd = '';
        if (!has && t) { const v = S.pr(); cnd = inEgg ? '🥚 蛋已經在蛋籃裡了' : `${S.need}<i>${v[2] || `${Math.min(v[0], v[1])} / ${v[1]}`}</i>`; }
        h += `<div class="pdx${has ? ' has' : ''} r${t}">${petArt({ sp, lv, sil: !has, mood: 'happy' })}<b>${has ? S.n : '？？？'}</b>${has ? `<small>${S.f.join(' → ')}</small>` : cnd ? `<span>${cnd}</span>` : ''}</div>`;
      });
      h += '</div>';
    });
    C.innerHTML = h;
    C.querySelectorAll('[data-e]').forEach(b => tap(b, () => eggTap(+b.dataset.e)));
    C.querySelectorAll('.mine [data-s]').forEach(b => tap(b, () => switchTo(b.dataset.s)));
  }
  async function switchTo(sp) {
    const p = P(); if (p.sp === sp || !p.box[sp]) return;
    const r = p.box[sp]; if (!(await ask(`<div class="paskp">${petArt(look(r, { sp, mood: 'happy' }))}</div>換 ${NAMES[r.nm | 0]} 帶在身邊嗎？<small>${nameOf(p)}會回寵物屋休息，等級不會變</small>`, '換牠！'))) return;
    p.box[p.sp] = pick(p); PF.forEach(k => delete p[k]); Object.assign(p, r); p.sp = sp; delete p.box[sp];
    save(p); toast(`🐾 ${nameOf(p)}來陪你了！`); render();
  }
  function eggTap(i) {
    const p = P(), e = p.eggs[i]; if (!e) return;
    if (i) { toast('🥚 一次孵一顆，等前面的蛋孵完喔'); return; }
    if ((e.ex || 0) < EGG_NEED[e.t | 0]) { toast(`🥚 再答對一些題目，蛋就會孵化（${Math.round((e.ex || 0) / EGG_NEED[e.t | 0] * 100)}%）`); return; }
    const fl = el('div', 'pflash'); document.body.appendChild(fl); setTimeout(() => fl.remove(), 900); tone2(500, .1); setTimeout(() => tone2(700, .12), 200);
    if (e.t === 0 || !e.sp) pickSpecies(sp => newPet(sp, 0));
    else { const S = SPECIES[e.sp], m = modal(`<div class="pmh">🎉 ${EGG_N[e.t]}裂開了！</div><div class="pnow vis">${petArt({ sp: e.sp, lv: 1, mood: 'happy' })}</div><div class="pmh2">是<b>${S.n}</b>！<small>${TIER[S.r]}寵物・${S.f.join(' → ')}</small></div><button class="go" id="pok">幫牠取名字 ▶</button>`); try { confetti(140); sfx.win(); } catch (x) { } tap(m.querySelector('#pok'), () => newPet(e.sp, 0)); }
  }
  /* 從蛋籃孵出來的新寵物：先取名字，再問要不要帶在身邊 */
  function newPet(sp, i) {
    pickName(sp, async nm => {
      const p = P(); p.eggs.splice(i, 1); p.dex[sp] = 1; p.box[sp] = { nm, xp: 0, h: '', g: '', k: '', b: '', x: 0, xo: {} };
      save(p); closeModal(); toast(`🐣 歡迎 ${NAMES[nm]}！`); try { sfx.win(); confetti(100); } catch (e) { }
      if (await ask(`<div class="paskp">${petArt({ sp, lv: 1, mood: 'happy' })}</div>要換 ${NAMES[nm]} 帶在身邊嗎？<small>帶在身邊的寵物才會升級；${nameOf(p)}可以隨時換回來</small>`, '帶牠！', '等一下')) { delete p.box[sp]; p.box[p.sp] = pick(p); PF.forEach(k => delete p[k]); Object.assign(p, { nm, xp: 0, h: '', g: '', k: '', b: '', x: 0, xo: {} }); p.sp = sp; save(p); }
      tab = 'house'; render();
    });
  }
  /* 進化動畫：發光 → 閃一閃 → 變身 */
  function showEvo() {
    const p = P(); if (!p || !p.evo || mod) return false;
    const e = p.evo; delete p.evo; save(p);
    const S = SPECIES[p.sp], a = look(p, { stage: e.f, mood: 'happy' }), b = look(p, { stage: e.t, mood: 'happy' });
    const m = modal(`<div class="pevo"><div class="pmh" id="pevh">咦？${nameOf(p)}的樣子……</div><div class="pevs"><div class="pev0">${petArt(a)}</div><div class="pev1">${petArt(b)}</div><i class="pevl" style="background-image:url(${IMG}fx-evo.webp)"></i><i class="pevu" style="background-image:url(${IMG}fx-up.webp)"></i></div><div class="pevt" id="pevt">　</div><button class="go" id="pevok">太棒了！</button></div>`);
    m.classList.add('evo'); [0, 400, 800, 1200, 1600, 2000, 2400].forEach((t, i) => setTimeout(() => tone2(440 + i * 70, .09), t));
    const ok = m.querySelector('#pevok'); ok.style.visibility = 'hidden';
    setTimeout(() => {
      if (!m.isConnected) return; m.querySelector('.pevs').classList.add('done');
      m.querySelector('#pevh').textContent = '✨ 進化了！✨';
      m.querySelector('#pevt').innerHTML = `${nameOf(p)}進化成「<b>${S.f[e.t]}</b>」了！${e.t === 2 ? '<small>最終進化！還得到一顆新的蛋</small>' : '<small>繼續練習，Lv.18 還會再進化喔！</small>'}`;
      ok.style.visibility = 'visible'; try { confetti(160); sfx.win(); } catch (x) { }
    }, 3300);
    tap(ok, () => { closeModal(); render(); });
    return true;
  }

  /* ───────── 第一顆蛋、孵化 ───────── */
  function eggPage(Pn, p) {
    const pr = Math.min(1, (p.ex || 0) / EGG_NEED[0]), S = el('div', 'cd pstage egg' + (night() ? ' night' : '')); S.id = 'pstage';
    const left = Math.max(0, Math.ceil((EGG_NEED[0] - (p.ex || 0)) / 10));
    S.innerHTML = `${roomSVG()}<div class="pcoin">🪙 <b>${p.coin || 0}</b></div><div class="pbub">${pr >= 1 ? '喀啦喀啦…裡面有東西在動！點一下蛋！' : '這是一顆神奇的蛋，答對題目就能讓牠長大孵化！'}</div>
      <div class="ppet" id="ppet">${eggSVG(pr, 'big' + (pr >= 1 ? ' wob' : ''))}</div><div id="pfx"></div>`;
    Pn.appendChild(S);
    const B = el('div', 'cd pstat');
    B.innerHTML = `<div class="prow"><span class="pl">🥚 孵化</span><div class="pbar x"><i style="width:${pr * 100}%;background:linear-gradient(90deg,#ffd43b,#ff922b)"></i><b>${Math.round(pr * 100)}%</b></div></div>
      <div class="pcare">${pr >= 1 ? '👆 點一下蛋，看看裡面是誰！' : `再一次答對 ${left} 題左右就會孵化（第二次才答對也算一半）`}</div>`;
    Pn.appendChild(B);
    if (pr < 1) { const g = el('button', 'go pgo2', '✏️ 去練習孵蛋 ▶'); tap(g, () => startPractice((mixOf(subj) || MIX).key)); Pn.appendChild(g); }
    else tap(S.querySelector('#ppet'), () => hatch());
    Pn.appendChild(el('div', 'phow', '💡 孵化以後可以從 8 種寵物裡選一隻、取名字。牠會跟著你練習升級、進化！'));
  }
  function hatch() {
    const w = document.getElementById('ppet'); if (!w || hatch.busy) return; hatch.busy = 1;
    w.classList.add('shake'); tone2(400, .1); setTimeout(() => tone2(500, .1), 300); setTimeout(() => tone2(650, .1), 600);
    setTimeout(() => {
      hatch.busy = 0; const f = el('div', 'pflash'); document.body.appendChild(f); setTimeout(() => f.remove(), 900);
      pickSpecies(sp => pickName(sp, nm => { const p = P(); p.sp = sp; p.nm = nm; p.st = 'pet'; p.xp = 0; p.dex[sp] = 1; setFull(p, 80); setJoy(p, 80); try { sfx.win(); confetti(120); } catch (e) { } toast(`🐣 歡迎 ${NAMES[nm]}！以後要一起努力喔！`); save(p); closeModal(); render(); }));
    }, 1300);
  }
  function modal(html) { closeModal(); mod = el('div', 'pmod', `<div class="pmc">${html}</div>`); document.body.appendChild(mod); return mod; }
  function closeModal() { if (mod) mod.remove(); mod = null; }
  /* 選初始寵物（還沒有的才能選） */
  function pickSpecies(cb) {
    const p = P(), list = STARTERS.filter(k => !p.dex[k]);
    const m = modal(`<div class="pmh">🎉 蛋裂開了！你想要哪一隻寵物？</div><div class="pspg">${list.map(k => `<button data-s="${k}">${petArt({ sp: k, lv: 1, mood: 'happy' })}<b>${SPECIES[k].n}</b><small>${SPECIES[k].f.join('→')}</small></button>`).join('')}</div>`);
    m.querySelectorAll('[data-s]').forEach(b => tap(b, () => cb(b.dataset.s)));
  }
  /* 取名字：sp＝新寵物（cb(名字) 收尾）；sp 是 null＝幫現在的寵物改名 */
  function pickName(sp, cb) {
    const p = P(), re = !sp, look1 = re ? look(p, { mood: 'happy' }) : { sp, lv: 1, mood: 'happy' };
    const m = modal(`<div class="pmh">${re ? '要改成什麼名字？' : '幫你的寵物取個名字吧！'}</div><div class="pnow">${petArt(look1)}</div>
      <div class="png">${NAMES.map((n, i) => `<button data-n="${i}" class="${re && (p.nm | 0) === i ? 'on' : ''}">${n}</button>`).join('')}</div>${re ? '<button class="gray pmx">取消</button>' : ''}`);
    m.querySelectorAll('[data-n]').forEach(b => tap(b, () => {
      const n = +b.dataset.n;
      if (re) { p.nm = n; save(p); closeModal(); render(); } else cb(n);
    }));
    const x = m.querySelector('.pmx'); if (x) tap(x, closeModal);
  }

  /* ───────── 全班的寵物、按讚 ───────── */
  let CLS = null;
  async function loadClass() {
    if (CLS && Date.now() - CLS.at < 30000) return CLS;
    await fbReady; let v = null; if (db && online) { try { v = (await timeout(db.ref(`${ROOT}/pet`).get(), 8000)).val() || {}; } catch (e) { v = null; } }
    CLS = { at: Date.now(), ok: !!v, v: v || {} }; return CLS;
  }
  async function classPets(C) {
    C.innerHTML = '<div class="ld">讀取中…</div>';
    const R = await loadClass(); if (tab !== 'class' || !C.isConnected) return;
    if (!R.ok) { C.innerHTML = '<div class="ld">📴 連上網路才看得到同學的寵物</div>'; return; }
    const me = user.seat, p = P(), seats = allSeats2().filter(s => s !== me);
    const list = seats.map(s => ({ s, v: R.v[s] })).filter(x => x.v && SPECIES[x.v.sp]).sort((a, b) => (b.v.lv - a.v.lv) || a.s - b.s);
    if (!list.length) { C.innerHTML = '<div class="ld">同學們的寵物還在蛋裡面，快邀請大家一起來練習孵蛋！</div>'; return; }
    C.innerHTML = `<div class="psec">全班 ${list.length + (p.st === 'pet' ? 1 : 0)} 隻寵物・點一下可以送貼圖給牠 <small>（一天一次）</small></div><div class="pcls">${list.map(x => `<button data-s="${x.s}">${petArt(Object.assign({}, x.v, { mood: 'ok' }))}<b>${NAMES[x.v.nm | 0] || ''}</b><small>${seatName(x.s)}・Lv.${x.v.lv | 0}${x.v.dx > 1 ? `・📖${x.v.dx}` : ''}</small></button>`).join('')}</div>`;
    C.querySelectorAll('[data-s]').forEach(b => tap(b, () => visit(+b.dataset.s, R.v[b.dataset.s])));
  }
  const allSeats2 = () => [...SEATS.flat(), ...(user && isTest(user.seat) ? TEST_SEATS : [])];
  function visit(s, v) {
    const sent = LS.get('learn601_petlk_' + user.seat, {}), today = dkey(), done = sent[s] === today, S = SPECIES[v.sp];
    const m = modal(`<div class="pmh">${seatName(s)}的 ${NAMES[v.nm | 0]}　<small>${formName(v.sp, v.lv)}（${S.n}）・Lv.${v.lv | 0}</small></div><div class="pnow vis">${petArt(Object.assign({}, v, { mood: 'happy' }))}</div>
      <div class="pstk">${done ? '<div class="pdone">今天已經送過貼圖了，明天再來吧！</div>' : STICKERS.map((e, i) => `<button data-e="${i}">${e}</button>`).join('')}</div><button class="gray pmx">關閉</button>`);
    m.querySelectorAll('[data-e]').forEach(b => tap(b, async () => {
      sent[s] = today; LS.set('learn601_petlk_' + user.seat, sent);
      enqueue(`${ROOT}/petlike/${s}/${user.seat}`, { e: +b.dataset.e, d: today, t: Date.now() }, true);
      m.querySelector('.pstk').innerHTML = `<div class="pdone">已經送出 ${STICKERS[+b.dataset.e]} 了！</div>`; try { sfx.ok(); } catch (e) { }
      const n = m.querySelector('.pnow'); n.classList.remove('hop'); void n.offsetWidth; n.classList.add('hop');
    }));
    tap(m.querySelector('.pmx'), closeModal);
  }
  /* 自己今天收到的貼圖 */
  async function loadLikes() {
    await fbReady; if (!db || !online || !user) return; let v = null;
    try { v = (await timeout(db.ref(`${ROOT}/petlike/${user.seat}`).get(), 8000)).val() || {}; } catch (e) { return; }
    const B = document.getElementById('plikes'); if (!B) return;
    const today = dkey(), got = Object.entries(v).filter(([f, x]) => x && x.d === today && STICKERS[x.e] && (!isTest(+f) || isTest(user.seat)));
    if (!got.length) return;
    B.innerHTML = `<div class="plk">今天收到：${got.map(([f, x]) => `<span title="${seatName(+f)}">${STICKERS[x.e]}<small>${+f >= 98 ? '測' : f}</small></span>`).join('')}</div>`;
  }

  /* ───────── 樣式 ───────── */
  const css = `
  .pa{position:relative;width:100%;height:100%}.pa>svg,.pa>.pspk{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
  .pa .pmood{position:absolute;right:8%;top:18%;font-size:1.6em}
  .pspk i{position:absolute;width:22%;height:22%;background:center/contain no-repeat;animation:pspk 1.8s ease-in-out infinite}
  .pspk i:nth-child(1){left:12%;top:24%}.pspk i:nth-child(2){right:10%;top:40%;animation-delay:.6s}.pspk i:nth-child(3){left:40%;top:6%;animation-delay:1.2s}
  @keyframes pspk{0%,100%{transform:scale(.2) rotate(0);opacity:0}50%{transform:scale(1) rotate(45deg);opacity:1}}
  .psvg{display:block;width:100%;height:100%;overflow:visible}
  .psvg .peye{transform-box:fill-box;transform-origin:center;animation:pblink 4.5s infinite}
  @keyframes pblink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
  .psvg.wob{animation:pwob 1.2s ease-in-out infinite;transform-origin:50% 90%}
  @keyframes pwob{0%,100%{transform:rotate(0)}20%{transform:rotate(-7deg)}40%{transform:rotate(6deg)}60%{transform:rotate(-4deg)}80%{transform:rotate(2deg)}}
  #petmini{display:flex;align-items:center;gap:.9rem;width:100%;margin-top:1rem;text-align:left;border:0;background:linear-gradient(135deg,#fff,#fff0f6);cursor:pointer;font-family:inherit}
  #petmini.glow{box-shadow:0 0 0 4px #ffe066,0 0 24px #ffd43b;animation:pglow 1.6s ease-in-out infinite}@keyframes pglow{50%{box-shadow:0 0 0 4px #ffe066,0 0 6px #ffd43b}}
  #petmini .pmv{width:5.6rem;height:5.6rem;flex:none}
  #petmini .pmi{flex:1;min-width:0}#petmini .pmt{font-size:1.4rem;font-weight:900;color:#d6336c}#petmini .pmt small{font-size:1rem;color:#f06595;margin-left:.3rem}
  #petmini .pms{font-size:1.05rem;color:#666;font-weight:800;margin-top:.25rem}
  #petmini .pmb{display:flex;align-items:center;gap:.35rem;margin-top:.3rem}#petmini .pmb .pbar{flex:1}
  #petmini .pgo{font-size:1.6rem;color:#f06595;flex:none}
  .pbar{position:relative;height:1.5rem;background:#f1f3f5;border-radius:1rem;overflow:hidden;flex:1}
  .pbar.s{height:.75rem}.pbar.x{height:1.7rem}
  .pbar i{position:absolute;inset:0 auto 0 0;border-radius:1rem;background:linear-gradient(90deg,#74c0fc,#4dabf7);transition:width .8s}
  .pbar i.f{background:linear-gradient(90deg,#ffd43b,#fab005)}.pbar i.j{background:linear-gradient(90deg,#ff8fab,#f06595)}
  .pbar b{position:relative;display:block;text-align:center;font-size:.95rem;line-height:1.5rem;color:#333}.pbar.x b{line-height:1.7rem}
  .pstage{position:relative;height:min(25rem,52vh);padding:0;overflow:hidden;border-radius:28px}
  .pstage .proom{position:absolute;inset:0;width:100%;height:100%}.proom.pimg{background-size:cover;background-position:50% 100%}.proom .pnight{position:absolute;inset:0;background:#1b1f4b;opacity:.35}
  .pstage .ppet{position:absolute;left:50%;bottom:2%;height:calc(100% - 5.6rem);aspect-ratio:1;max-width:82%;transform:translateX(-50%);cursor:pointer;touch-action:manipulation}
  .pstage .ppet>.pa,.pstage .ppet>.psvg{animation:pbob 2.6s ease-in-out infinite;transform-origin:50% 92%}
  .pstage.night .ppet>.pa{animation:pbreath 3.6s ease-in-out infinite}
  @keyframes pbob{0%,100%{transform:translateY(0) scale(1,1)}50%{transform:translateY(-6px) scale(.98,1.02)}}
  @keyframes pbreath{0%,100%{transform:scale(1,1)}50%{transform:scale(1.03,.97)}}
  .ppet.squish>.pa{animation:psq .5s ease-out 2!important}
  @keyframes psq{0%{transform:scale(1,1)}40%{transform:scale(1.12,.86)}70%{transform:scale(.95,1.06)}100%{transform:scale(1,1)}}
  .ppet.hop>.pa,.pnow.hop>.pa{animation:phop .55s ease-out 2!important}
  @keyframes phop{0%,100%{transform:translateY(0)}40%{transform:translateY(-34px) scale(.96,1.05)}80%{transform:translateY(0) scale(1.08,.92)}}
  .ppet.spin>.pa{animation:pspin .8s ease-in-out!important}
  @keyframes pspin{0%{transform:rotateY(0)}100%{transform:rotateY(360deg)}}
  .ppet.nom>.pa{animation:pnom .25s ease-in-out 4!important}
  @keyframes pnom{50%{transform:scale(1.06,.94)}}
  .ppet.shake>.psvg{animation:pshake .12s linear infinite!important}
  @keyframes pshake{0%,100%{transform:translateX(0) rotate(0)}25%{transform:translateX(-5px) rotate(-4deg)}75%{transform:translateX(5px) rotate(4deg)}}
  .pflash{position:fixed;inset:0;background:#fff;z-index:60;animation:pflash .9s forwards;pointer-events:none}@keyframes pflash{0%{opacity:0}25%{opacity:1}100%{opacity:0}}
  .ptag{position:absolute;left:1rem;top:.9rem;background:rgba(255,255,255,.92);border-radius:16px;padding:.35rem .8rem;box-shadow:0 3px 0 #f1e3cf;z-index:2;max-width:55%}
  .ptag b{font-size:1.45rem;color:#d6336c;display:block;line-height:1.2}.ptag small{font-size:.95rem;color:#888;font-weight:800}
  .ptier{font-style:normal;font-size:.8rem;border-radius:8px;padding:0 .35rem;margin-left:.3rem;color:#fff;vertical-align:1px}.ptier.r1{background:#7950f2}.ptier.r2{background:linear-gradient(90deg,#f59f00,#e8590c)}
  .pcoin{position:absolute;right:1rem;top:.9rem;background:#fff9db;border:3px solid #ffe066;border-radius:16px;padding:.3rem .8rem;font-size:1.35rem;font-weight:900;color:#e67700;z-index:2}
  .pbub{position:absolute;left:50%;top:7%;transform:translateX(-50%);max-width:min(22rem,80%);background:#fff;border-radius:18px;padding:.5rem .9rem;font-size:1.2rem;font-weight:900;color:#555;box-shadow:0 4px 12px rgba(0,0,0,.1);z-index:2;text-align:center}
  .pbub::after{content:'';position:absolute;left:50%;bottom:-9px;margin-left:-9px;border:9px solid transparent;border-top-color:#fff;border-bottom:0}
  .pbub.pop{animation:popin .35s}
  .pstage.night .pbub{background:#e7e9ff}.pstage.night .pbub::after{border-top-color:#e7e9ff}
  #pfx{position:absolute;inset:0;pointer-events:none;z-index:3}
  .pf{position:absolute;bottom:45%;font-size:2rem;animation:pfly 1.6s ease-out forwards;opacity:0}
  @keyframes pfly{0%{opacity:0;transform:translate(0,0) scale(.4)}20%{opacity:1;transform:translate(-10px,-30px) scale(1.1)}100%{opacity:0;transform:translate(20px,-140px) scale(.8)}}
  .pball{position:absolute;left:8%;bottom:10%;font-size:3rem;z-index:3;animation:pball 1.6s ease-in-out forwards}
  @keyframes pball{0%{transform:translate(0,0) rotate(0)}35%{transform:translate(28vw,-9rem) rotate(260deg)}60%{transform:translate(min(38vw,22rem),-1rem) rotate(400deg)}80%{transform:translate(min(46vw,27rem),-3rem) rotate(500deg)}100%{transform:translate(min(56vw,33rem),0) rotate(620deg);opacity:0}}
  .pfood{position:absolute;right:12%;top:30%;font-size:3.2rem;z-index:3;animation:pfood 1s ease-in forwards}
  @keyframes pfood{0%{transform:scale(.5);opacity:0}30%{transform:scale(1.2);opacity:1}100%{transform:translate(-22vw,7rem) scale(.4);opacity:0}}
  #plikes{position:absolute;left:1rem;bottom:.8rem;z-index:2}.plk{background:rgba(255,255,255,.92);border-radius:14px;padding:.3rem .6rem;font-size:1rem;font-weight:900;color:#d6336c;display:flex;flex-wrap:wrap;gap:.3rem;max-width:16rem}
  .plk span{font-size:1.25rem}.plk small{font-size:.7rem;color:#999;margin-left:.1rem}
  .pstat{margin-top:.8rem;display:flex;flex-direction:column;gap:.5rem}
  .prow{display:flex;align-items:center;gap:.6rem}.prow .pl{width:5rem;flex:none;font-size:1.15rem;font-weight:900;color:#555}
  .pevo1{font-size:1.05rem;font-weight:900;color:#7048e8;text-align:center}.pevo1 b{font-size:1.25rem}
  .pcare{font-size:1.05rem;font-weight:900;color:#f08c00;text-align:center}
  .pday{display:flex;justify-content:center;gap:.5rem 1.2rem;flex-wrap:wrap;font-size:1rem;font-weight:900;color:#666}.pday b{color:#e67700}
  .pacts{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.6rem;margin-top:.8rem}
  .pact{background:#fff;border:0;border-radius:20px;box-shadow:0 5px 0 #f1e3cf;padding:.55rem .2rem;font-size:1.05rem;font-weight:900;color:#555;display:flex;flex-direction:column;align-items:center;gap:.15rem;font-family:inherit}
  .pact span{font-size:2rem;line-height:1}.pact:active{transform:translateY(3px);box-shadow:0 2px 0 #f1e3cf}.pact.cool{opacity:.55}
  .ptabs{display:flex;gap:.5rem;margin-top:1.1rem}.ptabs button{flex:1;border:0;border-radius:16px 16px 0 0;padding:.65rem .3rem;font-size:1.15rem;font-weight:900;background:#f1f3f5;color:#888;font-family:inherit;position:relative}
  .ptabs button.on{background:#fff;color:#d6336c}.pdot{position:absolute;top:.4rem;right:.5rem;width:.7rem;height:.7rem;border-radius:50%;background:#fa5252}
  .ptab{border-top-left-radius:0;border-top-right-radius:0;min-height:10rem}
  .psec{font-size:1.15rem;font-weight:900;color:#666;margin:.7rem 0 .4rem}.psec small{color:#999;font-size:.9rem;margin-left:.4rem}
  .pnone{font-size:1rem;font-weight:800;color:#999;background:#f8f9fa;border-radius:14px;padding:.6rem .8rem}
  .pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(7.2rem,1fr));gap:.6rem}
  .pitem{background:#fff9fb;border:3px solid #ffdeeb;border-radius:18px;padding:.5rem .3rem;display:flex;flex-direction:column;align-items:center;gap:.1rem;font-family:inherit}
  .pitem .fi{font-size:2.6rem;line-height:1.1}.pitem .fii{width:3.2rem;height:3.2rem;object-fit:contain}.pfood img{width:4rem;height:4rem;object-fit:contain}.pitem .fci{width:3rem;height:3rem;object-fit:contain}.pitem b{font-size:1.05rem;color:#444}.pitem small{font-size:.85rem;color:#888;font-weight:800}
  .pitem em{font-style:normal;font-size:.95rem;font-weight:900;color:#e67700;margin-top:.15rem}
  .pitem.poor{opacity:.55}.pitem.lock{opacity:.5;filter:grayscale(.7)}.pitem.on{border-color:#f06595;background:#fff0f6}.pitem.on em{color:#2b8a3e}
  .pitem .isvg{width:100%;height:3.6rem;object-fit:contain}
  .pgrid.cols{grid-template-columns:repeat(auto-fill,minmax(5.6rem,1fr))}
  .pcol{background:#fff;border:3px solid #f1f3f5;border-radius:16px;padding:.4rem .2rem;display:flex;flex-direction:column;align-items:center;font-family:inherit}
  .pcol i{width:2.4rem;height:2.4rem;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,var(--m) 55%);border:3px solid #fff;box-shadow:0 0 0 2px var(--m);font-style:normal;display:flex;align-items:center;justify-content:center}
  .pcol small{font-size:.85rem;font-weight:800;color:#666;margin-top:.15rem}.pcol em{font-style:normal;font-size:.85rem;font-weight:900;color:#e67700}
  .pcol.on{border-color:#f06595}.pcol.lock{opacity:.45}
  .pgrid.rooms{grid-template-columns:repeat(auto-fill,minmax(8.4rem,1fr))}
  .proomb{background:#fff;border:3px solid #f1f3f5;border-radius:16px;padding:.35rem;display:flex;flex-direction:column;align-items:center;font-family:inherit}
  .proomb .prv{position:relative;display:block;width:100%;aspect-ratio:400/260;border-radius:10px;overflow:hidden}.proomb .prv .proom{position:absolute;inset:0;width:100%;height:100%}
  .proomb b{font-size:1rem;color:#444;margin-top:.2rem}.proomb em{font-style:normal;font-size:.9rem;font-weight:900;color:#e67700}.proomb.on{border-color:#f06595}.proomb.on em{color:#2b8a3e}.proomb.lock{opacity:.5;filter:grayscale(.6)}
  .pcls{display:grid;grid-template-columns:repeat(auto-fill,minmax(7.4rem,1fr));gap:.6rem}
  .pcls button{background:linear-gradient(180deg,#fff,#fff4e6);border:0;border-radius:18px;box-shadow:0 4px 0 #f1e3cf;padding:.4rem .3rem .5rem;display:flex;flex-direction:column;align-items:center;font-family:inherit}
  .pcls .pa{width:5.6rem;height:5.6rem}.pcls b{font-size:1.05rem;color:#d6336c}.pcls small{font-size:.85rem;color:#888;font-weight:800}
  .pcls.mine button.on{box-shadow:0 0 0 3px #f06595,0 4px 0 #f1e3cf}.pcls em{font-style:normal;font-size:.85rem;font-weight:900;color:#2b8a3e}
  .peggs{display:flex;gap:.6rem;flex-wrap:wrap}
  .pegg{background:#fffbea;border:3px solid #ffe8a3;border-radius:18px;padding:.4rem .6rem;display:flex;flex-direction:column;align-items:center;font-family:inherit;min-width:7rem}
  .pegg .pev{display:block;width:4.6rem;height:4.6rem}.pegg b{font-size:1.05rem;color:#555}.pegg small{font-size:.85rem;font-weight:900;color:#e67700}
  .pegg.ready{border-color:#fcc419;box-shadow:0 0 14px #ffe066}.pegg.t1{background:#f8f0ff;border-color:#d0bfff}.pegg.t2{background:#fff9db;border-color:#ffd43b}
  .pdxh{font-size:1.05rem;font-weight:900;color:#868e96;margin:.6rem 0 .35rem}.pdxh small{font-size:.85rem;color:#aaa;margin-left:.4rem}.pdxh.r1{color:#7950f2}.pdxh.r2{color:#e8590c}
  .pdex{display:grid;grid-template-columns:repeat(auto-fill,minmax(7.6rem,1fr));gap:.5rem}
  .pdx{background:#f8f9fa;border-radius:16px;padding:.35rem .3rem .5rem;display:flex;flex-direction:column;align-items:center;text-align:center}
  .pdx .pa{width:5rem;height:5rem}.pdx b{font-size:1rem;color:#adb5bd}.pdx.has{background:linear-gradient(180deg,#fff,#fff4e6);box-shadow:0 3px 0 #f1e3cf}.pdx.has b{color:#d6336c}
  .pdx.r1.has{background:linear-gradient(180deg,#fff,#f3f0ff)}.pdx.r2.has{background:linear-gradient(180deg,#fff,#fff3bf)}
  .pdx small{font-size:.72rem;color:#999;font-weight:800}.pdx span{font-size:.78rem;color:#868e96;font-weight:800;line-height:1.3}.pdx span i{display:block;font-style:normal;color:#e67700}
  .phow{margin-top:.9rem;font-size:1rem;color:#888;font-weight:800;text-align:center}
  .pgo2{display:block;margin:.9rem auto 0;font-size:1.4rem}
  .pmod{position:fixed;inset:0;background:rgba(40,20,60,.45);z-index:50;display:flex;align-items:center;justify-content:center;padding:1rem;animation:fade .25s}
  .pmod.pask{z-index:55}
  .pmc{background:#fff;border-radius:28px;padding:1.2rem;max-width:42rem;width:100%;max-height:92vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.25);text-align:center}
  .pask .pmc{max-width:26rem}.pmh2{font-size:1.3rem;font-weight:900;color:#444;margin-bottom:.8rem}.pmh2 small{display:block;font-size:.95rem;color:#888;margin-top:.3rem}
  .paski .isvg{width:7rem;height:5rem;object-fit:contain}.paskp{width:8rem;height:8rem;margin:0 auto .4rem}
  .pbtns{display:flex;gap:.6rem;justify-content:center}.pbtns .go{margin:0;font-size:1.3rem}.pbtns .pmx{margin:0}
  .pmh{font-size:1.6rem;font-weight:900;color:#d6336c;margin-bottom:.8rem}.pmh small{font-size:1rem;color:#999}
  .pspg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.6rem}
  .pspg button{background:linear-gradient(180deg,#fff,#fff0f6);border:3px solid #ffdeeb;border-radius:20px;padding:.4rem .25rem;font-family:inherit;display:flex;flex-direction:column;align-items:center}
  .pspg .pa{width:6.4rem;height:6.4rem}.pspg b{font-size:1.15rem;color:#555}.pspg small{font-size:.72rem;color:#999;font-weight:800}
  .pspg button:active,.png button:active{transform:scale(.95)}
  .pnow{width:9rem;height:9rem;margin:0 auto .6rem}.pnow.vis{width:12rem;height:12rem}
  .png{display:grid;grid-template-columns:repeat(auto-fill,minmax(5.4rem,1fr));gap:.45rem;margin-bottom:.8rem}
  .png button{background:#fff9db;border:3px solid #ffe066;border-radius:14px;padding:.45rem .2rem;font-size:1.15rem;font-weight:900;color:#e67700;font-family:inherit}.png button.on{background:#ffe066}
  .pstk{display:flex;justify-content:center;gap:.6rem;margin:.4rem 0 1rem;flex-wrap:wrap}.pstk button{font-size:2.4rem;background:#fff0f6;border:3px solid #ffdeeb;border-radius:18px;padding:.3rem .7rem}
  .pdone{font-size:1.2rem;font-weight:900;color:#2b8a3e}
  .pmx{font-size:1.1rem;border:0;background:#e9ecef;border-radius:14px;padding:.5rem 1.6rem;font-weight:900;color:#555;font-family:inherit;margin-top:.3rem}
  .pmod.evo{background:radial-gradient(circle,#3b2a7a,#140d33)}.pmod.evo .pmc{background:transparent;box-shadow:none;color:#fff}
  .pevo .pmh{color:#fff3bf}.pevs{position:relative;width:min(16rem,70vw);height:min(16rem,70vw);margin:1rem auto}
  .pevs>div{position:absolute;inset:0}.pev0{animation:pev0 3.3s forwards}.pev1{opacity:0;filter:brightness(0) invert(1);animation:pev1 3.3s forwards}
  @keyframes pev0{0%{filter:none}18%{filter:brightness(0) invert(1)}30%,46%,62%,74%,84%,90%{opacity:1;filter:brightness(0) invert(1)}38%,54%,68%,79%,87%,93%,100%{opacity:0;filter:brightness(0) invert(1)}}
  @keyframes pev1{0%,30%,46%,62%,74%,84%,90%{opacity:0}38%,54%,68%,79%,87%,93%,99%{opacity:1}100%{opacity:1}}
  .pevs.done .pev0{display:none}.pevs.done .pev1{animation:pev2 .9s forwards}@keyframes pev2{0%{opacity:1;filter:brightness(0) invert(1)}100%{opacity:1;filter:none}}
  .pevl,.pevu{position:absolute;inset:-30%;background:center/contain no-repeat;opacity:0;pointer-events:none}.pevs.done .pevl{animation:pevl 1.1s ease-out}.pevs.done .pevu{animation:pevu 1.6s ease-out .2s}
  .pev0{animation:pev0 3.3s forwards}.pevs:not(.done) .pevl{animation:pevg 3.3s ease-in forwards}@keyframes pevg{0%{opacity:0;transform:scale(.4) rotate(0)}100%{opacity:.75;transform:scale(1) rotate(90deg)}}
  @keyframes pevu{0%{opacity:0;transform:scale(.5) rotate(0)}30%{opacity:1}100%{opacity:0;transform:scale(1.3) rotate(40deg)}}
  @keyframes pevl{0%{opacity:1;transform:scale(.3)}100%{opacity:0;transform:scale(1.4)}}
  .pevt{font-size:1.5rem;font-weight:900;color:#fff;min-height:3.4rem}.pevt b{color:#ffe066}.pevt small{display:block;font-size:1rem;color:#d0bfff;margin-top:.3rem}
  .petend{color:#e67700}.pboost{display:block;font-size:.95rem;color:#f08c00;margin-top:.2rem}
  @media (max-width:700px){.pacts{grid-template-columns:repeat(3,minmax(0,1fr))}.pstage{height:min(22rem,48vh)}.pstage .ppet{height:calc(100% - 8.2rem)}.pbub{font-size:1rem;top:4.6rem}.ptag b{font-size:1.2rem}.pcoin{font-size:1.1rem}
    .pspg{grid-template-columns:repeat(2,minmax(0,1fr))}.pspg .pa{width:5.4rem;height:5.4rem}.ptabs button{font-size:1rem;padding:.6rem .15rem}.pdex{grid-template-columns:repeat(auto-fill,minmax(6.6rem,1fr))}}`;
  const S = document.createElement('style'); S.textContent = css + `
  @media (max-height:520px) and (min-width:600px){.pstage{height:min(22rem,80vh)}.pstage .ppet{height:calc(100% - 4.2rem)}.pbub{top:.9rem;font-size:1rem;max-width:min(20rem,44%)}}`; document.head.appendChild(S);

  window.PET = { night: () => night(), petSVG, petArt, eggSVG, itemSVG, SPECIES, ITEMS, XS, ROOMS, FOODS, NAMES, STICKERS, lvOf, stageOf, formName, cum, xpNeed, MAXLV, EVO, gain, note, endMsg, homeCard, page, P, fullNow, joyNow, moodOf, look, pub, refresh, closeModal, patJoy, feedCrop, cropFood, nameOf, showEvo, checkAch, _set: (k, v) => { if (k === 'night') night.f = v; } };
})();
