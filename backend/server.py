import os
import uuid
import math
import asyncio
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional

import requests
import gpxpy
from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

from famous_cols import FAMOUS_COLS

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

# ---- Object Storage ---------------------------------------------------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "velosummit"
storage_key: Optional[str] = None


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---- Elevation profile (Open-Elevation) -------------------------------------
OPEN_ELEV_URL = "https://api.open-elevation.com/api/v1/lookup"
PROFILE_SAMPLES = 60


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _sample_points(start_lat: float, start_lng: float, end_lat: float, end_lng: float, n: int = PROFILE_SAMPLES):
    """Great-circle sampling; n>=2. Returns list[(lat,lng)]."""
    pts = []
    for i in range(n):
        t = i / (n - 1)
        lat = start_lat + (end_lat - start_lat) * t
        lng = start_lng + (end_lng - start_lng) * t
        pts.append((lat, lng))
    return pts


def _fetch_profile_sync(start_lat: float, start_lng: float, end_lat: float, end_lng: float):
    """Blocking Open-Elevation call. Returns (profile_list, status)."""
    try:
        pts = _sample_points(start_lat, start_lng, end_lat, end_lng)
        payload = {"locations": [{"latitude": la, "longitude": ln} for la, ln in pts]}
        resp = requests.post(OPEN_ELEV_URL, json=payload, timeout=25)
        resp.raise_for_status()
        results = resp.json().get("results", [])
        if len(results) < 2:
            return [], "failed"
        total_km = _haversine_km(start_lat, start_lng, end_lat, end_lng)
        profile = []
        for i, r in enumerate(results):
            d = total_km * (i / (len(results) - 1))
            profile.append({
                "distance_km": round(d, 3),
                "elevation_m": round(float(r.get("elevation") or 0), 1),
            })
        return profile, "ok"
    except Exception as e:
        logger.warning(f"Open-Elevation fetch failed: {e}")
        return [], "failed"


async def fetch_profile(start_lat, start_lng, end_lat, end_lng):
    return await asyncio.to_thread(_fetch_profile_sync, start_lat, start_lng, end_lat, end_lng)


# ---- Models -----------------------------------------------------------------
class SummitCreate(BaseModel):
    name: str
    region: Optional[str] = None
    country: Optional[str] = None
    elevation: float
    distance_km: Optional[float] = None
    avg_gradient: Optional[float] = None
    max_gradient: Optional[float] = None
    lat: float
    lng: float
    date_climbed: Optional[str] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    photo_path: Optional[str] = None
    famous_col_id: Optional[str] = None
    # Climb side
    side_name: Optional[str] = None
    start_lat: Optional[float] = None
    start_lng: Optional[float] = None
    # GPX-derived real climb (optional)
    has_gpx: Optional[bool] = False
    route: Optional[List[dict]] = None      # [{lat, lng}, ...] isolated climb line
    profile: Optional[List[dict]] = None    # [{distance_km, elevation_m}, ...] from GPX


class Summit(SummitCreate):
    id: str
    profile: Optional[List[dict]] = None
    profile_status: Optional[str] = None  # ok | failed | none


# ---- App --------------------------------------------------------------------
app = FastAPI()
api_router = APIRouter(prefix="/api")


@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@api_router.get("/")
async def root():
    return {"message": "VeloSummit API"}


@api_router.get("/famous-cols")
async def list_famous_cols():
    return FAMOUS_COLS


# ---- Summits CRUD -----------------------------------------------------------
def _clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


async def _apply_profile(doc: dict):
    """Choose the elevation profile for a summit.

    If a GPX-derived profile is provided, keep it. Otherwise fall back to the
    Open-Elevation straight-line estimate using the climb-side start point.
    """
    if doc.get("has_gpx") and doc.get("profile"):
        doc["profile_status"] = "ok"
        return
    if doc.get("start_lat") is not None and doc.get("start_lng") is not None:
        profile, status = await fetch_profile(
            doc["start_lat"], doc["start_lng"], doc["lat"], doc["lng"]
        )
        doc["profile"] = profile
        doc["profile_status"] = status
    else:
        doc["profile"] = None
        doc["profile_status"] = "none"


