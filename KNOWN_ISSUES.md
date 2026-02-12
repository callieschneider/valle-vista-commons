# Known Issues

> Tracked bugs, quirks, and limitations. Items here are acknowledged but not yet fully resolved, or are resolved with caveats.
>
> For completed work, see [CHANGELOG.md](./CHANGELOG.md). For pending tasks, see [TODO.md](./TODO.md).

*Last updated: February 12, 2026 (leaflet-rotate zoom fix)*

---

## Open

### Board Notes tab opens mid-page with half-loaded map
**Severity:** Low
**Found:** 2026-02-12
**Status:** Fixed (with caveat)
**Details:** The Board Notes composer includes a Leaflet map that initializes while the tab is hidden (`display: none`). Leaflet calculates zero dimensions, causing tiles to only partially render. The page also appeared to open scrolled partway down.
**Fix applied:** Map initialization is now deferred until the Notes tab becomes visible. A `tab:shown` custom event triggers `invalidateSize()` on all tracked map instances. Scroll resets to top on tab switch.
**Caveat:** If a user navigates directly to `#notes` on first load, there's a brief moment where tiles may flash as they re-render. The 50ms delay before `invalidateSize()` mitigates this but doesn't eliminate it entirely.

### Admin page logout on refresh (Basic Auth)
**Severity:** Medium
**Found:** 2026-02-12
**Status:** Fixed (browser-dependent)
**Details:** Calling `history.replaceState()` immediately on page load caused some browsers to drop cached Basic Auth credentials, forcing a re-login popup on every refresh.
**Fix applied:** `switchTab()` accepts a `skipUrlUpdate` parameter set to `true` on initial load. URL cleanup of `?tab=` query params is deferred 500ms via `setTimeout`.
**Caveat:** This is a browser-specific behavior. Tested working in Chrome and Safari. Edge cases may exist in other browsers or with certain proxy/auth configurations.

### Theme popover clipped by sidebar
**Severity:** Low
**Found:** 2026-02-12
**Status:** Fixed
**Details:** The sidebar had `overflow-y: auto` which created a clipping boundary. The theme settings popover (positioned absolutely in the sidebar footer) was cut off or hidden behind other elements.
**Fix applied:** Moved `overflow-y: auto` from `.admin-sidebar` to `.admin-sidebar-nav` only. Sidebar itself is now `overflow: visible`. Footer has `position: relative` and `flex-shrink: 0`. Popover opens upward with `z-index: 1000`.

---

### leaflet-rotate double-click zoom shift (CSS transform-origin bug)
**Severity:** Medium
**Found:** 2026-02-12
**Status:** Fixed (workaround)
**Details:** The `leaflet-rotate` plugin (v0.2.8) has a known bug where the CSS `transform-origin` calculation during zoom animation is incorrect when the map has a non-zero `bearing`. When double-click zooming on a rotated map, the animated zoom causes the map center to shift visually in the direction perpendicular to the rotation angle. This is a confirmed upstream issue (see [StackOverflow #53798025](https://stackoverflow.com/questions/53798025/leaflet-rotate-zoom-issue), [GitHub PR #48](https://github.com/Raruto/leaflet-rotate/pull/48)).
**Root cause:** Leaflet's `_animateZoom` method calculates pixel offsets for the CSS transform assuming no rotation. With `bearing: -90`, the offset is applied in the wrong direction, shifting the map to the right (screen space) during the animation.
**Fix applied:** Two-part workaround in `map-picker.js` and `board-maps.js`:
1. **Disable native `doubleClickZoom`** — set `doubleClickZoom: false` in map options.
2. **Custom dblclick handler with `animate: false`** — a capture-phase `dblclick` listener on the map container calls `map.setView(center, zoom + 1, { animate: false })`. This bypasses the CSS animation entirely, performing an instant zoom that preserves the center exactly (verified: zero coordinate drift across all zoom levels).
3. **Click debounce on pin-drop maps** — on maps with click-to-drop-pin (submit form, admin edit), the `map.on('click')` handler is delayed 300ms with a `_dblClickGuard` flag. Double-clicks trigger only the zoom; single clicks still drop pins after the debounce window. Without this, the two `click` events that precede a `dblclick` would move the marker, causing a visual shift between zoom actions.
**Caveat:** Double-click zoom is instant (no smooth animation). This is a deliberate tradeoff — the animation is what triggers the bug. Scroll wheel zoom and +/- buttons retain their default behavior (animations work correctly for those). If leaflet-rotate fixes the upstream CSS transform issue in a future version, the workaround can be removed by reverting `doubleClickZoom: false` and deleting the custom dblclick handlers.
**Files:** `public/js/map-picker.js` (lines ~108-120), `public/js/board-maps.js` (lines ~137-147)

---

## Resolved (This Session)

### AI rewrite saves original text instead of rewritten text
**Severity:** High
**Found:** 2026-02-12
**Status:** Fixed
**Details:** Tiptap's `editor.commands.setContent()` does not fire the `onUpdate` callback by default (`emitUpdate` defaults to `false`). The hidden `<input>` that forms submit was never synced with the rewritten content.
**Fix:** Editor instance now stores a `_hiddenInput` reference. After `setContent()`, the hidden input is explicitly synced. Additionally, a global form `submit` listener in `admin-init.js` force-syncs all editors before any form submission as a safety net.

### Grok 4.1 Fast and Gemini models fail on OpenRouter
**Severity:** High
**Found:** 2026-02-12
**Status:** Fixed
**Details:** Model ID typos in `AVAILABLE_MODELS`:
- `x-ai/grok-4-1-fast` (dash) → correct: `x-ai/grok-4.1-fast` (dot)
- `google/gemini-2.0-flash-001` → correct: `google/gemini-2.5-flash`
- `google/gemini-2.5-pro-preview-06-05` → correct: `google/gemini-2.5-pro`

### LLM rewrite returns raw markdown in Tiptap editor
**Severity:** Medium
**Found:** 2026-02-12
**Status:** Fixed
**Details:** LLMs naturally output markdown. Tiptap expects HTML. The rewritten text displayed with literal `**bold**` and `- list` markers instead of rendered formatting.
**Fix:** Added `mdToHtml()` server-side converter in `routes/admin.js` that transforms markdown (bold, italic, strikethrough, headings h1-h4, ordered/unordered lists, paragraphs) to HTML. If the LLM already returns HTML, it passes through untouched. Refactored 3 duplicated rewrite blocks into a shared `performRewrite()` helper.

### Admin actions (delete, approve, etc.) scroll page to top
**Severity:** Medium
**Found:** 2026-02-12
**Status:** Fixed
**Details:** All mod actions (delete, expire, approve, reject, pin, urgent) used form POST → server redirect → full page reload, which scrolled to the top of the page. Painful when moderating many posts.
**Fix:** Click interceptor on submit buttons POSTs via `fetch` instead. Delete/reject/expire/approve fade the post card out in-place. Pin/urgent toggle the button state without reload. Confirm dialogs still work (extracted from inline `onsubmit`). Falls back to normal navigation on fetch failure.

---

## Notes

- **Privacy invariant:** No PII is ever collected, stored, or logged. IP addresses are used only for in-memory rate limiting and one-way hashing (submitter tracking). This is non-negotiable.
- **Auth model:** Cookie-based session auth (signed, httpOnly). Super admin creds from env vars, mod creds from DB. No third-party auth.
- **Browser support:** Tested primarily in Chrome and Safari. Firefox and Edge should work but are not actively tested.
