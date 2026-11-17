/* 老師頁：題目與素材檢查（老師打開這張卡片、按「開始檢查」才載入；學生的平板不會用到）
   ・只「檢查、列出問題」，不會改題目、答案，也不會刪素材
   ・權限和老師頁其他功能一樣：這台電腦要先選過 pins.json（learn601_pins）才能用
   ・四個部分：
     ① 素材：題庫、每日成語、漫畫、介面圖示用到的圖片（和英語錄音）存不存在、載不載得出來、尺寸是不是 0；
        動態組出來的路徑（成語漫畫 cy-編號、魔王 boss-b0～7、單元圖示、隨機題抽樣出現的圖）也列進清單。分批載入，不會一次塞爆
     ② 題目結構：固定的題目（國語、英語、自然、社會題庫、第 5 單元、早自修國語、閱讀測驗、每日成語）每一題都檢查；
        依題型分開：選擇題看選項、答案；題組（○╳、勾選）看每一句；填數字、分數、比看答案格式；不會把輸入題當成選擇題
        還有單元代號、題型、教具、早自修題型清單對不對得上
     ③ 隨機題（數學 1～4 單元、早自修學扶數學）：每個題型抽樣 QA.gen 題，用固定的亂數種子出題，記下種子可以重現同一題
        抽樣沒問題只代表「抽到的這幾題」沒問題，不代表整個題型都對
     ④ 手機版面：每個題型抽 QA.mob 題，用 390×844 的畫面實際排一次，量得到的「超出畫面」列成警告；量不到的（字太小、圖看不清楚）標「需人工確認」
   ・結果可以只看問題、依科目篩選、複製或下載（CSV，Excel 打得開），每一筆都有預覽（手機、平板、電腦三種大小） */
(function(){
const QA={gen:8,mob:1,conc:4,imgMs:12000};   // 抽樣數、同時載入幾張圖、一張圖最多等幾毫秒（都可以在畫面上改抽樣數）
const $q=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const plain=s=>String(s==null?'':s).replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const short=(s,n=24)=>{s=plain(s);return s.length>n?s.slice(0,n)+'…':s};
const hasPins=()=>!!LS.get('learn601_pins',null);
/* 固定種子的亂數（mulberry32）：同一個種子出同一題 */
const rng=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
function seeded(seed,fn){const R=Math.random;Math.random=rng(seed);try{return fn()}finally{Math.random=R}}
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};

/* ===== 每一題的「來源」：可以重新出同一題（預覽、手機檢查都用它） ===== */
const SUBN=k=>(SUBJ.find(S=>S.k===k)||{}).n||k;
function build(d){let q;
  const miss=()=>{throw new Error('找不到這一題（題庫可能剛改過，請重新檢查一次）')};
  if(d.k==='bank'&&!(BANK[d.s]&&BANK[d.s][d.i]&&BANK[d.s][d.i].items[d.j])||d.k==='m5'&&!M5[d.j]||d.k==='xz'&&!AMZ.XZ[d.j]||d.k==='read'&&!(AMZ.READ[d.p]&&AMZ.READ[d.p].qs[d.x])||d.k==='cy'&&!CY.L[d.i])miss();
  if(d.k==='bank'){const D=BANK[d.s][d.i],it=D.items[d.j];q=seeded(d.seed||1,()=>bankQ(it,d.s));q.u=ukIdx(d.s+String(D.no||d.i+1));q.t=it.t||'題目'}
  else if(d.k==='m5'){q=seeded(d.seed||1,()=>m5Q(M5[d.j]));q.u=ukIdx('u5');q.t=M5[d.j].t;if(!q.type)q.type='num';if(q.pre==null)q.pre='';if(q.unit==null)q.unit=''}
  else if(d.k==='xz'){q=seeded(d.seed||1,()=>bankQ(AMZ.XZ[d.j],'zh'));q.u=ukIdx('amz');q.t=AMZ.XZ[d.j].t}
  else if(d.k==='read'){const P=AMZ.READ[d.p];q=seeded(d.seed||1,()=>amReadQ(P,P.qs[d.x]));q.u=ukIdx('amr')}
  else if(d.k==='cy'){const all=[...CY.L.keys()];q=seeded(d.seed||1,()=>d.m?cyRevQ(d.i,all,d.m-1):cyLearnQ(d.i,all));q.u=ukIdx('amc')}
  else if(d.k==='gen'){const u=ukIdx(d.u);q=seeded(d.seed,()=>mkQ(u,d.t))}
  if(q&&q.u!=null&&UN[q.u])q.uk=UN[q.u].key;return q}
const dName=d=>d.k==='bank'?`${SUBN(d.s)} ${BANK[d.s][d.i].name} 第 ${d.j+1} 筆`:d.k==='m5'?`第 5 單元題庫 第 ${d.j+1} 筆`:d.k==='xz'?`早自修國語（學扶）第 ${d.j+1} 筆`:
  d.k==='read'?`閱讀測驗〈${AMZ.READ[d.p].t}〉第 ${d.x+1} 題`:d.k==='cy'?`每日成語 cy-${String(d.i+1).padStart(2,'0')}${d.m?'（複習題）':''}`:`${d.u}／${d.t}　種子 ${d.seed}`;

/* ===== 結果 ===== */
let ROWS=[],ASSETS=new Map(),RUN=0,STOP=false;
/* st：bad 問題、warn 警告、manual 需人工確認、ok 已檢查、sample 抽樣、todo 未檢查 */
const ST={bad:['❌','問題'],warn:['⚠️','警告'],manual:['👀','需人工確認'],ok:['✅','已檢查'],sample:['🎲','抽樣'],todo:['⬜','未檢查']};
const add=(st,grp,where,kind,why,id,d)=>ROWS.push({st,grp,where,kind,why,id:id||'',d:d||null});
function asset(path,grp,where,why){if(!path)return;path=String(path).trim();const a=ASSETS.get(path)||{path,used:[],dyn:false};
  if(a.used.length<6)a.used.push({grp,where});a.n=(a.n||0)+1;if(why)a.dyn=a.dyn||why;ASSETS.set(path,a)}
const SRC=/(?:src=["']?|url\(["']?)([^"'\s>)]+)/g,MEDIA=/\.(webp|png|jpe?g|gif|svg|mp3|m4a|wav|ogg)$/i;
function srcsIn(...xs){const o=[];xs.forEach(x=>{if(x==null)return;const s=typeof x==='string'?x:JSON.stringify(x);let m;SRC.lastIndex=0;while((m=SRC.exec(s)))if(MEDIA.test(m[1]))o.push(m[1])});return o}
const norm=o=>plain(o).replace(/[\s　]+/g,'').toLowerCase();
function dupOpts(opts){const seen={},d=[];opts.forEach(o=>{const k=isImg(o)?o:norm(o);if(seen[k])d.push(isImg(o)?o:plain(o));seen[k]=1});return d}

