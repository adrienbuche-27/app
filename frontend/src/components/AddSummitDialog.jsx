import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

const emptyForm = {
  name: "",
  region: "",
  country: "",
  elevation: "",
  distance_km: "",
  avg_gradient: "",
  max_gradient: "",
  lat: "",
  lng: "",
  date_climbed: new Date().toISOString().slice(0, 10),
  duration_minutes: "",
  notes: "",
  photo_path: "",
  famous_col_id: "",
};

export default function AddSummitDialog({ open, onOpenChange, famousCols, onCreated, editSummit }) {
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editSummit ? { ...emptyForm, ...editSummit } : emptyForm);
    }
  }, [open, editSummit]);

  const bind = (key) => ({
    value: form[key] ?? "",
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const pickFamous = (id) => {
    const col = famousCols.find((c) => c.id === id);
    if (!col) return;
    setForm((f) => ({
      ...f,
      famous_col_id: col.id,
      name: col.name,
      region: col.region,
      country: col.country,
      elevation: col.elevation,
      distance_km: col.distance_km,
      avg_gradient: col.avg_gradient,
      max_gradient: col.max_gradient,
      lat: col.lat,
      lng: col.lng,
    }));
    toast.success(`Prefilled ${col.name}`);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.uploadPhoto(file);
      setForm((f) => ({ ...f, photo_path: res.path }));
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.elevation || !form.lat || !form.lng) {
      toast.error("Name, elevation, lat and lng are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        elevation: Number(form.elevation),
        distance_km: form.distance_km ? Number(form.distance_km) : null,
        avg_gradient: form.avg_gradient ? Number(form.avg_gradient) : null,
        max_gradient: form.max_gradient ? Number(form.max_gradient) : null,
        lat: Number(form.lat),
        lng: Number(form.lng),
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      };
      if (editSummit) {
        await api.updateSummit(editSummit.id, payload);
        toast.success("Summit updated");
      } else {
        await api.createSummit(payload);
        toast.success("Summit logged");
      }
      onCreated();
      onOpenChange(false);
    } catch (err) {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="add-summit-dialog"
        className="max-w-2xl bg-slate-950/95 backdrop-blur-xl border-slate-800 text-slate-100"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-tight">
            {editSummit ? "Edit Summit" : "Log a New Summit"}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            Record a conquered col or prefill from the legendary catalog.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="md:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-slate-400 font-mono-tel">
              Preset from famous col (optional)
            </Label>
            <Select value={form.famous_col_id || undefined} onValueChange={pickFamous}>
              <SelectTrigger data-testid="famous-col-select" className="bg-slate-900 border-slate-800">
                <SelectValue placeholder="Pick a legendary col to prefill" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 border-slate-800 text-slate-100">
                {famousCols.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} — {c.elevation}m
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Field label="Summit name" required>
            <Input data-testid="input-name" {...bind("name")} placeholder="Col du Galibier" />
          </Field>
          <Field label="Region">
            <Input data-testid="input-region" {...bind("region")} placeholder="French Alps" />
          </Field>
          <Field label="Country">
            <Input data-testid="input-country" {...bind("country")} placeholder="France" />
          </Field>
          <Field label="Date climbed">
            <Input data-testid="input-date" type="date" {...bind("date_climbed")} />
          </Field>
          <Field label="Elevation (m)" required>
            <Input data-testid="input-elevation" type="number" step="1" {...bind("elevation")} />
          </Field>
          <Field label="Distance (km)">
            <Input data-testid="input-distance" type="number" step="0.1" {...bind("distance_km")} />
          </Field>
          <Field label="Avg gradient (%)">
            <Input data-testid="input-avg-grad" type="number" step="0.1" {...bind("avg_gradient")} />
          </Field>
          <Field label="Max gradient (%)">
            <Input data-testid="input-max-grad" type="number" step="0.1" {...bind("max_gradient")} />
          </Field>
          <Field label="Latitude" required>
            <Input data-testid="input-lat" type="number" step="0.0001" {...bind("lat")} />
          </Field>
          <Field label="Longitude" required>
            <Input data-testid="input-lng" type="number" step="0.0001" {...bind("lng")} />
          </Field>
          <Field label="Duration (minutes)">
            <Input
              data-testid="input-duration"
              type="number"
              step="1"
              {...bind("duration_minutes")}
            />
          </Field>
          <Field label="Photo">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 hover:bg-slate-900 cursor-pointer">
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-xs text-slate-400 truncate">
                {form.photo_path ? "Replace photo" : "Upload a summit photo"}
              </span>
              <input
                data-testid="input-photo"
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />
            </label>
          </Field>
          <div className="md:col-span-2">
            <Field label="Ride notes">
              <Textarea
                data-testid="input-notes"
                {...bind("notes")}
                placeholder="Weather, memories, coffee at the top…"
                className="min-h-[80px]"
              />
            </Field>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="save-summit-btn"
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-400 text-white font-semibold"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editSummit ? "Update Summit" : "Log Summit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-slate-400 font-mono-tel">
        {label} {required && <span className="text-orange-400">*</span>}
      </Label>
      {children}
    </div>
  );
}
