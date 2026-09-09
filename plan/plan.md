# Fix & Improve the "Climb From" Field

## Problem
On the Log/Edit Summit form, the "Climb From" dropdown does not work reliably, and it
only appears after a famous col is selected. It also crams distance and gradient into the
dropdown option text. The goal is a dropdown that always works, always shows, lists only
side names, lets a manual entry be typed, and leaves the numbers to the existing boxes.

## What will change

### 1. The dropdown always shows
- The "Climb From" selector appears for every summit, whether or not it is tied to a
  famous col.
- Options shown are the side names only (e.g. "Bédoin", "Malaucène", "Valloire (north)").
  No distance or gradient text inside the dropdown anymore.

### 2. A "type your own" option
- The dropdown includes a manual entry choice (e.g. "➕ Add my own side…").
- Choosing it reveals a text box to type a custom side name (e.g. "east ridge, from
  Chamonix").
- When no famous col is selected, the dropdown still offers this manual entry so any
  summit can have a named side.

### 3. Numbers live in the existing boxes
- Distance (km) and Avg Gradient (%) are entered/edited in the boxes already on the form,
  not inside the dropdown label.
- When a preset side is picked, Distance and Avg Gradient (and Max Gradient, start point)
  are auto-filled from the catalog as a convenience, and remain fully editable.
- When a manual side is typed, those boxes stay as whatever is entered (blank unless typed).

### 4. Start point kept for manual entries
- The Start latitude / Start longitude boxes remain available for manual side entries.
  These feed the elevation-profile lookup, so a hand-entered climb can still draw its
  profile.

### 5. Fix the non-working dropdown
- The selector will be made reliably clickable and selectable (the earlier overlay/interaction
  issue that blocked it will be resolved) so a choice actually registers and updates the form.

## Behavior summary
- Pick a famous col -> its sides fill the dropdown -> pick one -> name set, numbers/start
  auto-filled and editable.
- No famous col -> dropdown shows just the manual entry option -> type a side name -> fill
  distance, gradient and start point yourself.
- Either way, the numeric details always live in the dedicated boxes below, never inside
  the dropdown.

## Out of scope
- No change to which famous cols exist, the map, stats, or any other screen.
- The four previously deferred items (map heatmap, GPX/FIT upload, steepness heatmap,
  summit passport) are not part of this change.

## Assumption
- Preset sides auto-fill the numeric boxes but stay editable (per your choice), and the
  manual-entry option is available on every summit form.
