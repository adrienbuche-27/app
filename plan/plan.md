# GPX Upload — Draw the Real Climb on the Map

## Goal
Let a summit carry a real recorded track (GPX file) so the map draws the actual road
you rode up instead of a straight line from base to summit — and so the elevation
profile reflects the real ascent. Because a GPX often covers a whole ride (café stop,
descent, a second climb), the app will isolate just the climb that belongs to this
summit and use that.

## How it works for you
1. On the Log / Edit Summit form there is a new "Upload GPX" control.
2. You pick a `.gpx` file exported from Strava, Garmin, Komoot, Wahoo, etc.
3. The app reads the track, finds the climb that ends at this summit, and isolates it
   from the rest of the ride.
4. You see a preview: the isolated climb drawn on a mini map, plus its distance,
   elevation gained and average gradient. If the auto-pick looks off, you can nudge the
   start and end points (see "Trimming" below) until the climb is right.
5. On save, that real climb line replaces the straight base→summit line on the main map,
   and the elevation profile is rebuilt from the real GPX elevations (no more
   Open-Elevation straight-line estimate for GPX summits).

## Isolating the climb (the important part)
The uploaded ride may be longer than the climb. The app isolates the climb like this:
- It finds the point on the track nearest this summit's coordinates — that's the top.
- It walks backwards from the top to the lowest point before the sustained ascent
  begins — that's the base.
- The stretch between base and top is "the climb"; everything else in the ride is set
  aside.

This auto-detection is a best-effort guess and can be imperfect (rolling approaches,
false flats, GPS noise). So:

**Trimming (manual override).** The preview includes a simple two-handle range slider
over the track. You can drag the start handle and the end handle to set exactly where
the climb begins and ends. The map line, distance, elevation and gradient update live as
you drag. Auto-detection just sets the handles' initial position.

## What the numbers do
- Distance, elevation gained and average gradient computed from the isolated climb
  **auto-fill the existing boxes** on the form and stay editable, same behaviour as
  picking a preset side today.
- Max gradient is estimated from the steepest stretch of the isolated climb.

## What the map shows
- The isolated climb is drawn as the route line for that summit (replacing the straight
  line).
- The rest of the ride (approach, descent, other climbs) is **not** shown — only the
  climb. (Assumption; can instead show the discarded part as a faint grey line if you
  prefer context.)

## Removing / replacing
- A summit that has a GPX shows a small "GPX route" badge. You can upload a different
  file to replace it, or remove it to fall back to the straight-line profile.

## Scope
- Works for both famous-col summits and your own custom summits.
- Accepts standard `.gpx` track files with elevation data. Files without elevation still
  draw the route line but can't build an elevation profile.
- Only the climb segment's points are kept for drawing and the profile; the raw file
  itself is not retained after parsing.

## Out of scope
- No `.fit` support in this round (FIT is a binary format; GPX first). Can follow later.
- No auto-matching a GPX to an existing summit / bulk import — one file per summit form.
- The other deferred items (map heatmap, steepness colour profile, summit passport) are
  not part of this change.

## Decisions to confirm or push back on
1. **Manual trimming included.** Auto-detect sets the start/end, and you can drag handles
   to correct it. (Alternative: auto-only, no manual control — simpler but wrong more
   often on messy rides.)
2. **Only the climb is drawn**, the rest of the ride is discarded from view. (Alternative:
   show the discarded portion as a faint line for context.)
3. **GPX-derived distance/gradient overwrite the form boxes** (editable). (Alternative:
   leave your typed numbers untouched and only draw the line.)
4. **GPX only this round**, FIT later.
