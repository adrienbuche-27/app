import os
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional

import requests
from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
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
    date_climbed: Optional[str] = None  # ISO string YYYY-MM-DD
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    photo_path: Optional[str] = None
    famous_col_id: Optional[str] = None


class Summit(SummitCreate):
    id: str


# ---- App --------------------------------------------------------------------
app = FastAPI()
api_router = APIRouter(prefix="/api")


@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logging.info("Object storage initialized")
    except Exception as e:
        logging.error(f"Storage init failed: {e}")


@api_router.get("/")
async def root():
    return {"message": "VeloSummit API"}


# ---- Famous cols ------------------------------------------------------------
@api_router.get("/famous-cols")
async def list_famous_cols():
    return FAMOUS_COLS


# ---- Summits CRUD -----------------------------------------------------------
def _serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


@api_router.get("/summits", response_model=List[Summit])
async def list_summits():
    docs = await db.summits.find({}, {"_id": 0}).sort("date_climbed", -1).to_list(2000)
    return docs


@api_router.post("/summits", response_model=Summit)
async def create_summit(payload: SummitCreate):
    summit_id = str(uuid.uuid4())
    doc = payload.model_dump()
    doc["id"] = summit_id
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.summits.insert_one(doc)
    return _serialize(doc)


@api_router.put("/summits/{summit_id}", response_model=Summit)
async def update_summit(summit_id: str, payload: SummitCreate):
    update = payload.model_dump()
    result = await db.summits.find_one_and_update(
        {"id": summit_id},
        {"$set": update},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Summit not found")
    return _serialize(result)


@api_router.delete("/summits/{summit_id}")
async def delete_summit(summit_id: str):
    res = await db.summits.delete_one({"id": summit_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Summit not found")
    return {"ok": True}


# ---- Missing climbs (comparison) --------------------------------------------
@api_router.get("/missing-cols")
async def missing_cols():
    summits = await db.summits.find({}, {"_id": 0, "famous_col_id": 1, "name": 1}).to_list(2000)
    done_ids = {s.get("famous_col_id") for s in summits if s.get("famous_col_id")}
    done_names = {s["name"].lower().strip() for s in summits if s.get("name")}
    missing = [
        col for col in FAMOUS_COLS
        if col["id"] not in done_ids and col["name"].lower().strip() not in done_names
    ]
    return missing


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

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
