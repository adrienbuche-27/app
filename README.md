# Here are your Instructions

## Local Development

VeloSummit is a FastAPI backend + React frontend, backed by MongoDB. Run all three locally:

### 1. MongoDB

```bash
docker run -d -p 27017:27017 --name velosummit-mongo mongo
```

(or point `MONGO_URL` below at an existing instance / Atlas cluster)

### 2. Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit if your Mongo isn't on localhost:27017
uvicorn server:app --reload --port 8000
```

Check it's up: `curl http://localhost:8000/api/` → `{"message":"VeloSummit API"}`

### 3. Frontend

```bash
cd frontend
yarn install
cp .env.example .env   # edit REACT_APP_BACKEND_URL if the backend isn't on :8000
yarn start
```

Opens at `http://localhost:3000`.

### Known local limitation

Photo upload (`POST /api/upload`, `GET /api/photos/{path}`) proxies through Emergent's
object-storage service (`backend/services/storage.py`), which requires an
`EMERGENT_LLM_KEY` and only responds inside the Emergent platform. Everything else —
summit CRUD, map, stats, famous cols, GPX upload, and elevation profiles (via the public
Open-Elevation API) — works fully locally.
