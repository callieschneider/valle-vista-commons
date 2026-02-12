# Valle Vista Commons — TODO

> Actionable items for the current/next work session. Not a roadmap — these are things that need doing NOW.
> For project overview and status, see [PROJECT.md](./PROJECT.md).

*Last updated: February 11, 2026*

---

## How to Use This File

**For agents:**
1. Read this file at the start of every session
2. Check for `IN PROGRESS` items — pick up where the last session left off
3. When starting work on an item, update its status to `IN PROGRESS`
4. When done, move the item to the **DONE** section with a `Completed` date
5. Add new items as they're discovered during work
6. Update `Last updated` date at the top when modifying this file

**Entry format:**
```
### [Short descriptive title]
**Added:** YYYY-MM-DD
**Context:** What needs to happen and why. Be specific.
**Status:** PENDING | IN PROGRESS | BLOCKED — [reason]
```

**Completed entry format:**
```
### [Short descriptive title]
**Added:** YYYY-MM-DD
**Completed:** YYYY-MM-DD
**Context:** What was done. Reference files changed if helpful.
**Status:** DONE
```

**Priority tiers:**
- **HIGH** — Blocking or urgent. Do these first.
- **MEDIUM** — Important but not blocking. Do after HIGH items.
- **LOW** — Nice to have. Do when HIGH/MEDIUM are clear.

---

## HIGH

*(No items yet)*

---

## MEDIUM

*(No items)*

---

## LOW

*(No items yet)*

---

## DONE

### Submit Form Validation UX
**Added:** 2026-02-11
**Completed:** 2026-02-11
**Context:** Added `*` required indicators to Title, Description, and Category labels. Replaced browser `alert()` with inline validation banner below submit button that lists missing fields, highlights errored field groups with red borders, and shakes on appear. Errors clear on interaction. No new dependencies.
**Status:** DONE

### Map Picker for Posts (Location Pin Feature)
**Added:** 2026-02-12
**Completed:** 2026-02-12
**Context:** Implemented interactive map picker using Leaflet + OpenStreetMap. Users can drop pins on submit form, mini-maps display on board postcards, mods can edit/remove pins in admin dashboard. Includes reverse geocoding via Nominatim and "Copy Address" button in map popups. Database migration added `latitude`, `longitude`, and `locationName` fields to Post model. Privacy-first: manual pin drop only, no auto-geolocation.
**Status:** DONE

### Anonymous Submitter Tracking (User Numbers)
**Added:** 2026-02-12
**Completed:** 2026-02-12
**Context:** Added Submitter model with auto-increment IDs. Public submissions compute a salted SHA-256 hash of the IP and map it to a sequential user number. Admin dashboard shows "User #N (X posts)" badges. Feature disabled when `AUTHOR_HASH_SALT` env var is not set.
**Status:** DONE
