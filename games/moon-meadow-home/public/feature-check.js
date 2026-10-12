// public/feature-check.js. A classic script that runs before the app module (no inline script, so the CSP stays strict).
// On a Safari too old for the app, or when the app has not booted after 10 seconds, show a picture and a link back to v2.
(function () {
  var ok = typeof Promise === 'function' && 'indexedDB' in window && !!window.CSS && !!CSS.supports && CSS.supports('aspect-ratio: 1');
  function fallback() {
    if (window.__mmhBooted) return;
    var a = document.createElement('a');
    a.href = '../../ideas/opus-5-5-unicorn-egg-nest-v2/';
    a.setAttribute('aria-label', 'unicorn egg nest');
    a.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#cfe8ff;z-index:2147483647';
    a.innerHTML = '<svg width="320" height="320" viewBox="0 0 320 320" aria-hidden="true"><ellipse cx="160" cy="180" rx="110" ry="130" fill="#fff3d6" stroke="#e0b96a" stroke-width="8"/><circle cx="160" cy="160" r="36" fill="#f5a3c7"/></svg>';
    document.body.appendChild(a);
  }
  if (!ok) { document.addEventListener('DOMContentLoaded', fallback); return; }
  setTimeout(fallback, 10000);
})();
