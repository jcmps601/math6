/* 全站圖示統一：畫面上「當圖示用的表情符號」自動換成同一套圖片（img/ui，2026-11-05 美術交接包）。
   ・用 MutationObserver 看整個頁面：新出現的文字裡有對照表上的表情符號，就換成 <img class="ico ii">（跟著文字大小）
   ・題目、選項、輸入框、SVG、貼圖這些不換（題目內容不能被改；SVG 裡放不了 <img>）
   ・要整區都不換：在那個元素加 data-noico
   ・表情符號跟圖示的對照寫在 MAP；倉庫用 📦、看整個農場用 🔎、肥料用 🧴，跟首頁 🏠、放大 🔍、測試帳號 🧪 分開 */
(function () {
  const MAP = {
    '🪙': 'rw-coin', '💰': 'rw-coin', '💧': 'ic-water-drop', '🧴': 'ic-fertilizer-bag', '🔒': 'ic-lock-closed', '🔓': 'ic-lock-open',
    '▶': 'ic-arrow-next', '✅': 'pr-ok', '✔': 'pr-ok', '❌': 'pr-no', '✕': 'ic-close', '🎟': 'rw-ticket',
    '⭐': 'rw-star', '🌟': 'rw-star', '★': 'rw-star', '☆': 'rw-star0', '🔥': 'rw-fire', '🏆': 'rw-trophy',
    '🥇': 'ic-medal-gold', '🥈': 'rw-silver', '🥉': 'rw-bronze', '🎁': 'rw-gift',
    '💖': 'ic-heart-happy', '❤': 'ic-heart-happy', '💗': 'ic-heart-happy', '⚡': 'ic-energy-bolt', '🍙': 'ic-satiety-rice',
    '⚽': 'ic-pet-ball', '🍽': 'ic-pet-feed', '👒': 'ic-pet-wardrobe', '✏': 'pr-pen', '🖐': 'ic-pet-pat', '⏳': 'ic-hourglass',
    '🔍': 'ic-zoom-in', '🔎': 'ic-zoom-out', '📬': 'ic-mailbox', '🌙': 'ic-moon-sleep', '🎉': 'ic-party-popper', '👍': 'ic-thumbs-up',
    '🔊': 'nav-snd', '🔇': 'ic-sound-off', '☁': 'ic-sync-done', '📴': 'st-offline', '🌱': 'ic-seed-sprout', '🧺': 'ic-harvest-basket',
    '🐛': 'ic-bug', '🌿': 'ic-weed', '✨': 'ic-sparkle', '👫': 'ic-classmates', '📖': 'ic-pet-dex', '⚔': 'vs-vs', '📨': 'vs-inv',
    '🐾': 'nav-pet', '🌾': 'nav-farm', '🎮': 'nav-game', '📕': 'nav-wb', '💡': 'pr-hint', '🏠': 'nav-home', '🏡': 'nav-home', '📦': 'ic-warehouse'
  };
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const RE = new RegExp('(' + Object.keys(MAP).sort((a, b) => b.length - a.length).map(esc).join('|') + ')\\uFE0F?', 'gu');
  /* 這些地方不換：題目內容、輸入、SVG、貼圖、原生下拉選單 */
  const SKIP = 'script,style,textarea,input,select,option,svg,title,[data-noico],#q,#bigc,#opts,#rev,.pstk,.plk,.pzem';
  function fix(node) {
    const t = node.nodeValue; if (!t || !RE.test(t)) return; RE.lastIndex = 0;
    const p = node.parentNode; if (!p || (p.closest && p.closest(SKIP))) return;
    const frag = document.createDocumentFragment(); let last = 0, m;
    while ((m = RE.exec(t))) {
      if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)));
      const img = document.createElement('img'); img.className = 'ico ii'; img.src = `img/ui/${MAP[m[1]]}.webp`; img.alt = m[1]; img.draggable = false;
      frag.appendChild(img); last = m.index + m[0].length;
    }
    if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    p.replaceChild(frag, node);
  }
  function scan(root) {
    if (!root) return;
    if (root.nodeType === 3) return fix(root);
    if (root.nodeType !== 1 || root.closest(SKIP)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [];
    while (w.nextNode()) list.push(w.currentNode);
    list.forEach(fix);
  }
  function start() {
    scan(document.body);
    new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') fix(m.target); else m.addedNodes.forEach(scan); } })
      .observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  const st = document.createElement('style');
  st.textContent = 'img.ico.ii{width:1.25em;height:1.25em;vertical-align:-.26em;margin:0 .04em;display:inline-block}';
  document.head.appendChild(st);
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  window.ICO = { MAP, scan };
})();
