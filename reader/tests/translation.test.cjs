'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../translation.js'),'utf8');
function setup(fetch,extra={}){
 const values=new Map(),navigator={onLine:true},cache={get:async k=>values.get(k),set:async(k,v)=>values.set(k,v)};
 const scope={URL,URLSearchParams,AbortController,setTimeout,clearTimeout,navigator};
 vm.createContext(scope);vm.runInContext(source,scope);
 const service=scope.ReaderTranslation.create({cache,fetch,...extra});
 return {...service,values,navigator};
}
const ok=text=>({ok:true,json:async()=>[[[text]]]});
test('network failure switches Google host, sends only text, and caches success',async()=>{
 const calls=[],s=setup(async(u,o)=>{calls.push([u,o]);if(calls.length===1)throw TypeError('Load failed');return ok('workforce');});
 assert.equal(await s.translate("mano d’opera"),'workforce');
 assert.equal(await s.translate("mano d’opera"),'workforce');assert.equal(calls.length,2);
 assert.equal(calls[0][0].hostname,'translate.googleapis.com');assert.equal(calls[1][0].hostname,'translate.google.com');
 assert.equal(calls[1][0].searchParams.get('q'),"mano d’opera");assert.equal(calls[1][1].credentials,'omit');
 assert.equal(s.values.get('it-en/mano d’opera'),'workforce');
});
test('both hosts fail with actionable message; explicit retry starts fresh',async()=>{
 let n=0;const s=setup(async()=>{if(++n<=2)throw TypeError('Load failed');return ok('hello');});
 await assert.rejects(s.translate('ciao'),/Cannot reach Google translation/);
 assert.equal(await s.translate('ciao'),'hello');assert.equal(n,3);
});
test('persistent cached translations work offline without network',async()=>{
 const s=setup(async()=>{throw Error('unexpected network');});s.values.set('it-en/città','city');s.navigator.onLine=false;
 assert.equal(await s.translate('città'),'city');await assert.rejects(s.translate('nuovo'),/offline/);
});
test('simultaneous requests for identical text share the same request',async()=>{
 let finish,n=0;const s=setup(async()=>{n++;await new Promise(r=>finish=r);return ok('why');});
 const a=s.translate('perché'),b=s.translate('perché');await new Promise(setImmediate);finish();
 assert.deepEqual(await Promise.all([a,b]),['why','why']);assert.equal(n,1);
});
test('cache read and write errors cannot suppress a valid translation',async()=>{
 const s=setup(async()=>ok('friend'),{cache:{get:async()=>{throw Error('read');},set:async()=>{throw Error('quota');}}});
 assert.equal(await s.translate('amica'),'friend');
});
test('malformed first response falls back and empty results are never cached',async()=>{
 let n=0;const s=setup(async()=>++n===1?{ok:true,json:async()=>({error:'invalid'})}:ok('house'));
 assert.equal(await s.translate('casa'),'house');assert.equal(n,2);
 const empty=setup(async()=>ok(''));await assert.rejects(empty.translate('casa'),/Cannot reach/);assert.equal(empty.values.size,0);
});
test('rate limit explains waiting rather than leaking browser error',async()=>{
 const s=setup(async()=>({ok:false,status:429}));await assert.rejects(s.translate('ciao'),/Google is limiting/);
});
test('timeout aborts first endpoint and permits fallback',async()=>{
 let n=0;const s=setup(async(u,o)=>{if(++n===1)return new Promise((resolve,reject)=>o.signal.addEventListener('abort',()=>reject(Error('aborted'))));return ok('hello');},{timeout:5});
 assert.equal(await s.translate('ciao'),'hello');assert.equal(n,2);
});
test('reader loads helper before controller and offline shell includes matching URLs',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
 assert.ok(html.indexOf('./translation.js?v=3')<html.indexOf('./app.js?v=3'));
 assert.ok(sw.includes("'./translation.js?v=3'"));assert.ok(sw.includes("'./app.js?v=3'"));
});
