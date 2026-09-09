import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

/**
 * Elevation profile chart with steepness colouring.
 * profile: [{ distance_km, elevation_m }, ...]
 * profile_status: "ok" | "failed" | "none" | undefined
 * size: "sm" | "md" | "lg"
 */

// Gradient % -> colour. Green (gentle) through yellow/orange to red (brutal).
function steepColor(grad) {
  const g = Math.max(0, Math.abs(grad));
  // 0% -> hue 130 (green); >=15% -> hue 0 (red)
  const hue = Math.max(0, 130 - (Math.min(g, 15) / 15) * 130);
  const light = 52 - Math.min(g, 15) * 0.6; // steeper = slightly deeper
  return `hsl(${Math.round(hue)}, 85%, ${Math.round(light)}%)`;
}

function buildStops(profile) {
  const total = profile[profile.length - 1].distance_km || 1;
  const stops = [];
  for (let i = 0; i < profile.length; i++) {
    const prev = profile[Math.max(0, i - 1)];
    const cur = profile[i];
    const dDist = (cur.distance_km - prev.distance_km) * 1000; // m
    const dEle = (cur.elevation_m ?? 0) - (prev.elevation_m ?? 0);
    const grad = dDist > 0 ? (dEle / dDist) * 100 : 0;
    const offset = Math.min(100, Math.max(0, (cur.distance_km / total) * 100));
    stops.push({ offset, color: steepColor(grad) });
  }
  return stops;
}

export default function ElevationProfile({
  profile,
  profile_status,
  size = "md",
  onRetry,
  canRetry = false,
}) {
  const height = size === "sm" ? 80 : size === "lg" ? 240 : 140;
  const uid = React.useId().replace(/:/g, "");
  const strokeId = `vs-stroke-${uid}`;
  const fillId = `vs-fill-${uid}`;

  if (!profile || profile.length < 2) {
    if (profile_status === "failed") {
      return (
        <div
          data-testid="profile-failed"
          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-300 flex items-center justify-between gap-3"
        >
          <span>Profile unavailable</span>
          {canRetry && (
            <button
              data-testid="profile-retry-btn"
              onClick={onRetry}
              className="text-orange-400 hover:text-orange-300 font-mono-tel uppercase text-[10px] tracking-wider"
            >
              Retry
            </button>
          )}
        </div>
      );
    }
    if (canRetry) {
      return (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-500 flex items-center justify-between gap-3">
          <span>No profile yet — set a climb side</span>
          <button
            data-testid="profile-fetch-btn"
            onClick={onRetry}
            className="text-orange-400 hover:text-orange-300 font-mono-tel uppercase text-[10px] tracking-wider"
          >
            Fetch
          </button>
        </div>
      );
    }
    return null;
  }

  const first = profile[0].elevation_m;
  const last = profile[profile.length - 1].elevation_m;
  const gain = Math.max(0, last - first);
  const total = profile[profile.length - 1].distance_km;
  const stops = buildStops(profile);

  return (
    <div data-testid="elevation-profile" className="w-full">
      <div className="flex items-center justify-between mb-1.5 font-mono-tel text-[10px] uppercase tracking-widest text-slate-500">
        <span>Elevation profile</span>
        <span className="text-orange-400">
          +{Math.round(gain)}m over {total.toFixed(1)}km
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={profile} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
          <defs>
            {/* Horizontal steepness gradient for the line */}
            <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
              {stops.map((s, i) => (
                <stop key={i} offset={`${s.offset}%`} stopColor={s.color} />
              ))}
            </linearGradient>
            {/* Same colours, translucent, for the fill */}
            <linearGradient id={fillId} x1="0" y1="0" x2="1" y2="0">
              {stops.map((s, i) => (
                <stop key={i} offset={`${s.offset}%`} stopColor={s.color} stopOpacity={0.28} />
              ))}
            </linearGradient>
          </defs>
          {size !== "sm" && (
            <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
          )}
          <XAxis
            dataKey="distance_km"
            type="number"
            domain={[0, "dataMax"]}
            stroke="#64748B"
            fontSize={9}
            tickFormatter={(v) => `${v.toFixed(0)}km`}
            hide={size === "sm"}
          />
          <YAxis stroke="#64748B" fontSize={9} tickFormatter={(v) => `${Math.round(v)}`} hide={size === "sm"} />
          {size !== "sm" && (
            <Tooltip
              contentStyle={{
                background: "#0f172a",
                border: "1px solid #1E293B",
                borderRadius: 10,
                fontSize: 11,
              }}
              labelFormatter={(v) => `${Number(v).toFixed(1)} km`}
              formatter={(v) => [`${Math.round(v)} m`, "Altitude"]}
            />
          )}
          <Area
            type="monotone"
            dataKey="elevation_m"
            stroke={`url(#${strokeId})`}
            strokeWidth={size === "sm" ? 2 : 2.5}
            fill={`url(#${fillId})`}
          />
        </AreaChart>
      </ResponsiveContainer>

      {size !== "sm" && (
        <div
          data-testid="steepness-legend"
          className="flex items-center gap-2 mt-2 font-mono-tel text-[9px] uppercase tracking-wider text-slate-500"
        >
          <span>Gentle</span>
          <div
            className="h-1.5 flex-1 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, hsl(130,85%,52%), hsl(80,85%,48%), hsl(45,85%,45%), hsl(20,85%,44%), hsl(0,85%,43%))",
            }}
          />
          <span>Brutal</span>
        </div>
      )}
    </div>
  );
}
