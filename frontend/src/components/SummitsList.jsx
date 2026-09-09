import React, { useState } from "react";
import { Mountain, Trash2, Pencil, MapPin, Route } from "lucide-react";
import { photoUrl, api } from "../lib/api";
import ElevationProfile from "./ElevationProfile";
import { toast } from "sonner";

export default function SummitsList({ summits, onEdit, onDelete, onRefreshed }) {
  const [busy, setBusy] = useState(null);

  const refresh = async (s) => {
    if (!s.start_lat || !s.start_lng) {
      toast.error("Add a climb side first (Edit → Climb from)");
      onEdit(s);
      return;
    }
    setBusy(s.id);
    try {
      await api.refreshProfile(s.id);
      toast.success("Profile refreshed");
      onRefreshed?.();
    } catch {
      toast.error("Profile fetch failed");
    } finally {
      setBusy(null);
    }
  };

  if (!summits.length) {
    return (
      <div
        data-testid="empty-summits"
        className="card-vs p-10 text-center max-w-lg mx-auto mt-6"
      >
        <Mountain className="w-10 h-10 text-orange-400 mx-auto" />
        <div className="font-display font-bold text-xl mt-3">No summits logged yet</div>
        <p className="text-sm text-slate-400 mt-2">
          Hit &quot;Log Summit&quot; to record your first climb, or prefill from the famous cols catalog.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {summits.map((s) => (
        <article
          key={s.id}
          data-testid={`summit-card-${s.id}`}
          className="card-vs overflow-hidden group flex flex-col"
        >
          <div className="relative h-40 bg-gradient-to-br from-slate-800 to-slate-950">
            {s.photo_path ? (
              <img
                src={photoUrl(s.photo_path)}
                alt={s.name}
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
              />
            ) : (
              <div className="w-full h-full grid place-items-center opacity-40">
                <Mountain className="w-14 h-14 text-slate-600" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent">
              <div className="flex items-end justify-between">
                <div>
                  <div className="font-display font-bold text-lg leading-tight">{s.name}</div>
                  {s.region && (
                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {s.region}
                      {s.country ? `, ${s.country}` : ""}
                    </div>
                  )}
                </div>
                <div className="font-mono-tel text-2xl font-black text-orange-400">
                  {Math.round(s.elevation)}
                  <span className="text-xs text-slate-500 ml-0.5">m</span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 flex-1 flex flex-col">
            {s.side_name && (
              <div
                data-testid={`side-badge-${s.id}`}
                className="pill pill-orange w-fit mb-3"
              >
                <Route className="w-3 h-3" />
                {s.side_name}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 font-mono-tel text-xs">
              <Stat label="Grade" value={s.avg_gradient ? `${s.avg_gradient}%` : "—"} />
              <Stat label="Distance" value={s.distance_km ? `${s.distance_km}km` : "—"} />
              <Stat
                label="Duration"
                value={s.duration_minutes ? formatDur(s.duration_minutes) : "—"}
              />
            </div>

            <div className="mt-4">
              <ElevationProfile
                profile={s.profile}
                profile_status={s.profile_status}
                size="md"
                canRetry
                onRetry={() => refresh(s)}
              />
              {busy === s.id && (
                <div className="text-[11px] text-orange-400 mt-1 font-mono-tel">Fetching…</div>
              )}
            </div>

            <div className="flex items-center justify-between mt-auto pt-4 text-xs text-slate-500">
              <span>{s.date_climbed || "—"}</span>
              <div className="flex gap-2">
                <button
                  data-testid={`edit-summit-${s.id}`}
                  onClick={() => onEdit(s)}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-orange-300 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  data-testid={`delete-summit-${s.id}`}
                  onClick={() => onDelete(s)}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {s.notes && (
              <p className="mt-3 text-xs text-slate-400 italic line-clamp-3">{s.notes}</p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-slate-100 font-semibold">{value}</div>
    </div>
  );
}

function formatDur(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}