/* ===== ② 題目結構 ===== */
/* 選擇題（題庫格式）：q、opts、a；平台出題時 a 一定要在 opts 裡（不在的題目會被平台略過） */
function chkMC(it,grp,where,id,d,o={}){let bad=0;const opts=Array.isArray(it.opts)?it.opts:null;
  if(!plain(it.q))bad++,add('bad',grp,where,'缺題幹','題目（q）是空的',id,d);
  if(!opts||opts.length<2){add('bad',grp,where,'缺選項','選項少於 2 個',id,d);return 1}
  if(opts.some(x=>x==null||!String(x).trim()))bad++,add('bad',grp,where,'空白選項','有選項是空的',id,d);
  const dp=dupOpts(opts);if(dp.length)bad++,add('bad',grp,where,'選項重複',`重複：${dp.map(x=>short(x,12)).join('、')}`,id,d);
  if(it.a==null||String(it.a)==='')bad++,add('bad',grp,where,'缺答案','答案（a）是空的',id,d);
  else if(!opts.includes(it.a))bad++,add('bad',grp,where,'答案不在選項裡',`答案「${short(it.a,14)}」不在選項裡${o.dropped?'（平台會略過這題，學生看不到）':''}`,id,d);
  else if(opts.filter(x=>x===it.a).length>1)bad++,add('bad',grp,where,'正確選項重複','和答案一樣的選項有兩個',id,d);
  return bad}
/* 題組（○╳ 或勾選）：每一句要有文字，答案只能是 ○ 或 ╳ */
function chkGrp(it,grp,where,id,d){let bad=0;if(!plain(it.q))bad++,add('bad',grp,where,'缺題幹','題組的說明（q）是空的',id,d);
  if(!Array.isArray(it.grp)||!it.grp.length){add('bad',grp,where,'題組沒有句子','grp 是空的',id,d);return 1}
  it.grp.forEach((r,k)=>{if(!Array.isArray(r)||!plain(r[0]))bad++,add('bad',grp,where,'題組句子空白',`第 ${k+1} 句沒有文字`,id,d);else if(!['○','╳'].includes(r[1]))bad++,add('bad',grp,where,'題組答案格式',`第 ${k+1} 句的答案「${r[1]}」不是 ○ 或 ╳`,id,d)});
  const dp=dupOpts(it.grp.map(r=>r&&r[0]));if(dp.length)bad++,add('warn',grp,where,'題組句子重複',dp.map(x=>short(x,14)).join('、'),id,d);
  if(it.gk==='chk'&&!it.grp.some(r=>r&&r[1]==='○'))add('warn',grp,where,'勾選題沒有要勾的','全部都是 ╳',id,d);return bad}
/* 第 5 單元的輸入題：依 type 檢查答案格式（不套選擇題的規則） */
function chkM5(it,grp,where,id,d){let bad=0;const T=it.type;if(!plain(it.q))bad++,add('bad',grp,where,'缺題幹','題目（q）是空的',id,d);
  if(T==='mc')return bad+chkMC(it,grp,where,id,d);
  const int=x=>Number.isInteger(+x)&&String(x).trim()!=='';
  if(T==='frac'){if(!Array.isArray(it.a)||it.a.length!==2||!int(it.a[0])||!int(it.a[1])||+it.a[1]===0)bad++,add('bad',grp,where,'分數答案格式',`答案應該是 [分子, 分母]，分母不能是 0：${JSON.stringify(it.a)}`,id,d)}
  else if(T==='ratio'){if(!Array.isArray(it.a)||it.a.length!==2||!it.a.every(x=>+x>0&&isFinite(+x)))bad++,add('bad',grp,where,'比的答案格式',`答案應該是 [前項, 後項]，都要大於 0：${JSON.stringify(it.a)}`,id,d);
    else if(it.simp&&gcd(+it.a[0],+it.a[1])>1)bad++,add('bad',grp,where,'最簡比答案不是最簡','題目要最簡單整數比，答案卻還能約分',id,d)}
  else if(T==='num'||!T){const v=+it.a;if(it.a==null||it.a===''||!isFinite(v))bad++,add('bad',grp,where,'數字答案格式',`答案不是數字：${JSON.stringify(it.a)}`,id,d);else bad+=chkNum(v,grp,where,id,d)}
  else bad++,add('bad',grp,where,'不認得的題型',`type「${T}」不是 mc、num、frac、ratio`,id,d);return bad}
/* 填數字：學生的按鍵只有 0～9 和小數點、最多 9 個字，答案要打得出來 */
function chkNum(v,grp,where,id,d){if(v<0){add('manual',grp,where,'答案是負數','數字鍵沒有負號，學生打不出來，請確認題目',id,d);return 1}
  const s=String(+v.toFixed(8));if(Math.abs(+s-v)>1e-6||s.length>9){add('bad',grp,where,'答案位數太多',`答案 ${v} 的位數太多，學生打不出來`,id,d);return 1}return 0}

