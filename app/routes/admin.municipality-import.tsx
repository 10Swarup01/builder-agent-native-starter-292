import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconDatabase,
  IconFileSpreadsheet,
  IconFileUpload,
  IconPencil,
  IconRefresh,
  IconSearch,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/waste/PageHeader";

export function meta() {
  return [{ title: "Municipality Data Importer · Admin · WasteWise AI" }];
}

interface StagingRecord {
  id: string;
  job_id: string;
  state: string;
  district: string;
  municipality: string;
  municipality_type: string;
  ward_number: number;
  councillor_name: string | null;
  councillor_name_bengali: string | null;
  designation: string;
  contact_number: string | null;
  alternate_contact_number: string | null;
  email: string | null;
  office_address: string | null;
  pin_code: string | null;
  confidence: number;
  verification_status: "pending" | "needs_review" | "approved" | "rejected" | "imported";
  warnings: string[];
  created_at: string;
}

interface ImportJob {
  id: string;
  created_at: string;
  status: string;
  total_records_extracted: number;
  processed_images: number;
}

export default function AdminMunicipalityImportRoute() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [records, setRecords] = useState<StagingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit record dialog state
  const [editingRecord, setEditingRecord] = useState<StagingRecord | null>(null);

  // Bulk import dialog state
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [allowOverwrite, setAllowOverwrite] = useState(false);
  const [importing, setImporting] = useState(false);

  // Upload dialog state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDistrict, setUploadDistrict] = useState("Kolkata");
  const [uploadMunicipality, setUploadMunicipality] = useState("Kolkata Municipal Corporation");

  // Load jobs list
  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/municipality/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        if (data.jobs?.length > 0 && !selectedJobId) {
          setSelectedJobId(data.jobs[0].id);
        }
      }
    } catch (err) {
      console.warn("Could not fetch jobs:", err);
    }
  }, [selectedJobId]);

  // Load staging records for selected job
  const loadRecords = useCallback(async (jobId?: string) => {
    const targetJob = jobId || selectedJobId;
    if (!targetJob) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/municipality/records?jobId=${targetJob}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch (err) {
      toast.error("Could not load staging records.");
    } finally {
      setLoading(false);
    }
  }, [selectedJobId]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (selectedJobId) {
      loadRecords(selectedJobId);
    }
  }, [selectedJobId, loadRecords]);

  // Seed 129 Kolkata wards
  const handleSeedDataset = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/municipality/seed-dataset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to seed dataset.");

      toast.success(`Staged ${data.totalRecords} Kolkata ward records! (${data.flaggedForReview} flagged for review)`);
      setSelectedJobId(data.jobId);
      await loadJobs();
      await loadRecords(data.jobId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load pre-validated dataset.");
    } finally {
      setLoading(false);
    }
  };

  // Update a single staging record status or details
  const updateRecordStatus = async (id: string, status: StagingRecord["verification_status"]) => {
    try {
      const res = await fetch("/api/admin/municipality/records", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, verification_status: status }),
      });
      if (!res.ok) throw new Error("Update failed");

      setRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, verification_status: status } : r)),
      );
      toast.success(`Record marked as ${status}`);
    } catch {
      toast.error("Failed to update status.");
    }
  };

  // Save edits from modal
  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    try {
      const res = await fetch("/api/admin/municipality/records", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingRecord),
      });
      if (!res.ok) throw new Error("Save failed");

      setRecords((prev) =>
        prev.map((r) => (r.id === editingRecord.id ? editingRecord : r)),
      );
      toast.success(`Ward ${editingRecord.ward_number} updated.`);
      setEditingRecord(null);
    } catch {
      toast.error("Failed to save changes.");
    }
  };

  // Execute Gemini vision extraction
  const handleExtractImage = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        try {
          const res = await fetch("/api/admin/municipality/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: base64,
              mimeType: selectedFile.type,
              fileName: selectedFile.name,
              metadataContext: {
                district: uploadDistrict,
                municipality: uploadMunicipality,
              },
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Extraction failed.");

          toast.success(`Extracted ${data.recordsExtracted} records using Gemini Vision!`);
          setShowUploadDialog(false);
          setSelectedFile(null);
          setSelectedJobId(data.jobId);
          await loadJobs();
          await loadRecords(data.jobId);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Extraction failed.");
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch {
      toast.error("Failed to process file.");
      setUploading(false);
    }
  };

  // Execute bulk import
  const handleExecuteBulkImport = async () => {
    if (!selectedJobId) return;
    setImporting(true);
    try {
      const res = await fetch("/api/admin/municipality/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: selectedJobId,
          allowOverwriteVerified: allowOverwrite,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk import failed.");

      toast.success(
        `Import completed! Inserted: ${data.inserted}, Updated: ${data.updated}, Skipped: ${data.skipped}.`,
      );
      setShowImportConfirm(false);
      await loadRecords(selectedJobId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk import failed.");
    } finally {
      setImporting(false);
    }
  };

  // Approve all clean records
  const handleApproveAllClean = async () => {
    const cleanPending = records.filter(
      (r) => r.verification_status === "pending" && r.warnings.length === 0 && r.councillor_name,
    );
    if (cleanPending.length === 0) {
      toast.info("No unflagged pending records to approve.");
      return;
    }

    try {
      await Promise.all(
        cleanPending.map((r) =>
          fetch("/api/admin/municipality/records", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: r.id, verification_status: "approved" }),
          }),
        ),
      );
      setRecords((prev) =>
        prev.map((r) =>
          r.verification_status === "pending" && r.warnings.length === 0 && r.councillor_name
            ? { ...r, verification_status: "approved" }
            : r,
        ),
      );
      toast.success(`Approved ${cleanPending.length} clean records!`);
    } catch {
      toast.error("Could not approve all records.");
    }
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesStatus = filterStatus === "all" || r.verification_status === filterStatus;
      const term = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !term ||
        String(r.ward_number).includes(term) ||
        (r.councillor_name && r.councillor_name.toLowerCase().includes(term)) ||
        (r.office_address && r.office_address.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [records, filterStatus, searchQuery]);

  const approvedCount = useMemo(() => records.filter((r) => r.verification_status === "approved").length, [records]);
  const needsReviewCount = useMemo(() => records.filter((r) => r.verification_status === "needs_review").length, [records]);
  const importedCount = useMemo(() => records.filter((r) => r.verification_status === "imported").length, [records]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Municipality Data Importer"
          description="Extract, review, and import official councillor records with Gemini Vision OCR."
          icon={IconFileSpreadsheet}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleSeedDataset} disabled={loading} variant="outline" className="gap-2">
            <IconDatabase size={16} />
            Stage Kolkata 129 Wards
          </Button>
          <Button onClick={() => setShowUploadDialog(true)} disabled={loading} className="gap-2">
            <IconFileUpload size={16} />
            Upload Roster Image
          </Button>
        </div>
      </div>

      {/* Stats and Action Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Total Staged</p>
          <p className="text-2xl font-bold">{records.length}</p>
        </Card>
        <Card className="border-warning/30 bg-warning/5 p-4">
          <p className="text-xs font-medium text-warning">Needs Review</p>
          <p className="text-2xl font-bold text-warning">{needsReviewCount}</p>
        </Card>
        <Card className="border-success/30 bg-success/5 p-4">
          <p className="text-xs font-medium text-success">Approved</p>
          <p className="text-2xl font-bold text-success">{approvedCount}</p>
        </Card>
        <Card className="border-brand/30 bg-brand/5 p-4">
          <p className="text-xs font-medium text-brand">Imported</p>
          <p className="text-2xl font-bold text-brand">{importedCount}</p>
        </Card>
      </div>

      {/* Main Content Area */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="job-select" className="text-sm font-medium">Job:</Label>
              <Select value={selectedJobId || ""} onValueChange={(val) => setSelectedJobId(val)}>
                <SelectTrigger id="job-select" className="w-[200px]">
                  <SelectValue placeholder="Select Job" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {new Date(j.created_at).toLocaleDateString()} ({j.total_records_extracted} wards)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="ghost" size="icon" onClick={() => loadRecords()} title="Refresh">
              <IconRefresh size={16} />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {records.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleApproveAllClean}
                className="text-xs text-success hover:bg-success/10 hover:text-success"
              >
                <IconCheck size={14} className="mr-1" /> Approve All Clean
              </Button>
            ) : null}

            <Button
              size="sm"
              disabled={approvedCount === 0}
              onClick={() => setShowImportConfirm(true)}
              className="gap-2 bg-brand text-xs font-semibold text-brand-foreground"
            >
              <IconDatabase size={14} />
              Bulk Import Approved ({approvedCount})
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1">
            {(["all", "needs_review", "pending", "approved", "imported", "rejected"] as const).map((st) => (
              <Button
                key={st}
                size="sm"
                variant={filterStatus === st ? "secondary" : "ghost"}
                onClick={() => setFilterStatus(st)}
                className="capitalize text-xs"
              >
                {st.replace("_", " ")}
              </Button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search ward or councillor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>
        </div>

        {/* Staging Records Table */}
        <div className="mt-4 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Ward</TableHead>
                <TableHead>Councillor</TableHead>
                <TableHead>Office Address & PIN</TableHead>
                <TableHead className="w-28">Confidence</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Loading staging records...
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No staging records found. Use "Stage Kolkata 129 Wards" or upload an image to begin.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((rec) => (
                  <TableRow key={rec.id} className={rec.verification_status === "needs_review" ? "bg-warning/5" : undefined}>
                    <TableCell className="font-mono font-bold">
                      {rec.ward_number ? `Ward ${rec.ward_number}` : <span className="text-destructive font-normal">Missing</span>}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-foreground">
                          {rec.councillor_name || <span className="italic text-muted-foreground">Vacant / Unlisted</span>}
                        </p>
                        {rec.councillor_name_bengali ? (
                          <p className="text-xs text-muted-foreground">{rec.councillor_name_bengali}</p>
                        ) : null}
                        {rec.contact_number ? (
                          <p className="text-xs text-muted-foreground">📞 {rec.contact_number}</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground">{rec.office_address || "No office address"}</p>
                      {rec.pin_code ? <Badge variant="outline" className="mt-1 text-[10px]">PIN: {rec.pin_code}</Badge> : null}
                      {rec.warnings && rec.warnings.length > 0 ? (
                        <div className="mt-1 flex flex-col gap-0.5">
                          {rec.warnings.map((w, idx) => (
                            <span key={idx} className="flex items-center gap-1 text-[10px] text-warning font-medium">
                              <IconAlertTriangle size={12} /> {w}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={rec.confidence > 0.9 ? "default" : "secondary"}>
                        {Math.round(rec.confidence * 100)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          rec.verification_status === "approved"
                            ? "default"
                            : rec.verification_status === "needs_review"
                            ? "destructive"
                            : rec.verification_status === "imported"
                            ? "secondary"
                            : "outline"
                        }
                        className="capitalize"
                      >
                        {rec.verification_status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingRecord(rec)}
                          title="Edit"
                        >
                          <IconPencil size={15} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-success hover:bg-success/10 hover:text-success"
                          onClick={() => updateRecordStatus(rec.id, "approved")}
                          title="Approve"
                        >
                          <IconCheck size={16} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => updateRecordStatus(rec.id, "rejected")}
                          title="Reject"
                        >
                          <IconX size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit Record Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Ward {editingRecord?.ward_number} Record</DialogTitle>
            <DialogDescription>Review and correct extracted details before approval.</DialogDescription>
          </DialogHeader>
          {editingRecord ? (
            <div className="grid gap-3 py-2 text-sm">
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="edit-ward">Ward</Label>
                <Input
                  id="edit-ward"
                  type="number"
                  className="col-span-3"
                  value={editingRecord.ward_number || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, ward_number: Number(e.target.value) })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  className="col-span-3"
                  value={editingRecord.councillor_name || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, councillor_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="edit-bengali">Bengali</Label>
                <Input
                  id="edit-bengali"
                  className="col-span-3"
                  value={editingRecord.councillor_name_bengali || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, councillor_name_bengali: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  className="col-span-3"
                  value={editingRecord.office_address || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, office_address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="edit-pin">PIN Code</Label>
                <Input
                  id="edit-pin"
                  className="col-span-3"
                  value={editingRecord.pin_code || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, pin_code: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  className="col-span-3"
                  value={editingRecord.contact_number || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, contact_number: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editingRecord.verification_status}
                  onValueChange={(val: any) => setEditingRecord({ ...editingRecord, verification_status: val })}
                >
                  <SelectTrigger id="edit-status" className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="needs_review">Needs Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingRecord(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload & Gemini Extraction Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gemini Vision Roster OCR</DialogTitle>
            <DialogDescription>
              Upload a scanned municipal councillor roster or screenshot for automated extraction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="upload-district">District</Label>
              <Input id="upload-district" value={uploadDistrict} onChange={(e) => setUploadDistrict(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="upload-muni">Municipality</Label>
              <Input id="upload-muni" value={uploadMunicipality} onChange={(e) => setUploadMunicipality(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="file-input">Roster Image (JPG, PNG, WEBP)</Label>
              <Input
                id="file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
            <Button onClick={handleExtractImage} disabled={!selectedFile || uploading} className="gap-2">
              <IconSparkles size={16} />
              {uploading ? "Extracting with Gemini..." : "Extract Records"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Bulk Import */}
      <Dialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Bulk Production Import</DialogTitle>
            <DialogDescription>
              You are about to import {approvedCount} approved councillor records into the live{" "}
              <code className="text-xs font-mono font-semibold">municipal_authorities</code> table.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm text-muted-foreground">
            <p>
              Imported records will be marked as <strong className="text-foreground">is_verified = true</strong> and become publicly
              viewable on the citizen Authorities page.
            </p>
            <div className="flex items-start space-x-2 rounded-lg border p-3 bg-muted/40">
              <Switch
                id="overwrite-verified"
                checked={allowOverwrite}
                onCheckedChange={(checked: boolean) => setAllowOverwrite(checked)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="overwrite-verified" className="cursor-pointer font-semibold text-foreground">
                  Allow updating existing verified records
                </Label>
                <p className="text-xs text-muted-foreground">
                  If unchecked, any ward that already has a verified authority will be safely skipped to prevent accidental overwrites.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowImportConfirm(false)}>Cancel</Button>
            <Button onClick={handleExecuteBulkImport} disabled={importing} className="gap-2 bg-brand text-brand-foreground">
              {importing ? "Importing..." : `Import ${approvedCount} Records`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
