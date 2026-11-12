/* 早自修：學扶組的數學題型（依學習扶助科技化評量的「基本學習內容」，五年級＋四年級）
   ・一個題型一個產生器，每次出不同的數字；答錯時的提示、詳解照學習扶助教材的步驟寫
   ・產生器用 learn.html 裡的小工具（ri、pick、fr、Fr、eq、mx、gcd…），題目出現時才呼叫，所以這個檔可以先載入
   ・圖：XFIG 會併進 learn.html 的 F（圖形畫布 800 × 520）
   ・不寫任何學生的名字或座號：誰練哪些題型，由老師頁設定，存在那位學生自己的雲端資料裡 */
(function(){
const lcm=(a,b)=>a/gcd(a,b)*b;
const divs=n=>{const d=[];for(let i=1;i<=n;i++)if(n%i===0)d.push(i);return d};
const pv=x=>String(+(+x).toFixed(6));
const cm=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');   // 大數加千分位逗號
const Q=(o)=>Object.assign({type:'num',unit:'',pre:''},o);

/* ───── 圖 ───── */
const DEG=Math.PI/180;
const XFIG={
 /* 三角形：三個角，給兩個角、問一個 */
 xtri(g,{a,b,c,ask}){const A=a*DEG,Bb=b*DEG;
  /* 照真正的角度畫，再整個等比例縮放放進畫面（不要只壓扁高度，角度才不會變形） */
  const h=Math.sin(A)*Math.sin(Bb)/Math.sin(A+Bb),x=h/Math.tan(A);const x1=Math.min(0,x),x2=Math.max(1,x);
  const S=Math.min(600/(x2-x1),360/h),ox=400-(x1+x2)/2*S,oy=450;const pts=[[ox,oy],[ox+S,oy],[ox+x*S,oy-h*S]].map(p=>p.map(v=>Math.round(v)));
  mk(g,'path',{d:`M${pts[0]}L${pts[1]}L${pts[2]}Z`,fill:'#d0ebff',stroke:'#1c7ed6','stroke-width':5,'stroke-linejoin':'round'});
  const lab=(p,txt,dx,dy,col)=>tx(g,p[0]+dx,p[1]+dy,txt,{fill:col,'font-size':36});
  lab(pts[0],ask==='a'?'？':a+'°',58,-14,ask==='a'?'#e03131':'#333');lab(pts[1],ask==='b'?'？':b+'°',-58,-14,ask==='b'?'#e03131':'#333');lab(pts[2],ask==='c'?'？':c+'°',0,62,ask==='c'?'#e03131':'#333')},
 /* 平行四邊形：標邊長、角度 */
 xpar(g,{l,s,ang,show}){const W=440,H=230,sk=120,x0=150,y0=400;const p=[[x0,y0],[x0+W,y0],[x0+W+sk,y0-H],[x0+sk,y0-H]];
  mk(g,'path',{d:`M${p.join('L')}Z`,fill:'#fff3bf',stroke:'#f76707','stroke-width':5,'stroke-linejoin':'round'});
  ['甲','乙','丙','丁'].forEach((n,i)=>tx(g,p[i][0]+[-26,26,26,-26][i],p[i][1]+[34,34,-14,-14][i],n,{'font-size':30,fill:'#868e96'}));
  if(show.includes('l'))tx(g,x0+W/2,y0+50,`${l} 公分`,{fill:'#1c7ed6','font-size':34});
  if(show.includes('s'))tx(g,x0+sk/2-44,y0-H/2+10,`${s} 公分`,{fill:'#7048e8','font-size':32,'text-anchor':'end'});
  if(show.includes('A'))tx(g,x0+70,y0-16,`${ang}°`,{fill:'#e03131','font-size':32});
  if(show.includes('?s'))tx(g,x0+W+sk/2+40,y0-H/2+10,'？',{fill:'#e03131','font-size':44,'text-anchor':'start'});
  if(show.includes('?t'))tx(g,x0+sk+W/2,y0-H-18,'？',{fill:'#e03131','font-size':44});
  if(show.includes('?B'))tx(g,x0+W-36,y0-16,'？',{fill:'#e03131','font-size':40});
  if(show.includes('?C'))tx(g,x0+W+sk-64,y0-H+40,'？',{fill:'#e03131','font-size':40})},
 /* 面積：平行四邊形、三角形、梯形，畫底和高 */
 xarea(g,{k,b,h,t}){const S=Math.min(520/Math.max(b,t||0,1),300/h,40);const B0=b*S,H0=h*S,x0=400-B0/2,y0=420;
  let d,top=null;
  if(k==='p'){const sk=Math.min(110,B0*.3);d=`M${x0} ${y0}L${x0+B0} ${y0}L${x0+B0+sk} ${y0-H0}L${x0+sk} ${y0-H0}Z`;mk(g,'line',{x1:x0+sk,y1:y0-H0,x2:x0+sk,y2:y0,stroke:'#e03131','stroke-width':4,'stroke-dasharray':'10 7'})}
  else if(k==='t'){const ax=x0+B0*.35;d=`M${x0} ${y0}L${x0+B0} ${y0}L${ax} ${y0-H0}Z`;mk(g,'line',{x1:ax,y1:y0-H0,x2:ax,y2:y0,stroke:'#e03131','stroke-width':4,'stroke-dasharray':'10 7'})}
  else{const T0=t*S,tx0=x0+(B0-T0)*.4;d=`M${x0} ${y0}L${x0+B0} ${y0}L${tx0+T0} ${y0-H0}L${tx0} ${y0-H0}Z`;top=[tx0,T0];mk(g,'line',{x1:tx0,y1:y0-H0,x2:tx0,y2:y0,stroke:'#e03131','stroke-width':4,'stroke-dasharray':'10 7'})}
  const hl=g.lastChild;mk(g,'path',{d,fill:'#d3f9d8',stroke:'#2b8a3e','stroke-width':5,'stroke-linejoin':'round'});if(hl&&hl.tagName==='line')g.appendChild(hl);   // 高（虛線）畫在圖形上面
  tx(g,400,y0+48,`${b} 公分`,{fill:'#1c7ed6','font-size':34});
  const hx=k==='p'?x0+Math.min(110,B0*.3):k==='t'?x0+B0*.35:top[0];tx(g,hx-14,y0-H0/2+12,`${h} 公分`,{fill:'#e03131','font-size':32,'text-anchor':'end'});
  if(top)tx(g,top[0]+top[1]/2,y0-H0-16,`${t} 公分`,{fill:'#7048e8','font-size':32})},
 /* 扇形 */
 xsec(g,{ang,lab}){const cx=400,cy=270,r=210,a=ang*DEG;const x=cx+r*Math.cos(-a),y=cy+r*Math.sin(-a);
  mk(g,'circle',{cx,cy,r,fill:'#fff',stroke:'#ced4da','stroke-width':4,'stroke-dasharray':'10 8'});
  mk(g,'path',{d:`M${cx} ${cy}L${cx+r} ${cy}A${r} ${r} 0 ${ang>180?1:0} 0 ${x} ${y}Z`,fill:'#ffd8a8',stroke:'#f76707','stroke-width':5,'stroke-linejoin':'round'});
  mk(g,'circle',{cx,cy,r:7,fill:'#333'});const m=ang/2*DEG;tx(g,cx+70*Math.cos(-m),cy+70*Math.sin(-m)+12,lab,{fill:'#e03131','font-size':34})},
 /* 長方體 */
 xbox(g,{l,w,h}){const S=Math.min(300/l,160/w,240/h,60);const L=l*S,W=w*S*.6,H=h*S,x0=400-(L+W)/2,y0=440;
  const f=[x0,y0],dx=W,dy=-W*.7;
  mk(g,'path',{d:`M${x0} ${y0}h${L}v${-H}h${-L}Z`,fill:'#d0ebff',stroke:'#1c7ed6','stroke-width':4});
  mk(g,'path',{d:`M${x0} ${y0-H}l${dx} ${dy}h${L}l${-dx} ${-dy}Z`,fill:'#a5d8ff',stroke:'#1c7ed6','stroke-width':4});
  mk(g,'path',{d:`M${x0+L} ${y0}l${dx} ${dy}v${-H}l${-dx} ${-dy}Z`,fill:'#74c0fc',stroke:'#1c7ed6','stroke-width':4});
  tx(g,x0+L/2,y0+44,`${l} 公分`,{'font-size':32,fill:'#333'});tx(g,x0+L+dx/2+30,y0+dy/2+20,`${w} 公分`,{'font-size':30,fill:'#333','text-anchor':'start'});tx(g,x0-14,y0-H/2+10,`${h} 公分`,{'font-size':30,fill:'#333','text-anchor':'end'})},
 /* 長方形、正方形 */
 xrect(g,{l,w,sq}){const S=Math.min(520/l,300/w,40);const L=l*S,W=w*S,x0=400-L/2,y0=270-W/2;
  mk(g,'rect',{x:x0,y:y0,width:L,height:W,fill:'#e5dbff',stroke:'#7048e8','stroke-width':5});
  tx(g,400,y0+W+46,`${l} 公分`,{'font-size':34,fill:'#333'});if(!sq)tx(g,x0-14,y0+W/2+12,`${w} 公分`,{'font-size':32,fill:'#333','text-anchor':'end'})}
};

/* ───── 題型 ───── */
const G={
 /* NC-5-1-1 位值：乘以、除以 10、100、1000 */
 pv(){const k=ri(0,3);
  if(k===0){const a=ri(2,9)*pick([10,100]),b=ri(11,99)*pick([10,100]);const z=String(a).match(/0*$/)[0].length+String(b).match(/0*$/)[0].length,A=a/Math.pow(10,String(a).match(/0*$/)[0].length),B=b/Math.pow(10,String(b).match(/0*$/)[0].length);
   return Q({text:`算算看：${cm(a)} × ${cm(b)}`,big:`<div class="bx">${cm(a)} × ${cm(b)} ＝ ？</div>`,ans:a*b,hints:['先不看後面的 0，算前面的數',`${A} × ${B} ＝ ${A*B}`,`再補上 ${z} 個 0`],sol:[`${A} × ${B} ＝ ${A*B}`,`後面一共有 ${z} 個 0，所以是 ${cm(a*b)}`]})}
  if(k===1){const q=ri(2,9)*pick([1,10]),d=ri(2,9)*pick([100,1000]),a=q*d;const za=String(a).match(/0*$/)[0].length,zd=String(d).match(/0*$/)[0].length;
   return Q({text:`算算看：${cm(a)} ÷ ${cm(d)}`,big:`<div class="bx">${cm(a)} ÷ ${cm(d)} ＝ ？</div>`,ans:q,hints:['被除數和除數同時劃掉一樣多個 0',`兩個數都劃掉 ${zd} 個 0`,`變成 ${a/Math.pow(10,zd)} ÷ ${d/Math.pow(10,zd)}`],sol:[`${cm(a)} ÷ ${cm(d)} ＝ ${cm(a/Math.pow(10,zd))} ÷ ${d/Math.pow(10,zd)}`,`＝ ${q}`]})}
  const x=pick([ri(11,999)/10,ri(101,9999)/100,ri(2,99)]),m=pick([10,100,1000]),mul=k===2;const ans=+(mul?x*m:x/m).toFixed(6),z=String(m).length-1;
  return Q({text:`算算看：${pv(x)} ${mul?'×':'÷'} ${cm(m)}`,big:`<div class="bx">${pv(x)} ${mul?'×':'÷'} ${cm(m)} ＝ ？</div>`,ans,
   hints:[mul?`乘以 ${cm(m)}，每個數字都變成原來的 ${cm(m)} 倍`:`除以 ${cm(m)}，每個數字都變成原來的 ${cm(m)} 分之一`,`小數點往${mul?'右':'左'}移 ${z} 位`],
   sol:[`小數點往${mul?'右':'左'}移 ${z} 位（位數不夠要補 0）`,`${pv(x)} ${mul?'×':'÷'} ${cm(m)} ＝ ${pv(ans)}`],traps:[[+(mul?x/m:x*m).toFixed(6),mul?'乘以 10、100、1000，數會變大，小數點往右移':'除以 10、100、1000，數會變小，小數點往左移']]})},
 /* NC-5-11-1 小數取概數（四捨五入） */
 rnd(){const p=pick([0,1,2]),x=+(ri(1000,99999)/1000).toFixed(3),k=Math.pow(10,p),ans=Math.round(x*k+1e-9)/k,pn=['整數','小數第一位','小數第二位'][p];const nx=String(x.toFixed(3))[String(Math.floor(x)).length+1+p];
  return Q({text:`把 ${x.toFixed(3)} 用四捨五入法取概數到${pn}。`,big:`<div class="bx">${x.toFixed(3)} ≈ ？</div>`,ans,pre:'約',
   hints:[`看${pn}的下一位`,`下一位是 ${nx}：${+nx>=5?'5 以上要進位（入）':'4 以下要捨去（捨）'}`],sol:[`${pn}的下一位是 ${nx}，${+nx>=5?'要進 1':'捨去'}`,`${x.toFixed(3)} ≈ ${p?ans.toFixed(p):ans}`],traps:[[Math.floor(x*k)/k===ans?Math.ceil(x*k)/k:Math.floor(x*k)/k,'看清楚下一位是 5 以上還是 4 以下']]})},
 /* NC-5-3-1 因數、最大公因數 */
 fac(){if(Math.random()<.4){const n=pick([12,18,20,24,28,30,32,36,40,42,45,48,50,54,56,60]),d=divs(n);
   return Q({text:`${n} 有幾個因數？`,big:`<div class="bx">${n} 的因數有幾個？</div>`,ans:d.length,unit:'個',hints:[`兩個兩個一組找：${n} ＝ 1 × ${n}`,'再試 2、3、4…能不能整除','找到兩個數一樣大或重複了就停'],sol:[`${n} 的因數：${d.join('、')}`,`共 ${d.length} 個`]})}
  let a,b,g0;do{g0=pick([2,3,4,5,6,7,8,9,12]);a=g0*ri(2,7);b=g0*ri(2,7)}while(a===b||gcd(a,b)!==g0||Math.max(a,b)>72);const da=divs(a),db=divs(b),co=da.filter(x=>db.includes(x));
  return Q({text:`${a} 和 ${b} 的最大公因數是多少？`,big:`<div class="bx">${a}、${b} 的最大公因數</div>`,ans:g0,hints:[`先找出 ${a} 的因數`,`再找出 ${b} 的因數`,'兩個都有的是公因數，最大的那個就是答案'],sol:[`${a} 的因數：${da.join('、')}`,`${b} 的因數：${db.join('、')}`,`公因數：${co.join('、')}，最大的是 ${g0}`],traps:[[a*b/g0,'這是最小公倍數喔'],[Math.min(a,b),'較小的數不一定是另一個數的因數']]})},
 /* NC-5-3-2 倍數、最小公倍數 */
 mul(){if(Math.random()<.35){const n=ri(3,12),k=ri(3,9);return Q({text:`${n} 的第 ${k} 個倍數是多少？`,big:`<div class="bx">${n} 的倍數：${n}、${n*2}、${n*3}、…</div>`,ans:n*k,hints:[`${n} 的倍數就是 ${n} × 1、${n} × 2、${n} × 3…`,`第 ${k} 個是 ${n} × ${k}`],sol:[`${n} × ${k} ＝ ${n*k}`]})}
  let a,b;do{a=ri(2,12);b=ri(3,15)}while(a===b||lcm(a,b)>90||lcm(a,b)===Math.max(a,b)&&Math.random()<.6);const L=lcm(a,b);const ma=[],mb=[];for(let i=1;a*i<=L;i++)ma.push(a*i);for(let i=1;b*i<=L;i++)mb.push(b*i);
  return Q({text:`${a} 和 ${b} 的最小公倍數是多少？`,big:`<div class="bx">${a}、${b} 的最小公倍數</div>`,ans:L,hints:[`把 ${a} 的倍數一個一個寫出來`,`再寫 ${b} 的倍數`,'第一個兩邊都出現的數就是答案'],sol:[`${a} 的倍數：${ma.join('、')}`,`${b} 的倍數：${mb.join('、')}`,`最小的公倍數是 ${L}`],traps:[[gcd(a,b),'這是最大公因數喔']]})},
 /* NC-5-4-1 約分、擴分（等值分數） */
 eqf(){let n,d;do{d=ri(2,9);n=ri(1,d-1)}while(gcd(n,d)!==1);const k=ri(2,8);const up=Math.random()<.5,askN=Math.random()<.5;
  const [A,B,C,Dd]=up?[n,d,n*k,d*k]:[n*k,d*k,n,d];const ans=askN?C:Dd;
  const L=up?fr(A,B):fr(A,B),Rr=askN?`<span class="fr"><i>□</i><i>${Dd}</i></span>`:`<span class="fr"><i>${C}</i><i>□</i></span>`;
  return Q({text:`${up?'擴分':'約分'}：□ 裡是多少？`,big:`<div class="bx">${L} ＝ ${Rr}</div>`,ans,hints:[up?'分子、分母要乘以同一個數':'分子、分母要除以同一個數',up?`分母從 ${B} 變成 ${Dd}，乘以 ${k}`:`${askN?'分母':'分子'}從 ${askN?B:A} 變成 ${askN?Dd:C}，除以 ${k}`],sol:[up?`${fr(A,B)} ＝ ${fr(A+' × '+k,B+' × '+k)} ＝ ${fr(C,Dd)}`:`${fr(A,B)} ＝ ${fr(A+' ÷ '+k,B+' ÷ '+k)} ＝ ${fr(C,Dd)}`]})},
 /* NC-5-4-2 異分母分數加減、比大小 */
 adf(){const pairs=[[2,3],[2,5],[3,4],[3,5],[4,5],[2,7],[3,7],[4,6],[6,8],[4,8],[3,6],[2,8],[6,9],[4,10],[5,10],[3,9],[8,12],[6,10]];const [b,d]=shuf(pick(pairs));
  let a,c;do{a=ri(1,b-1);c=ri(1,d-1)}while(gcd(a,b)!==1||gcd(c,d)!==1);const L=lcm(b,d),A=a*L/b,C=c*L/d;
  if(Math.random()<.25){const s=A>C?'＞':A<C?'＜':'＝';return {type:'mc',opts:['＞','＜','＝'],row:true,text:`比比看，哪一個比較大？`,big:`<div class="bx">${fr(a,b)} ○ ${fr(c,d)}</div>`,ans:s,hints:['分母不一樣，先通分',`${b} 和 ${d} 的最小公倍數是 ${L}`],sol:[`${fr(a,b)} ＝ ${fr(A,L)}，${fr(c,d)} ＝ ${fr(C,L)}`,`${A} ${s} ${C}，所以 ${fr(a,b)} ${s} ${fr(c,d)}`]}}
  const add=Math.random()<.55||A<=C;const [x,y]=add?[A,C]:[A,C];const r=add?A+C:A-C;
  return {type:'frac',text:`算算看：${fr(a,b)} ${add?'＋':'－'} ${fr(c,d)}`,big:`<div class="bx">${fr(a,b)} ${add?'＋':'－'} ${fr(c,d)} ＝ ？</div>`,ans:Fr(r,L),
   hints:['分母不一樣，要先通分',`${b} 和 ${d} 的最小公倍數是 ${L}，用 ${L} 當分母`,'分母一樣了，分子再相加減','最後要約成最簡分數'],
   sol:[`${fr(a,b)} ${add?'＋':'－'} ${fr(c,d)} ＝ ${fr(A,L)} ${add?'＋':'－'} ${fr(C,L)}`,`＝ ${eq(r,L)}`],trapsF:[[Fr(add?a+c:Math.abs(a-c),add?b+d:Math.abs(b-d)||1),'分母不能直接相加減，要先通分']]}},
 /* NC-5-5-1 整數 × 分數 */
 ixf(){let n,d;do{d=ri(2,9);n=ri(1,d+3)}while(gcd(n,d)!==1||n===d);const w=ri(2,9),ctx=Math.random()<.5?pick([['公升','1 瓶果汁有','瓶'],['公斤','1 袋米重','袋'],['公尺','1 條緞帶長','條']]):null;
  return {type:'frac',text:ctx?`${ctx[1]} ${fr(n,d)} ${ctx[0]}，${w} ${ctx[2]}共有多少${ctx[0]}？`:`算算看：${w} × ${fr(n,d)}`,big:`<div class="bx">${w} × ${fr(n,d)} ＝ ？</div>`,ans:Fr(w*n,d),unit:ctx?ctx[0]:'',
   hints:[`${w} 個 ${fr(n,d)} 相加`,`分母不變，分子 ${n} × ${w}`,'能約分要約分'],sol:[`${w} × ${fr(n,d)} ＝ ${fr(w+' × '+n,d)}`,`＝ ${eq(w*n,d)}`],trapsF:[[Fr(n,w*d),'整數只乘分子，分母不變']]}},
 /* NC-5-5-2 分數 × 分數 */
 fxf(){let a,b,c,d;do{b=ri(2,9);a=ri(1,b-1);d=ri(2,9);c=ri(1,d-1)}while(gcd(a,b)!==1||gcd(c,d)!==1);const ctx=Math.random()<.4;
  return {type:'frac',text:ctx?`一塊蛋糕的 ${fr(a,b)} 給弟弟，弟弟吃了其中的 ${fr(c,d)}。弟弟吃了整塊蛋糕的幾分之幾？`:`算算看：${fr(a,b)} × ${fr(c,d)}`,big:`<div class="bx">${fr(a,b)} × ${fr(c,d)} ＝ ？</div>`,ans:Fr(a*c,b*d),unit:ctx?'塊':'',
   hints:['分子乘分子，分母乘分母','可以先約分再相乘，比較好算',`${fr(a,b)} 的 ${fr(c,d)}，就是 ${fr(a,b)} × ${fr(c,d)}`],sol:[`${fr(a,b)} × ${fr(c,d)} ＝ ${fr(a+' × '+c,b+' × '+d)}`,`＝ ${eq(a*c,b*d)}`],trapsF:[[Fr(a*d+b*c,b*d),'這是加法，乘法是分子乘分子、分母乘分母']]}},
 /* NC-5-6 整數相除用分數表示（平分、分裝） */
 idv(){let a,b;do{a=ri(1,12);b=ri(2,9)}while(a%b===0);
  if(Math.random()<.5){const it=pick([['個披薩','人','個'],['公升果汁','個杯子','公升'],['條吐司','人','條']]);
   return {type:'frac',text:`${a} ${it[0]}平分給 ${b} ${it[1]}，每${it[1]==='人'?'人':'個杯子'}分到多少${it[2]}？`,big:`<div class="bx">${a} ÷ ${b} ＝ ？</div>`,ans:Fr(a,b),unit:it[2],
    hints:[`平分就用除法：${a} ÷ ${b}`,'除不盡也沒關係，可以用分數表示',`${a} ÷ ${b} ＝ ${fr(a,b)}`],sol:[`${a} ÷ ${b} ＝ ${fr(a,b)}`,...(a>b||gcd(a,b)>1?[`＝ ${mx(a,b)}`]:[])],trapsF:[[Fr(b,a),'被除數寫在分子，除數寫在分母']]}}
  const x=ri(2,7),T=ri(x+1,x*4);if(T%x===0)return G.idv();
  return {type:'frac',text:`有 ${T} 公升的水，每 ${x} 公升裝成 1 桶，可以裝成幾桶？（用分數表示）`,big:`<div class="bx">${T} ÷ ${x} ＝ ？</div>`,ans:Fr(T,x),unit:'桶',
   hints:[`問「有幾個 ${x} 公升」，用除法 ${T} ÷ ${x}`,'裝不滿的那一桶，用分數表示',`${T} ÷ ${x} ＝ ${fr(T,x)}`],sol:[`${T} ÷ ${x} ＝ ${eq(T,x)}`,`表示可以裝成 ${mx(T,x)} 桶`],trapsF:[[Fr(x,T),'被除數寫在分子，除數寫在分母']]}},
 /* NC-5-7-1 分數 ÷ 整數 */
 fdi(){let a,b;do{b=ri(2,9);a=ri(1,b*2)}while(gcd(a,b)!==1);const c=ri(2,6);const nice=a%c===0;
  return {type:'frac',text:Math.random()<.5?`${fr(a,b)} 公斤的糖平分成 ${c} 包，每包幾公斤？`:`算算看：${fr(a,b)} ÷ ${c}`,big:`<div class="bx">${fr(a,b)} ÷ ${c} ＝ ？</div>`,ans:Fr(a,b*c),
   hints:[`÷ ${c} 就是變成 ${fr(1,c)}，也就是 × ${fr(1,c)}`,nice?`也可以直接分子 ${a} ÷ ${c}`:`分子 ${a} 不能被 ${c} 整除，就把分母乘以 ${c}`],sol:[`${fr(a,b)} ÷ ${c} ＝ ${fr(a,b)} × ${fr(1,c)}`,`＝ ${eq(a,b*c)}`],trapsF:[[Fr(a*c,b),'平分會變少，不是乘以 '+c]]}},
 /* NC-5-8-1 小數乘法直式 */
 dml(){const p1=pick([1,1,2]),p2=pick([0,1,1,2]);const A=ri(11,p1===2?999:99),B=ri(2,p2?99:9);if(A%10===0||B%10===0)return G.dml();const a=A/Math.pow(10,p1),b=B/Math.pow(10,p2),ans=+(A*B/Math.pow(10,p1+p2)).toFixed(6);
  return Q({text:`算算看：${pv(a)} × ${pv(b)}`,big:`<div class="bx">${pv(a)} × ${pv(b)} ＝ ？</div>`,ans,hints:['先不看小數點，當整數相乘',`${A} × ${B} ＝ ${A*B}`,`兩個數一共有 ${p1+p2} 位小數，積也要有 ${p1+p2} 位小數`],
   sol:[`${A} × ${B} ＝ ${A*B}`,`小數位數：${p1} ＋ ${p2} ＝ ${p1+p2} 位`,`${pv(a)} × ${pv(b)} ＝ ${pv(ans)}`],traps:[[A*B,'記得點上小數點'],[+(A*B/Math.pow(10,Math.max(p1,p2))).toFixed(6),'積的小數位數是兩個數的小數位數加起來']]})},
 /* NC-5-9-1 整數、小數 ÷ 整數，商為小數；分數換小數 */
 ddv(){const k=ri(0,3);
  if(k===3){const [n,d]=pick([[1,2],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,8],[3,8],[5,8],[7,8],[5,4],[7,4],[9,8],[13,8]]);const ans=n/d;
   return Q({text:`把 ${fr(n,d)} 換成小數。`,big:`<div class="bx">${fr(n,d)} ＝ ？</div>`,ans,hints:[`${fr(n,d)} 就是 ${n} ÷ ${d}`,'除不盡就在被除數後面補 0，繼續除'],sol:[`${fr(n,d)} ＝ ${n} ÷ ${d}`,`＝ ${pv(ans)}`]})}
  let d,q,a;for(;;){d=ri(2,k?24:9);const qp=pick([1,1,2,2,3]);q=ri(2,999)/Math.pow(10,qp);if(Math.round(q*Math.pow(10,qp))%10===0)continue;a=+(q*d).toFixed(6);const ap=(String(a).split('.')[1]||'').length;if(k===0&&ap)continue;if(k>0&&!ap)continue;if(a>500)continue;break}
  return Q({text:k===0?`${a} 公尺的繩子平分成 ${d} 段，每段幾公尺？`:`算算看：${pv(a)} ÷ ${d}`,big:`<div class="bx">${pv(a)} ÷ ${d} ＝ ？</div>`,ans:q,unit:k===0?'公尺':'',
   hints:['用直式一位一位除','商的小數點要和被除數的小數點對齊','除到個位還有剩，就換成十分位、百分位繼續除（後面補 0）'],
   sol:[`${pv(a)} ÷ ${d}：先算整數部分 ${Math.floor(a/d)}，剩下 ${pv(+(a-Math.floor(a/d)*d).toFixed(6))}`,'剩下的換成更小的位（補 0）繼續除',`${pv(a)} ÷ ${d} ＝ ${pv(q)}`],traps:[[+(q*10).toFixed(6),'小數點的位置放錯了，要和被除數對齊'],[+(q/10).toFixed(6),'小數點的位置放錯了，要和被除數對齊']]})},
 /* RC-5-1 三步驟問題併式 */
 stp(){const k=ri(0,3);
  if(k===0){const m=ri(5,10)*100,a=ri(2,4),p=ri(3,15)*10,b=ri(20,95);if(a*p+b>=m)return G.stp();const ans=m-a*p-b;
   return Q({text:`媽媽帶 ${m} 元去買東西，買了 ${a} 盒 ${p} 元的餅乾和 1 瓶 ${b} 元的牛奶，還剩下多少元？`,ans,unit:'元',hints:['先算餅乾一共多少元',`${a} × ${p}`,'再從帶的錢裡扣掉餅乾和牛奶'],sol:[`併式：${m} － ${a} × ${p} － ${b}`,`＝ ${m} － ${a*p} － ${b}`,`＝ ${m-a*p} － ${b}`,`＝ ${ans}（元）`],traps:[[(m-a)*p-b,'先乘除後加減']]})}
  if(k===1){const n=ri(3,8),e=ri(4,12),br=ri(2,9);const ans=n*e-br;const pk=ri(2,6);if(ans%pk)return G.stp();
   return Q({text:`買了 ${n} 盒雞蛋，每盒 ${e} 顆，破了 ${br} 顆，剩下的每 ${pk} 顆裝一袋，可以裝幾袋？`,ans:ans/pk,unit:'袋',hints:['先算一共有幾顆',`${n} × ${e}`,'扣掉破掉的，再除以每袋幾顆'],sol:[`併式：(${n} × ${e} － ${br}) ÷ ${pk}`,`＝ (${n*e} － ${br}) ÷ ${pk}`,`＝ ${ans} ÷ ${pk}`,`＝ ${ans/pk}（袋）`],traps:[[n*e-br/pk,'要先算出剩下幾顆，再分裝，記得加括號']]})}
  if(k===2){const a=ri(3,9)*100,b=ri(2,9)*100,c=ri(2,9)*100,n=pick([2,3,4,5]);const s=a+b+c;if(s%n)return G.stp();
   return Q({text:`${n} 個人一起去旅行，門票 ${a} 元、交通費 ${b} 元、餐費 ${c} 元，平均每人要付多少元？`,ans:s/n,unit:'元',hints:['先算一共花多少錢','再平分給每個人'],sol:[`併式：(${a} ＋ ${b} ＋ ${c}) ÷ ${n}`,`＝ ${s} ÷ ${n}`,`＝ ${s/n}（元）`],traps:[[a+b+c/n,'三項加起來要加括號，再除以人數']]})}
  const p=ri(3,9)*10,q2=ri(2,6),r=ri(2,9)*10,s2=ri(2,5);const ans=p*q2+r*s2;
  return Q({text:`買 ${q2} 枝 ${p} 元的筆和 ${s2} 本 ${r} 元的筆記本，一共要付多少元？`,ans,unit:'元',hints:['筆的錢和筆記本的錢分開算','再加起來'],sol:[`併式：${p} × ${q2} ＋ ${r} × ${s2}`,`＝ ${p*q2} ＋ ${r*s2}`,`＝ ${ans}（元）`],traps:[[(p*q2+r)*s2,'先乘除後加減']]})},
 /* RC-5-2-1 分配律 */
 dst(){const k=ri(0,2);
  if(k===0){const a=pick([25,125,4,8,5]),m=pick(a===25||a===4?[100]:a===125||a===8?[1000]:[10,100]),x=m/a,y=ri(1,9),add=Math.random()<.5,n=add?x+y:x-y;if(n<2)return G.dst();
   return Q({text:`用簡單的方法算：${a} × ${n}`,big:`<div class="bx">${a} × ${n} ＝ ？</div>`,ans:a*n,hints:[`把 ${n} 拆成 ${x} ${add?'＋':'－'} ${y}`,`${a} × ${x} ＝ ${a*x} 很好算`,'用分配律：分開乘再相加減'],sol:[`${a} × ${n} ＝ ${a} × (${x} ${add?'＋':'－'} ${y})`,`＝ ${a} × ${x} ${add?'＋':'－'} ${a} × ${y}`,`＝ ${a*x} ${add?'＋':'－'} ${a*y} ＝ ${a*n}`]})}
  if(k===1){const a=ri(12,89),m=pick([99,101,98,102,999]),base=m>500?1000:100,dd=m-base;
   return Q({text:`用簡單的方法算：${a} × ${m}`,big:`<div class="bx">${a} × ${m} ＝ ？</div>`,ans:a*m,hints:[`${m} ＝ ${base} ${dd<0?'－':'＋'} ${Math.abs(dd)}`,`${a} × ${base} ＝ ${a*base}`],sol:[`${a} × ${m} ＝ ${a} × (${base} ${dd<0?'－':'＋'} ${Math.abs(dd)})`,`＝ ${a*base} ${dd<0?'－':'＋'} ${a*Math.abs(dd)}`,`＝ ${a*m}`]})}
  const a=ri(12,49),b=ri(2,9),c=10*ri(1,9)-b>0?10*ri(1,9)-b:ri(2,9);const s=b+c,t=s%10===0?s:null;if(!t)return G.dst();
  return Q({text:`用簡單的方法算：${a} × ${b} ＋ ${a} × ${c}`,big:`<div class="bx">${a} × ${b} ＋ ${a} × ${c} ＝ ？</div>`,ans:a*s,hints:[`兩項都乘以 ${a}，可以合起來`,`${a} × (${b} ＋ ${c})`],sol:[`${a} × ${b} ＋ ${a} × ${c} ＝ ${a} × (${b} ＋ ${c})`,`＝ ${a} × ${s} ＝ ${a*s}`]})},
 /* RC-5-2-3 四則混合計算 */
 mix4(){const k=ri(0,3);let e,ans,st;
  if(k===0){const b=ri(2,9),c=ri(2,9),a=ri(10,99),d=ri(1,20);ans=a+b*c-d;if(ans<0)return G.mix4();e=`${a} ＋ ${b} × ${c} － ${d}`;st=[`先算乘法：${b} × ${c} ＝ ${b*c}`,`${a} ＋ ${b*c} － ${d} ＝ ${ans}`]}
  else if(k===1){const c=ri(2,9),q=ri(2,15),b=c*q,a=ri(2,9),d=ri(1,30);ans=a*q+d;e=`${a} × ${b} ÷ ${c} ＋ ${d}`;st=[`由左往右先算乘除：${a} × ${b} ＝ ${a*b}`,`${a*b} ÷ ${c} ＝ ${a*q}`,`${a*q} ＋ ${d} ＝ ${ans}`]}
  else if(k===2){const a=ri(20,90),b=ri(5,a-5),c=ri(2,9);ans=(a-b)*c;e=`(${a} － ${b}) × ${c}`;st=[`先算括號：${a} － ${b} ＝ ${a-b}`,`${a-b} × ${c} ＝ ${ans}`]}
  else{const c=ri(2,9),s=c*ri(3,12),a=ri(1,s-1),b=s-a,d=ri(2,40);ans=s/c+d;e=`(${a} ＋ ${b}) ÷ ${c} ＋ ${d}`;st=[`先算括號：${a} ＋ ${b} ＝ ${s}`,`再算除法：${s} ÷ ${c} ＝ ${s/c}`,`${s/c} ＋ ${d} ＝ ${ans}`]}
  return Q({text:`算算看：${e}`,big:`<div class="bx">${e} ＝ ？</div>`,ans,hints:['有括號先算括號','先乘除、後加減','同樣是乘除（或加減），由左往右算'],sol:st})},
 /* SC-5-1-1 三角形內角和 180 度 */
 tri(){let a,b;do{a=ri(25,95);b=ri(25,95)}while(a+b>150);const c=180-a-b,ask=pick(['a','b','c']),ans={a,b,c}[ask],kn=['a','b','c'].filter(x=>x!==ask).map(x=>({a,b,c})[x]);
  return Q({text:'三角形的三個角加起來是 180 度。圖中「？」的角是幾度？',fig:['xtri',{a,b,c,ask}],ans,unit:'度',hints:['三角形三個內角的和是 180°',`另外兩個角是 ${kn[0]}° 和 ${kn[1]}°`,`180 － ${kn[0]} － ${kn[1]}`],sol:[`180 － ${kn[0]} － ${kn[1]} ＝ ${ans}（度）`],traps:[[360-kn[0]-kn[1],'三角形內角和是 180°，不是 360°']]})},
 /* SC-5-1-3 平行四邊形：對邊相等、對角相等 */
 par(){const l=ri(6,15),s=ri(3,l-1),ang=ri(50,80),k=ri(0,3);
  const map=[['s','?s','對邊相等：甲丁和乙丙一樣長',s,'公分',`甲丁 ＝ ${s} 公分，所以乙丙也是 ${s} 公分`,'右邊的邊（乙丙）是幾公分？'],
   ['l','?t','對邊相等：甲乙和丁丙一樣長',l,'公分',`甲乙 ＝ ${l} 公分，所以丁丙也是 ${l} 公分`,'上面的邊（丁丙）是幾公分？'],
   ['A','?C','對角相等：∠甲和∠丙一樣大',ang,'度',`∠甲 ＝ ${ang}°，所以∠丙也是 ${ang}°`,'∠丙是幾度？'],
   ['A','?B','相鄰兩個角加起來是 180°',180-ang,'度',`∠甲 ＋ ∠乙 ＝ 180°，180 － ${ang} ＝ ${180-ang}`,'∠乙是幾度？']][k];
  return Q({text:`下面是平行四邊形。${map[6]}`,fig:['xpar',{l,s,ang,show:[map[0],map[1]]}],ans:map[3],unit:map[4],hints:[map[2]],sol:[map[5]],traps:k===3?[[ang,'∠乙和∠甲是相鄰的角，加起來是 180°']]:k===2?[[180-ang,'∠丙是∠甲的對角，對角相等']]:[]})},
 /* SC-5-2-1 平行四邊形、三角形、梯形面積 */
 area(){const k=pick(['p','t','z']);const b=ri(4,16),h=ri(3,12),t=k==='z'?ri(2,b-1):0;const ans=k==='p'?b*h:k==='t'?b*h/2:(b+t)*h/2;if(ans!==Math.floor(ans))return G.area();
  const nm={p:'平行四邊形',t:'三角形',z:'梯形'}[k];
  const hs={p:['平行四邊形面積 ＝ 底 × 高','切下一塊移過去，可以拼成長方形'],t:['三角形面積 ＝ 底 × 高 ÷ 2','兩個一樣的三角形可以拼成平行四邊形'],z:['梯形面積 ＝（上底 ＋ 下底）× 高 ÷ 2','兩個一樣的梯形可以拼成平行四邊形']}[k];
  const sl={p:[`${b} × ${h} ＝ ${ans}`],t:[`${b} × ${h} ÷ 2 ＝ ${ans}`],z:[`(${t} ＋ ${b}) × ${h} ÷ 2`,`＝ ${b+t} × ${h} ÷ 2 ＝ ${ans}`]}[k];
  return Q({text:`下面${nm}的面積是幾平方公分？`,fig:['xarea',{k,b,h,t}],ans,unit:'平方公分',hints:hs,sol:sl,traps:k!=='p'?[[k==='t'?b*h:(b+t)*h,'還要除以 2']]:[[(b+h)*2,'這是周長的算法']]})},
 /* SC-5-3-1 扇形：圓心角和幾分之幾圓 */
 sec(){const opts=[[90,1,4],[180,1,2],[120,1,3],[60,1,6],[45,1,8],[270,3,4],[240,2,3],[30,1,12],[150,5,12],[72,1,5]];const [ang,n,d]=pick(opts);
  if(Math.random()<.5)return {type:'frac',text:`圓心角 ${ang} 度的扇形，是幾分之幾圓？`,fig:['xsec',{ang,lab:`${ang}°`}],ans:Fr(n,d),pre:'',unit:'圓',hints:['一整個圓的圓心角是 360°',`${ang} 是 360 的幾分之幾？`,`${fr(ang,360)} 約分`],sol:[`${ang} ÷ 360 ＝ ${fr(ang,360)} ＝ ${fr(n,d)}`,`所以是 ${fr(n,d)} 圓`]};
  return Q({text:`${fr(n,d)} 圓的扇形，圓心角是幾度？`,fig:['xsec',{ang,lab:'？'}],ans:ang,unit:'度',hints:['一整個圓的圓心角是 360°',`${fr(n,d)} 圓的圓心角 ＝ 360 × ${fr(n,d)}`],sol:[`360 × ${fr(n,d)} ＝ ${ang}（度）`],traps:[[360-ang,'看清楚是哪一塊扇形']]})},
 /* SC-5-5-1 長方體、正方體體積 */
 vol(){const cube=Math.random()<.35;const l=ri(2,10),w=cube?l:ri(2,8),h=cube?l:ri(2,9);const ans=l*w*h;
  return Q({text:cube?`邊長 ${l} 公分的正方體，體積是幾立方公分？`:'下面長方體的體積是幾立方公分？',fig:cube?null:['xbox',{l,w,h}],big:cube?`<div class="bx">正方體，邊長 ${l} 公分</div>`:'',ans,unit:'立方公分',hints:[cube?'正方體體積 ＝ 邊長 × 邊長 × 邊長':'長方體體積 ＝ 長 × 寬 × 高','一層有幾個 1 立方公分，再乘以幾層'],sol:[`${l} × ${w} × ${h} ＝ ${ans}（立方公分）`],traps:[[2*(l*w+w*h+l*h),'這是表面積，體積是長 × 寬 × 高'],[l+w+h,'要用乘的']]})},
 /* SC-5-6-1 面與面的平行、垂直 */
 face(){const k=ri(0,2);const q=[['一個長方體，和其中一個面「平行」的面有幾個？',1,'平行的面就是正對面的那一個面'],['一個長方體，和其中一個面「垂直」的面有幾個？',4,'旁邊四周的四個面都和它垂直'],['一個正方體一共有幾組互相平行的面？',3,'上下一組、前後一組、左右一組']][k];
  return Q({text:q[0],big:'<div class="bx">📦 想一想面紙盒</div>',ans:q[1],unit:k===2?'組':'個',hints:['拿一個面紙盒或鉛筆盒看看',q[2]],sol:[q[2],`答案是 ${q[1]}`]})},
 /* ── 四年級 ── */
 /* NC-4-5-3 同分母分數加減、整數倍 */
 sfr(){const k=ri(0,2);let d,a,b,r,add;
  /* 四年級還沒學約分：答案一定是最簡分數（分子、分母互質） */
  if(k===2){let n,x;do{d=ri(3,12);n=ri(2,5);x=ri(1,d-1)}while(gcd(x*n,d)!==1);return {type:'frac',text:`${n} 個 ${fr(x,d)} 是多少？`,big:`<div class="bx">${fr(x,d)} × ${n} ＝ ？</div>`,ans:Fr(x*n,d),hints:['分母不變，分子乘以 '+n,'可以寫成假分數或帶分數'],sol:[`${fr(x,d)} × ${n} ＝ ${fr(x*n,d)}`,...(x*n>d?[`＝ ${mx(x*n,d)}`]:[])]}}
  do{d=ri(3,12);a=ri(1,d-1);b=ri(1,d-1);add=k===0||a<b;r=add?a+b:a-b}while(a===b||r<=0||r===d||gcd(r,d)!==1);if(!add&&a<b)[a,b]=[b,a];
  return {type:'frac',text:`算算看：${fr(a,d)} ${add?'＋':'－'} ${fr(b,d)}`,big:`<div class="bx">${fr(a,d)} ${add?'＋':'－'} ${fr(b,d)} ＝ ？</div>`,ans:Fr(r,d),hints:['分母一樣，分母不變','分子相加（相減）'],sol:[`${fr(a,d)} ${add?'＋':'－'} ${fr(b,d)} ＝ ${fr(r,d)}`,...(r>d?[`＝ ${mx(r,d)}`]:[])],trapsF:[[Fr(r,d*2),'分母不用相加']]}},
 /* NC-4-5-2 假分數和帶分數互換 */
 mxf(){let n,d;do{d=ri(2,9);n=ri(d+1,d*5)}while(n%d===0||gcd(n,d)!==1);const w=Math.floor(n/d),r=n%d;
  if(Math.random()<.5)return Q({text:`把帶分數 ${w}${fr(r,d)} 化成假分數，分子是多少？`,big:`<div class="bx">${w}${fr(r,d)} ＝ <span class="fr"><i>□</i><i>${d}</i></span></div>`,ans:n,hints:[`${w} 個 1 就是 ${w} 個 ${fr(d,d)}`,`${w} × ${d} ＋ ${r}`],sol:[`${w} × ${d} ＋ ${r} ＝ ${n}`,`${w}${fr(r,d)} ＝ ${fr(n,d)}`]});
  return {type:'frac',text:`把假分數 ${fr(n,d)} 化成帶分數。`,big:`<div class="bx">${fr(n,d)} ＝ ？</div>`,ans:Fr(n,d),hints:[`${n} 裡面有幾個 ${d}？`,`${n} ÷ ${d} ＝ ${w} … ${r}`],sol:[`${n} ÷ ${d} ＝ ${w} … ${r}`,`${fr(n,d)} ＝ ${w}${fr(r,d)}`]}},
 /* NC-4-4 概數：無條件進入、無條件捨去、四捨五入 */
 rnd4(){const n=ri(1000,99999),p=pick([10,100,1000]),k=ri(0,2);if(n<p*2)return G.rnd4();const pn={10:'十位',100:'百位',1000:'千位'}[p];const lo=Math.floor(n/p)*p,hi=lo===n?n:lo+p,rd=Math.round(n/p)*p;
  const nm=['無條件進入法','無條件捨去法','四捨五入法'][k],ans=[hi,lo,rd][k];
  return Q({text:`用${nm}，把 ${cm(n)} 取概數到${pn}。`,big:`<div class="bx">${cm(n)} ≈ ？</div>`,ans,pre:'約',hints:[`看${pn}以下的數`,k===0?'只要後面不是 0，就進 1':k===1?'後面的數全部捨去變 0':'下一位 5 以上進 1，4 以下捨去'],sol:[`${cm(n)} 用${nm}取到${pn} ≈ ${cm(ans)}`],traps:[[[lo,hi,lo===rd?hi:lo][k],'看清楚是哪一種取法']]})},
 /* RC-4-1 兩步驟四則 */
 two(){const k=ri(0,2);
  if(k===0){const p=ri(12,60),n=ri(3,9),m=ri(5,10)*100;if(p*n>=m)return G.two();const ans=m-p*n;return Q({text:`一本筆記本 ${p} 元，買 ${n} 本，付 ${m} 元，要找回多少元？`,ans,unit:'元',hints:['先算筆記本一共多少錢',`${p} × ${n}`],sol:[`${m} － ${p} × ${n}`,`＝ ${m} － ${p*n} ＝ ${ans}（元）`],traps:[[(m-p)*n,'先乘除後加減']]})}
  if(k===1){const n=ri(3,9),q=ri(4,25),r=ri(1,30);const ans=n*q+r;return Q({text:`每排坐 ${q} 人，坐了 ${n} 排，還有 ${r} 人站著，一共有幾人？`,ans,unit:'人',hints:['先算坐著的有幾人','再加上站著的'],sol:[`${q} × ${n} ＋ ${r}`,`＝ ${q*n} ＋ ${r} ＝ ${ans}（人）`]})}
  const a=ri(100,500),b=ri(50,300),c=ri(2,6);const s=a+b;if(s%c)return G.two();return Q({text:`哥哥有 ${a} 元，弟弟有 ${b} 元，兩人的錢合起來平分給 ${c} 個人，每人分到多少元？`,ans:s/c,unit:'元',hints:['先算合起來多少元','合起來的要加括號，再除'],sol:[`(${a} ＋ ${b}) ÷ ${c}`,`＝ ${s} ÷ ${c} ＝ ${s/c}（元）`],traps:[[a+b/c,'要先加起來再平分，加括號']]})},
 /* SC-4-3 長方形、正方形的周長和面積 */
 rect(){const sq=Math.random()<.3,l=ri(3,15),w=sq?l:ri(2,l-1),per=Math.random()<.5,ans=per?2*(l+w):l*w;
  return Q({text:`下面${sq?'正方形':'長方形'}的${per?'周長是幾公分':'面積是幾平方公分'}？`,fig:['xrect',{l,w,sq}],ans,unit:per?'公分':'平方公分',hints:per?[sq?'正方形周長 ＝ 邊長 × 4':'長方形周長 ＝（長 ＋ 寬）× 2','四條邊加起來']:[sq?'正方形面積 ＝ 邊長 × 邊長':'長方形面積 ＝ 長 × 寬','一排有幾個 1 平方公分，有幾排'],
   sol:[per?(sq?`${l} × 4 ＝ ${ans}`:`(${l} ＋ ${w}) × 2 ＝ ${ans}`):`${l} × ${w} ＝ ${ans}`],traps:per?[[l*w,'這是面積，周長是四條邊加起來']]:[[2*(l+w),'這是周長，面積是長 × 寬']]})},
 /* NC-4-2-1 較大位數的乘法直式 */
 bigm(){const a=ri(102,989),b=ri(12,98);if(a%10===0||b%10===0)return G.bigm();const b1=b%10,b10=b-b1;
  return Q({text:`用直式算算看：${a} × ${b}`,big:`<div class="bx">${a} × ${b} ＝ ？</div>`,ans:a*b,hints:[`先算 ${a} × ${b1}`,`再算 ${a} × ${b10}（往左移一位寫）`,'兩個結果加起來'],sol:[`${a} × ${b1} ＝ ${a*b1}`,`${a} × ${b10} ＝ ${a*b10}`,`${a*b1} ＋ ${a*b10} ＝ ${a*b}`],traps:[[a*b1+a*(b10/10),'十位數的乘積要往左移一位（後面補 0）']]})}
};

/* 題型清單：代號、名稱、分類（老師頁勾選用）、對應的基本學習內容 */
const LIST=[
 ['pv','十進位位值（乘除 10、100、1000）','數與計算','NC-5-1-1'],['rnd','小數取概數','數與計算','NC-5-11-1'],
 ['fac','因數、最大公因數','數與計算','NC-5-3-1'],['mul','倍數、最小公倍數','數與計算','NC-5-3-2'],
 ['eqf','約分、擴分','分數','NC-5-4-1'],['adf','異分母分數加減、比大小','分數','NC-5-4-2'],['ixf','整數 × 分數','分數','NC-5-5-1'],['fxf','分數 × 分數','分數','NC-5-5-2'],
 ['idv','整數相除用分數表示','分數','NC-5-6'],['fdi','分數 ÷ 整數','分數','NC-5-7-1'],
 ['dml','小數乘法','小數','NC-5-8-1'],['ddv','除法商為小數、分數換小數','小數','NC-5-9-1'],
 ['stp','三步驟問題併式','四則運算','RC-5-1'],['dst','分配律','四則運算','RC-5-2-1'],['mix4','四則混合計算','四則運算','RC-5-2-3'],
 ['tri','三角形內角和','幾何','SC-5-1-1'],['par','平行四邊形的邊和角','幾何','SC-5-1-3'],['area','平行四邊形、三角形、梯形面積','幾何','SC-5-2-1'],['sec','扇形','幾何','SC-5-3-1'],['vol','長方體、正方體體積','幾何','SC-5-5-1'],['face','面與面的平行、垂直','幾何','SC-5-6-1'],
 ['sfr','同分母分數加減（四年級）','四年級','NC-4-5-3'],['mxf','假分數、帶分數互換（四年級）','四年級','NC-4-5-2'],['rnd4','整數取概數（四年級）','四年級','NC-4-4'],['two','兩步驟四則（四年級）','四年級','RC-4-1'],['rect','長方形、正方形周長面積（四年級）','四年級','SC-4-3'],['bigm','大數乘法直式（四年級）','四年級','NC-4-2-1']
];
window.XF={G,LIST,FIG:XFIG};
})();
