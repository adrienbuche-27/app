# VeloSummit — Product Requirements

## Original problem statement
> Being an avid cyclist, I would like to create an interactive web app to record all the summits I did on my bike. The result would be a map with statistics as well and most notable climbs I am missing from my list.

## User choices (v1)
- Data source: **both** curated famous cols + user-added summits
- Map: **Leaflet + OpenStreetMap** (Esri Dark Gray Canvas base tiles, Streets + Terrain layers)
- Authentication: **none** (single-user personal app)
- Fields per summit: name, region, country, elevation, distance, avg/max gradient, date, duration, lat/lng, photo, notes, famous_col_id
- Stats: total summits, total elevation, highest peak, per year/month, Everest scale, map heatmap-style markers

## Architecture
- **Backend**: FastAPI, MongoDB (motor), Emergent Object Storage for photos
- **Frontend**: React 19, React-Leaflet, Recharts, Shadcn UI, Tailwind (dark obsidian theme + orange accent)
- **Routes**: `/api/famous-cols`, `/api/summits` (CRUD), `/api/missing-cols`, `/api/stats`, `/api/upload`, `/api/photos/{path}`

## Persona
- Avid cyclist logging conquered mountain passes and chasing legendary cols worldwide.

## What's implemented (2026-02)
- 15 curated legendary cols dataset with **2–3 climb sides each** (Ventoux/Bédoin/Malaucène/Sault, Stelvio/Prato/Bormio/Umbrail, Tourmalet W/E, Galibier N/S, Zoncolan 3 sides, etc.)
- Full summit CRUD with photo upload via Emergent Object Storage
- **Live elevation profiles** — every summit auto-fetches 60-point altitude-vs-distance profile from Open-Elevation on save; cached in Mongo, retry button on failure
- Interactive dark Leaflet map with conquered/missing/all filters; popups now show `via <side>` label and inline elevation profile chart
- Add/Edit summit dialog with "Climb from" section — dropdown of catalog sides, or free-text + optional start lat/lng for custom summits
- Statistics dashboard (KPIs, Everest scale, cumulative area chart, per-month + per-year bar charts, highest-peak card)
- Famous Cols catalog with search, region filter, side pills, quicklog CTA
- Missing Climb Matrix grouped by HC/Cat.1 categories
- Kinetic ticker with iconic col facts
- Iterations 1 → 3 all 100% pass (frontend + backend + Open-Elevation integration)

## Update 2026-06 — "Climb from" field rework (iteration 5, 100% pass)
- Climb-from dropdown now ALWAYS shows on every summit (with or without a famous col)
- Dropdown options are side NAMES ONLY (removed inline distance/gradient text)
- Added "➕ Add my own side…" manual entry option → reveals custom name text box + Start lat/lng boxes
- Preset side pick auto-fills Distance/Avg grad/Max grad/start point into the dedicated boxes, fully editable
- Dropdown selects reliably via native click (no force needed)

## Update 2026-06 — GPX Upload (real climb line) (iteration 6, 100% pass — backend 6/6, frontend 8/8)
- New "Real climb from GPX (optional)" section on the Log/Edit Summit form (`AddSummitDialog.jsx`)
- Backend `POST /api/gpx/parse` (gpxpy) parses a .gpx, isolates the climb: top = point nearest summit, base = lowest point before it; downsamples to ≤1500 pts; returns points + auto start/end indices + has_elevation
- `GpxTrimmer.jsx`: mini Leaflet map (full ride faint grey + isolated climb orange, green base / amber top dots), dual-thumb range slider to trim, live stats (distance / elev gain / avg & max gradient computed in `lib/gpx.js`)
- Trimming updates the map line, stats and the editable Distance/Avg grad/Max grad boxes live; preset auto-fill behaviour preserved
- On save, `route` (climb line) + `profile` (from real GPX elevations) stored on the summit; `has_gpx` flag set; `_apply_profile` keeps the GPX profile and skips Open-Elevation
- Main map (`MapView.jsx`) draws the orange route polyline for GPX summits; popup shows a "GPX route" badge + elevation profile
- Edit mode shows GPX badge with Replace / Remove (raw file not retained); Remove falls back to straight-line profile
- Scope: GPX only (FIT deferred), one file per summit; files without elevation draw the line but no profile

## Backlog (P1)
- Geographic map heatmap of visited summits (deferred from v1 stats)
- FIT file upload (binary format) — follow-up to GPX
- Color-coded gradient heatmap on the elevation profile (500m buckets)
- Compare two sides of the same col side-by-side
- Shareable "Summit Passport" card
- Strava sync

## P2
- Multi-user auth (Emergent Google login)
- Weather at summit on climb date
- Leaderboards / friends comparison
