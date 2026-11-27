'use strict';
/* 無盡雲階（2026-11-27 加入 601 學習平台）：帶著自己的寵物往上爬，比「站穩的最高高度」。
   - 用平台共用的 5 分鐘遊戲時間（__learn601.startPlay）：5 分鐘內掉下去可以馬上再挑戰，不再扣券。
   - 時間到這一局就直接結算，不能用券接關（老師決定：排行榜比的是一張券 5 分鐘內爬多高，比較公平）。
   - 成績交給平台記（skyRec：歷史最佳、本週最佳；雲端 lb/skyclimb/座號）；測試帳號不扣券、不上榜。
   玩法、關卡、機關沿用 GPT 做的試玩版（無盡關卡、寵物動作圖、會先預警的空中障礙）。 */
let P=null;try{P=window.parent!==window&&window.parent.__learn601}catch(e){}
/* 寵物動作圖切格（img/sky/pet/寵物-階.webp，原圖縮成一半）：前 4 格走路、第 5 格起跳、第 6 格下落；每格最後兩個數字是腳底的位置 */
const PET_ASSETS={"bear-0":{"flip":1,"scale":0.28205,"f":[[0,0,256,256,129,225],[256,0,256,256,130,225],[512,0,256,256,128.5,225],[0,256,256,256,134,226],[256,256,256,256,128,200],[512,256,256,256,129.5,229]]},"bear-1":{"flip":1,"scale":0.28062,"f":[[0,0,256,256,126.5,226],[256,0,256,256,121.5,224],[512,0,256,256,120.5,226.5],[0,256,256,256,129,238.5],[256,256,256,256,124,206.5],[512,256,256,256,123,236]]},"bear-2":{"flip":1,"scale":0.29324,"f":[[0,0,256,256,128.5,229.5],[256,0,256,256,129.5,229],[512,0,256,256,130.5,229],[0,256,256,256,129.5,235.5],[256,256,256,256,128,208],[512,256,256,256,129,237]]},"blob-0":{"flip":1,"scale":0.34429,"f":[[0,0,256,256,133,213],[256,0,256,256,129.5,213],[512,0,256,256,128,213.5],[0,256,256,256,137.5,214],[256,256,256,256,133,186.5],[512,256,256,256,131.5,216.5]]},"blob-1":{"flip":1,"scale":0.32961,"f":[[0,0,256,256,132,222.5],[256,0,256,256,122,222.5],[512,0,256,256,119,222.5],[0,256,256,256,136,223.5],[256,256,256,256,125,196.5],[512,256,256,256,115.5,223.5]]},"blob-2":{"flip":1,"scale":0.35457,"f":[[0,0,256,256,121.5,211],[256,0,256,256,123.5,211],[512,0,256,256,131.5,210.5],[0,256,256,256,132,216.5],[256,256,256,256,127.5,183],[512,256,256,256,129,226]]},"bunny-0":{"flip":1,"scale":0.25641,"f":[[0,0,256,256,138.5,227],[256,0,256,256,134.5,225],[512,0,256,256,126.5,227.5],[0,256,256,256,141,230],[256,256,256,256,136.5,204],[512,256,256,256,125,234.5]]},"bunny-1":{"flip":-1,"scale":0.35596,"f":[[0,0,256,256,132.5,206.5],[256,0,256,256,130,207],[512,0,256,256,129,204],[0,256,256,256,130.5,205.5],[256,256,256,256,128,184.5],[512,256,256,256,125.5,199.5]]},"bunny-2":{"flip":-1,"scale":0.29527,"f":[[0,0,256,256,132.5,224.5],[256,0,256,256,133,224.5],[512,0,256,256,132.5,224.5],[0,256,256,256,128.5,226],[256,256,256,256,128.5,200],[512,256,256,256,130,227]]},"cat-0":{"flip":1,"scale":0.28796,"f":[[0,0,256,256,137,222.5],[256,0,256,256,127.5,221.5],[512,0,256,256,122.5,222.5],[0,256,256,256,136.5,223.5],[256,256,256,256,130.5,197.5],[512,256,256,256,126.5,217]]},"cat-1":{"flip":1,"scale":0.42143,"f":[[0,0,256,256,139,195],[256,0,256,256,134,194.5],[512,0,256,256,127.5,195],[0,256,256,256,139.5,194.5],[256,256,256,256,134,176],[512,256,256,256,131,188.5]]},"cat-2":{"flip":1,"scale":0.30843,"f":[[0,0,256,256,136,224],[256,0,256,256,125,223.5],[512,0,256,256,116,224],[0,256,256,256,133.5,224],[256,256,256,256,128.5,194.5],[512,256,256,256,121,225]]},"chick-0":{"flip":1,"scale":0.30137,"f":[[0,0,256,256,132.5,204],[256,0,256,256,132.5,203],[512,0,256,256,131,203.5],[0,256,256,256,131,203.5],[256,256,256,256,134.5,187.5],[512,256,256,256,130.5,206]]},"chick-1":{"flip":1,"scale":0.30295,"f":[[0,0,256,256,130,218.5],[256,0,256,256,124,218.5],[512,0,256,256,117,219],[0,256,256,256,130.5,216],[256,256,256,256,128.5,204.5],[512,256,256,256,130,211]]},"chick-2":{"flip":1,"scale":0.33997,"f":[[0,0,256,256,127,209.5],[256,0,256,256,127.5,207.5],[512,0,256,256,126,208.5],[0,256,256,256,127.5,209],[256,256,256,256,128,204],[512,256,256,256,128.5,211.5]]},"deer-0":{"flip":1,"scale":0.25731,"f":[[0,0,256,256,135,223],[256,0,256,256,134.5,223],[512,0,256,256,135.5,223.5],[0,256,256,256,135,226],[256,256,256,256,136.5,187.5],[512,256,256,256,136,225.5]]},"deer-1":{"flip":1,"scale":0.26339,"f":[[0,0,256,256,137,232.5],[256,0,256,256,135,230.5],[512,0,256,256,128,230],[0,256,256,256,140,236],[256,256,256,256,136.5,194],[512,256,256,256,131,230.5]]},"deer-2":{"flip":1,"scale":0.37372,"f":[[0,0,256,256,140.5,206],[256,0,256,256,120.5,205],[512,0,256,256,115,203],[0,256,256,256,134.5,203.5],[256,256,256,256,125,176.5],[512,256,256,256,120,201.5]]},"dog-0":{"flip":1,"scale":0.28061,"f":[[0,0,256,256,128.5,219.5],[256,0,256,256,128.5,217.5],[512,0,256,256,128.5,217.5],[0,256,256,256,129.5,222.5],[256,256,256,256,129,200],[512,256,256,256,130,228]]},"dog-1":{"flip":1,"scale":0.27474,"f":[[0,0,256,256,121.5,224],[256,0,256,256,123,221.5],[512,0,256,256,122,224],[0,256,256,256,123.5,219.5],[256,256,256,256,120,191.5],[512,256,256,256,120.5,222.5]]},"dog-2":{"flip":1,"scale":0.32446,"f":[[0,0,256,256,121.5,219],[256,0,256,256,117,216],[512,0,256,256,113,221],[0,256,256,256,122,221.5],[256,256,256,256,117,196.5],[512,256,256,256,116,238.5]]},"dragon-0":{"flip":1,"scale":0.317,"f":[[0,0,256,256,125.5,213.5],[256,0,256,256,121,211.5],[512,0,256,256,116.5,212.5],[0,256,256,256,130,213.5],[256,256,256,256,128.5,183.5],[512,256,256,256,123,210.5]]},"dragon-1":{"flip":1,"scale":0.32961,"f":[[0,0,256,256,131.5,210.5],[256,0,256,256,121.5,208.5],[512,0,256,256,119.5,208.5],[0,256,256,256,133.5,209.5],[256,256,256,256,123,187.5],[512,256,256,256,115,213]]},"dragon-2":{"flip":1,"scale":0.33596,"f":[[0,0,256,256,134,212],[256,0,256,256,131,211],[512,0,256,256,127.5,212],[0,256,256,256,131,212],[256,256,256,256,132,185.5],[512,256,256,256,129.5,219.5]]},"fox-0":{"flip":1,"scale":0.27638,"f":[[0,0,256,256,124,214.5],[256,0,256,256,123.5,214.5],[512,0,256,256,123.5,215],[0,256,256,256,124.5,216.5],[256,256,256,256,125,201.5],[512,256,256,256,122.5,220.5]]},"fox-1":{"flip":1,"scale":0.29987,"f":[[0,0,256,256,117,217],[256,0,256,256,119,217.5],[512,0,256,256,121.5,217.5],[0,256,256,256,123,221.5],[256,256,256,256,124.5,197],[512,256,256,256,124,226]]},"fox-2":{"flip":1,"scale":0.32737,"f":[[0,0,256,256,125,220.5],[256,0,256,256,125,220],[512,0,256,256,124,219.5],[0,256,256,256,124.5,220],[256,256,256,256,124,192.5],[512,256,256,256,121,216.5]]},"hedgehog-0":{"flip":1,"scale":0.29024,"f":[[0,0,256,256,126,214.5],[256,0,256,256,126.5,216],[512,0,256,256,129.5,217.5],[0,256,256,256,128,218],[256,256,256,256,128,205.5],[512,256,256,256,128,212.5]]},"hedgehog-1":{"flip":1,"scale":0.32418,"f":[[0,0,256,256,130,215.5],[256,0,256,256,126.5,214.5],[512,0,256,256,124.5,215.5],[0,256,256,256,129.5,219.5],[256,256,256,256,128,198.5],[512,256,256,256,126.5,215]]},"hedgehog-2":{"flip":-1,"scale":0.32905,"f":[[0,0,256,256,131,210.5],[256,0,256,256,130.5,209.5],[512,0,256,256,131,211],[0,256,256,256,131,213],[256,256,256,256,130.5,194],[512,256,256,256,131,220.5]]},"lion-0":{"flip":1,"scale":0.35427,"f":[[0,0,225.5,290,135.5,213.5],[225.5,0,226,290,109.5,213.5],[451.5,0,226,290,89,214],[0,290,225.5,290.5,137.5,255.5],[225.5,290,226,290.5,109,251],[451.5,290,226,290.5,87,257.5]]},"lion-1":{"flip":1,"scale":0.27896,"f":[[0,0,256,256,125.5,227],[256,0,256,256,124,227],[512,0,256,256,125,227],[0,256,256,256,126,243.5],[256,256,256,256,123.5,243.5],[512,256,256,256,121.5,246]]},"lion-2":{"flip":1,"scale":0.30843,"f":[[0,0,256,256,125,233],[256,0,256,256,127,235],[512,0,256,256,126.5,235],[0,256,256,256,133,232.5],[256,256,256,256,126.5,184.5],[512,256,256,256,128.5,235]]},"mushroom-0":{"flip":1,"scale":0.38462,"f":[[0,0,256,256,134,196.5],[256,0,256,256,134,196],[512,0,256,256,134.5,195],[0,256,256,256,135,196.5],[256,256,256,256,133.5,180],[512,256,256,256,134.5,194]]},"mushroom-1":{"flip":1,"scale":0.27635,"f":[[0,0,256,256,138.5,228.5],[256,0,256,256,126,228.5],[512,0,256,256,123,228.5],[0,256,256,256,141.5,236.5],[256,256,256,256,132,214],[512,256,256,256,127,238]]},"mushroom-2":{"flip":1,"scale":0.30476,"f":[[0,0,256,256,128.5,226.5],[256,0,256,256,127.5,226],[512,0,256,256,126,226.5],[0,256,256,256,131,230],[256,256,256,256,131.5,194.5],[512,256,256,256,131.5,234]]},"octopus-0":{"flip":1,"scale":0.317,"f":[[0,0,256,256,134.5,213],[256,0,256,256,125.5,213],[512,0,256,256,126.5,212.5],[0,256,256,256,129,213],[256,256,256,256,128,192],[512,256,256,256,125,216.5]]},"octopus-1":{"flip":1,"scale":0.32552,"f":[[0,0,256,256,128.5,217.5],[256,0,256,256,126.5,215],[512,0,256,256,122.5,217.5],[0,256,256,256,129,223],[256,256,256,256,128.5,196.5],[512,256,256,256,123.5,223]]},"octopus-2":{"flip":1,"scale":0.3329,"f":[[0,0,256,256,134,217],[256,0,256,256,134,215.5],[512,0,256,256,134.5,217],[0,256,256,256,134,218],[256,256,256,256,135,195],[512,256,256,256,133,223.5]]},"otter-0":{"flip":1,"scale":0.27261,"f":[[0,0,256,256,134.5,228],[256,0,256,256,127,222],[512,0,256,256,124,227.5],[0,256,256,256,136,215.5],[256,256,256,256,131,194.5],[512,256,256,256,125.5,232.5]]},"otter-1":{"flip":1,"scale":0.30025,"f":[[0,0,256,256,131.5,214],[256,0,256,256,122.5,215],[512,0,256,256,113,216],[0,256,256,256,129,218.5],[256,256,256,256,125.5,198],[512,256,256,256,112.5,227.5]]},"otter-2":{"flip":1,"scale":0.32201,"f":[[0,0,256,256,129.5,216.5],[256,0,256,256,125.5,216.5],[512,0,256,256,124.5,217],[0,256,256,256,128.5,226],[256,256,256,256,125.5,192.5],[512,256,256,256,126,233.5]]},"panda-0":{"flip":1,"scale":0.26764,"f":[[0,0,256,256,139.5,228.5],[256,0,256,256,137,229.5],[512,0,256,256,135.5,228],[0,256,256,256,142.5,232.5],[256,256,256,256,133.5,205],[512,256,256,256,131.5,236.5]]},"panda-1":{"flip":1,"scale":0.28537,"f":[[0,0,256,256,131.5,229],[256,0,256,256,123.5,229.5],[512,0,256,256,128.5,228],[0,256,256,256,125,233],[256,256,256,256,124.5,200],[512,256,256,256,122,228]]},"panda-2":{"flip":1,"scale":0.30118,"f":[[0,0,256,256,142,225],[256,0,256,256,136,226],[512,0,256,256,131,225],[0,256,256,256,143,223.5],[256,256,256,256,135,200.5],[512,256,256,256,138,234.5]]},"penguin-0":{"flip":1,"scale":0.28871,"f":[[0,0,256,256,134,220.5],[256,0,256,256,131.5,219.5],[512,0,256,256,132.5,220.5],[0,256,256,256,135.5,223.5],[256,256,256,256,134.5,199.5],[512,256,256,256,130.5,222]]},"penguin-1":{"flip":1,"scale":0.2741,"f":[[0,0,256,256,140.5,232],[256,0,256,256,125,231.5],[512,0,256,256,116.5,230],[0,256,256,256,139.5,232.5],[256,256,256,256,129,211],[512,256,256,256,119,230.5]]},"penguin-2":{"flip":1,"scale":0.28009,"f":[[0,0,256,256,131,233],[256,0,256,256,130,233],[512,0,256,256,123.5,233.5],[0,256,256,256,132.5,232.5],[256,256,256,256,132,211],[512,256,256,256,127,236]]},"robot-0":{"flip":1,"scale":0.37288,"f":[[0,0,256,256,132,195],[256,0,256,256,131,186.5],[512,0,256,256,132,199],[0,256,256,256,134.5,203],[256,256,256,256,130.5,166.5],[512,256,256,256,130,200]]},"robot-1":{"flip":1,"scale":0.28129,"f":[[0,0,256,256,122.5,220],[256,0,256,256,119.5,218.5],[512,0,256,256,118,218.5],[0,256,256,256,121,226],[256,256,256,256,122.5,196.5],[512,256,256,256,121.5,236.5]]},"robot-2":{"flip":1,"scale":0.33118,"f":[[0,0,256,256,127.5,216],[256,0,256,256,125.5,201],[512,0,256,256,124,216.5],[0,256,256,256,129,208],[256,256,256,256,128.5,177],[512,256,256,256,122.5,224]]},"turtle-0":{"flip":1,"scale":0.28241,"f":[[0,0,256,256,140,217.5],[256,0,256,256,126,212.5],[512,0,256,256,118.5,213.5],[0,256,256,256,136.5,214.5],[256,256,256,256,127,192],[512,256,256,256,126,215.5]]},"turtle-1":{"flip":1,"scale":0.37401,"f":[[0,0,256,256,130.5,204.5],[256,0,256,256,130.5,203.5],[512,0,256,256,130.5,203],[0,256,256,256,131,203],[256,256,256,256,129,184.5],[512,256,256,256,129.5,200.5]]},"turtle-2":{"flip":1,"scale":0.36261,"f":[[38.5,40.5,158.5,182.5,79,181],[295,41.5,165.5,181.5,82.5,180],[546,44.5,173,177.5,86.5,176],[35.5,301.5,168,177,84,175.5],[294.5,284.5,164.5,165.5,82,164],[545,308.5,175,169,87.5,167.5]]},"unicorn-0":{"flip":1,"scale":0.26474,"f":[[0,0,256,256,130,226.5],[256,0,256,256,123,224.5],[512,0,256,256,130,226],[0,256,256,256,132.5,222.5],[256,256,256,256,124,194.5],[512,256,256,256,123.5,223.5]]},"unicorn-1":{"flip":-1,"scale":0.3758,"f":[[0,0,256,256,143,207.5],[256,0,256,256,142.5,205.5],[512,0,256,256,144,207],[0,256,256,256,143,206.5],[256,256,256,256,142.5,184.5],[512,256,256,256,146,203]]},"unicorn-2":{"flip":1,"scale":0.29942,"f":[[0,0,256,256,115.5,227],[256,0,256,256,114,214],[512,0,256,256,113.5,227.5],[0,256,256,256,117.5,226.5],[256,256,256,256,117.5,208.5],[512,256,256,256,120.5,228]]},"whale-0":{"flip":1,"scale":0.31339,"f":[[0,0,256,256,136.5,208],[256,0,256,256,118.5,206],[512,0,256,256,118.5,207.5],[0,256,256,256,131.5,197.5],[256,256,256,256,121,172],[512,256,256,256,110,206]]},"whale-1":{"flip":1,"scale":0.33523,"f":[[0,0,256,256,126,212.5],[256,0,256,256,126,198],[512,0,256,256,127,210.5],[0,256,256,256,127,200],[256,256,256,256,126.5,173.5],[512,256,256,256,127,218]]},"whale-2":{"flip":1,"scale":0.38627,"f":[[0,0,256,256,125.5,193],[256,0,256,256,121,188],[512,0,256,256,125,187],[0,256,256,256,121.5,187],[256,256,256,256,128,168],[512,256,256,256,123.5,209.5]]}};
/* 跳台、機關圖的切格（img/sky/platforms.webp、traps.webp） */
const SCENE_ATLAS={"platforms":[[21,199,408,101],[462,199,409,98],[904,200,408,96],[1346,199,411,113],[19,619,409,128],[463,617,408,113],[904,617,408,108],[1347,617,409,105]],"traps":[[66,64,405,400],[560,74,414,375],[1082,79,391,382],[58,640,410,264],[594,555,348,405],[1063,556,430,405]]};
const el=id=>document.getElementById(id);
const canvas=el('field'), ctx=canvas.getContext('2d');
function loadImage(src){const image=new Image();image.src=src;return image;}
const platformArt=loadImage('img/sky/platforms.webp'), trapArt=loadImage('img/sky/traps.webp');
let selectedPet=null;
const skyArt=new Image();
skyArt.src='img/sky/sky.webp';
let W=480;const WORLD=3580, gravity=1380, jumpSpeed=548, runSpeed=220;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const path=[
  // Lin-guan trail. The broad ridge gives room to learn running starts.
  [0,120,240],[48,287,86],[88,405,108],[156,550,110],
  [265,685,90],[304,795,165],[363,959,84],[504,1100,96],[554,1254,160,'save'],
  // Wind-bell ravine. Switch back under the earlier route on horizontal and vertical lifts.
  [621,1120,100],[678,978,98,'glide'],[731,838,105],[778,707,106,'lift'],
  [843,586,116],[915,454,88,'glide'],[1047,303,114],[1097,438,177,'save'],
  // Amber ruins. Broken ledges are followed by wider platforms for planning the next jump.
  [1154,585,90,'crumble'],[1193,722,83,'crumble'],[1250,874,124],[1391,1025,85],
  [1431,1163,83,'crumble'],[1478,1297,84,'crumble'],[1556,1435,135],
  [1605,1587,88,'glide'],[1660,1744,180,'save'],
  // Frost bridge. Slippery runways lead to spring pads and suspended lifts.
  [1718,1915,158,'ice'],[1768,2061,110,'ice'],[1831,2209,125,'spring'],
  [1982,2382,96],[2048,2516,120,'lift'],[2097,2654,121,'ice'],
  [2168,2806,91,'spring'],[2324,2974,109],[2378,3135,171,'save'],
  // Storm. The safe metal strips are in the center of each timed electrical platform.
  [2437,2997,96,'shock'],[2491,2868,86,'lift'],[2550,2715,84],
  [2691,2555,82,'shock'],[2751,2417,82,'glide'],[2806,2279,76,'crumble'],
  [2856,2141,100,'shock'],[2914,1990,170,'save'],
  // Lighthouse. The final approach asks the player to link the earlier mechanics.
  [2967,2133,93,'glide'],[3015,2286,75,'crumble'],[3065,2437,86,'spring'],
  [3216,2598,81,'shock'],[3267,2746,82,'lift'],[3336,2885,75,'ice'],
  [3390,3029,84,'crumble'],[3440,3167,91,'spring'],[3595,3332,72,'shock'],
  [3653,3469,146,'beacon']
].map(([y,x,w,type='rock'],i)=>({y,x,w,type,i,born:null}));
const tower=path.at(-1).y;
const chunkHeight=800, chunkSize=8, segmentCache=new Map();
let nearby=path, airObstacles=[], chunkWindow='';
const gates=[path[0],...path.filter(p=>p.type==='save')];
const sections=[
  {name:'林冠步道',y:0,hint:'長石脊可以助跑，看到木牌再用二段跳',tint:'#4465442b',pal:['#315e72','#b9dbc3','#598c7e','#347364','#70af7b']},
  {name:'風鈴峽谷',y:gates[1].y,hint:'銅色擺錘會掃過缺口，等它擺開再跳',tint:'#267bb233',pal:['#345489','#a2d5cf','#537b9e','#386475','#75b8ad']},
  {name:'琥珀遺跡',y:gates[2].y,hint:'金色虛線標出落石路線，先等石塊落下',tint:'#bc7b3c38',pal:['#785578','#e7c889','#bf9b69','#805846','#e6ba78']},
  {name:'霜晶石橋',y:gates[3].y,hint:'冰橋容易滑，看到青色橫線先等風彈通過',tint:'#326dc138',pal:['#4a6295','#cce5f8','#83a4c1','#556d91','#a8c4e6']},
  {name:'暮光風暴',y:gates[4].y,hint:'陣風推偏空中落點，紫色電台要踩中央',tint:'#4c36875e',pal:['#4c477f','#d5add4','#8a7aa8','#615689','#a9a1df']},
  {name:'雲頂燈塔',y:gates[5].y,hint:'連接窄台與彈跳台，過燈塔後進入無盡雲階',tint:'#96527b53',pal:['#52477f','#f7c99a','#b0889e','#776186','#dbc4d7']}
];
const initialCount=sections.length;
const layers=[
  {name:'風車棧道',hint:'銅扇亮起後向外吹，逆風時提早修正落點',tint:'#277b7b58',plan:['fan','lift','spring','rock','fan','glide','crumble']},
  {name:'霧燈長廊',hint:'霧台由白轉金是預警，雲散後要等它回來',tint:'#626caa65',plan:['rock','mist','rock','guide','mist','lift','rock']},
  {name:'齒輪工坊',hint:'齒輪在跳台邊緣來回移動，金色中央可落腳',tint:'#9a5e345b',plan:['gear','rock','gear','lift','spring','shock','gear']},
  {name:'赤晶斷橋',hint:'紅晶閃橙後伸起，站中央或等它縮回',tint:'#9845545a',plan:['spike','glide','rock','spike','crumble','spike','lift']},
  {name:'極光裂谷',hint:'陣風和霧台同時出現，先看下一個落點',tint:'#40668775',plan:['fan','mist','spring','spike','glide','mist','gear']},
  {name:'星海機城',hint:'空中障礙和窄台會交替出現，先站穩再出發',tint:'#5f458877',plan:['gear','spike','spring','gear','mist','shock','fan']}
];
const meters=y=>Math.max(0,Math.round(y/10));
const format=t=>Math.floor(t/60)+':'+String(Math.floor(t)%60).padStart(2,'0');
/* 最佳高度：平台記的（公尺）換回遊戲裡的單位（1 公尺＝10） */
const myBest=()=>{try{return (P&&P.skyBest())||{a:0,ws:0}}catch(e){return {a:0,ws:0}}};
let best=myBest().a*10;
let h=570, mode='ready', clock=0, peak=0, falls=0, camera=0, cameraX=0, checkpoint=path[0];
let doubleReady=true, airTime=0, departY=0, tagStage=0, shockLock=0;
let lastPassTick=0,busy=false,recAt=0,recM=0,runBest=null;
let x=120,y=0,vx=0,vy=0,standing=path[0],facing=1,walk=0,grace=0,queued=0,noteUntil=0;
let lastTime=0,accumulator=0;
const keys=new Set(), pointers=new Map(), controls=[...document.querySelectorAll('[data-action]')];
const canvasBox=()=>canvas.getBoundingClientRect();
let mapKey='';
function stageAt(height){
  if(height>=tower)return initialCount+Math.floor((height-tower)/chunkHeight);
  for(let i=initialCount-1;i>0;i--)if(height>=sections[i].y)return i;
  return 0;
}
function stageInfo(index){
  if(index<initialCount)return sections[index];
  const extra=index-initialCount, theme=sections[2+extra%4],layer=layers[extra%layers.length];
  return {...theme,...layer,y:tower+extra*chunkHeight};
}
const liveSection=height=>stageInfo(stageAt(height));
function makeSegment(n){
  let seed=(0x5ea7d1^Math.imul(n+1,0x9e3779b1))>>>0;
  const roll=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const difficulty=Math.min(9,n);
  const left=2440,right=3469;
  const from=n%2?left:right, to=n%2?right:left;
  const split=[
    [76,159,246,382,476,587,694,800],
    [73,166,260,380,487,582,713,800],
    [82,165,248,383,481,576,706,800],
    [69,157,259,386,478,573,706,800]
  ][n%4];
  const plan=layers[n%layers.length].plan;
  return split.map((offset,i)=>{
    const type=i===7?'save':plan[i];
    const x=from+(to-from)*(i+1)/chunkSize+(i===7?0:Math.round((roll()-.5)*22));
    const width=i===7?158:type==='spring'?110:type==='lift'?98:type==='mist'?112:type==='guide'?118:Math.max(63,115-difficulty*5-Math.round(roll()*11));
    return {x,y:tower+n*chunkHeight+offset,w:width,type,i:path.length+n*chunkSize+i,born:null};
  });
}
function refreshSegments(height){
  const start=Math.max(0,Math.floor((height-tower-960)/chunkHeight));
  const end=Math.floor((height-tower+1150)/chunkHeight);
  const key=start+':'+end;
  if(key===chunkWindow)return;
  chunkWindow=key;
  for(const n of segmentCache.keys())if(n<start||n>end)segmentCache.delete(n);
  const generated=[];
  for(let n=start;n<=end;n++){
    if(!segmentCache.has(n))segmentCache.set(n,makeSegment(n));
    generated.push(...segmentCache.get(n));
  }
  nearby=[...path,...generated];
  airObstacles=buildAirObstacles(nearby);
}
const firstObstacles={11:'swing',20:'fall',29:'sweep',37:'swing',41:'fall',47:'sweep'};
function buildAirObstacles(ledges){
  const obstacles=[];
  for(let i=1;i<ledges.length;i++){
    const a=ledges[i-1],b=ledges[i];
    if(a.i+1!==b.i)continue;
    let type=firstObstacles[b.i];
    if(b.i>=path.length){
      const n=Math.floor((b.i-path.length)/chunkSize),offset=(b.i-path.length)%chunkSize;
      const hazards=['swing','fall','sweep','fall','sweep','swing'];
      if(offset===2)type=hazards[n%hazards.length];
      if(offset===5)type=hazards[(n+1)%hazards.length];
      if(n>=7&&offset===0)type=hazards[(n+3)%hazards.length];
    }
    if(type){
      const span=Math.abs(b.x-a.x);
      obstacles.push({type,i:b.i,x:(a.x+b.x)/2,y:Math.max(a.y,b.y),span,dir:Math.sign(b.x-a.x)||1});
    }
  }
  return obstacles;
}
function obstacleState(obstacle,t){
  const difficulty=clamp((stageAt(obstacle.y)-1)/15,0,1);
  const period=(obstacle.type==='swing'?5.2:5.75)-difficulty*.7;
  const phase=((t+obstacle.i*.59)%period+period)%period;
  const activeFor=obstacle.type==='swing'?1.36:1.06;
  const activeFrom=period-activeFor, warningFrom=activeFrom-.72;
  return {stage:phase>=activeFrom?'danger':phase>=warningFrom?'warning':'rest',progress:clamp((phase-activeFrom)/activeFor,0,1)};
}
function obstaclePoint(o,state){
  const p=state.progress;
  if(o.type==='swing'){
    const angle=Math.cos(p*Math.PI)*.97*o.dir;
    return {x:o.x+Math.sin(angle)*78,y:o.y+91-Math.cos(angle)*78,hinge:o.y+91,radius:12};
  }
  if(o.type==='fall')return {x:o.x+o.dir*5,y:o.y+123-178*p*p,radius:12};
  return {x:o.x+o.dir*((p-.5)*(o.span+54)),y:o.y+36,radius:14};
}
function hitAirObstacle(){
  if(standing||shockLock)return;
  for(const o of airObstacles){
    if(Math.abs(y-o.y)>160||Math.abs(x-o.x)>o.span+65)continue;
    const state=obstacleState(o,clock);
    if(state.stage!=='danger')continue;
    const point=obstaclePoint(o,state);
    if(Math.hypot(x-point.x,y+19-point.y)>point.radius+10)continue;
    const messages={swing:'碰到擺錘 · 等它擺過再跳',fall:'碰到落石 · 看金色虛線避開',sweep:'被風彈推偏 · 等它橫掃過再跳'};
    shockLock=.78;vy=Math.min(vy,-65);vx=(Math.sign(x-point.x)||o.dir)*132;
    tell(messages[o.type]);
    break;
  }
}
function updateHud(){
  const index=stageAt(y), next=stageInfo(index+1);
  const data={height:meters(peak)+' m',best:'最佳 '+meters(best)+' m',
    stage:'第 '+(index+1)+' 段 · '+stageInfo(index).name,current:meters(y)+' m',
    objective:'下一段 '+next.name+' ＋'+Math.max(0,meters(next.y-y))+' m'};
  for(const [id,value] of Object.entries(data)){const e=el(id);if(e&&e.textContent!==value)e.textContent=value;}
}
/* 爬到新高度：交給平台記（最多 4 秒記一次，結算、離開時一定記） */
function record(now){
  const m=meters(peak);if(!P||!(m>0)||m<=recM)return;
  if(!now&&Date.now()-recAt<4000)return;
  recAt=Date.now();recM=m;try{P.skyRec(m)}catch(e){}
}
function tell(text){
  el('message').textContent=text;
  el('message').hidden=false;
  noteUntil=clock+2.35;
}
function openCover(state,tag,title,description,button){
  mode=state;
  el('tag').textContent=tag;
  el('title').textContent=title;
  el('detail').textContent=description;
  el('start').textContent=button;
  el('veil').hidden=false;
  el('pause').hidden=true;
  el('end').hidden=true;
  el('message').hidden=true;
  clearInput();
}
function play(){
  if(!passLeft()){settle(true);return;}
  mode='play';
  el('veil').hidden=true;
  el('pause').hidden=false;
  el('end').hidden=false;
}
function pause(){
  if(mode==='play')openCover('pause','稍作休息','攀登暫停','繼續後會從原本的位置接著跳。','繼續攀登');
}
function restart(){
  clock=peak=falls=walk=camera=cameraX=tagStage=shockLock=0;
  facing=1;
  checkpoint=path[0];recM=0;recAt=0;
  segmentCache.clear();chunkWindow='';refreshSegments(0);
  for(const p of path)p.born=null;
  place();
  play();
  tell('第 1 段 · '+stageInfo(0).hint);
  updateHud();
}
function place(){
  x=checkpoint.x;y=checkpoint.y;vx=vy=queued=grace=0;
  standing=checkpoint;
  camera=Math.max(0,y-look());cameraX=clamp(x-W/2,0,WORLD-W);
  doubleReady=true;airTime=0;departY=y;
}
function center(p,t){
  return p.type==='glide'?p.x+Math.sin(t*1.52+p.i*.82)*24:p.x;
}
function deck(p,t){
  return p.y+(p.type==='lift'?Math.sin(t*1.94+p.i*.65)*24:0);
}
function exists(p,t){
  if(p.type==='mist')return trapPhase(p,t)!=='live';
  return p.born===null || t-p.born<.48 || t-p.born>2.7;
}
function land(p){
  standing=p;y=deck(p,clock);vy=0;doubleReady=true;airTime=0;
  if(departY-p.y>=150){falls++;tell('滑落 '+meters(departY-p.y)+' m，從這裡再爬');}
  departY=p.y;
  const entered=stageAt(p.y);
  if(entered>tagStage){
    tagStage=entered;
    tell('第 '+(entered+1)+' 段 · '+stageInfo(entered).hint);
  }
  if(p.type==='crumble'&&(p.born===null||clock-p.born>2.7))p.born=clock;
  if(p.y>peak){
    peak=p.y;
    if(peak>best)best=peak;
    record(false);
  }
  if(p.type==='beacon')tell('通過燈塔！繼續挑戰無盡雲階');
}
const held=action=>keys.has(action)||[...pointers.values()].includes(action);
function clearInput(){
  keys.clear();pointers.clear();queued=0;
  for(const button of controls)delete button.dataset.held;
}
function press(action){
  if(mode==='play'&&action==='jump')queued=.13;
}
function gustAt(x,y,t){
  if(y<sections[4].y||x<1850)return 0;
  const pulse=Math.sin(t*1.65);
  return Math.abs(pulse)<.48?0:pulse*Math.min(48,30+Math.max(0,stageAt(y)-4)*5);
}
function trapPhase(p,t){
  // A forewarning always remains visible in the art and ends before contact activates.
  const phase=((t+(p.i%7)*.33)%4.8+4.8)%4.8;
  const pressure=clamp((stageAt(p.y)-initialCount)/14,0,1)*.49;
  return phase<3.67-pressure?'quiet':phase<4.26-pressure?'warn':'live';
}
function windFromFans(x,y,t){
  let wind=0;
  for(const p of nearby){
    if(p.type!=='fan'||y<p.y+8||y>p.y+111||Math.abs(x-p.x)>94)continue;
    if(trapPhase(p,t)==='live')wind+=(p.i%2?1:-1)*70;
  }
  return clamp(wind,-70,70);
}
const footReach=5;
function onDeck(p,x,t){
  return Math.abs(x-center(p,t))<=p.w/2+footReach;
}
function safeHalf(p){
  return p.w*(p.type==='shock'?.32:p.type==='spike'?.26:.24);
}
function gearRadius(p){return clamp(p.w*.108,7,12);}
function gearX(p,t){
  const side=p.i%2?1:-1,r=gearRadius(p);
  return p.x+side*(safeHalf(p)+r+p.w*(.075+.075*Math.sin(t*4.1+p.i)));
}
function edgeHazard(p,x,t){
  if(Math.abs(x-p.x)<=safeHalf(p))return false;
  if(p.type==='shock')return shockPhase(p,t)==='live';
  if(p.type==='spike')return trapPhase(p,t)==='live';
  return p.type==='gear'&&Math.abs(x-gearX(p,t))<=gearRadius(p);
}
function landingBetween(fromX,fromY,toX,toY,t0,t1,departed){
  let first=null,firstTime=Infinity;
  for(const p of nearby){
    if(p===departed)continue;
    const above0=fromY-deck(p,t0),above1=toY-deck(p,t1);
    if(above0<-.001||above1>0||above0<=above1)continue;
    const fraction=clamp(above0/(above0-above1),0,1);
    if(fraction>=firstTime)continue;
    const crossing=t0+(t1-t0)*fraction;
    const footX=fromX+(toX-fromX)*fraction;
    if(!exists(p,crossing)||!exists(p,t1)||!onDeck(p,footX,crossing))continue;
    if(!onDeck(p,toX,t1))continue;
    first=p;firstTime=fraction;
  }
  return first;
}
function shockPhase(p,t){
  const phase=((t+(p.i%3)*.49)%2.8+2.8)%2.8;
  return phase>=2.03?'live':phase>=1.56?'warn':'quiet';
}
/* 結算：掉到最底下、按「結算」、5 分鐘到了（timeUp） */
function settle(timeUp){
  const before=runBest||myBest();
  record(true);updateHud();
  const now=myBest(),m=meters(peak);best=Math.max(best,now.a*10);
  const isNew=m>0&&m>before.a, wkNew=m>0&&m>before.ws;
  openCover('end',timeUp?'時間到！':'本次成績',m+' 公尺',
    (isNew?'新紀錄！':wkNew?'本週新紀錄！':'')+'你的最佳 '+now.a+' m · 本週最佳 '+now.ws+' m'+(P&&P.isTest()?'（測試帳號不上榜）':''),startText('再挑戰'));
  runBest=null;
}
function step(dt){
  refreshSegments(y);
  clock+=dt;
  shockLock=Math.max(0,shockLock-dt);
  queued=Math.max(0,queued-dt);
  grace=standing?.10:Math.max(0,grace-dt);
  const direction=Number(held('right'))-Number(held('left'));
  if(direction)facing=direction;
  const target=direction*runSpeed;
  const icy=standing?.type==='ice';
  vx+=(target-vx)*Math.min(1,dt*(icy?(direction?8:3.2):direction?20:27));
  if(Math.abs(vx)<1)vx=0;
  const startedOn=standing;
  const carry=standing?center(standing,clock)-center(standing,clock-dt):0;
  if(standing)y=deck(standing,clock);
  const beforeX=x;
  x=clamp(x+(vx+(standing?0:gustAt(x,y,clock)+windFromFans(x,y,clock)))*dt+carry,13,WORLD-13);
  if(standing)walk=(walk+Math.abs(x-beforeX-carry))%58;
  if(standing&&(!exists(standing,clock)||!onDeck(standing,x,clock)))standing=null;
  if(queued&&grace){
    const onSpring=standing?.type==='spring';
    vy=onSpring?665:jumpSpeed;standing=null;queued=grace=0;
    if(onSpring)tell('彈跳台 · 高跳');
  }else if(queued&&doubleReady&&!standing&&airTime>.12){
    vy=420;doubleReady=false;queued=0;
    tell('二段跳');
  }
  if(standing&&!shockLock&&edgeHazard(standing,x,clock)){
    const side=Math.sign(x-standing.x);
    const warning={spike:'紅晶伸出 · 站中央或等它縮回',gear:'被齒輪推開 · 落腳時瞄準金色中央',shock:'碰到電光 · 下次瞄準中央金踏板'};
    x=clamp(standing.x+side*(standing.w/2+9),13,WORLD-13);
    tell(warning[standing.type]);
    standing=null;vy=-75;grace=0;shockLock=.75;
  }
  hitAirObstacle();
  if(!standing){
    airTime+=dt;
    const oldY=y;
    vy-=gravity*dt;
    y+=vy*dt;
    const landed=landingBetween(beforeX,oldY,x,y,clock-dt,clock,startedOn);
    if(landed)land(landed);
  }
  camera+=(Math.max(0,y-look())-camera)*Math.min(1,dt*13);
  cameraX+=(clamp(x-W*.5+vx*.13,0,WORLD-W)-cameraX)*Math.min(1,dt*10);
  if(y< -95){
    falls++;
    settle(false);return;
  }
  if(clock>noteUntil)el('message').hidden=true;
}
function resize(){
  const box=canvasBox(), dpi=Math.min(2,window.devicePixelRatio||1);
  if(!box.width||!box.height)return;
  /* 2026-11-27 改成全螢幕：畫面比例不變形。橫的螢幕看得比較寬（高度固定 420），很長的手機看得比較高（最多 960） */
  const r=box.height/box.width;
  if(r*480<420){h=420;W=420/r;}else if(r*480>960){h=960;W=960/r;}else{W=480;h=r*480;}
  const ctl=document.querySelector('.controls'),ch=ctl?ctl.getBoundingClientRect().height+22:0;
  floorPad=Math.max(76,ch*h/box.height);
  const tp=document.querySelector('.top');topPad=tp?(tp.getBoundingClientRect().bottom+6)*h/box.height:0;
  canvas.width=Math.round(box.width*dpi);
  canvas.height=Math.round(box.height*dpi);
  ctx.setTransform(canvas.width/W,0,0,canvas.height/h,0,0);
}
/* 地面離畫面底部多高：按鈕疊在畫面下方，地面要在按鈕上面，起點平台才不會被按鈕蓋住 */
let floorPad=76,topPad=0;
/* 鏡頭：寵物放在「上面數字列」和「下面按鈕」中間偏下的地方，看得到上面的跳台 */
const look=()=>Math.max(0,(h-floorPad-topPad)*.42);
const py=y=>h-floorPad-(y-camera);
function polygon(color,points){
  ctx.fillStyle=color;
  ctx.beginPath();ctx.moveTo(...points[0]);
  for(const point of points.slice(1))ctx.lineTo(...point);
  ctx.closePath();ctx.fill();
}
function ellipse(x,y,rx,ry,color){
  ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
}
function cloud(x,y,s,alpha){
  const color='rgba(253,251,234,'+alpha+')';
  ellipse(x,y,s*.56,s*.15,color);
  ellipse(x-s*.16,y-s*.07,s*.24,s*.19,color);
  ellipse(x+s*.14,y-s*.13,s*.26,s*.24,color);
}
const mod=(n,m)=>(n%m+m)%m;
function backdrop(){
  const [sky,horizon,far]=liveSection(camera+h*.65).pal;
  const bg=ctx.createLinearGradient(0,0,0,h);
  bg.addColorStop(0,sky);bg.addColorStop(1,horizon);
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,h);
  const moonY=94+mod(camera*.085,130),moonX=W*.77;
  ellipse(moonX,moonY,43,43,'#fff3bf29');
  ellipse(moonX,moonY,33,33,'#fff1becc');
  for(let i=0;i<Math.ceil(13*W/480);i++){
    const x=(i*113+31)%(W+40)-20;
    const y=mod(i*119+camera*.20,h+140)-65;
    cloud(x,y,43+(i%5)*10,.13+(i%3)*.05);
  }
  const mound=mod(camera*.16,320); 
  ctx.globalAlpha=Math.max(.11,.62-camera/2600);
  const k=W/480;polygon(far,[[0,h],[0,h*.71+mound],[71*k,h*.5+mound],[131*k,h*.74+mound],[227*k,h*.57+mound],[281*k,h*.76+mound],[377*k,h*.54+mound],[480*k,h*.69+mound],[480*k,h]]);
  ctx.globalAlpha=1;
  if(skyArt.complete&&skyArt.naturalWidth){
    /* 背景圖照比例鋪滿（不拉長），寬螢幕時切掉上下多的部分 */
    const iw=skyArt.naturalWidth, ih=skyArt.naturalHeight;
    const viewport=Math.min(ih*.70,iw*h/W), sw=viewport*W/h, sx=(iw-sw)/2, scroll=(ih-viewport)*((camera<tower?1-clamp(camera/tower,0,1):.36+.31*Math.cos((camera-tower)/510)));
    ctx.drawImage(skyArt,sx,scroll,sw,viewport,0,0,W,h);
    ctx.fillStyle=liveSection(y).tint;
    ctx.fillRect(0,0,W,h);
  }
  const wind=gustAt(cameraX+W*.5,Math.max(y,sections[4].y),clock);
  if(camera+h>sections[4].y&&wind){
    ctx.strokeStyle='rgba(248,255,255,.46)';ctx.lineWidth=1.8;
    for(let i=0;i<13;i++){
      const y=py(Math.max(sections[4].y,Math.floor(camera/54)*54)+i*54),x=mod(i*117+clock*wind*1.23,W+50)-25;
      if(y<0||y>h)continue;
      ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+17,y-7,x+36,y-4);ctx.stroke();
    }
  }
}
const terrainTiles={rock:0,glide:1,crumble:2,ice:3,lift:4,spring:5,shock:6,save:7,beacon:7,fan:1,mist:1,gear:7,spike:6,guide:7};
function sheetDraw(image,box,x,y,w,h){
  if(!box||!image.complete||!image.naturalWidth)return false;
  ctx.drawImage(image,...box,x,y,w,h);return true;
}
function prop(id,x,base,width){
  const b=SCENE_ATLAS.traps[id], height=width*b[3]/b[2];
  return sheetDraw(trapArt,b,x-width/2,base-height,width,height);
}
function hintSign(x,y,text){
  ctx.fillStyle='#5a4636';ctx.fillRect(x-1,y-24,2,24);
  ctx.fillStyle='#edd29d';ctx.fillRect(x-24,y-35,48,17);
  ctx.fillStyle='#332d24';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillText(text,x,y-24);
}
function beacon(x,y){
  ellipse(x,y-58,34,34,'#fff1ad45');
  polygon('#f1dfbc',[[x-13,y],[x+13,y],[x+11,y-48],[x-11,y-48]]);
  polygon('#a97783',[[x-11,y-13],[x+12,y-13],[x+12,y-21],[x-11,y-21]]);
  polygon('#a97783',[[x-11,y-30],[x+12,y-30],[x+11,y-38],[x-10,y-38]]);
  ctx.fillStyle='#fff2a7';ctx.fillRect(x-12,y-57,24,9);
  polygon('#673f65',[[x-17,y-57],[x+17,y-57],[x,y-69]]);
}
function platform(p){
  const top=py(deck(p,clock)), middle=center(p,clock), left=middle-p.w/2, right=middle+p.w/2;
  if(top< -67||top>h+55||right<cameraX-100||left>cameraX+W+100)return;
  const phase=trapPhase(p,clock), solid=exists(p,clock);
  if(!solid&&p.type!=='mist')return;
  ctx.save();
  if(p.type==='lift'){
    const line=left+12;
    ctx.strokeStyle='#ba925b';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(line,py(p.y+35));ctx.lineTo(line,py(p.y-35));ctx.stroke();
  }
  if(p.type==='mist')ctx.globalAlpha=phase==='live'?.19:phase==='warn'?.56:.88;
  if(p.type==='crumble'&&p.born!==null&&clock-p.born<.48)ctx.globalAlpha=1-(clock-p.born)*1.38;
  const terrain=SCENE_ATLAS.platforms[terrainTiles[p.type]];
  const depth=clamp(p.w*terrain[3]/terrain[2],20,56);
  if(!sheetDraw(platformArt,terrain,left-2,top-4,p.w+4,depth)){
    const [, ,far,rock,grass]=liveSection(p.y).pal;
    polygon(far,[[left,top],[right,top],[right-13,top+18],[middle,top+26],[left+12,top+17]]);
    polygon(grass,[[left,top-2],[right,top-2],[right-3,top+4],[left+4,top+4]]);
  }
  ctx.globalAlpha=1;
  if(solid){ctx.fillStyle='#fff4c94a';ctx.fillRect(left,top-1,p.w,1);}
  if(p.type==='save'||p.type==='guide')prop(5,middle-20,top-1,29);
  if(p.type==='ice'&&p.i%3===0)prop(4,left+13,top,24);
  if(p.type==='beacon')beacon(middle+32,top-2);
  if(p.type==='mist'){
    ctx.globalAlpha=phase==='live'?.22:.65;
    prop(1,middle,top+7,31);
    ctx.globalAlpha=1;
    if(phase==='warn'){ctx.fillStyle='#ffd48a';ctx.fillRect(left+7,top-6,p.w-14,2);}
  }
  if(p.type==='shock'||p.type==='spike'||p.type==='gear'){
    const half=safeHalf(p);
    ctx.fillStyle='#ffe195';ctx.fillRect(middle-half,top-3,2*half,3);
  }
  if(p.type==='shock'){
    const status=shockPhase(p,clock);
    for(const side of [-1,1]){
      const x=middle+side*p.w*.42;
      ctx.fillStyle=status==='quiet'?'#a799e0':status==='warn'?'#ffb461':'#ead5ff';
      ellipse(x,top-5,3,3,ctx.fillStyle);
      if(status==='live'){
        ctx.strokeStyle='#fff3ff';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(x,top-7);ctx.lineTo(x+3,top-16);ctx.lineTo(x-3,top-18);ctx.lineTo(x+3,top-26);ctx.stroke();
      }
    }
  }
  if(p.type==='gear'){
    const r=gearRadius(p);
    ctx.save();ctx.translate(gearX(p,clock),top-r+1);ctx.rotate(clock*3.6);
    prop(2,0,r,2*r);ctx.restore();
  }
  if(p.type==='spike'){
    for(const side of [-1,1]){
      const width=p.w/2-safeHalf(p);
      const edge=middle+side*(safeHalf(p)+width/2);
      if(phase!=='live'){
        ctx.fillStyle=phase==='warn'?'#ffab58':'#9d7173';ctx.fillRect(edge-width/2,top-5,width,3);
      }else prop(3,edge,top,width);
    }
  }
  if(p.type==='fan'){
    const side=p.i%2?1:-1, fan=middle-side*(p.w/2+21);
    prop(0,fan,top-10,46);
    if(phase!=='quiet'){
      ctx.strokeStyle=phase==='warn'?'#ffd58499':'#e0ffffe0';ctx.lineWidth=2;
      for(let i=0;i<3;i++){
        const shift=phase==='live'?(clock*97+i*11)%30:0, off=fan+side*(18+shift);
        ctx.beginPath();ctx.moveTo(off,top-24-i*7);ctx.quadraticCurveTo(off+side*16,top-31-i*7,off+side*27,top-25-i*7);ctx.stroke();
      }
    }
  }
  const next=p.i<path.length-1?path[p.i+1]:nearby.find(s=>s.i===p.i+1);
  if(next&&next.y-p.y>126&&['rock','guide','save'].includes(p.type))hintSign(middle+9,top,'二段跳');
  ctx.restore();
}
function drawAirObstacles(){
  for(const o of airObstacles){
    if(o.x+o.span<cameraX||o.x-o.span>cameraX+W||py(o.y)<-175||py(o.y)>h+155)continue;
    const state=obstacleState(o,clock),p=obstaclePoint(o,state);
    const pointY=py(p.y), warned=state.stage==='warning', active=state.stage==='danger';
    ctx.save();
    if(o.type==='swing'){
      const pivot=py(p.hinge);
      ctx.strokeStyle='#4c382df0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(o.x,pivot);ctx.lineTo(p.x,pointY);ctx.stroke();
      ellipse(o.x,pivot,5,5,warned?'#fff0a1':'#c99148');
      if(warned||active)ellipse(p.x,pointY,17,17,warned?'#fcda9255':'#ffad6359');
      prop(2,p.x,pointY+13,26);
    }else if(o.type==='fall'){
      if(warned){
        ctx.strokeStyle='#ffdf93e0';ctx.lineWidth=2;ctx.setLineDash([4,5]);
        ctx.beginPath();ctx.moveTo(p.x,py(o.y+121));ctx.lineTo(p.x,py(o.y-63));ctx.stroke();
      }
      if(active){
        ctx.strokeStyle='#ffebad8f';ctx.lineWidth=2;ctx.beginPath();
        ctx.moveTo(p.x-4,pointY-32);ctx.lineTo(p.x-2,pointY-11);
        ctx.moveTo(p.x+6,pointY-26);ctx.lineTo(p.x+5,pointY-10);ctx.stroke();
        polygon('#593c34',[[p.x-13,pointY-2],[p.x-8,pointY-10],[p.x+4,pointY-13],[p.x+13,pointY-5],[p.x+9,pointY+9],[p.x-1,pointY+13],[p.x-12,pointY+7]]);
        polygon('#c3915d',[[p.x-11,pointY-3],[p.x-7,pointY-9],[p.x+4,pointY-11],[p.x+10,pointY-4],[p.x+1,pointY+1]]);
        polygon('#915f48',[[p.x-11,pointY-1],[p.x+1,pointY+2],[p.x+8,pointY+9],[p.x-1,pointY+11],[p.x-11,pointY+6]]);
      }
    }else{
      const start=o.x-o.dir*(o.span+54)*.5;
      prop(0,start,py(o.y+36)+13,31);
      if(warned){
        ctx.strokeStyle='#96e5ffbd';ctx.lineWidth=2;ctx.setLineDash([5,6]);
        ctx.beginPath();ctx.moveTo(start,pointY);ctx.lineTo(start+o.dir*(o.span+54),pointY);ctx.stroke();
      }
      if(active){
        ellipse(p.x,pointY,16,12,'#a7fcff65');
        ellipse(p.x,pointY,10,7,'#b9f7ffda');
        ellipse(p.x,pointY,5,4,'#f3ffff');
        ctx.strokeStyle='#b9efffc5';ctx.lineWidth=2;
        for(let i=0;i<3;i++){
          ctx.beginPath();ctx.moveTo(p.x-o.dir*12,pointY+(i-1)*5);ctx.lineTo(p.x-o.dir*(22+i*3),pointY+(i-1)*5);ctx.stroke();
        }
      }
    }
    ctx.restore();
  }
}
/* 帶自己現在的寵物（平台的 myPet：種類＋第幾階）；還沒孵化或找不到圖就用啾啾鳥 */
function selectPet(id){
  const selected=PET_ASSETS[id]?id:'chick-0';
  selectedPet={...PET_ASSETS[selected],image:loadImage('img/sky/pet/'+selected+'.webp')};
}
function drawPet(){
  const foot=py(y),pet=selectedPet;
  if(standing)ellipse(x,foot+2,15,3,'#1d2b3d65');
  if(!pet||!pet.image.complete||!pet.image.naturalWidth){
    ellipse(x,foot-18,13,16,'#93be9b88');return;
  }
  const index=standing?(Math.abs(vx)>9?Math.floor(walk/58*4):0):vy>26?4:5;
  const [sx,sy,sw,sh,ax,ay]=pet.f[index];
  const scale=pet.scale;
  ctx.save();ctx.translate(x,foot);ctx.scale(facing*pet.flip,1);
  ctx.drawImage(pet.image,sx,sy,sw,sh,-ax*scale,-ay*scale,sw*scale,sh*scale);
  ctx.restore();
}
function frame(now){
  if(now-lastPassTick>=200){lastPassTick=now;updatePass();}
  const dt=lastTime?clamp((now-lastTime)/1000,0,.05):0;
  lastTime=now;
  if(mode==='play'){
    accumulator+=dt;
    while(accumulator>=1/120&&mode==='play'){
      step(1/120);accumulator-=1/120;
    }
    updateHud();
  }else{accumulator=0;}
  backdrop();
  ctx.save();ctx.translate(-cameraX,0);
  refreshSegments(y);
  for(const p of nearby)platform(p);
  drawAirObstacles();
  drawPet();
  ctx.restore();
  requestAnimationFrame(frame);
}
const actionOf={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',KeyW:'jump',Space:'jump'};
const keyboardEvents=new Map();
document.addEventListener('keydown',e=>{
  if(e.code==='Escape'){
    if(!el('board').hidden){el('board').hidden=true;return;}
    if(mode==='pause')play();else if(mode==='play')pause();
    return;
  }
  const action=actionOf[e.code];
  if(!action||mode!=='play')return;
  e.preventDefault();
  if(!e.repeat){
    keyboardEvents.set(e.code,action);
    keys.add(action);
    press(action);
  }
});
document.addEventListener('keyup',e=>{
  const action=keyboardEvents.get(e.code);
  keyboardEvents.delete(e.code);
  if(action&&![...keyboardEvents.values()].includes(action))keys.delete(action);
});
function showHeldButtons(){
  for(const control of controls){
    if([...pointers.values()].includes(control.dataset.action))control.dataset.held='';
    else delete control.dataset.held;
  }
}
for(const button of controls){
  const {action}=button.dataset;
  button.addEventListener('pointerdown',event=>{
    if(mode!=='play'||event.button!==0)return;
    event.preventDefault();
    pointers.set(event.pointerId,action);
    button.setPointerCapture(event.pointerId);
    showHeldButtons();
    press(action);
  });
  button.addEventListener('pointermove',event=>{
    const current=pointers.get(event.pointerId);
    if(event.pointerType!=='touch'||(current!=='left'&&current!=='right'))return;
    const next=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-action]')?.dataset.action;
    if((next==='left'||next==='right')&&next!==current){
      pointers.set(event.pointerId,next);
      showHeldButtons();
    }
  });
  const release=event=>{
    if(pointers.delete(event.pointerId))showHeldButtons();
  };
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,release);
  button.addEventListener('contextmenu',event=>event.preventDefault());
  button.addEventListener('click',event=>{if(event.detail===0)press(action);});
}
let mp=null;try{mp=P&&P.myPet()}catch(e){}
selectPet(mp?mp.sp+'-'+mp.st:'');
const passLeft=()=>{try{return P?Math.max(0,P.left()||0):0}catch(e){return 0}};
const tickets=()=>{try{return P?P.tickets()||0:0}catch(e){return 0}};
const isTest=()=>{try{return !!(P&&P.isTest())}catch(e){return false}};
const canStart=()=>!!P&&(passLeft()>0||tickets()>0||isTest());
/* 開始按鈕上的字：5 分鐘還沒用完就直接玩；用完了要用 1 張券 */
function startText(again){
  if(!P)return '請從學習平台進入';
  if(passLeft()>0||isTest())return again;
  return tickets()>0?'用 1 張券'+again:'遊戲券用完了';
}
function updatePass(){
  const left=passLeft(),seconds=Math.ceil(left/1000);
  const timer=left?format(seconds):mode==='ready'||mode==='end'?'5:00':'0:00';
  if(el('clock').textContent!==timer)el('clock').textContent=timer;
  const balance=!P?'':isTest()?'測試帳號：不用遊戲券、不上榜':'遊戲券 '+tickets()+' 張'+(left?' · 這次還可以玩 '+format(seconds):' · 一張玩 5 分鐘');
  if(el('ticketLine').textContent!==balance)el('ticketLine').textContent=balance;
  el('clockBox').classList.toggle('warn',!!left&&left<=30000&&mode==='play');
  if(!left&&(mode==='play'||mode==='pause')){settle(true);return;}
  if(mode==='ready'||mode==='end'){
    const t=startText(mode==='ready'?'開始':'再挑戰');
    if(el('start').textContent!==t)el('start').textContent=t;
    el('start').disabled=busy||!canStart();
  }else el('start').disabled=busy;
}
el('start').onclick=()=>{
  if(busy||!P)return;
  if(mode==='pause'){play();updatePass();return;}
  if(!passLeft()){
    busy=true;let r=null;try{r=P.startPlay('sky',0)}catch(e){}busy=false;
    if(!r||!r.ok){el('detail').textContent='遊戲券用完了！去練習題目可以拿到新的遊戲券。';updatePass();return;}
  }
  runBest=myBest();
  restart();
  updatePass();
};
el('pause').onclick=pause;
el('end').onclick=()=>{if(mode==='play')settle(false);};
window.addEventListener('blur',()=>{keyboardEvents.clear();clearInput();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keyboardEvents.clear();pause();record(true);}else updatePass();});
/* 關掉遊戲（回平台）時，爬到的最高高度一定要記下來 */
window.addEventListener('pagehide',()=>{if(mode==='play'||mode==='pause')record(true);});

