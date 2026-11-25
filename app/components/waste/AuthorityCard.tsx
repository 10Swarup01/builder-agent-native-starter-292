import { IconArrowRight, IconBuildingCommunity, IconCircleCheck, IconMail, IconMapPin, IconPhone } from "@tabler/icons-react";
import { Link } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Authority } from "@/lib/waste";

export function AuthorityCard({ authority }: { authority: Authority }) {
  const isVerified = authority.isVerified ?? authority.isActive;
  const hasPhone = authority.phone && authority.phone !== "Not listed";

  return (
    <Card className="flex flex-col gap-4 rounded-2xl border-border/70 p-5 shadow-sm transition duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-brand">
            <IconBuildingCommunity size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">{authority.ward}</h3>
            <p className="text-sm text-muted-foreground">{authority.municipality || authority.area}</p>
          </div>
        </div>
        {isVerified ? (
          <Badge variant="outline" className="gap-1 border-success/30 bg-success/10 text-success text-[11px] font-medium shrink-0">
            <IconCircleCheck size={12} aria-hidden="true" />
            Verified
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground text-[11px] shrink-0">
            Pending
          </Badge>
        )}
      </div>

      <dl className="space-y-2.5 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Councillor / Authority</dt>
          <dd className="font-semibold text-foreground">{authority.name}</dd>
          <dd className="text-xs text-muted-foreground">{authority.designation}</dd>
        </div>
        <div className="flex items-start gap-2">
          <IconMapPin size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <dd className="text-foreground text-xs leading-relaxed">{authority.officeAddress}</dd>
        </div>
        {hasPhone ? (
          <div className="flex items-center gap-2">
            <IconPhone size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            <dd className="text-foreground text-xs font-mono">{authority.phone}</dd>
          </div>
        ) : null}
        {authority.email && authority.email !== "Not listed" ? (
          <div className="flex items-center gap-2">
            <IconMail size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            <dd className="truncate text-foreground text-xs">{authority.email}</dd>
          </div>
        ) : null}
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
