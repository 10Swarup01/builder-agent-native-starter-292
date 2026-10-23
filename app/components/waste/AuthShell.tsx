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
      <p className="mt-6 max-w-sm text-center text-xs text-muted-foreground">Authentication is not connected yet. Sign-in will be added with Supabase Auth.</p>
    </main>
  );
}

export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.6 14.6 2.6 12 2.6 6.8 2.6 2.6 6.8 2.6 12s4.2 9.4 9.4 9.4c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}
