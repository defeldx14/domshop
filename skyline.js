
(()=>{
  const root=document.getElementById('domshop-mini-skyline');
  const product=root.querySelector('.skyline-product'),scene=root.querySelector('.skyline-scene');
  const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const controls=[...root.querySelectorAll('[data-building]')];
  const cloudButton=root.querySelector('.skyline-cloud'),timeButton=root.querySelector('.skyline-time'),moonButton=root.querySelector('.skyline-moon');
  const picker=root.querySelector('.skyline-picker'),status=root.querySelector('.skyline-status');
  const soundButton=root.querySelector('.skyline-sound'),planeButton=root.querySelector('.skyline-plane'),trainButton=root.querySelector('.skyline-train');
  const colorInput=root.querySelector('input[type=color]'),power=root.querySelector('.skyline-tower-power');
  const names=['Brownstones','Apartments','Cinema','Crown tower','Riverside'];
  const specs=[{x:.016,w:.13,h:.26},{x:.183,w:.137,h:.39},{x:.356,w:.16,h:.315},{x:.55,w:.18,h:.51},{x:.774,w:.206,h:.355}];
  const defaults={version:1,lights:[false,false,false,true,false],colors:['#ffffff','#d500ff','#0088ff'],era:0,future:false,sound:true,band:0,picker:false};
  const openedAt=performance.now();let flight=-1,biplane=false,planeVisible=false,trainVisible=false,steam=false,trainPass=-1;
  let state={...defaults,lights:[...defaults.lights],colors:[...defaults.colors]};
  let width=0,height=0,phase=0,from=0,goal=0,travelStart=0,flashUntil=0,thunderAt=-Infinity,lastFrame=0,raf=0,visible=false,audio=null;
  let geometry=[],portal={x:0,y:0},cloud={x:0,y:0,w:0,h:0};
  let colonial=0,fromColonial=0,goalColonial=0,meteorStart=null;
  const design={glow:.8,sky:'#0c1220'};
  const mix=(a,b,t)=>a+(b-a)*t;
  const rgba=(hex,a=1)=>{const h=hex.replace('#','');return 'rgba('+parseInt(h.slice(0,2),16)+','+parseInt(h.slice(2,4),16)+','+parseInt(h.slice(4,6),16)+','+a+')';};
  const blend=(a,b,t)=>{const aa=a.slice(1).match(/../g).map(x=>parseInt(x,16)),bb=b.slice(1).match(/../g).map(x=>parseInt(x,16));return 'rgb('+aa.map((x,i)=>Math.round(mix(x,bb[i],t))).join(',')+')';};
  function applySaved(saved){
    const s=saved?.privateContent||saved;
    if(!s||s.version!==1)return;
    if(Array.isArray(s.lights)&&s.lights.length===5&&s.lights.every(x=>typeof x==='boolean'))state.lights=[...s.lights];
    if(Array.isArray(s.colors)&&s.colors.length===3&&s.colors.every(x=>/^#[0-9a-f]{6}$/i.test(x)))state.colors=[...s.colors];
    for(const k of ['future','sound','picker','meteor'])if(typeof s[k]==='boolean')state[k]=s[k];
    if(Number.isInteger(s.band)&&s.band>=0&&s.band<3)state.band=s.band;
    state.era=Number.isInteger(s.era)&&s.era>=0&&s.era<=2?s.era:(s.future?2:0);state.future=state.era===2;
    phase=goal=state.future?1:0;colonial=goalColonial=state.era===1?1:0;fromColonial=colonial;from=phase;travelStart=0;syncControls();draw(performance.now());
  }
  function remember(){
    try{localStorage.setItem('domshop-skyline-v1',JSON.stringify({...state,version:1}));}catch{}
  }
  function announce(text){status.textContent=text;}
  function syncControls(){
    picker.hidden=!state.picker;
    controls.forEach((b,i)=>{if(i===3)b.setAttribute('aria-expanded',String(state.picker));else b.setAttribute('aria-pressed',String(state.lights[i]));});
    timeButton.setAttribute('aria-pressed',String(state.era!==0));timeButton.setAttribute('aria-label',['Meteor: travel to colonial America','Meteor: travel to 2126','Meteor: return to 2026'][state.era]);
    root.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color.toLowerCase()===state.colors[state.band].toLowerCase())));
    colorInput.value=state.colors[state.band];power.setAttribute('aria-pressed',String(state.lights[3]));
    soundButton.setAttribute('aria-pressed',String(state.sound));
  }
  function rounded(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
  function line(points,color,weight=1,glow=0){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.shadowColor=color;ctx.shadowBlur=glow;ctx.stroke();ctx.shadowBlur=0;}
  function place(button,x,y,w,h){button.style.left=x+'px';button.style.top=y+'px';button.style.width=w+'px';button.style.height=h+'px';}
  function drawCloud(){
    const x=cloud.x,y=cloud.y,w=cloud.w,h=cloud.h;
    ctx.save();ctx.shadowColor='#476084';ctx.shadowBlur=18;
    ctx.fillStyle=blend('#34435e','#3c4678',phase);ctx.beginPath();ctx.ellipse(x+w*.45,y+h*.62,w*.45,h*.30,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(x+w*.31,y+h*.47,w*.22,h*.36,0,0,Math.PI*2);ctx.ellipse(x+w*.57,y+h*.35,w*.24,h*.43,0,0,Math.PI*2);ctx.ellipse(x+w*.78,y+h*.58,w*.19,h*.29,0,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.strokeStyle='#77849b45';ctx.beginPath();ctx.ellipse(x+w*.57,y+h*.35,w*.24,h*.43,Math.PI*1.15,Math.PI*1.1,Math.PI*1.8);ctx.stroke();
  }
  function building(b,i,time){
    const {x,y,w,h,base}=b;
    const lit=state.lights[i],opacity=ctx.globalAlpha;
    ctx.fillStyle=blend(['#292937','#313347','#36313b','#353c50','#272f3d'][i],['#152f48','#19384a','#252f4e','#243952','#1b354e'][i],phase);ctx.fillRect(x,y,w,h);
    ctx.fillStyle=blend('#3a3b4b','#294c66',phase);ctx.fillRect(x,y,3,h);ctx.fillStyle='#070c1570';ctx.fillRect(x+w-5,y,5,h);
    ctx.fillStyle=blend('#444253','#316481',phase);ctx.fillRect(x-2,y-5,w+4,5);
    const cols=i===3?5:Math.max(3,Math.floor(w/12));const rows=Math.floor((h-16)/15);const gap=w/(cols+1);
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const wx=x+gap*(c+1)-2,wy=y+12+r*15;
      const isOn=lit&&((r*7+c*11+i*13)%9>2);
      const color=i===3?state.colors[Math.min(2,Math.floor(r/Math.max(1,rows)*3))]:blend('#e4bd79','#6ce6f3',phase);
      ctx.fillStyle=isOn?rgba(color.startsWith('#')?color:'#6ce6f3',mix(.85,.75,phase)):'#0a1420';
      if(isOn){ctx.shadowColor=i===3?color:'#f8b06d';ctx.shadowBlur=mix(4,7,phase);}
      ctx.fillRect(Math.round(wx),Math.round(wy),mix(3,2,phase),mix(5,8,phase));ctx.shadowBlur=0;
      if(isOn&&i!==3&&phase<1){ctx.fillStyle=rgba('#e4bd79',(1-phase)*.85);ctx.fillRect(Math.round(wx),Math.round(wy),3,5);}
    }
    if(i===0){
      for(let j=0;j<3;j++){const bx=x+j*w/3;line([[bx,y-6],[bx+w/6,y-13],[bx+w/3,y-6]],blend('#4a4552','#4b8caa',phase),2);}
      ctx.fillStyle=blend('#171b28','#173b52',phase);ctx.fillRect(x+w*.42,base-22,w*.19,22);
    }
    if(i===1&&phase<1){
      ctx.globalAlpha=opacity*(1-phase);ctx.fillStyle='#1c2431';ctx.fillRect(x+w*.22,y-25,w*.56,18);line([[x+w*.22,y-26],[x+w*.5,y-33],[x+w*.78,y-26]],'#465065',2);
      line([[x+w*.3,y-7],[x+w*.3,y]],'#73809a',1);line([[x+w*.7,y-7],[x+w*.7,y]],'#73809a',1);
      const fx=x+w*.66;line([[fx,y+8],[fx,base-11]],'#68738a',1);for(let z=y+25;z<base-10;z+=28)line([[fx-8,z],[fx+9,z],[fx-8,z+21]],'#68738a',1);
      ctx.globalAlpha=opacity;
    }
    if(i===2){
      ctx.fillStyle=blend('#66515a','#4e6384',phase);ctx.fillRect(x+5,base-29,w-10,9);
      if(lit){ctx.fillStyle=blend('#ffcd8c','#d595ff',phase);for(let j=0;j<5;j++)ctx.fillRect(x+9+j*(w-18)/5,base-26,2,3);}
    }
    if(i===3){
      const levels=[{x:x+w*.10,w:w*.80,y:y-21,h:21,band:2},{x:x+w*.24,w:w*.52,y:y-43,h:22,band:1},{x:x+w*.36,w:w*.28,y:y-64,h:21,band:0}];
      for(const l of levels){ctx.fillStyle=blend('#45536b','#3c6286',phase);ctx.fillRect(l.x,l.y,l.w,l.h);if(lit){ctx.fillStyle=rgba(state.colors[l.band],.88);ctx.shadowColor=state.colors[l.band];ctx.shadowBlur=12;ctx.fillRect(l.x+2,l.y+2,Math.max(2,l.w-4),l.h-5);ctx.shadowBlur=0;ctx.fillStyle='#18253955';for(let xx=l.x+5;xx<l.x+l.w-2;xx+=5)ctx.fillRect(xx,l.y,1,l.h);}}
      line([[x+w*.5,y-64],[x+w*.5,y-89]],lit?state.colors[0]:'#68758e',2,lit?6:0);
      if(lit){ctx.fillStyle=state.colors[0];ctx.beginPath();ctx.arc(x+w*.5,y-89,1.7,0,Math.PI*2);ctx.fill();}
      if(phase>0){ctx.globalAlpha=opacity*phase;ctx.strokeStyle=rgba(state.colors[1],.75);ctx.shadowColor=state.colors[1];ctx.shadowBlur=8;ctx.beginPath();ctx.ellipse(x+w*.5,y-48,w*.78,7,0,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;ctx.globalAlpha=opacity;}
    }else if(phase>0){
      ctx.globalAlpha=opacity*phase;const neon=i%2?'#66d9ef':'#c18dff';line([[x+3,base-3],[x+3,y-12],[x+w*.52,y-24],[x+w-3,y-12],[x+w-3,base-3]],neon,1.2,8);
      ctx.fillStyle=rgba(neon,.5);ctx.fillRect(x+w*.42,y-30,w*.16,26);line([[x+w*.5,y-30],[x+w*.5,y-49]],neon,1,6);ctx.globalAlpha=opacity;
    }
  }
  function colonialBuilding(b,i){
    const {x,y,w,h,base}=b,lit=state.lights[i],hall=i===3;
    ctx.fillStyle=['#674237','#815344','#5d443d','#8b4a3c','#725347'][i];ctx.fillRect(x,y,w,h);
    ctx.save();ctx.globalAlpha*=.22;
    for(let row=0;row<h;row+=6){line([[x,y+row],[x+w,y+row]],'#dab49a',.6);for(let bx=x+(row%12?5:0);bx<x+w;bx+=12)line([[bx,y+row],[bx,y+row+6]],'#dab49a',.5);}
    ctx.restore();
    ctx.fillStyle='#252a32';ctx.beginPath();ctx.moveTo(x-4,y+1);ctx.lineTo(x+w*.5,y-(hall?24:20));ctx.lineTo(x+w+4,y+1);ctx.closePath();ctx.fill();
    line([[x-3,y+2],[x+w+3,y+2]],'#c1ad8c',3);
    ctx.fillStyle='#7e5244';ctx.fillRect(x+w*.16,y-23,6,18);ctx.fillStyle='#c4b399';ctx.fillRect(x+w*.16-1,y-25,8,3);
    const cols=hall?5:3,rows=hall?3:2;
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const wx=x+(c+1)*w/(cols+1)-3,wy=y+12+r*19;
      ctx.fillStyle='#d3c3a4';ctx.fillRect(wx-1,wy-1,8,12);ctx.fillStyle=lit?'#f8c875':'#1c2630';ctx.fillRect(wx,wy,6,10);
      line([[wx+3,wy],[wx+3,wy+10]],'#bda98c',.8);line([[wx,wy+5],[wx+6,wy+5]],'#bda98c',.8);
      if(!hall){ctx.fillStyle='#253a34';ctx.fillRect(wx-4,wy,2,10);ctx.fillRect(wx+8,wy,2,10);}
    }
    rounded(x+w*.5-5,base-20,10,20,4,'#d5c7ab');rounded(x+w*.5-3,base-17,6,17,3,'#243129');
    if(hall){
      const cx=x+w*.5,ty=y-28;
      ctx.fillStyle='#ad9d7e';ctx.fillRect(x+w*.21,y-4,w*.58,4);
      ctx.fillStyle='#c9bea5';ctx.fillRect(cx-12,ty-20,24,28);
      ctx.fillStyle='#e0d4b8';ctx.fillRect(cx-10,ty-42,20,24);
      ctx.fillStyle='#cfc6ae';ctx.fillRect(cx-7,ty-60,14,18);
      ctx.fillStyle='#303941';ctx.beginPath();ctx.moveTo(cx-10,ty-60);ctx.lineTo(cx,ty-80);ctx.lineTo(cx+10,ty-60);ctx.closePath();ctx.fill();
      line([[cx,ty-80],[cx,ty-88]],'#c1b28b',1);
      for(const dx of [-5,3])rounded(cx+dx,ty-37,3,12,1,'#29302f');
      ctx.fillStyle='#242b30';ctx.beginPath();ctx.arc(cx,ty-8,6,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#e1d6b9';ctx.lineWidth=1;ctx.stroke();line([[cx,ty-12],[cx,ty-8],[cx+3,ty-6]],'#e1d6b9',1);
      if(lit){for(const [band,yy,ww] of [[0,ty-46,15],[1,ty-20,23],[2,y+2,w]]){ctx.fillStyle=rgba(state.colors[band],.55);ctx.shadowColor=state.colors[band];ctx.shadowBlur=9;ctx.fillRect(cx-ww/2,yy,ww,2);ctx.shadowBlur=0;}}
    }else{
      const lx=x+5;line([[lx,base-8],[lx,base-27]],'#a28b68',1);rounded(lx-2,base-30,4,6,1,lit?'#f7c16a':'#465044');
    }
  }
  function draw(time){
    if(!width||!height)return;
    if(travelStart){const p=Math.min(1,(time-travelStart)/1450);const eased=p*p*(3-2*p);phase=mix(from,goal,eased);colonial=mix(fromColonial,goalColonial,eased);if(p===1){travelStart=0;phase=goal;colonial=goalColonial;}}
    ctx.clearRect(0,0,width,height+56);
    const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,blend(design.sky,'#11162e',phase));sky.addColorStop(.7,blend('#1c253e','#26305d',phase));sky.addColorStop(1,blend('#343044','#332955',phase));ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
    for(let i=0;i<34;i++){const x=((i*89+23)%997)/997*width,y=((i*61+11)%233)/233*height*.62;ctx.fillStyle=rgba('#b7c7e7',.16+(i%4)*.09);ctx.fillRect(x,y,i%6===0?1.5:1,1);}
    ctx.fillStyle='#d7d9cb';ctx.shadowColor='#b7cbe8';ctx.shadowBlur=20;ctx.beginPath();ctx.arc(width*.88,height*.16,12,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle=blend(design.sky,'#11162e',phase);ctx.beginPath();ctx.arc(width*.88-5,height*.16-3,11,0,Math.PI*2);ctx.fill();
    const base=height*.875;
    for(let i=0;i<13;i++){const x=i*width/12-9,w=width*.08,h=(25+(i*19)%50)*(1-colonial*.65);ctx.fillStyle=blend('#1b2438','#203451',phase);ctx.fillRect(x,base-h-phase*20,w,h+phase*20);if(colonial>0){ctx.globalAlpha=colonial;ctx.fillStyle='#1a2733';ctx.beginPath();ctx.moveTo(x-3,base-h);ctx.lineTo(x+w/2,base-h-12);ctx.lineTo(x+w+3,base-h);ctx.fill();ctx.globalAlpha=1;}if(phase>.1){ctx.fillStyle=rgba('#6ee4ef',phase*.24);ctx.fillRect(x+w*.25,base-h-phase*20+5,1,h*.65);}}
    geometry=specs.map((s,i)=>{const h=mix(height*s.h+phase*[25,34,29,10,36][i],[53,68,58,76,61][i],colonial);return {x:width*(s.x-(i===3?.02:0)*colonial),w:width*(s.w+(i===3?.04:0)*colonial),h,y:base-h,base};});
    if(phase>0){ctx.globalAlpha=phase;const a=geometry[1],b=geometry[4];line([[a.x+a.w/2,base-56],[b.x+b.w/2,base-56]],'#7bb8d8',5);line([[a.x+a.w/2,base-59],[b.x+b.w/2,base-59]],'#80e3f0',1,6);ctx.globalAlpha=1;}
    geometry.forEach((b,i)=>{
      // Each era keeps its own opacity, including rooftop details.
      if(colonial<1){ctx.save();ctx.globalAlpha=1-colonial;building(b,i,time);ctx.restore();}
      if(colonial>0){ctx.save();ctx.globalAlpha=colonial;colonialBuilding(b,i);ctx.restore();}
    });
    if(phase>0){ctx.globalAlpha=phase;for(let i=0;i<2;i++){const cx=reduced.matches?width*(.24+i*.5):((time*.012+i*width*.53)%(width+40))-20,cy=height*(.34+i*.12);line([[cx-11,cy],[cx-5,cy-4],[cx+6,cy-4],[cx+11,cy]],i?'#ef9cce':'#91d7f4',1.6,7);ctx.fillStyle='#142437';ctx.fillRect(cx-8,cy-2,16,4);ctx.fillStyle='#afedff';ctx.fillRect(cx+4,cy,3,1); }ctx.globalAlpha=1;}
    cloud={x:width*.075,y:height*.13,w:Math.min(130,width*.34),h:45};drawCloud();
    if(time<flashUntil){const amount=Math.max(0,(flashUntil-time)/320);ctx.fillStyle=rgba('#c0d7ff',amount*.11);ctx.fillRect(0,0,width,height);const cx=cloud.x+cloud.w*.55;line([[cx,cloud.y+37],[cx-13,height*.43],[cx+6,height*.43-8],[cx-17,height*.69]],rgba('#d4e9ff',amount),2.5,13);line([[cx-9,height*.46],[cx+18,height*.55],[cx+15,height*.59]],rgba('#bddbff',amount*.6),1,6);}
    ctx.fillStyle='#101724';ctx.fillRect(0,base,width,height-base+56);line([[0,base+.5],[width,base+.5]],'#475369',1);
    for(let i=0;i<28;i++){const x=(i*43%383)/383*width,y=base+8+(i*7%22);ctx.fillStyle=i%3===0?rgba(state.colors[i%3],.11):rgba('#edbe7f',.07);ctx.fillRect(x,y,8+(i%4)*6,1);}
    for(let x=0;x<width;x+=10)line([[x,height-23],[x-3,height-9]],'#354055',2);
    line([[0,height-22],[width,height-22]],'#77889f',1);line([[0,height-12],[width,height-12]],'#77889f',1);
    drawTrain(time);
    drawPlane(time);
    drawMeteor(time);
    geometry.forEach((b,i)=>{let x=b.x,y=b.y,w=b.w,h=b.h;if(i===3){y-=89;h+=89;}if(i===2){y=b.base-b.h*.42;h=b.h*.42;}place(controls[i],Math.max(0,x-2),y,Math.max(44,w+4),h);});
    place(cloudButton,cloud.x,cloud.y-6,cloud.w,58);place(moonButton,width*.88-22,height*.16-22,44,44);
    if(travelStart){const radius=Math.max(width,height)*1.2*((time-travelStart)/1450);ctx.strokeStyle=rgba('#c894ff',Math.max(0,1-(time-travelStart)/1450)*.36);ctx.lineWidth=8;ctx.beginPath();ctx.arc(portal.x,portal.y,Math.max(0,radius),0,Math.PI*2);ctx.stroke();}
  }
  function drawMeteor(time){
    const landed={x:width*.26,y:height+29};portal=landed;
    const p=meteorStart===null?1:Math.min(1,(time-meteorStart)/1400),falling=meteorStart!==null&&p<1;
    timeButton.hidden=!state.meteor||falling;if(!state.meteor)return;
    if(!falling&&meteorStart!==null){meteorStart=null;announce('The meteor has landed. Tap it to change the era.');}
    const x=mix(width*.88,landed.x,p),y=mix(height*.16,landed.y,p*p);
    if(falling){const tail=ctx.createLinearGradient(x,y,x+48,y-75);tail.addColorStop(0,'#f8ca8c');tail.addColorStop(.3,'#c389ff99');tail.addColorStop(1,'#a477ff00');line([[x+48,y-75],[x,y]],tail,6,8);}
    const pulse=reduced.matches ? .75 : .7+.2*Math.sin(time*.003);
    ctx.save();ctx.shadowColor='#c98aff';ctx.shadowBlur=(12+pulse*12)*design.glow;
    ctx.fillStyle='#64556c';ctx.beginPath();ctx.moveTo(x-12,y+5);ctx.lineTo(x-10,y-6);ctx.lineTo(x-2,y-12);ctx.lineTo(x+9,y-8);ctx.lineTo(x+13,y+3);ctx.lineTo(x+5,y+9);ctx.lineTo(x-7,y+10);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
    line([[x-8,y-5],[x-1,y],[x-3,y+7]],'#d99cff',1.8,8);line([[x+5,y-7],[x+2,y-1],[x+8,y+3]],'#b48cff',1.5,7);
    ctx.restore();
    if(!falling){place(timeButton,x-22,y-22,44,44);ctx.strokeStyle='#b17fe933';ctx.beginPath();ctx.ellipse(x,y+11,20,3,0,0,Math.PI*2);ctx.stroke();}
  }
  function drawTrain(time){
    const elapsed=Math.max(0,time-openedAt),cycle=elapsed%60000,pass=Math.floor(elapsed/60000),length=176;
    if(pass!==trainPass){trainPass=pass;steam=false;}
    trainVisible=cycle<24000;trainButton.hidden=!trainVisible;if(!trainVisible)return;
    const front=reduced.matches?width*.72:cycle/24000*(width+length+70)-35;
    const y=height-24;
    const left=Math.max(0,front-length),right=Math.min(width,front+16);
    trainButton.hidden=right<=0||left>=width;
    place(trainButton,Math.min(width-44,left),height-44,Math.max(44,right-left),44);
    trainButton.setAttribute('aria-label',steam?'Vintage steam train':'Express train: tap to turn into a steam train');
    ctx.save();
    if(steam){
      for(let car=1;car<=2;car++){
        const x=front-54*car-35;
        rounded(x,y-17,50,17,2,'#503830');ctx.fillStyle='#b8844c';ctx.fillRect(x,y-18,50,3);
        for(let j=0;j<5;j++){ctx.fillStyle='#edb65c';ctx.fillRect(x+5+j*9,y-12,5,6);}
        for(const wx of [x+9,x+40]){ctx.fillStyle='#111c2a';ctx.beginPath();ctx.arc(wx,y+1,3,0,Math.PI*2);ctx.fill();}
      }
      rounded(front-42,y-16,43,14,5,'#263341');rounded(front-48,y-25,17,23,2,'#374634');
      ctx.fillStyle='#ceaa64';ctx.fillRect(front-45,y-21,10,7);ctx.fillRect(front-15,y-27,7,15);ctx.fillRect(front-18,y-29,13,4);
      line([[front-50,y-26],[front-29,y-26]],'#9d744a',3);
      for(let i=0;i<3;i++){const wx=front-35+i*13;ctx.fillStyle='#17212e';ctx.beginPath();ctx.arc(wx,y,6,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#af8f65';ctx.lineWidth=1;ctx.stroke();const a=reduced.matches?0:time*.008;line([[wx,y],[wx+Math.cos(a)*4,y+Math.sin(a)*4]],'#d2b181',1);}
      line([[front-37,y+1],[front-6,y+1]],'#c1a27a',1.5);
      line([[front+1,y-6],[front+10,y+3],[front-1,y+3]],'#a4704f',2);
      for(let i=0;i<6;i++){const p=reduced.matches?i/6:((time/1800+i/6)%1);ctx.fillStyle=rgba('#b6bac7',(1-p)*.3);ctx.beginPath();ctx.arc(front-11-p*48,y-30-p*33,3+p*10,0,Math.PI*2);ctx.fill();}
      ctx.restore();return;
    }
    for(let car=2;car>=0;car--){
      const x=front-57*(car+1);
      rounded(x,y-14,54,14,3,'#a6b5c8');
      ctx.fillStyle='#c9d1d9';ctx.fillRect(x+3,y-13,47,3);
      ctx.fillStyle='#274b7b';ctx.fillRect(x,y-5,54,4);
      ctx.fillStyle='#152d4b';for(let j=0;j<6;j++)ctx.fillRect(x+5+j*7,y-10,5,4);
      ctx.fillStyle='#091424';for(const wx of [x+9,x+42]){ctx.beginPath();ctx.arc(wx,y+1,2.5,0,Math.PI*2);ctx.fill();}
      line([[x+54,y-4],[x+57,y-4]],'#8592a5',2);
    }
    ctx.beginPath();ctx.moveTo(front-12,y-14);ctx.lineTo(front-3,y-12);ctx.quadraticCurveTo(front+10,y-6,front+13,y);ctx.lineTo(front-12,y);ctx.closePath();ctx.fillStyle='#b9c6d7';ctx.fill();
    line([[front-10,y-11],[front-3,y-9],[front+1,y-6]],'#17334f',3);
    line([[front-11,y-4],[front+7,y-3]],'#275082',2);
    line([[front-29,y-15],[front-22,y-21],[front-15,y-15]],'#8a9caf',1);
    line([[0,y-23],[width,y-23]],'#56647c55',.7);
    ctx.fillStyle='#fff3ca';ctx.shadowColor='#fff3ca';ctx.shadowBlur=8;ctx.fillRect(front+7,y-3,3,2);ctx.shadowBlur=0;ctx.restore();
  }
  function drawPlane(time){
    const elapsed=Math.max(0,time-openedAt),current=Math.floor(elapsed/60000),progress=((elapsed%60000)-30000)/18000;
    if(current!==flight){flight=current;biplane=false;}
    planeVisible=progress>=0&&progress<=1;planeButton.hidden=!planeVisible;if(!planeVisible)return;
    const x=reduced.matches?width*.46:mix(24,width-24,progress),y=22;
    place(planeButton,Math.max(0,Math.min(width-48,x-24)),0,48,44);
    ctx.save();ctx.translate(x,y);
    if(biplane){
      line([[-21,1],[18,1]],'#d09a55',5);
      rounded(-10,-12,23,4,1,'#d2a45e');rounded(-10,8,23,4,1,'#d2a45e');
      for(const xx of [-6,8])line([[xx,-8],[xx,8]],'#a08868',1);
      line([[-21,0],[-23,-8],[-16,-7]],'#c69857',3);
      line([[19,-8],[19,9]],'#d7d4bc',1.5);
      ctx.fillStyle='#263042';ctx.fillRect(1,-4,6,3);
      for(const wx of [4,11]){ctx.beginPath();ctx.arc(wx,9,2,0,Math.PI*2);ctx.fillStyle='#111b2a';ctx.fill();}
    }else{
      line([[-23,1],[18,1],[22,0]],'#c5d1e0',3);
      ctx.fillStyle='#a9bcd3';ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(-13,-13);ctx.lineTo(-5,-12);ctx.lineTo(9,1);ctx.lineTo(-5,12);ctx.lineTo(-13,13);ctx.closePath();ctx.fill();
      line([[-20,0],[-24,-7],[-18,-6]],'#a9bcd3',2);
      ctx.fillStyle='#f4a0a1';ctx.fillRect(-12,-13,2,2);ctx.fillStyle='#91e0bf';ctx.fillRect(-12,12,2,2);
    }
    ctx.restore();
    planeButton.setAttribute('aria-label',biplane?'Vintage biplane flying over the city':'Airplane: tap to turn into a vintage biplane');
  }
  function frame(time){raf=0;if(!visible||document.hidden)return;if(time-lastFrame>30){draw(time);lastFrame=time;}raf=requestAnimationFrame(frame);}
  function wake(){if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(frame);}
  function resize(){const r=scene.getBoundingClientRect();width=r.width;height=r.height-56;const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw(performance.now());wake();}
  function rumble(){
    if(!state.sound)return;
    try{
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      audio=audio||new AC();audio.resume().catch(()=>{});
      const n=Math.floor(audio.sampleRate*1.8),buffer=audio.createBuffer(1,n,audio.sampleRate),data=buffer.getChannelData(0);let brown=0;
      for(let i=0;i<n;i++){brown=(brown+.025*(Math.random()*2-1))/1.025;data[i]=brown*9;}
      const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=360;filter.Q.value=.5;const t=audio.currentTime;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.28,t+.05);gain.gain.exponentialRampToValueAtTime(.07,t+.55);gain.gain.exponentialRampToValueAtTime(.001,t+1.75);source.connect(filter).connect(gain).connect(audio.destination);source.start(t);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
    }catch(e){announce('Lightning over the city · sound unavailable.');}
  }
  controls.forEach((button,i)=>button.addEventListener('click',event=>{
    if(i===3){
      if(event&&event.detail!==0&&Number.isFinite(event.clientY)){const y=event.clientY-scene.getBoundingClientRect().top,b=geometry[3];state.band=y<b.y-43?0:y<b.y-21?1:2;}
      state.picker=true;announce(['Crown','Middle','Base'][state.band]+' lighting selected.');
    }
    else{state.lights[i]=!state.lights[i];announce(names[i]+' · lights '+(state.lights[i]?'on':'off'));}
    syncControls();draw(performance.now());remember();
  }));
  cloudButton.addEventListener('click',()=>{const t=performance.now();if(t-thunderAt<1100)return;thunderAt=t;flashUntil=t+320;announce(state.sound?'Thunder rolling over the city.':'Lightning over the city · sound off.');rumble();wake();});
  planeButton.addEventListener('click',()=>{if(!planeVisible)return;biplane=true;announce('The airplane has turned into a vintage biplane.');draw(performance.now());wake();});
  trainButton.addEventListener('click',()=>{if(!trainVisible||trainButton.hidden)return;steam=true;announce('The express has turned into a vintage steam train.');draw(performance.now());wake();});
  moonButton.addEventListener('click',()=>{if(meteorStart!==null)return;state.meteor=true;meteorStart=reduced.matches?null:performance.now();announce('A meteor is falling toward the foreground.');draw(performance.now());wake();remember();});
  timeButton.addEventListener('click',()=>{state.era=(state.era+1)%3;state.future=state.era===2;state.picker=false;from=phase;fromColonial=colonial;goal=state.future?1:0;goalColonial=state.era===1?1:0;travelStart=reduced.matches?0:performance.now();if(reduced.matches){phase=goal;colonial=goalColonial;}announce(['2026 · back in the neighborhood.','Colonial America · a town of brick and candlelight.','2126 · the future has arrived.'][state.era]);syncControls();draw(performance.now());wake();remember();});
  soundButton.addEventListener('click',()=>{state.sound=!state.sound;syncControls();announce(state.sound?'Sound on · tap the cloud.':'Sound off.');remember();});
  root.querySelector('.skyline-close').addEventListener('click',()=>{state.picker=false;syncControls();controls[3].focus();remember();});
  function changeColor(color){state.colors[state.band]=color;state.lights[3]=true;syncControls();announce(['Crown','Middle','Base'][state.band]+' color updated.');draw(performance.now());remember();}
  root.querySelectorAll('[data-color]').forEach(button=>button.addEventListener('click',()=>changeColor(button.dataset.color)));
  colorInput.addEventListener('input',()=>changeColor(colorInput.value));
  power.addEventListener('click',()=>{state.lights[3]=!state.lights[3];syncControls();announce('Crown tower · lights '+(state.lights[3]?'on':'off'));draw(performance.now());remember();});
  if(window.ResizeObserver)new ResizeObserver(resize).observe(scene);else window.addEventListener('resize',resize);
  if(!window.IntersectionObserver){visible=true;wake();}
  if(window.IntersectionObserver)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)wake();else if(raf){cancelAnimationFrame(raf);raf=0;}},{threshold:0}).observe(scene);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0;}else wake();});

  syncControls();resize();try{applySaved(JSON.parse(localStorage.getItem('domshop-skyline-v1')));}catch{}wake();
})();

