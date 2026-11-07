const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d', { alpha: false });
const soundButton = document.querySelector('#sound-button');
const W = 960, H = 540, LEVEL_W = 3900;
const P = { ground: 470, moveSpeed: 285 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const overlaps = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
const worlds = [
  ['Windfall Coast','#79c9c4','#d9efce','#73b9a2'],['Amberglass Dunes','#f2bd78','#f7dfb0','#d99c67'],['Mossbell Woods','#98c79e','#e1e9b9','#719b79'],['Cloudstep Peaks','#a6cde0','#eef1df','#829fc1'],['Moonpool Marsh','#83bdc0','#d9e8ca','#619b91'],
  ['Sunspun Prairie','#f4ce7e','#f5e8ae','#a4bc71'],['The Quiet Caldera','#eaa07e','#f5d2a4','#bc806e'],['Starling Snowfields','#bdd9e3','#f3f2e7','#8daebd'],['Shellsong Bay','#75c7d2','#e1efd4','#57a3a0'],['Oldroot Hollow','#9ba975','#e4d8a8','#758861'],
  ['Bluehour Cliffs','#829ac2','#e2dfd0','#647a9d'],['Pollenlight Garden','#d2a1ad','#f4e3b2','#a3bd82'],['Redfern Ridge','#de9477','#eed3aa','#a86e61'],['Lullaby Lagoon','#82c7d4','#e7e9c2','#70aab1'],['Copper Kite Isle','#e9ae73','#efe1bc','#b17d67'],
  ['Frostpetal Vale','#a8cbd2','#f1f0df','#7c9f9e'],['The Tall Tides','#64b6c1','#d8e6cc','#538d91'],['Candlewick Moor','#c5a08a','#ead9ba','#93816e'],['Cloudberry Crown','#c9afd4','#f2e4c0','#a297b1'],['Driftwood Reach','#8cbab2','#eee2b8','#6c9586'],
  ['Hearthstone Steps','#d99170','#f0d6aa','#a97765'],['The Glass Orchard','#a5c9b0','#e7e9ca','#779c85'],['Duskwing Atoll','#887eac','#e0d4c7','#68698d'],['Rainwhistle Falls','#75b5b2','#e1e6c6','#588f86'],['The Woven Sky','#afc6de','#ece5cd','#859fba'],
  ['Saffron Sound','#e2ae71','#f2deb3','#b88065'],['Fernwake Island','#83ae87','#d8e6bb','#688e71'],['The Far Lanterns','#778daf','#e7e0c3','#687d9c'],['Crescent Bloom','#d593ac','#f3dfb2','#a4779b'],['Homeward Horizon','#e5bd79','#f2e7bd','#94af83']
].map(([name,sky,haze,land])=>({name,sky,haze,land}));
let core, gameState='loading', worldIndex=0, cameraX=0, lastTime=0, elapsed=0, shardCount=0, totalShards=0, muted=true, audio=null;
let platforms=[], shards=[], hazards=[], enemies=[], checkpoint={x:80,y:390}, mover={x:1690,y:365,w:100,h:16,base:1690,phase:0}, particles=[], introTimer=0, respawnSeen=0, keys=new Set(), touchAxis=0;
const coreApi = {};

function installCore(module) {
  core = module;
  for (const [name, sig, args] of [['clear_solids','',''],['add_solid','void','number,number,number,number'],['reset_player','',''],['set_checkpoint','void','number,number'],['move_player','void','number,number,number,number'],['hurt_player','',''],['player_x','number',''],['player_y','number',''],['player_vx','number',''],['player_vy','number',''],['player_width','number',''],['player_height','number',''],['player_grounded','number',''],['respawn_count','number','']]) {
    coreApi[name] = module.cwrap(name, sig, args ? args.split(',') : []);
  }
  startTitle();
}
if (typeof createGameCore === 'function') createGameCore().then(installCore).catch(() => { gameState='error'; });
else { gameState='error'; }

function startTitle(){ gameState='title'; draw(); }
function makeWorld(index) {
  const seed = index + 3, rand = (n)=>((Math.sin(seed*127.1+n*311.7)*43758.5453)%1+1)%1;
  platforms=[]; shards=[]; hazards=[]; enemies=[];
  // Long coast path with deliberately broad gaps, safe ledges, a raised overlook, and cave passages.
  const groundSpans=[[0,710],[770,1310],[1390,1980],[2055,2590],[2665,3220],[3295,LEVEL_W]];
  platforms.push(...groundSpans.map(([x,end])=>({x,y:P.ground,w:end-x,h:70,kind:'earth'})));
  const ledges=[[420,385,125],[860,350,120],[1080,300,125],[1470,390,120],[1760,330,150],[2185,380,125],[2390,320,135],[2780,375,135],[3010,305,145],[3430,365,120],[3615,320,125]];
  ledges.forEach(([x,y,w],i)=>platforms.push({x,y:y+(index%4===0&&i%3===0?-18:0),w,h:18,kind:'ledge'}));
  // Safe floating lift moves along a predictable route.
  mover={x:1690,y:365,w:104,h:17,base:1690,phase:rand(2)*4};
  // Wind gust strips are telegraphed with animated stream lines.
  hazards.push({x:1185,y:427,w:92,h:43,type:'wind',phase:0},{x:2805,y:427,w:92,h:43,type:'wind',phase:2});
  hazards.push({x:710,y:464,w:60,h:8,type:'spikes'},{x:1310,y:464,w:80,h:8,type:'spikes'},{x:1980,y:464,w:75,h:8,type:'spikes'},{x:2590,y:464,w:75,h:8,type:'spikes'},{x:3220,y:464,w:75,h:8,type:'spikes'});
  enemies=[{x:980+rand(1)*75,y:432,w:30,h:30,min:900,max:1080,dir:1,speed:45+rand(4)*12},{x:2320,y:432,w:30,h:30,min:2250,max:2480,dir:-1,speed:52},{x:3470,y:432,w:30,h:30,min:3370,max:3560,dir:1,speed:49}];
  // Shards along the main route and a discoverable secret nook behind a vine-marked cliff.
  [[270,420],[465,338],[900,305],[1140,255],[1530,345],[1810,285],[2240,335],[2440,275],[2840,330],[3065,260],[3480,320],[3660,275],[1870,430],[1930,430]].forEach(([x,y],i)=>shards.push({x,y:y+(i<12?0:8),taken:false,secret:i>=12}));
  checkpoint={x:1460,y:432};
  if (core) {
    coreApi.clear_solids();
    for (const p of platforms) coreApi.add_solid(p.x,p.y,p.w,p.h);
    coreApi.add_solid(mover.x,mover.y,mover.w,mover.h);
    coreApi.set_checkpoint(checkpoint.x,checkpoint.y);
    coreApi.reset_player();
    respawnSeen=coreApi.respawn_count();
  }
  shardCount=0; totalShards=shards.length; cameraX=0; introTimer=5;
}
function beginGame(){worldIndex=0;makeWorld(worldIndex);gameState='playing';canvas.focus();playTone(540,.08);}
function nextWorld(){if(worldIndex>=29){gameState='complete';playTone(760,.3);return;}worldIndex++;makeWorld(worldIndex);gameState='playing';playTone(620,.12);}
function restart(){if(gameState==='complete'||gameState==='title'){beginGame();return;}makeWorld(worldIndex);gameState='playing';}
function axis(){let n=0;if(keys.has('ArrowLeft')||keys.has('KeyA'))n--;if(keys.has('ArrowRight')||keys.has('KeyD'))n++;return n||touchAxis;}
function pressedJump(){return keys.has('jump-pressed');}
function soundToggle(){muted=!muted;soundButton.innerHTML=muted?'♪ <span>Sound off</span>':'♫ <span>Sound on</span>';if(!muted)playTone(520,.07);}
soundButton.addEventListener('click',soundToggle);
function playTone(freq,duration){if(muted)return;try{audio??=new AudioContext();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}}

canvas.addEventListener('pointerdown',()=>{canvas.focus();if(gameState==='title'||gameState==='complete')beginGame();else if(gameState==='paused')gameState='playing';});
window.addEventListener('keydown',e=>{
  const gameKeys=['ArrowLeft','ArrowRight','ArrowUp','Space','KeyA','KeyD','Escape','KeyP','Enter','KeyR'];
  if(!gameKeys.includes(e.code))return;
  if(document.activeElement!==canvas && !['Enter','Space'].includes(e.code))return;
  e.preventDefault();
  if(e.code==='Escape'||e.code==='KeyP'){if(gameState==='playing')gameState='paused';else if(gameState==='paused')gameState='playing';return;}
  if(e.code==='KeyR'){restart();return;}
  if(gameState==='title'||gameState==='complete'){if(e.code==='Enter'||e.code==='Space')beginGame();return;}
  if(gameState==='paused'&&e.code==='Enter'){gameState='playing';return;}
  if(e.code==='Space'||e.code==='ArrowUp'){if(!keys.has('jump'))keys.add('jump-pressed');keys.add('jump');}
  else keys.add(e.code);
},{passive:false});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space'||e.code==='ArrowUp')keys.delete('jump');});
window.addEventListener('blur',()=>{keys.clear();if(gameState==='playing')gameState='paused';});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&gameState==='playing')gameState='paused';});