function checkStatic(){const CNT=[];   // [科目, 單元, 題型, 題數, 有問題的題數]
  const tally=(grp,where,n,b)=>CNT.push([grp,where,n,b]);
  /* 國語、英語、自然、社會題庫 */
  const B=window.BANK||{};SUBJ.forEach(S=>(B[S.k]||[]).forEach((D,i)=>{const by={};(D.items||[]).forEach((it,j)=>{const t=(it&&it.t)||'題目',grp=S.n,where=`${D.name}・${t}`,d={k:'bank',s:S.k,i,j},id=`${S.k}${D.no||i+1}／${t}／第 ${j+1} 筆「${short(it&&it.q,16)}」`;
      const c=by[t]=by[t]||[0,0];c[0]++;if(!it){add('bad',grp,where,'空的題目','這一筆是空的',id);c[1]++;return}
      const b=Array.isArray(it.grp)?chkGrp(it,grp,where,id,d):chkMC(it,grp,where,id,d,{dropped:1});if(b)c[1]++;
      [it.img,...(it.opts||[]).filter(o=>typeof o==='string'&&isImg(o)),...srcsIn(it.q,it.big,it.exp,it.reveal)].forEach(p=>asset(p,grp,where));
      if(it.au)asset(it.au,grp,where+'（錄音）')});
    for(const t in by)tally(S.n,`${D.name}・${t}`,...by[t])}));
  /* 第 5 單元（固定題庫） */
  if(window.M5){const by={},U=UN[ukIdx('u5')];M5.forEach((it,j)=>{const t=it.t||'?',where=`第 5 單元・${t}`,id=`u5／${t}／第 ${j+1} 筆「${short(it.q,16)}」`,d={k:'m5',j};const c=by[t]=by[t]||[0,0];c[0]++;
      if(chkM5(it,'數學',where,id,d))c[1]++;[it.img,...srcsIn(it.html,it.q,it.big)].forEach(p=>asset(p,'數學',where))});
    for(const t in by){tally('數學',`第 5 單元・${t}`,...by[t]);if(U&&!U.types.includes(t))add('warn','數學',`第 5 單元・${t}`,'題型沒有排進出題清單',`題庫有「${t}」，但單元的題型清單沒有它，學生練不到`,`u5／${t}`)}}
  /* 早自修國語（學扶）、閱讀測驗 */
  if(window.AMZ){const by={};(AMZ.XZ||[]).forEach((it,j)=>{const t=it.t||'?',where=`早自修國語・${t}`,id=`amz／${t}／第 ${j+1} 筆「${short(it.q,16)}」`;const c=by[t]=by[t]||[0,0];c[0]++;
      if(chkMC(it,'早自修',where,id,{k:'xz',j},{dropped:1}))c[1]++;[it.img,...srcsIn(it.q,it.big)].forEach(p=>asset(p,'早自修',where))});
    for(const t in by)tally('早自修',`早自修國語・${t}`,...by[t]);
    let rn=0,rb=0;(AMZ.READ||[]).forEach((P,p)=>{const where=`閱讀測驗〈${P.t}〉`;if(!plain(P.t))add('bad','早自修','閱讀測驗','缺篇名',`第 ${p+1} 篇沒有篇名`,`amr／第 ${p+1} 篇`);
      if(!Array.isArray(P.p)||!P.p.some(x=>plain(x)))add('bad','早自修',where,'缺文章','段落（p）是空的',`amr／〈${P.t}〉`);
      if(!Array.isArray(P.qs)||!P.qs.length)add('bad','早自修',where,'沒有題目','qs 是空的',`amr／〈${P.t}〉`);
      (P.qs||[]).forEach((x,k)=>{rn++;if(chkMC(x,'早自修',where,`amr／〈${P.t}〉第 ${k+1} 題`,{k:'read',p,x:k}))rb++});srcsIn(P.p).forEach(s=>asset(s,'早自修',where))});
    tally('早自修','閱讀測驗（每篇每題）',rn,rb)}
  /* 每日成語 */
  if(CY){let bn=0;CY.L.forEach((c,i)=>{const nm=`cy-${String(i+1).padStart(2,'0')} ${c.c||''}`,id=nm,d={k:'cy',i,m:0};let b=0;
      if(!plain(c.c))b++,add('bad','每日成語',nm,'缺成語','c 是空的',id,d);
      if(!Array.isArray(c.z)||c.z.length!==[...(c.c||'')].length)b++,add('bad','每日成語',nm,'注音數量不對',`${[...(c.c||'')].length} 個字、${(c.z||[]).length} 個注音`,id,d);
      if(!plain(c.e))b++,add('bad','每日成語',nm,'缺解釋','e 是空的',id,d);
      if(!plain(c.s))b++,add('bad','每日成語',nm,'缺例句','s 是空的',id,d);else if(!c.s.includes(c.c))b++,add('bad','每日成語',nm,'例句裡找不到成語','填空複習題挖不出空格',id,d);
      if(b)bn++;if(c.p)asset(`img/cy/${c.p}.webp`,'每日成語',nm,'成語的備用圖 p')});
    const cyNo=new Set();(CY.img||[]).forEach(n=>{if(!Number.isInteger(n)||n<1||n>CY.L.length){add('bad','每日成語','漫畫清單','漫畫編號對不到成語',`AMCY.img 裡的 ${n} 沒有對應的成語（共 ${CY.L.length} 個）`,'AMCY.img');return}
      if(cyNo.has(n))add('warn','每日成語','漫畫清單','漫畫編號重複',`${n} 出現兩次`,'AMCY.img');cyNo.add(n);
      asset(`img/cy/cy-${String(n).padStart(2,'0')}.webp`,'每日成語',`cy-${String(n).padStart(2,'0')} ${CY.L[n-1].c}`,'動態路徑：cy-編號（AMCY.img）')});
    CY.L.forEach((c,i)=>{if(!cyNo.has(i+1)&&!c.p)add('manual','每日成語',`cy-${String(i+1).padStart(2,'0')} ${c.c}`,'沒有漫畫','還沒列進 AMCY.img，成語卡只顯示文字','AMCY.img',{k:'cy',i,m:0})});
    tally('每日成語','成語資料',CY.L.length,bn)}
  return CNT}

