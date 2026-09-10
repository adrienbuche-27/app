from fastapi import APIRouter

from db import db
from famous_cols import FAMOUS_COLS

router = APIRouter()


@router.get("/famous-cols")
async def list_famous_cols():
    return FAMOUS_COLS


# ---- Missing climbs ---------------------------------------------------------
@router.get("/missing-cols")
async def missing_cols():
    summits = await db.summits.find({}, {"_id": 0, "famous_col_id": 1, "name": 1}).to_list(2000)
    done_ids = {s.get("famous_col_id") for s in summits if s.get("famous_col_id")}
    done_names = {s["name"].lower().strip() for s in summits if s.get("name")}
    return [
        col for col in FAMOUS_COLS
        if col["id"] not in done_ids and col["name"].lower().strip() not in done_names
    ]


@router.get("/col-attempts")
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
