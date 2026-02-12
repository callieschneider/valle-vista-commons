/**
 * Valle Vista Commons — Theme Controller
 * Handles dark/light mode + color scheme switching.
 * Saves to localStorage (no cookies, no server state).
 * Respects OS prefers-color-scheme on first visit.
 * Popover: 3-dot trigger opens pill, click-outside closes.
 */
(function () {
  'use strict';

  var THEME_KEY = 'vvc-theme';
  var SCHEME_KEY = 'vvc-scheme';
  var DEFAULT_SCHEME = 'forest';

  function setTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    document.querySelectorAll('.mode-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
    try { localStorage.setItem(THEME_KEY, mode); } catch (e) {}
  }

  function setScheme(scheme) {
    document.documentElement.setAttribute('data-scheme', scheme);
    document.querySelectorAll('.scheme-dot').forEach(function (d) {
      d.classList.toggle('active', d.dataset.scheme === scheme);
    });
    // Update label text if present
    document.querySelectorAll('.scheme-active-label').forEach(function (el) {
      var names = { forest: 'Forest', terracotta: 'Terracotta', slate: 'Slate', sage: 'Sage', indigo: 'Indigo' };
      el.textContent = names[scheme] || scheme;
    });
    try { localStorage.setItem(SCHEME_KEY, scheme); } catch (e) {}
  }

  // ─── Popover logic ──────────────────────────────────────
  function initPopovers() {
    document.querySelectorAll('.theme-trigger').forEach(function (trigger) {
      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        var popover = this.closest('.theme-menu').querySelector('.theme-popover');
        if (!popover) return;
        var isOpen = popover.classList.contains('open');
        // Close all popovers first
        closeAllPopovers();
        if (!isOpen) {
          popover.classList.add('open');
        }
      });
    });

    // Click outside closes
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.theme-popover') && !e.target.closest('.theme-trigger')) {
        closeAllPopovers();
      }
    });

    // Escape closes
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAllPopovers();
    });
  }

  function closeAllPopovers() {
    document.querySelectorAll('.theme-popover.open').forEach(function (p) {
      p.classList.remove('open');
    });
  }

  // ─── Init ───────────────────────────────────────────────
  function init() {
    var savedTheme, savedScheme;
    try {
      savedTheme = localStorage.getItem(THEME_KEY);
      savedScheme = localStorage.getItem(SCHEME_KEY);
    } catch (e) {}

    setScheme(savedScheme || DEFAULT_SCHEME);

    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    } else {
      setTheme('light');
    }

    // Bind mode buttons
    document.querySelectorAll('.mode-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        setTheme(this.dataset.mode);
      });
    });

    // Bind scheme dots
    document.querySelectorAll('.scheme-dot').forEach(function (dot) {
      dot.addEventListener('click', function (e) {
        e.stopPropagation();
        setScheme(this.dataset.scheme);
      });
    });

    // Init popovers
    initPopovers();
  }

  window.VVCTheme = { setTheme: setTheme, setScheme: setScheme };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
