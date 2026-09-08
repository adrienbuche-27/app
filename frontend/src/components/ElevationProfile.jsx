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
 * Elevation profile chart.
 * profile: [{ distance_km, elevation_m }, ...]
 * profile_status: "ok" | "failed" | "none" | undefined
 * size: "sm" | "md" | "lg"
 */
export default function ElevationProfile({
  profile,
  profile_status,
  size = "md",
  onRetry,
  canRetry = false,
}) {
  const height = size === "sm" ? 80 : size === "lg" ? 240 : 140;

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
            <linearGradient id="vs-elev-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF5722" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#FF5722" stopOpacity={0.02} />
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
            stroke="#FF5722"
            strokeWidth={2}
            fill="url(#vs-elev-grad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
