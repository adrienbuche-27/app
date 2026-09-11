import math


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def bearing_deg(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lng2 - lng1)
    x = math.sin(dl) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dl)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def compass_point(bearing: float) -> str:
    dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    return dirs[round(bearing / 45) % 8]


def resample_points(points: list, n: int = 60) -> list:
    """Pick ~n points evenly spaced by cumulative distance along an ordered polyline."""
    if len(points) <= n:
        return points
    cum = [0.0]
    for i in range(1, len(points)):
        cum.append(cum[-1] + haversine_km(*points[i - 1], *points[i]))
    total = cum[-1]
    if total == 0:
        return [points[0]]
    out = []
    j = 0
    for k in range(n):
        target = total * k / (n - 1)
        while j < len(cum) - 1 and cum[j + 1] < target:
            j += 1
        out.append(points[j])
    if out[-1] != points[-1]:
        out[-1] = points[-1]
    return out
