"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Upload, Loader2, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { uploadDriverDocument } from "@/lib/storage";
import { uploadDocument } from "@/lib/profiles";

const DOC_TYPES = [
  "permis",
  "carte_grise",
  "assurance",
  "photo_identite",
] as const;

type DocType = (typeof DOC_TYPES)[number];

const LABELS: Record<DocType, string> = {
  permis: "Permis de conduire",
  carte_grise: "Carte grise",
  assurance: "Assurance",
  photo_identite: "Photo d'identité",
};

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

type Props = {
  driverId: string;
  docType: DocType;
  currentFileUrl?: string | null;
  onSuccess?: () => void;
  onRemove?: () => void | Promise<void>;
};

export function DocumentUpload({
  driverId,
  docType,
  currentFileUrl,
  onSuccess,
  onRemove,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(false);
    setUploading(true);
    try {
      const url = await uploadDriverDocument(driverId, docType, file);
      await uploadDocument(driverId, docType, url);
      setSuccess(true);
      onSuccess?.();
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l’upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-neutral-900">
            {LABELS[docType]}
          </p>
          {currentFileUrl && (
            <a
              href={currentFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 text-sm text-primary hover:underline"
            >
              Voir le document
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={handleFile}
            disabled={uploading}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={currentFileUrl ? "ghost" : "secondary"}
              onClick={() => inputRef.current?.click()}
              disabled={uploading || removing}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <>
                  <Upload className="mr-1 h-4 w-4" />
                  {currentFileUrl ? "Remplacer" : "Téléverser"}
                </>
              )}
            </Button>
            {currentFileUrl && onRemove && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                disabled={uploading || removing}
                onClick={async () => {
                  setRemoving(true);
                  setError(null);
                  try {
                    await onRemove();
                  } finally {
                    setRemoving(false);
                  }
                }}
              >
                {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
                Retirer
              </Button>
            )}
          </div>
        </div>
      </div>
      {error && (
        <p className="mt-2 flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
