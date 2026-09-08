import React, { useMemo, useState } from "react";
import { Check, MapPin, Search, Plus, RefreshCw } from "lucide-react";

export default function FamousColsView({ cols, conqueredIds, attempts = {}, onQuickLog }) {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("all");

  const regions = useMemo(() => {
    const set = new Set(cols.map((c) => c.region).filter(Boolean));
    return ["all", ...[...set].sort()];
  }, [cols]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return cols.filter((c) => {
      if (region !== "all" && c.region !== region) return false;
      if (!needle) return true;
      return (
        c.name.toLowerCase().includes(needle) ||
        c.country?.toLowerCase().includes(needle) ||
        c.region?.toLowerCase().includes(needle)
      );
    });
  }, [cols, q, region]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            data-testid="catalog-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Galibier, Stelvio, Alps…"
            className="w-full pl-9 pr-4 py-2.5 rounded-full bg-slate-900 border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500/60"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {regions.map((r) => (
            <button
              key={r}
              data-testid={`region-filter-${r}`}
              onClick={() => setRegion(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium font-mono-tel uppercase tracking-wider transition-[background-color] ${
                region === r
                  ? "bg-orange-500 text-white"
                  : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => {
          const done = conqueredIds.has(c.id);
          const rides = attempts[c.id] || [];
          const rideCount = rides.length;
          return (
            <div key={c.id} className="card-vs p-5" data-testid={`col-${c.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display font-bold text-lg leading-tight">{c.name}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {c.region}, {c.country}
                  </div>
                </div>
                {done ? (
                  <span className="pill pill-emerald" data-testid={`done-pill-${c.id}`}>
                    <Check className="w-3 h-3" /> {rideCount} ride{rideCount === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span className="pill pill-amber">Bucket</span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 font-mono-tel text-xs">
                <Metric label="Elev" value={`${c.elevation}m`} accent="orange" />
                <Metric
                  label="Dist"
                  value={c.sides?.[0]?.distance_km ? `${c.sides[0].distance_km}km` : "—"}
                />
                <Metric
                  label="Grade"
                  value={c.sides?.[0]?.avg_gradient ? `${c.sides[0].avg_gradient}%` : "—"}
                />
                <Metric label="Cat" value={c.category} />
              </div>
              {c.sides && c.sides.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.sides.map((s) => {
                    const climbed = rides.some((r) => r.side_name === s.name);
                    return (
                      <span
                        key={s.name}
                        data-testid={`side-pill-${c.id}-${s.name}`}
                        className={`text-[10px] font-mono-tel uppercase tracking-wider rounded-full px-2 py-0.5 border ${
                          climbed
                            ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
                            : "text-slate-400 bg-slate-900 border-slate-800"
                        }`}
                      >
                        {climbed && "✓ "}
                        {s.name}
                      </span>
                    );
                  })}
                </div>
              )}
              <p className="mt-3 text-xs text-slate-400 italic">{c.history}</p>

              {rideCount > 0 && (
                <div
                  data-testid={`attempts-list-${c.id}`}
                  className="mt-3 rounded-lg border border-slate-800 bg-slate-900/40 p-2 space-y-1"
                >
                  <div className="text-[10px] font-mono-tel uppercase tracking-wider text-slate-500 mb-1">
                    Your ascents
                  </div>
                  {rides.slice(0, 4).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between text-[11px] text-slate-300"
                    >
                      <span className="truncate">
                        {r.date_climbed || "—"}
                        {r.side_name ? (
                          <span className="text-slate-500"> · {r.side_name}</span>
                        ) : null}
                      </span>
                      {r.duration_minutes ? (
                        <span className="font-mono-tel text-slate-500">
                          {Math.floor(r.duration_minutes / 60)}h
                          {(r.duration_minutes % 60).toString().padStart(2, "0")}
                        </span>
                      ) : null}
                    </div>
                  ))}
                  {rideCount > 4 && (
                    <div className="text-[10px] text-slate-500">
                      +{rideCount - 4} more
                    </div>
                  )}
                </div>
              )}

              <button
                data-testid={done ? `relog-${c.id}` : `quicklog-${c.id}`}
                onClick={() => onQuickLog(c)}
                className={`mt-4 w-full py-2 rounded-lg inline-flex items-center justify-center gap-2 text-sm font-semibold transition-[background-color,color,border-color] border ${
                  done
                    ? "bg-slate-900 border-slate-800 text-emerald-300 hover:bg-emerald-500 hover:text-white hover:border-emerald-500"
                    : "bg-slate-900 border-slate-800 text-slate-200 hover:bg-orange-500 hover:text-white hover:border-orange-500"
                }`}
              >
                {done ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" /> Log another ascent
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" /> Mark as Conquered
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`font-semibold ${accent === "orange" ? "text-orange-400" : "text-slate-100"}`}>
        {value}
      </div>
    </div>
  );
}
