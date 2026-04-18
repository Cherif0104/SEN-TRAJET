"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  Camera,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
} from "lucide-react";
import { uploadDriverDocument } from "@/lib/storage";
import { addDriverDocumentFile, deleteDriverDocumentFile } from "@/lib/profiles";

type DocType = "permis" | "carte_grise" | "assurance" | "photo_identite";

const LABELS: Record<DocType, string> = {
  permis: "Permis de conduire",
  carte_grise: "Carte grise",
  assurance: "Assurance",
  photo_identite: "Photo d’identité",
};

const ACCEPT_IMAGES = "image/jpeg,image/png,image/webp";
const ACCEPT_ALL = `${ACCEPT_IMAGES},application/pdf`;

function isPdfUrl(url: string) {
  return /\.pdf($|\?)/i.test(url) || url.toLowerCase().includes("application/pdf");
}

export type DocFileRow = { id: string; file_url: string };

type Props = {
  driverId: string;
  docType: DocType;
  files: DocFileRow[];
  onChanged: () => void;
};

export function MultiDocumentUpload({ driverId, docType, files, onChanged }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const closePreview = useCallback(() => setPreviewIndex(null), []);

  const uploadOne = async (file: File) => {
    setError(null);
    setSuccess(false);
    setUploading(true);
    try {
      const url = await uploadDriverDocument(driverId, docType, file);
      await addDriverDocumentFile(driverId, docType, url);
      setSuccess(true);
      onChanged();
      setTimeout(() => setSuccess(false), 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l’envoi");
    } finally {
      setUploading(false);
    }
  };

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    for (let i = 0; i < list.length; i += 1) {
      await uploadOne(list[i]!);
    }
    e.target.value = "";
  };

  const removeAt = async (fileId: string) => {
    setRemovingId(fileId);
    setError(null);
    try {
      await deleteDriverDocumentFile(driverId, fileId);
      onChanged();
      setPreviewIndex(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible");
    } finally {
      setRemovingId(null);
    }
  };

  const openPreview = (idx: number) => setPreviewIndex(idx);
  const cur = previewIndex !== null ? files[previewIndex] : null;
  const curUrl = cur?.file_url;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium text-neutral-900">{LABELS[docType]}</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            Plusieurs fichiers possibles · prévisualisation ici · max 5 Mo chacun
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT_ALL}
            multiple
            className="hidden"
            disabled={uploading}
            onChange={handlePick}
          />
          <input
            ref={cameraRef}
            type="file"
            accept={ACCEPT_IMAGES}
            capture="environment"
            className="hidden"
            disabled={uploading}
            onChange={handlePick}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <>
                <Upload className="mr-1 h-4 w-4" /> Téléverser
              </>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={uploading}
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="mr-1 h-4 w-4" /> Photo
          </Button>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 pt-1 [scrollbar-width:thin]">
          {files.map((f, idx) => (
            <div
              key={f.id}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50"
            >
              <button
                type="button"
                className="flex h-full w-full items-center justify-center"
                onClick={() => openPreview(idx)}
              >
                {isPdfUrl(f.file_url) ? (
                  <FileText className="h-8 w-8 text-neutral-400" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.file_url} alt="" className="h-full w-full object-cover" />
                )}
              </button>
              <button
                type="button"
                className="absolute right-0.5 top-0.5 rounded bg-black/55 p-0.5 text-white hover:bg-black/75"
                disabled={removingId === f.id}
                onClick={() => removeAt(f.id)}
                aria-label="Retirer ce fichier"
              >
                {removingId === f.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-2 flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {previewIndex !== null && curUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          onClick={closePreview}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-lg rounded-2xl bg-neutral-900 p-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-2 top-2 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
              onClick={closePreview}
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
            {files.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 disabled:opacity-30"
                  disabled={previewIndex <= 0}
                  onClick={() => setPreviewIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
                  aria-label="Précédent"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 disabled:opacity-30"
                  disabled={previewIndex >= files.length - 1}
                  onClick={() =>
                    setPreviewIndex((i) =>
                      i !== null && i < files.length - 1 ? i + 1 : i
                    )
                  }
                  aria-label="Suivant"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            <div className="flex max-h-[80vh] items-center justify-center overflow-auto rounded-xl bg-black">
              {isPdfUrl(curUrl) ? (
                <iframe
                  title="Aperçu PDF"
                  src={curUrl}
                  className="h-[70vh] w-full rounded-lg bg-white"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={curUrl}
                  alt="Aperçu"
                  className="max-h-[80vh] w-full object-contain"
                />
              )}
            </div>
            <p className="mt-2 text-center text-xs text-neutral-400">
              {previewIndex + 1} / {files.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
