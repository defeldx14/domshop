'use strict';
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      document.getElementById('offline-status').textContent = 'Offline setup is unavailable. You can still use the hub online.';
    });
  });
}
window.addEventListener('offline', () => {
 document.getElementById('offline-status').textContent = 'You are offline. The hub is available; linked apps may require internet.';
});
window.addEventListener('online', () => { document.getElementById('offline-status').textContent = ''; });
