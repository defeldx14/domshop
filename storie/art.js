(function(){
'use strict';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const person=(x,y,color,hair='#3e342f',arm=false)=>`<g transform="translate(${x} ${y})"><path d="M-22 91L-27 135M17 91L24 135" stroke="#343b42" stroke-width="17" stroke-linecap="round"/><path d="M-36 89L-30 36Q0 20 30 36L36 89Z" fill="${color}"/><circle cy="8" r="22" fill="#d69f7c"/><path d="M-23 8Q-30-28 5-19Q28-20 23 6L16-6L-17-6Z" fill="${hair}"/><path d="M-28 43L-48 76M28 43L${arm?65:45} ${arm?26:78}" stroke="${color}" stroke-width="14" stroke-linecap="round"/><circle cx="-7" cy="7" r="2"/><circle cx="8" cy="7" r="2"/><path d="M-4 18Q2 22 9 16" fill="none" stroke="#6b453c" stroke-width="2"/></g>`;
const rect=(x,y,w,h,fill,rx=4)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
const txt=(x,y,t,size=14,color='#35453e')=>`<text x="${x}" y="${y}" font-family="system-ui,sans-serif" font-size="${size}" fill="${color}">${esc(t)}</text>`;
const phone=(x,y,message)=>`<g>${rect(x,y,95,140,'#35453e',12)}${rect(x+6,y+8,83,121,'#eef1df',8)}${rect(x+14,y+24,66,39,'#bad7c2',6)}${txt(x+19,y+47,message,11)}${rect(x+20,y+78,56,23,'#d8c5a4',5)}</g>`;
const door=(x,color='#7b6652',number='')=>`${rect(x,62,98,190,color,2)}${rect(x+10,74,78,165,'#ffffff11',1)}<circle cx="${x+76}" cy="167" r="4" fill="#d0ae69"/>${txt(x+36,52,number,17)}`;
const table=`${rect(160,209,275,12,'#9a7657')}<path d="M180 220V288M414 220V288" stroke="#70543f" stroke-width="9"/>`;
globalThis.storieArt=function(lesson,index=0,card=false){
 const s=lesson.scenes[index],a=s.art;
 let base=rect(0,0,600,320,'#e4dfce',0)+rect(0,240,600,80,'#b4b9a7',0);
 let content='',caption=s.title;
 const A=(x,y,arm=false)=>person(x,y,'#b66e4c','#3d302c',arm);
 const B=(x,y,arm=false)=>person(x,y,'#4b7b78','#493a2e',arm);
 if(lesson.theme==='sea'){
 base=rect(0,0,600,320,'#c4d8d1',0)+rect(0,130,600,190,'#567f88',0);
 content=`<path d="M0 135Q60 115 120 135T240 135T360 135T480 135T600 135" fill="none" stroke="#e9efdf" stroke-width="5"/>`;
 if(a==='sea')content+=`<path d="M60 130V95H93V65H130V95H166V130M180 130V80H230V130M244 130V99H280V130" fill="#899c8c"/>${txt(50,44,'VENEZIA / ADRIATICO',17)}<path d="M320 140L440 140L414 163H345Z" fill="#e4dfce"/>`;
 if(a==='hydrophone')content+=`<path d="M320 65V239" stroke="#e4dfce" stroke-width="4"/>${rect(300,218,40,40,'#e4dfce')}<path d="M276 210Q245 237 276 264M364 210Q395 237 364 264" fill="none" stroke="#c8e0d9" stroke-width="4"/>${txt(338,244,'IDROFONO',15,'#fff')}`;
 if(a==='wave')content+=`${txt(65,66,'GIORNO',16)}${txt(405,66,'NOTTE',16)}<circle cx="95" cy="95" r="20" fill="#d5ae65"/><path d="M438 73A24 24 0 1 0 458 109A22 22 0 0 1 438 73" fill="#586f79"/><path d="M30 220L60 220L72 170L84 253L96 195L112 220L190 220L204 177L218 247L230 220L340 220L352 207L368 228L380 220L450 220L463 201L476 237L492 220H570" stroke="#d6e2cc" stroke-width="3" fill="none"/>`;
 if(a==='ecosystem')content+=`<path d="M80 300Q70 250 90 220M120 300Q148 260 130 238M490 300Q470 255 490 220" stroke="#a9bc8a" stroke-width="8" fill="none"/><g fill="#d6d4ad"><path d="M190 200Q220 175 250 200Q220 225 190 200L178 186V214Z"/><path d="M340 250Q365 230 390 250Q365 270 340 250L328 238V262Z"/></g>${txt(320,76,'UN POSSIBILE INDICATORE',15)}`;
 caption='Schema illustrativo · '+s.title;
 }else if(lesson.theme==='plans'){
 if(a==='phone')content=A(125,133)+B(475,133)+phone(224,74,'Alle otto?');
 if(a==='desk')content=B(147,132)+table+rect(220,135,115,74,'#455558')+rect(226,141,103,61,'#bdd0c3')+rect(345,173,63,35,'#eee9da');
 if(a==='door')content=door(70)+A(279,130,true)+B(449,130)+rect(399,190,82,22,'#c3a274')+txt(407,205,'PIZZA',11);
 if(a==='dinner')content=A(120,130)+B(480,130)+table+`<ellipse cx="300" cy="203" rx="60" ry="15" fill="#d5a361"/><ellipse cx="300" cy="200" rx="49" ry="10" fill="#ae684d"/>`;
 }else if(lesson.theme==='repair'){
 content=A(110,127)+person(480,127,'#627d8f','#55504b',true);
 if(a==='sink')content+=rect(205,135,180,15,'#e9eee6')+rect(210,150,170,85,'#b59778')+`<path d="M250 135V108Q268 90 283 108V121" stroke="#7c8c89" stroke-width="10" fill="none"/><path d="M290 158V197L313 215" stroke="#7c8c89" stroke-width="10" fill="none"/><ellipse cx="310" cy="251" rx="58" ry="10" fill="#7eabb2"/>`;
 if(a==='quote')content+=rect(212,53,172,159,'#f7f0db')+txt(236,93,'USCITA: 60 €',17)+txt(236,131,'TOTALE: 180 €',17)+txt(236,165,"mano d’opera",14);
 if(a==='paper')content+=rect(212,53,172,159,'#f7f0db')+txt(229,88,'PREVENTIVO',17)+txt(229,125,'Pezzi',15)+txt(229,155,"Mano d’opera",15)+txt(229,183,'Conferma prima',13);
 if(a==='handshake')content+=phone(248,65,'Conferma?')+rect(250,227,75,12,'#617c78')+`<circle cx="285" cy="233" r="17" fill="none" stroke="#476665" stroke-width="5"/>`;
 }else if(lesson.theme==='film'){
 base=rect(0,0,600,320,'#b5bdb2',0)+rect(0,241,600,79,'#737f78',0);
 content=person(135,133,'#ad735a','#3c302b',true)+B(475,133);
 if(a==='cinema')content+=rect(213,45,180,149,'#eee3c8')+txt(240,78,'CINEMA',25)+rect(232,97,142,72,'#6b797b')+txt(248,139,'ULTIMA SCENA',12,'#fff');
 if(a==='poster')content+=rect(218,45,170,164,'#dfceaf')+`<path d="M235 186L300 69L367 186Z" fill="#718b87"/>`+txt(250,202,'DUE LETTURE',12);
 if(a==='cafe')content+=table+rect(254,188,26,20,'#eee8d7')+rect(322,188,26,20,'#eee8d7');
 if(a==='walk')content+=`<path d="M225 320L280 140H325L390 320" fill="#d1c6af"/>`+rect(280,45,11,95,'#6a7772')+`<circle cx="286" cy="41" r="19" fill="#e5d29e"/>`;
 }else if(lesson.theme==='train'){
 content=A(130,130)+B(480,130);
 if(a==='board')content+=rect(190,35,235,135,'#354b4e')+txt(206,65,'BOLOGNA · 16:45',18,'#eff0d9')+txt(206,101,'RITARDO +18',20,'#e7bd79')+txt(206,140,'Coincidenza: 17:10',14,'#fff');
 if(a==='help')content+=rect(215,104,182,135,'#7d9990')+txt(232,133,'ASSISTENZA',18)+person(305,115,'#627d8f');
 if(a==='tunnel')content+=rect(210,36,180,35,'#4c7172')+txt(238,61,'BINARIO 4 →',18,'#fff')+`<path d="M220 241V184H250V199H280V214H310V229H340V244" fill="none" stroke="#667b77" stroke-width="7"/>`;
 if(a==='train')content+=rect(188,66,237,139,'#dedfd5',12)+rect(207,86,95,49,'#5b7e85')+rect(323,83,77,116,'#90aaa8')+rect(188,161,128,12,'#a66855');
 }else if(lesson.theme==='courtyard'){
 content=person(115,130,'#b77858','#6a5a51',true)+B(488,130);
 if(a==='bike'||a==='clear')content+=door(250)+ (a==='bike'?`<g stroke="#456b6e" stroke-width="5" fill="none"><circle cx="250" cy="245" r="31"/><circle cx="365" cy="245" r="31"/><path d="M250 245L285 192L330 245H250L311 183L365 245M300 183H322"/></g>`:txt(250,284,'PASSAGGIO LIBERO',13));
 if(a==='boxes')content+=door(250)+rect(220,199,80,56,'#bc976b')+rect(302,168,80,87,'#d0b284')+rect(250,143,65,55,'#a48762');
 if(a==='meeting')content+=table+rect(249,54,121,116,'#eee8d7')+txt(263,81,'ASSEMBLEA',14)+txt(267,119,'Deposito',14)+txt(267,146,'Sabato?',14);
 }else if(lesson.theme==='parcel'){
 content=A(118,130)+B(475,130);
 if(a==='notification')content+=phone(250,55,'Consegnato')+`<path d="M200 220Q220 190 242 220M221 219V270Q236 285 242 268" stroke="#5c7373" stroke-width="5" fill="none"/>`;
 if(a==='photo')content+=door(205,'#618c71','16')+door(330,'#88705b','61');
 if(a==='message')content+=phone(248,60,'Verificare')+txt(240,242,'Foto allegata',15);
 if(a==='delivery')content=A(170,130,true)+person(405,130,'#8b9576','#635347',true)+rect(253,159,88,65,'#bf9a6c')+txt(268,197,'ANNA',14)+door(40);
 }
 return `<svg class="${card?'art':''}" viewBox="0 0 600 320" role="img" aria-label="${esc(caption)}"><title>${esc(caption)}</title>${base}${content}</svg>`;
};
})();