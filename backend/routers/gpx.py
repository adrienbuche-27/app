import asyncio
import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from services.gpx import parse_gpx_points

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/gpx/parse")
async def parse_gpx(
    file: UploadFile = File(...),
    summit_lat: float = Form(...),
    summit_lng: float = Form(...),
):
    raw = await file.read()
    text = raw.decode("utf-8", errors="ignore")
    try:
        result = await asyncio.to_thread(parse_gpx_points, text, summit_lat, summit_lng)
    except Exception as e:
        logger.warning(f"GPX parse failed: {e}")
        raise HTTPException(400, f"Could not parse GPX file: {e}") from e
    return result
