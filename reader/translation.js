(function(root){
'use strict';
function create(options){
 const cache=options.cache,request=options.fetch||root.fetch.bind(root),online=options.isOnline||(()=>root.navigator?.onLine!==false);
 const memory=new Map(),pending=new Map(),timeout=options.timeout||10000;
 async function run(text){
  const key='it-en/'+text;
  try{const saved=await cache.get(key,null);if(typeof saved==='string'&&saved.trim()){memory.set(text,saved);return saved;}}catch{}
  if(!online())throw Error('You are offline. Cached translations still work. Reconnect, then retry.');
  let limited=false;
  for(const host of ['translate.googleapis.com','translate.google.com']){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
   try{
    const url=new URL('https://'+host+'/translate_a/single');
    url.search=new URLSearchParams({client:'gtx',sl:'it',tl:'en',dt:'t',q:text});
    const response=await request(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
    if(!response.ok){limited=limited||response.status===429;continue;}
    const data=await response.json();
    const result=Array.isArray(data?.[0])?data[0].filter(row=>Array.isArray(row)&&typeof row[0]==='string').map(row=>row[0]).join('').trim():'';
    if(!result)continue;
    memory.set(text,result);
    try{await cache.set(key,result);}catch{}
    return result;
   }catch{}finally{clearTimeout(timer);}
  }
  if(!online())throw Error('You are offline. Reconnect, then retry.');
  throw Error(limited?'Google is limiting translation requests. Wait a little, retry, or open Google Translate.':'Cannot reach Google translation from this browser. Retry, open Google Translate, or enter the meaning manually.');
 }
 function translate(text){
  if(memory.has(text))return Promise.resolve(memory.get(text));
  if(pending.has(text))return pending.get(text);
  const task=run(text);pending.set(text,task);
  task.then(()=>pending.delete(text),()=>pending.delete(text));
  return task;
 }
 return {translate};
}
root.ReaderTranslation={create};
})(globalThis);