function step(dt){
  if(gameState!=='playing'||!core)return;
  elapsed+=dt; mover.x=mover.base+Math.sin(elapsed*.85+mover.phase)*110; mover.y=354+Math.sin(elapsed*1.1+mover.phase)*12;
  coreApi.clear_solids(); for(const p of platforms)coreApi.add_solid(p.x,p.y,p.w,p.h); coreApi.add_solid(mover.x,mover.y,mover.w,mover.h);
  coreApi.move_player(axis(),pressedJump()?1:0,keys.has('jump')?1:0,dt); keys.delete('jump-pressed');
  const p={x:coreApi.player_x(),y:coreApi.player_y(),w:coreApi.player_width(),h:coreApi.player_height()};
  if(p.x>1360&&p.x<1605&&checkpoint.x<1400){checkpoint={x:1460,y:432};coreApi.set_checkpoint(checkpoint.x,checkpoint.y);playTone(720,.13);}
  for(const s of shards)if(!s.taken&&overlaps(p,{x:s.x-11,y:s.y-11,w:22,h:22})){s.taken=true;shardCount++;playTone(820+shardCount*18,.08);particles.push({x:s.x,y:s.y,life:.45,color:'#ffe58b'});}
  for(const h of hazards){const danger=h.type==='wind'?{x:h.x,y:h.y+13,w:h.w,h:h.h-13}:{x:h.x,y:h.y,w:h.w,h:20};if(overlaps(p,danger))coreApi.hurt_player();}
  for(const e of enemies){e.x+=e.dir*e.speed*dt;if(e.x<e.min||e.x+e.w>e.max)e.dir*=-1;if(overlaps(p,e)){if(coreApi.player_vy()>120&&p.y+p.h-e.y<18){e.stunned=1.2;}else if(!e.stunned)coreApi.hurt_player();}if(e.stunned)e.stunned=Math.max(0,e.stunned-dt);}
  const deaths=coreApi.respawn_count();if(deaths!==respawnSeen){respawnSeen=deaths;playTone(170,.15);}
  cameraX=clamp(p.x-W*.42,0,LEVEL_W-W);
  if(p.x>LEVEL_W-145){nextWorld();}
  introTimer=Math.max(0,introTimer-dt);
  particles=particles.filter(q=>{q.life-=dt;return q.life>0;});
}
function rounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function drawBackground(world){
  const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,world.sky);grad.addColorStop(1,world.haze);ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  // distant cloud banks and layered island silhouettes
  for(let i=0;i<7;i++){const x=((i*230-cameraX*.12+140)%1250+1250)%1250-120;ctx.fillStyle='#f6efdb28';ctx.beginPath();ctx.ellipse(x,115+(i%3)*32,75,15,0,0,Math.PI*2);ctx.fill();}
  for(let layer=0;layer<3;layer++){
    const parallax=.17+layer*.13;ctx.fillStyle=layer===0?'#526f7960':layer===1?world.land+'99':world.land;
    ctx.beginPath();ctx.moveTo(0,H);
    for(let x=-80;x<=W+100;x+=80){let wx=x+cameraX*parallax;let y=340+layer*42+Math.sin(wx*.003+layer)*30+Math.sin(wx*.008)*15;ctx.lineTo(x,y);}
    ctx.lineTo(W,H);ctx.closePath();ctx.fill();
  }
  // wind-bent cloud wisps and gulls
  ctx.strokeStyle='#fff9e355';ctx.lineWidth=2;for(let i=0;i<5;i++){let x=(i*245-cameraX*.28+elapsed*5)%(W+160)-70;ctx.beginPath();ctx.moveTo(x,205+i%2*34);ctx.quadraticCurveTo(x+28,192+i%2*34,x+58,204+i%2*34);ctx.stroke();}
}
function drawTerrain(world){
  for(const p of platforms){const x=p.x-cameraX;if(x+p.w<0||x>W)continue;
    if(p.kind==='earth'){ctx.fillStyle='#42594a';ctx.fillRect(x,p.y,p.w,p.h);ctx.fillStyle=world.land;ctx.fillRect(x,p.y,p.w,10);ctx.fillStyle='#d5cc9a';ctx.fillRect(x,p.y+10,p.w,3);for(let tx=x+10;tx<x+p.w;tx+=28){ctx.fillStyle='#d5ce9b55';ctx.fillRect(tx,p.y+24+(Math.sin(tx)*8),4,2);}}
    else{rounded(x,p.y,p.w,p.h,7,'#ba9b69');rounded(x,p.y,p.w,6,5,'#d7c58d');ctx.fillStyle='#f0e2b155';ctx.fillRect(x+8,p.y+8,Math.max(4,p.w-16),2);}
  }
  const mx=mover.x-cameraX;rounded(mx,mover.y,mover.w,mover.h,6,'#997d65');rounded(mx,mover.y,mover.w,6,5,'#e2cb8c');
}
function drawObjects(world){
  // hazard marks and obvious wind warning swirls
  for(const h of hazards){const x=h.x-cameraX;if(x+h.w<0||x>W)continue;if(h.type==='spikes'){ctx.fillStyle='#b4665c';for(let sx=x;sx<x+h.w;sx+=15){ctx.beginPath();ctx.moveTo(sx,h.y+8);ctx.lineTo(sx+7,h.y-5);ctx.lineTo(sx+14,h.y+8);ctx.fill();}}
    else{ctx.strokeStyle='#f4edc177';ctx.lineWidth=3;for(let n=0;n<3;n++){let yy=h.y+8+n*12+Math.sin(elapsed*3+n)*2;ctx.beginPath();ctx.moveTo(x+8+((elapsed*38+n*24)%35),yy);ctx.quadraticCurveTo(x+38,yy-8,x+79,yy);ctx.stroke();}rounded(x+2,h.y+4,20,7,3,'#eee4c577');}}
  for(const e of enemies){const x=e.x-cameraX;if(x+e.w<0||x>W)continue;const bob=Math.sin(elapsed*8+e.x)*2;ctx.fillStyle=e.stunned?'#d8c98c':'#815d58';ctx.beginPath();ctx.ellipse(x+15,e.y+18+bob,15,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f4e6bb';ctx.fillRect(x+7,e.y+7+bob,5,6);ctx.fillRect(x+19,e.y+7+bob,5,6);ctx.fillStyle='#273d42';ctx.fillRect(x+9,e.y+9+bob,2,3);ctx.fillRect(x+21,e.y+9+bob,2,3);ctx.fillStyle='#5e4945';ctx.fillRect(x+5,e.y+27+bob,7,3);ctx.fillRect(x+20,e.y+27+bob,7,3);}
  for(const s of shards)if(!s.taken){let x=s.x-cameraX;if(x<-20||x>W+20)continue;const bob=Math.sin(elapsed*3+s.x)*4;ctx.save();ctx.translate(x,s.y+bob);ctx.rotate(Math.PI/4);ctx.fillStyle=s.secret?'#d9b6ed':'#ffe58b';ctx.fillRect(-6,-6,12,12);ctx.fillStyle='#fff8ce';ctx.fillRect(-2,-5,3,6);ctx.restore();}
  // checkpoint, cave mouth, and goal pennant
  let cp=checkpoint.x-cameraX;rounded(cp-12,382,24,88,5,'#725943');ctx.fillStyle='#d6c48b';ctx.fillRect(cp-3,388,6,82);ctx.fillStyle='#e7a879';ctx.beginPath();ctx.moveTo(cp+3,392);ctx.lineTo(cp+44,404);ctx.lineTo(cp+3,418);ctx.fill();
  let cave=1940-cameraX;if(cave>-90&&cave<W+90){ctx.fillStyle='#33464b';ctx.beginPath();ctx.ellipse(cave,470,55,50,0,Math.PI,0);ctx.fill();ctx.fillStyle='#8caa7d';for(let v=0;v<5;v++){ctx.beginPath();ctx.ellipse(cave-34+v*15,425-v%2*6,7,15,-.4,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#dbe19c';ctx.globalAlpha=.5+Math.sin(elapsed*3)*.25;ctx.beginPath();ctx.arc(cave+42,440,4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  let gx=LEVEL_W-120-cameraX;ctx.fillStyle='#e9dfbc';ctx.fillRect(gx,350,6,120);ctx.fillStyle='#e6a878';ctx.beginPath();ctx.moveTo(gx+6,352);ctx.lineTo(gx+55,369);ctx.lineTo(gx+6,387);ctx.fill();ctx.fillStyle='#f6e5ad';ctx.beginPath();ctx.arc(gx+4,349,7,0,Math.PI*2);ctx.fill();
}
function drawNiko(){
  const x=coreApi.player_x()-cameraX,y=coreApi.player_y(),vx=coreApi.player_vx();const grounded=coreApi.player_grounded();const bob=grounded&&Math.abs(vx)>25?Math.sin(elapsed*19)*1.5:0;
  // scarf tail, round explorer hood, warm tunic, dark boots: distinctive original silhouette
  ctx.save();ctx.translate(x+13,y+20+bob);if(vx<0)ctx.scale(-1,1);
  ctx.fillStyle='#e89568';ctx.beginPath();ctx.moveTo(-2,-5);ctx.quadraticCurveTo(-17,-9,-20,-1);ctx.lineTo(-7,1);ctx.fill();
  ctx.fillStyle='#c87158';ctx.beginPath();ctx.ellipse(0,4,13,16,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f0bd83';ctx.beginPath();ctx.ellipse(1,-8,12,13,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#324751';ctx.beginPath();ctx.ellipse(4,-9,9,10,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f2d69a';ctx.beginPath();ctx.ellipse(6,-6,6,7,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#293c43';ctx.fillRect(7,-8,2,3);ctx.fillRect(1,15,9,5);ctx.fillRect(-7,15,8,5);
  ctx.fillStyle='#f2d69a';ctx.fillRect(-8,1,16,3);ctx.fillStyle='#e4b85f';ctx.fillRect(3,0,4,5);
  ctx.restore();
}
function drawHud(){
  rounded(18,16,330,58,12,'#173846d9');ctx.fillStyle='#f4e9c9';ctx.font='800 16px Nunito, sans-serif';ctx.fillText(String(worldIndex+1).padStart(2,'0')+'  '+worlds[worldIndex].name,34,41);
  ctx.fillStyle='#c5d5c6';ctx.font='12px Nunito, sans-serif';ctx.fillText('Wandering Isle  ·  '+String(worldIndex+1).padStart(2,'0')+' / 30',34,60);
  rounded(W-162,17,144,42,12,'#173846d9');ctx.save();ctx.translate(W-137,38);ctx.rotate(Math.PI/4);ctx.fillStyle='#ffe58b';ctx.fillRect(-6,-6,12,12);ctx.restore();ctx.fillStyle='#f7f0d8';ctx.font='800 15px Nunito, sans-serif';ctx.fillText(String(shardCount).padStart(2,'0')+' / '+String(totalShards).padStart(2,'0'),W-119,43);
  ctx.fillStyle='#f7f0d899';ctx.font='11px Nunito, sans-serif';ctx.fillText('Find the lantern at the far shore',W/2-91,H-19);
}
function overlay(title,lines,action){ctx.fillStyle='#0a1e2bb8';ctx.fillRect(0,0,W,H);rounded(240,128,480,286,22,'#183b49f2');ctx.strokeStyle='#91b6a566';ctx.lineWidth=1;ctx.strokeRect(241,129,478,284);ctx.textAlign='center';ctx.fillStyle='#f5e8c3';ctx.font='900 33px Nunito, sans-serif';ctx.fillText(title,W/2,190);lines.forEach((line,i)=>{ctx.fillStyle=i===0?'#d5e0cb':'#b1c8c3';ctx.font=i===0?'600 15px Nunito, sans-serif':'13px Nunito, sans-serif';ctx.fillText(line,W/2,236+i*27);});rounded(350,337,260,48,13,'#c38d65');ctx.fillStyle='#fff3d4';ctx.font='900 16px Nunito, sans-serif';ctx.fillText(action,W/2,367);ctx.textAlign='left';}
function render(){const world=worlds[worldIndex]||worlds[0];drawBackground(world);drawTerrain(world);drawObjects(world);if(core&&['playing','paused','complete'].includes(gameState))drawNiko();drawHud();
  if(gameState==='title')overlay('Niko and the Wandering Isles',['A small explorer. Thirty faraway shores.','Explore, find wind-shards, and follow the lantern.','← → / A D move     ·     Space jump     ·     Esc pause'],'PRESS ENTER OR CLICK TO BEGIN');
  if(gameState==='paused')overlay('A quiet moment',['Your place is safe. The sea can wait.','Move ← → / A D     ·     Jump Space'],'PRESS ENTER OR ESC TO RESUME');
  if(gameState==='complete')overlay('The horizon is home',['All 30 wandering isles are behind you.','Wind-shards found: '+shardCount+' / '+totalShards,'Thanks for exploring with Niko.'],'PRESS ENTER TO SAIL AGAIN');
  if(gameState==='error')overlay('Almost ready',['Build the small C++ game core with Emscripten.','See README for the exact command.'],'THEN RELOAD THIS PAGE');
  if(gameState==='playing'&&introTimer>0){ctx.globalAlpha=Math.min(1,introTimer);rounded(300,85,360,46,12,'#183846c9');ctx.fillStyle='#f6edce';ctx.textAlign='center';ctx.font='700 14px Nunito, sans-serif';ctx.fillText('Find the lantern. Take the long way around.',480,114);ctx.textAlign='left';ctx.globalAlpha=1;}
}
function loop(now){const dt=Math.min(.033,Math.max(0,(now-lastTime)/1000||0));lastTime=now;step(dt);render();requestAnimationFrame(loop);}
requestAnimationFrame(loop);