/* 單元代號、題型、教具、早自修題型清單 → 對不對得上 */
function checkRefs(){let n=0;const G='對應',ok=()=>n++;
  UN.forEach(U=>{if(U.g)(U.types||[]).forEach(t=>{ok();if(typeof U.g[t]!=='function')add('bad',subjN(U),uName(U),'題型沒有出題程式',`types 裡有「${t}」，但找不到出題的方法`,`${U.key}／${t}`)});
    Object.entries(U.tt||{}).forEach(([t,id])=>{ok();if(!(U.types||[]).includes(t))add('warn',subjN(U),uName(U),'教具對應的題型不存在',`tt 的「${t}」不在題型清單`,`${U.key}.tt`);if(!(U.tools||[]).some(x=>x.id===id))add('bad',subjN(U),uName(U),'教具代號對不到',`tt 指到「${id}」，但沒有這個教具`,`${U.key}.tt`)})});
  AM_GEN.forEach(([k,t])=>{ok();const U=UN[ukIdx(k)];if(!U)add('bad','早自修','一般組數學題型','單元代號對不到',`AM_GEN 的「${k}」沒有這個單元`,`AM_GEN ${k}/${t}`);else if(!U.types.includes(t)||!U.g||!U.g[t])add('bad','早自修','一般組數學題型','題型對不到',`「${k}」沒有題型「${t}」`,`AM_GEN ${k}/${t}`)});
  if(window.XF)XF.LIST.forEach(([k,nm])=>{ok();if(typeof XF.G[k]!=='function')add('bad','早自修',`學扶數學・${nm}`,'題型沒有出題程式',`XF.LIST 有「${k}」，XF.G 沒有`,`amx／${k}`)});
  /* 每位學生自己的錯題延後複習：題型代號存在學生雲端（這裡看不到），出題前平台會再檢查一次範圍，對不到的不排 */
  return n}
const subjN=U=>U.hid?'早自修':SUBN(U.s||'math');
const uName=U=>U.hid?U.name:U.s&&U.s!=='math'?U.name:`第 ${U.no} 單元 ${U.name}`;

/* ===== ③ 隨機題抽樣 ===== */
function genUnits(){return UN.filter(U=>U.g&&(U.s||'math')==='math'&&U.key!=='u5')}   // 數學 1～4 單元、早自修學扶數學（每次出題數字都不一樣）
function checkGen(K){const CNT=[],samples=[];
  genUnits().forEach(U=>{const u=UN.indexOf(U),grp=U.hid?'早自修':'數學',tn=t=>(U.tn&&U.tn[t])||(typeof tName==='function'&&!U.hid?tName(u,t):t);
    [...new Set(U.types)].forEach(t=>{let bad=0;const where=`${uName(U)}・${tn(t)}`;
      for(let j=0;j<K;j++){const seed=hash(U.key+'|'+t+'|'+j+'|'+RUN),d={k:'gen',u:U.key,t,seed},id=`${U.key}／${t}　種子 ${seed}`;let q;
        try{q=build(d)}catch(e){bad++;add('bad',grp,where,'出題失敗',String(e&&e.message||e),id,d);continue}
        samples.push({d,grp,where});bad+=chkGenQ(q,grp,where,id,d)?1:0}
      CNT.push([grp,where,K,bad])})});
  return {CNT,samples}}
function sampleGen(K){const L=[];genUnits().forEach(U=>{const grp=U.hid?'早自修':'數學';[...new Set(U.types)].forEach(t=>{for(let j=0;j<K;j++){const d={k:'gen',u:U.key,t,seed:hash(U.key+'|'+t+'|'+j+'|'+RUN)};try{if(build(d))L.push({d,grp,where:`${uName(U)}・${(U.tn&&U.tn[t])||t}`})}catch(e){}}})});return L}
function chkGenQ(q,grp,where,id,d){let b=0;
  if(!plain(q.text))b++,add('bad',grp,where,'缺題幹','題目文字是空的',id,d);
  const T=q.type;
  if(T==='mc'){b+=chkMC({q:q.text||'x',opts:q.opts,a:q.ans},grp,where,id,d)}
  else if(T==='num'){if(typeof q.ans!=='number'||!isFinite(q.ans))b++,add('bad',grp,where,'數字答案格式',`答案不是數字：${JSON.stringify(q.ans)}`,id,d);else b+=chkNum(q.ans,grp,where,id,d)}
  else if(T==='frac'){const a=q.ans||{};if(!Number.isInteger(a.n)||!Number.isInteger(a.d)||a.d<=0||a.n<0)b++,add('bad',grp,where,'分數答案格式',`答案 ${JSON.stringify(a)}`,id,d)}
  else if(T==='ratio'){const a=q.ans;if(!Array.isArray(a)||a.length!==2||!a.every(x=>Number.isInteger(x)&&x>0))b++,add('bad',grp,where,'比的答案格式',`答案 ${JSON.stringify(a)}`,id,d)}
  else b++,add('bad',grp,where,'不認得的題型',`type「${T}」`,id,d);
  if(q.fig){if(typeof F[q.fig[0]]!=='function')b++,add('bad',grp,where,'圖的種類對不到',`F 沒有「${q.fig[0]}」`,id,d);
    else try{F[q.fig[0]](document.createElementNS('http://www.w3.org/2000/svg','svg'),q.fig[1])}catch(e){b++;add('bad',grp,where,'畫圖失敗',String(e&&e.message||e),id,d)}}
  srcsIn(q.big,q.text,q.sol).forEach(p=>asset(p,grp,where,'動態路徑：隨機題抽樣出現的圖'));
  return b}

