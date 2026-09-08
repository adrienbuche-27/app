import React, { useEffect, useMemo, useState, useCallback } from "react";
import "@/App.css";
import { Toaster } from "sonner";
import Header from "@/components/Header";
import MapView from "@/components/MapView";
import AddSummitDialog from "@/components/AddSummitDialog";
import SummitsList from "@/components/SummitsList";
import StatsView from "@/components/StatsView";
import FamousColsView from "@/components/FamousColsView";
import MissingView from "@/components/MissingView";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function App() {
  const [active, setActive] = useState("map");
  const [summits, setSummits] = useState([]);
  const [famousCols, setFamousCols] = useState([]);
  const [missing, setMissing] = useState([]);
  const [stats, setStats] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSummit, setEditSummit] = useState(null);
  const [prefillCol, setPrefillCol] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [s, f, m, st] = await Promise.all([
        api.listSummits(),
        api.listFamousCols(),
        api.missingCols(),
        api.stats(),
      ]);
      setSummits(s);
      setFamousCols(f);
      setMissing(m);
      setStats(st);
    } catch (e) {
      toast.error("Could not load data");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const conqueredIds = useMemo(
    () => new Set(summits.map((s) => s.famous_col_id).filter(Boolean)),
    [summits]
  );
  const missingIds = useMemo(() => new Set(missing.map((c) => c.id)), [missing]);

  const openAdd = () => {
    setEditSummit(null);
    setPrefillCol(null);
    setDialogOpen(true);
  };

  const openEdit = (s) => {
    setEditSummit(s);
    setPrefillCol(null);
    setDialogOpen(true);
  };

  const openFromCol = (col) => {
    setEditSummit({
      name: col.name,
      region: col.region,
      country: col.country,
      elevation: col.elevation,
      distance_km: col.distance_km,
      avg_gradient: col.avg_gradient,
      max_gradient: col.max_gradient,
      lat: col.lat,
      lng: col.lng,
      famous_col_id: col.id,
      date_climbed: new Date().toISOString().slice(0, 10),
    });
    setPrefillCol(col);
    setDialogOpen(true);
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteSummit(deleteTarget.id);
      toast.success("Summit removed");
      setDeleteTarget(null);
      refresh();
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="App min-h-screen">
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: { background: "#0f172a", border: "1px solid #1E293B", color: "#F8FAFC" },
        }}
      />
      <Header
        active={active}
        onNav={setActive}
        onAdd={openAdd}
        totalElevation={stats?.total_elevation_m || 0}
      />

      {/* Kinetic ticker */}
      <div className="border-b border-slate-900 overflow-hidden bg-slate-950/40">
        <div className="ticker-track flex gap-10 whitespace-nowrap py-2 font-mono-tel text-[11px] uppercase tracking-[0.25em] text-slate-500">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-10">
              <span>· Alpe d&apos;Huez 1860m · 21 hairpins ·</span>
              <span>· Stelvio 2758m · Cima Coppi ·</span>
              <span>· Mont Ventoux 1909m · Giant of Provence ·</span>
              <span>· Tourmalet 2115m · Circle of Death ·</span>
              <span>· Zoncolan 1750m · The Kaiser ·</span>
              <span>· Angliru 1573m · 23.5% ·</span>
              <span>· Iseran 2764m · highest paved alpine pass ·</span>
              <span>· Mortirolo 1852m ·</span>
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
        {active === "map" && (
          <MapView summits={summits} famousCols={famousCols} missingIds={missingIds} />
        )}
        {active === "summits" && (
          <div>
            <PageTitle
              eyebrow="Ride Log"
              title="My Conquered Summits"
              sub={`${summits.length} peak${summits.length === 1 ? "" : "s"} in the book`}
            />
            <SummitsList summits={summits} onEdit={openEdit} onDelete={setDeleteTarget} />
          </div>
        )}
        {active === "stats" && (
          <div>
            <PageTitle
              eyebrow="Telemetry"
              title="Statistics Dashboard"
              sub="Elevation, distance & Everest progression"
            />
            <StatsView stats={stats} />
          </div>
        )}
        {active === "catalog" && (
          <div>
            <PageTitle
              eyebrow="Reference"
              title="Famous Cols Catalog"
              sub="Legendary passes across the Alps, Pyrenees, Dolomites & beyond"
            />
            <FamousColsView cols={famousCols} conqueredIds={conqueredIds} onQuickLog={openFromCol} />
          </div>
        )}
        {active === "missing" && (
          <div>
            <PageTitle
              eyebrow="Bucket List"
              title="Missing Climb Matrix"
              sub="The famous cols you haven't ticked yet"
            />
            <MissingView missing={missing} onQuickLog={openFromCol} />
          </div>
        )}
      </main>

      <AddSummitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        famousCols={famousCols}
        onCreated={refresh}
        editSummit={editSummit}
        prefillCol={prefillCol}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-slate-950 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this summit?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {deleteTarget?.name} will be removed from your log. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete" className="bg-slate-900 border-slate-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete"
              onClick={doDelete}
              className="bg-red-500 hover:bg-red-400"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PageTitle({ eyebrow, title, sub }) {
  return (
    <div className="mb-6" data-testid={`page-title-${eyebrow.toLowerCase()}`}>
      <div className="font-mono-tel text-[10px] uppercase tracking-[0.25em] text-orange-400">
        {eyebrow}
      </div>
      <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight mt-1">{title}</h1>
      {sub && <p className="text-sm text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}
