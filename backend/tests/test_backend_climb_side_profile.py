"""Backend tests for VeloSummit climb-side + elevation profile features."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://climb-map.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def created_ids():
    ids = []
    yield ids
    # teardown - delete created test summits
    for sid in ids:
        try:
            requests.delete(f"{API}/summits/{sid}", timeout=10)
        except Exception:
            pass


# ---- Famous cols catalog ----
class TestFamousCols:
    def test_sides_present_and_counts(self, client):
        r = client.get(f"{API}/famous-cols", timeout=15)
        assert r.status_code == 200
        cols = r.json()
        by_id = {c["id"]: c for c in cols}

        ventoux = by_id["mont-ventoux"]
        assert len(ventoux["sides"]) == 3
        names = {s["name"] for s in ventoux["sides"]}
        assert names == {"Bédoin", "Malaucène", "Sault"}
        for s in ventoux["sides"]:
            for k in ("start_lat", "start_lng", "distance_km", "avg_gradient", "max_gradient"):
                assert k in s and s[k] is not None

        assert len(by_id["alpe-dhuez"]["sides"]) == 1
        assert len(by_id["passo-dello-stelvio"]["sides"]) == 3


# ---- Create with start_lat/lng => fetches profile ----
class TestSummitProfile:
    def test_create_ventoux_bedoin_with_profile(self, client, created_ids):
        payload = {
            "name": "TEST_Mont Ventoux",
            "region": "Provence",
            "country": "France",
            "elevation": 1909,
            "lat": 44.1741,
            "lng": 5.2783,
            "start_lat": 44.1225,
            "start_lng": 5.1806,
            "side_name": "Bédoin",
            "famous_col_id": "mont-ventoux",
            "distance_km": 21.4,
            "avg_gradient": 7.5,
        }
        r = client.post(f"{API}/summits", json=payload, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        created_ids.append(data["id"])
        assert data["side_name"] == "Bédoin"
        assert data["start_lat"] == 44.1225
        # profile_status can be 'ok' or 'failed' (Open-Elevation flakiness allowed)
        assert data["profile_status"] in ("ok", "failed")
        if data["profile_status"] == "ok":
            profile = data["profile"]
            assert isinstance(profile, list)
            assert len(profile) >= 50
            # ascending distance
            dists = [p["distance_km"] for p in profile]
            assert dists == sorted(dists)
            assert all("elevation_m" in p for p in profile)
        else:
            pytest.skip("Open-Elevation upstream failed - graceful path OK")

    def test_get_persists_profile(self, client, created_ids):
        if not created_ids:
            pytest.skip("no summit created")
        r = client.get(f"{API}/summits", timeout=15)
        assert r.status_code == 200
        found = [s for s in r.json() if s["id"] == created_ids[0]]
        assert len(found) == 1
        assert found[0].get("side_name") == "Bédoin"

    def test_create_without_start_returns_none_status(self, client, created_ids):
        payload = {
            "name": "TEST_NoStart Summit",
            "elevation": 1200,
            "lat": 45.0,
            "lng": 6.0,
        }
        r = client.post(f"{API}/summits", json=payload, timeout=30)
        assert r.status_code == 200
        data = r.json()
        created_ids.append(data["id"])
        assert data["profile"] is None
        assert data["profile_status"] == "none"

    def test_put_notes_only_preserves_profile(self, client, created_ids):
        # find one with profile
        if not created_ids:
            pytest.skip()
        sid = created_ids[0]
        # fetch to get current
        cur = next(s for s in client.get(f"{API}/summits").json() if s["id"] == sid)
        original_profile = cur.get("profile")
        original_status = cur.get("profile_status")

        payload = {
            "name": cur["name"],
            "elevation": cur["elevation"],
            "lat": cur["lat"],
            "lng": cur["lng"],
            "start_lat": cur.get("start_lat"),
            "start_lng": cur.get("start_lng"),
            "side_name": cur.get("side_name"),
            "notes": "Updated notes only",
            "famous_col_id": cur.get("famous_col_id"),
        }
        r = client.put(f"{API}/summits/{sid}", json=payload, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["notes"] == "Updated notes only"
        # profile preserved (may be None if original was)
        assert data.get("profile") == original_profile
        assert data.get("profile_status") == original_status

    def test_refresh_profile_endpoint(self, client, created_ids):
        if not created_ids:
            pytest.skip()
        sid = created_ids[0]
        r = client.post(f"{API}/summits/{sid}/refresh-profile", timeout=60)
        assert r.status_code == 200
        data = r.json()
        assert "profile" in data
        assert data["profile_status"] in ("ok", "failed")

    def test_refresh_profile_400_when_no_start(self, client, created_ids):
        if len(created_ids) < 2:
            pytest.skip()
        sid = created_ids[1]  # second one has no start
        r = client.post(f"{API}/summits/{sid}/refresh-profile", timeout=15)
        assert r.status_code == 400
