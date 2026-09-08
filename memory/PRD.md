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
- 15 curated legendary cols dataset (Galibier, Ventoux, Stelvio, Tourmalet, Alpe d'Huez, Gavia, Mortirolo, Grossglockner, Teide, Pikes Peak, Iseran, Agnel, Angliru, Zoncolan, Sa Calobra)
- Full summit CRUD with photo upload via Emergent Object Storage
- Interactive dark Leaflet map with conquered/missing/all filters
- Add/Edit summit dialog with "prefill from famous col" dropdown
- Statistics dashboard (KPIs, Everest scale, cumulative area chart, per-month + per-year bar charts, highest-peak card)
- Famous Cols catalog with search, region filter, quicklog CTA
- Missing Climb Matrix grouped by HC/Cat.1 categories
- Kinetic ticker with iconic col facts
- 100% backend + frontend testing pass (iteration_1)

## Backlog (P1)
- Elevation profile chart per summit (fetch from Open-Elevation API)
- Strava GPX/FIT import
- Shareable "Summit Passport" card
- Draw route lines on map when GPS track is uploaded

## P2
- Multi-user auth (Emergent Google login)
- Weather at summit on climb date
- Leaderboards / friends comparison