@api_router.get("/summits")
async def list_summits():
    docs = await db.summits.find({}, {"_id": 0}).sort("date_climbed", -1).to_list(2000)
    return docs


@api_router.post("/summits")
async def create_summit(payload: SummitCreate):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await _apply_profile(doc)
    await db.summits.insert_one(doc)
    return _clean(doc)


@api_router.put("/summits/{summit_id}")
async def update_summit(summit_id: str, payload: SummitCreate):
    existing = await db.summits.find_one({"id": summit_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Summit not found")
    update = payload.model_dump()
    # GPX profile provided -> keep it as-is
    if update.get("has_gpx") and update.get("profile"):
        update["profile_status"] = "ok"
    else:
        # Re-fetch profile if the previous summit had a GPX (now removed) OR the
        # start/summit point changed.
        needs_profile_refresh = (
            existing.get("has_gpx")
            or update.get("start_lat") != existing.get("start_lat")
            or update.get("start_lng") != existing.get("start_lng")
            or update.get("lat") != existing.get("lat")
            or update.get("lng") != existing.get("lng")
        )
        if needs_profile_refresh:
            await _apply_profile(update)
        else:
            update["profile"] = existing.get("profile")
            update["profile_status"] = existing.get("profile_status")
    await db.summits.update_one({"id": summit_id}, {"$set": update})
    update["id"] = summit_id
    return update


@api_router.delete("/summits/{summit_id}")
async def delete_summit(summit_id: str):
    res = await db.summits.delete_one({"id": summit_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Summit not found")
    return {"ok": True}


@api_router.post("/summits/{summit_id}/refresh-profile")
async def refresh_profile(summit_id: str):
    doc = await db.summits.find_one({"id": summit_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Summit not found")
    if doc.get("start_lat") is None or doc.get("start_lng") is None:
        raise HTTPException(400, "Summit has no start point — set a climb side first")
    profile, status = await fetch_profile(
        doc["start_lat"], doc["start_lng"], doc["lat"], doc["lng"]
    )
    await db.summits.update_one(
        {"id": summit_id},
        {"$set": {"profile": profile, "profile_status": status}},
    )
    return {"profile": profile, "profile_status": status}


# ---- GPX parsing / climb isolation ------------------------------------------
GPX_MAX_POINTS = 1500


def _parse_gpx_sync(text: str, summit_lat: float, summit_lng: float):
    gpx = gpxpy.parse(text)
    pts = []
    for track in gpx.tracks:
        for seg in track.segments:
            for p in seg.points:
                pts.append({"lat": p.latitude, "lng": p.longitude, "ele": p.elevation})
    if not pts:
        for route in gpx.routes:
            for p in route.points:
                pts.append({"lat": p.latitude, "lng": p.longitude, "ele": p.elevation})
    if len(pts) < 2:
        raise ValueError("No track points found in GPX")

    # Downsample to keep payload light and slider responsive.
    if len(pts) > GPX_MAX_POINTS:
        stride = math.ceil(len(pts) / GPX_MAX_POINTS)
        sampled = pts[::stride]
        if sampled[-1] is not pts[-1]:
            sampled.append(pts[-1])
        pts = sampled

    has_elevation = any(p["ele"] is not None for p in pts)

    # Top = point nearest the summit coordinates.
    top_idx = min(
        range(len(pts)),
        key=lambda i: _haversine_km(pts[i]["lat"], pts[i]["lng"], summit_lat, summit_lng),
    )

    # Base = lowest-elevation point before the top (start of sustained ascent).
    if has_elevation and top_idx > 0:
        base_idx = min(
            range(0, top_idx + 1),
            key=lambda i: pts[i]["ele"] if pts[i]["ele"] is not None else float("inf"),
        )
    else:
        base_idx = 0
    if base_idx >= top_idx:
        base_idx = 0

    return {
        "points": pts,
        "auto_start_idx": base_idx,
        "auto_end_idx": top_idx,
        "has_elevation": has_elevation,
    }


@api_router.post("/gpx/parse")
async def parse_gpx(
    file: UploadFile = File(...),
    summit_lat: float = Form(...),
    summit_lng: float = Form(...),
):
    raw = await file.read()
    text = raw.decode("utf-8", errors="ignore")
    try:
        result = await asyncio.to_thread(_parse_gpx_sync, text, summit_lat, summit_lng)
    except Exception as e:
        logger.warning(f"GPX parse failed: {e}")
        raise HTTPException(400, f"Could not parse GPX file: {e}") from e
    return result


# ---- Missing climbs ---------------------------------------------------------
@api_router.get("/missing-cols")
async def missing_cols():
    summits = await db.summits.find({}, {"_id": 0, "famous_col_id": 1, "name": 1}).to_list(2000)
    done_ids = {s.get("famous_col_id") for s in summits if s.get("famous_col_id")}
    done_names = {s["name"].lower().strip() for s in summits if s.get("name")}
    return [
        col for col in FAMOUS_COLS
        if col["id"] not in done_ids and col["name"].lower().strip() not in done_names
    ]


@api_router.get("/col-attempts")
async def col_attempts():
    """Return {col_id: [summit,...]} — all logged ascents per famous col."""
    summits = await db.summits.find({}, {"_id": 0}).sort("date_climbed", -1).to_list(5000)
    grouped: dict[str, list] = {}
    for s in summits:
        cid = s.get("famous_col_id")
        if not cid:
            # try match by name
            for c in FAMOUS_COLS:
                if s.get("name", "").lower().strip() == c["name"].lower().strip():
                    cid = c["id"]
                    break
        if not cid:
            continue
        grouped.setdefault(cid, []).append(s)
    return grouped


# ---- Statistics -------------------------------------------------------------
@api_router.get("/stats")
async def stats():
    summits = await db.summits.find({}, {"_id": 0}).to_list(5000)
    total = len(summits)
    total_elevation = sum(float(s.get("elevation") or 0) for s in summits)
    highest = max(summits, key=lambda s: float(s.get("elevation") or 0), default=None)
    total_distance = sum(float(s.get("distance_km") or 0) for s in summits)

    by_month: dict[str, int] = {}
    by_year: dict[str, int] = {}
    for s in summits:
        d = s.get("date_climbed")
        if not d:
            continue
        try:
            dt = datetime.fromisoformat(d.replace("Z", "").split("T")[0])
        except Exception:
            continue
        ym = dt.strftime("%Y-%m")
        y = dt.strftime("%Y")
        by_month[ym] = by_month.get(ym, 0) + 1
        by_year[y] = by_year.get(y, 0) + 1

    everest_m = 8848
    everests = total_elevation / everest_m if everest_m else 0

    return {
        "total_summits": total,
        "total_elevation_m": total_elevation,
        "total_distance_km": total_distance,
        "highest_peak": highest,
        "everests_climbed": round(everests, 3),
        "by_month": [{"month": k, "count": v} for k, v in sorted(by_month.items())],
        "by_year": [{"year": k, "count": v} for k, v in sorted(by_year.items())],
    }


# ---- Photo upload / serve ---------------------------------------------------
MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp",
}


@api_router.post("/upload")
async def upload_photo(file: UploadFile = File(...)):
    ext = (file.filename or "bin").rsplit(".", 1)[-1].lower()
    content_type = MIME_TYPES.get(ext, file.content_type or "application/octet-stream")
    path = f"{APP_NAME}/photos/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, content_type)
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size"),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"path": result["path"]}


@api_router.get("/photos/{path:path}")
async def get_photo(path: str):
    try:
        data, content_type = get_object(path)
    except requests.HTTPError as e:
        raise HTTPException(status_code=404, detail="File not found") from e
    return Response(content=data, media_type=content_type)


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
