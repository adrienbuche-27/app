from datetime import datetime

from fastapi import APIRouter

from db import db

router = APIRouter()


# ---- Statistics -------------------------------------------------------------
@router.get("/stats")
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
