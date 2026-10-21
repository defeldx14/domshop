'use strict';
const CACHE='domshop-v10';
const SHELL=['./','./index.html','./style.css?v=5','./script.js?v=7','./skyline.css?v=1','./skyline.js?v=2','./manifest.webmanifest?v=9','./assets/icons/workshop.svg','./assets/icons/workshop-180.png','./assets/icons/workshop-192.png','./assets/icons/workshop-512.png','./assets/icons/workshop-maskable-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('domshop-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url),base=new URL('./',self.location).pathname;
 if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(base))return;
 // Nested apps own their navigation and cache. Never store their HTML as the hub.
 if(e.request.mode==='navigate'){
  if(u.pathname!==base&&u.pathname!==base+'index.html')return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put('./index.html',copy)))}return r}).catch(()=>caches.match('./index.html')));
 }else if(!u.pathname.startsWith(base+'storie/'))e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));
});



