import { IconBuildingCommunity, IconPencil, IconPlus } from "@tabler/icons-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/waste/PageHeader";
import { AsyncContent, LoadingState } from "@/components/waste/states";
import { useServiceData } from "@/hooks/use-service-data";
import type { Authority } from "@/lib/waste";
import { toast } from "sonner";
import { listAuthorities } from "@/services/authorities";

export function meta() {
  return [{ title: "Authorities · Admin · WasteWise AI" }];
}

type AuthorityDraft = Omit<Authority, "activeReports" | "resolvedReports" | "averageResolutionHours">;

const WARDS = ["Demo Ward A", "Demo Ward B", "Demo Ward C", "Demo Ward D"];

const EMPTY_DRAFT: AuthorityDraft = {
  id: "",
  name: "",
  designation: "Councillor / Municipal Representative",
  ward: WARDS[0],
  area: "",
  officeAddress: "",
  phone: "",
  email: "",
  isActive: true,
};

export default function AdminAuthoritiesRoute() {
  const loaded = useServiceData(listAuthorities);
  const [edits, setEdits] = useState<Authority[] | null>(null);
  const [draft, setDraft] = useState<AuthorityDraft | null>(null);
  const [isNew, setIsNew] = useState(false);

  const authorities = edits ?? loaded.data ?? [];

  const openNew = () => {
    setIsNew(true);
    setDraft({ ...EMPTY_DRAFT, id: `auth-${Date.now()}` });
  };

  const openEdit = (authority: Authority) => {
    setIsNew(false);
    setDraft({
      id: authority.id,
      name: authority.name,
      designation: authority.designation,
      ward: authority.ward,
      area: authority.area,
      officeAddress: authority.officeAddress,
      phone: authority.phone,
      email: authority.email,
      isActive: authority.isActive,
    });
  };

  const saveDraft = (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setEdits(() => {
      if (isNew) {
        return [...authorities, { ...draft, activeReports: 0, resolvedReports: 0, averageResolutionHours: 0 }];
      }
      return authorities.map((authority) => (authority.id === draft.id ? { ...authority, ...draft } : authority));
    });
    toast.success(`${isNew ? "Authority added" : "Authority updated"}. Demo only: connect Supabase to persist changes.`);
    setDraft(null);
  };

  const toggleActive = (id: string) => {
    setEdits(authorities.map((authority) => (authority.id === id ? { ...authority, isActive: !authority.isActive } : authority)));
  };

  const update = <K extends keyof AuthorityDraft>(key: K, value: AuthorityDraft[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Authorities"
        description="Responsible councillors and municipal representatives for each ward."
        icon={IconBuildingCommunity}
        demo
        actions={
          <Button className="min-h-11" onClick={openNew}>
            <IconPlus size={18} aria-hidden="true" />
            Add Authority
          </Button>
        }
      />

      <AsyncContent loading={loaded.loading} error={loaded.error} onRetry={loaded.retry} skeleton={<LoadingState variant="detail" />}>
        <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card shadow-sm md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Authority</TableHead>
                <TableHead>Ward</TableHead>
                <TableHead>Office</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {authorities.map((authority) => (
                <TableRow key={authority.id}>
                  <TableCell>
                    <p className="font-medium">{authority.name}</p>
                    <p className="text-xs text-muted-foreground">{authority.designation}</p>
                  </TableCell>
                  <TableCell>{authority.ward}</TableCell>
                  <TableCell className="max-w-48 text-sm">{authority.officeAddress}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{authority.phone}</TableCell>
                  <TableCell className="text-sm">{authority.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={authority.isActive} onCheckedChange={() => toggleActive(authority.id)} aria-label={`Active status for ${authority.name}`} />
                      <span className="text-sm text-muted-foreground">{authority.isActive ? "Active" : "Inactive"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="min-h-9" onClick={() => openEdit(authority)} aria-label={`Edit ${authority.name}`}>
                      <IconPencil size={15} aria-hidden="true" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-3 md:hidden">
          {authorities.map((authority) => (
            <Card key={authority.id} className="space-y-3 rounded-2xl border-border/70 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{authority.name}</p>
                  <p className="text-sm text-muted-foreground">{authority.ward}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={authority.isActive} onCheckedChange={() => toggleActive(authority.id)} aria-label={`Active status for ${authority.name}`} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{authority.officeAddress}</p>
              <Button variant="outline" className="min-h-11 w-full" onClick={() => openEdit(authority)}>
                <IconPencil size={16} aria-hidden="true" />
                Edit authority
              </Button>
            </Card>
          ))}
        </div>
      </AsyncContent>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNew ? "Add authority" : "Edit authority"}</DialogTitle>
            <DialogDescription>Demo form. Changes stay on this screen until the backend is connected.</DialogDescription>
          </DialogHeader>
          {draft ? (
            <form id="authority-form" className="grid gap-4 sm:grid-cols-2" onSubmit={saveDraft}>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="auth-name">Authority name</Label>
                <Input id="auth-name" required value={draft.name} onChange={(event) => update("name", event.target.value)} className="min-h-11" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="auth-designation">Designation</Label>
                <Input id="auth-designation" required value={draft.designation} onChange={(event) => update("designation", event.target.value)} className="min-h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-ward">Assigned ward</Label>
                <Select value={draft.ward} onValueChange={(value) => update("ward", value)}>
                  <SelectTrigger id="auth-ward" className="min-h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WARDS.map((ward) => (
                      <SelectItem key={ward} value={ward}>
                        {ward}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-area">Area</Label>
                <Input id="auth-area" value={draft.area} onChange={(event) => update("area", event.target.value)} className="min-h-11" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="auth-office">Office address</Label>
                <Input id="auth-office" value={draft.officeAddress} onChange={(event) => update("officeAddress", event.target.value)} className="min-h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-phone">Official phone</Label>
                <Input id="auth-phone" type="tel" required value={draft.phone} onChange={(event) => update("phone", event.target.value)} className="min-h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-email">Official email</Label>
                <Input id="auth-email" type="email" required value={draft.email} onChange={(event) => update("email", event.target.value)} className="min-h-11" />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-4 sm:col-span-2">
                <Label htmlFor="auth-active">Active authority</Label>
                <Switch id="auth-active" checked={draft.isActive} onCheckedChange={(value) => update("isActive", value)} />
              </div>
            </form>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button type="submit" form="authority-form" className="min-h-11">
              Save authority
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
