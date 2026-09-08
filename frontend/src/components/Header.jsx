import React from "react";
import { Mountain, Plus } from "lucide-react";

const NAV = [
  { id: "map", label: "Map" },
  { id: "summits", label: "My Summits" },
  { id: "stats", label: "Stats" },
  { id: "catalog", label: "Famous Cols" },
  { id: "missing", label: "Missing Matrix" },
];

export default function Header({ active, onNav, onAdd, totalElevation }) {
  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-30 backdrop-blur-xl bg-slate-950/70 border-b border-slate-800/80"
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-4 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-3 mr-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 grid place-items-center shadow-lg shadow-orange-500/25">
            <Mountain className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-display font-black text-lg tracking-tight text-white">
              VELO<span className="text-orange-500">.</span>SUMMIT
            </div>
            <div className="font-mono-tel text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Apex Col Tracker
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-1 flex-1">
          {NAV.map((item) => (
            <button
              key={item.id}
              data-testid={`nav-${item.id}`}
              onClick={() => onNav(item.id)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-[background-color,color] duration-200 ${
                active === item.id
                  ? "bg-slate-800/80 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono-tel text-xs text-slate-300">
            {Math.round(totalElevation || 0).toLocaleString()} m ascended
          </span>
        </div>

        <button
          data-testid="log-summit-btn"
          onClick={onAdd}
          className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-400 text-white font-semibold text-sm shadow-lg shadow-orange-500/30 transition-[background-color,transform] duration-200 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Log Summit
        </button>
      </div>
    </header>
  );
}
