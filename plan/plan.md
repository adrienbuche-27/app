# Elevation Profiles & Climb Sides

## What is being added

1. **Climb side / route variant** on every summit entry — many famous cols can be climbed from more than one direction, and each direction is effectively a different ride (different distance, gradient, elevation gain). The app should treat the side as first-class metadata attached to a logged summit, not just free-text notes.

2. **Live elevation profile chart** on every summit — a small "pain curve" showing altitude vs. distance for that specific side of the climb. Data comes from Open-Elevation (free, public, no API key). The profile also shows on the map popup and the summit detail card.

## Decisions the user should confirm

### 1. How the side is chosen

Proposal: a dropdown on the Add/Edit form labeled **"Climb from"**. Options come from the famous-col catalog when a col is prefilled (e.g. Ventoux → Bédoin / Malaucène / Sault; Galibier → Valloire / Col du Lautaret). If the summit is user-created, the field is a free-text input (e.g. "east ridge").

Alternatives:
- (a) Free text only, no dropdown — simpler, less structured.
- (b) Force a side selection even for custom summits by asking for a start point on the map.

Proposal picks structured dropdown for catalog cols + free text for custom, so the catalog stays clean but users are never blocked.

### 2. Which sides are pre-defined in the catalog

To keep this v1, the catalog will carry **2–3 well-known sides per famous col**, with each side's own start lat/lng, distance, avg gradient, max gradient, and a short name. Examples:
- Mont Ventoux: Bédoin, Malaucène, Sault
- Alpe d'Huez: Bourg d'Oisans (classic)
- Stelvio: Prato (48 hairpins), Bormio, Umbrail
- Galibier: Valloire (north), Col du Lautaret (south)
- Tourmalet: Luz-Saint-Sauveur (west), Sainte-Marie-de-Campan (east)
- Angliru: single side (only one way up)
- Sa Calobra: single side (dead-end climb)
- Zoncolan: Ovaro, Sutrio, Priola

Every col gets at least one entry ("Classic ascent") so the UI is uniform. The user can push back on which cols get multiple sides.

### 3. How the elevation profile is drawn

Proposal:
- When a summit is saved, the backend calls Open-Elevation once with ~60 sampled points along the great-circle line from the side's start point to the summit lat/lng. The result (distance-vs-altitude array) is stored on the summit document so the chart loads instantly and offline afterwards.
- If Open-Elevation is down or slow, the summit still saves; the chart shows a "profile unavailable — retry" button that re-fetches on demand.
- Chart is a small area chart (Recharts) shown inside the map popup, the summit card, and a larger version on a per-summit detail view.

Alternative considered:
- Fetching on every page load — rejected because Open-Elevation has occasional 502s and no SLA; caching per summit gives instant, reliable charts.

### 4. Great-circle line vs. actual road

Open-Elevation only knows terrain, not roads. A straight line from base to summit will roughly match short direct climbs but will smooth over switchbacks on long ones. The "pain curve" will still capture the shape and total gain correctly; it just won't show every hairpin.

- Proposal: v1 uses the straight line. It's honest ("profile is an approximation") and free.
- Later: allow uploading a GPX file to replace the straight-line profile with the real route. Deferred.

The user should say if the approximation is acceptable for v1 or if GPX upload is required now.

### 5. Existing summits already in the log

Legacy summits saved before this change have no side and no profile. Proposal:
- Show them with side = "—".
- Add a "Fetch profile" button on their card that populates the elevation profile and lets the user pick a side.

## Assumptions being made (say so if wrong)

- Open-Elevation's public endpoint (`https://api.open-elevation.com/api/v1/lookup`) is acceptable — no self-hosting, no API key.
- 60 sample points per climb is a good tradeoff between chart smoothness and API load. Adjustable later.
- Distance for the profile is computed from the side's start lat/lng to the summit lat/lng, in a straight great-circle line.
- The chart's Y-axis is meters; X-axis is kilometers.
- Custom user summits (not from the catalog) still get a profile if the user provides a "start latitude/longitude" — a new optional pair of inputs on the form. If omitted, no profile is drawn.

## Out of scope for this iteration

- Uploading GPX / FIT files to draw the real route line on the map.
- Grading each 500m segment for a color-coded "steepness" heatmap on the profile.
- Comparing two sides of the same col side-by-side.
