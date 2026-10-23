import { IconArrowRight, IconBuildingCommunity, IconMail, IconMapPin, IconPhone } from "@tabler/icons-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Authority } from "@/lib/waste";

export function AuthorityCard({ authority }: { authority: Authority }) {
  return (
    <Card className="flex flex-col gap-4 rounded-2xl border-border/70 p-5 shadow-sm transition duration-200 hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-brand">
          <IconBuildingCommunity size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">{authority.ward}</h3>
          <p className="text-sm text-muted-foreground">{authority.area}</p>
        </div>
      </div>
      <dl className="space-y-2.5 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Responsible Authority</dt>
          <dd className="font-medium text-foreground">{authority.name}</dd>
          <dd className="text-muted-foreground">{authority.designation}</dd>
        </div>
        <div className="flex items-start gap-2">
          <IconMapPin size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <dd className="text-foreground">{authority.officeAddress}</dd>
        </div>
        <div className="flex items-center gap-2">
          <IconPhone size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          <dd className="text-foreground">{authority.phone}</dd>
        </div>
        <div className="flex items-center gap-2">
          <IconMail size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          <dd className="truncate text-foreground">{authority.email}</dd>
        </div>
      </dl>
      {!authority.isActive ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">Inactive — no new reports are routed here.</p>
      ) : null}
      <Button asChild variant="outline" className="mt-auto min-h-11">
        <Link to={`/authorities/${authority.id}`}>
          View Area Reports
          <IconArrowRight size={16} aria-hidden="true" />
        </Link>
      </Button>
    </Card>
  );
}
