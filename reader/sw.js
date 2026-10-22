'use strict';
const CACHE='lettore-v2';
const SHELL=['./','./index.html','./style.css','./app.js','./epub.js','./parola-config.js','./manifest.webmanifest','./vendor/fflate.js','./shared/core.js','./shared/store.js','./shared/bulk.js','./shared/drive.js','./shared/sync-core.js','./shared/google-account.js','./shared/drive-sync.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('lettore-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url),base=new URL('./',self.location).pathname;if(e.request.method!=='GET'||u.origin!==location.origin||!u.pathname.startsWith(base))return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)));}return r;}).catch(()=>caches.match(e.request).then(c=>c||(e.request.mode==='navigate'?caches.match('./index.html'):Response.error()))));});
