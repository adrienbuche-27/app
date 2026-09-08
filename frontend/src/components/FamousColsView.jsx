import React, { useMemo, useState } from "react";
import { Check, MapPin, Search } from "lucide-react";

export default function FamousColsView({ cols, conqueredIds, onQuickLog }) {
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
                  <span className="pill pill-emerald">
                    <Check className="w-3 h-3" /> Done
                  </span>
                ) : (
                  <span className="pill pill-amber">Bucket</span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 font-mono-tel text-xs">
                <Metric label="Elev" value={`${c.elevation}m`} accent="orange" />
                <Metric label="Dist" value={`${c.distance_km}km`} />
                <Metric label="Grade" value={`${c.avg_gradient}%`} />
                <Metric label="Cat" value={c.category} />
              </div>
              <p className="mt-3 text-xs text-slate-400 italic">{c.history}</p>
              {!done && (
                <button
                  data-testid={`quicklog-${c.id}`}
                  onClick={() => onQuickLog(c)}
                  className="mt-4 w-full py-2 rounded-lg bg-slate-900 hover:bg-orange-500 hover:text-white border border-slate-800 hover:border-orange-500 text-slate-200 text-sm font-semibold transition-[background-color,color,border-color]"
                >
                  Mark as Conquered
                </button>
              )}
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
