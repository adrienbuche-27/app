import math

import gpxpy

from services.geo import haversine_km

# ---- GPX parsing / climb isolation ------------------------------------------
GPX_MAX_POINTS = 1500


def parse_gpx_points(text: str, summit_lat: float, summit_lng: float) -> dict:
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
        key=lambda i: haversine_km(pts[i]["lat"], pts[i]["lng"], summit_lat, summit_lng),
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
