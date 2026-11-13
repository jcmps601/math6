/* 601 學習平台：離線也能用
   第一次有網路時打開平台，就把平台、遊戲和雲端程式存在平板上；之後沒網路也能打開練習。
   網頁本身「先抓網路上最新的，抓不到才用存起來的」，所以老師更新後學生一連網就會拿到新版。
   改版時 CACHE 的版本號要跟 learn.html 的 APP_VER 一起改（learn.html 靠這個號碼知道有新版、自動重新載入）。 */
const CACHE = 'learn601-v101';
const PAGES = ['./learn.html', './game.html', './chess.html', './xq.js', './aq.js', './tank.js', './tankv.js', './party.html', './coop.html', './sling.html', './ps.js', './ps2.js', './ico.js', './am.js', './pet.js', './farm.js', ...['m5', 'zh', 'en', 'sci', 'soc', 'am_zh'].map(k => `./bank/${k}.js`)];
const SDK = ['app', 'database', 'auth'].map(n => `https://www.gstatic.com/firebasejs/10.12.2/firebase-${n}-compat.js`);

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(PAGES.map(u => c.add(u).catch(() => {})));
    await Promise.all(SDK.map(u => fetch(u, { mode: 'no-cors' }).then(r => c.put(u, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  /* 雲端資料庫、登入：不經過這裡 */
  if (url.hostname.endsWith('firebasedatabase.app') || url.hostname.endsWith('googleapis.com') && !url.hostname.startsWith('fonts')) return;

  /* 圖片、錄音很少變動：有存就先用存的（馬上顯示），背景再抓新的存起來，下次打開就是新版 */
  if (url.origin === self.location.origin && /\.(webp|png|jpe?g|gif|svg|mp3|m4a|ogg|wav)$/i.test(url.pathname)) {
    if (req.headers.has('range')) return;   // 錄音分段讀取：交給瀏覽器自己處理
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req, { ignoreSearch: true });
      const net = fetch(req).then(res => { if (res && res.status === 200) c.put(req, res.clone()).catch(() => {}); return res; });
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      try { return await net; } catch (err) { return Response.error(); }
    })());
    return;
  }

  /* 平台自己的網頁：先抓網路（最多等 5 秒），抓不到用存起來的 */
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        /* no-cache：一定跟網站確認是不是最新的（GitHub 會叫瀏覽器把網頁留 10 分鐘，不加的話剛更新完還會拿到舊的） */
        const res = await withTimeout(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }), 5000);
        if (res && res.status === 200) c.put(req, res.clone()).catch(() => {});
        if (res && res.redirected && req.mode === 'navigate') return Response.redirect(res.url, 302);   // Safari 不接受「轉址過的網頁」直接回給頁面
        return res;
      } catch (err) {
        const hit = await c.match(req, { ignoreSearch: true });
        if (hit) return hit;
        if (req.mode === 'navigate') { const home = await c.match('./learn.html'); if (home) return home; }
        return Response.error();
      }
    })());
    return;
  }

  /* 雲端程式（Firebase SDK）、字型：有存就用存起來的 */
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/') || url.hostname.startsWith('fonts.')) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req, { ignoreVary: true }) || await c.match(req.url);
      if (hit) return hit;
      try { const res = await fetch(req); c.put(req, res.clone()); return res; }
      catch (err) { return Response.error(); }
    })());
  }
});
