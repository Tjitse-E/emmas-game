/*
 * Home button for Emma's games: a round house button in the top right corner of the stage.
 * One tap stops all sound and goes back to the picture menu (index.html in the repo root).
 *
 * A classic script. Load it after the stage markup: <script src="../../shared/home.js"></script>
 * It adds itself to #stage (the game's 1180 x 820 stage), so it scales with the game.
 */
(function () {
  'use strict';

  var MENU = '../../index.html';

  var CSS = '#homeBtn{position:absolute;right:16px;top:16px;width:80px;height:80px;border-radius:50%;z-index:400;' +
    'background:#fff;border:5px solid #ffd25e;box-shadow:0 5px 0 #d9a23a,0 8px 16px rgba(0,0,0,.18);' +
    'display:flex;align-items:center;justify-content:center;touch-action:none;cursor:pointer;' +
    '-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;transition:transform .08s}' +
    '#homeBtn svg{width:46px;height:46px;display:block;pointer-events:none}' +
    '#homeBtn.down{transform:translateY(4px) scale(.95)}';

  var ICON = '<svg viewBox="0 0 48 48" aria-hidden="true">' +
    '<path d="M24 6 L44 23 L38 23 L38 42 L10 42 L10 23 L4 23 Z" fill="#ff8fc7" stroke="#c2468a" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="19" y="28" width="10" height="14" rx="3" fill="#fff6dd" stroke="#c2468a" stroke-width="2.5"/>' +
    '<circle cx="24" cy="19" r="3.2" fill="#ffd25e"/></svg>';

  function add() {
    if (document.getElementById('homeBtn')) return;
    var host = document.getElementById('stage') || document.body;
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var btn = document.createElement('div');
    btn.id = 'homeBtn';
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-label', 'Home');
    btn.innerHTML = ICON;
    host.appendChild(btn);

    var down = false;
    btn.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
      e.preventDefault();
      down = true;
      btn.classList.add('down');
    });
    btn.addEventListener('pointerup', function (e) {
      e.stopPropagation();
      e.preventDefault();
      btn.classList.remove('down');
      if (!down) return;
      down = false;
      try { if (window.EmmaAudio) window.EmmaAudio.stop(); } catch (err) { /* leave anyway */ }
      window.location.href = MENU;
    });
    btn.addEventListener('pointercancel', function () { down = false; btn.classList.remove('down'); });
    btn.addEventListener('pointerleave', function () { down = false; btn.classList.remove('down'); });
    ['click', 'touchstart', 'touchend', 'mousedown', 'mouseup'].forEach(function (t) {
      btn.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add);
  else add();
})();
