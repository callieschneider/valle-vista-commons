/**
 * Valle Vista Commons — Lightweight Lightbox
 * Click any image in .post-body or .post-row-desc to view full resolution.
 * Click overlay or × to close. Escape key also closes.
 */
(function () {
  'use strict';

  var overlay = null;

  function open(src) {
    if (overlay) close();

    overlay = document.createElement('div');
    overlay.className = 'vvc-lightbox';
    overlay.innerHTML =
      '<button class="vvc-lightbox-close" aria-label="Close">&times;</button>' +
      '<img src="' + src + '" alt="">';

    document.body.appendChild(overlay);

    // Force reflow then add .open for fade-in
    overlay.offsetHeight;
    overlay.classList.add('open');

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.classList.contains('vvc-lightbox-close')) {
        close();
      }
    });
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('open');
    var el = overlay;
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 200);
    overlay = null;
  }

  function init() {
    document.addEventListener('click', function (e) {
      var img = e.target.closest('.post-body img, .post-row-desc img, .rich-content img');
      if (img && img.src) {
        e.preventDefault();
        open(img.src);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
