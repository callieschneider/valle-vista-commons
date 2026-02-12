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
