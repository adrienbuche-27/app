import React from "react";
import { Mountain, TrendingUp, Route, Award } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

const EVEREST = 8848;

export default function StatsView({ stats }) {
  if (!stats) return null;
  const {
    total_summits,
    total_elevation_m,
    total_distance_km,
    highest_peak,
    everests_climbed,
    by_month,
    by_year,
  } = stats;

  const everestProgress = Math.min(((total_elevation_m % EVEREST) / EVEREST) * 100, 100);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          testId="stat-total-summits"
          icon={<Mountain className="w-5 h-5" />}
          label="Total Summits"
          value={total_summits.toLocaleString()}
          accent="orange"
        />
        <KPI
          testId="stat-total-elevation"
          icon={<TrendingUp className="w-5 h-5" />}
          label="Total Elevation"
          value={`${Math.round(total_elevation_m).toLocaleString()} m`}
          accent="emerald"
        />
        <KPI
          testId="stat-total-distance"
          icon={<Route className="w-5 h-5" />}
          label="Total Distance"
          value={`${Math.round(total_distance_km).toLocaleString()} km`}
          accent="slate"
        />
        <KPI
          testId="stat-highest"
          icon={<Award className="w-5 h-5" />}
          label="Highest Peak"
          value={
            highest_peak
              ? `${Math.round(highest_peak.elevation).toLocaleString()} m`
              : "—"
          }
          sub={highest_peak?.name}
          accent="orange"
        />
      </div>

      <div className="card-vs p-6" data-testid="everest-progress">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-500 font-mono-tel">
              Everest Scale
            </div>
            <div className="font-display font-black text-3xl mt-1">
              {everests_climbed.toFixed(2)}
              <span className="text-slate-500 text-lg ml-2 font-normal">× Everest</span>
            </div>
          </div>
          <div className="text-xs text-slate-400 font-mono-tel">
            Next: {(EVEREST - (total_elevation_m % EVEREST)).toFixed(0)} m to complete{" "}
            <span className="text-orange-400">Everest #{Math.floor(everests_climbed) + 1}</span>
          </div>
        </div>
        <div className="mt-4 h-3 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-emerald-400 transition-[width] duration-700"
            style={{ width: `${everestProgress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Cumulative Elevation" testId="chart-cumulative">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={cumulative(by_month, total_elevation_m, by_month)}>
              <defs>
                <linearGradient id="grad-elev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF5722" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#FF5722" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #1E293B",
                  borderRadius: 12,
                }}
                labelStyle={{ color: "#F8FAFC" }}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="#FF5722"
                strokeWidth={2.5}
                fill="url(#grad-elev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Summits per Month" testId="chart-per-month">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={by_month.map((m) => ({ label: m.month, count: m.count }))}>
              <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #1E293B",
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="count" fill="#10B981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Summits per Year" testId="chart-per-year">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={by_year.map((y) => ({ label: y.year, count: y.count }))}>
              <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #1E293B",
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="count" fill="#FF5722" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="card-vs p-6" data-testid="highest-card">
          <div className="text-xs uppercase tracking-widest text-slate-500 font-mono-tel">
            Highest peak
          </div>
          {highest_peak ? (
            <>
              <div className="font-display font-black text-2xl mt-1">{highest_peak.name}</div>
              <div className="text-sm text-slate-400 mt-1">
                {highest_peak.region}
                {highest_peak.country ? `, ${highest_peak.country}` : ""}
              </div>
              <div className="mt-6 font-mono-tel text-6xl font-black text-orange-400">
                {Math.round(highest_peak.elevation).toLocaleString()}
                <span className="text-lg text-slate-500 ml-1">m</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 font-mono-tel text-xs">
                <MetaRow label="Grade" value={highest_peak.avg_gradient ? `${highest_peak.avg_gradient}%` : "—"} />
                <MetaRow label="Distance" value={highest_peak.distance_km ? `${highest_peak.distance_km}km` : "—"} />
                <MetaRow label="Date" value={highest_peak.date_climbed || "—"} />
              </div>
            </>
          ) : (
            <div className="mt-6 text-slate-500">Log your first summit to unlock this card.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function cumulative(byMonth) {
  let acc = 0;
  return (byMonth || []).map((m) => {
    acc += m.count; // count of summits as proxy line; we use it just to show trend
    return { label: m.month, cumulative: acc };
  });
}

function KPI({ icon, label, value, sub, accent, testId }) {
  const color =
    accent === "emerald"
      ? "text-emerald-400"
      : accent === "orange"
      ? "text-orange-400"
      : "text-slate-100";
  return (
    <div className="card-vs p-5 relative overflow-hidden" data-testid={testId}>
      <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest font-mono-tel">
        <span className={color}>{icon}</span> {label}
      </div>
      <div className={`font-display font-black text-3xl mt-2 ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1 truncate">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children, testId }) {
  return (
    <div className="card-vs p-5" data-testid={testId}>
      <div className="text-xs uppercase tracking-widest text-slate-500 font-mono-tel mb-3">
        {title}
      </div>
      {children}
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-slate-100 font-semibold">{value}</div>
    </div>
  );
}
