import { IconBrandInstagram, IconBrandLinkedin, IconBrandWhatsapp, IconBrandX, IconMail, IconPhone, IconWorld, type Icon } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/waste/PageHeader";
import { AsyncContent, LoadingState } from "@/components/waste/states";
import { useServiceData } from "@/hooks/use-service-data";
import { getContactChannels } from "@/services/contact";

export function meta() {
  return [{ title: "Contact · WasteWise AI" }];
}

const CHANNEL_ICON: Record<string, Icon> = {
  email: IconMail,
  instagram: IconBrandInstagram,
  linkedin: IconBrandLinkedin,
  x: IconBrandX,
  whatsapp: IconBrandWhatsapp,
  website: IconWorld,
};

export default function ContactRoute() {
  const channels = useServiceData(getContactChannels);

  return (
    <div className="space-y-6">
      <PageHeader title="Contact WasteWise AI" icon={IconPhone} description="Have a question, suggestion, technical issue or want to collaborate with our project?" demo />

      <AsyncContent loading={channels.loading} error={channels.error} onRetry={channels.retry} skeleton={<LoadingState />}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(channels.data ?? []).map((channel) => {
            const Icon = CHANNEL_ICON[channel.id];
            return (
              <Card key={channel.id} className="flex flex-col gap-4 rounded-2xl border-border/70 p-5 shadow-sm transition hover:shadow-md">
                <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-brand">
                  <Icon size={24} aria-hidden="true" />
                </span>
                <div className="flex-1 space-y-1">
                  <h2 className="text-base font-semibold text-foreground">{channel.label}</h2>
                  <p className="text-sm text-muted-foreground">{channel.description}</p>
                </div>
                <Button
                  variant="outline"
                  className="min-h-11 w-full"
                  onClick={() => toast.info(`${channel.label} link is a placeholder until the admin contact settings are connected.`)}
                >
                  Open {channel.label}
                </Button>
              </Card>
            );
          })}
        </div>
      </AsyncContent>
    </div>
  );
}
