import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from db import db
from models import SummitCreate
from services.elevation import fetch_profile

router = APIRouter()


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


@router.get("/summits")
async def list_summits():
    docs = await db.summits.find({}, {"_id": 0}).sort("date_climbed", -1).to_list(2000)
    return docs


@router.post("/summits")
async def create_summit(payload: SummitCreate):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await _apply_profile(doc)
    await db.summits.insert_one(doc)
    return _clean(doc)


@router.put("/summits/{summit_id}")
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


@router.delete("/summits/{summit_id}")
async def delete_summit(summit_id: str):
    res = await db.summits.delete_one({"id": summit_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Summit not found")
    return {"ok": True}


@router.post("/summits/{summit_id}/refresh-profile")
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
