/* 601 我的寵物（第一期）
   ・第一次進來拿到一顆蛋，練習答對累積經驗，蛋就會孵化；孵化時自己選寵物、選名字
   ・練習答對：一次答對 🪙+2、經驗 +10；第二次才答對 🪙+1、經驗 +5（寵物吃飽又開心時經驗 +50%）
   ・寵物會長大：1～4 級寶寶、5～9 級少年、10 級以上成年（變大、多出特別的樣子）
   ・飽足、開心會慢慢下降；餵點心、摸摸頭、一起玩就會回來。不會生病也不會死掉
   ・金幣可以買點心、帽子、眼鏡、領結、換顏色（有些要升到某一級才能買）
   ・全班的寵物：雲端 learn/pet/座號 存外觀和等級；同學可以按貼圖按讚 learn/petlike/收的人/送的人（一天一次）
   畫法：全部是 SVG，petSVG(外觀) 回傳一段 <svg>，配件一層一層疊上去。 */
(function () {
  /* ───────── 寵物、顏色、配件 ───────── */
  const SPECIES = {
    chick: { n: '啾啾鳥', c: 1, say: '啾啾！' },
    cat: { n: '喵喵貓', c: 5, say: '喵～' },
    dragon: { n: '火火龍', c: 2, say: '呼～噴一點點火！' },
    bunny: { n: '跳跳兔', c: 0, say: '蹦蹦跳跳！' },
    blob: { n: 'QQ 果凍', c: 3, say: '咕嚕咕嚕～' },
    bear: { n: '圓圓熊', c: 7, say: '抱抱！' }
  };
  const SP_KEYS = Object.keys(SPECIES);
  const COLORS = [
    { n: '草莓粉', m: '#ffa8c5', l: '#ffe3ee', d: '#e0608f' },
    { n: '檸檬黃', m: '#ffd84d', l: '#fff4bf', d: '#d39a00' },
    { n: '薄荷綠', m: '#7fe0b8', l: '#dcfbec', d: '#2c9e74' },
    { n: '天空藍', m: '#8cc8ff', l: '#e3f2ff', d: '#3a86d4' },
    { n: '薰衣草', m: '#c3a6ff', l: '#f0e8ff', d: '#7b52d6' },
    { n: '橘子橘', m: '#ffb067', l: '#ffe8cf', d: '#dc6f17' },
    { n: '雪花白', m: '#f2f3f8', l: '#ffffff', d: '#9da3bb' },
    { n: '可可棕', m: '#c99a72', l: '#f3dfcb', d: '#86552f' }
  ];
  /* 配件：k＝種類（h 帽子、g 眼鏡、k 脖子），lv＝幾級才能買，p＝價錢 */
  const ITEMS = {
    bow: { k: 'h', n: '蝴蝶結', lv: 1, p: 20 }, flower: { k: 'h', n: '小花', lv: 2, p: 25 }, cap: { k: 'h', n: '棒球帽', lv: 3, p: 40 },
    party: { k: 'h', n: '派對帽', lv: 4, p: 45 }, beret: { k: 'h', n: '畫家帽', lv: 5, p: 55 }, tophat: { k: 'h', n: '紳士帽', lv: 7, p: 80 }, crown: { k: 'h', n: '皇冠', lv: 10, p: 150 },
    round: { k: 'g', n: '圓眼鏡', lv: 2, p: 30 }, heart: { k: 'g', n: '愛心眼鏡', lv: 4, p: 45 }, sun: { k: 'g', n: '墨鏡', lv: 6, p: 65 }, star: { k: 'g', n: '星星眼鏡', lv: 9, p: 90 },
    bowtie: { k: 'k', n: '小領結', lv: 1, p: 20 }, bell: { k: 'k', n: '鈴鐺項圈', lv: 3, p: 35 }, scarf: { k: 'k', n: '圍巾', lv: 5, p: 50 }, medal: { k: 'k', n: '金牌', lv: 8, p: 100 }
  };
  const COLOR_PRICE = 30, COLOR_LV = 3;
  const FOODS = [
    { id: 'apple', i: '🍎', n: '蘋果', p: 3, f: 20, j: 0 },
    { id: 'rice', i: '🍙', n: '飯糰', p: 6, f: 35, j: 0 },
    { id: 'milk', i: '🥛', n: '牛奶', p: 5, f: 15, j: 10 },
    { id: 'cake', i: '🍰', n: '草莓蛋糕', p: 12, f: 30, j: 20 },
    { id: 'feast', i: '🍱', n: '豪華便當', p: 18, f: 70, j: 10 }
  ];
  const NAMES = ['小布丁', '麻糬', '湯圓', '小餅乾', '奶茶', '豆花', '芒果', '布布', '泡芙', '棉花糖', '小可', '多多', '咪咪', '球球', '嘟嘟', '樂樂',
    '皮皮', '丸子', '小星', '月月', '雲朵', '珍珠', '可樂', '花生', '小米', '橘橘', '莓莓', '蜜蜜', '豆豆', '糖糖', '阿福', '旺旺', '跳跳', '小熊', '奇奇', '妞妞'];
  const STICKERS = ['👍', '❤️', '😆', '🌟', '🎉'];
  const EGG_XP = 50, START_COIN = 30, FULL_DECAY = 4, JOY_DECAY = 3, PLAY_MS = 20 * 60 * 1000;
  const xpNeed = lv => 50 + 25 * (lv - 1);                       // 這一級升下一級要多少經驗
  function lvOf(xp) { let lv = 1, x = xp; while (x >= xpNeed(lv) && lv < 99) { x -= xpNeed(lv); lv++; } return { lv, cur: x, need: xpNeed(lv) }; }
  const stageOf = lv => lv >= 10 ? 2 : lv >= 5 ? 1 : 0;           // 0 寶寶、1 少年、2 成年
  const STAGE_N = ['寶寶', '少年', '成年'];
  const night = (d = new Date()) => night.f != null ? night.f : d.getHours() >= 21 || d.getHours() < 6;   // night.f：測試用，強制白天/晚上

  /* ───────── 畫寵物 ───────── */
  let uid = 0;
  function petSVG(o) {
    const id = 'p' + (++uid), sp = SPECIES[o.sp] ? o.sp : 'chick', C = COLORS[o.c != null ? o.c : SPECIES[sp].c] || COLORS[1];
    const st = o.stage != null ? o.stage : stageOf(o.lv || 1), sc = [.8, .91, 1][st], mood = o.mood || 'ok';
    const g = [];
    /* 成年：背後一圈淡淡的光 */
    if (st === 2) g.push(`<circle cx="100" cy="118" r="84" fill="url(#${id}a)"/>`);
    g.push(`<ellipse cx="100" cy="184" rx="${46 * sc + 4}" ry="8" fill="#000" opacity=".12"/>`);
    g.push(`<g transform="translate(100 182) scale(${sc}) translate(-100 -182)">`);
    g.push(back(sp, C, st, id));
    /* 身體（麻糬形）＋肚子＋亮點 */
    const body = sp === 'blob' ? 'M100 56 C108 74 160 90 160 128 C160 160 134 178 100 178 C66 178 40 160 40 128 C40 90 92 74 100 56Z'
      : 'M100 64 C141 64 160 92 160 124 C160 158 134 178 100 178 C66 178 40 158 40 124 C40 92 59 64 100 64Z';
    g.push(`<path d="${body}" fill="url(#${id}b)" stroke="${C.d}" stroke-width="3.5" ${sp === 'blob' ? 'fill-opacity=".92"' : ''}/>`);
    if (sp !== 'blob') g.push(`<ellipse cx="100" cy="148" rx="31" ry="23" fill="${C.l}" opacity=".95"/>`);
    if (sp === 'dragon') g.push(`<path d="M80 140 H120 M78 150 H122 M82 160 H118" stroke="${C.d}" stroke-width="2.5" opacity=".35" stroke-linecap="round"/>`);
    g.push(`<ellipse cx="72" cy="88" rx="13" ry="7" fill="#fff" opacity=".55" transform="rotate(-28 72 88)"/><circle cx="88" cy="78" r="3" fill="#fff" opacity=".6"/>`);
    /* 手、腳 */
    if (sp === 'chick') g.push(`<path d="M44 124 Q26 134 36 150 Q48 146 52 134Z" fill="${C.m}" stroke="${C.d}" stroke-width="3"/><path d="M156 124 Q174 134 164 150 Q152 146 148 134Z" fill="${C.m}" stroke="${C.d}" stroke-width="3"/>`);
    else if (sp !== 'blob') g.push(`<ellipse cx="47" cy="138" rx="9" ry="13" fill="${C.m}" stroke="${C.d}" stroke-width="3" transform="rotate(25 47 138)"/><ellipse cx="153" cy="138" rx="9" ry="13" fill="${C.m}" stroke="${C.d}" stroke-width="3" transform="rotate(-25 153 138)"/>`);
    if (sp === 'chick') g.push(`<path d="M76 172 l-6 9 M80 173 v10 M84 172 l6 9 M116 172 l-6 9 M120 173 v10 M124 172 l6 9" stroke="#f08c00" stroke-width="3.5" stroke-linecap="round"/>`);
    else if (sp !== 'blob') g.push(`<ellipse cx="78" cy="176" rx="14" ry="7.5" fill="${C.m}" stroke="${C.d}" stroke-width="3"/><ellipse cx="122" cy="176" rx="14" ry="7.5" fill="${C.m}" stroke="${C.d}" stroke-width="3"/>`);
    g.push(front(sp, C, st));
    g.push(face(sp, mood));
    if (o.k && ITEMS[o.k]) g.push(acc(o.k));
    if (o.g && ITEMS[o.g]) g.push(acc(o.g));
    if (o.h && ITEMS[o.h]) g.push(acc(o.h, sp));
    g.push('</g>');
    const defs = `<defs><radialGradient id="${id}b" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="${C.l}"/><stop offset=".45" stop-color="${C.m}"/><stop offset="1" stop-color="${C.d}" stop-opacity=".85"/></radialGradient>
      <radialGradient id="${id}a"><stop offset=".55" stop-color="#fff7c2" stop-opacity=".9"/><stop offset="1" stop-color="#fff7c2" stop-opacity="0"/></radialGradient></defs>`;
    return `<svg class="psvg${o.cls ? ' ' + o.cls : ''}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">${defs}${g.join('')}</svg>`;
  }
  /* 身體後面的東西：耳朵、尾巴、翅膀 */
  function back(sp, C, st) {
    const s = (a) => `fill="${C.m}" stroke="${C.d}" stroke-width="3.5" stroke-linejoin="round" ${a || ''}`;
    if (sp === 'cat') return `<path d="M150 160 Q186 150 178 112 Q174 100 166 108 Q172 140 146 148Z" ${s()}/>
      <path d="M58 92 L62 50 L94 72Z" ${s()}/><path d="M142 92 L138 50 L106 72Z" ${s()}/><path d="M66 82 L68 60 L84 72Z" fill="#ffb3c7"/><path d="M134 82 L132 60 L116 72Z" fill="#ffb3c7"/>`;
    if (sp === 'bunny') return `<circle cx="156" cy="160" r="13" fill="#fff" stroke="${C.d}" stroke-width="3"/>
      <ellipse cx="78" cy="42" rx="14" ry="36" ${s('transform="rotate(-10 78 42)"')}/><ellipse cx="122" cy="42" rx="14" ry="36" ${s('transform="rotate(10 122 42)"')}/>
      <ellipse cx="78" cy="44" rx="6.5" ry="26" fill="#ffb3c7" transform="rotate(-10 78 44)"/><ellipse cx="122" cy="44" rx="6.5" ry="26" fill="#ffb3c7" transform="rotate(10 122 44)"/>`;
    if (sp === 'bear') return `<circle cx="62" cy="76" r="17" ${s()}/><circle cx="138" cy="76" r="17" ${s()}/><circle cx="62" cy="76" r="8.5" fill="${C.l}"/><circle cx="138" cy="76" r="8.5" fill="${C.l}"/>`;
    if (sp === 'dragon') return (st >= 1 ? `<path d="M50 112 Q14 84 20 124 Q30 118 34 132 Q40 120 50 130Z" ${s('fill-opacity=".9"')}/><path d="M150 112 Q186 84 180 124 Q170 118 166 132 Q160 120 150 130Z" ${s('fill-opacity=".9"')}/>` : '')
      + `<path d="M148 160 Q182 162 184 136 L194 140 L188 124 L176 132 Q176 150 146 148Z" ${s()}/>
      <path d="M78 70 Q70 46 82 36 Q86 54 92 66Z" fill="#fff3bf" stroke="#d9a400" stroke-width="3"/><path d="M122 70 Q130 46 118 36 Q114 54 108 66Z" fill="#fff3bf" stroke="#d9a400" stroke-width="3"/>`;
    return '';
  }
  /* 身體前面的東西：鳥嘴、鬍鬚、鼻子、頭上的毛 */
  function front(sp, C, st) {
    if (sp === 'chick') return `<path d="M100 66 Q92 46 100 40 Q104 54 104 66 M100 66 Q110 44 120 46 Q108 56 104 68" fill="${C.m}" stroke="${C.d}" stroke-width="3" stroke-linejoin="round"/>${st === 2 ? `<path d="M96 64 Q80 44 88 36 Q96 50 100 62Z" fill="#ff8787" stroke="#e03131" stroke-width="2.5"/>` : ''}`;
    if (sp === 'cat') return `<path d="M58 124 H40 M58 131 L42 136 M142 124 H160 M142 131 L158 136" stroke="${C.d}" stroke-width="2.5" stroke-linecap="round" opacity=".7"/><path d="M100 70 v8 M92 72 l2 6 M108 72 l-2 6" stroke="${C.d}" stroke-width="3" stroke-linecap="round" opacity=".45"/>`;
    if (sp === 'bear') return `<ellipse cx="100" cy="129" rx="19" ry="13" fill="${C.l}"/>`;
    if (sp === 'blob') return `<path d="M100 58 Q96 44 86 42 Q90 52 100 58 Q104 44 116 40 Q112 54 100 58Z" fill="#69db7c" stroke="#2f9e44" stroke-width="2.5"/>${st >= 1 ? '<circle cx="132" cy="96" r="5" fill="#fff" opacity=".7"/>' : ''}<ellipse cx="128" cy="150" rx="9" ry="5" fill="#fff" opacity=".35"/>`;
    if (sp === 'bunny') return `<path d="M96 120 Q100 124 104 120" stroke="#e64980" stroke-width="3" fill="#ff8fab"/>`;
    return '';
  }
  /* 臉：心情不一樣，眼睛、嘴巴不一樣 */
  function face(sp, mood) {
    const ink = '#2b2b3a', out = [];
    out.push(`<ellipse cx="64" cy="126" rx="10" ry="6" fill="#ff8fab" opacity=".55"/><ellipse cx="136" cy="126" rx="10" ry="6" fill="#ff8fab" opacity=".55"/>`);
    if (mood === 'happy') out.push(`<path d="M70 114 Q80 102 90 114 M110 114 Q120 102 130 114" stroke="${ink}" stroke-width="5" fill="none" stroke-linecap="round"/>`);
    else if (mood === 'sleep') out.push(`<path d="M70 112 Q80 119 90 112 M110 112 Q120 119 130 112" stroke="${ink}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`);
    else {
      out.push(`<g class="peye"><ellipse cx="80" cy="112" rx="8" ry="10" fill="${ink}"/><ellipse cx="120" cy="112" rx="8" ry="10" fill="${ink}"/>
        <circle cx="77" cy="107.5" r="3.2" fill="#fff"/><circle cx="117" cy="107.5" r="3.2" fill="#fff"/><circle cx="83" cy="116" r="1.5" fill="#fff"/><circle cx="123" cy="116" r="1.5" fill="#fff"/></g>`);
      if (mood === 'sad') out.push(`<path d="M68 98 L86 102 M132 98 L114 102" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`);
    }
    if (sp === 'chick') out.push(`<path d="M92 123 L100 117 L108 123 L100 131Z" fill="#ffa94d" stroke="#e8590c" stroke-width="2.5" stroke-linejoin="round"/>`);
    else {
      if (sp === 'bear') out.push(`<ellipse cx="100" cy="123" rx="6" ry="4.5" fill="${ink}"/>`);
      if (mood === 'happy') out.push(`<path d="M88 128 Q100 146 112 128Z" fill="#c2255c" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><path d="M94 135 Q100 142 106 135" fill="#ff8fab"/>`);
      else if (mood === 'sad') out.push(`<path d="M91 136 Q100 128 109 136" stroke="${ink}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`);
      else if (mood === 'sleep') out.push(`<ellipse cx="100" cy="133" rx="4" ry="5" fill="${ink}" opacity=".8"/>`);
      else if (sp !== 'bunny') out.push(`<path d="M90 129 Q95 135 100 129 Q105 135 110 129" stroke="${ink}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
    return out.join('');
  }
  /* 配件 */
  function acc(k, sp) {
    const hy = sp === 'bunny' ? 4 : sp === 'blob' ? -4 : 0;   // 帽子往上下移一點
    switch (k) {
      case 'bow': return `<g transform="translate(128 ${74 + hy}) rotate(15)"><path d="M0 0 L-20 -12 Q-24 0 -20 12Z M0 0 L20 -12 Q24 0 20 12Z" fill="#ff6b9a" stroke="#c2255c" stroke-width="2.5" stroke-linejoin="round"/><circle r="6" fill="#ff8fab" stroke="#c2255c" stroke-width="2.5"/></g>`;
      case 'flower': return `<g transform="translate(130 ${76 + hy})">${[0, 72, 144, 216, 288].map(a => `<circle cx="${10 * Math.cos(a * Math.PI / 180)}" cy="${10 * Math.sin(a * Math.PI / 180)}" r="8" fill="#ffc9de" stroke="#f06595" stroke-width="2"/>`).join('')}<circle r="6" fill="#ffd43b" stroke="#f59f00" stroke-width="2"/></g>`;
      case 'cap': return `<g transform="translate(0 ${hy})"><path d="M62 84 Q64 46 100 46 Q136 46 138 84Z" fill="#4dabf7" stroke="#1c7ed6" stroke-width="3"/><path d="M132 80 Q162 78 168 88 Q150 92 130 88Z" fill="#339af0" stroke="#1c7ed6" stroke-width="3" stroke-linejoin="round"/><path d="M100 46 V84" stroke="#1c7ed6" stroke-width="2" opacity=".5"/><circle cx="100" cy="46" r="5" fill="#fff" stroke="#1c7ed6" stroke-width="2"/></g>`;
      case 'party': return `<g transform="translate(0 ${hy})"><path d="M80 76 L104 22 L124 74 Q102 82 80 76Z" fill="#b197fc" stroke="#7048e8" stroke-width="3" stroke-linejoin="round"/><path d="M88 60 L116 56 M95 42 L110 40" stroke="#ffd43b" stroke-width="5" stroke-linecap="round"/><circle cx="104" cy="22" r="7" fill="#ff8787" stroke="#e03131" stroke-width="2.5"/></g>`;
      case 'beret': return `<g transform="translate(0 ${hy})"><path d="M60 76 Q58 52 98 50 Q140 48 142 70 Q120 80 60 76Z" fill="#e03131" stroke="#a51111" stroke-width="3"/><path d="M98 50 L100 40" stroke="#a51111" stroke-width="4" stroke-linecap="round"/></g>`;
      case 'tophat': return `<g transform="translate(0 ${hy})"><rect x="76" y="28" width="48" height="44" rx="6" fill="#343a40" stroke="#212529" stroke-width="3"/><rect x="76" y="58" width="48" height="9" fill="#e64980"/><ellipse cx="100" cy="73" rx="38" ry="8" fill="#495057" stroke="#212529" stroke-width="3"/><rect x="84" y="34" width="6" height="18" rx="3" fill="#fff" opacity=".25"/></g>`;
      case 'crown': return `<g transform="translate(0 ${hy})"><path d="M70 76 L68 40 L84 56 L100 32 L116 56 L132 40 L130 76Z" fill="#ffd43b" stroke="#e67700" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="62" r="6" fill="#ff6b6b" stroke="#c92a2a" stroke-width="2"/><circle cx="80" cy="66" r="4" fill="#4dabf7"/><circle cx="120" cy="66" r="4" fill="#69db7c"/><circle cx="68" cy="40" r="4" fill="#ffe066" stroke="#e67700" stroke-width="2"/><circle cx="100" cy="32" r="4" fill="#ffe066" stroke="#e67700" stroke-width="2"/><circle cx="132" cy="40" r="4" fill="#ffe066" stroke="#e67700" stroke-width="2"/></g>`;
      case 'round': return `<g fill="#fff" fill-opacity=".18" stroke="#5c4033" stroke-width="3.5"><circle cx="80" cy="112" r="15"/><circle cx="120" cy="112" r="15"/><path d="M95 110 Q100 105 105 110" fill="none"/></g>`;
      case 'heart': return `<g fill="#ff6b9a" fill-opacity=".75" stroke="#c2255c" stroke-width="3" stroke-linejoin="round">${[80, 120].map(x => `<path d="M${x} 124 L${x - 15} 110 Q${x - 18} 98 ${x - 8} 98 Q${x - 2} 98 ${x} 104 Q${x + 2} 98 ${x + 8} 98 Q${x + 18} 98 ${x + 15} 110Z"/>`).join('')}<path d="M95 108 H105" fill="none"/></g>`;
      case 'sun': return `<g><path d="M62 104 Q62 100 66 100 H94 Q98 100 97 104 L95 118 Q94 124 88 124 H72 Q64 124 63 118Z M138 104 Q138 100 134 100 H106 Q102 100 103 104 L105 118 Q106 124 112 124 H128 Q136 124 137 118Z" fill="#212529" stroke="#000" stroke-width="2"/><path d="M97 105 H103" stroke="#000" stroke-width="3"/><path d="M68 106 L76 106 M110 106 L118 106" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/></g>`;
      case 'star': return `<g fill="#ffd43b" fill-opacity=".85" stroke="#e67700" stroke-width="2.5" stroke-linejoin="round">${[80, 120].map(x => `<path d="${starPath(x, 112, 17, 8)}"/>`).join('')}<path d="M96 110 H104" fill="none"/></g>`;
      case 'bowtie': return `<g transform="translate(100 154)"><path d="M0 0 L-18 -10 Q-21 0 -18 10Z M0 0 L18 -10 Q21 0 18 10Z" fill="#ff6b6b" stroke="#c92a2a" stroke-width="2.5" stroke-linejoin="round"/><circle r="5" fill="#ff8787" stroke="#c92a2a" stroke-width="2.5"/></g>`;
      case 'bell': return `<g><path d="M62 148 Q100 162 138 148" stroke="#e03131" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="100" cy="160" r="9" fill="#ffd43b" stroke="#e67700" stroke-width="2.5"/><path d="M95 162 H105" stroke="#e67700" stroke-width="2"/><circle cx="97" cy="157" r="2" fill="#fff"/></g>`;
      case 'scarf': return `<g><path d="M58 142 Q100 160 142 142 L144 154 Q100 172 56 154Z" fill="#ff8787" stroke="#e03131" stroke-width="3" stroke-linejoin="round"/><path d="M122 156 L130 186 L116 184 L112 158Z" fill="#ff8787" stroke="#e03131" stroke-width="3" stroke-linejoin="round"/><path d="M72 152 L76 146 M88 156 L91 150 M104 157 L106 151" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/></g>`;
      case 'medal': return `<g><path d="M86 140 L100 162 L114 140" stroke="#4dabf7" stroke-width="7" fill="none" stroke-linejoin="round"/><circle cx="100" cy="166" r="11" fill="#ffd43b" stroke="#e67700" stroke-width="2.5"/><path d="${starPath(100, 166, 6.5, 3)}" fill="#fff3bf"/></g>`;
    }
    return '';
  }
  function starPath(cx, cy, R, r) { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1); } return d + 'Z'; }
  /* 一個配件單獨畫在小框框裡（商店用） */
  function itemSVG(k) {
    const I = ITEMS[k], VB = { bow: '100 50 56 48', flower: '106 52 48 48', bowtie: '72 134 56 40' };   // 小配件放大一點
    const vb = VB[k] || (I.k === 'h' ? '50 18 120 80' : I.k === 'g' ? '55 88 90 46' : '50 132 100 58');
    return `<svg class="isvg" viewBox="${vb}">${acc(k)}</svg>`;
  }
  /* 蛋：p＝孵化進度 0～1，越接近孵化裂痕越多 */
  function eggSVG(p, cls) {
    const id = 'e' + (++uid), cr = [];
    if (p >= .3) cr.push('M76 96 l8 6 l-4 8 l9 5');
    if (p >= .6) cr.push('M126 110 l-8 4 l5 8 l-9 6');
    if (p >= .9) cr.push('M92 70 l6 8 l8 -4 l6 7');
    return `<svg class="psvg${cls ? ' ' + cls : ''}" viewBox="0 0 200 200"><defs><radialGradient id="${id}" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#fffdf5"/><stop offset=".6" stop-color="#ffeec2"/><stop offset="1" stop-color="#f2c46d"/></radialGradient></defs>
      <ellipse cx="100" cy="182" rx="44" ry="8" fill="#000" opacity=".12"/>
      <path d="M100 32 C140 32 158 98 158 128 C158 162 132 180 100 180 C68 180 42 162 42 128 C42 98 60 32 100 32Z" fill="url(#${id})" stroke="#d9a441" stroke-width="3.5"/>
      <circle cx="78" cy="132" r="11" fill="#ffa8c5" opacity=".75"/><circle cx="124" cy="146" r="8" fill="#8cc8ff" opacity=".8"/><circle cx="120" cy="84" r="9" fill="#7fe0b8" opacity=".8"/><circle cx="90" cy="160" r="6" fill="#ffd84d"/><circle cx="96" cy="100" r="5" fill="#c3a6ff"/>
      <ellipse cx="78" cy="70" rx="11" ry="6" fill="#fff" opacity=".7" transform="rotate(-30 78 70)"/>
      ${cr.length ? `<path d="${cr.join(' ')}" stroke="#a0722a" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : ''}</svg>`;
  }

  /* ───────── 資料 ───────── */
  /* 自己的寵物存在 sum.pet（跟著摘要一起上傳、換平板也在）
     {st:'egg'|'pet', ex:蛋的經驗, sp, nm, xp, coin, full, ft, joy, jt, c, h, g, k, own:{配件:1}, cols:{顏色:1}, pt:上次玩的時間, pat:{h:哪一小時, n:摸了幾次}, u:更新時間} */
  function P() {
    if (!sum) return null;
    if (!sum.pet) sum.pet = { st: 'egg', ex: 0, coin: START_COIN, xp: 0, own: {}, cols: {}, u: Date.now() };
    return sum.pet;
  }
  const hours = t => t ? Math.max(0, (Date.now() - t) / 3600e3) : 0;
  const fullNow = p => Math.max(0, Math.round((p.full ?? 80) - hours(p.ft) * FULL_DECAY));
  const joyNow = p => Math.max(0, Math.round((p.joy ?? 80) - hours(p.jt) * JOY_DECAY));
  const setFull = (p, v) => { p.full = Math.max(0, Math.min(100, v)); p.ft = Date.now(); };
  const setJoy = (p, v) => { p.joy = Math.max(0, Math.min(100, v)); p.jt = Date.now(); };
  const cared = p => p.st === 'pet' && fullNow(p) >= 50 && joyNow(p) >= 50;
  function moodOf(p) { if (night()) return 'sleep'; const f = fullNow(p), j = joyNow(p); return f < 25 || j < 25 ? 'sad' : f >= 60 && j >= 60 ? 'happy' : 'ok'; }
  function look(p, extra) { return Object.assign({ sp: p.sp, c: p.c, h: p.h, g: p.g, k: p.k, lv: lvOf(p.xp || 0).lv }, extra || {}); }
  function save(p) { p.u = Date.now(); saveSum(true); pub(p); }
  /* 公開給同學看的樣子：有變才上傳 */
  function pub(p) {
    if (!user || !p || p.st !== 'pet') return;
    const v = { sp: p.sp, nm: p.nm | 0, lv: lvOf(p.xp || 0).lv, c: p.c | 0, h: p.h || '', g: p.g || '', k: p.k || '' }, key = JSON.stringify(v);
    if (LS.get('learn601_petpub_' + user.seat, '') === key) return;
    LS.set('learn601_petpub_' + user.seat, key); enqueue(`${ROOT}/pet/${user.seat}`, Object.assign({ t: Date.now() }, v), true);
  }

  /* 練習答完一題（learn.html 的 finish 會呼叫）：回傳拿到的金幣 */
  const GAIN = { ok: [2, 10], ok2: [1, 5] };
  function gain(res) {
    const G = GAIN[res], p = P(); if (!G || !p) return 0;
    p.coin = (p.coin || 0) + G[0];
    if (round) round.pc = (round.pc || 0) + G[0];
    if (p.st === 'egg') {
      const was = p.ex || 0; p.ex = was + G[1];
      if (was < EGG_XP && p.ex >= EGG_XP) toast('🥚 你的蛋在動了！快去「寵物」看看');
    } else {
      const xp = Math.round(G[1] * (cared(p) ? 1.5 : 1)), b = lvOf(p.xp || 0).lv;
      p.xp = (p.xp || 0) + xp; if (round) round.px = (round.px || 0) + xp;
      const a = lvOf(p.xp).lv;
      if (a > b) {
        const un = Object.entries(ITEMS).filter(([, I]) => I.lv > b && I.lv <= a).map(([, I]) => I.n);
        setTimeout(() => { toast(`🎉 ${NAMES[p.nm | 0]}升到 Lv.${a}！` + (stageOf(a) > stageOf(b) ? `長成${STAGE_N[stageOf(a)]}了！` : '') + (un.length ? `　可以買：${un.join('、')}` : '')); try { sfx.ticket(); confetti(50); } catch (e) { } }, 900);
      }
    }
    p.u = Date.now(); pub(p);
    return G[0];
  }
  function endMsg() {
    const c = round && round.pc || 0; if (!c) return '';
    const p = P();
    return `<div class="tkget petend">🪙 拿到 ${c} 枚金幣${round.px ? `・${p ? NAMES[p.nm | 0] : '寵物'}經驗 +${round.px}` : p && p.st === 'egg' ? `・🥚 孵蛋進度 ${Math.min(100, Math.round((p.ex || 0) / EGG_XP * 100))}%` : ''}</div>`;
  }

  /* ───────── 首頁的小卡片 ───────── */
  function homeCard() {
    const p = P(), c = el('button', 'cd', ''); c.id = 'petmini';
    if (p.st === 'egg') {
      const pr = Math.min(1, (p.ex || 0) / EGG_XP);
      c.innerHTML = `<div class="pmv">${eggSVG(pr, pr >= 1 ? 'wob' : '')}</div><div class="pmi"><div class="pmt">🐾 我的寵物</div>
        <div class="pms">${pr >= 1 ? '🥚 蛋在動了！點我孵化' : `答對題目就能孵蛋（${Math.round(pr * 100)}%）`}</div><div class="pbar s"><i style="width:${pr * 100}%;background:linear-gradient(90deg,#ffd43b,#ff922b)"></i></div></div><span class="pgo">▶</span>`;
    } else {
      const L = lvOf(p.xp || 0);
      c.innerHTML = `<div class="pmv">${petSVG(look(p, { mood: moodOf(p) }))}</div><div class="pmi"><div class="pmt">🐾 ${NAMES[p.nm | 0]} <small>Lv.${L.lv}</small></div>
        <div class="pmb"><span>🍙</span><div class="pbar s"><i class="f" style="width:${fullNow(p)}%"></i></div><span>💖</span><div class="pbar s"><i class="j" style="width:${joyNow(p)}%"></i></div></div>
        <div class="pms">🪙 ${p.coin || 0}　${moodLine(p, true)}</div></div><span class="pgo">▶</span>`;
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
    const L = lvOf(p.xp || 0), st = stageOf(L.lv);
    const S = el('div', 'cd pstage' + (night() ? ' night' : '')); S.id = 'pstage';
    S.innerHTML = `${roomSVG()}<div class="ptag"><b>${NAMES[p.nm | 0]}</b><small>${SPECIES[p.sp].n}・${STAGE_N[st]}</small></div><div class="pcoin">🪙 <b id="pcoin">${p.coin || 0}</b></div>
      <div class="pbub" id="pbub">${moodLine(p)}</div><div class="ppet" id="ppet">${petSVG(look(p, { mood: moodOf(p), cls: 'big' }))}</div><div id="pfx"></div><div id="plikes"></div>`;
    Pn.appendChild(S);
    tap(S.querySelector('#ppet'), () => act('pat'));
    /* 狀態 */
    const B = el('div', 'cd pstat');
    B.innerHTML = `<div class="prow"><span class="pl">Lv.${L.lv}</span><div class="pbar x"><i style="width:${L.cur / L.need * 100}%"></i><b>經驗 ${L.cur} / ${L.need}</b></div></div>
      <div class="prow"><span class="pl">🍙 飽足</span><div class="pbar"><i class="f" id="pbf" style="width:${fullNow(p)}%"></i><b id="pbft">${fullNow(p)}</b></div></div>
      <div class="prow"><span class="pl">💖 開心</span><div class="pbar"><i class="j" id="pbj" style="width:${joyNow(p)}%"></i><b id="pbjt">${joyNow(p)}</b></div></div>
      <div class="pcare" id="pcare">${careLine(p)}</div>`;
    Pn.appendChild(B);
    const A = el('div', 'pacts');
    [['pat', '🖐️', '摸摸頭'], ['play', '⚽', '一起玩'], ['food', '🍽️', '餵點心'], ['wear', '👒', '換造型'], ['name', '✏️', '改名字']].forEach(([k, i, n]) => {
      const b = el('button', 'pact', `<span>${i}</span>${n}`); b.dataset.k = k;
      tap(b, () => { if (k === 'food' || k === 'wear') { tab = k; paintTab(); document.getElementById('ptabs').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } else if (k === 'name') pickName(false); else act(k); });
      A.appendChild(b);
    });
    Pn.appendChild(A); paintPlay();
    /* 分頁：點心、造型、全班的寵物 */
    const T = el('div', 'ptabs'); T.id = 'ptabs';
    [['food', '🍽️ 點心'], ['wear', '👒 衣櫃'], ['class', '🐾 全班的寵物']].forEach(([k, n]) => { const b = el('button', '', n); b.dataset.k = k; tap(b, () => { tab = k; paintTab(); }); T.appendChild(b); });
    Pn.appendChild(T);
    const C = el('div', 'cd ptab'); C.id = 'ptab'; Pn.appendChild(C); paintTab();
    Pn.appendChild(el('div', 'phow', '💡 練習時一次就答對：🪙+2、經驗 +10；第二次才答對：🪙+1、經驗 +5。寵物吃飽又開心時，經驗再多 50%！'));
    loadLikes();
    clearInterval(page.t); page.t = setInterval(() => { if (view !== 'pet' || !document.getElementById('pstage')) return clearInterval(page.t); refresh(); }, 60000);
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
    if (cared(p)) return '✨ 吃飽又開心：練習經驗 +50%！';
    const f = fullNow(p), j = joyNow(p);
    return `再讓${NAMES[p.nm | 0]}${f < 50 ? '吃飽一點' : ''}${f < 50 && j < 50 ? '、' : ''}${j < 50 ? '開心一點' : ''}，練習經驗就會 +50%`;
  }
  function refresh() {
    const p = P(), s = document.getElementById('pstage'); if (!s || p.st !== 'pet') return;
    const f = fullNow(p), j = joyNow(p), q = id => document.getElementById(id);
    q('pbf').style.width = f + '%'; q('pbft').textContent = f; q('pbj').style.width = j + '%'; q('pbjt').textContent = j;
    q('pcoin').textContent = p.coin || 0; q('pcare').textContent = careLine(p);
    q('ppet').innerHTML = petSVG(look(p, { mood: q('ppet').dataset.mood || moodOf(p), cls: 'big' }));
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
  function act(k) {
    const p = P(); if (p.st !== 'pet') return;
    if (night() && k !== 'pat') { say('😴 噓…牠在睡覺，明天早上再一起玩吧', 2500); return; }
    if (k === 'pat') {
      const hr = Math.floor(Date.now() / 3600e3); if (!p.pat || p.pat.h !== hr) p.pat = { h: hr, n: 0 };
      p.pat.n++; if (p.pat.n <= 10) setJoy(p, joyNow(p) + 2);
      fx('💗', 'heart', 3); bounce('squish', night() ? 'sleep' : 'happy', 900);
      say(night() ? '呼嚕…Zzz' : pick2(['嘿嘿，好舒服～', '再摸一下！', '我好喜歡你喔！', SPECIES[p.sp].say]), 2200);
      tone2(880, .08); save(p);
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
    const S = document.getElementById('pstage'), e = el('div', 'pfood', F.i); S.appendChild(e); setTimeout(() => e.remove(), 1100);
    setTimeout(() => { bounce('nom', 'happy', 1200); fx('😋', 'heart', 1); }, 700);
    say(pick2(['好好吃！', '謝謝你！', '嗯～最喜歡' + F.n + '了！']), 2300); tone2(520, .08); setTimeout(() => tone2(780, .1), 150);
    save(p); refresh(); paintTab();
  }
  function paintTab() {
    const C = document.getElementById('ptab'), p = P(); if (!C) return;
    document.querySelectorAll('#ptabs button').forEach(b => b.classList.toggle('on', b.dataset.k === tab));
    const L = lvOf(p.xp || 0).lv;
    if (tab === 'food') {
      C.innerHTML = '<div class="pgrid"></div>'; const G = C.firstChild;
      FOODS.forEach(F => { const b = el('button', 'pitem' + ((p.coin || 0) < F.p ? ' poor' : ''), `<span class="fi">${F.i}</span><b>${F.n}</b><small>🍙+${F.f}${F.j ? ` 💖+${F.j}` : ''}</small><em>🪙 ${F.p}</em>`); tap(b, () => feed(F)); G.appendChild(b); });
    } else if (tab === 'wear') {
      const own = p.own || {};
      let h = '';
      [['h', '👒 帽子'], ['g', '👓 眼鏡'], ['k', '🎀 脖子']].forEach(([k, n]) => {
        h += `<div class="psec">${n}</div><div class="pgrid">`;
        Object.entries(ITEMS).filter(([, I]) => I.k === k).forEach(([id, I]) => {
          const on = p[k] === id, has = own[id], lock = L < I.lv;
          h += `<button class="pitem w${on ? ' on' : ''}${lock ? ' lock' : ''}" data-i="${id}">${itemSVG(id)}<b>${I.n}</b><em>${on ? '✅ 穿著' : has ? '換上' : lock ? `🔒 Lv.${I.lv}` : `🪙 ${I.p}`}</em></button>`;
        });
        h += '</div>';
      });
      h += `<div class="psec">🎨 顏色 <small>${L < COLOR_LV ? `Lv.${COLOR_LV} 可以換顏色` : `一種 🪙 ${COLOR_PRICE}`}</small></div><div class="pgrid cols">`;
      COLORS.forEach((c, i) => { const cur = (p.c != null ? p.c : SPECIES[p.sp].c) === i, has = cur || (p.cols || {})[i] || i === SPECIES[p.sp].c; h += `<button class="pcol${cur ? ' on' : ''}${L < COLOR_LV && !has ? ' lock' : ''}" data-c="${i}" style="--m:${c.m};--d:${c.d}"><i></i><small>${c.n}</small><em>${cur ? '✅' : has ? '換上' : `🪙${COLOR_PRICE}`}</em></button>`; });
      C.innerHTML = h + '</div>';
      C.querySelectorAll('[data-i]').forEach(b => tap(b, () => wear(b.dataset.i)));
      C.querySelectorAll('[data-c]').forEach(b => tap(b, () => paint(+b.dataset.c)));
    } else classPets(C);
  }
  function wear(id) {
    const p = P(), I = ITEMS[id], L = lvOf(p.xp || 0).lv; p.own = p.own || {};
    if (p[I.k] === id) { p[I.k] = ''; save(p); refresh(); paintTab(); return; }   // 再點一次＝脫下來
    if (!p.own[id]) {
      if (L < I.lv) { say(`升到 Lv.${I.lv} 才能買${I.n}喔！`, 2200); return; }
      if ((p.coin || 0) < I.p) { say(`金幣不夠…還差 ${I.p - (p.coin || 0)} 枚`, 2200); return; }
      if (!confirm(`用 ${I.p} 枚金幣買「${I.n}」嗎？`)) return;
      p.coin -= I.p; p.own[id] = 1; try { sfx.ticket(); } catch (e) { }
    }
    p[I.k] = id; save(p); refresh(); paintTab(); bounce('spin', 'happy', 1000); fx('✨', 'star', 4); say(pick2(['好看嗎？', '我變漂亮了！', '酷吧！']), 2200);
  }
  function paint(i) {
    const p = P(), L = lvOf(p.xp || 0).lv, cur = p.c != null ? p.c : SPECIES[p.sp].c; p.cols = p.cols || {};
    if (cur === i) return;
    const has = p.cols[i] || i === SPECIES[p.sp].c;
    if (!has) {
      if (L < COLOR_LV) { say(`升到 Lv.${COLOR_LV} 才能換顏色喔！`, 2200); return; }
      if ((p.coin || 0) < COLOR_PRICE) { say(`金幣不夠…還差 ${COLOR_PRICE - (p.coin || 0)} 枚`, 2200); return; }
      if (!confirm(`用 ${COLOR_PRICE} 枚金幣換成「${COLORS[i].n}」嗎？`)) return;
      p.coin -= COLOR_PRICE; p.cols[i] = 1;
    }
    p.c = i; save(p); refresh(); paintTab(); bounce('spin', 'happy', 1000); fx('🎨', 'star', 3);
  }

  /* ───────── 蛋、孵化 ───────── */
  function eggPage(Pn, p) {
    const pr = Math.min(1, (p.ex || 0) / EGG_XP), S = el('div', 'cd pstage egg' + (night() ? ' night' : '')); S.id = 'pstage';
    const left = Math.max(0, Math.ceil((EGG_XP - (p.ex || 0)) / 10));
    S.innerHTML = `${roomSVG()}<div class="pcoin">🪙 <b>${p.coin || 0}</b></div><div class="pbub">${pr >= 1 ? '喀啦喀啦…裡面有東西在動！點一下蛋！' : '這是一顆神奇的蛋，答對題目就能讓牠長大孵化！'}</div>
      <div class="ppet" id="ppet">${eggSVG(pr, 'big' + (pr >= 1 ? ' wob' : ''))}</div><div id="pfx"></div>`;
    Pn.appendChild(S);
    const B = el('div', 'cd pstat');
    B.innerHTML = `<div class="prow"><span class="pl">🥚 孵化</span><div class="pbar x"><i style="width:${pr * 100}%;background:linear-gradient(90deg,#ffd43b,#ff922b)"></i><b>${Math.round(pr * 100)}%</b></div></div>
      <div class="pcare">${pr >= 1 ? '👆 點一下蛋，看看裡面是誰！' : `再一次答對 ${left} 題左右就會孵化（第二次才答對也算一半）`}</div>`;
    Pn.appendChild(B);
    if (pr < 1) { const g = el('button', 'go pgo2', '✏️ 去練習孵蛋 ▶'); tap(g, () => startPractice((mixOf(subj) || MIX).key)); Pn.appendChild(g); }
    else tap(S.querySelector('#ppet'), () => hatch());
    Pn.appendChild(el('div', 'phow', '💡 孵化以後可以自己選寵物、取名字。練習答對還會拿到 🪙 金幣，可以買點心和漂亮的衣服！'));
  }
  function hatch() {
    const w = document.getElementById('ppet'); if (!w || hatch.busy) return; hatch.busy = 1;
    w.classList.add('shake'); tone2(400, .1); setTimeout(() => tone2(500, .1), 300); setTimeout(() => tone2(650, .1), 600);
    setTimeout(() => { hatch.busy = 0; const f = el('div', 'pflash'); document.body.appendChild(f); setTimeout(() => f.remove(), 900); pickSpecies(); }, 1300);
  }
  function modal(html) { closeModal(); mod = el('div', 'pmod', `<div class="pmc">${html}</div>`); document.body.appendChild(mod); return mod; }
  function closeModal() { if (mod) mod.remove(); mod = null; }
  function pickSpecies() {
    const m = modal(`<div class="pmh">🎉 蛋裂開了！你想要哪一隻寵物？</div><div class="pspg">${SP_KEYS.map(k => `<button data-s="${k}">${petSVG({ sp: k, lv: 1, mood: 'happy' })}<b>${SPECIES[k].n}</b></button>`).join('')}</div>`);
    m.querySelectorAll('[data-s]').forEach(b => tap(b, () => { const p = P(); p.sp = b.dataset.s; pickName(true); }));
  }
  function pickName(first) {
    const p = P(), m = modal(`<div class="pmh">${first ? '幫你的寵物取個名字吧！' : '要改成什麼名字？'}</div><div class="pnow">${petSVG(look(p, { mood: 'happy', lv: first ? 1 : lvOf(p.xp || 0).lv }))}</div>
      <div class="png">${NAMES.map((n, i) => `<button data-n="${i}" class="${!first && (p.nm | 0) === i ? 'on' : ''}">${n}</button>`).join('')}</div>${first ? '' : '<button class="gray pmx">取消</button>'}`);
    m.querySelectorAll('[data-n]').forEach(b => tap(b, () => {
      const p = P(); p.nm = +b.dataset.n;
      if (first) { p.st = 'pet'; p.xp = 0; setFull(p, 80); setJoy(p, 80); p.c = SPECIES[p.sp].c; try { sfx.win(); confetti(120); } catch (e) { } toast(`🐣 歡迎 ${NAMES[p.nm]}！以後要一起努力喔！`); }
      save(p); closeModal(); render();
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
    C.innerHTML = `<div class="psec">全班 ${list.length + (p.st === 'pet' ? 1 : 0)} 隻寵物・點一下可以送貼圖給牠 <small>（一天一次）</small></div><div class="pcls">${list.map(x => `<button data-s="${x.s}">${petSVG(Object.assign({}, x.v, { mood: 'ok' }))}<b>${NAMES[x.v.nm | 0] || ''}</b><small>${seatName(x.s)}・Lv.${x.v.lv | 0}</small></button>`).join('')}</div>`;
    C.querySelectorAll('[data-s]').forEach(b => tap(b, () => visit(+b.dataset.s, R.v[b.dataset.s])));
  }
  const allSeats2 = () => [...SEATS.flat(), ...(user && isTest(user.seat) ? TEST_SEATS : [])];
  function visit(s, v) {
    const sent = LS.get('learn601_petlk_' + user.seat, {}), today = dkey(), done = sent[s] === today;
    const m = modal(`<div class="pmh">${seatName(s)}的 ${NAMES[v.nm | 0]}　<small>${SPECIES[v.sp].n}・Lv.${v.lv | 0}</small></div><div class="pnow vis">${petSVG(Object.assign({}, v, { mood: 'happy' }))}</div>
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
  .psvg{display:block;width:100%;height:100%;overflow:visible}
  .psvg .peye{transform-box:fill-box;transform-origin:center;animation:pblink 4.5s infinite}
  @keyframes pblink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
  .psvg.wob{animation:pwob 1.2s ease-in-out infinite;transform-origin:50% 90%}
  @keyframes pwob{0%,100%{transform:rotate(0)}20%{transform:rotate(-7deg)}40%{transform:rotate(6deg)}60%{transform:rotate(-4deg)}80%{transform:rotate(2deg)}}
  #petmini{display:flex;align-items:center;gap:.9rem;width:100%;margin-top:1rem;text-align:left;border:0;background:linear-gradient(135deg,#fff,#fff0f6);cursor:pointer;font-family:inherit}
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
  .pstage .proom{position:absolute;inset:0;width:100%;height:100%}
  .pstage .ppet{position:absolute;left:50%;bottom:2%;width:min(21rem,74%,48vh);height:min(21rem,74%,48vh);transform:translateX(-50%);cursor:pointer;touch-action:manipulation}
  .pstage .ppet>.psvg{animation:pbob 2.6s ease-in-out infinite;transform-origin:50% 92%}
  .pstage.night .ppet>.psvg{animation:pbreath 3.6s ease-in-out infinite}
  @keyframes pbob{0%,100%{transform:translateY(0) scale(1,1)}50%{transform:translateY(-6px) scale(.98,1.02)}}
  @keyframes pbreath{0%,100%{transform:scale(1,1)}50%{transform:scale(1.03,.97)}}
  .ppet.squish>.psvg{animation:psq .5s ease-out 2!important}
  @keyframes psq{0%{transform:scale(1,1)}40%{transform:scale(1.12,.86)}70%{transform:scale(.95,1.06)}100%{transform:scale(1,1)}}
  .ppet.hop>.psvg,.pnow.hop>.psvg{animation:phop .55s ease-out 2!important}
  @keyframes phop{0%,100%{transform:translateY(0)}40%{transform:translateY(-34px) scale(.96,1.05)}80%{transform:translateY(0) scale(1.08,.92)}}
  .ppet.spin>.psvg{animation:pspin .8s ease-in-out!important}
  @keyframes pspin{0%{transform:rotateY(0)}100%{transform:rotateY(360deg)}}
  .ppet.nom>.psvg{animation:pnom .25s ease-in-out 4!important}
  @keyframes pnom{50%{transform:scale(1.06,.94)}}
  .ppet.shake>.psvg{animation:pshake .12s linear infinite!important}
  @keyframes pshake{0%,100%{transform:translateX(0) rotate(0)}25%{transform:translateX(-5px) rotate(-4deg)}75%{transform:translateX(5px) rotate(4deg)}}
  .pflash{position:fixed;inset:0;background:#fff;z-index:60;animation:pflash .9s forwards;pointer-events:none}@keyframes pflash{0%{opacity:0}25%{opacity:1}100%{opacity:0}}
  .ptag{position:absolute;left:1rem;top:.9rem;background:rgba(255,255,255,.92);border-radius:16px;padding:.35rem .8rem;box-shadow:0 3px 0 #f1e3cf;z-index:2}
  .ptag b{font-size:1.45rem;color:#d6336c;display:block;line-height:1.2}.ptag small{font-size:.95rem;color:#888;font-weight:800}
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
  .pcare{font-size:1.05rem;font-weight:900;color:#f08c00;text-align:center}
  .pacts{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.6rem;margin-top:.8rem}
  .pact{background:#fff;border:0;border-radius:20px;box-shadow:0 5px 0 #f1e3cf;padding:.55rem .2rem;font-size:1.05rem;font-weight:900;color:#555;display:flex;flex-direction:column;align-items:center;gap:.15rem;font-family:inherit}
  .pact span{font-size:2rem;line-height:1}.pact:active{transform:translateY(3px);box-shadow:0 2px 0 #f1e3cf}.pact.cool{opacity:.55}
  .ptabs{display:flex;gap:.5rem;margin-top:1.1rem}.ptabs button{flex:1;border:0;border-radius:16px 16px 0 0;padding:.65rem .3rem;font-size:1.15rem;font-weight:900;background:#f1f3f5;color:#888;font-family:inherit}
  .ptabs button.on{background:#fff;color:#d6336c}
  .ptab{border-top-left-radius:0;border-top-right-radius:0;min-height:10rem}
  .psec{font-size:1.15rem;font-weight:900;color:#666;margin:.5rem 0 .4rem}.psec small{color:#999;font-size:.9rem;margin-left:.4rem}
  .pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(7.2rem,1fr));gap:.6rem}
  .pitem{background:#fff9fb;border:3px solid #ffdeeb;border-radius:18px;padding:.5rem .3rem;display:flex;flex-direction:column;align-items:center;gap:.1rem;font-family:inherit}
  .pitem .fi{font-size:2.6rem;line-height:1.1}.pitem b{font-size:1.05rem;color:#444}.pitem small{font-size:.85rem;color:#888;font-weight:800}
  .pitem em{font-style:normal;font-size:.95rem;font-weight:900;color:#e67700;margin-top:.15rem}
  .pitem.poor{opacity:.55}.pitem.lock{opacity:.5;filter:grayscale(.7)}.pitem.on{border-color:#f06595;background:#fff0f6}.pitem.on em{color:#2b8a3e}
  .pitem .isvg{width:100%;height:3.6rem}
  .pgrid.cols{grid-template-columns:repeat(auto-fill,minmax(5.6rem,1fr))}
  .pcol{background:#fff;border:3px solid #f1f3f5;border-radius:16px;padding:.4rem .2rem;display:flex;flex-direction:column;align-items:center;font-family:inherit}
  .pcol i{width:2.4rem;height:2.4rem;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,var(--m) 50%,var(--d));border:3px solid var(--d)}
  .pcol small{font-size:.85rem;font-weight:800;color:#666;margin-top:.15rem}.pcol em{font-style:normal;font-size:.85rem;font-weight:900;color:#e67700}
  .pcol.on{border-color:#f06595}.pcol.lock{opacity:.45}
  .pcls{display:grid;grid-template-columns:repeat(auto-fill,minmax(7.4rem,1fr));gap:.6rem}
  .pcls button{background:linear-gradient(180deg,#fff,#fff4e6);border:0;border-radius:18px;box-shadow:0 4px 0 #f1e3cf;padding:.4rem .3rem .5rem;display:flex;flex-direction:column;align-items:center;font-family:inherit}
  .pcls .psvg{width:5.6rem;height:5.6rem}.pcls b{font-size:1.05rem;color:#d6336c}.pcls small{font-size:.85rem;color:#888;font-weight:800}
  .phow{margin-top:.9rem;font-size:1rem;color:#888;font-weight:800;text-align:center}
  .pgo2{display:block;margin:.9rem auto 0;font-size:1.4rem}
  .pmod{position:fixed;inset:0;background:rgba(40,20,60,.45);z-index:50;display:flex;align-items:center;justify-content:center;padding:1rem;animation:fade .25s}
  .pmc{background:#fff;border-radius:28px;padding:1.2rem;max-width:42rem;width:100%;max-height:92vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.25);text-align:center}
  .pmh{font-size:1.6rem;font-weight:900;color:#d6336c;margin-bottom:.8rem}.pmh small{font-size:1rem;color:#999}
  .pspg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.7rem}
  .pspg button{background:linear-gradient(180deg,#fff,#fff0f6);border:3px solid #ffdeeb;border-radius:20px;padding:.5rem .3rem;font-family:inherit;display:flex;flex-direction:column;align-items:center}
  .pspg .psvg{width:7rem;height:7rem}.pspg b{font-size:1.2rem;color:#555}
  .pspg button:active,.png button:active{transform:scale(.95)}
  .pnow{width:9rem;height:9rem;margin:0 auto .6rem}.pnow.vis{width:12rem;height:12rem}
  .png{display:grid;grid-template-columns:repeat(auto-fill,minmax(5.4rem,1fr));gap:.45rem;margin-bottom:.8rem}
  .png button{background:#fff9db;border:3px solid #ffe066;border-radius:14px;padding:.45rem .2rem;font-size:1.15rem;font-weight:900;color:#e67700;font-family:inherit}.png button.on{background:#ffe066}
  .pstk{display:flex;justify-content:center;gap:.6rem;margin:.4rem 0 1rem;flex-wrap:wrap}.pstk button{font-size:2.4rem;background:#fff0f6;border:3px solid #ffdeeb;border-radius:18px;padding:.3rem .7rem}
  .pdone{font-size:1.2rem;font-weight:900;color:#2b8a3e}
  .pmx{font-size:1.1rem;border:0;background:#e9ecef;border-radius:14px;padding:.5rem 1.6rem;font-weight:900;color:#555;font-family:inherit;margin-top:.3rem}
  .petend{color:#e67700}
  @media (max-width:700px){.pacts{grid-template-columns:repeat(3,minmax(0,1fr))}.pstage{height:min(22rem,48vh)}.pbub{font-size:1rem;top:4.6rem}.ptag b{font-size:1.2rem}.pcoin{font-size:1.1rem}.pspg .psvg{width:5.2rem;height:5.2rem}}`;
  const S = document.createElement('style'); S.textContent = css; document.head.appendChild(S);

  window.PET = { petSVG, eggSVG, itemSVG, SPECIES, COLORS, ITEMS, FOODS, NAMES, STICKERS, lvOf, stageOf, gain, endMsg, homeCard, page, P, fullNow, joyNow, moodOf, look, pub, refresh, closeModal, _set: (k, v) => { if (k === 'night') night.f = v; } };
})();
