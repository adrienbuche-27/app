from typing import List, Optional

from pydantic import BaseModel


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
    date_climbed: Optional[str] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    photo_path: Optional[str] = None
    famous_col_id: Optional[str] = None
    # Climb side
    side_name: Optional[str] = None
    start_lat: Optional[float] = None
    start_lng: Optional[float] = None
    # GPX-derived real climb (optional)
    has_gpx: Optional[bool] = False
    route: Optional[List[dict]] = None      # [{lat, lng}, ...] isolated climb line
    profile: Optional[List[dict]] = None    # [{distance_km, elevation_m}, ...] from GPX


class Summit(SummitCreate):
    id: str
    profile: Optional[List[dict]] = None
    profile_status: Optional[str] = None  # ok | failed | none
