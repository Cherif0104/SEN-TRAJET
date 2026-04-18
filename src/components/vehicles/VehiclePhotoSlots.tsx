"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  VEHICLE_PHOTO_SLOTS,
  type VehiclePhotoSlotKey,
} from "@/lib/vehicleFormTaxonomy";
import { uploadVehicleSlotPhoto } from "@/lib/storage";
import { appendVehiclePhoto, removeVehiclePhotoAt } from "@/lib/profiles";
import { Camera, ChevronLeft, ChevronRight, Loader2, Trash2, Upload, X } from "lucide-react";

type Props = {
  driverId: string;
  vehicleId: string;
  photos: Record<string, string[]>;
  onUpdated: () => void;
};

export function VehiclePhotoSlots({ driverId, vehicleId, photos, onUpdated }: Props) {
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ slot: VehiclePhotoSlotKey; index: number } | null>(
    null
  );
  const uploadInputRefs = useRef<Partial<Record<string, HTMLInputElement | null>>>({});
  const cameraInputRefs = useRef<Partial<Record<string, HTMLInputElement | null>>>({});

  const urlsForSlot = (slot: string) => photos[slot] || [];

  const uploadToSlot = async (slot: VehiclePhotoSlotKey, file: File) => {
    setBusySlot(slot);
    try {
      const url = await uploadVehicleSlotPhoto(driverId, vehicleId, slot, file);
      await appendVehiclePhoto(driverId, vehicleId, slot, url);
      onUpdated();
    } finally {
      setBusySlot(null);
    }
  };

  const handleFiles = async (slot: VehiclePhotoSlotKey, e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    for (let i = 0; i < list.length; i += 1) {
      await uploadToSlot(slot, list[i]!);
    }
    e.target.value = "";
  };

  const remove = async (slot: VehiclePhotoSlotKey, index: number) => {
    setBusySlot(`${slot}-${index}`);
    try {
      await removeVehiclePhotoAt(driverId, vehicleId, slot, index);
      onUpdated();
      setPreview(null);
    } finally {
      setBusySlot(null);
    }
  };

  const openPreview = (slot: VehiclePhotoSlotKey, index: number) =>
    setPreview({ slot, index });

  const list = preview ? urlsForSlot(preview.slot) : [];
  const previewUrl = preview && list[preview.index];

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/80 p-3">
      <p className="text-xs font-medium text-neutral-700">
        Photos du véhicule (angles demandés pour validation)
      </p>
      {VEHICLE_PHOTO_SLOTS.map((slot) => {
        const { key, label } = slot;
        const hint = "hint" in slot ? slot.hint : undefined;
        const urls = urlsForSlot(key);
        const busy = busySlot === key || urls.some((_, i) => busySlot === `${key}-${i}`);
        return (
          <div key={key} className="rounded-lg border border-neutral-200 bg-white p-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-neutral-800">{label}</p>
                {hint && <p className="text-xs text-amber-700">{hint}</p>}
              </div>
              <div className="flex gap-1">
                <input
                  ref={(el) => {
                    uploadInputRefs.current[key] = el;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  disabled={!!busy}
                  onChange={(e) => handleFiles(key, e)}
                />
                <input
                  ref={(el) => {
                    cameraInputRefs.current[key] = el;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  disabled={!!busy}
                  onChange={(e) => handleFiles(key, e)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!!busy}
                  onClick={() => uploadInputRefs.current[key]?.click()}
                >
                  {busy && busySlot === key ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!!busy}
                  onClick={() => cameraInputRefs.current[key]?.click()}
                >
                  <Camera className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {urls.length > 0 && (
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
                {urls.map((url, idx) => (
                  <div
                    key={`${key}-${idx}-${url.slice(-12)}`}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-neutral-200"
                  >
                    <button
                      type="button"
                      className="block h-full w-full"
                      onClick={() => openPreview(key, idx)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                    <button
                      type="button"
                      className="absolute right-0 top-0 rounded-bl bg-black/55 p-0.5 text-white"
                      disabled={busy}
                      onClick={() => remove(key, idx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {preview && previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-md rounded-2xl bg-black p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-1 top-1 z-10 rounded-full bg-white/10 p-1 text-white"
              onClick={() => setPreview(null)}
            >
              <X className="h-5 w-5" />
            </button>
            {list.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-1 text-white disabled:opacity-30"
                  disabled={preview.index <= 0}
                  onClick={() => setPreview((p) => (p && p.index > 0 ? { ...p, index: p.index - 1 } : p))}
                >
                  <ChevronLeft className="h-7 w-7" />
                </button>
                <button
                  type="button"
                  className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-1 text-white disabled:opacity-30"
                  disabled={preview.index >= list.length - 1}
                  onClick={() =>
                    setPreview((p) =>
                      p && p.index < list.length - 1 ? { ...p, index: p.index + 1 } : p
                    )
                  }
                >
                  <ChevronRight className="h-7 w-7" />
                </button>
              </>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt=""
              className="max-h-[82vh] w-full rounded-lg object-contain"
            />
            <p className="mt-1 text-center text-xs text-neutral-300">
              {preview.index + 1} / {list.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
