import { IconCode } from "@tabler/icons-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/waste/PageHeader";
import { AsyncContent, LoadingState } from "@/components/waste/states";
import { useServiceData } from "@/hooks/use-service-data";
import { getDeveloperContact } from "@/services/contact";

export function meta() {
  return [{ title: "Developer Contact · Admin · WasteWise AI" }];
}

type ContactFields = Awaited<ReturnType<typeof getDeveloperContact>>;

const FIELDS: { key: keyof ContactFields; label: string; placeholder: string; type: string }[] = [
  { key: "email", label: "Email", placeholder: "name@example.com", type: "email" },
  { key: "instagram", label: "Instagram", placeholder: "Profile URL", type: "url" },
  { key: "linkedin", label: "LinkedIn", placeholder: "Profile URL", type: "url" },
  { key: "x", label: "X", placeholder: "Profile URL", type: "url" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "Community invite URL", type: "url" },
  { key: "website", label: "Website", placeholder: "https://", type: "url" },
];

export default function AdminDeveloperContactRoute() {
  const contact = useServiceData(getDeveloperContact);

  return (
    <div className="space-y-6">
      <PageHeader title="Developer Contact" description="Public contact links shown on the Contact page." icon={IconCode} />
      <AsyncContent loading={contact.loading} error={contact.error} onRetry={contact.retry} skeleton={<LoadingState variant="detail" />}>
        {contact.data ? <DeveloperContactForm initial={contact.data} /> : null}
      </AsyncContent>
    </div>
  );
}

function DeveloperContactForm({ initial }: { initial: ContactFields }) {
  const [values, setValues] = useState<ContactFields>(initial);

  const save = (event: FormEvent) => {
    event.preventDefault();
    toast.success("Developer contact saved. Demo only: connect Supabase to persist changes.");
  };

  return (
    <Card className="rounded-2xl border-border/70 p-5 shadow-sm sm:p-6">
      <form onSubmit={save} className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.key} className={field.key === "email" || field.key === "website" ? "space-y-2 sm:col-span-2" : "space-y-2"}>
            <Label htmlFor={`contact-${field.key}`}>{field.label}</Label>
            <Input
              id={`contact-${field.key}`}
              type={field.type}
              placeholder={field.placeholder}
              value={values[field.key]}
              onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
              className="min-h-11"
            />
          </div>
        ))}
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" className="min-h-11">
            Save contact details
          </Button>
        </div>
      </form>
    </Card>
  );
}
