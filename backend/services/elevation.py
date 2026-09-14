import asyncio
import logging

import requests

from services.geo import haversine_km

logger = logging.getLogger(__name__)

# ---- Elevation profile (Open-Elevation) -------------------------------------
OPEN_ELEV_URL = "https://api.open-elevation.com/api/v1/lookup"
PROFILE_SAMPLES = 60
ELEVATION_CHUNK = 100


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
        total_km = haversine_km(start_lat, start_lng, end_lat, end_lng)
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


def _fetch_elevations_sync(points: list) -> list:
    """Elevation for arbitrary (lat, lng) points, e.g. real road geometry. Chunked
    since Open-Elevation caps how many locations it accepts per request."""
    elevations: list = [None] * len(points)
    for start in range(0, len(points), ELEVATION_CHUNK):
        chunk = points[start:start + ELEVATION_CHUNK]
        payload = {"locations": [{"latitude": la, "longitude": ln} for la, ln in chunk]}
        try:
            resp = requests.post(OPEN_ELEV_URL, json=payload, timeout=25)
            resp.raise_for_status()
            results = resp.json().get("results", [])
            for i, r in enumerate(results):
                ele = r.get("elevation")
                elevations[start + i] = float(ele) if ele is not None else None
        except Exception as e:
            logger.warning(f"Elevation batch fetch failed: {e}")
    return elevations


async def fetch_elevations(points: list) -> list:
    return await asyncio.to_thread(_fetch_elevations_sync, points)
