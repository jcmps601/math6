/* 象棋規則（棋盤 9 × 10，第 0 列在上面＝黑方，第 9 列在下面＝紅方）
   棋子：紅方大寫、黑方小寫。K 帥將、A 仕士、B 相象、N 傌馬、R 俥車、C 炮砲、P 兵卒
   一步棋存成 [起點, 終點]，位置＝列 × 9 ＋ 行（0～89）。
   規則：馬拐腳、象塞象眼不能過河、將帥不能出九宮也不能照面、炮隔一子吃子、兵卒過河才能橫走。
   走了之後自己的將帥被將軍（含照面）就不能走；輪到的一方沒有棋可走就輸（被將死或困斃）。 */
(function (root) {
  const INIT = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR';
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], DX = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const side = p => !p ? null : p === p.toUpperCase() ? 'r' : 'b';
  const other = s => s === 'r' ? 'b' : 'r';
  const inBoard = (c, r) => c >= 0 && c <= 8 && r >= 0 && r <= 9;
  const inPalace = (c, r, s) => c >= 3 && c <= 5 && (s === 'r' ? r >= 7 : r <= 2);
  const ownHalf = (r, s) => s === 'r' ? r >= 5 : r <= 4;

  function parse(fen) {
    const b = Array(90).fill(null);
    fen.split('/').forEach((row, r) => { let c = 0; for (const ch of row) { if (/\d/.test(ch)) c += +ch; else b[r * 9 + c++] = ch; } });
    return b;
  }
  /* 不管將軍的走法 */
  function pseudo(b, s) {
    const mv = [];
    for (let i = 0; i < 90; i++) {
      const p = b[i]; if (!p || side(p) !== s) continue;
      const c = i % 9, r = (i / 9) | 0, t = p.toUpperCase();
      const add = (c2, r2) => {            // 回傳：這格是空的（可以繼續往前滑）
        if (!inBoard(c2, r2)) return false;
        const q = b[r2 * 9 + c2]; if (q && side(q) === s) return false;
        mv.push([i, r2 * 9 + c2]); return !q;
      };
      if (t === 'K') { for (const [dc, dr] of D4) if (inPalace(c + dc, r + dr, s)) add(c + dc, r + dr); }
      else if (t === 'A') { for (const [dc, dr] of DX) if (inPalace(c + dc, r + dr, s)) add(c + dc, r + dr); }
      else if (t === 'B') {
        for (const [dc, dr] of DX) {
          const c2 = c + 2 * dc, r2 = r + 2 * dr;
          if (inBoard(c2, r2) && ownHalf(r2, s) && !b[(r + dr) * 9 + c + dc]) add(c2, r2);   // 塞象眼
        }
      } else if (t === 'N') {
        for (const [dc, dr] of D4) {
          if (!inBoard(c + dc, r + dr) || b[(r + dr) * 9 + c + dc]) continue;               // 拐馬腳
          if (dc) { add(c + 2 * dc, r + 1); add(c + 2 * dc, r - 1); } else { add(c + 1, r + 2 * dr); add(c - 1, r + 2 * dr); }
        }
      } else if (t === 'R') {
        for (const [dc, dr] of D4) { let c2 = c + dc, r2 = r + dr; while (add(c2, r2)) { c2 += dc; r2 += dr; } }
      } else if (t === 'C') {
        for (const [dc, dr] of D4) {
          let c2 = c + dc, r2 = r + dr, screen = false;
          while (inBoard(c2, r2)) {
            const q = b[r2 * 9 + c2];
            if (!screen) { if (!q) mv.push([i, r2 * 9 + c2]); else screen = true; }
            else if (q) { if (side(q) !== s) mv.push([i, r2 * 9 + c2]); break; }
            c2 += dc; r2 += dr;
          }
        }
      } else if (t === 'P') {
        add(c, r + (s === 'r' ? -1 : 1));
        if (!ownHalf(r, s)) { add(c - 1, r); add(c + 1, r); }
      }
    }
    return mv;
  }
  const kingAt = (b, s) => b.indexOf(s === 'r' ? 'K' : 'k');
  /* s 方的將帥有沒有被將軍（包含將帥照面） */
  function inCheck(b, s) {
    const k = kingAt(b, s), ok = kingAt(b, other(s));
    if (k < 0) return true;
    if (ok >= 0 && k % 9 === ok % 9) {
      let clear = true; for (let i = Math.min(k, ok) + 9; i < Math.max(k, ok); i += 9) if (b[i]) { clear = false; break; }
      if (clear) return true;
    }
    return pseudo(b, other(s)).some(m => m[1] === k);
  }
  const apply = (b, m) => { const nb = b.slice(); nb[m[1]] = nb[m[0]]; nb[m[0]] = null; return nb; };
  const legal = (b, s) => pseudo(b, s).filter(m => !inCheck(apply(b, m), s));
  const enc = m => String(m[0]).padStart(2, '0') + String(m[1]).padStart(2, '0');
  const dec = x => [+x.slice(0, 2), +x.slice(2, 4)];
  /* 從開局照著棋譜走一遍；有不合法的步就停在那裡 */
  function replay(moves) {
    let b = parse(INIT), turn = 'r', last = null;
    const list = moves ? moves.split(',') : [];
    for (const x of list) {
      const m = dec(x);
      if (!legal(b, turn).some(l => l[0] === m[0] && l[1] === m[1])) return { b, turn, last, bad: true, n: list.indexOf(x) };
      b = apply(b, m); last = m; turn = other(turn);
    }
    const lm = legal(b, turn);
    return { b, turn, last, check: inCheck(b, turn), over: lm.length === 0, legal: lm };
  }
  function perft(b, s, d) { if (!d) return 1; let n = 0; for (const m of legal(b, s)) n += perft(apply(b, m), other(s), d - 1); return n; }
  root.XQ = { INIT, parse, pseudo, legal, inCheck, apply, replay, enc, dec, side, other, perft };
})(typeof window !== 'undefined' ? window : globalThis);
