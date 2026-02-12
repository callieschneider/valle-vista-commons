# Valle Vista Commons — TODO

> Actionable items for the current/next work session. Not a roadmap — these are things that need doing NOW.
> For project overview and status, see [PROJECT.md](./PROJECT.md).

*Last updated: February 12, 2026*

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

### Map Picker for Posts (Location Pin Feature)
**Added:** 2026-02-12
**Context:** Allow users to select a location on an interactive map when submitting a tip/post. The selected pin should be stored with the post and displayed on the public board. Key requirements:

**Submission flow:**
- Embed an interactive map picker in the submit form so users can drop a pin on a location
- Store the selected coordinates (lat/lng) with the post
- Location selection should be optional (not all tips need a map)

**Mod capabilities:**
- Mods should be able to edit/move the pin location on any post from the admin dashboard
- Mods should be able to remove a pin if it's inaccurate or inappropriate

**Public board (viewer experience):**
- Each postcard with a location shows an embedded mini-map with the pin
- Viewers can pan/zoom the mini-map to get their bearings on where the deal/tip is
- Clicking the pin opens a popup showing the location name/address
- The popup includes a "Copy Address" button (copies the nearest address or coordinates)

**Technical considerations:**
- Evaluate map providers: Leaflet + OpenStreetMap (free, no API key), Mapbox, or Google Maps
- Reverse geocoding needed to resolve coordinates → nearest address for the copy feature
- Schema change required: add optional `latitude`, `longitude`, and `locationName` fields to Post model
- Privacy: no user location auto-detection — manual pin drop only
- Mobile-friendly map interactions

**Status:** PENDING

---

## LOW

*(No items yet)*

---

## DONE

*(Completed items move here with a completion date)*
