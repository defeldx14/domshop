(async function(){
'use strict';
const $=id=>document.getElementById(id),C=ItalianCore,E=ReaderEPUB,SC=DomshopSyncCore,guest=ItalianStore;
let store=guest,doc=C.empty(),driveSync,profile='guest',book=null,chapter=0,library=[],imageURLs=[],lookupEpoch=0,active=null,positionTimer,syncTimer,restoring=false;
let readerState=SC.empty('domshop-reader-v1');
const prefs=JSON.parse(localStorage.getItem('domshop.reader.prefs')||'null')||{theme:'dark',size:21,leading:1.85,font:'serif'};
const wordRE=/[\p{L}\p{M}]+(?:[’'\-][\p{L}\p{M}]+)*/gu;
function node(tag,text,parent,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;if(parent)parent.append(n);return n;}
function button(label,parent,fn,cls){const b=node('button',label,parent,cls);b.type='button';b.onclick=()=>Promise.resolve().then(fn).catch(error);return b;}
function error(e){notify(e.message||String(e));}
let noticeTimer;function notify(text){$('notice').textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').textContent='',5500);}
function showPanel(title){$('panelTitle').textContent=title;$('panelBody').replaceChildren();if(!$('panel').open)$('panel').showModal();return $('panelBody');}
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
for(const dialog of [$('panel'),$('lookup')])dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
$('lookup').addEventListener('close',()=>{lookupEpoch++;active=null;});
function applyPrefs(){document.body.dataset.theme=['dark','paper','sepia'].includes(prefs.theme)?prefs.theme:'dark';document.documentElement.style.setProperty('--size',Math.min(32,Math.max(16,Number(prefs.size)||21))+'px');document.documentElement.style.setProperty('--leading',Math.min(2.4,Math.max(1.4,Number(prefs.leading)||1.85)));document.documentElement.style.setProperty('--font',prefs.font==='sans'?'system-ui,-apple-system,sans-serif':"Georgia,'Times New Roman',serif");document.querySelector('meta[name=theme-color]').content=getComputedStyle(document.body).getPropertyValue('--bg').trim();}
applyPrefs();
const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('domshop-epub-library',1);r.onupgradeneeded=()=>r.result.createObjectStore('books',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
function booksDB(mode,fn){return new Promise((resolve,reject)=>{const tx=db.transaction('books',mode),r=fn(tx.objectStore('books'));let result;r.onsuccess=()=>{result=r.result;};tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(tx.error||Error('Book storage failed.'));});}
function stateKey(){return 'domshop.reader.state.'+profile;}
function loadState(){try{readerState=SC.valid(JSON.parse(localStorage.getItem(stateKey())||'null')||SC.empty('domshop-reader-v1'),'domshop-reader-v1');}catch{readerState=SC.empty('domshop-reader-v1');notify('Reading history could not be loaded.');}}
function values(){return SC.values(readerState);}
function updateState(key,value){
 const latest=localStorage.getItem(stateKey());if(latest)readerState=SC.merge(readerState,SC.valid(JSON.parse(latest),'domshop-reader-v1'));
 const items=values();if(value===undefined)delete items[key];else items[key]=value;
 readerState=SC.capture(readerState,items,()=>crypto.randomUUID());localStorage.setItem(stateKey(),JSON.stringify(readerState));
 clearTimeout(syncTimer);syncTimer=setTimeout(()=>driveSync?.sync().catch(error),1600);
}
function positionKey(){return 'position/'+book.id;}
function marks(){return Object.entries(values()).filter(([k,v])=>k.startsWith('mark/')&&v.book===book?.id).map(([key,v])=>({key,...v}));}
function visiblePosition(){
 if(!book)return null;const edge=document.querySelector('header').getBoundingClientRect().bottom+10;
 const blocks=[...$('reader').children],el=blocks.find(el=>el.getBoundingClientRect().bottom>edge)||blocks.at(-1);
 return {chapter,block:Number(el?.dataset.block)||0,fraction:el?Math.max(0,Math.min(1,(edge-el.getBoundingClientRect().top)/Math.max(1,el.getBoundingClientRect().height))):0};
}
function savePosition(){if(book&&!restoring&&!$('reading').hidden){const p=visiblePosition();updateState(positionKey(),p);updateProgress();}}
function schedulePosition(){if(!book||restoring)return;clearTimeout(positionTimer);positionTimer=setTimeout(()=>{try{savePosition();}catch(e){error(e);}},400);updateProgress();}
window.addEventListener('scroll',schedulePosition,{passive:true});
window.addEventListener('pagehide',()=>{try{savePosition();}catch{}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){try{savePosition();}catch{}}});
async function listBooks(){library=await booksDB('readonly',s=>s.getAll());renderLibrary();}
function renderLibrary(){
 $('books').replaceChildren();
 if(!library.length){const empty=node('div',undefined,$('books'),'book empty');node('h2','Your next story starts here.',empty);node('p','Open an EPUB to begin.',empty,'muted');}
 for(const b of library.sort((a,b)=>b.added.localeCompare(a.added))){const card=node('article',undefined,$('books'),'book');node('div','EPUB · '+b.chapters.length+' SECTIONS',card,'eyebrow');node('h2',b.title,card);node('p',b.author,card,'muted');const p=values()['position/'+b.id];node('small',p?'Section '+(p.chapter+1)+' · saved position': 'Ready to read',card);const row=node('div',undefined,card,'row');button(p?'Continue reading':'Start reading',row,()=>openBook(b.id),'primary');button('Remove',row,()=>{const body=showPanel('Remove book?');node('p',b.title,body);node('p','Reading history and saved Parola entries are kept. Reimport the same EPUB to restore your place.',body,'muted');button('Remove from this device',body,async()=>{if(book?.id===b.id){book=null;location.hash='';}$('panel').close();await booksDB('readwrite',s=>s.delete(b.id));await listBooks();route();},'danger');});}
}
async function importFile(file){
 if(!file)return;const label=$('epubInput').parentElement;label.setAttribute('aria-busy','true');$('epubInput').disabled=true;notify('Opening EPUB…');
 try{const parsed=await E.parse(await file.arrayBuffer());await booksDB('readwrite',s=>s.put(parsed));await listBooks();await openBook(parsed.id);navigator.storage?.persist?.().catch(()=>{});notify('Book opened.');}finally{$('epubInput').disabled=false;$('epubInput').value='';label.removeAttribute('aria-busy');}
}
$('epubInput').onchange=e=>importFile(e.target.files[0]).catch(error);
async function openBook(id,target){
 if(book)savePosition();const b=library.find(b=>b.id===id)||await booksDB('readonly',s=>s.get(id));
 if(!b){notify('Open this EPUB on this device first.');location.hash='';return;}
 book=b;const p=target||values()[positionKey()]||{chapter:0,block:0,fraction:0};navigate(p.chapter,p.block,p.fraction||0);
}
function routeHash(){return '#book='+book.id+'&chapter='+chapter;}
function navigate(index,block=0,fraction=0){
 if(!book)return;restoring=true;chapter=Math.max(0,Math.min(book.chapters.length-1,Number(index)||0));
 history.replaceState(null,'',routeHash());$('library').hidden=true;$('reading').hidden=false;$('dock').hidden=false;
 $('bookTitle').textContent=book.title;$('chapterTitle').textContent=book.chapters[chapter].title;document.title=book.chapters[chapter].title+' · Lettore';
 renderChapter();$('prev').disabled=chapter===0;$('next').disabled=chapter===book.chapters.length-1;
 const images=[...$('reader').querySelectorAll('img')];
 Promise.all(images.map(i=>i.decode().catch(()=>{}))).then(()=>requestAnimationFrame(()=>{
  const el=$('reader').children[Math.min(block,$('reader').children.length-1)];if(block||fraction){if(el)window.scrollTo(0,el.getBoundingClientRect().top+scrollY-document.querySelector('header').offsetHeight-10+el.offsetHeight*fraction);}else window.scrollTo(0,0);
  restoring=false;updateProgress();updateState(positionKey(),{chapter,block,fraction});
 }));
}
function renderChapter(){
 imageURLs.forEach(u=>URL.revokeObjectURL(u));imageURLs=[];$('reader').replaceChildren();const ms=marks().filter(m=>m.chapter===chapter&&m.kind==='highlight');
 book.chapters[chapter].blocks.forEach((b,index)=>{
  let el;if(b.kind==='img'){el=node('img',undefined,$('reader'));if(book.images[b.src]){const asset=book.images[b.src],url=URL.createObjectURL(asset instanceof Blob?asset:new Blob([asset.bytes],{type:asset.type}));imageURLs.push(url);el.src=url;}el.alt=b.alt;}
  else{el=node(b.kind==='h2'?'h2':'p',undefined,$('reader'),b.kind==='li'?'listItem':undefined);const ranges=ms.filter(m=>m.block===index);appendText(el,b.text,ranges);}
  el.dataset.block=index;
 });
}
function appendText(el,text,ranges){
 let last=0;for(const match of text.matchAll(wordRE)){if(match.index>last)appendPiece(text.slice(last,match.index),last);const span=node('span',undefined,el,'word');span.dataset.start=match.index;span.dataset.end=match.index+match[0].length;appendPiece(match[0],match.index,span);last=match.index+match[0].length;}if(last<text.length)appendPiece(text.slice(last),last);
 function appendPiece(piece,start,parent=el){let cursor=0;const boundaries=new Set([0,piece.length]);for(const r of ranges){boundaries.add(Math.max(0,Math.min(piece.length,r.start-start)));boundaries.add(Math.max(0,Math.min(piece.length,r.end-start)));}const points=[...boundaries].sort((a,b)=>a-b);for(let i=1;i<points.length;i++){const end=points[i],value=piece.slice(cursor,end),on=ranges.some(r=>start+cursor<r.end&&start+end>r.start);if(on)node('mark',value,parent);else parent.append(document.createTextNode(value));cursor=end;}}
}
function updateProgress(){if(!book)return;const p=visiblePosition(),b=book.chapters[chapter],ratio=Math.round(((p?.block||0)/Math.max(1,b.blocks.length-1))*100);$('position').textContent=(chapter+1)+' / '+book.chapters.length;$('chapterProgress').textContent=ratio+'% of section';}
$('prev').onclick=()=>navigate(chapter-1);$('next').onclick=()=>navigate(chapter+1);
$('libraryButton').onclick=()=>{savePosition();location.hash='';};
function contents(){if(!book){notify('Open a book first.');return;}const body=showPanel('Contents');for(const t of book.toc){const b=button(t.label,body,()=>{$('panel').close();navigate(t.chapter,t.block);},'tocLink');b.style.paddingLeft=12+t.depth*16+'px';b.setAttribute('aria-current',t.chapter===chapter?'true':'false');}}
$('tocButton').onclick=contents;$('locationButton').onclick=contents;
function markPosition(){if(!book)return;const p=visiblePosition(),key='mark/'+crypto.randomUUID();updateState(key,{...p,book:book.id,kind:'bookmark',text:book.chapters[chapter].blocks[p.block]?.text?.slice(0,130)||book.chapters[chapter].title,at:new Date().toISOString()});notify('Bookmark saved.');}
$('bookmarkButton').onclick=markPosition;
$('marksButton').onclick=()=>{if(!book){notify('Open a book first.');return;}const body=showPanel('Highlights & bookmarks'),items=marks();if(!items.length)node('p','No marks yet.',body,'muted');for(const m of items){const row=node('div',undefined,body,'markRow');node('small',(m.kind==='highlight'?'Highlight':'Bookmark')+' · '+book.chapters[m.chapter]?.title,row);button(m.text,row,()=>{$('panel').close();navigate(m.chapter,m.block,m.fraction||0);},'result');button('Remove',row,()=>{updateState(m.key,undefined);row.remove();if(m.chapter===chapter)renderChapter();});}};
$('searchButton').onclick=()=>{if(!book){notify('Open a book first.');return;}const body=showPanel('Search book'),input=node('input',undefined,body);input.type='search';input.placeholder='Italian word or phrase';input.setAttribute('aria-label','Search text');const summary=node('p','',body,'muted'),results=node('div',undefined,body);let timer;input.oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>{results.replaceChildren();const q=input.value.trim().normalize('NFC').toLocaleLowerCase('it');if(q.length<2){summary.textContent='';return;}let count=0;for(const [ci,c]of book.chapters.entries())for(const [bi,b]of c.blocks.entries()){if(!b.text)continue;const at=b.text.normalize('NFC').toLocaleLowerCase('it').indexOf(q);if(at<0)continue;count++;if(count<=100){const hit=button('',results,()=>{$('panel').close();navigate(ci,bi);requestAnimationFrame(()=>$('reader').children[bi]?.classList.add('target'));},'result');node('small',c.title,hit);node('span',(at>45?'…':'')+b.text.slice(Math.max(0,at-45),at+q.length+90)+'…',hit);}}summary.textContent=count+' matching paragraphs'+(count>100?' · first 100 shown':'');},180);};input.focus();};
function settings(){const body=showPanel('Reading settings'),group=node('div',undefined,body,'settings');
 function select(label,key,choices){const l=node('label',label,group),s=node('select',undefined,l);s.setAttribute('aria-label',label);for(const [value,title]of choices){const o=node('option',title,s);o.value=value;}s.value=prefs[key];s.onchange=()=>changePref(key,s.value);}
 function range(label,key,min,max,step){const l=node('label',label,group),input=node('input',undefined,l);input.type='range';input.min=min;input.max=max;input.step=step;input.value=prefs[key];input.setAttribute('aria-label',label);input.oninput=()=>changePref(key,Number(input.value));}
 select('Theme','theme',[['dark','Dark'],['paper','Paper'],['sepia','Sepia']]);select('Font','font',[['serif','Serif'],['sans','Sans serif']]);range('Text size','size',16,32,1);range('Line spacing','leading',1.4,2.4,.05);
 const links=node('div',undefined,body,'row box');const parola=node('a','Open Parola ↗',links,'btn');parola.href='https://defeldx14.github.io/italian-practice/#library';parola.target='_blank';parola.rel='noopener';button('Export saved words',links,exportWords);button('Reading backup',links,()=>download('lettore-history.json',JSON.stringify(readerState,null,2),'application/json'));
 const label=node('label','Restore reading backup ',body,'field'),input=node('input',undefined,label);input.type='file';input.accept='.json';input.onchange=async()=>{try{const f=input.files[0];if(!f||f.size>5000000)throw Error('Choose a reading backup under 5 MB.');const incoming=SC.valid(JSON.parse(await f.text()),'domshop-reader-v1');readerState=SC.merge(readerState,incoming);localStorage.setItem(stateKey(),JSON.stringify(readerState));renderLibrary();if(book)renderChapter();notify('Reading history merged.');}catch(e){error(e);}finally{input.value='';}};
 const sync=node('div',undefined,body);sync.id='accountPanel';if(driveSync)sync.innerHTML=driveSync.panel();node('p','Books stay on this device. Google sync keeps Parola entries, reading positions and marks across devices. Open the same EPUB on each device.',body,'muted box');
}
function changePref(key,value){const pos=visiblePosition();prefs[key]=value;localStorage.setItem('domshop.reader.prefs',JSON.stringify(prefs));applyPrefs();if(pos){const el=$('reader').children[pos.block];if(el)window.scrollTo(0,scrollY+el.getBoundingClientRect().top-document.querySelector('header').offsetHeight-10+pos.fraction*el.offsetHeight);}}
$('settingsButton').onclick=settings;
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function exportWords(){const rows=C.project(await store.read()).filter(r=>!r.deleted&&!r.conflict);const safe=s=>s.replace(/\|/g,'¦').replace(/[\r\n]+/g,' ');download('parola-vocabulary.txt',rows.map(r=>[r.entry.word,r.entry.translation,r.entry.sentence,r.entry.sentenceTranslation].map(safe).join(' | ')).join('\n'),'text/plain;charset=utf-8');}
function selection(){
 const s=getSelection();if(!s||s.isCollapsed||!s.rangeCount)return null;const range=s.getRangeAt(0),a=(range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement).closest('[data-block]'),b=(range.endContainer.nodeType===1?range.endContainer:range.endContainer.parentElement).closest('[data-block]');
 if(!a||a!==b||!$('reader').contains(a))return null;
 const pre=document.createRange();pre.selectNodeContents(a);pre.setEnd(range.startContainer,range.startOffset);const raw=s.toString(),text=raw.trim(),start=pre.toString().length+raw.length-raw.trimStart().length;if(!text)return null;
 return {block:Number(a.dataset.block),start,end:start+text.length,text};
}
const selectionButton=button('Look up selection',document.body,()=>{const s=selection();if(s)lookup(s);});selectionButton.id='selectionLookup';selectionButton.hidden=true;
let selectionTimer;document.addEventListener('selectionchange',()=>{clearTimeout(selectionTimer);selectionTimer=setTimeout(()=>{selectionButton.hidden=$('panel').open||$('lookup').open||!selection();},180);});
$('reader').addEventListener('click',e=>{if($('lookup').open)return;const s=selection();if(s){lookup(s);return;}const span=e.target.closest('.word');if(!span)return;const block=Number(span.closest('[data-block]').dataset.block);lookup({block,start:Number(span.dataset.start),end:Number(span.dataset.end),text:span.textContent});});
const translationCache=new Map();
async function translate(text){
 if(translationCache.has(text))return translationCache.get(text);
 const key='it-en/'+text,cached=await guest.get(key,null);if(cached){translationCache.set(text,cached);return cached;}
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),18000);
 try{const url=new URL('https://translate.googleapis.com/translate_a/single');url.search=new URLSearchParams({client:'gtx',sl:'it',tl:'en',dt:'t',q:text});const r=await fetch(url,{signal:ctrl.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!r.ok)throw Error('Translation unavailable. Retry or enter a meaning.');const data=await r.json();const result=data?.[0]?.filter(r=>Array.isArray(r)&&typeof r[0]==='string').map(r=>r[0]).join('').trim();if(!result)throw Error('No translation found.');translationCache.set(text,result);await guest.set(key,result);return result;}finally{clearTimeout(timer);}
}
async function grammar(word){
 if(word.includes(' '))return '';
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),7000);
 try{const r=await fetch('https://en.wiktionary.org/api/rest_v1/page/definition/'+encodeURIComponent(word.toLocaleLowerCase('it')),{signal:ctrl.signal,credentials:'omit'});if(!r.ok)return '';const data=await r.json(),entries=data.it;if(!Array.isArray(entries))return '';const parts=[];for(const e of entries.slice(0,2)){if(e.partOfSpeech)parts.push(e.partOfSpeech);for(const d of (e.definitions||[]).slice(0,2)){const html=new DOMParser().parseFromString(d.definition||'','text/html'),t=html.body.textContent;const gender=t.match(/\b(masculine|feminine)\b/i);if(gender)parts.push(gender[1]);const link=html.querySelector('.form-of-definition-link a, i[lang=it] a')||[...html.querySelectorAll('a')].find(a=>!(a.getAttribute('href')||'').includes('Appendix:'));if(/(?:inflection|plural|singular|form|participle|tense|person).*? of\b/i.test(t)&&link){parts.push((e.partOfSpeech==='Verb'?'Infinitive: ':'Lemma: ')+link.textContent);break;}}}return [...new Set(parts)].join(' · ');}catch{return '';}finally{clearTimeout(timer);}
}
function speech(text){if(!('speechSynthesis'in window)){notify('Pronunciation is unavailable in this browser.');return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='it-IT';u.rate=.85;const voice=speechSynthesis.getVoices().find(v=>v.lang.startsWith('it'));if(voice)u.voice=voice;speechSynthesis.speak(u);}
async function lookup(pick){
 if(!book||pick.text.length>100){notify('Select a word or phrase up to 100 characters.');return;}
 const block=book.chapters[chapter].blocks[pick.block];if(!block?.text)return;
 const s=E.sentence(block.text,pick.start);let sentence=s.text,start=s.start;
 if(pick.end>start+sentence.length){sentence=block.text.slice(pick.start,pick.end);start=pick.start;}
 if(sentence.length>700){const left=Math.max(0,pick.start-240),right=Math.min(block.text.length,Math.max(pick.end,left+650));sentence=block.text.slice(left,right);start=left;}
 const epoch=++lookupEpoch,targetStore=store,entry={word:pick.text,translation:'',sentence,sentenceTranslation:'',sourceTitle:book.title.slice(0,500),sourceUrl:location.href,occurrence:pick.start-start,truncated:sentence!==s.text};
 active={...pick,chapter,book:book.id,entry,targetStore};const context=active;
 $('lookupTitle').textContent=pick.text;const body=$('lookupBody');body.replaceChildren();const row=node('div',undefined,body,'row');button('♫ Listen',row,()=>speech(pick.text));button('Listen to sentence',row,()=>speech(sentence));
 const meta=node('div','',body,'grammar');const dictionary=node('a','Wiktionary ↗',body,'textLink');dictionary.href='https://en.wiktionary.org/wiki/'+encodeURIComponent(pick.text.toLocaleLowerCase('it'))+'#Italian';dictionary.target='_blank';dictionary.rel='noopener';
 const l=node('label',undefined,body,'field');node('span','ENGLISH',l);const meaning=node('input',undefined,l);meaning.setAttribute('aria-label','English meaning');meaning.placeholder='Looking up…';
 const status=node('p','',body,'muted');let meaningEdited=false;meaning.oninput=()=>{meaningEdited=true;entry.translation=meaning.value;};
 const retry=button('Retry lookup',body,loadTranslation);retry.hidden=true;
 node('p',sentence,body,'context');const english=node('p','',body,'muted');
 const sentenceButton=button('Reveal sentence translation',body,async()=>{sentenceButton.disabled=true;english.textContent='Translating…';try{const result=await translate(sentence);if(epoch!==lookupEpoch)return;entry.sentenceTranslation=result;english.textContent=result;sentenceButton.hidden=true;}catch(e){if(epoch===lookupEpoch){english.textContent=e.name==='AbortError'?'Translation timed out. Retry.':e.message;sentenceButton.disabled=false;}}});
 const editLabel=node('label',undefined,body,'field'),editEnglish=node('textarea',undefined,editLabel);editLabel.hidden=true;node('span','SENTENCE IN ENGLISH',editLabel);editEnglish.setAttribute('aria-label','English sentence');editEnglish.oninput=()=>entry.sentenceTranslation=editEnglish.value;
 button('Edit sentence translation',body,()=>{editLabel.hidden=false;editEnglish.value=entry.sentenceTranslation;editEnglish.focus();});
 const actions=node('div',undefined,body,'row lookupActions');
 const save=button('Save to Parola',actions,async()=>{
  save.disabled=true;const owner=targetStore;
  try{if(owner!==store)throw Error('Account changed. Select the word again.');entry.translation=meaning.value.trim();if(!entry.translation){meaning.focus();throw Error('Enter an English meaning first.');}
   if(!entry.sentenceTranslation){try{const result=await translate(sentence);entry.sentenceTranslation=result;if(epoch===lookupEpoch)english.textContent=result;}catch{notify('Saved word with Italian context; English sentence can be added later.');}}
   if(owner!==store)throw Error('Account changed. Select the word again.');const result=await owner.capture(entry);if(epoch===lookupEpoch){save.textContent=result.status;save.disabled=true;}doc=await store.read();driveSync?.capture();notify(result.status+' · Parola');
  }catch(e){if(epoch===lookupEpoch)save.disabled=false;throw e;}
 },'primary');
 button('Highlight',actions,()=>{updateState('mark/'+crypto.randomUUID(),{book:context.book,chapter:context.chapter,block:pick.block,start:pick.start,end:pick.end,kind:'highlight',text:pick.text,at:new Date().toISOString()});renderChapter();notify('Highlight saved.');});
 button('Copy import row',actions,async()=>{const safe=s=>s.replace(/\|/g,'¦').replace(/[\r\n]+/g,' ');await navigator.clipboard.writeText([entry.word,meaning.value,entry.sentence,entry.sentenceTranslation].map(safe).join(' | '));notify('Parola import row copied.');});
 getSelection()?.removeAllRanges();selectionButton.hidden=true;if(!$('lookup').open)$('lookup').showModal();
 async function loadTranslation(){retry.hidden=true;status.textContent='';try{const t=await translate(pick.text);if(epoch!==lookupEpoch)return;if(!meaningEdited){meaning.value=t;entry.translation=t;}meaning.placeholder='English meaning';}catch(e){if(epoch===lookupEpoch){status.textContent=e.name==='AbortError'?'Lookup timed out. Retry or enter a meaning.':e.message;meaning.placeholder='Enter English meaning';retry.hidden=false;}}}
 loadTranslation();grammar(pick.text).then(t=>{if(epoch===lookupEpoch)meta.textContent=t;});
}
async function syncReading(token,accountId){
 const owner=profile;if(accountId!==profile)throw Error('Account changed during sync.');
 const drive=new ItalianDrive.Drive(token),params=new URLSearchParams({spaces:'appDataFolder',q:"appProperties has { key='app' and value='domshop-reader-v1' } and trashed=false",fields:'nextPageToken,files(id)',pageSize:'1000'});let remote=SC.empty('domshop-reader-v1'),page='',count=0;
 do{if(page)params.set('pageToken',page);const listing=await(await drive.call('/drive/v3/files?'+params)).json();for(const f of listing.files||[]){if(++count>3000)throw Error('Reading sync journal is full.');const text=await(await drive.call('/drive/v3/files/'+encodeURIComponent(f.id)+'?alt=media')).text();if(text.length>5000000)throw Error('Reading sync file is too large.');remote=SC.merge(remote,SC.valid(JSON.parse(text),'domshop-reader-v1'));}page=listing.nextPageToken||'';}while(page);
 if(profile!==owner)throw Error('Account changed during sync.');const persisted=localStorage.getItem(stateKey());if(persisted)readerState=SC.merge(readerState,SC.valid(JSON.parse(persisted),'domshop-reader-v1'));
 const pending=Object.fromEntries(Object.entries(readerState.records).filter(([key,r])=>!remote.records[key]||r.at>remote.records[key].at||(r.at===remote.records[key].at&&r.id>remote.records[key].id)));
 if(Object.keys(pending).length){const boundary='reader_'+crypto.randomUUID(),meta={name:'reader-'+crypto.randomUUID()+'.json',mimeType:'application/json',parents:['appDataFolder'],appProperties:{app:'domshop-reader-v1'}};await drive.call('/upload/drive/v3/files?uploadType=multipart',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body:'--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'+JSON.stringify(meta)+'\r\n--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'+JSON.stringify({...SC.empty('domshop-reader-v1'),records:pending})+'\r\n--'+boundary+'--'});}
 if(profile!==owner)throw Error('Account changed during sync.');readerState=SC.merge(readerState,remote);localStorage.setItem(stateKey(),JSON.stringify(readerState));renderLibrary();if(book){const p=visiblePosition();renderChapter();const el=$('reader').children[p.block];if(el)window.scrollTo(0,scrollY+el.getBoundingClientRect().top-document.querySelector('header').offsetHeight-10+p.fraction*el.offsetHeight);}
}
function loadGoogle(){if(document.querySelector('script[src="https://accounts.google.com/gsi/client"]'))return;const s=node('script',undefined,document.head);s.src='https://accounts.google.com/gsi/client';s.async=true;}
loadState();await listBooks();doc=await store.read();
driveSync=DomshopDriveSync.create({
 app:'domshop-parola-v1',clientId:PAROLE_CONFIG.webClientId,empty:C.empty,get:()=>doc,validate:C.validate,
 toItems:d=>Object.fromEntries(C.validate(d).events.map(e=>['event/'+e.id,e])),fromItems:items=>C.validate({format:C.FORMAT,version:1,events:Object.entries(items).filter(([key])=>key.startsWith('event/')).map(([,e])=>e)}),initialAt:(key,e)=>Date.parse(e.at)||0,
 loadState:async(p,fallback)=>(p==='guest'?guest:guest.forAccount(p)).get('data',fallback),
 set:async(d,p)=>{store=p==='guest'?guest:guest.forAccount(p);profile=p;doc=C.validate(d);await store.set('data',doc);loadState();},
 customSync:async(token,id)=>{const owner=store;await ItalianDrive.sync(owner,new ItalianDrive.Drive(token),()=>{});if(owner!==store)throw Error('Account changed during sync.');doc=await owner.read();await syncReading(token,id);},
 onProfile:()=>{$('lookup').close();renderLibrary();if(book)renderChapter();},
 refresh:()=>{const el=$('accountPanel');if(el&&driveSync)el.innerHTML=driveSync.panel();},loadGoogle
});
await driveSync.ready;
window.addEventListener('domshop-parola-change',async e=>{const owner=store;if(e.detail?.database!==owner.database)return;try{const fresh=await owner.read();if(owner!==store)return;doc=fresh;driveSync.capture();}catch(e){error(e);}});
window.addEventListener('focus',async()=>{try{doc=await store.read();driveSync.capture();}catch(e){error(e);}});
window.addEventListener('storage',e=>{if(e.key===stateKey()){loadState();renderLibrary();if(book)renderChapter();}});
async function route(){if(!location.hash.startsWith('#book=')){if(book)savePosition();$('library').hidden=false;$('reading').hidden=true;$('dock').hidden=true;document.title='Lettore · Domshop';renderLibrary();return;}const p=new URLSearchParams(location.hash.slice(1)),id=p.get('book');if(book?.id===id){navigate(Number(p.get('chapter'))||0);return;}const pos=values()['position/'+id];const chapterParam=p.has('chapter')?Number(p.get('chapter')):undefined;await openBook(id,chapterParam===undefined?undefined:{...(pos?.chapter===chapterParam?pos:{}),chapter:chapterParam});}
window.addEventListener('hashchange',()=>route().catch(error));await route();
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>notify('Offline setup unavailable; your books are still stored locally.'));
})().catch(e=>{const el=document.getElementById('notice');if(el)el.textContent='Reader could not start: '+e.message;console.error(e);});
