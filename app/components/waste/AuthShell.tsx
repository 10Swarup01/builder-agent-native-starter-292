import type { ReactNode } from "react";

import { BrandMark } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/card";

export function AuthShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-linear-to-br from-accent/60 via-background to-muted px-4 py-10">
      <div className="mb-8">
        <BrandMark />
      </div>
      <Card className="w-full max-w-md space-y-6 rounded-3xl border-border/70 p-6 shadow-lg sm:p-8">
        <header className="space-y-1.5 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </header>
        {children}
      </Card>
    </main>
  );
}
