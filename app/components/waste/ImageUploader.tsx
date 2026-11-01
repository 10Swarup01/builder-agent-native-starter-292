import { IconCamera, IconCircleCheck, IconLoader2, IconPhoto, IconRefresh, IconTrash, IconUpload } from "@tabler/icons-react";
import { useRef, useState, type DragEvent } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PHOTO_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

export type PhotoUploadState = "idle" | "uploading" | "done" | "error";

interface ImageUploaderProps {
  previewUrl: string | null;
  scanning: boolean;
  uploadState: PhotoUploadState;
  photoError: string | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
  onRetryUpload: () => void;
}

export function ImageUploader({ previewUrl, scanning, uploadState, photoError, onSelect, onRemove, onRetryUpload }: ImageUploaderProps) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

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
            {scanning ? (
              <div className="absolute inset-x-0 top-0 h-1/3 animate-scan bg-linear-to-b from-transparent via-brand/30 to-transparent" aria-hidden="true" />
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="min-h-12" onClick={() => galleryInput.current?.click()}>
              <IconRefresh size={18} aria-hidden="true" />
              Change Image
            </Button>
            <Button variant="outline" className="min-h-12 text-danger hover:text-danger" onClick={onRemove}>
              <IconTrash size={18} aria-hidden="true" />
              Remove Image
            </Button>
          </div>
          {uploadState === "uploading" ? (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <IconLoader2 size={18} className="animate-spin" aria-hidden="true" />
              Uploading your photo...
            </p>
          ) : null}
          {uploadState === "done" ? (
            <p role="status" className="flex items-center gap-2 text-sm text-success">
              <IconCircleCheck size={18} aria-hidden="true" />
              Photo uploaded. You can continue.
            </p>
          ) : null}
          {uploadState === "error" ? (
            <div className="flex flex-col gap-3 rounded-xl bg-danger/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p role="alert" className="text-sm text-danger">{photoError}</p>
              <Button variant="outline" className="min-h-11 shrink-0" onClick={onRetryUpload}>
                <IconRefresh size={18} aria-hidden="true" />
                Try Upload Again
              </Button>
            </div>
          ) : null}
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
            <p className="text-sm text-muted-foreground">JPG or PNG. Drag and drop works on desktop.</p>
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
      {photoError && uploadState !== "error" ? (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{photoError}</p>
      ) : null}
    </div>
  );
}
