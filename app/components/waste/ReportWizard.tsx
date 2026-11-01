import { IconAlertOctagon, IconArrowLeft, IconArrowRight, IconCheck, IconCircleCheck, IconMapPin } from "@tabler/icons-react";
import { useMemo, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getCategory, QUANTITY_OPTIONS, type ReportLocation, type WasteCategoryId, type WasteQuantity, type WasteReport } from "@/lib/waste";
import { cn } from "@/lib/utils";
import { submitReport } from "@/services/reports";
import { uploadReportImage, validateReportImage } from "@/services/report-images";

import { CategoryBadge, StatusBadge } from "./badges";
import { CategorySelector } from "./CategorySelector";
import { ImageUploader, type PhotoUploadState } from "./ImageUploader";
import { LocationPicker } from "./LocationPicker";

const STEPS = ["Photo & AI", "Location", "Details", "Review"];
const SENSITIVE_OPTIONS = ["School", "Hospital", "Residential area", "Water body", "Market", "Other"];
const DURATION_OPTIONS = ["Less than 1 day", "1–3 days", "3–7 days", "More than 1 week", "Unknown"];
const SUBMIT_ERROR_MESSAGE = "Your waste report could not be submitted. Please try again.";

export function ReportWizard() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<PhotoUploadState>("idle");
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [category, setCategory] = useState<WasteCategoryId | null>(null);
  const [location, setLocation] = useState<ReportLocation | null>(null);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState<WasteQuantity>("medium");
  const [duration, setDuration] = useState("");
  const [blockingTraffic, setBlockingTraffic] = useState(false);
  const [sensitive, setSensitive] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [submitted, setSubmitted] = useState<WasteReport | null>(null);
  const uploadRun = useRef(0);
  const submitInFlight = useRef(false);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const startUpload = (selected: File) => {
    const run = ++uploadRun.current;
    setUploadState("uploading");
    setUploadedPath(null);
    setPhotoError(null);
    uploadReportImage(selected).then(
      (path) => {
        if (run !== uploadRun.current) return;
        setUploadedPath(path);
        setUploadState("done");
      },
      (error: unknown) => {
        if (run !== uploadRun.current) return;
        setPhotoError(error instanceof Error ? error.message : "Photo upload failed. Please try again.");
        setUploadState("error");
      },
    );
  };

  const handleSelectImage = (selected: File) => {
    const validationError = validateReportImage(selected);
    if (validationError) {
      uploadRun.current++;
      setFile(null);
      setUploadedPath(null);
      setPhotoError(validationError);
      setUploadState("error");
      return;
    }
    setFile(selected);
    startUpload(selected);
  };

  const handleRemoveImage = () => {
    uploadRun.current++;
    setFile(null);
    setUploadedPath(null);
    setPhotoError(null);
    setUploadState("idle");
  };

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (submitInFlight.current || !category || !location || !uploadedPath) return;
    submitInFlight.current = true;
    setSubmitting(true);
    setSubmitError(false);
    try {
      const report = await submitReport({
        category,
        description,
        quantity,
        durationLabel: duration || "Unknown",
        blockingTraffic,
        sensitiveLocations: sensitive,
        location,
        imagePath: uploadedPath,
      });
      setSubmitted(report);
    } catch (error) {
      console.error("Waste report submission failed", error);
      setSubmitError(true);
    } finally {
      submitInFlight.current = false;
      setSubmitting(false);
    }
  };

  const resetWizard = () => {
    uploadRun.current++;
    setStep(1);
    setFile(null);
    setUploadState("idle");
    setUploadedPath(null);
    setPhotoError(null);
    setCategory(null);
    setLocation(null);
    setDescription("");
    setQuantity("medium");
    setDuration("");
    setBlockingTraffic(false);
    setSensitive([]);
    setSubmitted(null);
    setSubmitError(false);
  };

  const toggleSensitive = (option: string) => {
    setSensitive((current) => (current.includes(option) ? current.filter((item) => item !== option) : [...current, option]));
  };

  if (submitted) {
    return (
      <section aria-labelledby="success-title" className="animate-fade-up mx-auto max-w-xl space-y-6 rounded-3xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
        <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-success/10 text-success">
          <IconCircleCheck size={44} aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h2 id="success-title" className="text-2xl font-semibold text-foreground">
            Report Submitted Successfully
          </h2>
          <p className="text-muted-foreground">Your report has been registered.</p>
        </div>
        <dl className="grid grid-cols-2 gap-4 rounded-2xl bg-muted/60 p-4 text-left">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Report ID</dt>
            <dd className="mt-1 font-mono text-base font-semibold text-foreground">{submitted.reportNumber}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Status</dt>
            <dd className="mt-1">
              <StatusBadge status={submitted.status} />
            </dd>
          </div>
        </dl>
        <div className="grid gap-3 sm:grid-cols-3">
          <Button asChild size="lg" className="min-h-12">
            <Link to={`/problems/${submitted.reportNumber}`}>Track Report</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="min-h-12">
            <Link to="/map">View on Map</Link>
          </Button>
          <Button size="lg" variant="ghost" className="min-h-12" onClick={resetWizard}>
            Report Another Problem
          </Button>
        </div>
      </section>
    );
  }

  const selectedCategory = category ? getCategory(category) : null;
  const canContinueFromPhoto = uploadState === "done" && uploadedPath !== null && category !== null;

  return (
    <div className="space-y-6">
      <nav aria-label="Report progress">
        <ol className="flex items-center gap-2">
          {STEPS.map((label, index) => {
            const number = index + 1;
            const done = number < step;
            const current = number === step;
            return (
              <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    done && "bg-success text-white",
                    current && "bg-primary text-primary-foreground",
                    !done && !current && "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <IconCheck size={16} aria-hidden="true" /> : number}
                </span>
                <span className={cn("hidden truncate text-sm sm:inline", current ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
                {index < STEPS.length - 1 ? <span className="h-px flex-1 bg-border" aria-hidden="true" /> : null}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-sm text-muted-foreground sm:hidden">
          Step {step} of {STEPS.length}: {STEPS[step - 1]}
        </p>
      </nav>

      {step === 1 ? (
        <section aria-labelledby="step-photo" className="space-y-5">
          <h2 id="step-photo" className="sr-only">
            Upload image
          </h2>
          <ImageUploader
            previewUrl={previewUrl}
            uploadState={uploadState}
            photoError={photoError}
            onSelect={handleSelectImage}
            onRemove={handleRemoveImage}
            onRetry={() => file && startUpload(file)}
          />

          {!file && photoError ? (
            <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
              {photoError}
            </p>
          ) : null}

          {file ? (
            <Card className="space-y-4 rounded-2xl border-border/70 p-5 shadow-sm">
              <div>
                <h3 className="text-base font-semibold text-foreground">Choose the waste category</h3>
                <p className="text-sm text-muted-foreground">Pick the type of waste shown in your photo.</p>
              </div>
              <CategorySelector value={category} onChange={setCategory} />
              <div className="flex justify-end">
                <Button size="lg" className="min-h-12" disabled={!canContinueFromPhoto} onClick={() => setStep(2)}>
                  Continue
                  <IconArrowRight size={18} aria-hidden="true" />
                </Button>
              </div>
            </Card>
          ) : null}
        </section>
      ) : null}

      {step === 2 ? (
        <section aria-labelledby="step-location" className="space-y-5">
          <h2 id="step-location" className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <IconMapPin size={22} className="text-brand" aria-hidden="true" />
            Waste Location
          </h2>
          <LocationPicker value={location} onChange={setLocation} />
          <StepActions onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!location} />
        </section>
      ) : null}

      {step === 3 ? (
        <form onSubmit={(event) => {
          event.preventDefault();
          setStep(4);
        }} className="space-y-6" aria-labelledby="step-details">
          <h2 id="step-details" className="text-lg font-semibold text-foreground">
            Report Details
          </h2>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe where the garbage was found and any additional information..."
              className="min-h-28 text-base"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Approximate Waste Quantity</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {QUANTITY_OPTIONS.map((option) => {
                const active = option.value === quantity;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setQuantity(option.value)}
                    className={cn(
                      "flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition",
                      active ? "border-brand bg-accent text-accent-foreground" : "border-border bg-card text-foreground hover:bg-muted/60",
                    )}
                  >
                    {active ? <IconCheck size={16} aria-hidden="true" /> : null}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="duration-select">How long has it been there?</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="duration-select" className="min-h-12 w-full">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="space-y-0.5">
              <Label htmlFor="blocking-traffic" className="text-sm font-medium">
                Is it blocking traffic?
              </Label>
              <p className="text-sm text-muted-foreground">Turn on if vehicles or people cannot pass.</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="w-8 text-sm font-medium text-foreground" aria-hidden="true">
                {blockingTraffic ? "Yes" : "No"}
              </span>
              <Switch id="blocking-traffic" checked={blockingTraffic} onCheckedChange={setBlockingTraffic} />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Is it near a sensitive location?</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SENSITIVE_OPTIONS.map((option) => (
                <label
                  key={option}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm font-medium transition",
                    sensitive.includes(option) ? "border-brand bg-accent text-accent-foreground" : "border-border bg-card text-foreground hover:bg-muted/60",
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-5 accent-primary"
                    checked={sensitive.includes(option)}
                    onChange={() => toggleSensitive(option)}
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>

          <StepActions onBack={() => setStep(2)} nextType="submit" nextLabel="Review Report" />
        </form>
      ) : null}

      {step === 4 ? (
        <section aria-labelledby="step-review" className="space-y-5">
          <h2 id="step-review" className="text-lg font-semibold text-foreground">
            Review your report
          </h2>
          <Card className="rounded-2xl border-border/70 p-4 shadow-sm sm:p-5">
            <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
              <div className="aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
                {previewUrl ? <img src={previewUrl} alt="Waste photo to be submitted" className="size-full object-cover" /> : null}
              </div>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Waste category</dt>
                  <dd className="mt-1">{selectedCategory ? <CategoryBadge category={selectedCategory.id} /> : "Not set"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Quantity</dt>
                  <dd className="mt-1 font-medium text-foreground">{QUANTITY_OPTIONS.find((option) => option.value === quantity)?.label}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">Location</dt>
                  <dd className="mt-1 text-foreground">{location ? location.address : "Not set"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">Description</dt>
                  <dd className="mt-1 text-foreground">{description.trim() || "No description added"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Blocking traffic</dt>
                  <dd className="mt-1 text-foreground">{blockingTraffic ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Sensitive location</dt>
                  <dd className="mt-1 text-foreground">{sensitive.length ? sensitive.join(", ") : "None"}</dd>
                </div>
              </dl>
            </div>
          </Card>

          {submitError ? (
            <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
              {SUBMIT_ERROR_MESSAGE}
            </p>
          ) : null}

          <Button size="lg" className="min-h-14 w-full text-base" onClick={() => handleSubmit()} disabled={submitting || !category || !location || !uploadedPath}>
            <IconAlertOctagon size={20} aria-hidden="true" />
            {submitting ? "Submitting..." : "Submit Waste Report"}
          </Button>
          <StepActions onBack={() => setStep(3)} />
        </section>
      ) : null}
    </div>
  );
}

function StepActions({
  onBack,
  onNext,
  nextDisabled = false,
  nextType = "button",
  nextLabel = "Continue",
}: {
  onBack: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextType?: "button" | "submit";
  nextLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <Button type="button" variant="ghost" className="min-h-12" onClick={onBack}>
        <IconArrowLeft size={18} aria-hidden="true" />
        Back
      </Button>
      {onNext || nextType === "submit" ? (
        <Button type={nextType} size="lg" className="min-h-12 px-6" onClick={onNext} disabled={nextDisabled}>
          {nextLabel}
          <IconArrowRight size={18} aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}
