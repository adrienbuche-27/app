import asyncio
import logging

import requests

from services.elevation import fetch_elevations
from services.geo import bearing_deg, compass_point, haversine_km, resample_points

logger = logging.getLogger(__name__)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
EXCLUDED_HIGHWAYS = {"footway", "path", "cycleway", "steps", "bridleway", "track", "pedestrian"}

MAX_SIDE_KM = 30.0
MIN_SIDE_KM = 1.5
GRADIENT_WINDOW_KM = 0.3


def _overpass_query(query: str) -> dict:
    resp = requests.post(OVERPASS_URL, data={"data": query}, timeout=30)
    resp.raise_for_status()
    return resp.json()


def _escape(value: str) -> str:
    return value.replace('"', "").replace("\\", "")


# ---- Step 1: discover named passes in a region ------------------------------
def find_passes_in_bbox(south: float, west: float, north: float, east: float, limit: int = 60) -> list:
    query = f"""
    [out:json][timeout:25];
    node["mountain_pass"="yes"]["name"]({south},{west},{north},{east});
    out body {limit};
    """
    data = _overpass_query(query)
    passes = []
    for el in data.get("elements", []):
        if el.get("type") != "node":
            continue
        tags = el.get("tags", {})
        ele = tags.get("ele")
        try:
            ele = float(ele) if ele is not None else None
        except ValueError:
            ele = None
        passes.append({
            "osm_id": el["id"],
            "name": tags.get("name"),
            "lat": el["lat"],
            "lng": el["lon"],
            "elevation": ele,
        })
    return passes


# ---- Step 2: find the road(s) crossing a given pass --------------------------
def _find_touching_ways(lat: float, lng: float, radius_m: int = 60) -> list:
    query = f"""
    [out:json][timeout:25];
    way(around:{radius_m},{lat},{lng})["highway"];
    out geom;
    """
    data = _overpass_query(query)
    ways = []
    for el in data.get("elements", []):
        if el.get("type") != "way":
            continue
        tags = el.get("tags", {})
        if tags.get("highway") in EXCLUDED_HIGHWAYS:
            continue
        geom = el.get("geometry")
        if not geom or len(geom) < 2:
            continue
        ways.append({
            "id": el["id"],
            "ref": tags.get("ref"),
            "name": tags.get("name"),
            "points": [(pt["lat"], pt["lon"]) for pt in geom],
        })
    return ways


# ---- Step 3: pull every segment of that same road within range ---------------
def _find_road_network(lat: float, lng: float, road_key: str, key_type: str, radius_m: int) -> list:
    tag = "ref" if key_type == "ref" else "name"
    key_filter = f'["{tag}"="{_escape(road_key)}"]'
    query = f"""
    [out:json][timeout:30];
    way["highway"]{key_filter}(around:{radius_m},{lat},{lng});
    out geom;
    """
    data = _overpass_query(query)
    ways = []
    for el in data.get("elements", []):
        if el.get("type") != "way":
            continue
        tags = el.get("tags", {})
        if tags.get("highway") in EXCLUDED_HIGHWAYS:
            continue
        geom = el.get("geometry")
        if not geom or len(geom) < 2:
            continue
        ways.append({"id": el["id"], "points": [(pt["lat"], pt["lon"]) for pt in geom]})
    return ways


def _endpoint_key(pt, precision: int = 5):
    return (round(pt[0], precision), round(pt[1], precision))


def _stitch_direction(seed_points: list, network: list, max_km: float, source_way_id=None) -> list:
    """Greedily extends seed_points (starting at the pass, heading outward) by
    chaining on network segments that share an endpoint, until max_km or a dead end.

    source_way_id excludes the way seed_points itself came from — the network query
    naturally re-returns it, and without this it can match itself at the pass-side
    endpoint and double back on its own path instead of extending outward."""
    used_way_ids = {source_way_id} if source_way_id is not None else set()
    path = list(seed_points)
    total_km = sum(haversine_km(*path[i - 1], *path[i]) for i in range(1, len(path)))

    guard = 0
    while total_km < max_km and guard < 40:
        guard += 1
        tail_key = _endpoint_key(path[-1])
        extended = False
        for way in network:
            if way["id"] in used_way_ids:
                continue
            pts = way["points"]
            if _endpoint_key(pts[0]) == tail_key:
                new_pts = pts[1:]
            elif _endpoint_key(pts[-1]) == tail_key:
                new_pts = list(reversed(pts))[1:]
            else:
                continue
            if not new_pts:
                continue
            prev = path[-1]
            for pt in new_pts:
                total_km += haversine_km(prev[0], prev[1], pt[0], pt[1])
                prev = pt
            path.extend(new_pts)
            used_way_ids.add(way["id"])
            extended = True
            break
        if not extended:
            break
    return path


