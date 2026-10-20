(function(){
'use strict';
const {LESSONS:lessons,STORIE_CATEGORIES:categories}=STORIE;
const $=s=>document.querySelector(s);
const app=$('#app'),dialog=$('#wordDialog');
const KEY='domshop.storie.v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s).normalize('NFC').toLocaleLowerCase('it').replace(/[’‘]/g,"'").trim().replace(/[.!?]+$/g,'').replace(/\s+/g,' ');
const fresh=()=>({version:1,settings:{reading:'Tutti',production:'A2',speed:.9,listenFirst:false},progress:{},words:[],mistakes:{},history:[]});
let state=fresh(),storageOK=true;
try{const x=JSON.parse(localStorage.getItem(KEY));if(x&&x.version===1)state={...fresh(),...x,settings:{...fresh().settings,...x.settings}};}catch(e){storageOK=false;}
const toast=s=>{$('#notice').textContent=s;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#notice').textContent='',5000)};
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));return true}catch(e){storageOK=false;toast('Salvataggio non disponibile. Esporta un backup prima di chiudere.');return false}}
const getP=l=>state.progress[l.id]||(state.progress[l.id]={phase:'scene',index:0,answers:[],visits:0,draft:'',production:[],done:false,follow:''});
let category='Tutte',current=null,sceneIndex=0,phase='scene',questionIndex=0,transcript=true,english=false,order=[],orderPool=[],wordContext=null,busy=false;
let utterances=[],lastSelection='';
function stopAudio(){if('speechSynthesis'in window)speechSynthesis.cancel();utterances=[]}
function route(id,part='scene',i=0){location.hash=`lesson/${encodeURIComponent(id)}/${part}/${i}`}
function go(view){location.hash=view}
function syncRoute(){
 stopAudio();lastSelection='';dialog.close();order=[];orderPool=[];english=false;transcript=!state.settings.listenFirst;
 const parts=location.hash.slice(1).split('/');
 if(parts[0]==='lesson'){
  const l=lessons.find(l=>l.id===decodeURIComponent(parts[1]||''));
  if(!l){go('home');return}
  current=l;const p=getP(l);phase=['scene','quiz','write','done'].includes(parts[2])?parts[2]:'scene';
  const n=Number(parts[3]);const i=Number.isInteger(n)&&n>=0?n:0;
  sceneIndex=Math.min(i,l.scenes.length-1);questionIndex=Math.min(i,l.quiz.length-1);
  p.phase=phase;p.index=phase==='quiz'?questionIndex:sceneIndex;save();
  renderLesson();
 }else{current=null;$('.dock')?.remove();({words:wordsView,progress:progressView,settings:settingsView}[parts[0]]||home)()}
 app.focus({preventScroll:true});window.scrollTo({top:0});
}
function start(id,resume=true){
 const l=lessons.find(x=>x.id===id),p=getP(l);
 p.visits++;p.lastAt=Date.now();state.history.push({id,at:Date.now()});state.history=state.history.slice(-100);save();
 if(resume&&!p.done)route(id,p.phase,p.index);else route(id,'scene',0);
}
function scores(l){const p=getP(l);return {answered:p.answers.filter(Boolean).length,correct:p.answers.filter(a=>a?.correct).length}}
function recommend(){
 const recent=state.history.slice(-5).map(x=>lessons.find(l=>l.id===x.id)?.categories[0]);
 const weak=Object.entries(state.mistakes).sort((a,b)=>b[1].count-a[1].count).slice(0,3).map(x=>x[0]);
 return lessons.map(l=>{const p=getP(l),sc=scores(l);let weight=(p.done?0:3)+(recent.includes(l.categories[0])?0:3)+weak.filter(t=>l.quiz.some(q=>q.tag===t)).length*2+(sc.answered&&sc.correct/sc.answered<.7?2:0);return {l,weight,last:p.lastAt||0}}).sort((a,b)=>b.weight-a.weight||a.last-b.last).map(x=>x.l);
}
function home(){
 const complete=Object.values(state.progress).filter(p=>p.done).length;
 const visible=lessons.filter(l=>(category==='Tutte'||l.categories.includes(category))&&(state.settings.reading==='Tutti'||l.level.includes(state.settings.reading)));
 const resume=lessons.find(l=>{const p=getP(l);return p.visits&&!p.done});
 app.innerHTML=`<div class="intro"><div><div class="eyebrow">Italiano, nella vita reale</div><h1>Leggi. Ascolta.<br>Trova le tue parole.</h1></div><div class="row"><button class="primary" data-a="surprise">Sorprendimi</button><button data-a="random">Lezione casuale</button></div></div><div class="stats"><div><strong>${complete}</strong><small>lezioni complete</small></div><div><strong>${state.words.length}</strong><small>parole salvate</small></div><div><strong>${Object.values(state.mistakes).reduce((n,m)=>n+m.count,0)}</strong><small>errori da rivedere</small></div></div>${resume?`<div class="box row"><span>Riprendi: <strong>${esc(resume.title)}</strong></span><button data-a="start" data-id="${resume.id}">Continua</button></div>`:''}<div class="filters" aria-label="Categorie">${['Tutte',...categories].map(c=>`<button class="${category===c?'active':''}" data-a="category" data-category="${esc(c)}" aria-pressed="${category===c}">${esc(c)}</button>`).join('')}</div><div class="grid">${visible.map(l=>{const p=getP(l),s=scores(l);return `<article class="card">${storieArt(l,0,true)}<div class="body"><span class="tag">${esc(l.categories[0])}${l.news?' · Notizia verificata':''}</span><h2>${esc(l.title)}</h2><p class="meta">${esc(l.place)} · ${esc(l.level)} · ${l.minutes} min</p><div class="meta">${p.done?'Completata':p.visits?'In corso':'Da scoprire'}${s.answered?` · Quiz ${s.correct}/${s.answered}`:''}</div><button data-a="start" data-id="${l.id}">${p.done?'Rileggi':p.visits?'Riprendi':'Apri lezione'}</button></div></article>`}).join('')}</div>${visible.length?'':`<div class="empty">Nessuna lezione con questi filtri. <button data-a="resetfilter">Mostra tutte</button></div>`}<p class="muted" style="margin-top:24px">Progressi su questo dispositivo · ${lessons.length} lezioni · Attualità aggiornata al 20 ottobre 2026</p>`;
}
function dock(previous,next,label,disabled=false){
 $('.dock')?.remove();const d=document.createElement('div');d.className='dock';d.innerHTML=`<button data-a="${previous||'none'}" ${!previous?'disabled':''}>Indietro</button><span class="position">${esc(label)}</span><button class="primary" data-a="${next}" ${disabled?'disabled':''}>${next==='complete'?'Completa':next==='write'?'Scrivi':'Avanti'}</button>`;document.body.append(d);
}
function meter(n,total){return `<div class="meter" role="progressbar" aria-label="Avanzamento" aria-valuenow="${n}" aria-valuemin="0" aria-valuemax="${total}"><span style="width:${100*n/total}%"></span></div>`}
function linkWords(text,words){
 const found=[];const lower=text.toLocaleLowerCase('it');
 for(const w of [...words].sort((a,b)=>b.term.length-a.term.length)){
  let at=lower.indexOf(w.term.toLocaleLowerCase('it'));
  while(at!==-1){const end=at+w.term.length;if(!found.some(r=>at<r.end&&end>r.start)&&!/[\p{L}\p{M}]/u.test(text[at-1]||'')&&!/[\p{L}\p{M}]/u.test(text[end]||''))found.push({start:at,end,w});at=lower.indexOf(w.term.toLocaleLowerCase('it'),at+1)}
 }
 let out='',cursor=0;for(const r of found.sort((a,b)=>a.start-b.start)){out+=esc(text.slice(cursor,r.start))+`<button class="word" data-a="word" data-term="${esc(r.w.term)}">${esc(text.slice(r.start,r.end))}</button>`;cursor=r.end}return out+esc(text.slice(cursor));
}
function renderLesson(){
 if(phase==='quiz')return quizView();if(phase==='write')return writeView();if(phase==='done')return doneView();
 const s=current.scenes[sceneIndex],lines=s.it.split('\n'),ens=s.en.split('\n');
 app.innerHTML=`<div class="row meta"><span>${esc(current.place)} · ${esc(current.level)}</span><button class="readline" data-a="restart">Ricomincia quiz</button></div>${meter(sceneIndex+1,current.scenes.length)}<div class="reader"><div class="scene-art">${storieArt(current,sceneIndex)}<p class="meta">${current.news?'Schema illustrativo, non fotografia.':'Illustrazione originale · personaggi di fantasia'}</p></div><div class="scene-copy"><div class="eyebrow">${esc(current.title)}</div><h1 style="font-size:29px">${esc(s.title)}</h1><div class="row"><button data-a="audio">Ascolta / riascolta</button><button data-a="stopaudio">Stop</button><label class="meta" style="margin:0">Velocità <select id="speed" aria-label="Velocità audio">${[.7,.9,1,1.15].map(n=>`<option value="${n}" ${state.settings.speed===n?'selected':''}>${n}×</option>`).join('')}</select></label></div><small>Voce sintetica italiana del dispositivo</small><div class="row" style="margin-top:12px"><button data-a="transcript" aria-expanded="${transcript}">${transcript?'Nascondi':'Mostra'} testo</button><button data-a="english" aria-expanded="${english}">${english?'Nascondi':'Mostra'} inglese</button></div><div class="dialogue" id="transcript" ${transcript?'':'hidden'}>${lines.map((line,i)=>`<p>${linkWords(line,s.words)} <button class="line-en" data-a="sentence" data-i="${i}" aria-label="Traduci frase ${i+1}">EN</button><span class="sent-en" id="sentence-${i}" hidden><br>${esc(ens[i]||s.en)}</span></p>`).join('')}</div><div class="en" id="english" ${english?'':'hidden'}>${esc(s.en)}</div><button data-a="phrase">Esamina frase selezionata</button><details><summary>Espressioni e contesto</summary><p>${esc(current.note)}</p><div class="tokens">${s.words.map(w=>`<button data-a="word" data-term="${esc(w.term)}">${esc(w.term)}</button>`).join('')}</div><small>Seleziona una frase nel testo, poi premi Esamina. Per frasi non annotate puoi inserire il significato manualmente.</small></details>${current.news?`<div class="box meta"><a href="${esc(current.source)}" target="_blank" rel="noopener">Fonte: ANSA</a> · Pubblicata ${esc(current.published)}<br>Verificata ${esc(current.updated)} · Raccolta datata.</div>`:''}</div></div>`;
 dock(sceneIndex?'prevscene':null,'nextscene',`${sceneIndex+1} / ${current.scenes.length}`);
}
function mistake(tag,example){if(['__proto__','constructor','prototype'].includes(tag))return;const m=state.mistakes[tag]||(state.mistakes[tag]={count:0,example:'',lastAt:0});m.count++;m.example=example;m.lastAt=Date.now()}
function quizView(){
 const p=getP(current),q=current.quiz[questionIndex],answer=p.answers[questionIndex],sc=scores(current);
 app.innerHTML=`<section class="quiz"><div class="eyebrow">Comprensione · ${questionIndex+1} / ${current.quiz.length}</div>${meter(questionIndex+1,current.quiz.length)}<p class="meta">Punteggio: ${sc.correct}/${sc.answered}</p><h1>${esc(q.prompt)}</h1><button data-a="quizaudio">Riascolta scena ${questionIndex===0?1:Math.min(questionIndex+1,4)}</button><small> Voce sintetica</small><div id="quizcontrols">${q.type==='choice'?`<div class="choices">${q.options.map((x,i)=>`<button data-a="answer" data-answer="${i}" class="${answer?.value===i?'selected':''}" ${answer?'disabled':''}>${esc(x)}</button>`).join('')}</div>`:q.type==='fill'?`<form id="quizform"><label>La tua risposta<input id="fill" required maxlength="100" autocomplete="off" ${answer?'disabled':''} value="${esc(answer?.value||'')}"></label><button class="primary" ${answer?'disabled':''}>Controlla</button></form>`:`<div class="answer-line" id="ordered">${esc(answer?.value||'')}</div><div class="tokens" id="pool"></div>${!answer?'<button data-a="checkorder" class="primary">Controlla</button> <button data-a="resetorder">Ricomincia</button>':''}`}</div>${answer?`<div class="feedback ${answer.correct?'':'bad'}" role="status"><strong>${answer.correct?'Corretto':'Da rivedere'}</strong><p>${esc(q.why)}</p>${!answer.correct?`<p>Risposta: <strong>${esc(q.type==='choice'?q.options[q.answer]:q.type==='order'?q.answer.join(' '):q.answer[0])}</strong></p><small>[${esc(q.tag)}]</small>`:''}</div>`:''}</section>`;
 if(q.type==='order'&&!answer){order=[];orderPool=q.answer.map((text,id)=>({text,id})).sort(()=>Math.random()-.5);if(orderPool.every((x,i)=>x.id===i))orderPool.reverse();renderOrder()}
 dock(questionIndex?'prevquiz':'backread',questionIndex===current.quiz.length-1?'write':'nextquiz',`${questionIndex+1} / ${current.quiz.length}`,!answer);
}
function renderOrder(){$('#ordered').textContent=order.map(x=>x.text).join(' ');$('#pool').innerHTML=orderPool.filter(x=>!order.some(o=>o.id===x.id)).map(x=>`<button data-a="token" data-token="${x.id}">${esc(x.text)}</button>`).join('')}
function answerQuiz(value){
 const p=getP(current),q=current.quiz[questionIndex];if(p.answers[questionIndex])return;
 const correct=q.type==='choice'?value===q.answer:q.type==='fill'?q.answer.some(a=>norm(a)===norm(value)):norm(value)===norm(q.answer.join(' '));
 p.answers[questionIndex]={value,correct,at:Date.now()};if(!correct)mistake(q.tag,q.why);save();quizView();
}
function audio(text){
 if(!('speechSynthesis'in window)){toast('Sintesi vocale non disponibile in questo browser.');return}
 stopAudio();const voices=speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith('it'));
 const lines=text.split('\n');
 lines.forEach((line,i)=>{const u=new SpeechSynthesisUtterance(line.replace(/^[^:]{1,25}:\s*/,''));u.lang='it-IT';u.rate=state.settings.speed;u.voice=voices.length?voices[i%Math.min(voices.length,2)]:null;u.onerror=e=>{if(e.error!=='canceled'&&e.error!=='interrupted')toast('Audio non disponibile. Usa il testo o installa una voce italiana.')};utterances.push(u);speechSynthesis.speak(u)});
 if(!voices.length)toast('Nessuna voce italiana rilevata; il sistema proverà it-IT. Potrebbe servire internet.');
}
function openWord(word,sentence,known=true,entry=null){
 wordContext={...word,sentence,lessonId:entry?.lessonId||current?.id||'',lessonTitle:entry?.lessonTitle||current?.title||'',sentenceTranslation:entry?.sentenceTranslation||current?.scenes[sceneIndex]?.en||'',sourceUrl:entry?.sourceUrl||location.href,known};
 dialog.innerHTML=`<button class="close" data-a="closeword" aria-label="Chiudi">Chiudi</button><h2 id="wordTitle">${esc(word.term)}</h2><p>${esc(word.grammar||'Frase selezionata · annotazione manuale')}</p><label>Significato nel contesto<input id="meaning" maxlength="6000" value="${esc(word.meaning||'')}"></label><p>${esc(word.note||'Nessuna definizione automatica disponibile. Inserisci il significato prima di salvare.')}</p><p class="muted">Contesto</p><p>${esc(sentence)}</p><button class="primary" data-a="saveword">Salva espressione</button>`;
 dialog.showModal();
}
function inspectSelection(){
 const selected=String(window.getSelection()).trim()||lastSelection;
 if(!selected||selected.length>100){toast('Seleziona da 1 a 100 caratteri nel testo italiano.');return}
 const s=current.scenes[sceneIndex];
 if(!s.it.includes(selected)){toast('Seleziona una frase nel testo italiano della scena.');return}
 const known=s.words.find(w=>norm(w.term)===norm(selected));
 openWord(known||{term:selected,meaning:'',grammar:'',note:''},s.it,!!known);
}
function saveWord(){
 const meaning=$('#meaning').value.trim();if(!meaning){toast('Inserisci prima il significato.');return}
 const c=wordContext;
 if(state.words.some(w=>norm(w.term)===norm(c.term)&&w.sentence===c.sentence)){toast('Già salvata in questo contesto.');return}
 state.words.push({...c,meaning,id:crypto.randomUUID(),dateAdded:new Date().toISOString(),review:{count:0,due:0}});save();dialog.close();toast('Espressione salvata.');
}
const rules=[
 {re:/\b(?:a|in)\s+Italia\b/gi,fix:'in Italia',only:/\ba\s+Italia\b/i,tag:'preposizioni',why:'Con il nome del paese: in Italia.'},
 {re:/\bho\s+andato\b/gi,fix:'sono andato',tag:'essere e avere',why:'Andare usa essere nel passato prossimo; concorda il participio: andato/andata.'},
 {re:/\bho\s+bev(?:iato|ato)\b/gi,fix:'ho bevuto',tag:'passato prossimo',why:'Il participio passato di bere è bevuto.'},
 {re:/\balle\s+bar\b/gi,fix:'al bar',tag:'preposizioni',why:'Al bar: a + il. Alle è femminile plurale.'},
 {re:/\bmi\s+sveglio\s+a\s+le\b/gi,fix:'mi sveglio alle',tag:'preposizioni',why:'A + le si contrae in alle.'}
];
function localCorrections(text){
 const out=[];let corrected=text;
 for(const r of rules){r.re.lastIndex=0;if((!r.only||r.only.test(text))&&r.re.test(text)){r.re.lastIndex=0;corrected=corrected.replace(r.re,r.fix);out.push({tag:r.tag,why:r.why})}}
 return {corrected,out};
}
function writeView(){
 const p=getP(current),prod=p.production.at(-1),target=state.settings.production==='A2'?'2–3 frasi':state.settings.production==='B1'?'4–5 frasi con motivazioni':'6–8 frasi con dettagli e sfumature';
 app.innerHTML=`<section class="quiz"><div class="eyebrow">Ora tocca a te · produzione ${esc(state.settings.production)}</div><h1>Rispondi con parole tue.</h1><p>${esc(current.task)}</p><p class="muted">Obiettivo: ${target}. ${endpoint()?'Correzione tramite server configurato.':'Modalità locale: controllo limitato + confronto con un modello. Nessuna valutazione completa del testo.'}</p><details><summary>Un indizio</summary><p>${esc(current.hint)}</p></details><form id="writeform"><label for="draft">La tua risposta</label><textarea id="draft" required maxlength="2000" lang="it" spellcheck="true">${esc(p.draft)}</textarea><p class="meta" id="draftstatus">Bozza salvata su questo dispositivo.</p><button class="primary" type="submit" ${busy?'disabled':''}>${busy?'Attendi…':endpoint()?'Invia e correggi':'Salva e confronta'}</button></form><div id="productionresult">${prod?productionHTML(prod):''}</div>${prod?`<div class="box"><p><strong>Ripasso:</strong> ${esc(prod.refresh||'Rileggi il modello e confronta le strutture con la tua risposta.')}</p><form id="followform"><label for="followdraft">${esc(prod.followup||current.follow)}</label><textarea id="followdraft" required maxlength="1000">${esc(p.follow||'')}</textarea><button type="submit">Salva risposta breve</button></form>${p.followSaved?'<p class="good">Risposta breve salvata, non valutata.</p>':''}</div>`:''}</section>`;
 const answered=scores(current).answered;dock('backquiz','complete','Produzione',!prod||answered!==current.quiz.length);
}
function productionHTML(prod){
 if(prod.ai){
 return `<div class="box"><p class="meta">Correzione dal servizio configurato</p>${prod.corrections.map((c,i)=>`<div class="correction">${i+1}. ${esc(current.task)}\n${esc(c.original)} ${c.status==='correct'?'✅':'❌'}<strong>${esc(c.corrected)}</strong>${esc(c.explanation||'')}\n${esc((c.tags||[]).map(t=>'['+t+']').join(' '))}${c.status==='naturalness'?'\nForma corretta ma poco naturale.':''}</div>`).join('')}${!prod.corrections.length?'<p>Nessuna correzione restituita dal server; il testo non viene certificato come corretto.</p>':''}</div>`;
 }
 if(prod.corrections.length)return `<div class="box"><div class="correction">1. ${esc(current.task)}\n${esc(prod.original)} ❌<strong>${esc(prod.corrected)}</strong>${esc(prod.corrections.map(c=>c.why).join(' '))}\n${esc(prod.corrections.map(c=>'['+c.tag+']').join(' '))}</div><p class="muted">Solo gli errori indicati sono stati controllati. Il resto della risposta non è valutato.</p><details><summary>Una possibile risposta</summary><p>${esc(current.model)}</p></details></div>`;
 return `<div class="box"><p>Risposta salvata. Nessuno degli errori coperti dai controlli locali è stato rilevato; il testo resta non valutato.</p><p>${esc(prod.original)}</p><p class="meta">Una possibile risposta, con contenuto diverso dal tuo:</p><strong>${esc(current.model)}</strong></div>`;
}
function endpoint(){
 try{const s=globalThis.STORIE_CONFIG?.aiEndpoint;if(!s)return null;const u=new URL(s,location.href);return u.origin===location.origin&&u.protocol==='https:'?u.href:null}catch{return null}
}
async function submitWriting(){
 const lesson=current;
 const text=$('#draft').value.trim();if(!text)return;
 const p=getP(lesson);p.draft=text;save();busy=true;writeView();
 try{
 let prod;const url=endpoint();
 if(url){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),25000);
  let response;try{response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({lessonId:lesson.id,task:lesson.task,text,level:state.settings.production,context:lesson.scenes.map(s=>s.it),mistakes:Object.keys(state.mistakes).slice(0,10)}),signal:ctrl.signal})}finally{clearTimeout(timer)}
  if(!response.ok)throw Error('Il server non ha completato la correzione.');
  const data=await response.json();
  if(!Array.isArray(data.corrections)||data.corrections.length>8||typeof data.followup!=='string')throw Error('Risposta del server non valida.');
  for(const c of data.corrections){if(!c||typeof c.original!=='string'||typeof c.corrected!=='string'||typeof c.explanation!=='string'||!['correct','grammar','naturalness'].includes(c.status)||!Array.isArray(c.tags)||!c.tags.every(t=>typeof t==='string'))throw Error('Formato della correzione non valido.')}
  prod={ai:true,original:text,corrections:data.corrections.slice(0,3),followup:data.followup.slice(0,1000),refresh:String(data.refresh||'Rivedi le correzioni prima di continuare.').slice(0,1000),at:Date.now()};
  for(const c of prod.corrections)if(c.status==='grammar')for(const t of c.tags.slice(0,3))mistake(t,c.explanation);
 }else{
  const r=localCorrections(text);prod={ai:false,original:text,corrected:r.corrected,corrections:r.out,refresh:r.out.map(c=>c.why).join(' '),followup:lesson.follow,at:Date.now()};
  for(const c of r.out)mistake(c.tag,c.why);
 }
 p.production.push(prod);p.production=p.production.slice(-10);save();
 }catch(e){toast((e.name==='AbortError'?'Il server non risponde.':e.message)+' La bozza è conservata.')}finally{busy=false;if(phase==='write'&&current?.id===lesson.id)writeView()}
}
function doneView(){
 const p=getP(current),sc=scores(current);
 app.innerHTML=`<section class="quiz"><div class="eyebrow">Lezione completata</div><h1>${esc(current.title)}</h1><p class="end">${sc.correct} / ${current.quiz.length}</p><p>Quiz corretto automaticamente · Produzione ${p.production.at(-1)?.ai?'inviata al server':'salvata, con revisione locale limitata'}.</p><div class="box"><h2>Da riutilizzare</h2><div class="tokens">${current.scenes.flatMap(s=>s.words).slice(0,5).map(w=>`<button data-a="word" data-term="${esc(w.term)}">${esc(w.term)}</button>`).join('')}</div></div><div class="row"><button class="primary" data-a="surprise">Prossima lezione</button><button data-a="restart">Ripeti quiz</button><button data-view="home">Tutte le lezioni</button></div></section>`;$('.dock')?.remove();
}
function wordsView(){
 app.innerHTML=`<div class="intro"><div><div class="eyebrow">Il tuo lessico</div><h1>Parole da riusare.</h1></div><div class="row"><button data-a="exportparola">Esporta per Parola</button><button data-a="exportbackup">Backup completo</button></div></div><label>Cerca<input id="wordsearch" type="search" placeholder="Parola, significato o contesto"></label><div id="wordlist"></div>`;
 listWords('');
}
function listWords(query){
 const words=state.words.filter(w=>norm(w.term+' '+w.meaning+' '+w.sentence).includes(norm(query)));
 $('#wordlist').innerHTML=words.map(w=>`<article class="vocab-entry"><div class="row"><h3>${esc(w.term)}</h3><span class="meta">${esc(w.lessonTitle||'Importata')}</span></div><p>${esc(w.sentence)}</p><details><summary>Rivela significato</summary><p>${esc(w.meaning)}</p><small>${esc(w.grammar)} · ${esc(w.note)}</small></details><div class="row"><small>${(w.review?.due||0)<=Date.now()?'Da ripassare':'Ripasso programmato'}</small><button data-a="reviewword" data-id="${esc(w.id)}" data-rating="again">Da rivedere</button><button data-a="reviewword" data-id="${esc(w.id)}" data-rating="good">Ricordata</button><button data-a="deleteword" data-id="${esc(w.id)}">Elimina</button></div></article>`).join('')||'<div class="empty">Nessuna parola. Salva un’espressione durante la lettura o importa un backup nelle impostazioni.</div>';
}
function progressView(){
 const p=Object.values(state.progress),answered=p.flatMap(x=>x.answers||[]).filter(Boolean),weak=Object.entries(state.mistakes).sort((a,b)=>b[1].count-a[1].count);
 app.innerHTML=`<div class="eyebrow">Dati di questo dispositivo</div><h1>I tuoi progressi.</h1><div class="stats"><div><strong>${p.filter(x=>x.done).length}/${lessons.length}</strong><small>lezioni</small></div><div><strong>${answered.filter(x=>x.correct).length}/${answered.length}</strong><small>risposte corrette</small></div><div><strong>${p.reduce((n,x)=>n+(x.production?.length||0),0)}</strong><small>testi salvati</small></div></div><div class="split"><div><h2>Da rivedere</h2>${weak.map(([tag,m])=>`<div class="box"><strong>[${esc(tag)}] · ${m.count}</strong><p>${esc(m.example)}</p><button data-a="clearweak" data-tag="${esc(tag)}">Segna come ripassato</button></div>`).join('')||'<p class="muted">Nessun errore registrato.</p>'}</div><div><h2>Consigliate dai tuoi risultati</h2>${recommend().slice(0,3).map(l=>`<div class="box"><h3>${esc(l.title)}</h3><p class="meta">Categoria meno recente, lezione incompleta o strutture da ripassare.</p><button data-a="start" data-id="${l.id}">Apri</button></div>`).join('')}<details><summary>Come sono usati i risultati</summary><p class="muted">I quiz registrano gli errori e favoriscono lezioni con strutture simili. Le categorie recenti pesano meno. La difficoltà si seleziona separatamente per lettura e produzione; i testi non vengono riscritti automaticamente. I testi locali non valutati non aumentano un livello stimato.</p></details></div></div>`;
}
function settingsView(){
 app.innerHTML=`<div class="eyebrow">Impostazioni</div><h1>Il supporto che ti serve.</h1><div class="split"><div class="box"><h2>Livelli separati</h2><label>Lettura<select data-setting="reading">${['Tutti','A2','B1','B2'].map(x=>`<option ${state.settings.reading===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Produzione<select data-setting="production">${['A2','B1','B2'].map(x=>`<option ${state.settings.production===x?'selected':''}>${x}</option>`).join('')}</select></label><label><input type="checkbox" data-setting="listenFirst" ${state.settings.listenFirst?'checked':''}> Nascondi il testo prima dell’ascolto</label><p class="muted">Lettura filtra le lezioni disponibili. Produzione cambia la lunghezza richiesta e il livello inviato al server.</p></div><div class="box"><h2>Salvataggio e trasferimento</h2><p>Solo su questo browser e dispositivo. Nessuna sincronizzazione automatica tra computer e iPhone.</p><p class="muted">${storageOK?'Salvataggio locale attivo.':'Salvataggio locale non disponibile: esporta i dati.'} iOS può cancellare i dati del sito. Conserva un backup.</p><button data-a="exportbackup">Esporta backup completo</button><button data-a="exportparola">Esporta parole per Parola</button><label class="file">Importa backup Storie o Italian Hover / Parola v1<input id="import" type="file" accept=".json,application/json"></label><small>Importazione: unisce le parole; mantiene il tentativo di lezione più recente. Il formato Parola conserva parole e contesto, non trasferisce i quiz di Storie.</small></div><div class="box"><h2>Conversazione e correzione</h2><p>${endpoint()?'Server configurato: risposte e contesto della lezione saranno inviati al servizio quando premi Invia e correggi.':'Modalità locale: risposte libere salvate, pochi controlli mirati e modelli di confronto. Nessun dialogo AI libero.'}</p><p class="muted">Il sito statico non ha un backend. Per attivare le risposte dinamiche serve un endpoint HTTPS sullo stesso dominio, configurato in config.js. Le chiavi restano sul server. Dettagli nel README dell’app.</p></div><div class="box"><h2>Offline e iPhone</h2><p>Apri l’app online una volta. Le lezioni incluse funzionano offline dopo il caricamento della cache. L’audio dipende dalle voci italiane del dispositivo e può richiedere internet.</p><p class="muted">Safari → Condividi → Aggiungi alla schermata Home. Nessun microfono richiesto. Notizie: raccolta verificata al 20 ottobre 2026, senza feed automatico.</p></div></div>`;
}
function download(name,obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
async function hash(word,sentence){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([word.normalize('NFC'),sentence.normalize('NFC')])));return 'v_'+[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function exportParola(){
 const events=[];for(const w of state.words){const recordId=await hash(w.term,w.sentence);events.push({id:w.exportId||('storie_'+w.id),recordId,kind:'put',device:'domshop-storie',at:w.dateAdded,parents:[],value:{word:w.term,translation:w.meaning,sentence:w.sentence,sentenceTranslation:w.sentenceTranslation||'',sourceUrl:w.sourceUrl||'',sourceTitle:w.lessonTitle||'',dateAdded:w.dateAdded,occurrence:-1,truncated:false}})}
 download('storie-parola.json',{format:'italian-hover',version:1,events});
}
const str=(x,max=6000)=>typeof x==='string'&&x.length<=max;
function validateWord(w){
 if(!w||!str(w.id,100)||!w.id||!str(w.term,100)||!w.term.trim()||!str(w.meaning)||!str(w.sentence,700)||!w.sentence.trim()||!str(w.dateAdded,40)||!Number.isFinite(Date.parse(w.dateAdded)))throw Error('Parola non valida nel backup.');
 for(const key of ['grammar','note','lessonId','lessonTitle','sentenceTranslation','sourceUrl'])if(w[key]!==undefined&&!str(w[key]))throw Error('Contesto non valido.');
 return {id:w.id,term:w.term,meaning:w.meaning,sentence:w.sentence,dateAdded:w.dateAdded,grammar:w.grammar||'',note:w.note||'',lessonId:w.lessonId||'',lessonTitle:w.lessonTitle||'',sentenceTranslation:w.sentenceTranslation||'',sourceUrl:w.sourceUrl||'',review:{count:Math.max(0,Number(w.review?.count)||0),due:Math.max(0,Number(w.review?.due)||0)}};
}
async function importData(file){
 if(!file)return;if(file.size>10000000)throw Error('Backup troppo grande: massimo 10 MB.');
 const x=JSON.parse(await file.text());let words=[],progress={},mistakes={},importSettings=null,importHistory=[];
 if(x.format==='domshop-storie'&&x.version===1&&x.state?.version===1){
  const s=x.state;if(!Array.isArray(s.words)||s.words.length>10000||!s.progress||typeof s.progress!=='object')throw Error('Backup Storie non valido.');
  words=s.words.map(validateWord);
  if(s.settings&&['Tutti','A2','B1','B2'].includes(s.settings.reading)&&['A2','B1','B2'].includes(s.settings.production)&&[.7,.9,1,1.15].includes(s.settings.speed)&&typeof s.settings.listenFirst==='boolean')importSettings={reading:s.settings.reading,production:s.settings.production,speed:s.settings.speed,listenFirst:s.settings.listenFirst};
  if(Array.isArray(s.history))importHistory=s.history.filter(h=>h&&lessons.some(l=>l.id===h.id)&&Number.isFinite(h.at)).slice(-100);
  for(const l of lessons){const p=s.progress[l.id];if(!p)continue;
   if(!Array.isArray(p.answers)||p.answers.length>l.quiz.length||!Array.isArray(p.production)||p.production.length>10||!str(p.draft||'',2000))throw Error('Progressi non validi.');
   for(const a of p.answers)if(a&&(typeof a.correct!=='boolean'||!(typeof a.value==='number'||str(a.value,500))))throw Error('Quiz non valido.');
   for(const r of p.production){if(!str(r.original,2000)||!Array.isArray(r.corrections)||r.corrections.length>8)throw Error('Produzione non valida.');
    if(r.ai)for(const c of r.corrections){if(!str(c.original,2000)||!str(c.corrected,4000)||!str(c.explanation)||!Array.isArray(c.tags)||!c.tags.every(t=>str(t,100)))throw Error('Correzioni non valide.')}
    else if(!str(r.corrected,3000)||!r.corrections.every(c=>str(c.tag,100)&&str(c.why)))throw Error('Controlli non validi.');
   }
   progress[l.id]={...p,draft:p.draft||'',follow:str(p.follow,1000)?p.follow:'',lastAt:Number(p.lastAt)||0,visits:Math.max(0,Number(p.visits)||0)};
  }
  for(const [tag,m]of Object.entries(s.mistakes||{})){if(['__proto__','constructor','prototype'].includes(tag)||!str(tag,100)||!Number.isInteger(m.count)||m.count<0||!str(m.example))throw Error('Errori non validi.');mistakes[tag]={count:m.count,example:m.example,lastAt:Number(m.lastAt)||0}}
 }else if(x.format==='italian-hover'&&x.version===1&&Array.isArray(x.events)&&x.events.length<=25000){
  const groups=new Map();
  for(const e of x.events){if(!e||!['put','delete','review'].includes(e.kind)||!str(e.id,100)||!str(e.recordId,100)||!str(e.at,40)||!Number.isFinite(Date.parse(e.at))||!Array.isArray(e.parents)||!e.parents.every(p=>str(p,100)))throw Error('Evento Parola non valido.');if(!groups.has(e.recordId))groups.set(e.recordId,[]);groups.get(e.recordId).push(e)}
  for(const [id,events]of groups){const changes=events.filter(e=>e.kind!=='review'),refs=new Set(changes.flatMap(e=>e.parents)),heads=changes.filter(e=>!refs.has(e.id)).sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));
   if(heads.some(e=>e.kind==='delete'))continue;const puts=heads.filter(e=>e.kind==='put');if(!puts.length)continue;
   if(new Set(puts.map(e=>JSON.stringify(e.value))).size>1)throw Error('Backup Parola con conflitti: risolvili in Parola prima di importare.');
   const v=puts.at(-1).value;if(!v)throw Error('Valore Parola mancante.');
   words.push(validateWord({id,term:v.word,meaning:v.translation||'',sentence:v.sentence,dateAdded:v.dateAdded,lessonTitle:v.sourceTitle||'Parola',sourceUrl:v.sourceUrl||'',sentenceTranslation:v.sentenceTranslation||''}));
  }
 }else throw Error('Formato non supportato. Usa un backup Storie o Italian Hover / Parola v1.');
 let added=0;for(const w of words)if(!state.words.some(e=>norm(e.term)===norm(w.term)&&e.sentence===w.sentence)){state.words.push(w);added++}
 for(const [id,p]of Object.entries(progress))if(!state.progress[id]||(p.lastAt||0)>(state.progress[id].lastAt||0))state.progress[id]=p;
 for(const [tag,m]of Object.entries(mistakes))if(!state.mistakes[tag]||m.lastAt>state.mistakes[tag].lastAt)state.mistakes[tag]=m;
 if(importSettings)state.settings=importSettings;
 state.history=[...state.history,...importHistory].filter((h,i,a)=>a.findIndex(o=>o.id===h.id&&o.at===h.at)===i).sort((a,b)=>a.at-b.at).slice(-100);
 save();toast(`Importate ${added} parole. Progressi uniti.`);settingsView();
}
document.addEventListener('click',async e=>{
 const el=e.target.closest('[data-a],[data-view]');if(!el||el.disabled)return;
 const a=el.dataset.a;if(el.dataset.view){go(el.dataset.view);return}
 try{
 if(a==='start')start(el.dataset.id);
 if(a==='category'){category=el.dataset.category;home()}
 if(a==='resetfilter'){category='Tutte';state.settings.reading='Tutti';save();home()}
 if(a==='surprise')start(recommend()[0].id,false);
 if(a==='random')start(lessons[Math.floor(Math.random()*lessons.length)].id,false);
 if(a==='prevscene')route(current.id,'scene',sceneIndex-1);
 if(a==='nextscene')route(current.id,sceneIndex===current.scenes.length-1?'quiz':'scene',sceneIndex===current.scenes.length-1?0:sceneIndex+1);
 if(a==='prevquiz')route(current.id,'quiz',questionIndex-1);
 if(a==='nextquiz')route(current.id,'quiz',questionIndex+1);
 if(a==='backread')route(current.id,'scene',current.scenes.length-1);
 if(a==='backquiz')route(current.id,'quiz',current.quiz.length-1);
 if(a==='write')route(current.id,'write',0);
 if(a==='restart'){getP(current).answers=[];getP(current).done=false;save();route(current.id,'quiz',0);if(phase==='quiz'&&questionIndex===0)quizView()}
 if(a==='complete'){const p=getP(current);if(p.production.length&&scores(current).answered===current.quiz.length){p.done=true;p.lastAt=Date.now();save();route(current.id,'done',0)}}
 if(a==='answer')answerQuiz(Number(el.dataset.answer));
 if(a==='token'){const token=orderPool.find(t=>t.id===Number(el.dataset.token));if(token&&!order.some(t=>t.id===token.id)){order.push(token);renderOrder()}}
 if(a==='resetorder'){order=[];renderOrder()}
 if(a==='checkorder'){if(order.length!==orderPool.length){toast('Usa tutte le parole.');return}answerQuiz(order.map(t=>t.text).join(' '))}
 if(a==='audio')audio(current.scenes[sceneIndex].it);
 if(a==='quizaudio')audio(current.scenes[questionIndex===0?0:Math.min(questionIndex,3)].it);
 if(a==='stopaudio')stopAudio();
 if(a==='transcript'){transcript=!transcript;$('#transcript').hidden=!transcript;el.textContent=transcript?'Nascondi testo':'Mostra testo';el.setAttribute('aria-expanded',String(transcript))}
 if(a==='english'){english=!english;$('#english').hidden=!english;el.textContent=english?'Nascondi inglese':'Mostra inglese';el.setAttribute('aria-expanded',String(english))}
 if(a==='sentence'){const span=$('#sentence-'+el.dataset.i);span.hidden=!span.hidden}
 if(a==='word'){const scene=current.scenes.find(s=>s.words.some(w=>w.term===el.dataset.term));const w=scene?.words.find(w=>w.term===el.dataset.term);if(w)openWord(w,scene.it)}
 if(a==='phrase')inspectSelection();
 if(a==='closeword')dialog.close();
 if(a==='saveword')saveWord();
 if(a==='reviewword'){const w=state.words.find(w=>w.id===el.dataset.id);w.review={count:(w.review?.count||0)+1,due:Date.now()+(el.dataset.rating==='again'?600000:Math.min(30,(w.review?.count||0)*2+1)*86400000)};save();listWords($('#wordsearch').value)}
 if(a==='deleteword'){state.words=state.words.filter(w=>w.id!==el.dataset.id);save();listWords($('#wordsearch').value)}
 if(a==='clearweak'){delete state.mistakes[el.dataset.tag];save();progressView()}
 if(a==='exportbackup')download('storie-backup.json',{format:'domshop-storie',version:1,state,exportedAt:new Date().toISOString()});
 if(a==='exportparola')await exportParola();
 }catch(err){toast(err.message||'Operazione non riuscita.')}
});
document.addEventListener('submit',e=>{
 if(!['quizform','writeform','followform'].includes(e.target.id))return;e.preventDefault();
 if(e.target.id==='quizform')answerQuiz($('#fill').value.trim());
 if(e.target.id==='writeform'&&!busy)submitWriting();
 if(e.target.id==='followform'){const p=getP(current);p.follow=$('#followdraft').value.trim();p.followSaved=true;save();writeView();toast('Risposta breve salvata.')}
});
document.addEventListener('input',e=>{
 if(e.target.id==='wordsearch')listWords(e.target.value);
 if(e.target.id==='draft'&&current){getP(current).draft=e.target.value;getP(current).lastAt=Date.now();const ok=save();$('#draftstatus').textContent=ok?'Bozza salvata su questo dispositivo.':'Bozza in memoria: esporta prima di chiudere.'}
 if(e.target.id==='followdraft'&&current){getP(current).follow=e.target.value;save()}
});
document.addEventListener('change',e=>{
 if(e.target.id==='speed'){state.settings.speed=Number(e.target.value);save()}
 if(e.target.dataset.setting){state.settings[e.target.dataset.setting]=e.target.type==='checkbox'?e.target.checked:e.target.value;save()}
 if(e.target.id==='import')importData(e.target.files[0]).catch(err=>toast(err.message||'Importazione non riuscita.'));
});
document.addEventListener('keydown',e=>{
 if(e.key!==' '&&e.key!=='Enter')return;
 if(e.target.closest('input,textarea,select,button,a,summary,[contenteditable="true"]')||dialog.open)return;
 const next=$('.dock .primary');if(next&&!next.disabled){e.preventDefault();next.click()}
});
document.addEventListener('selectionchange',()=>{const text=String(window.getSelection()).trim();if(current&&phase==='scene'&&text&&text.length<=100&&current.scenes[sceneIndex].it.includes(text))lastSelection=text});
document.addEventListener('focusin',e=>{if(e.target.matches('textarea,input[type="text"]'))setTimeout(()=>e.target.scrollIntoView({block:'center',behavior:'smooth'}),250)});
window.addEventListener('hashchange',syncRoute);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAudio()});
window.addEventListener('pagehide',stopAudio);
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>toast('Cache offline non disponibile. Le lezioni online restano utilizzabili.'));
syncRoute();
})();