// GPX climb-segment maths — isolates a climb from a full ride track.

export function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function downsample(arr, max) {
  if (arr.length <= max) return arr;
  const stride = Math.ceil(arr.length / max);
  const out = [];
  for (let i = 0; i < arr.length; i += stride) out.push(arr[i]);
  if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
  return out;
}

/**
 * Compute the isolated climb between two indices of a GPX track.
 * Returns route (lat/lng line), profile (distance/elevation), and stats.
 */
export function computeSegment(points, startIdx, endIdx) {
  const s = Math.max(0, Math.min(startIdx, endIdx));
  const e = Math.min(points.length - 1, Math.max(startIdx, endIdx));
  const seg = points.slice(s, e + 1);
  if (seg.length < 2) {
    return {
      route: [],
      profile: [],
      distance_km: 0,
      gain_m: 0,
      avg_gradient: null,
      max_gradient: null,
    };
  }

  const hasEle = seg.every((p) => p.ele !== null && p.ele !== undefined);

  // Cumulative distance + full profile
  let cum = 0;
  const profileFull = [];
  for (let i = 0; i < seg.length; i++) {
    if (i > 0) cum += haversineKm(seg[i - 1], seg[i]);
    profileFull.push({
      distance_km: Math.round(cum * 1000) / 1000,
      elevation_m: hasEle ? Math.round(seg[i].ele * 10) / 10 : null,
    });
  }
  const distance_km = cum;

  let gain_m = 0;
  let avg_gradient = null;
  let max_gradient = null;
  if (hasEle) {
    const net = seg[seg.length - 1].ele - seg[0].ele;
    gain_m = Math.max(0, net);
    avg_gradient =
      distance_km > 0 ? Math.round((net / (distance_km * 1000)) * 100 * 10) / 10 : null;

    // Max gradient over ~200m sliding windows
    let winDist = 0;
    let winRise = 0;
    let best = -Infinity;
    for (let i = 1; i < seg.length; i++) {
      const d = haversineKm(seg[i - 1], seg[i]) * 1000;
      winDist += d;
      winRise += seg[i].ele - seg[i - 1].ele;
      if (winDist >= 200) {
        const g = (winRise / winDist) * 100;
        if (g > best) best = g;
        winDist = 0;
        winRise = 0;
      }
    }
    if (best === -Infinity && distance_km > 0) {
      best = (net / (distance_km * 1000)) * 100;
    }
    max_gradient = best === -Infinity ? null : Math.round(best * 10) / 10;
  }

  const route = downsample(
    seg.map((p) => ({ lat: p.lat, lng: p.lng })),
    150
  );
  const profile = hasEle ? downsample(profileFull, 80) : [];

  return {
    route,
    profile,
    distance_km: Math.round(distance_km * 100) / 100,
    gain_m: Math.round(gain_m),
    avg_gradient,
    max_gradient,
  };
}
