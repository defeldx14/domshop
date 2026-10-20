'use strict';
const CACHE = 'domshop-v1';
const SHELL = ['./', './index.html', './style.css', './script.js', './manifest.webmanifest', './assets/icons/icon.svg', './assets/icons/icon-180.png', './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/icon-maskable-512.png'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('domshop-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
 const url = new URL(event.request.url);
 if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(new URL('./', self.location).pathname)) return;
 if (event.request.mode === 'navigate') {
   event.respondWith(fetch(event.request).then(response => {
     if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put('./index.html', copy))); }
     return response;
   }).catch(() => caches.match('./index.html')));
 } else {
   event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
 }
});