/* ===== 雲階排行榜：本週／歷史最佳，前 10 名＋自己；只顯示座號和寵物 ===== */
let boardTab='week',boardData=null;
async function openBoard(){
  if(mode==='play'){pause();}
  el('board').hidden=false;el('blist').innerHTML='<li class="none">讀取中…</li>';el('bsub').textContent='';
  boardData=null;try{boardData=P?await P.skyBoard():null}catch(e){}
  paintBoard();
}
function paintBoard(){
  for(const b of document.querySelectorAll('.btabs button'))b.classList.toggle('on',b.dataset.t===boardTab);
  const list=el('blist');
  if(!boardData){list.innerHTML='<li class="none">連上網路才看得到排行榜</li>';return;}
  const rows=boardData[boardTab]||[],me=boardData.me;
  el('bsub').textContent=boardTab==='week'?'這週（星期一開始）爬到的最高高度':'開始玩以來爬到的最高高度';
  if(!rows.length){list.innerHTML='<li class="none">還沒有人上榜，快來當第一個！</li>';return;}
  const show=rows.filter((r,i)=>i<10||r.seat===me);
  const medal=['gold','silver','bronze'];
  list.innerHTML=show.map(r=>{
    const rk=r.rank<=3?'<img class="medal" src="img/ui/sky-'+medal[r.rank-1]+'.webp" alt="第'+r.rank+'名">':'<span class="rk">'+r.rank+'</span>';
    const pet=/^[a-z]+-[0-2]$/.test(r.p||'')?'<img class="bpet" src="img/pet/'+r.p+'.webp" alt="">':'<span class="bpet"></span>';
    return '<li'+(r.seat===me?' class="me"':'')+'>'+rk+pet+'<b>'+r.seat+' 號'+(r.seat===me?'（我）':'')+'</b><span class="bm">'+r.s+' m</span></li>';
  }).join('')+(me&&!rows.some(r=>r.seat===me)?'<li class="none">你還沒有上榜，爬上去就會出現！</li>':'');
}
for(const b of document.querySelectorAll('.btabs button'))b.onclick=()=>{boardTab=b.dataset.t;paintBoard();};
el('rank').onclick=openBoard;
el('bclose').onclick=()=>{el('board').hidden=true;};
el('board').addEventListener('pointerdown',e=>{if(e.target===el('board'))el('board').hidden=true;});

if(!P)openCover('ready','601 學習平台','你能爬多高？','請從 601 學習平台的「挑戰樂園」進入。','請從學習平台進入');
updatePass();
new ResizeObserver(resize).observe(canvas);
resize();updateHud();requestAnimationFrame(frame);
