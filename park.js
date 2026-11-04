/* 601 全班樂園（第二期）
   ・每個人有一座 8 × 8、最高 6 層的方塊島：像堆積木一樣疊方塊（草地、石頭、木頭、磚塊、玻璃、水、彩色積木、金塊…），
     上面再擺樹、花、房子、遊樂設施；可以轉方向看。基本方塊免費，漂亮的方塊和裝飾用金幣買（跟寵物同一個錢包）；寵物會在島上散步
   ・樂園地圖：看全班的花園、點進去參觀、送貼圖（跟寵物的貼圖同一個，一天一次）
   ・中央公園：全班一起捐金幣，依序蓋出噴水池、花園步道、溜滑梯、摩天輪、城堡、彩虹橋
   ・打倒魔王領過獎的人，可以在花園放「魔王獎盃」
   雲端：自己的島 learn/park/plot/座號 = {v:384 個字(64 格 × 6 層的方塊), d:64 個字(每格上面的裝飾), t}；捐款 learn/park/fund/座號 = {s:累計捐了幾枚, t}
   自己的資料存在 sum.park = {v, d, bag:{東西:幾個}, fund}（跟著摘要同步） */
(function () {
  const N = 8, T = 40, CELLS = N * N;
  /* 方塊：c＝存檔用的一個字，t/l/r＝上面、左面、右面的顏色，e＝邊線，a＝透明度，p＝價錢（0＝免費），lv＝寵物要幾級 */
  const BLOCKS = {
    grass: { c: 'G', n: '草地', k: 'grass', t: '#8ce99a', l: '#c98b4b', r: '#a8703a', e: '#5c3d1e', p: 0, lv: 1 },
    dirt: { c: 'D', n: '泥土', k: 'dirt', t: '#d9a066', l: '#c08850', r: '#a8703a', e: '#7a4f22', p: 0, lv: 1 },
    stone: { c: 'S', n: '石頭', k: 'stone', t: '#dee2e6', l: '#c4c9cf', r: '#adb5bd', e: '#6c757d', p: 0, lv: 1 },
    sand: { c: 'A', n: '沙子', k: 'sand', t: '#fff0b3', l: '#f5dc8a', r: '#e8c96c', e: '#c9a227', p: 0, lv: 1 },
    wood: { c: 'W', n: '木頭', k: 'wood', t: '#f2c48d', l: '#dfa56a', r: '#c98b4b', e: '#7a4f22', p: 1, lv: 1 },
    leaf: { c: 'F', n: '樹葉', k: 'leaf', t: '#69db7c', l: '#51cf66', r: '#40c057', e: '#2b8a3e', p: 1, lv: 1 },
    snow: { c: 'N', n: '雪', k: 'snow', t: '#ffffff', l: '#eef2f7', r: '#dde4ee', e: '#adb5bd', p: 1, lv: 2 },
    brick: { c: 'B', n: '磚塊', k: 'brick', t: '#ff8787', l: '#f06a6a', r: '#d94f4f', e: '#a51111', p: 2, lv: 2 },
    water: { c: 'Q', n: '水', k: 'water', t: '#a5d8ff', l: '#74c0fc', r: '#4dabf7', e: '#1c7ed6', p: 2, lv: 2, a: .82 },
    glass: { c: 'L', n: '玻璃', k: 'glass', t: '#e7f5ff', l: '#d0ebff', r: '#bfe0ff', e: '#74c0fc', p: 2, lv: 3, a: .6 },
    pink: { c: 'P', n: '粉紅積木', k: 'toy', t: '#ffc9de', l: '#faa2c1', r: '#f783ac', e: '#d6336c', p: 2, lv: 3 },
    yellow: { c: 'Y', n: '黃色積木', k: 'toy', t: '#fff3bf', l: '#ffe066', r: '#fcc419', e: '#e67700', p: 2, lv: 3 },
    sky: { c: 'K', n: '藍色積木', k: 'toy', t: '#d0ebff', l: '#a5d8ff', r: '#74c0fc', e: '#1971c2', p: 2, lv: 4 },
    purple: { c: 'V', n: '紫色積木', k: 'toy', t: '#e5dbff', l: '#d0bfff', r: '#b197fc', e: '#6741d9', p: 2, lv: 4 },
    orange: { c: 'R', n: '橘色積木', k: 'toy', t: '#ffe8cc', l: '#ffc078', r: '#ffa94d', e: '#d9480f', p: 2, lv: 5 },
    ice: { c: 'I', n: '冰塊', k: 'ice', t: '#e3fafc', l: '#c5f6fa', r: '#99e9f2', e: '#1098ad', p: 3, lv: 6, a: .85 },
    gold: { c: 'O', n: '金塊', k: 'gold', t: '#ffe066', l: '#fcc419', r: '#f59f00', e: '#b35c00', p: 10, lv: 8 }
  };
  const BY_BLOCK = {}; Object.entries(BLOCKS).forEach(([k, b]) => BY_BLOCK[b.c] = k);
  /* 物品：code＝存檔用的一個字，lv＝寵物要幾級，p＝價錢，cat＝分類 */
  const OBJ = {
    tree: { c: '1', n: '大樹', p: 5, lv: 1, cat: 'plant' }, pine: { c: '2', n: '松樹', p: 6, lv: 1, cat: 'plant' }, bush: { c: '3', n: '小草叢', p: 3, lv: 1, cat: 'plant' },
    flower: { c: '4', n: '花叢', p: 2, lv: 1, cat: 'plant' }, sunflower: { c: '5', n: '向日葵', p: 4, lv: 2, cat: 'plant' }, mushroom: { c: '6', n: '蘑菇', p: 4, lv: 2, cat: 'plant' },
    sakura: { c: '7', n: '櫻花樹', p: 12, lv: 4, cat: 'plant' }, rock: { c: '8', n: '石頭', p: 2, lv: 1, cat: 'plant' }, pumpkin: { c: '9', n: '南瓜', p: 5, lv: 3, cat: 'plant' },
    bench: { c: 'g', n: '長椅', p: 6, lv: 1, cat: 'fun' }, lamp: { c: 'h', n: '路燈', p: 6, lv: 2, cat: 'fun' }, mailbox: { c: 'i', n: '信箱', p: 5, lv: 1, cat: 'fun' },
    balloon: { c: 'j', n: '氣球', p: 8, lv: 2, cat: 'fun' }, snowman: { c: 'k', n: '雪人', p: 10, lv: 3, cat: 'fun' }, swing: { c: 'l', n: '盪鞦韆', p: 15, lv: 3, cat: 'fun' },
    sandbox: { c: 'm', n: '沙坑', p: 12, lv: 3, cat: 'fun' }, slide: { c: 'n', n: '溜滑梯', p: 20, lv: 4, cat: 'fun' }, fountain: { c: 'o', n: '噴水池', p: 30, lv: 6, cat: 'fun' },
    tent: { c: 'p', n: '帳篷', p: 15, lv: 2, cat: 'house' }, house: { c: 'q', n: '小木屋', p: 40, lv: 3, cat: 'house' }, bighouse: { c: 'r', n: '兩層樓房子', p: 80, lv: 6, cat: 'house' },
    windmill: { c: 's', n: '風車', p: 60, lv: 7, cat: 'house' }, castle: { c: 't', n: '城堡', p: 150, lv: 10, cat: 'house' },
    trophy: { c: 'u', n: '魔王獎盃', p: 0, lv: 1, cat: 'house', boss: 1 }
  };
  const BY_CODE = {}; Object.entries(OBJ).forEach(([k, o]) => BY_CODE[o.c] = k);
  /* 中央公園：全班捐款到這個數字就蓋好 */
  const FUND = [
    { k: 'fountain', n: '噴水池', s: 300 }, { k: 'garden', n: '花園步道', s: 800 }, { k: 'slide', n: '大溜滑梯', s: 1500 },
    { k: 'wheel', n: '摩天輪', s: 3000 }, { k: 'castle', n: '夢幻城堡', s: 5000 }, { k: 'rainbow', n: '彩虹橋', s: 8000 }
  ];

  /* ───────── 畫物品（原點＝格子底部中間，往上是負的） ───────── */
  const sh = (rx = 22) => `<ellipse cx="0" cy="-3" rx="${rx}" ry="6" fill="#000" opacity=".14"/>`;
  const L = 'stroke-linejoin="round" stroke-linecap="round"';
  function sprite(k) {
    switch (k) {
      case 'tree': return sh() + `<rect x="-5" y="-30" width="10" height="28" rx="3" fill="#a8743a" stroke="#7a4f22" stroke-width="2.5"/><g stroke="#2f9e44" stroke-width="2.5"><circle cx="-12" cy="-36" r="14" fill="#51cf66"/><circle cx="12" cy="-36" r="14" fill="#51cf66"/><circle cx="0" cy="-48" r="17" fill="#69db7c"/></g><circle cx="-6" cy="-54" r="5" fill="#fff" opacity=".4"/><circle cx="8" cy="-40" r="2.5" fill="#ff6b6b"/><circle cx="-10" cy="-32" r="2.5" fill="#ff6b6b"/>`;
      case 'pine': return sh(18) + `<rect x="-4" y="-16" width="8" height="14" fill="#a8743a" stroke="#7a4f22" stroke-width="2"/><g fill="#2f9e44" stroke="#1b7a33" stroke-width="2.5" ${L}><path d="M-20 -14 L0 -40 L20 -14Z"/><path d="M-16 -32 L0 -56 L16 -32Z"/><path d="M-11 -48 L0 -68 L11 -48Z"/></g><circle cx="-5" cy="-52" r="2.5" fill="#fff" opacity=".5"/>`;
      case 'bush': return sh(20) + `<g fill="#69db7c" stroke="#2f9e44" stroke-width="2.5"><circle cx="-11" cy="-11" r="10"/><circle cx="11" cy="-11" r="10"/><circle cx="0" cy="-17" r="12"/></g><circle cx="-4" cy="-22" r="3" fill="#fff" opacity=".45"/>`;
      case 'flower': return sh(18) + `<path d="M-10 -4 V-18 M0 -4 V-24 M10 -4 V-16" stroke="#2f9e44" stroke-width="3"/>${[[-10, -20, '#ff8fab'], [0, -27, '#ffd43b'], [10, -18, '#b197fc']].map(([x, y, c]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map(a => `<circle cx="${5 * Math.cos(a * Math.PI / 180)}" cy="${5 * Math.sin(a * Math.PI / 180)}" r="4" fill="${c}"/>`).join('')}<circle r="3" fill="#fff3bf"/></g>`).join('')}`;
      case 'sunflower': return sh(14) + `<path d="M0 -4 V-40 M0 -20 Q-12 -26 -14 -18 Q-6 -16 0 -20" stroke="#2f9e44" stroke-width="3.5" fill="#69db7c"/><g transform="translate(0 -46)">${[...Array(12)].map((_, i) => `<ellipse cx="0" cy="-12" rx="4.5" ry="8" fill="#ffd43b" stroke="#f59f00" stroke-width="1.5" transform="rotate(${i * 30})"/>`).join('')}<circle r="8" fill="#8a5a2b"/><circle cx="-2" cy="-2" r="2" fill="#c08850"/></g>`;
      case 'mushroom': return sh(16) + `<path d="M-7 -4 Q-8 -18 -6 -20 H6 Q8 -18 7 -4Z" fill="#fff4e6" stroke="#c9a27a" stroke-width="2.5"/><path d="M-20 -18 Q-20 -40 0 -40 Q20 -40 20 -18Z" fill="#ff6b6b" stroke="#c92a2a" stroke-width="2.5"/><circle cx="-9" cy="-28" r="4" fill="#fff"/><circle cx="6" cy="-33" r="3.5" fill="#fff"/><circle cx="10" cy="-23" r="3" fill="#fff"/>`;
      case 'sakura': return sh() + `<path d="M-4 -2 Q-6 -24 -2 -34 M2 -2 Q4 -24 0 -34 M-2 -28 L-14 -38 M1 -30 L12 -40" stroke="#8a5a2b" stroke-width="5" fill="none" stroke-linecap="round"/><g fill="#ffc9de" stroke="#f783ac" stroke-width="2.5"><circle cx="-15" cy="-42" r="13"/><circle cx="14" cy="-44" r="13"/><circle cx="0" cy="-54" r="16"/><circle cx="-3" cy="-38" r="10"/></g><g fill="#fff">${[[-10, -48], [6, -58], [16, -40], [-18, -38], [2, -44]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`).join('')}</g><circle cx="-12" cy="-6" r="2.5" fill="#ffc9de"/><circle cx="14" cy="-4" r="2" fill="#ffc9de"/>`;
      case 'rock': return sh(18) + `<path d="M-18 -4 Q-20 -16 -10 -20 Q-2 -26 8 -20 Q20 -18 18 -4Z" fill="#ced4da" stroke="#868e96" stroke-width="2.5" ${L}/><path d="M-8 -16 Q-2 -20 4 -17" stroke="#fff" stroke-width="2.5" fill="none" opacity=".7" stroke-linecap="round"/>`;
      case 'pumpkin': return sh(18) + `<g stroke="#d9480f" stroke-width="2.5"><ellipse cx="-8" cy="-14" rx="9" ry="12" fill="#ff922b"/><ellipse cx="8" cy="-14" rx="9" ry="12" fill="#ff922b"/><ellipse cx="0" cy="-14" rx="9" ry="13" fill="#ffa94d"/></g><path d="M0 -26 Q2 -34 7 -34" stroke="#2f9e44" stroke-width="4" fill="none" stroke-linecap="round"/>`;
      case 'bench': return sh(24) + `<g stroke="#7a4f22" stroke-width="2.5"><rect x="-22" y="-30" width="44" height="7" rx="3" fill="#d9a066"/><rect x="-22" y="-20" width="44" height="7" rx="3" fill="#e0ad73"/></g><path d="M-16 -13 V-2 M16 -13 V-2 M-16 -30 V-34 M16 -30 V-34" stroke="#495057" stroke-width="4" stroke-linecap="round"/>`;
      case 'lamp': return sh(10) + `<circle cx="0" cy="-58" r="14" fill="#ffe066" opacity=".35"/><path d="M0 -2 V-50" stroke="#495057" stroke-width="5" stroke-linecap="round"/><rect x="-9" y="-64" width="18" height="16" rx="5" fill="#fff3bf" stroke="#495057" stroke-width="3"/><path d="M-11 -64 L0 -72 L11 -64Z" fill="#495057"/><rect x="-7" y="-4" width="14" height="4" rx="2" fill="#495057"/>`;
      case 'mailbox': return sh(12) + `<path d="M0 -2 V-26" stroke="#a8743a" stroke-width="6"/><path d="M-12 -24 V-40 Q-12 -48 0 -48 Q12 -48 12 -40 V-24Z" fill="#ff6b6b" stroke="#c92a2a" stroke-width="2.5"/><path d="M12 -44 V-54 H20 V-48 H12" fill="#ffd43b" stroke="#e67700" stroke-width="2"/><rect x="-7" y="-36" width="14" height="3" rx="1.5" fill="#a51111"/>`;
      case 'balloon': return sh(10) + `<path d="M0 -2 Q-6 -20 -10 -40 M0 -2 Q2 -22 2 -46 M0 -2 Q8 -20 12 -38" stroke="#868e96" stroke-width="1.5" fill="none"/><ellipse cx="-11" cy="-48" rx="9" ry="11" fill="#ff8787" stroke="#e03131" stroke-width="2"/><ellipse cx="13" cy="-46" rx="9" ry="11" fill="#74c0fc" stroke="#1c7ed6" stroke-width="2"/><ellipse cx="2" cy="-58" rx="10" ry="12" fill="#ffd43b" stroke="#f59f00" stroke-width="2"/><circle cx="-1" cy="-62" r="3" fill="#fff" opacity=".7"/>`;
      case 'snowman': return sh(18) + `<circle cx="0" cy="-16" r="15" fill="#fff" stroke="#adb5bd" stroke-width="2.5"/><circle cx="0" cy="-40" r="11" fill="#fff" stroke="#adb5bd" stroke-width="2.5"/><rect x="-9" y="-62" width="18" height="12" rx="2" fill="#343a40"/><rect x="-13" y="-52" width="26" height="4" rx="2" fill="#343a40"/><circle cx="-4" cy="-42" r="1.8" fill="#222"/><circle cx="4" cy="-42" r="1.8" fill="#222"/><path d="M0 -38 L9 -36 L0 -35Z" fill="#ff922b"/><path d="M-10 -30 Q0 -26 10 -30" stroke="#e03131" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="0" cy="-18" r="2" fill="#343a40"/><circle cx="0" cy="-10" r="2" fill="#343a40"/>`;
      case 'swing': return sh(26) + `<path d="M-24 -2 L-16 -56 M24 -2 L16 -56 M-18 -54 H18" stroke="#e03131" stroke-width="5" stroke-linecap="round" fill="none"/><g transform="translate(0 -54)"><g class="swg"><path d="M-8 0 V36 M8 0 V36" stroke="#868e96" stroke-width="2"/><rect x="-11" y="34" width="22" height="5" rx="2" fill="#ffd43b" stroke="#e67700" stroke-width="2"/></g></g>`;
      case 'sandbox': return sh(28) + `<rect x="-26" y="-20" width="52" height="18" rx="4" fill="#d9a066" stroke="#7a4f22" stroke-width="2.5"/><path d="M-22 -16 Q-8 -22 4 -16 Q16 -12 22 -16 V-6 H-22Z" fill="#ffe8a1"/><path d="M8 -18 L12 -30 H20 L22 -18Z" fill="#4dabf7" stroke="#1c7ed6" stroke-width="2"/><path d="M-12 -18 L-4 -28" stroke="#ff6b6b" stroke-width="3" stroke-linecap="round"/>`;
      case 'slide': return sh(26) + `<path d="M-18 -2 V-56 M-6 -2 V-56" stroke="#4dabf7" stroke-width="4" stroke-linecap="round"/><path d="M-18 -14 H-6 M-18 -26 H-6 M-18 -38 H-6 M-18 -50 H-6" stroke="#1c7ed6" stroke-width="3"/><rect x="-20" y="-60" width="16" height="6" rx="2" fill="#ff922b"/><path d="M-6 -58 Q4 -56 10 -34 Q16 -10 28 -4 L22 4 Q8 -4 2 -28 Q-2 -46 -8 -50Z" fill="#ff8787" stroke="#e03131" stroke-width="2.5" ${L}/>`;
      case 'fountain': return sh(28) + `<ellipse cx="0" cy="-10" rx="27" ry="9" fill="#a5d8ff" stroke="#4dabf7" stroke-width="2.5"/><path d="M-27 -10 V-4 Q0 8 27 -4 V-10" fill="#dee2e6" stroke="#868e96" stroke-width="2.5"/><rect x="-4" y="-34" width="8" height="24" fill="#dee2e6" stroke="#868e96" stroke-width="2"/><ellipse cx="0" cy="-34" rx="12" ry="4" fill="#a5d8ff" stroke="#4dabf7" stroke-width="2"/><g class="fwt" stroke="#74c0fc" stroke-width="3" fill="none" stroke-linecap="round"><path d="M0 -36 Q-2 -52 -12 -44"/><path d="M0 -36 Q2 -54 12 -44"/><path d="M0 -36 V-56"/></g>`;
      case 'tent': return sh(26) + `<path d="M-26 -2 L0 -46 L26 -2Z" fill="#ffd43b" stroke="#e67700" stroke-width="2.5" ${L}/><path d="M-13 -24 L0 -46 L13 -24" stroke="#ff922b" stroke-width="5" fill="none"/><path d="M-8 -2 L0 -22 L8 -2Z" fill="#a8743a"/><path d="M0 -46 V-56 L10 -52 L0 -49" fill="#ff6b6b" stroke="#c92a2a" stroke-width="1.5"/>`;
      case 'house': return sh(28) + `<rect x="-24" y="-38" width="48" height="36" rx="3" fill="#fff4e6" stroke="#c9a27a" stroke-width="2.5"/><path d="M-30 -36 L0 -62 L30 -36Z" fill="#ff6b6b" stroke="#c92a2a" stroke-width="2.5" ${L}/><rect x="-6" y="-22" width="12" height="20" rx="2" fill="#a8743a" stroke="#7a4f22" stroke-width="2"/><circle cx="3" cy="-12" r="1.5" fill="#ffd43b"/><rect x="-19" y="-30" width="10" height="9" rx="1.5" fill="#a5d8ff" stroke="#c9a27a" stroke-width="2"/><rect x="9" y="-30" width="10" height="9" rx="1.5" fill="#a5d8ff" stroke="#c9a27a" stroke-width="2"/><rect x="12" y="-62" width="7" height="14" fill="#adb5bd" stroke="#868e96" stroke-width="2"/>`;
      case 'bighouse': return sh(29) + `<rect x="-26" y="-66" width="52" height="64" rx="3" fill="#e7f5ff" stroke="#74c0fc" stroke-width="2.5"/><path d="M-32 -64 L0 -92 L32 -64Z" fill="#4dabf7" stroke="#1c7ed6" stroke-width="2.5" ${L}/><path d="M-26 -34 H26" stroke="#74c0fc" stroke-width="2.5"/><rect x="-7" y="-24" width="14" height="22" rx="2" fill="#ff922b" stroke="#d9480f" stroke-width="2"/>${[[-20, -58], [8, -58], [-20, -28], [12, -28]].map(([x, y]) => `<rect x="${x}" y="${y}" width="${x === 12 ? 8 : 12}" height="10" rx="1.5" fill="#fff9db" stroke="#74c0fc" stroke-width="2"/>`).join('')}<circle cx="0" cy="-76" r="5" fill="#fff9db" stroke="#1c7ed6" stroke-width="2"/>`;
      case 'windmill': return sh(22) + `<path d="M-16 -2 L-9 -62 H9 L16 -2Z" fill="#fff4e6" stroke="#c9a27a" stroke-width="2.5" ${L}/><path d="M-12 -66 L0 -80 L12 -66Z" fill="#e03131" stroke="#a51111" stroke-width="2.5"/><rect x="-5" y="-18" width="10" height="16" rx="5" fill="#a8743a"/><g transform="translate(0 -62)"><g class="wml"><g fill="#fff" stroke="#868e96" stroke-width="2">${[0, 90, 180, 270].map(a => `<path d="M0 0 L-5 -34 H5Z" transform="rotate(${a})"/>`).join('')}</g></g><circle r="5" fill="#495057"/></g>`;
      case 'castle': return sh(30) + `<rect x="-22" y="-56" width="44" height="54" fill="#ffdeeb" stroke="#e64980" stroke-width="2.5"/>${[-28, 16].map(x => `<rect x="${x}" y="-78" width="12" height="76" fill="#fcc2d7" stroke="#e64980" stroke-width="2.5"/><path d="M${x - 3} -76 L${x + 6} -94 L${x + 15} -76Z" fill="#b197fc" stroke="#7048e8" stroke-width="2.5" ${L}/><path d="M${x + 6} -94 V-104 L${x + 14} -100 L${x + 6} -97" fill="#ffd43b" stroke="#e67700" stroke-width="1.5"/>`).join('')}<path d="M-22 -56 v-6 h7 v6 h7 v-6 h8 v6 h7 v-6 h7 v6 h8 v-6" fill="none" stroke="#e64980" stroke-width="2.5"/><path d="M-9 -2 V-22 Q0 -32 9 -22 V-2Z" fill="#a8743a" stroke="#7a4f22" stroke-width="2"/><circle cx="0" cy="-42" r="6" fill="#a5d8ff" stroke="#e64980" stroke-width="2"/>`;
      case 'wheel': return sh(30) + `<path d="M-4 -2 L0 -58 L4 -2Z M-26 -2 L0 -58 M26 -2 L0 -58" stroke="#868e96" stroke-width="3.5" fill="none"/><g transform="translate(0 -58)"><g class="wml"><circle r="40" fill="none" stroke="#ff8787" stroke-width="4"/>${[...Array(8)].map((_, i) => { const a = i * Math.PI / 4; return `<path d="M0 0 L${(40 * Math.cos(a)).toFixed(1)} ${(40 * Math.sin(a)).toFixed(1)}" stroke="#ffa8a8" stroke-width="2"/><rect x="${(40 * Math.cos(a) - 7).toFixed(1)}" y="${(40 * Math.sin(a) - 5).toFixed(1)}" width="14" height="10" rx="3" fill="${['#ffd43b', '#74c0fc', '#69db7c', '#b197fc'][i % 4]}" stroke="#495057" stroke-width="1.5"/>`; }).join('')}</g><circle r="6" fill="#495057"/></g>`;
      case 'rainbow': return `${['#ff8787', '#ffd43b', '#69db7c', '#74c0fc', '#b197fc'].map((c, i) => `<path d="M${-60 + i * 7} 0 A${60 - i * 7} ${54 - i * 7} 0 0 1 ${60 - i * 7} 0" fill="none" stroke="${c}" stroke-width="7" opacity=".85"/>`).join('')}<g fill="#fff"><circle cx="-58" cy="-2" r="9"/><circle cx="-48" cy="0" r="7"/><circle cx="58" cy="-2" r="9"/><circle cx="48" cy="0" r="7"/></g>`;
      case 'trophy': return sh(18) + `<rect x="-16" y="-14" width="32" height="12" rx="3" fill="#a8743a" stroke="#7a4f22" stroke-width="2.5"/><path d="M-6 -14 V-22 H6 V-14" fill="#ffd43b" stroke="#e67700" stroke-width="2"/><path d="M-16 -50 H16 Q16 -24 0 -22 Q-16 -24 -16 -50Z" fill="#ffd43b" stroke="#e67700" stroke-width="2.5"/><path d="M-16 -46 Q-26 -46 -24 -36 Q-22 -30 -14 -32 M16 -46 Q26 -46 24 -36 Q22 -30 14 -32" stroke="#e67700" stroke-width="3" fill="none"/><path d="M-8 -44 Q-8 -32 -2 -28" stroke="#fff" stroke-width="3" fill="none" opacity=".6" stroke-linecap="round"/><text x="0" y="-33" text-anchor="middle" font-size="12">⭐</text>`;
    }
    return '';
  }
  /* ───────── 方塊島（斜角立體） ─────────
     島上 8 × 8 格、最高 6 層。v＝每一格由下往上 6 個字（方塊代號或 .）；d＝每一格最上面放的裝飾（物品代號或 .）
     畫法：方格座標 (x,y,z) → 畫面 ((x−y)·IA, (x+y)·IB − z·HC)；從後面畫到前面，被擋住的面不畫 */
  const IA = .6, IB = .3, HC = 25, DEPTH = 30;
  const P3 = (x, y, z) => [((x - y) * IA).toFixed(1), ((x + y) * IB - z * HC).toFixed(1)];
  const poly = pts => pts.map(p => p.join(',')).join(' ');
  /* 島上的格子（0～63）在畫面上轉了幾次 90 度 */
  const rotTo = (i, rot) => { let c = i % N, r = (i / N) | 0; for (let k = 0; k < rot; k++) [c, r] = [N - 1 - r, c]; return [c, r]; };
  const rotFrom = (c, r, rot) => { for (let k = 0; k < rot; k++) [c, r] = [r, N - 1 - c]; return r * N + c; };
  const colOf = (v, i) => v.slice(i * H, i * H + H);
  const topZ = (v, i) => { const s = colOf(v, i); let z = H; while (z > 0 && s[z - 1] === '.') z--; return z; };   // 最上面方塊的上面是第幾層
  function cube(code, x, y, z, faces, data) {
    const B = BLOCKS[BY_BLOCK[code]], o = [], op = B.a ? ` opacity="${B.a}"` : '';
    const t = [P3(x, y, z + 1), P3(x + T, y, z + 1), P3(x + T, y + T, z + 1), P3(x, y + T, z + 1)];
    const fl = [P3(x, y + T, z + 1), P3(x + T, y + T, z + 1), P3(x + T, y + T, z), P3(x, y + T, z)];   // 左前面
    const fr = [P3(x + T, y, z + 1), P3(x + T, y + T, z + 1), P3(x + T, y + T, z), P3(x + T, y, z)];   // 右前面
    const ln = `stroke="${B.e}" stroke-width="1.2" stroke-linejoin="round"`;
    if (faces.l) o.push(`<polygon points="${poly(fl)}" fill="${B.l}" ${ln}${op} data-f="l" ${data}/>${pat(B, fl, 'l')}`);
    if (faces.r) o.push(`<polygon points="${poly(fr)}" fill="${B.r}" ${ln}${op} data-f="r" ${data}/>${pat(B, fr, 'r')}`);
    if (faces.t) o.push(`<polygon points="${poly(t)}" fill="${B.t}" ${ln}${op} data-f="t" ${data}/>${pat(B, t, 't')}`);
    return o.join('');
  }
  /* 方塊的花紋：木紋、磚塊、樹葉點點、玻璃反光、草地的草 */
  function pat(B, q, f) {
    const L = (a, b, k) => [(+a[0] + (+b[0] - a[0]) * k).toFixed(1), (+a[1] + (+b[1] - a[1]) * k).toFixed(1)];
    const line = (p1, p2, c, w = 1.2, op = .5) => `<path d="M${p1.join(' ')} L${p2.join(' ')}" stroke="${c}" stroke-width="${w}" opacity="${op}" pointer-events="none"/>`;
    const k = B.k, o = [];
    if (k === 'grass' && f !== 't') o.push(`<polygon points="${poly([q[0], q[1], L(q[1], q[2], .28), L(q[0], q[3], .28)])}" fill="#69db7c" pointer-events="none"/>`);
    if (k === 'grass' && f === 't') o.push(`<g fill="#8ce99a" pointer-events="none"><circle cx="${L(q[0], q[2], .3)[0]}" cy="${L(q[0], q[2], .3)[1]}" r="1.6"/><circle cx="${L(q[1], q[3], .6)[0]}" cy="${L(q[1], q[3], .6)[1]}" r="1.4"/></g>`);
    if (k === 'wood') { for (const a of [.33, .66]) o.push(line(L(q[0], q[3], a), L(q[1], q[2], a), '#7a4f22')); }
    if (k === 'brick' && f !== 't') { for (const a of [.33, .66]) o.push(line(L(q[0], q[3], a), L(q[1], q[2], a), '#fff', 1.2, .6)); o.push(line(L(q[0], q[1], .5), L(L(q[0], q[3], 0), L(q[1], q[2], 0), .5), '#fff', 1, 0)); o.push(line(L(L(q[0], q[3], .33), L(q[1], q[2], .33), .5), L(L(q[0], q[3], .66), L(q[1], q[2], .66), .5), '#fff', 1.2, .6)); o.push(line(L(L(q[0], q[3], 0), L(q[1], q[2], 0), .25), L(L(q[0], q[3], .33), L(q[1], q[2], .33), .25), '#fff', 1.2, .6)); o.push(line(L(L(q[0], q[3], .66), L(q[1], q[2], .66), .75), L(L(q[0], q[3], 1), L(q[1], q[2], 1), .75), '#fff', 1.2, .6)); }
    if (k === 'leaf') o.push(`<g fill="#fff" opacity=".35" pointer-events="none"><circle cx="${L(q[0], q[2], .3)[0]}" cy="${L(q[0], q[2], .3)[1]}" r="1.8"/><circle cx="${L(q[1], q[3], .35)[0]}" cy="${L(q[1], q[3], .35)[1]}" r="1.5"/><circle cx="${L(q[0], q[2], .72)[0]}" cy="${L(q[0], q[2], .72)[1]}" r="1.6"/></g>`);
    if (k === 'glass' || k === 'gold' || k === 'ice') o.push(line(L(q[0], q[2], .2), L(q[0], q[2], .45), '#fff', 2.2, .8));
    if (k === 'water' && f === 't') o.push(`<path d="M${L(q[0], q[2], .3).join(' ')} q4 -2 8 0" stroke="#fff" stroke-width="1.4" fill="none" opacity=".8" pointer-events="none"/>`);
    if (k === 'stone') o.push(`<circle cx="${L(q[0], q[2], .4)[0]}" cy="${L(q[0], q[2], .4)[1]}" r="1.8" fill="#868e96" opacity=".5" pointer-events="none"/>`);
    return o.join('');
  }
  /* 整座方塊島：P＝{v,d}；o.rot 轉幾次、o.pet 寵物、o.edit 編輯中（地面格子可以點）、o.bg 畫天空和海 */
  function plotSVG(Pd, o = {}) {
    const v = validV(Pd && Pd.v) ? Pd.v : blankV(), d = validD(Pd && Pd.d) ? Pd.d : blankD(), rot = o.rot || 0, W = N * T, out = [];
    const occ = new Set();   // 畫面座標上有方塊的位置 "c,r,z"
    for (let i = 0; i < CELLS; i++) { const [c, r] = rotTo(i, rot), s = colOf(v, i); for (let z = 0; z < H; z++) if (s[z] !== '.') occ.add(c + ',' + r + ',' + z); }
    const [lx, ly] = P3(0, W, 0).map(Number), [bx, by] = P3(W, W, 0).map(Number), [rx, ry] = P3(W, 0, 0).map(Number), D = DEPTH;
    if (o.bg) out.push(skyBG(rx, by));
    /* 島的底：草皮、土壤、垂下來的藤蔓 */
    out.push(`<ellipse cx="0" cy="${by + D + 40}" rx="${rx * .7}" ry="12" fill="#000" opacity=".08"/>`);
    out.push(`<path d="M${lx} ${ly} L${bx} ${by} L${bx} ${by + D} L${(lx + bx) / 2} ${(ly + by) / 2 + D + 22} L${lx} ${ly + D}Z" fill="url(#pkdirtL)"/>`);
    out.push(`<path d="M${bx} ${by} L${rx} ${ry} L${rx} ${ry + D} L${(rx + bx) / 2} ${(ry + by) / 2 + D + 22} L${bx} ${by + D}Z" fill="url(#pkdirtR)"/>`);
    out.push(`<path d="M${lx} ${ly + 11} L${bx} ${by + 11} L${rx} ${ry + 11}" stroke="#8a5a2b" stroke-width="2.5" fill="none" opacity=".35"/><path d="M${lx + 20} ${ly + 22} L${bx} ${by + 24} L${rx - 20} ${ry + 22}" stroke="#ffe8cc" stroke-width="2" fill="none" opacity=".35" stroke-dasharray="8 10"/>`);
    out.push(`<g fill="#e0ad73" opacity=".8"><ellipse cx="${lx * .62}" cy="${ly + 18}" rx="5" ry="3"/><ellipse cx="${rx * .35}" cy="${ry + 26}" rx="6" ry="3.5"/><ellipse cx="${rx * .72}" cy="${ry + 14}" rx="4" ry="2.5"/><ellipse cx="${lx * .25}" cy="${ly + 34}" rx="4" ry="2.5"/></g>`);
    out.push(`<g stroke="#40c057" stroke-width="3" fill="none" stroke-linecap="round">${[[lx * .8, ly - 2 + (-lx * .2) * .5, 18], [lx * .4, ly + (-lx * .6) * .5, 26], [rx * .3, ry + rx * .7 * .5, 22], [rx * .78, ry + rx * .22 * .5, 14]].map(([x, y, h]) => `<path d="M${x} ${y} q-3 ${h / 2} 0 ${h}"/><circle cx="${x}" cy="${y + h}" r="2.6" fill="#69db7c" stroke="none"/>`).join('')}</g>`);
    /* 地面：每一格是可以點的草地 */
    const g = [];
    for (let c = 0; c < N; c++) for (let r = 0; r < N; r++) {
      const q = [P3(c * T, r * T, 0), P3((c + 1) * T, r * T, 0), P3((c + 1) * T, (r + 1) * T, 0), P3(c * T, (r + 1) * T, 0)], i = rotFrom(c, r, rot);
      g.push(`<polygon points="${poly(q)}" fill="${(c + r) % 2 ? '#a9e8b8' : '#b6efc4'}" stroke="${o.edit ? '#fff' : '#a9e8b8'}" stroke-width="${o.edit ? 1 : .6}" stroke-opacity=".7" data-f="g" data-i="${i}" data-c="${c}" data-r="${r}" data-z="-1"/>`);
    }
    g.push(`<path d="M${lx} ${ly} L${P3(0, 0, 0).join(' ')} L${rx} ${ry}" stroke="#8ce99a" stroke-width="5" fill="none" stroke-linejoin="round" pointer-events="none"/><path d="M${lx} ${ly} L${bx} ${by} L${rx} ${ry}" stroke="#51cf66" stroke-width="4" fill="none" stroke-linejoin="round" pointer-events="none"/>`);
    out.push(`<g>${g.join('')}</g>`);
    /* 方塊和裝飾：從後面（c+r 小）畫到前面 */
    const items = [];
    for (let i = 0; i < CELLS; i++) {
      const [c, r] = rotTo(i, rot), s = colOf(v, i), tz = topZ(v, i);
      for (let z = 0; z < H; z++) if (s[z] !== '.') items.push({ k: c + r, z, html: cube(s[z], c * T, r * T, z, { t: !occ.has(c + ',' + r + ',' + (z + 1)) || BLOCKS[BY_BLOCK[s[z + 1]]]?.a, l: !occ.has(c + ',' + (r + 1) + ',' + z) || BLOCKS[BY_BLOCK[s[z]]]?.a, r: !occ.has((c + 1) + ',' + r + ',' + z) || BLOCKS[BY_BLOCK[s[z]]]?.a }, `data-i="${i}" data-c="${c}" data-r="${r}" data-z="${z}"`) });
      const dk = BY_CODE[d[i]];
      if (dk) { const [x, y] = P3((c + .5) * T, (r + .5) * T, tz); items.push({ k: c + r + .6, z: 9, html: `<g transform="translate(${x} ${+y + 4}) scale(.82)" class="ps-${dk}" data-f="d" data-i="${i}">${sprite(dk)}</g>` }); }
    }
    if (o.pet) { const [c, r] = rotTo(o.pet.i, rot), tz = topZ(v, o.pet.i), [x, y] = P3((c + .5) * T, (r + .5) * T, tz); items.push({ k: c + r + .7, z: 9, html: `<g class="ppw" id="${o.petId || ''}" style="transform:translate(${x}px,${+y + 4}px)" pointer-events="none"><svg x="-26" y="-50" width="52" height="52" viewBox="0 0 200 200" overflow="visible">${o.pet.svg}</svg></g>` }); }
    items.sort((a, b) => a.k - b.k || a.z - b.z);
    out.push(items.map(x => x.html).join(''));
    const top = -(H * HC + 70), defs = `<defs><linearGradient id="pkdirtL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9a066"/><stop offset="1" stop-color="#a86b34"/></linearGradient><linearGradient id="pkdirtR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c08850"/><stop offset="1" stop-color="#8a5a2b"/></linearGradient>${o.bg ? skyDefs() : ''}</defs>`;
    const pad = o.bg ? 70 : 12, vb = `${-rx - pad} ${top - (o.bg ? 30 : 0)} ${rx * 2 + pad * 2} ${by + D + 60 - top + (o.bg ? 60 : 0)}`;
    return `<svg class="plot${o.cls ? ' ' + o.cls : ''}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${defs}${out.join('')}</svg>`;
  }
  function skyDefs() { return `<linearGradient id="pksk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3ff"/><stop offset=".7" stop-color="#d8f1ff"/><stop offset="1" stop-color="#fdf6e3"/></linearGradient><linearGradient id="pksea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#74c0fc"/><stop offset="1" stop-color="#4dabf7"/></linearGradient>`; }
  function skyBG(rx, by) {
    const w = rx * 2 + 140, x0 = -rx - 70, y0 = -(H * HC + 100), h = by + DEPTH + 220 - y0;
    return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="url(#pksk)"/>
      <circle cx="${x0 + w - 60}" cy="${y0 + 50}" r="24" fill="#ffe066" opacity=".95"/><circle cx="${x0 + w - 60}" cy="${y0 + 50}" r="36" fill="#ffe066" opacity=".25"/>
      <g class="pkcl" fill="#fff" opacity=".9"><g><circle cx="${x0 + 60}" cy="${y0 + 60}" r="14"/><circle cx="${x0 + 78}" cy="${y0 + 54}" r="18"/><circle cx="${x0 + 96}" cy="${y0 + 62}" r="12"/></g><g><circle cx="${x0 + w * .55}" cy="${y0 + 30}" r="10"/><circle cx="${x0 + w * .55 + 14}" cy="${y0 + 26}" r="13"/><circle cx="${x0 + w * .55 + 28}" cy="${y0 + 32}" r="9"/></g></g>
      <rect x="${x0}" y="${by + DEPTH + 70}" width="${w}" height="${h}" fill="url(#pksea)"/>
      <path d="M${x0} ${by + DEPTH + 70} q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#fff" stroke-width="3" fill="none" opacity=".6"/>
      <g class="pkbird" stroke="#495057" stroke-width="2" fill="none" stroke-linecap="round"><path d="M${x0 + 120} ${y0 + 90} q5 -5 10 0 q5 -5 10 0"/><path d="M${x0 + 150} ${y0 + 76} q4 -4 8 0 q4 -4 8 0"/></g>`;
  }
  const H = 6;
  const blankV = () => '.'.repeat(CELLS * H), blankD = () => '.'.repeat(CELLS);
  const BCODES = () => Object.values(BLOCKS).map(b => b.c).join('');
  const validV = v => typeof v === 'string' && v.length === CELLS * H && new RegExp(`^[.${BCODES()}]+$`).test(v);
  const validD = d => typeof d === 'string' && d.length === CELLS && /^[.1-9g-u]+$/.test(d);
  /* 新的島：先放幾棵樹、幾朵花，才不會空空的 */
  function starter() {
    const v = blankV().split(''), d = blankD().split('');
    const put = (c, r, z, b) => v[(r * N + c) * H + z] = BLOCKS[b].c;
    [[0, 0], [1, 0], [0, 1]].forEach(([c, r]) => put(c, r, 0, 'grass'));
    d[0] = OBJ.tree.c; d[N * 7 + 7] = OBJ.pine.c; d[N * 2 + 6] = OBJ.flower.c; d[N * 6 + 1] = OBJ.flower.c; d[N * 5 + 6] = OBJ.bush.c;
    return { v: v.join(''), d: d.join('') };
  }

  /* ───────── 自己的資料 ───────── */
  function S() {
    if (!sum) return null;
    if (!sum.park || !validV(sum.park.v) || !validD(sum.park.d)) sum.park = Object.assign({ bag: {}, fund: (sum.park && sum.park.fund) || 0, u: Date.now() }, starter());
    sum.park.bag = sum.park.bag || {};
    return sum.park;
  }
  const pet = () => PET.P();
  const lvNow = () => { const p = pet(); return p && p.st === 'pet' ? PET.lvOf(p.xp || 0).lv : 1; };
  const coins = () => (pet() && pet().coin) || 0;
  function spend(n) { const p = pet(); if (!p || (p.coin || 0) < n) return false; p.coin -= n; p.u = Date.now(); return true; }
  const bossWon = () => !!(sum && sum.bossR && Object.keys(sum.bossR).length);
  let pubT = 0;
  function save() {
    const s = S(); s.u = Date.now(); saveSum(true);
    clearTimeout(pubT); pubT = setTimeout(() => { if (user) enqueue(`${ROOT}/park/plot/${user.seat}`, { v: s.v, d: s.d, t: Date.now() }, true); }, 1200);
  }

  /* ───────── 樂園頁 ───────── */
  let mode = 'farm', tool = 'block', pick = 'grass', walkT = 0, rot = 0, hist = [];
  function page(P) {
    const h = el('div', 'h1', `<span class="tag">🏝️</span>601 樂園`); h.style.setProperty('--c', '#20c997'); P.appendChild(h);
    const T2 = el('div', 'ptabs pk'); [['farm', '🌾 我的農場'], ['visit', '👫 同學的農場'], ['plaza', '🎪 廣場'], ['mine', '🏝️ 方塊島'], ['map', '🏛️ 中央公園']].forEach(([k, n]) => { const b = el('button', mode === k ? 'on' : '', n); tap(b, () => { if (mode === k) return; leavePlaza(); mode = k; render(); }); T2.appendChild(b); });
    P.appendChild(T2);
    const C = el('div', 'cd pkc'); P.appendChild(C);
    if (mode !== 'plaza') leavePlaza();
    if (mode === 'farm') FARM.page(C); else if (mode === 'visit') FARM.visitList(C); else if (mode === 'mine') mine(C); else if (mode === 'plaza') plaza(C); else map(C);
  }
  function mine(C) {
    C.innerHTML = `<div class="pkhead"><div class="pkcoin">🪙 <b id="pkcoin">${coins()}</b></div><div class="pktip" id="pktip"></div>
        <button class="pkb" id="pkundo" title="上一步">↩️</button><button class="pkb" id="pkrl" title="向左轉">⟲</button><button class="pkb" id="pkrr" title="向右轉">⟳</button></div>
      <div class="pkplot" id="pkplot"></div><div class="pktools" id="pktools"></div><div class="pkitems" id="pkitems"></div>`;
    paintPlot(); paintTools(); paintItems(); tip();
    tap(C.querySelector('#pkrl'), () => { rot = (rot + 3) % 4; paintPlot(); snd(500); });
    tap(C.querySelector('#pkrr'), () => { rot = (rot + 1) % 4; paintPlot(); snd(500); });
    tap(C.querySelector('#pkundo'), undo);
    C.querySelector('#pkplot').addEventListener('pointerdown', e => { const t = e.target.closest('[data-f]'); if (!t) return; e.preventDefault(); hit(t); });
    clearInterval(walkT); walkT = setInterval(() => { if (view !== 'park' || mode !== 'mine' || !document.getElementById('pkplot')) return clearInterval(walkT); walk(); }, 3000);
  }
  let petPos = null;
  function petLook() { const p = pet(); if (!p || p.st !== 'pet') return null; return PET.petSVG(PET.look(p, { mood: PET.moodOf(p) })); }
  /* 寵物可以站的格子：上面沒有裝飾、最上面不是水 */
  function freeCells(P) { const a = []; for (let i = 0; i < CELLS; i++) { const tz = topZ(P.v, i); if (P.d[i] === '.' && tz < H && !(tz > 0 && P.v[i * H + tz - 1] === BLOCKS.water.c)) a.push(i); } return a; }
  function placePet(P) { const f = freeCells(P); return f.length ? { i: f[Math.floor(Math.random() * f.length)] } : null; }
  function paintPlot() {
    const s = S(), box = document.getElementById('pkplot'); if (!box) return;
    const sv = petLook(); if (sv && (!petPos || !freeCells(s).includes(petPos.i))) petPos = placePet(s);
    box.innerHTML = plotSVG(s, { edit: 1, bg: 1, rot, pet: sv && petPos ? { svg: sv, i: petPos.i } : null, petId: 'pkpet' });
  }
  function walk() {
    const s = S(); if (!petPos || !document.getElementById('pkpet')) return;
    const c0 = petPos.i % N, r0 = (petPos.i / N) | 0, h0 = topZ(s.v, petPos.i);
    const f = freeCells(s).filter(i => { const dc = Math.abs(i % N - c0), dr = Math.abs(((i / N) | 0) - r0); return dc + dr === 1 && Math.abs(topZ(s.v, i) - h0) <= 1; });   // 一次走一格、只能爬一層
    if (!f.length) return; petPos = { i: f[Math.floor(Math.random() * f.length)] }; paintPlot();
  }
  function paintTools() {
    const C = document.getElementById('pktools'); if (!C) return; C.innerHTML = '';
    [['block', '🧱 放方塊'], ['deco', '🌳 放裝飾'], ['dig', '⛏️ 拆掉']].forEach(([k, n]) => { const b = el('button', tool === k ? 'on' : '', n); tap(b, () => { tool = k; if (k === 'deco' && !OBJ[pick]) pick = 'tree'; if (k === 'block' && !BLOCKS[pick]) pick = 'grass'; paintTools(); paintItems(); tip(); }); C.appendChild(b); });
  }
  function cubeIcon(k) { return `<svg viewBox="-30 -46 60 56" class="pkic">${cube(BLOCKS[k].c, -T / 2, -T / 2, 0, { t: 1, l: 1, r: 1 }, '')}</svg>`; }
  function paintItems() {
    const C = document.getElementById('pkitems'); if (!C) return; const s = S(), lv = lvNow(); C.innerHTML = '';
    if (tool === 'dig') { C.innerHTML = '<div class="pknote">⛏️ 點一下方塊或裝飾就會拆掉。用金幣買的會收回背包，可以再拿出來用</div>'; return; }
    if (tool === 'block') {
      Object.entries(BLOCKS).forEach(([k, B]) => {
        const has = s.bag['b' + k] || 0, lock = lv < B.lv, b = el('button', 'pkit' + (pick === k ? ' on' : '') + (lock ? ' lock' : ''), `${cubeIcon(k)}<b>${B.n}</b><em>${!B.p ? '免費' : has ? `背包 ×${has}` : lock ? `🔒 Lv.${B.lv}` : `🪙 ${B.p}`}</em>`);
        tap(b, () => { if (lock) { tip(`寵物升到 Lv.${B.lv} 才能用${B.n}，多練習讓寵物長大吧！`); return; } pick = k; paintItems(); tip(); }); C.appendChild(b);
      });
      return;
    }
    Object.entries(OBJ).filter(([, O]) => !O.boss || bossWon()).forEach(([k, O]) => {
      const has = s.bag[k] || 0, lock = !O.boss && lv < O.lv, b = el('button', 'pkit' + (pick === k ? ' on' : '') + (lock ? ' lock' : ''),
        `<svg viewBox="-34 -${O.cat === 'house' ? 110 : 76} 68 ${O.cat === 'house' ? 112 : 78}" class="pkic">${sprite(k)}</svg><b>${O.n}</b><em>${has ? `背包 ×${has}` : lock ? `🔒 Lv.${O.lv}` : O.boss ? '🏆 魔王獎勵' : `🪙 ${O.p}`}</em>`);
      tap(b, () => { if (lock) { tip(`寵物升到 Lv.${O.lv} 才能買${O.n}，多練習讓寵物長大吧！`); return; } pick = k; paintItems(); tip(); }); C.appendChild(b);
    });
  }
  function tip(t) {
    const e = document.getElementById('pktip'); if (!e) return;
    e.textContent = t || (tool === 'dig' ? '⛏️ 點要拆掉的東西' : tool === 'block' ? `🧱 點方塊的上面或側面，放上「${BLOCKS[pick].n}」` : `🌳 點方塊或草地，放上「${OBJ[pick].n}」`);
  }
  function setBlock(s, i, z, ch) { s.v = s.v.slice(0, i * H + z) + ch + s.v.slice(i * H + z + 1); }
  function setDeco(s, i, ch) { s.d = s.d.slice(0, i) + ch + s.d.slice(i + 1); }
  function remember() { const s = S(); hist.push(JSON.stringify({ v: s.v, d: s.d, bag: s.bag, coin: coins() })); if (hist.length > 30) hist.shift(); }
  function undo() {
    const x = hist.pop(); if (!x) { tip('沒有可以回去的步驟了'); return; }
    const o = JSON.parse(x), s = S(); s.v = o.v; s.d = o.d; s.bag = o.bag; const p = pet(); if (p) { p.coin = o.coin; p.u = Date.now(); }
    save(); paintPlot(); paintItems(); document.getElementById('pkcoin').textContent = coins(); snd(420);
  }
  /* 點到畫面上的某一面 */
  function hit(t) {
    const s = S(), f = t.dataset.f, i = +t.dataset.i, z = +t.dataset.z;
    if (tool === 'dig') {
      if (f === 'd') { const k = BY_CODE[s.d[i]]; if (!k) return; remember(); if (OBJ[k].p || OBJ[k].boss) s.bag[k] = (s.bag[k] || 0) + 1; setDeco(s, i, '.'); return done(300); }
      if (f === 'g') return;
      const k = BY_BLOCK[s.v[i * H + z]]; if (!k) return; remember();
      if (BLOCKS[k].p) s.bag['b' + k] = (s.bag['b' + k] || 0) + 1;
      setBlock(s, i, z, '.'); return done(300);
    }
    if (tool === 'deco') {
      if (f === 'd') { tip('這裡已經有裝飾了，要換的話先用「⛏️ 拆掉」'); return; }
      const tz = topZ(s.v, i); if (s.d[i] !== '.') { tip('這一格上面已經有裝飾了'); return; }
      if (tz >= H) { tip('太高了，放不上去'); return; }
      if (tz > 0 && s.v[i * H + tz - 1] === BLOCKS.water.c) { tip('水上面不能放裝飾喔'); return; }
      const O = OBJ[pick]; remember(); if (!take(pick, O.p, O.n, O.boss)) { hist.pop(); return; }
      setDeco(s, i, O.c); return done(700);
    }
    /* 放方塊：點上面就疊上去、點側面就放旁邊、點草地就放在地上 */
    let ti = i, tz = z + 1;
    if (f === 'g') tz = 0;
    else if (f === 'l' || f === 'r') { const c = +t.dataset.c + (f === 'r' ? 1 : 0), r = +t.dataset.r + (f === 'l' ? 1 : 0); if (c >= N || r >= N) { tip('超出島的範圍了'); return; } ti = rotFrom(c, r, rot); tz = z; }
    if (tz >= H) { tip(`最高只能蓋 ${H} 層喔`); return; }
    if (s.v[ti * H + tz] !== '.') return;
    if (s.d[ti] !== '.' && tz >= topZ(s.v, ti)) { /* 裝飾會跟著墊高 */ }
    const B = BLOCKS[pick]; remember(); if (B.p && !take('b' + pick, B.p, B.n)) { hist.pop(); return; }
    setBlock(s, ti, tz, B.c); done(560 + tz * 60);
  }
  function done(f) { snd(f); save(); paintPlot(); paintItems(); document.getElementById('pkcoin').textContent = coins(); }
  /* 從背包拿一個；背包沒有就用金幣買 */
  function take(k, price, name, free) {
    const s = S();
    if (s.bag[k] > 0) { s.bag[k]--; if (!s.bag[k]) delete s.bag[k]; return true; }
    if (free) { const used = (s.d.match(new RegExp(OBJ.trophy.c, 'g')) || []).length; if (used >= Object.keys(sum.bossR || {}).length) { tip('打倒一次魔王可以放一座獎盃'); return false; } return true; }
    if (coins() < price) { tip(`金幣不夠…${name}要 ${price} 枚，去練習賺金幣吧！`); return false; }
    spend(price); return true;
  }
  function snd(f) { try { if (typeof tone === 'function' && sndOn) tone(f, .07, 'triangle', .06); } catch (e) { } }

  /* ───────── 全班樂園地圖、中央公園 ───────── */
  let CL = null;
  async function loadAll() {
    if (CL && Date.now() - CL.at < 20000) return CL;
    await fbReady; let plot = null, fund = null, pets = null;
    if (db && online) { try { const [a, b, c] = await Promise.all([db.ref(`${ROOT}/park/plot`).get(), db.ref(`${ROOT}/park/fund`).get(), db.ref(`${ROOT}/pet`).get()].map(x => timeout(x, 8000))); plot = a.val() || {}; fund = b.val() || {}; pets = c.val() || {}; } catch (e) { } }
    CL = { at: Date.now(), ok: !!plot, plot: plot || {}, fund: fund || {}, pets: pets || {} }; return CL;
  }
  function fundTotal(R) {
    let t = 0; for (const [st, o] of Object.entries(R.fund)) if (o && typeof o.s === 'number' && !isTest(+st)) t += o.s;
    if (user && isTest(user.seat)) t += S().fund || 0;   // 測試帳號：自己捐的看得到效果（不算進全班）
    else if (user) { const mine = R.fund[user.seat], cloud = mine && mine.s || 0; t += Math.max(0, (S().fund || 0) - cloud); }   // 還沒上傳的
    return t;
  }
  async function map(C) {
    C.innerHTML = '<div class="ld">讀取中…</div>';
    const R = await loadAll(); if (mode !== 'map' || !C.isConnected) return;
    const tot = fundTotal(R), nx = FUND.find(f => tot < f.s), done = FUND.filter(f => tot >= f.s).length;
    const donors = Object.entries(R.fund).filter(([st, o]) => o && o.s > 0 && !isTest(+st)).sort((a, b) => b[1].s - a[1].s).slice(0, 5);
    C.innerHTML = `<div class="pkpark">${parkSVG(done)}</div>
      <div class="pkfund"><div class="pkft">🏗️ 全班一起蓋中央公園　<small>已經蓋好 ${done} / ${FUND.length}</small></div>
        ${nx ? `<div class="pbar x"><i style="width:${Math.min(100, tot / nx.s * 100)}%;background:linear-gradient(90deg,#63e6be,#20c997)"></i><b>下一個：${nx.n}　${tot} / ${nx.s}</b></div>` : '<div class="pkdone">🎉 全部蓋好了！全班太厲害了！</div>'}
        <div class="pkdon">${nx ? `我要捐：${[5, 10, 30].map(n => `<button data-d="${n}">🪙 ${n}</button>`).join('')}` : ''}<span>我捐了 ${S().fund || 0} 枚・我有 🪙 ${coins()}</span></div>
        ${donors.length ? `<div class="pktop">💝 捐最多的同學：${donors.map(([st, o], i) => `<span>${['🥇', '🥈', '🥉'][i] || ''}${st} 號 ${o.s}</span>`).join('')}</div>` : ''}</div>
      <div class="psec">🗺️ 全班的花園　<small>點一下去參觀</small></div><div class="pkmap" id="pkmap"></div>`;
    C.querySelectorAll('[data-d]').forEach(b => tap(b, () => donate(+b.dataset.d)));
    if (!R.ok) C.querySelector('#pkmap').innerHTML = '<div class="ld">📴 連上網路才看得到同學的花園</div>';
    else {
      const seats = [...SEATS.flat(), ...(user && isTest(user.seat) ? TEST_SEATS : [])], M = C.querySelector('#pkmap');
      seats.forEach(st => {
        const v = st === user.seat ? S() : R.plot[st], pv = R.pets[st];
        const pm = v && validV(v.v) && validD(v.d) ? v : starter(), ps = pv && PET.SPECIES[pv.sp] ? PET.petSVG(Object.assign({}, pv, { mood: 'ok' })) : null, pp = ps ? placePet(pm) : null;   // 小島上也放寵物
        /* 小圖用圖片顯示（28 座島一起畫才不會卡） */
        const img = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(plotSVG(pm, { pet: pp ? { svg: ps, i: pp.i } : null }));
        const b = el('button', 'pkcell' + (st === user.seat ? ' me' : ''), `<img class="plot mini" alt="" src="${img}"><b>${seatName(st)}${st === user.seat ? '（我）' : ''}</b><small>${pv && PET.NAMES[pv.nm | 0] ? `🐾 ${PET.NAMES[pv.nm | 0]} Lv.${pv.lv | 0}` : '🥚 還在孵蛋'}</small>`);
        tap(b, () => st === user.seat ? (mode = 'mine', render()) : visit(st, pm, pv)); M.appendChild(b);
      });
    }
  }
  function donate(n) {
    const s = S(); if (coins() < n) { toast(`🪙 金幣不夠，要 ${n} 枚`); return; }
    if (!confirm(`捐 ${n} 枚金幣一起蓋中央公園嗎？`)) return;
    spend(n); s.fund = (s.fund || 0) + n; s.u = Date.now(); saveSum(true);
    if (user) enqueue(`${ROOT}/park/fund/${user.seat}`, { s: s.fund, t: Date.now() }, true);
    try { sfx.ticket(); confetti(40); } catch (e) { }
    toast(`💝 謝謝你捐了 ${n} 枚金幣！`); CL = null; render();
  }
  function visit(st, m, pv) {   // m＝{v,d}
    const sent = LS.get('learn601_petlk_' + user.seat, {}), today = dkey(), done = sent[st] === today;
    const p = pv && PET.SPECIES[pv.sp] ? PET.petSVG(Object.assign({}, pv, { mood: 'happy' })) : null, pos = p ? placePet(m) : null;
    const box = el('div', 'pmod', `<div class="pmc"><div class="pmh">${seatName(st)}的方塊島${pv && PET.NAMES[pv.nm | 0] ? `　<small>🐾 ${PET.NAMES[pv.nm | 0]} Lv.${pv.lv | 0}</small>` : ''}</div>
      <div class="pkvis">${plotSVG(m, { bg: 1, pet: p && pos ? { svg: p, i: pos.i } : null })}</div>
      <div class="pstk">${done ? '<div class="pdone">今天已經送過貼圖了，明天再來吧！</div>' : PET.STICKERS.map((e, i) => `<button data-e="${i}">${e}</button>`).join('')}</div><button class="gray pmx">關閉</button></div>`);
    document.body.appendChild(box);
    box.querySelectorAll('[data-e]').forEach(b => tap(b, () => {
      sent[st] = today; LS.set('learn601_petlk_' + user.seat, sent);
      enqueue(`${ROOT}/petlike/${st}/${user.seat}`, { e: +b.dataset.e, d: today, t: Date.now() }, true);
      box.querySelector('.pstk').innerHTML = `<div class="pdone">已經送出 ${PET.STICKERS[+b.dataset.e]} 了！</div>`; try { sfx.ok(); } catch (e) { }
    }));
    tap(box.querySelector('.pmx'), () => box.remove());
    tap(box, e => { if (e.target === box) box.remove(); });
  }
  /* 中央公園的大圖：n＝蓋好幾個 */
  function parkSVG(n, live) {
    const b = (i, svg, lockX, lockY) => i < n ? svg : `<g opacity=".9"><circle cx="${lockX}" cy="${lockY}" r="22" fill="#fff" fill-opacity=".75" stroke="#adb5bd" stroke-width="3" stroke-dasharray="6 5"/><text x="${lockX}" y="${lockY + 7}" text-anchor="middle" font-size="20">🔒</text><text x="${lockX}" y="${lockY + 40}" text-anchor="middle" font-size="13" font-weight="900" fill="#868e96">${FUND[i].n}</text></g>`;
    const big = (k, x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${sprite(k)}</g>`;
    return `<svg class="park" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice" id="${live ? 'plaza' : ''}">
      <defs><linearGradient id="pksky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a5d8ff"/><stop offset="1" stop-color="#e7f5ff"/></linearGradient></defs>
      <rect width="800" height="300" fill="url(#pksky)"/>
      ${n >= 6 ? '<path d="M120 170 A280 200 0 0 1 680 170" fill="none" stroke="#ff8787" stroke-width="12" opacity=".8"/><path d="M134 170 A266 188 0 0 1 666 170" fill="none" stroke="#ffd43b" stroke-width="12" opacity=".8"/><path d="M148 170 A252 176 0 0 1 652 170" fill="none" stroke="#69db7c" stroke-width="12" opacity=".8"/><path d="M162 170 A238 164 0 0 1 638 170" fill="none" stroke="#74c0fc" stroke-width="12" opacity=".8"/><path d="M176 170 A224 152 0 0 1 624 170" fill="none" stroke="#b197fc" stroke-width="12" opacity=".8"/>' : ''}
      <g fill="#fff" opacity=".9"><circle cx="90" cy="50" r="18"/><circle cx="112" cy="44" r="22"/><circle cx="134" cy="52" r="16"/><circle cx="640" cy="40" r="16"/><circle cx="662" cy="34" r="20"/><circle cx="684" cy="42" r="14"/></g>
      <path d="M0 170 Q200 140 400 160 T800 150 V300 H0Z" fill="#8ce99a"/><path d="M0 200 Q220 180 420 196 T800 190 V300 H0Z" fill="#69db7c"/>
      <path d="M330 300 Q380 230 400 200 Q420 230 470 300Z" fill="#f1f3f5" opacity=".9"/>
      ${b(3, `<g transform="translate(150 180)"><path d="M-6 0 L0 -100 L6 0Z M-40 0 L0 -100 M40 0 L0 -100" stroke="#868e96" stroke-width="5" fill="none"/><g transform="translate(0 -100)"><g class="pkwheel"><circle r="78" fill="none" stroke="#ff8787" stroke-width="6"/><circle r="10" fill="#495057"/>${[...Array(8)].map((_, i) => { const a = i * Math.PI / 4; return `<path d="M0 0 L${78 * Math.cos(a)} ${78 * Math.sin(a)}" stroke="#ffa8a8" stroke-width="3"/><rect x="${78 * Math.cos(a) - 11}" y="${78 * Math.sin(a) - 8}" width="22" height="16" rx="5" fill="${['#ffd43b', '#74c0fc', '#69db7c', '#b197fc'][i % 4]}" stroke="#495057" stroke-width="2"/>`; }).join('')}</g></g></g>`, 150, 120)}
      ${b(4, big('castle', 650, 200, 1.6), 650, 120)}
      ${b(0, big('fountain', 400, 230, 1.7), 400, 190)}
      ${b(1, `<g>${[[250, 250], [290, 262], [520, 255], [560, 248], [330, 280], [480, 282]].map(([x, y]) => big('flower', x, y, 1.1)).join('')}${big('tree', 230, 230, 1.2)}${big('sakura', 580, 236, 1.2)}</g>`, 270, 240)}
      ${b(2, big('slide', 290, 220, 1.4), 300, 180)}
      ${live ? '<g id="plz"></g>' : ''}</svg>`;
  }

  /* ───────── 第三期：廣場（同時在線的同學一起玩） ─────────
     ・進到廣場：雲端 learn/plaza/座號 = {x,y 站在哪一格, e 表情, et 按表情的時間, 外觀…, t 心跳}；離開或斷線自動刪掉
     ・點地板＝寵物走過去；按表情＝頭上冒泡泡、跳一跳
     ・每 30 秒冒出 3 顆星星（每台平板用同一個亂數算出位置），先走到的人拿 1 枚金幣：learn/pstar/時段_第幾顆 = 座號（先寫的人贏）
       一天最多拿 STAR_MAX 枚（玩廣場賺不了太多，還是要練習）
     ・晚上 9 點到早上 6 點廣場關門（寵物要睡覺） */
  const PN = 10, PT = 40, STAR_MS = 30000, STAR_N = 3, STAR_MAX = 10, LIVE_MS = 70000;
  const EMOTES = ['👋', '😆', '❤️', '🎉', '💃', '⭐'];
  let PZ = null;   // {me:{x,y}, others:{}, ref, un, hb, stars, claimed}
  const pzNight = () => PET.night();   // 跟寵物睡覺的時間一樣
  /* 廣場的固定裝飾（依中央公園蓋好幾個再多放） */
  function plazaDeco(done) {
    const D = [[0, 0, 'tree'], [9, 0, 'pine'], [0, 9, 'pine'], [9, 9, 'tree'], [0, 4, 'bench'], [9, 5, 'bench'], [4, 0, 'lamp'], [5, 9, 'lamp'], [2, 9, 'flower'], [7, 0, 'flower']];
    if (done >= 1) D.push([4, 4, 'fountain']);
    if (done >= 2) D.push([1, 1, 'sakura'], [8, 8, 'sakura'], [3, 1, 'flower'], [6, 8, 'flower'], [1, 6, 'sunflower'], [8, 3, 'sunflower']);
    if (done >= 3) D.push([7, 2, 'slide']);
    if (done >= 4) D.push([2, 7, 'wheel']);
    if (done >= 5) D.push([8, 6, 'castle']);
    if (done >= 6) D.push([5, 5, 'rainbow']);
    return D;
  }
  const pzBlocked = (D, x, y) => D.some(([a, b]) => a === x && b === y) || ((x === 4 || x === 5) && (y === 4 || y === 5) && D.some(d => d[2] === 'fountain'));
  /* 這個時段的星星（每台平板算出來一樣） */
  function starsOf(slot, D) {
    let a = slot * 2654435761 >>> 0; const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const out = []; for (let k = 0; k < 60 && out.length < STAR_N; k++) { const x = Math.floor(rnd() * PN), y = Math.floor(rnd() * PN); if (!pzBlocked(D, x, y) && !out.some(s => s.x === x && s.y === y)) out.push({ k: out.length, x, y }); }
    return out;
  }
  const PP = (x, y) => P3((x + .5) * PT, (y + .5) * PT, 0).map(Number);
  function plazaSVG(D) {
    const W = PN * PT, [lx, ly] = P3(0, W, 0).map(Number), [bx, by] = P3(W, W, 0).map(Number), [rx, ry] = P3(W, 0, 0).map(Number), out = [];
    out.push(skyBGw(rx, by));
    out.push(`<ellipse cx="0" cy="${by + 60}" rx="${rx * .7}" ry="14" fill="#000" opacity=".08"/>`);
    out.push(`<path d="M${lx} ${ly} L${bx} ${by} L${bx} ${by + 30} L${(lx + bx) / 2} ${(ly + by) / 2 + 52} L${lx} ${ly + 30}Z" fill="url(#pkdirtL)"/><path d="M${bx} ${by} L${rx} ${ry} L${rx} ${ry + 30} L${(rx + bx) / 2} ${(ry + by) / 2 + 52} L${bx} ${by + 30}Z" fill="url(#pkdirtR)"/>`);
    for (let x = 0; x < PN; x++) for (let y = 0; y < PN; y++) {
      const q = [P3(x * PT, y * PT, 0), P3((x + 1) * PT, y * PT, 0), P3((x + 1) * PT, (y + 1) * PT, 0), P3(x * PT, (y + 1) * PT, 0)];
      const ring = Math.max(Math.abs(x - 4.5), Math.abs(y - 4.5)), path = ring > 1.5 && ring < 2.6 || x === 4 || x === 5 || y === 4 || y === 5;
      out.push(`<polygon points="${poly(q)}" fill="${path ? ((x + y) % 2 ? '#f1f3f5' : '#e9ecef') : ((x + y) % 2 ? '#a9e8b8' : '#b6efc4')}" stroke="${path ? '#dee2e6' : '#a9e8b8'}" stroke-width=".8" data-x="${x}" data-y="${y}"/>`);
    }
    out.push(`<path d="M${lx} ${ly} L${bx} ${by} L${rx} ${ry}" stroke="#51cf66" stroke-width="4" fill="none" stroke-linejoin="round" pointer-events="none"/>`);
    const items = D.map(([x, y, k]) => { const [X, Y] = PP(x, y); return { d: x + y, html: `<g transform="translate(${X} ${Y + 6}) scale(${k === 'fountain' || k === 'castle' || k === 'wheel' || k === 'rainbow' ? 1.25 : .85})" pointer-events="none">${sprite(k)}</g>` }; }).sort((a, b) => a.d - b.d);
    out.push(`<g id="pzdeco">${items.map(i => i.html).join('')}</g><g id="pzstar"></g><g id="pzpets"></g>`);
    const top = -150, vb = `${-rx - 60} ${top - 20} ${rx * 2 + 120} ${by + 140 - top}`;
    return `<svg class="plot plz" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="pkdirtL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9a066"/><stop offset="1" stop-color="#a86b34"/></linearGradient><linearGradient id="pkdirtR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c08850"/><stop offset="1" stop-color="#8a5a2b"/></linearGradient>${skyDefs()}</defs>${out.join('')}</svg>`;
  }
  function skyBGw(rx, by) {   // 廣場的天空、海（寬一點）
    const x0 = -rx - 60, w = rx * 2 + 120, y0 = -170, h = by + 300;
    return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="url(#pksk)"/><circle cx="${x0 + w - 70}" cy="${y0 + 60}" r="26" fill="#ffe066"/><circle cx="${x0 + w - 70}" cy="${y0 + 60}" r="40" fill="#ffe066" opacity=".25"/>
      <g class="pkcl" fill="#fff" opacity=".9"><g><circle cx="${x0 + 70}" cy="${y0 + 60}" r="15"/><circle cx="${x0 + 90}" cy="${y0 + 52}" r="20"/><circle cx="${x0 + 110}" cy="${y0 + 62}" r="13"/></g><g><circle cx="${x0 + w * .5}" cy="${y0 + 36}" r="11"/><circle cx="${x0 + w * .5 + 16}" cy="${y0 + 30}" r="14"/><circle cx="${x0 + w * .5 + 32}" cy="${y0 + 38}" r="10"/></g></g>
      <rect x="${x0}" y="${by + 100}" width="${w}" height="200" fill="url(#pksea)"/>`;
  }
  function myLook() { const p = pet(); if (!p || p.st !== 'pet') return null; const L = PET.look(p); return { sp: L.sp, nm: p.nm | 0, lv: L.lv, c: L.c | 0, h: L.h || '', g: L.g || '', k: L.k || '' }; }
  async function plaza(C) {
    if (pzNight()) { C.innerHTML = '<div class="pzclosed">🌙 廣場晚上 9 點到早上 6 點關門，寵物們都去睡覺了，明天早上見！</div>'; return; }
    const L = myLook(); if (!L) { C.innerHTML = '<div class="pzclosed">🥚 先讓寵物孵化，才能帶牠來廣場玩喔！<br><small>到「🐾 寵物」頁看看</small></div>'; return; }
    await fbReady; if (!db || !online) { C.innerHTML = '<div class="pzclosed">📴 連上網路才能和同學一起玩</div>'; return; }
    const R = await loadAll(); const done = FUND.filter(f => fundTotal(R) >= f.s).length, D = plazaDeco(done);
    C.innerHTML = `<div class="pkhead"><div class="pkcoin">🪙 <b id="pkcoin">${coins()}</b></div><div class="pktip" id="pztip">👆 點地板，寵物就會走過去。撿到 ⭐ 可以拿金幣！</div></div>
      <div class="pkplot pzbox" id="pzbox">${plazaSVG(D)}</div><div class="pzem" id="pzem">${EMOTES.map((e, i) => `<button data-e="${i}">${e}</button>`).join('')}</div><div class="pzwho" id="pzwho"></div>`;
    let x = 4, y = 7; while (pzBlocked(D, x, y)) x = (x + 1) % PN;
    PZ = { D, me: { x, y }, others: {}, starDone: {}, ref: db.ref(`${ROOT}/plaza/${user.seat}`), seat: user.seat };
    if (!(await ensureBind())) { C.querySelector('#pztip').textContent = '連線有點問題，等一下再試'; return; }
    const send = extra => { if (!PZ) return; const v = Object.assign({ x: PZ.me.x, y: PZ.me.y, t: Date.now() }, L, PZ.me.e != null ? { e: PZ.me.e, et: PZ.me.et } : {}, extra || {}); PZ.ref.set(v).catch(() => { }); };
    try { PZ.ref.onDisconnect().remove(); } catch (e) { }
    send(); PZ.hb = setInterval(() => { if (!document.getElementById('pzbox') || view !== 'park' || mode !== 'plaza') return leavePlaza(); send(); paintStars(); }, 25000);
    PZ.send = send;
    const all = db.ref(`${ROOT}/plaza`), cb = s => { if (!PZ) return; PZ.others = s.val() || {}; paintPets(); };
    all.on('value', cb); PZ.un = () => all.off('value', cb);
    const st = db.ref(`${ROOT}/pstar`).orderByKey().startAt(String(Math.floor(Date.now() / STAR_MS) - 1)), scb = s => { if (!PZ) return; PZ.starDone = s.val() || {}; paintStars(); };
    st.on('value', scb); const un0 = PZ.un; PZ.un = () => { un0(); st.off('value', scb); };
    PZ.tick = setInterval(() => { if (!document.getElementById('pzbox')) return; paintStars(); }, 2000);
    C.querySelector('#pzbox').addEventListener('pointerdown', e => { const t = e.target.closest('[data-x]'); if (!t) return; e.preventDefault(); moveTo(+t.dataset.x, +t.dataset.y); });
    C.querySelectorAll('[data-e]').forEach(b => tap(b, () => { if (!PZ) return; PZ.me.e = +b.dataset.e; PZ.me.et = Date.now(); send(); paintPets(); snd(700); }));
    paintPets(); paintStars();
  }
  function leavePlaza() {
    if (!PZ) return; clearInterval(PZ.hb); clearInterval(PZ.tick); try { PZ.un && PZ.un(); } catch (e) { }
    try { PZ.ref.remove(); PZ.ref.onDisconnect().cancel(); } catch (e) { } PZ = null;
  }
  function moveTo(x, y) {
    if (!PZ) return; if (pzBlocked(PZ.D, x, y)) { const t = document.getElementById('pztip'); if (t) t.textContent = '那裡有東西擋住了，換一個地方'; return; }
    PZ.me.x = x; PZ.me.y = y; PZ.send(); paintPets(); snd(520);
    setTimeout(() => claim(x, y), 1300);   // 走到了再撿星星
  }
  function paintPets() {
    const G = document.getElementById('pzpets'); if (!G || !PZ) return;
    const now = Date.now(), list = Object.entries(PZ.others).filter(([s, v]) => v && now - (v.t || 0) < LIVE_MS && (!isTest(+s) || isTest(user.seat)) && PET.SPECIES[v.sp]);
    if (!list.some(([s]) => +s === PZ.seat)) list.push([String(PZ.seat), Object.assign({}, myLook(), PZ.me, { t: now })]);
    const seen = new Set();
    list.sort((a, b) => (a[1].x + a[1].y) - (b[1].x + b[1].y)).forEach(([s, v]) => {
      seen.add(s); const me = +s === PZ.seat, pos = me ? PZ.me : v, [X, Y] = PP(pos.x | 0, pos.y | 0);
      let g = G.querySelector(`[data-s="${s}"]`);
      const key = [v.sp, v.c, v.h, v.g, v.k, v.lv].join();
      if (!g || g.dataset.k !== key) {
        if (g) g.remove();
        g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'ppw pzp' + (me ? ' me' : '')); g.dataset.s = s; g.dataset.k = key;
        g.innerHTML = `<ellipse cx="0" cy="2" rx="16" ry="5" fill="#000" opacity=".12"/><svg x="-33" y="-64" width="66" height="66" viewBox="0 0 200 200" overflow="visible">${PET.petSVG(Object.assign({}, v, { mood: 'happy' }))}</svg>
          <g transform="translate(0 -70)"><rect x="-22" y="-11" width="44" height="16" rx="8" fill="${me ? '#20c997' : '#fff'}" opacity=".92"/><text y="1" text-anchor="middle" font-size="10" font-weight="900" fill="${me ? '#fff' : '#555'}">${me ? '我' : seatName(+s)}</text></g><g class="pzb"></g>`;
        g.style.transform = `translate(${X}px,${Y}px)`; G.appendChild(g);
      }
      g.style.transform = `translate(${X}px,${Y}px)`;
      const e = me ? PZ.me : v, show = e.e != null && now - (e.et || 0) < 4000, b = g.querySelector('.pzb');
      if (show) { if (b.dataset.et !== String(e.et)) { b.dataset.et = String(e.et); b.innerHTML = `<g transform="translate(0 -94)"><circle r="15" fill="#fff" stroke="#ffd8a8" stroke-width="2"/><text y="6" text-anchor="middle" font-size="17">${EMOTES[e.e] || ''}</text></g>`; const p = g.querySelector('svg'); p.classList.remove('pzhop'); void p.getBBox; p.classList.add('pzhop'); setTimeout(() => { if (b.dataset.et === String(e.et)) { b.innerHTML = ''; p.classList.remove('pzhop'); } }, 4000 - (now - e.et)); } }
    });
    G.querySelectorAll('[data-s]').forEach(g => { if (!seen.has(g.dataset.s)) g.remove(); });
    /* 依前後重新排（前面的蓋住後面的） */
    [...G.children].sort((a, b) => { const pa = a.style.transform.match(/,(-?[\d.]+)px/), pb = b.style.transform.match(/,(-?[\d.]+)px/); return (pa ? +pa[1] : 0) - (pb ? +pb[1] : 0); }).forEach(n => G.appendChild(n));
    const W = document.getElementById('pzwho'); if (W) W.innerHTML = `🎪 現在在廣場：${list.map(([s]) => `<span class="${+s === PZ.seat ? 'me' : ''}">${+s === PZ.seat ? '我' : seatName(+s)}</span>`).join('')}`;
  }
  const slotNow = () => Math.floor(Date.now() / STAR_MS);
  const starKey = (slot, k) => `${slot}_${k}`;
  function paintStars() {
    const G = document.getElementById('pzstar'); if (!G || !PZ) return; const slot = slotNow();
    G.innerHTML = starsOf(slot, PZ.D).filter(s => !PZ.starDone[starKey(slot, s.k)]).map(s => { const [X, Y] = PP(s.x, s.y); return `<g transform="translate(${X} ${Y - 12})" class="pzst"><circle r="13" fill="#fff3bf" opacity=".6"/><text y="7" text-anchor="middle" font-size="20">⭐</text></g>`; }).join('');
  }
  async function claim(x, y) {
    if (!PZ || PZ.me.x !== x || PZ.me.y !== y) return;
    const slot = slotNow(), s = starsOf(slot, PZ.D).find(s => s.x === x && s.y === y); if (!s) return;
    const key = starKey(slot, s.k); if (PZ.starDone[key]) return;
    const p = pet(), today = dkey(); p.star = p.star && p.star.d === today ? p.star : { d: today, n: 0 };
    const tip = t => { const e = document.getElementById('pztip'); if (e) e.textContent = t; };
    try {
      const r = await db.ref(`${ROOT}/pstar/${key}`).transaction(cur => cur ? undefined : String(user.seat));
      if (!r.committed) { tip('哎呀，被同學先撿走了！'); return; }
    } catch (e) { tip('撿星星失敗，再試一次'); return; }
    PZ.starDone[key] = String(user.seat); paintStars();
    if (p.star.n >= STAR_MAX) { tip(`⭐ 撿到了！（今天的金幣已經拿滿 ${STAR_MAX} 枚，明天再來）`); snd(880); return; }
    p.star.n++; p.coin = (p.coin || 0) + 1; p.u = Date.now(); saveSum(true);
    const c = document.getElementById('pkcoin'); if (c) c.textContent = coins();
    tip(`⭐ 撿到星星！🪙 +1（今天還能拿 ${STAR_MAX - p.star.n} 枚）`); try { sfx.ok(); } catch (e) { }
    PZ.me.e = 5; PZ.me.et = Date.now(); PZ.send(); paintPets();
  }

  /* ───────── 樣式 ───────── */
  const css = `
  .ptabs.pk{margin-top:.2rem;flex-wrap:wrap}.ptabs.pk button{flex:1 1 auto}.ptabs.pk button.on{color:#0ca678}
  .pkc{border-top-left-radius:0;border-top-right-radius:0}
  .pkhead{display:flex;align-items:center;gap:.8rem;margin-bottom:.4rem}.pkcoin{background:#fff9db;border:3px solid #ffe066;border-radius:16px;padding:.25rem .8rem;font-size:1.3rem;font-weight:900;color:#e67700;flex:none}
  .pktip{flex:1;font-size:1.1rem;font-weight:900;color:#0ca678}
  .pkplot{max-width:34rem;margin:0 auto;touch-action:manipulation;cursor:pointer}.pkplot.pop{animation:popin .25s}
  .plot{display:block;width:100%;height:auto}
  .plot .ppw{transition:transform 1.4s ease-in-out}
  .plot .ppw>svg>.psvg{animation:pbob 2.6s ease-in-out infinite;transform-origin:50% 92%}
  .plot .wml{animation:pkspin 6s linear infinite}.plot .swg{animation:pkswing 2.4s ease-in-out infinite}
  .plot .fwt{animation:pkfw 1.2s ease-in-out infinite}
  @keyframes pkspin{to{transform:rotate(360deg)}}
  .plot .wml,.park .pkwheel,.plot .swg{transform-box:view-box;transform-origin:0 0}
  @keyframes pkswing{0%,100%{transform:rotate(-14deg)}50%{transform:rotate(14deg)}}
  @keyframes pkfw{50%{opacity:.5;transform:translateY(-2px)}}
  .pkcats{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.8rem}.pkcats button{border:0;border-radius:14px;padding:.45rem .8rem;font-size:1.1rem;font-weight:900;background:#f1f3f5;color:#666;font-family:inherit}.pkcats button.on{background:#c3fae8;color:#087f5b}
  .pkitems{display:grid;grid-template-columns:repeat(auto-fill,minmax(6.4rem,1fr));gap:.5rem;margin-top:.6rem}
  .pkit{background:#f8fffb;border:3px solid #c3fae8;border-radius:16px;padding:.35rem .2rem;display:flex;flex-direction:column;align-items:center;font-family:inherit}
  .pkit .pkic{width:100%;height:4.2rem}.pkit b{font-size:1rem;color:#444}.pkit em{font-style:normal;font-size:.85rem;font-weight:900;color:#e67700}
  .pkit.on{border-color:#20c997;background:#e6fcf5;box-shadow:0 0 0 3px #96f2d7}.pkit.lock{opacity:.5;filter:grayscale(.6)}
  .pknote{grid-column:1/-1;font-size:1.1rem;font-weight:900;color:#0ca678;padding:.6rem}
  .pkpark{border-radius:22px;overflow:hidden;margin-bottom:.8rem}.park{display:block;width:100%;height:auto}
  .park .pkwheel{animation:pkwheel 24s linear infinite}@keyframes pkwheel{to{transform:rotate(360deg)}}
  .pkfund{background:#f3fff9;border:3px solid #c3fae8;border-radius:20px;padding:.8rem 1rem;display:flex;flex-direction:column;gap:.5rem}
  .pkft{font-size:1.3rem;font-weight:900;color:#087f5b}.pkft small{font-size:1rem;color:#888}
  .pkdon{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;font-size:1.05rem;font-weight:900;color:#555}.pkdon button{border:0;border-radius:14px;padding:.4rem .8rem;font-size:1.1rem;font-weight:900;background:#ffe066;color:#e67700;box-shadow:0 3px 0 #fcc419;font-family:inherit}.pkdon span{margin-left:auto;color:#888;font-size:.95rem}
  .pktop{font-size:.95rem;font-weight:800;color:#0ca678;display:flex;flex-wrap:wrap;gap:.3rem .8rem}.pkdone{font-size:1.2rem;font-weight:900;color:#e67700}
  .pkmap{display:grid;grid-template-columns:repeat(auto-fill,minmax(8.4rem,1fr));gap:.6rem}
  .pkcell{background:#fff;border:0;border-radius:18px;box-shadow:0 4px 0 #d3f9d8;padding:.4rem;display:flex;flex-direction:column;align-items:center;font-family:inherit}
  .pkcell.me{box-shadow:0 0 0 3px #20c997,0 4px 0 #96f2d7}.pkcell b{font-size:1.05rem;color:#087f5b;margin-top:.2rem}.pkcell small{font-size:.85rem;color:#888;font-weight:800}
  .pkvis{max-width:30rem;margin:0 auto .6rem}

  .pkb{border:0;background:#f1f3f5;border-radius:12px;font-size:1.3rem;padding:.25rem .6rem;font-family:inherit;flex:none}.pkb:active{transform:scale(.92)}
  .pktools{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.8rem}.pktools button{border:0;border-radius:14px;padding:.5rem .9rem;font-size:1.15rem;font-weight:900;background:#f1f3f5;color:#666;font-family:inherit}.pktools button.on{background:#c3fae8;color:#087f5b;box-shadow:0 0 0 3px #96f2d7}
  .pkplot{max-width:40rem;border-radius:22px;overflow:hidden}
  .plot .pkcl{animation:pkcl 40s linear infinite}@keyframes pkcl{50%{transform:translateX(40px)}}
  .plot .pkbird{animation:pkbird 9s ease-in-out infinite}@keyframes pkbird{50%{transform:translate(60px,-12px)}}
  img.plot.mini{width:100%;height:auto;display:block}
  .pkvis{border-radius:20px;overflow:hidden}

  .pzbox{max-width:46rem}.plz .pzp{transition:transform 1.2s ease-in-out}.plz .pzp.me>svg .psvg{filter:drop-shadow(0 0 4px #fff)}
  .plz .pzhop{animation:phop .5s ease-out 3}.plz .pzst{animation:pzst 1.2s ease-in-out infinite}@keyframes pzst{50%{transform:translateY(-4px)}}
  .plz .pzst{transform-box:fill-box}
  .pzem{display:flex;gap:.5rem;justify-content:center;margin-top:.7rem;flex-wrap:wrap}.pzem button{font-size:2rem;background:#fff;border:3px solid #ffe8cc;border-radius:18px;padding:.25rem .7rem;box-shadow:0 3px 0 #ffd8a8}.pzem button:active{transform:translateY(2px);box-shadow:none}
  .pzwho{margin-top:.6rem;font-size:1.05rem;font-weight:900;color:#0ca678;display:flex;flex-wrap:wrap;gap:.3rem .5rem;justify-content:center}.pzwho span{background:#e6fcf5;border-radius:10px;padding:.1rem .5rem}.pzwho span.me{background:#20c997;color:#fff}
  .pzclosed{font-size:1.3rem;font-weight:900;color:#666;text-align:center;padding:2.5rem 1rem;line-height:1.7}.pzclosed small{font-size:1rem;color:#999}
  @media (max-width:700px){.pkitems{grid-template-columns:repeat(auto-fill,minmax(5.4rem,1fr))}.pkit .pkic{height:3.4rem}.pkmap{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  window.PARK = { page, leavePlaza, starsOf, plazaDeco, plotSVG, sprite, parkSVG, OBJ, BLOCKS, FUND, S, starter, validV, validD, loadAll, fundTotal, _mode: m => { mode = m; } };
})();
