import React, { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from "react-leaflet";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { MapPin, Flag, X } from "lucide-react";

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (!positions.length) return;
    const t = setTimeout(() => {
      map.invalidateSize();
      const bounds = positions.map((p) => [p.lat, p.lng]);
      try {
        map.fitBounds(bounds, { padding: [20, 20] });
      } catch {
        /* ignore */
      }
    }, 120);
    return () => clearTimeout(t);
  }, [positions, map]);
  return null;
}

export default function GpxTrimmer({ points, range, onRangeChange, seg, hasElevation, onRemove }) {
  const fullLine = useMemo(() => points.map((p) => [p.lat, p.lng]), [points]);
  const climbLine = useMemo(
    () => points.slice(range[0], range[1] + 1).map((p) => [p.lat, p.lng]),
    [points, range]
  );
  const startPt = points[range[0]];
  const endPt = points[range[1]];

  return (
    <div
      data-testid="gpx-trimmer"
      className="mt-3 rounded-xl border border-orange-500/30 bg-slate-900/60 p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-[11px] font-mono-tel uppercase tracking-wider text-orange-300">
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5">
            GPX route
          </span>
          <span className="text-slate-500">drag handles to trim the climb</span>
        </div>
        <button
          type="button"
          data-testid="gpx-remove-btn"
          onClick={onRemove}
          className="text-slate-400 hover:text-red-300 flex items-center gap-1 text-[11px]"
        >
          <X className="w-3.5 h-3.5" /> Remove
        </button>
      </div>

      <div className="h-44 rounded-lg overflow-hidden border border-slate-800">
        <MapContainer
          center={startPt ? [startPt.lat, startPt.lng] : [45.5, 6.5]}
          zoom={11}
          scrollWheelZoom={false}
          dragging
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            maxZoom={16}
          />
          <Polyline positions={fullLine} pathOptions={{ color: "#475569", weight: 2, opacity: 0.5 }} />
          <Polyline positions={climbLine} pathOptions={{ color: "#FF5722", weight: 4 }} />
          {startPt && (
            <CircleMarker
              center={[startPt.lat, startPt.lng]}
              radius={6}
              pathOptions={{ color: "#10B981", fillColor: "#10B981", fillOpacity: 1 }}
            />
          )}
          {endPt && (
            <CircleMarker
              center={[endPt.lat, endPt.lng]}
              radius={6}
              pathOptions={{ color: "#F59E0B", fillColor: "#F59E0B", fillOpacity: 1 }}
            />
          )}
          <FitBounds positions={climbLine.map(([lat, lng]) => ({ lat, lng }))} />
        </MapContainer>
      </div>

      {/* Range slider */}
      <div className="mt-4 px-1">
        <SliderPrimitive.Root
          data-testid="gpx-range-slider"
          className="relative flex w-full touch-none select-none items-center"
          min={0}
          max={Math.max(1, points.length - 1)}
          step={1}
          value={range}
          minStepsBetweenThumbs={1}
          onValueChange={onRangeChange}
        >
          <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-slate-700">
            <SliderPrimitive.Range className="absolute h-full bg-orange-500" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            data-testid="gpx-handle-start"
            aria-label="Climb start"
            className="block h-4 w-4 rounded-full border-2 border-emerald-400 bg-slate-950 shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          />
          <SliderPrimitive.Thumb
            data-testid="gpx-handle-end"
            aria-label="Climb top"
            className="block h-4 w-4 rounded-full border-2 border-amber-400 bg-slate-950 shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          />
        </SliderPrimitive.Root>
        <div className="flex justify-between mt-1.5 text-[10px] font-mono-tel uppercase tracking-wider text-slate-500">
          <span className="flex items-center gap-1 text-emerald-400">
            <MapPin className="w-3 h-3" /> Base
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            Top <Flag className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* Live stats */}
      <div className="mt-3 grid grid-cols-4 gap-2 font-mono-tel">
        <Stat label="Distance" value={`${seg.distance_km}km`} testid="gpx-stat-distance" />
        <Stat
          label="Elev gain"
          value={hasElevation ? `${seg.gain_m}m` : "—"}
          testid="gpx-stat-gain"
        />
        <Stat
          label="Avg grade"
          value={seg.avg_gradient != null ? `${seg.avg_gradient}%` : "—"}
          testid="gpx-stat-avg"
        />
        <Stat
          label="Max grade"
          value={seg.max_gradient != null ? `${seg.max_gradient}%` : "—"}
          testid="gpx-stat-max"
        />
      </div>
      {!hasElevation && (
        <p className="text-[11px] text-amber-300/80 mt-2">
          This GPX has no elevation data — the route line is drawn but no profile can be built.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, testid }) {
  return (
    <div className="rounded-lg bg-slate-950/60 border border-slate-800 px-2 py-1.5 text-center">
      <div className="text-[8px] uppercase tracking-wider text-slate-500">{label}</div>
      <div data-testid={testid} className="text-orange-400 font-bold text-sm">
        {value}
      </div>
    </div>
  );
}
