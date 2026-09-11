import asyncio

from fastapi import APIRouter, HTTPException

from services.overpass import compute_pass_sides, find_passes_in_bbox

router = APIRouter(prefix="/discover")

# Keep bbox queries polite to the public Overpass instance — cap the search area
# (~roughly 1.4 degrees square, well over a mountain range) rather than the whole map.
MAX_BBOX_AREA_DEG2 = 2.0


@router.get("/passes")
async def discover_passes(south: float, west: float, north: float, east: float):
    if north <= south or east <= west:
        raise HTTPException(400, "Invalid bounding box")
    if (north - south) * (east - west) > MAX_BBOX_AREA_DEG2:
        raise HTTPException(400, "Search area too large — zoom in further")
    try:
        return await asyncio.to_thread(find_passes_in_bbox, south, west, north, east)
    except Exception as e:
        raise HTTPException(502, f"Overpass query failed: {e}") from e


@router.get("/passes/sides")
async def discover_pass_sides(lat: float, lng: float):
    try:
        sides = await compute_pass_sides(lat, lng)
    except Exception as e:
        raise HTTPException(502, f"Could not compute climb sides: {e}") from e
    return {"sides": sides}
