import { IconAlertTriangle, IconCamera, IconPhoto, IconRefresh, IconTrash, IconUpload } from "@tabler/icons-react";
import { useRef, useState, type DragEvent } from "react";

import { Button } from "@/components/ui/button";
import { REPORT_IMAGE_MAX_BYTES } from "@/services/report-images";
import { cn } from "@/lib/utils";

export type PhotoUploadState = "idle" | "uploading" | "done" | "error";

interface ImageUploaderProps {
  previewUrl: string | null;
  uploadState: PhotoUploadState;
  photoError: string | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
  onRetry: () => void;
}

const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

export function ImageUploader({ previewUrl, uploadState, photoError, onSelect, onRemove, onRetry }: ImageUploaderProps) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const uploading = uploadState === "uploading";

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onSelect(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      <input
        ref={cameraInput}
        type="file"
        accept={PHOTO_ACCEPT}
        capture="environment"
        className="sr-only"
        aria-label="Take a photo with the camera"
        tabIndex={-1}
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={galleryInput}
        type="file"
        accept={PHOTO_ACCEPT}
        className="sr-only"
        aria-label="Upload an image from your gallery"
        tabIndex={-1}
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {previewUrl ? (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
            <img src={previewUrl} alt="Preview of the waste photo you uploaded" className="aspect-[4/3] w-full object-cover" />
            {uploading ? (
              <div className="absolute inset-x-0 top-0 h-1/3 animate-scan bg-linear-to-b from-transparent via-brand/30 to-transparent" aria-hidden="true" />
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {uploading ? "Uploading photo..." : null}
            {uploadState === "done" ? "Photo uploaded and ready." : null}
          </p>
          {uploadState === "error" && photoError ? (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
              <IconAlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              {photoError}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            {uploadState === "error" ? (
              <Button variant="outline" className="min-h-12" onClick={onRetry}>
                <IconRefresh size={18} aria-hidden="true" />
                Try Again
              </Button>
            ) : (
              <Button variant="outline" className="min-h-12" disabled={uploading} onClick={() => galleryInput.current?.click()}>
                <IconRefresh size={18} aria-hidden="true" />
                Change Image
              </Button>
            )}
            <Button variant="outline" className="min-h-12 text-danger hover:text-danger" disabled={uploading} onClick={onRemove}>
              <IconTrash size={18} aria-hidden="true" />
              Remove Image
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center gap-5 rounded-3xl border-2 border-dashed px-5 py-10 text-center transition duration-200 sm:py-14",
            dragging ? "border-brand bg-accent" : "border-border bg-card",
          )}
        >
          <span className="flex size-16 items-center justify-center rounded-2xl bg-accent text-brand">
            <IconUpload size={30} aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground">Add a photo of the dumped waste</p>
            <p className="text-sm text-muted-foreground">
              JPG, PNG or WEBP up to {REPORT_IMAGE_MAX_BYTES / (1024 * 1024)} MB. Drag and drop works on desktop.
            </p>
          </div>
          <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
            <Button size="lg" className="min-h-14 text-base" onClick={() => cameraInput.current?.click()}>
              <IconCamera size={20} aria-hidden="true" />
              Take Photo
            </Button>
            <Button size="lg" variant="outline" className="min-h-14 text-base" onClick={() => galleryInput.current?.click()}>
              <IconPhoto size={20} aria-hidden="true" />
              Upload from Gallery
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