/* ===== ① 素材 ===== */
function uiAssets(src){const L=new Set();let m;const r1=/ico\('([\w-]+)'/g,r2=/img\/ui\/([\w-]+)\.webp/g;while((m=r1.exec(src)))L.add(m[1]);while((m=r2.exec(src)))L.add(m[1]);
  const dyn=(n,why)=>asset(`img/ui/${n}.webp`,'介面圖示',n,why);
  /* 結尾是「-」的是程式組出來的名字（例如 'game-'+代號）：認得的展開成完整清單，不認得的請人工確認 */
  const PRE={'game-':()=>GLIST.forEach(g=>dyn('game-'+g[0],'動態路徑：遊戲圖示 game-代號')),'diff-':()=>GDIFF.forEach(g=>dyn('diff-'+g[0],'動態路徑：難度圖示 diff-代號'))};
  L.forEach(n=>{if(!n.endsWith('-'))return asset(`img/ui/${n}.webp`,'介面圖示',n);if(PRE[n])PRE[n]();else add('manual','介面圖示',n+'…','動態路徑',`程式用「${n}」再接代號組出圖檔名，沒辦法自動列出全部，請人工確認`,`img/ui/${n}*.webp`)});
  [...UN,...MIXES,GM,PETNAV,FARMNAV,WB].forEach(U=>U&&U.img&&dyn(U.img,'動態路徑：單元圖示 U.img'));SUBJ.forEach(S=>S.img&&dyn(S.img,'動態路徑：科目圖示'));
  BOSSES.forEach((B,k)=>dyn('boss-b'+k,'動態路徑：魔王 boss-b編號'))}
function pathIssue(p){if(/\\/.test(p))return '路徑用了反斜線 \\';if(/\s/.test(p))return '路徑裡有空白';if(/^(https?:|\/|file:)/i.test(p))return '用了絕對路徑（換網址可能會壞）';if(/\.\.\//.test(p))return '路徑有 ../';if(!MEDIA.test(p))return '副檔名不是圖片或錄音';return ''}
const isAudio=p=>/\.(mp3|m4a|wav|ogg)$/i.test(p);
function loadOne(p){return new Promise(ok=>{if(isAudio(p)){fetch(p,{method:'HEAD',cache:'no-store'}).then(r=>ok(r.ok?{ok:1}:{err:`找不到檔案（${r.status}）`})).catch(()=>ok({err:'讀不到（網路錯誤）'}));return}
  const im=new Image();let done=false;const fin=v=>{if(done)return;done=true;clearTimeout(t);ok(v)};const t=setTimeout(()=>fin({err:'載入逾時'}),QA.imgMs);
  im.onload=()=>fin(im.naturalWidth&&im.naturalHeight?{ok:1,w:im.naturalWidth,h:im.naturalHeight}:{zero:1});
  im.onerror=()=>fetch(p,{method:'HEAD',cache:'no-store'}).then(r=>fin({err:r.ok?'檔案在，但圖片壞了或格式不對':`找不到檔案（${r.status}）`})).catch(()=>fin({err:'讀不到（網路錯誤）'}));
  im.src=p})}
async function checkAssets(onp){const L=[...ASSETS.values()];let i=0,done=0,okN=0;
  const work=async()=>{while(i<L.length&&!STOP){const a=L[i++],w=a.used[0],id=a.path,where=`${w.where}${a.n>1?`（共 ${a.n} 處用到）`:''}`;
    const pi=pathIssue(a.path);if(pi)add('bad',w.grp,where,'路徑寫法',pi,id,{k:'asset',path:a.path});
    const r=await loadOne(a.path);done++;onp(done,L.length);
    if(r.ok){okN++;a.ok=1}else if(r.zero)add('bad',w.grp,where,'圖片尺寸是 0','載入了，但寬或高是 0',id,{k:'asset',path:a.path});else add('bad',w.grp,where,isAudio(a.path)?'錄音檔有問題':'圖片載不出來',r.err+(a.dyn?`（${a.dyn}）`:''),id,{k:'asset',path:a.path});
    await new Promise(r=>setTimeout(r,20))}};
  await Promise.all([...Array(QA.conc)].map(work));return {n:L.length,ok:okN,done}}

/* ===== ④ 手機版面：在看不見的 390×844 畫面裡，用學生的練習畫面實際排一次 ===== */
let PVF=null;
function pvFrame(w,h,host){return new Promise(ok=>{const f=document.createElement('iframe');f.className='qapvf';f.setAttribute('aria-hidden','true');f.style.cssText=`width:${w}px;height:${h}px;border:0;`;
  f.src='learn.html?qa=1#qa';(host||document.body).appendChild(f);const t0=Date.now();const iv=setInterval(()=>{let W;try{W=f.contentWindow}catch(e){}if(W&&W.QAPV&&W.QAPV.ready){clearInterval(iv);ok(f)}else if(Date.now()-t0>30000){clearInterval(iv);ok(null)}},200)})}
async function checkMobile(list,onp){const host=document.createElement('div');host.style.cssText='position:fixed;left:-5000px;top:0;width:390px;height:844px;overflow:hidden;';document.body.appendChild(host);
  const f=await pvFrame(390,844,host);if(!f){add('manual','全部','手機版面','沒辦法檢查','預覽畫面打不開（可能是網路太慢），請稍後再按一次','');host.remove();return 0}
  let n=0;for(const s of list){if(STOP)break;let r;try{r=await f.contentWindow.QAPV.show(s.d)}catch(e){r={err:String(e&&e.message||e)}}n++;onp(n,list.length);
    const id=dName(s.d);if(r.err)add('bad',s.grp,s.where,'手機預覽出錯',r.err,id,s.d);else{r.warn.forEach(x=>add('warn',s.grp,s.where,'手機版面超出',x,id,s.d));r.man.forEach(x=>add('manual',s.grp,s.where,'手機版面',x,id,s.d))}}
  host.remove();return n}
/* 每個題型抽 K 題做手機檢查（固定題庫隨機挑、隨機題用抽樣的種子） */
function mobList(K,samples){const L=[],by={};const put=(key,x)=>{(by[key]=by[key]||[]).push(x)};
  const B=window.BANK||{};SUBJ.forEach(S=>(B[S.k]||[]).forEach((D,i)=>(D.items||[]).forEach((it,j)=>{if(it&&it.q)put(`${S.k}|${i}|${it.t}`,{d:{k:'bank',s:S.k,i,j},grp:S.n,where:`${D.name}・${it.t||'題目'}`})})));
  (window.M5||[]).forEach((it,j)=>put('m5|'+it.t,{d:{k:'m5',j},grp:'數學',where:`第 5 單元・${it.t}`}));
  if(window.AMZ){(AMZ.XZ||[]).forEach((it,j)=>put('xz|'+it.t,{d:{k:'xz',j},grp:'早自修',where:`早自修國語・${it.t}`}));(AMZ.READ||[]).forEach((P,p)=>put('read',{d:{k:'read',p,x:0},grp:'早自修',where:'閱讀測驗'}))}
  if(CY)CY.L.forEach((c,i)=>{put('cy0',{d:{k:'cy',i,m:0},grp:'每日成語',where:'成語卡'});put('cy1',{d:{k:'cy',i,m:1},grp:'每日成語',where:'成語複習（填空）'})});
  samples.forEach(s=>put(`gen|${s.d.u}|${s.d.t}`,s));
  for(const k in by){const A=by[k];const pickN=k.startsWith('gen|')?A.slice(0,K):shuf(A).slice(0,K);pickN.forEach(x=>{x.d=Object.assign({},x.d);if(x.d.k!=='gen')x.d.seed=hash(k+RUN);L.push(x)})}
  return L}

/* ===== 畫面 ===== */
function mount(){const B=$q('#qabox');if(!B||B.dataset.on)return;B.dataset.on=1;
  B.innerHTML=`<div class="qactl">
    <label><input type="checkbox" id="qa1" checked>① 圖片與素材</label><label><input type="checkbox" id="qa2" checked>② 題目結構</label>
    <label><input type="checkbox" id="qa3" checked>③ 隨機題抽樣，每個題型 <input type="number" id="qagen" value="${QA.gen}" min="1" max="50"> 題</label>
    <label><input type="checkbox" id="qa4" checked>④ 手機版面，每個題型 <input type="number" id="qamob" value="${QA.mob}" min="1" max="5"> 題</label>
    <button id="qago" class="go">開始檢查</button><button id="qastop" class="gray" hidden>停止</button></div>
   <div id="qaprog" hidden><div class="qabar"><i></i></div><span id="qaptxt"></span></div>
   <div id="qasum"></div>
   <div class="qafil" hidden><label><input type="checkbox" id="qaonly" checked>只看問題</label><select id="qasub"></select><button id="qacopy" class="gray">📋 複製報告</button><button id="qadl" class="gray">📥 下載 CSV</button><span id="qamsg"></span></div>
   <div id="qaout"></div>`;
  tap($q('#qago'),()=>runAll());tap($q('#qastop'),()=>{STOP=true});
  $q('#qaonly').onchange=paint;$q('#qasub').onchange=paint;tap($q('#qacopy'),copyRep);tap($q('#qadl'),dlRep)}
function prog(t,a,b){const P=$q('#qaprog');P.hidden=false;$q('#qaptxt').textContent=`${t}${b?` ${a} / ${b}`:''}`;$q('#qaprog i').style.width=(b?Math.round(a/b*100):0)+'%'}
async function runAll(){if(!hasPins()){$q('#qasum').innerHTML='<div class="dbad">請先在 ① 選擇 pins.json（只有老師的電腦能用這個檢查）</div>';return}
  ROWS=[];ASSETS=new Map();RUN++;STOP=false;const K=Math.max(1,Math.min(50,+$q('#qagen').value||QA.gen)),M=Math.max(1,Math.min(5,+$q('#qamob').value||QA.mob));
  $q('#qago').disabled=true;$q('#qastop').hidden=false;$q('#qaout').innerHTML='';$q('#qasum').innerHTML='';const t0=Date.now(),S={};
  try{
    prog('整理題目…');await new Promise(r=>setTimeout(r,30));
    const st=$q('#qa2').checked?checkStatic():[];S.st=st;S.refs=$q('#qa2').checked?checkRefs():0;
    if(!$q('#qa2').checked){checkStatic();ROWS=[]}   // 沒勾 ② 也要收集素材清單（題目的問題不列）
    const G=$q('#qa3').checked?checkGen(K):{CNT:[],samples:[]};S.gen=G.CNT;
    if($q('#qa1').checked){let src='';try{src=await (await fetch('learn.html',{cache:'no-store'})).text()}catch(e){}uiAssets(src);prog('載入素材…',0,ASSETS.size);S.as=await checkAssets((a,b)=>prog('載入素材…',a,b))}
    if($q('#qa4').checked&&!STOP){const L=mobList(M,G.samples.length?G.samples:sampleGen(M));prog('手機版面…',0,L.length);S.mob=await checkMobile(L,(a,b)=>prog('手機版面…',a,b));S.mobN=L.length}
    /* 合計列：已檢查／抽樣／未檢查 */
    (S.st||[]).forEach(([g,w,n,b])=>add(b?'bad':'ok',g,w,b?`${b} / ${n} 題有問題`:'已檢查',b?'看上面列出的問題':`${n} 題全部檢查過，沒有發現問題`,''));
    (S.gen||[]).forEach(([g,w,n,b])=>add(b?'bad':'sample',g,w,b?`抽樣 ${n} 題，${b} 題有問題`:`抽樣 ${n} 題`,b?'看上面列出的問題':'抽到的題目沒問題；隨機題每次出的不一樣，不代表整個題型都正確',''));
    if(S.as)add(S.as.ok===S.as.n?'ok':'bad','素材','全部素材',`${S.as.ok} / ${S.as.n} 個載入成功`,STOP?'中途停止，後面的還沒檢查':'圖片看得到，但內容對不對（例如圖和題目配不配）需要人工看',`共 ${S.as.n} 個路徑`);
    if(S.mobN)add('manual','全部','手機版面',`檢查了 ${S.mob} / ${S.mobN} 題`,'量得到的超出畫面已列成警告；字會不會太小、圖清不清楚，還是要用預覽看一下','');
    [['教具頁（t/ 資料夾、unit4.html）','內容和版面沒有自動檢查'],['遊戲、寵物、農場的圖片','不在這次的範圍'],['英語錄音的內容','只確認檔案存在，唸得對不對要人工聽'],
     ['學生的早自修分組、錯題複習','存在每位學生自己的雲端資料，這裡不讀；出題時平台會再確認題型在範圍內，對不到的就不排'],
     ...(!$q('#qa1').checked?[['圖片與素材','這次沒勾']]:[]),...(!$q('#qa2').checked?[['題目結構','這次沒勾']]:[]),...(!$q('#qa3').checked?[['隨機題抽樣','這次沒勾']]:[]),...(!$q('#qa4').checked?[['手機版面','這次沒勾']]:[])]
      .forEach(([w,why])=>add('todo','全部',w,'未檢查',why,''));
    if(STOP)add('todo','全部','這次檢查','中途停止','按了「停止」，後面的項目沒有檢查完','');
  }catch(e){add('bad','全部','檢查工具','檢查中斷',String(e&&e.message||e),'')}
  $q('#qago').disabled=false;$q('#qastop').hidden=true;$q('#qaprog').hidden=true;
  const sub=$q('#qasub'),gs=[...new Set(ROWS.map(r=>r.grp))];sub.innerHTML=`<option value="">全部科目</option>`+gs.map(g=>`<option>${esc(g)}</option>`).join('');
  $q('.qafil').hidden=false;$q('#qamsg').textContent=`檢查完成（${Math.round((Date.now()-t0)/1000)} 秒）`;paint()}
const PROB=new Set(['bad','warn','manual']);
function shown(){const only=$q('#qaonly').checked,sub=$q('#qasub').value;return ROWS.map((r,i)=>Object.assign({i},r)).filter(r=>(!only||PROB.has(r.st)||r.st==='todo')&&(!sub||r.grp===sub)).sort((a,b)=>Object.keys(ST).indexOf(a.st)-Object.keys(ST).indexOf(b.st)||a.i-b.i)}
function paint(){const c={};ROWS.forEach(r=>c[r.st]=(c[r.st]||0)+1);
  $q('#qasum').innerHTML=Object.keys(ST).map(k=>`<span class="qac ${k}">${ST[k][0]} ${ST[k][1]} <b>${c[k]||0}</b></span>`).join('')+`<div class="qanote">「已檢查」＝每一題都看過；「抽樣」＝只看了抽到的幾題，不代表整個題庫正確；「需人工確認」＝電腦量不出來，請用預覽看。</div>`;
  const L=shown(),MAX=400;
  $q('#qaout').innerHTML=L.length?`<table class="at qat"><tr><th>狀態</th><th>科目</th><th class="l">單元・題型／成語</th><th class="l">問題</th><th class="l">原因</th><th class="l">路徑或題目識別</th><th></th></tr>`+
    L.slice(0,MAX).map(r=>`<tr class="${r.st}"><td>${ST[r.st][0]}</td><td>${esc(r.grp)}</td><td class="l">${esc(r.where)}</td><td class="l"><b>${esc(r.kind)}</b></td><td class="l">${esc(r.why)}</td><td class="l qid">${esc(r.id)}</td><td>${r.d?`<button class="gray qapv" data-i="${r.i}">預覽</button>`:''}</td></tr>`).join('')+'</table>'+(L.length>MAX?`<div class="qanote">只顯示前 ${MAX} 筆，完整的請下載 CSV</div>`:''):'<div class="dnone">🎉 沒有發現問題</div>';
  $q('#qaout').querySelectorAll('.qapv').forEach(b=>tap(b,()=>preview(ROWS[+b.dataset.i])))}
const COLS=['狀態','科目','單元・題型／成語','問題','原因','路徑或題目識別','重現資訊'];
const repRows=()=>shown().map(r=>[ST[r.st][1],r.grp,r.where,r.kind,r.why,r.id,r.d?JSON.stringify(r.d):'']);
async function copyRep(){const t=[COLS,...repRows()].map(r=>r.map(x=>String(x).replace(/[\t\n]/g,' ')).join('\t')).join('\n');try{await navigator.clipboard.writeText(t)}catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove()}$q('#qamsg').textContent='✅ 已複製（可以貼到 Excel、Google 試算表）'}
function dlRep(){const csv='﻿'+[COLS,...repRows()].map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`qa-check-${dkey()}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
/* 預覽：手機 390×844、平板 768×1024、電腦 1280×800（縮小放進視窗） */
const SIZES=[[390,844,'📱 手機'],[768,1024,'平板'],[1280,800,'💻 電腦']];
function preview(r){const d=r.d;let m=$q('#qapm');if(m)m.remove();m=document.createElement('div');m.id='qapm';
  m.innerHTML=`<div class="qapc"><div class="qaph"><b>${esc(r.where)}</b><small>${esc(r.id)}</small><span>${SIZES.map((s,k)=>`<button data-k="${k}" class="${k?'gray':''}">${s[2]}</button>`).join('')}</span><button class="gray" id="qapx">關閉</button></div><div class="qapb"></div><div class="qapr"></div></div>`;document.body.appendChild(m);
  tap($q('#qapx'),()=>m.remove());m.addEventListener('click',e=>{if(e.target===m)m.remove()});
  const body=m.querySelector('.qapb'),res=m.querySelector('.qapr');
  const go=async k=>{m.querySelectorAll('.qaph button[data-k]').forEach(b=>b.className=+b.dataset.k===k?'':'gray');body.innerHTML='';res.textContent='載入中…';
    if(d.k==='asset'){body.innerHTML=/\.(mp3|m4a|wav|ogg)$/i.test(d.path)?`<audio controls src="${esc(d.path)}"></audio>`:`<img class="qaimg" src="${esc(d.path)}" alt="" onerror="this.replaceWith('載不出來：${esc(d.path)}')">`;res.textContent=d.path;return}
    const [w,h]=SIZES[k],box=document.createElement('div');box.className='qapw';const sc=Math.min(1,(body.clientWidth-8)/w,(innerHeight*.72)/h);box.style.cssText=`width:${w*sc}px;height:${h*sc}px`;body.appendChild(box);
    const f=await pvFrame(w,h,box);if(!f){res.textContent='預覽打不開，請再試一次';return}f.style.transform=`scale(${sc})`;f.style.transformOrigin='0 0';
    try{const R=await f.contentWindow.QAPV.show(d);res.innerHTML=R.err?`❌ ${esc(R.err)}`:[...R.warn.map(x=>'⚠️ '+esc(x)),...R.man.map(x=>'👀 '+esc(x))].join('<br>')||`✅ ${w}×${h} 量不到超出畫面（字的大小、圖清不清楚請直接看）`}catch(e){res.textContent='預覽出錯：'+(e&&e.message||e)}};
  m.querySelectorAll('.qaph button[data-k]').forEach(b=>tap(b,()=>go(+b.dataset.k)));go(0)}

/* ===== 預覽畫面（在 iframe 裡跑的 learn.html?qa=1#qa）：只顯示、不作答、不記錄 ===== */
function pvInit(){try{unlistenSum()}catch(e){}user=null;sum=blankSum();document.body.classList.add('qapv');const pm=document.getElementById('pwm');if(pm)pm.remove();
  window.QAPV={ready:true,show:async d=>{let q;try{q=build(d)}catch(e){return {err:e.message}}if(!q)return {err:'出不了這一題'};
    round={qs:[q],res:[null],det:[{u:q.u,uk:q.uk,t:q.t,w:[],h:0,s:0}],t0:Date.now(),logged:true};N=1;cur=0;setPU(q.u);show$('prac');showQ();
    solved=true;$('#prac').classList.add('sv');const O=$('#opts');O.classList.remove('wait','au');
    if(q.type==='mc')[...O.children].forEach(b=>{if(b.dataset.v===q.ans)b.classList.add('ok')});
    else if(q.type!=='grp'){const r=$('#rev');r.innerHTML=q.type==='frac'?mx(q.ans.n,q.ans.d):q.type==='ratio'?q.ans.join('：'):f(q.ans);r.style.display='inline-block';$('#box').style.display='none';$('#fbx').style.display='none';$('#pad').style.display='none'}
    $('#fb').className='';$('#fb').textContent=q.type==='grp'?`預覽（不記錄）答案：${q.ans}`:'預覽（不記錄），綠色／框裡是正確答案';
    await new Promise(r=>setTimeout(r,250));fitBig();await new Promise(r=>setTimeout(r,80));   // 不用 requestAnimationFrame：看不見的 iframe 會被瀏覽器暫停
    await Promise.all([...document.querySelectorAll('#prac img')].map(im=>im.complete?0:new Promise(r=>{im.onload=im.onerror=r;setTimeout(r,4000)})));
    return measure()}}}
function measure(){const W=innerWidth,warn=[],man=[],P=$('#prac');
  const sw=document.documentElement.scrollWidth;if(sw>W+1)warn.push(`整個畫面比螢幕寬 ${sw-W}px，要左右捲動`);
  const over=(e,name)=>{if(!e||!e.offsetParent)return;const cs=getComputedStyle(e);if(/auto|scroll/.test(cs.overflowX))return;if(e.scrollWidth>e.clientWidth+2)warn.push(`${name}的內容比框寬 ${e.scrollWidth-e.clientWidth}px，可能被切掉`)};
  over($('#q'),'題目');P.querySelectorAll('#bigc .bx').forEach(b=>over(b,'題目內容'));[...P.querySelectorAll('#opts button')].forEach((b,i)=>over(b,`選項 ${i+1} `));over($('#ansline'),'作答列');
  P.querySelectorAll('#bigc img,#opts img').forEach(im=>{if(im.complete&&!im.naturalWidth)warn.push(`圖片載不出來：${im.getAttribute('src')}`)});
  const fc=$('#figc');if(fc&&/auto|scroll/.test(getComputedStyle(fc).overflowY)&&fc.scrollHeight>fc.clientHeight+4)man.push('題目框要上下捲動才看得完，請看一下是否方便');
  P.querySelectorAll('#bigc .bx').forEach(b=>{const fs=parseFloat(b.style.fontSize||0);if(fs&&fs<=18.5)man.push('題目字已經縮到最小（18px），請看一下是否清楚')});
  const r=P.getBoundingClientRect();if(P.scrollHeight>innerHeight*2.2)man.push('整題很長，要往下捲很多');
  return {warn:[...new Set(warn)],man:[...new Set(man)]}}

window.QA=Object.assign(QA,{mount,runAll,pvInit,build,rows:()=>ROWS,assets:()=>ASSETS});
})();
