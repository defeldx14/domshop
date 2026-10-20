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

// Keep the hub available on computers, including touchscreen laptops with a mouse.
const desktopLinks = window.matchMedia('(any-hover: hover) and (any-pointer: fine)');
function updateLinkTargets() {
  document.querySelectorAll('a.card, footer a[href^="https://"]').forEach(link => {
    if (desktopLinks.matches) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-description', 'Opens in a new tab.');
      link.title = 'Opens in a new tab';
    } else {
      link.removeAttribute('target');
      link.removeAttribute('rel');
      link.removeAttribute('aria-description');
      link.removeAttribute('title');
    }
  });
}
updateLinkTargets();
desktopLinks.addEventListener('change', updateLinkTargets);
