import React, { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, LayersControl } from "react-leaflet";
import L from "leaflet";
import { photoUrl } from "../lib/api";

const conqueredIcon = (elev) =>
  L.divIcon({
    className: "vs-marker conquered",
    html: `<div class="pin" style="background:#10B981"></div><div class="label">${Math.round(
      elev
    )}m</div>`,
    iconSize: [40, 34],
    iconAnchor: [20, 8],
  });

const missingIcon = (elev) =>
  L.divIcon({
    className: "vs-marker missing",
    html: `<div class="pin" style="background:#F59E0B;border-style:dashed"></div><div class="label">${Math.round(
      elev
    )}m</div>`,
    iconSize: [40, 34],
    iconAnchor: [20, 8],
  });

export default function MapView({ summits, famousCols, missingIds }) {
  const [filter, setFilter] = useState("all"); // all | conquered | missing

  const points = useMemo(() => {
    const list = [];
    if (filter !== "missing") {
      summits.forEach((s) =>
        list.push({
          key: `s-${s.id}`,
          lat: s.lat,
          lng: s.lng,
          elevation: s.elevation,
          type: "conquered",
          data: s,
        })
      );
    }
    if (filter !== "conquered") {
      famousCols
        .filter((c) => missingIds.has(c.id))
        .forEach((c) =>
          list.push({
            key: `c-${c.id}`,
            lat: c.lat,
            lng: c.lng,
            elevation: c.elevation,
            type: "missing",
            data: c,
          })
        );
    }
    return list;
  }, [summits, famousCols, missingIds, filter]);

  const center = points.length
    ? [points[0].lat, points[0].lng]
    : [45.5, 6.5]; // French Alps default

  const filters = [
    { id: "all", label: "All", count: summits.length + [...missingIds].length },
    { id: "conquered", label: "Conquered", count: summits.length, color: "emerald" },
    { id: "missing", label: "Bucket List", count: [...missingIds].length, color: "amber" },
  ];

  return (
    <div className="relative w-full h-[calc(100vh-180px)] min-h-[540px] rounded-2xl overflow-hidden border border-slate-800">
      <div className="absolute z-[500] top-4 left-4 flex gap-2 backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-full p-1">
        {filters.map((f) => (
          <button
            key={f.id}
            data-testid={`map-filter-${f.id}`}
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold font-mono-tel uppercase tracking-wider transition-[background-color,color] ${
              filter === f.id
                ? f.color === "emerald"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : f.color === "amber"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-orange-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {f.label} · {f.count}
          </button>
        ))}
      </div>

      <MapContainer
        center={center}
        zoom={5}
        scrollWheelZoom
        style={{ width: "100%", height: "100%" }}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Dark">
            <TileLayer
              attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a> — Sources: Esri, HERE, Garmin, © OpenStreetMap contributors, and the GIS User Community'
              url="https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              maxZoom={16}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Streets">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Terrain">
            <TileLayer
              attribution='&copy; <a href="https://opentopomap.org/">OpenTopoMap</a>'
              url="https://a.tile.opentopomap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {points.map((p) => (
          <Marker
            key={p.key}
            position={[p.lat, p.lng]}
            icon={p.type === "conquered" ? conqueredIcon(p.elevation) : missingIcon(p.elevation)}
          >
            <Popup>
              <div className="min-w-[220px]">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display font-bold text-base">{p.data.name}</div>
                  <span
                    className={p.type === "conquered" ? "pill pill-emerald" : "pill pill-amber"}
                  >
                    {p.type === "conquered" ? "Conquered" : "Missing"}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {p.data.region || p.data.country}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 font-mono-tel text-xs">
                  <div>
                    <div className="text-slate-500 uppercase text-[9px]">Elev</div>
                    <div className="text-orange-400 font-bold">{Math.round(p.elevation)}m</div>
                  </div>
                  {p.data.avg_gradient != null && (
                    <div>
                      <div className="text-slate-500 uppercase text-[9px]">Grade</div>
                      <div className="text-slate-100">{p.data.avg_gradient}%</div>
                    </div>
                  )}
                  {p.data.distance_km != null && (
                    <div>
                      <div className="text-slate-500 uppercase text-[9px]">Dist</div>
                      <div className="text-slate-100">{p.data.distance_km}km</div>
                    </div>
                  )}
                </div>
                {p.data.photo_path && (
                  <img
                    alt={p.data.name}
                    src={photoUrl(p.data.photo_path)}
                    className="mt-3 rounded-lg w-full h-28 object-cover"
                  />
                )}
                {p.data.notes && (
                  <div className="mt-2 text-xs text-slate-300 italic">{p.data.notes}</div>
                )}
                {p.data.history && (
                  <div className="mt-2 text-xs text-slate-400">{p.data.history}</div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
