'use strict';
const CACHE='storie-v5';
const FILES=['./','./index.html','./style.css','./config.js','./data.js','./art.js','./app.js?v=4','./sync-core.js','./drive-sync.js?v=5','./manifest.webmanifest','../assets/icons/icon-192.png','../assets/icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('storie-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url),base=new URL('./',self.location).pathname;
 if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(base)||u.pathname.startsWith(base+'api/'))return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)))}return r}).catch(async()=>{const cached=await caches.match(e.request);if(cached)return cached;if(e.request.mode==='navigate')return caches.match('./index.html');return Response.error()}));
});