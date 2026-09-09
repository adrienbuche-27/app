"""Backend tests for GPX upload / parse + Summit persistence with GPX route/profile."""
import io
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

SAMPLE_GPX = """<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
 <trk><name>Ventoux ride</name><trkseg>
  <trkpt lat="44.1225" lon="5.1806"><ele>300</ele></trkpt>
  <trkpt lat="44.1300" lon="5.2000"><ele>500</ele></trkpt>
  <trkpt lat="44.1400" lon="5.2200"><ele>800</ele></trkpt>
  <trkpt lat="44.1500" lon="5.2400"><ele>1100</ele></trkpt>
  <trkpt lat="44.1600" lon="5.2600"><ele>1500</ele></trkpt>
  <trkpt lat="44.1741" lon="5.2783"><ele>1909</ele></trkpt>
  <trkpt lat="44.1800" lon="5.2900"><ele>1700</ele></trkpt>
  <trkpt lat="44.1900" lon="5.3000"><ele>1400</ele></trkpt>
 </trkseg></trk>
</gpx>"""

GPX_NO_ELE = """<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
 <trk><trkseg>
  <trkpt lat="44.12" lon="5.18"/>
  <trkpt lat="44.14" lon="5.22"/>
  <trkpt lat="44.17" lon="5.27"/>
 </trkseg></trk>
</gpx>"""

SUMMIT_LAT = 44.1741
SUMMIT_LNG = 5.2783


@pytest.fixture
def created_ids():
    ids = []
    yield ids
    for sid in ids:
        try:
            requests.delete(f"{BASE_URL}/api/summits/{sid}", timeout=15)
        except Exception:
            pass


# --- /api/gpx/parse ---------------------------------------------------------
class TestGpxParse:
    def test_parse_with_elevation(self):
        files = {"file": ("s.gpx", SAMPLE_GPX, "application/gpx+xml")}
        data = {"summit_lat": SUMMIT_LAT, "summit_lng": SUMMIT_LNG}
        r = requests.post(f"{BASE_URL}/api/gpx/parse", files=files, data=data, timeout=30)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "points" in j and isinstance(j["points"], list) and len(j["points"]) >= 2
        assert all({"lat", "lng", "ele"} <= set(p.keys()) for p in j["points"])
        assert j["has_elevation"] is True
        # top is the point nearest summit -> the 44.1741/5.2783 one at index 5
        assert j["auto_end_idx"] == 5
        # base excludes descent (must be <= end)
        assert 0 <= j["auto_start_idx"] < j["auto_end_idx"]

    def test_parse_no_elevation(self):
        files = {"file": ("n.gpx", GPX_NO_ELE, "application/gpx+xml")}
        data = {"summit_lat": SUMMIT_LAT, "summit_lng": SUMMIT_LNG}
        r = requests.post(f"{BASE_URL}/api/gpx/parse", files=files, data=data, timeout=30)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["has_elevation"] is False
        assert len(j["points"]) >= 2

    def test_parse_malformed(self):
        files = {"file": ("bad.gpx", "not xml at all", "application/gpx+xml")}
        data = {"summit_lat": SUMMIT_LAT, "summit_lng": SUMMIT_LNG}
        r = requests.post(f"{BASE_URL}/api/gpx/parse", files=files, data=data, timeout=30)
        assert r.status_code == 400

    def test_parse_empty(self):
        files = {"file": ("e.gpx", "", "application/gpx+xml")}
        data = {"summit_lat": SUMMIT_LAT, "summit_lng": SUMMIT_LNG}
        r = requests.post(f"{BASE_URL}/api/gpx/parse", files=files, data=data, timeout=30)
        assert r.status_code == 400


# --- Summits with GPX persistence ------------------------------------------
class TestGpxSummit:
    def test_create_with_gpx_persists_route_profile(self, created_ids):
        route = [{"lat": 44.1225, "lng": 5.1806}, {"lat": 44.1500, "lng": 5.2400}, {"lat": 44.1741, "lng": 5.2783}]
        profile = [
            {"distance_km": 0, "elevation_m": 300},
            {"distance_km": 5.5, "elevation_m": 1100},
            {"distance_km": 12.0, "elevation_m": 1909},
        ]
        payload = {
            "name": "ZZTEST_GPX_Ventoux",
            "elevation": 1909,
            "lat": SUMMIT_LAT,
            "lng": SUMMIT_LNG,
            "distance_km": 12.0,
            "avg_gradient": 13.4,
            "max_gradient": 15.0,
            "has_gpx": True,
            "route": route,
            "profile": profile,
        }
        r = requests.post(f"{BASE_URL}/api/summits", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        j = r.json()
        sid = j["id"]
        created_ids.append(sid)
        assert j["has_gpx"] is True
        assert j["profile_status"] == "ok"
        assert isinstance(j["route"], list) and len(j["route"]) >= 2
        assert isinstance(j["profile"], list) and len(j["profile"]) >= 2

        # GET verifies persistence
        lst = requests.get(f"{BASE_URL}/api/summits", timeout=15).json()
        found = next((s for s in lst if s["id"] == sid), None)
        assert found is not None
        assert found["has_gpx"] is True
        assert found["profile_status"] == "ok"
        assert len(found["route"]) >= 2
        assert len(found["profile"]) >= 2

    def test_update_remove_gpx_clears_route(self, created_ids):
        # Create with GPX
        payload = {
            "name": "ZZTEST_GPX_Remove",
            "elevation": 1909,
            "lat": SUMMIT_LAT,
            "lng": SUMMIT_LNG,
            "has_gpx": True,
            "route": [{"lat": 44.12, "lng": 5.18}, {"lat": 44.1741, "lng": 5.2783}],
            "profile": [{"distance_km": 0, "elevation_m": 300}, {"distance_km": 10, "elevation_m": 1909}],
        }
        r = requests.post(f"{BASE_URL}/api/summits", json=payload, timeout=30)
        assert r.status_code == 200
        sid = r.json()["id"]
        created_ids.append(sid)

        # Update: remove GPX, no start point -> route null, profile none
        upd = {
            "name": "ZZTEST_GPX_Remove",
            "elevation": 1909,
            "lat": SUMMIT_LAT,
            "lng": SUMMIT_LNG,
            "has_gpx": False,
            "route": None,
            "profile": None,
        }
        r2 = requests.put(f"{BASE_URL}/api/summits/{sid}", json=upd, timeout=30)
        assert r2.status_code == 200, r2.text

        lst = requests.get(f"{BASE_URL}/api/summits", timeout=15).json()
        found = next((s for s in lst if s["id"] == sid), None)
        assert found is not None
        assert not found.get("has_gpx")
        assert found.get("route") in (None, [])
