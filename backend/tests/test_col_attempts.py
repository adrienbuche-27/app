"""Tests for /api/col-attempts and multi-attempt lifecycle for VeloSummit."""
import os
import pytest
import requests

from dotenv import dotenv_values
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/")


@pytest.fixture
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def cleanup():
    created = []
    yield created
    for sid in created:
        try:
            requests.delete(f"{BASE_URL}/api/summits/{sid}", timeout=15)
        except Exception:
            pass


VENTOUX = {
    "id": "mont-ventoux",
    "name": "Mont Ventoux",
    "region": "Provence",
    "country": "France",
    "elevation": 1909,
    "lat": 44.1741,
    "lng": 5.2783,
}


def _payload(side_name, start_lat, start_lng, distance, avg, mx, date):
    return {
        **{k: v for k, v in VENTOUX.items() if k != "id"},
        "famous_col_id": "mont-ventoux",
        "side_name": side_name,
        "start_lat": start_lat,
        "start_lng": start_lng,
        "distance_km": distance,
        "avg_gradient": avg,
        "max_gradient": mx,
        "date_climbed": date,
    }


def test_col_attempts_endpoint_shape(api):
    r = api.get(f"{BASE_URL}/api/col-attempts", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)


def test_multiple_attempts_lifecycle_and_missing_matrix(api, cleanup):
    # baseline
    before = api.get(f"{BASE_URL}/api/col-attempts", timeout=15).json()
    baseline_count = len(before.get("mont-ventoux", []))

    # Attempt 1: Bédoin
    p1 = _payload("Bédoin", 44.1225, 5.1806, 21.4, 7.5, 12.0, "2025-06-01")
    r1 = api.post(f"{BASE_URL}/api/summits", json=p1, timeout=60)
    assert r1.status_code == 200, r1.text
    s1 = r1.json()
    assert "id" in s1 and s1["famous_col_id"] == "mont-ventoux"
    cleanup.append(s1["id"])

    # Attempt 2: Malaucène - MUST be a NEW summit (POST) not update
    p2 = _payload("Malaucène", 44.1747, 5.1339, 21.2, 7.2, 12.0, "2025-07-15")
    r2 = api.post(f"{BASE_URL}/api/summits", json=p2, timeout=60)
    assert r2.status_code == 200, r2.text
    s2 = r2.json()
    assert s2["id"] != s1["id"], "Second POST must create a new summit"
    cleanup.append(s2["id"])

    # Verify col-attempts groups both
    after = api.get(f"{BASE_URL}/api/col-attempts", timeout=15).json()
    ventoux_rides = after.get("mont-ventoux", [])
    assert len(ventoux_rides) == baseline_count + 2
    sides = {r.get("side_name") for r in ventoux_rides}
    assert "Bédoin" in sides and "Malaucène" in sides

    # Each entry must be a full summit object
    for r in ventoux_rides:
        assert "id" in r and "name" in r and "date_climbed" in r
        assert "_id" not in r  # no leaked mongo id

    # Regression: Missing Matrix must NOT include mont-ventoux
    missing = api.get(f"{BASE_URL}/api/missing-cols", timeout=15).json()
    ids = [c["id"] for c in missing]
    assert "mont-ventoux" not in ids, "Ventoux should not appear in missing after being climbed"

    # And even climbed twice, still just excluded — nothing duplicated
    assert len(ids) == len(set(ids)), "missing-cols must not have duplicate ids"
