import { IconSettings } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/waste/PageHeader";

export function meta() {
  return [{ title: "Settings · Admin · WasteWise AI" }];
}

const SETTINGS = [
  { id: "auto-confirm", label: "Auto-confirm AI classifications above 90% confidence", description: "Skips manual review for confident results." },
  { id: "notify-critical", label: "Notify authorities about critical reports", description: "Sends an alert when a critical report is submitted." },
  { id: "require-proof", label: "Require before and after photos to resolve", description: "Keeps resolution evidence on every closed report." },
] as const;

export default function AdminSettingsRoute() {
  const [values, setValues] = useState<Record<(typeof SETTINGS)[number]["id"], boolean>>({
    "auto-confirm": false,
    "notify-critical": true,
    "require-proof": true,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Operational rules for classification, alerts and resolution." icon={IconSettings} demo />
      <Card className="divide-y divide-border rounded-2xl border-border/70 shadow-sm">
        {SETTINGS.map((setting) => (
          <div key={setting.id} className="flex items-center justify-between gap-4 p-5">
            <div className="space-y-0.5">
              <Label htmlFor={setting.id} className="text-sm font-medium">
                {setting.label}
              </Label>
              <p className="text-sm text-muted-foreground">{setting.description}</p>
            </div>
            <Switch id={setting.id} checked={values[setting.id]} onCheckedChange={(checked) => setValues((current) => ({ ...current, [setting.id]: checked }))} />
          </div>
        ))}
      </Card>
      <div className="flex justify-end">
        <Button className="min-h-11" onClick={() => toast.success("Settings saved. Demo only: connect Supabase to persist changes.")}>
          Save settings
        </Button>
      </div>
    </div>
  );
}