def _climb_stats(points: list, elevations: list):
    """Distance/gradient derived from an ordered base->top polyline with elevations,
    mirroring how services/gpx.py isolates a climb from a full GPX track."""
    pts_with_ele = [(p, e) for p, e in zip(points, elevations) if e is not None]
    if len(pts_with_ele) < 2:
        return None

    cum_km = [0.0]
    for i in range(1, len(pts_with_ele)):
        cum_km.append(cum_km[-1] + haversine_km(*pts_with_ele[i - 1][0], *pts_with_ele[i][0]))

    top_i = len(pts_with_ele) - 1
    base_i = min(range(len(pts_with_ele)), key=lambda i: pts_with_ele[i][1])
    if base_i >= top_i:
        base_i = 0

    distance_km = cum_km[top_i] - cum_km[base_i]
    if distance_km < MIN_SIDE_KM:
        return None

    elevation_gain = pts_with_ele[top_i][1] - pts_with_ele[base_i][1]
    avg_gradient = (elevation_gain / (distance_km * 1000)) * 100 if distance_km else 0

    max_gradient = avg_gradient
    for i in range(base_i, top_i):
        for j in range(i + 1, top_i + 1):
            seg_km = cum_km[j] - cum_km[i]
            if seg_km < GRADIENT_WINDOW_KM:
                continue
            grade = ((pts_with_ele[j][1] - pts_with_ele[i][1]) / (seg_km * 1000)) * 100
            max_gradient = max(max_gradient, grade)
            break

    return {
        "distance_km": round(distance_km, 1),
        "avg_gradient": round(avg_gradient, 1),
        "max_gradient": round(max_gradient, 1),
        "start_lat": pts_with_ele[base_i][0][0],
        "start_lng": pts_with_ele[base_i][0][1],
    }


def _find_directions(lat: float, lng: float):
    touching = _find_touching_ways(lat, lng)
    directions = []  # (seed_points_outward_from_pass, source_way)
    for way in touching:
        pts = way["points"]
        idx = min(range(len(pts)), key=lambda i: haversine_km(lat, lng, pts[i][0], pts[i][1]))
        if idx > 0:
            directions.append((list(reversed(pts[: idx + 1])), way))
        if idx < len(pts) - 1:
            directions.append((pts[idx:], way))
    return directions


async def compute_pass_sides(lat: float, lng: float) -> list:
    directions = await asyncio.to_thread(_find_directions, lat, lng)
    if not directions:
        return []

    road_key, key_type = None, None
    for _, way in directions:
        if way.get("ref"):
            road_key, key_type = way["ref"], "ref"
            break
    if not road_key:
        for _, way in directions:
            if way.get("name"):
                road_key, key_type = way["name"], "name"
                break

    network = []
    if road_key:
        network = await asyncio.to_thread(
            _find_road_network, lat, lng, road_key, key_type, int(MAX_SIDE_KM * 1000)
        )

    sides = []
    for seed_points, way in directions:
        stitched = _stitch_direction(seed_points, network, MAX_SIDE_KM, source_way_id=way["id"])
        base_to_top = list(reversed(stitched))  # far end -> pass
        sampled = resample_points(base_to_top, 60)
        elevations = await fetch_elevations(sampled)
        stats = _climb_stats(sampled, elevations)
        if not stats:
            continue
        label = way.get("name") or way.get("ref") or "Approach"
        bearing = bearing_deg(lat, lng, stats["start_lat"], stats["start_lng"])
        sides.append({"name": f"{label} ({compass_point(bearing)})", **stats})
        if len(sides) >= 3:
            break
    return sides
