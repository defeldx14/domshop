(function(g){
'use strict';
const SCOPE='https://www.googleapis.com/auth/drive.appdata',API='https://www.googleapis.com';
function create(options){
 const C=g.DomshopSyncCore,key='domshop.sync.'+options.app;
 let token='',expires=0,running=false,client=null,remote=null;
 let doc=C.empty(options.app),initialized=false;
 try{const cached=localStorage.getItem(key);if(cached){doc=C.valid(JSON.parse(cached),options.app);initialized=true;}}catch{options.notify('Sync metadata could not be read. Export a backup before syncing.');}
 function status(text){const el=document.getElementById('drive-status');if(el)el.textContent=text;options.notify(text);}
 function persist(){localStorage.setItem(key,JSON.stringify(doc));}
 function capture(){doc=C.capture(doc,options.toItems(options.get()),()=>crypto.randomUUID());if(!initialized&&options.initialAt){for(const [k,r]of Object.entries(doc.records))r.at=options.initialAt(k,r.value);}initialized=true;persist();return doc;}
 async function call(path,init={}){
  if(!token||Date.now()>=expires){token='';throw Error('Connection expired. Connect Google Drive again.');}
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),25000);
  try{const r=await fetch(API+path,{...init,credentials:'omit',signal:ctrl.signal,headers:{...init.headers,Authorization:'Bearer '+token}});
   if(!r.ok){if(r.status===401)token='';throw Error(r.status===401?'Connection expired. Reconnect.':r.status===403?'Drive access denied. Check Drive API and Google setup.':'Drive error '+r.status+'. Retry sync.');}return r;
  }finally{clearTimeout(timer);}
 }
 async function list(){
  let files=[],page='';
  do{const q=new URLSearchParams({spaces:'appDataFolder',q:"appProperties has { key='app' and value='"+options.app+"' } and trashed=false",fields:'nextPageToken,files(id,name)',pageSize:'1000'});if(page)q.set('pageToken',page);
  const d=await(await call('/drive/v3/files?'+q)).json();if(!Array.isArray(d.files))throw Error('Invalid Drive listing.');files.push(...d.files);page=d.nextPageToken||'';if(files.length>3000)throw Error('Sync journal too large. Export a backup and contact Dom.');}while(page);return files;
 }
 async function upload(records){
  if(!Object.keys(records).length)return;
  const boundary='domshop_'+crypto.randomUUID(),meta={name:options.app+'-'+crypto.randomUUID()+'.json',mimeType:'application/json',parents:['appDataFolder'],appProperties:{app:options.app}};
  const body='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(meta)+'\r\n--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'+JSON.stringify({...C.empty(options.app),records})+'\r\n--'+boundary+'--';
  await call('/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});
 }
 async function sync(){
  if(running)return;
  const consent=document.getElementById('drive-consent');if(!consent?.checked)throw Error('Confirm your intended Google account before syncing.');
  if(!token)throw Error('Connect Google Drive first.');
  running=true;
  try{
   capture();status('Reading Drive…');let gathered=C.empty(options.app);
   for(const file of await list()){const text=await(await call('/drive/v3/files/'+encodeURIComponent(file.id)+'?alt=media')).text();if(text.length>15000000)throw Error('Drive file too large.');gathered=C.merge(gathered,C.valid(JSON.parse(text),options.app));}
   remote=gathered;
   // Validate the full merged state before any upload or replacement.
   capture();let merged=C.merge(doc,remote);await options.validate(options.fromItems(C.values(merged)));
   const pending={};for(const [k,r]of Object.entries(doc.records)){const p=remote.records[k];if(!p||r.at>p.at||(r.at===p.at&&r.id>p.id))pending[k]=r;}
   status('Saving to Drive…');await upload(pending);
   // Include edits made while the request was in flight, without overwriting them.
   capture();merged=C.merge(doc,remote);const state=await options.validate(options.fromItems(C.values(merged)));
   doc=merged;persist();options.set(state);localStorage.setItem(key+'.last',new Date().toISOString());
   const durable=C.merge(remote,{...C.empty(options.app),records:pending});
   const left=Object.entries(doc.records).some(([k,r])=>r.id!==durable.records[k]?.id);
   options.refresh();status(left?'Synced. New edits need another Sync now.':'Synced. Use Sync now on your other device.');
  }catch(e){status(e.name==='AbortError'?'Drive timed out. Retry sync.':e.message);throw e;}finally{running=false;}
 }
 function connect(){
  if(running)return;
  if(!document.getElementById('drive-consent')?.checked){status('Confirm your intended Google account first.');return;}
  if(!g.google?.accounts?.oauth2){status('Google sign-in is loading. Try again, or check your connection.');return;}
  token='';client=g.google.accounts.oauth2.initTokenClient({client_id:options.clientId,scope:SCOPE,include_granted_scopes:false,
   callback:r=>{if(r.error||!r.access_token){status('Google connection was not completed.');return;}if(!g.google.accounts.oauth2.hasGrantedAllScopes(r,SCOPE)){status('Drive permission was not granted.');return;}token=r.access_token;expires=Date.now()+Math.max(0,(Number(r.expires_in)||3600)-60)*1000;status('Connected. Tap Sync now to merge progress.');},
   error_callback:()=>status('Google sign-in was closed or blocked. Try again.')});
  client.requestAccessToken({prompt:'select_account'});
 }
 function disconnect(){token='';expires=0;status('Disconnected on this page. Local progress is still saved.');}
 function panel(){
  let last='';try{last=localStorage.getItem(key+'.last')||''}catch{}
  return '<div class="box"><h2>Google Drive sync</h2><p>Sync progress between devices using the same Google account. Local saves still work offline.</p><label><input type="checkbox" id="drive-consent"> I will use my intended Google account and merge this device’s progress.</label><div class="row"><button type="button" data-drive="connect">Connect Google Drive</button><button type="button" data-drive="sync">Sync now</button><button type="button" data-drive="disconnect">Disconnect</button></div><p id="drive-status" role="status">'+(token?'Connected.':'Not connected.')+'</p><small>'+(last?'Last sync: '+new Date(last).toLocaleString()+'. ':'')+'Private app data only. Connect again after reopening or when authorization expires. If the same lesson changes on two devices, the latest edit wins. Keep backups for older attempts.</small></div>';
 }
 document.addEventListener('click',e=>{const a=e.target.closest('[data-drive]')?.dataset.drive;if(a==='connect')connect();if(a==='disconnect')disconnect();if(a==='sync')sync().catch(e=>status(e.message));});
 try{capture();}catch(e){options.notify('Sync metadata could not be saved. Export a backup before syncing.');}
 return {capture,panel,sync,disconnect};
}
g.DomshopDriveSync={create};
})(globalThis);
