import React, { useMemo } from "react";
import { Flag, ArrowUpRight, Mountain } from "lucide-react";

export default function MissingView({ missing, onQuickLog }) {
  const sorted = useMemo(
    () => [...missing].sort((a, b) => b.elevation - a.elevation),
    [missing]
  );

  const grouped = useMemo(() => {
    const g = {};
    sorted.forEach((c) => {
      const k = c.category || "Uncat";
      g[k] = g[k] || [];
      g[k].push(c);
    });
    return g;
  }, [sorted]);

  if (!missing.length) {
    return (
      <div className="card-vs p-12 text-center max-w-lg mx-auto mt-6">
        <Flag className="w-10 h-10 text-emerald-400 mx-auto" />
        <div className="font-display font-bold text-2xl mt-3">Legend status.</div>
        <p className="text-sm text-slate-400 mt-2">
          You&apos;ve ticked every col in our catalog. Add your own custom summits or wait for the next
          list drop.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card-vs p-6" data-testid="missing-summary">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-500 font-mono-tel">
              Missing Climb Matrix
            </div>
            <div className="font-display font-black text-3xl mt-1">
              {missing.length}
              <span className="text-slate-500 text-lg ml-2 font-normal">
                legendary cols left to conquer
              </span>
            </div>
          </div>
          <span className="pill pill-amber">
            <Flag className="w-3 h-3" /> Bucket List
          </span>
        </div>
      </div>

      {Object.entries(grouped).map(([cat, list]) => (
        <div key={cat}>
          <div className="flex items-center gap-3 mb-3">
            <span className="pill pill-orange">Cat. {cat}</span>
            <span className="text-xs text-slate-500 font-mono-tel">{list.length} climbs</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((c) => (
              <div key={c.id} className="card-vs p-5" data-testid={`missing-${c.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg grid place-items-center bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      <Mountain className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-display font-bold text-base leading-tight">{c.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{c.region}</div>
                    </div>
                  </div>
                  <div className="font-mono-tel text-lg font-bold text-orange-400">
                    {c.elevation}m
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-400">{c.history}</p>
                <button
                  data-testid={`missing-quicklog-${c.id}`}
                  onClick={() => onQuickLog(c)}
                  className="mt-4 inline-flex items-center gap-1.5 text-orange-400 hover:text-orange-300 text-xs font-mono-tel uppercase tracking-wider font-semibold"
                >
                  Plan ascent <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
