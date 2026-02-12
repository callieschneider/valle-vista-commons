/**
 * Admin Sidebar — Tab switching, URL hash persistence, mobile toggle
 */
(function () {
  'use strict';

  const VALID_TABS = ['dashboard', 'queue', 'board', 'archive', 'notes', 'blocklist', 'moderators', 'settings', 'activity'];
  const DEFAULT_TAB = 'dashboard';

  // ─── Elements ──────────────────────────────────────────
  const sidebar = document.querySelector('.admin-sidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');
  const toggleBtn = document.querySelector('.admin-sidebar-toggle');
  const sidebarItems = document.querySelectorAll('.sidebar-item[data-tab]');
  const tabPanels = document.querySelectorAll('.tab-panel[id^="tab-"]');

  // ─── Determine initial tab ─────────────────────────────
  function getInitialTab() {
    // 1. Check query param (from POST redirect)
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && VALID_TABS.includes(tabParam) && document.getElementById('tab-' + tabParam)) {
      return tabParam;
    }
    // 2. Check URL hash
    const hash = window.location.hash.replace('#', '');
    if (hash && VALID_TABS.includes(hash) && document.getElementById('tab-' + hash)) {
      return hash;
    }
    // 3. Default
    return DEFAULT_TAB;
  }

  // ─── Switch tab ────────────────────────────────────────
  function switchTab(tabId, skipUrlUpdate) {
    if (!VALID_TABS.includes(tabId)) tabId = DEFAULT_TAB;
    const panel = document.getElementById('tab-' + tabId);
    if (!panel) { tabId = DEFAULT_TAB; }

    // Update sidebar active state
    sidebarItems.forEach(function (item) {
      item.classList.toggle('active', item.getAttribute('data-tab') === tabId);
    });

    // Show/hide panels
    tabPanels.forEach(function (p) {
      p.classList.toggle('active', p.id === 'tab-' + tabId);
    });

    // Update URL hash only if not skipping (to preserve auth on first load)
    if (!skipUrlUpdate) {
      if (history.replaceState) {
        var url = window.location.pathname + window.location.search + '#' + tabId;
        history.replaceState(null, '', url);
      } else {
        window.location.hash = tabId;
      }
    }

    // Close mobile sidebar
    closeMobileSidebar();

    // Scroll content to top
    var content = document.querySelector('.admin-content');
    if (content) content.scrollTop = 0;

    // Notify maps and other components that a tab became visible
    var activePanel = document.getElementById('tab-' + tabId);
    if (activePanel) {
      setTimeout(function () {
        activePanel.dispatchEvent(new CustomEvent('tab:shown', { bubbles: true }));
      }, 50); // Small delay to let display:block take effect
    }
  }

  // ─── Sidebar click handlers ────────────────────────────
  sidebarItems.forEach(function (item) {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      var tab = this.getAttribute('data-tab');
      switchTab(tab);
    });
  });

  // Quick action links (dashboard stat cards that link to tabs)
  document.addEventListener('click', function (e) {
    var link = e.target.closest('[data-goto-tab]');
    if (link) {
      e.preventDefault();
      switchTab(link.getAttribute('data-goto-tab'));
    }
  });

  // ─── Mobile sidebar toggle ────────────────────────────
  function openMobileSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }
  function closeMobileSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('visible');
    document.body.style.overflow = '';
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      if (sidebar && sidebar.classList.contains('open')) {
        closeMobileSidebar();
      } else {
        openMobileSidebar();
      }
    });
  }
  if (backdrop) {
    backdrop.addEventListener('click', closeMobileSidebar);
  }

  // ─── Hash change listener ─────────────────────────────
  window.addEventListener('hashchange', function () {
    var hash = window.location.hash.replace('#', '');
    if (hash && VALID_TABS.includes(hash)) {
      switchTab(hash);
    }
  });

  // ─── Archive filters ──────────────────────────────────
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.archive-filter-btn');
    if (!btn) return;
    e.preventDefault();
    var filter = btn.getAttribute('data-filter');
    // Update active state
    document.querySelectorAll('.archive-filter-btn').forEach(function (b) {
      b.classList.toggle('active', b === btn);
    });
    // Show/hide archive rows
    document.querySelectorAll('.archive-post-row').forEach(function (row) {
      if (filter === 'all') {
        row.style.display = '';
      } else {
        row.style.display = row.getAttribute('data-status') === filter ? '' : 'none';
      }
    });
  });

  // ─── Scroll edit/mod-note panels into view when opened ──
  document.addEventListener('shown.bs.collapse', function (e) {
    var panel = e.target;
    if (!panel || (!panel.id.startsWith('liveEdit-') && !panel.id.startsWith('modNote-'))) return;
    // Short delay to let Bootstrap finish layout
    setTimeout(function () {
      // Scroll the bottom of the panel into view so Save/Discard buttons are visible
      panel.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 80);
  });

  // ─── AJAX mod actions (prevent scroll-to-top on POST) ──
  // Intercept quick-action button clicks, POST via fetch, update DOM in-place
  var AJAX_PATTERN = /\/admin\/(approve|reject|delete|expire|pin|urgent)\//;

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('button[type="submit"]');
    if (!btn) return;
    var form = btn.closest('form');
    if (!form) return;
    var action = form.getAttribute('action') || '';
    var m = action.match(AJAX_PATTERN);
    if (!m) return;

    // Let the confirm dialog run first (from inline onsubmit)
    var onsubmit = form.getAttribute('onsubmit');
    if (onsubmit && onsubmit.indexOf('confirm') !== -1) {
      // Extract the confirm message
      var msgMatch = onsubmit.match(/confirm\(['"](.+?)['"]\)/);
      if (msgMatch && !confirm(msgMatch[1])) return; // User cancelled
    }

    // Prevent the normal form submission
    e.preventDefault();
    e.stopPropagation();

    var type = m[1];
    var formData = new FormData(form);
    var body = new URLSearchParams(formData).toString();
    var card = form.closest('.post-row');

    // Disable all buttons in the card
    var allBtns = card ? card.querySelectorAll('.actions-row button') : form.querySelectorAll('button');
    allBtns.forEach(function (b) { b.disabled = true; });

    fetch(action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      credentials: 'include',
      body: body,
      redirect: 'manual',
    }).then(function (res) {
      if (type === 'delete' || type === 'reject' || type === 'expire' || type === 'approve') {
        if (card) {
          card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
          card.style.opacity = '0';
          card.style.transform = 'translateX(-20px)';
          setTimeout(function () { card.remove(); }, 260);
        }
      } else if (type === 'pin' || type === 'urgent') {
        if (type === 'pin') {
          var wasPinned = btn.classList.contains('active');
          btn.classList.toggle('active', !wasPinned);
          btn.textContent = wasPinned ? 'Pin' : 'Unpin';
        } else {
          var wasUrgent = btn.classList.contains('active');
          btn.classList.toggle('active', !wasUrgent);
          btn.textContent = wasUrgent ? 'Urgent' : 'Not Urgent';
        }
        allBtns.forEach(function (b) { b.disabled = false; });
      }
    }).catch(function () {
      allBtns.forEach(function (b) { b.disabled = false; });
      // Fallback: do a normal navigation
      window.location.href = action;
    });
  }, true); // useCapture = true to fire before inline handlers

  // ─── Initialize ───────────────────────────────────────
  var initialTab = getInitialTab();
  switchTab(initialTab, true); // Skip URL update on first load to preserve auth

  // Clean up query param from URL on subsequent interactions only
  if (window.location.search.includes('tab=')) {
    // Wait a moment, then clean up query params without breaking auth
    setTimeout(function() {
      var params = new URLSearchParams(window.location.search);
      params.delete('tab');
      var remaining = params.toString();
      var cleanUrl = window.location.pathname + (remaining ? '?' + remaining : '') + '#' + initialTab;
      if (history.replaceState) history.replaceState(null, '', cleanUrl);
    }, 500);
  }
})();
