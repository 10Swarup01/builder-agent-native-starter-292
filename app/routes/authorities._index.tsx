import { IconBuildingCommunity, IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { AuthorityCard } from "@/components/waste/AuthorityCard";
import { PageHeader } from "@/components/waste/PageHeader";
import { AsyncContent, EmptyState, LoadingState } from "@/components/waste/states";
import { Input } from "@/components/ui/input";
import { useServiceData } from "@/hooks/use-service-data";
import { listAuthorities } from "@/services/authorities";

export function meta() {
  return [{ title: "Authorities · WasteWise AI" }];
}

export default function AuthoritiesRoute() {
  const authorities = useServiceData(listAuthorities);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (authorities.data ?? []).filter((authority) =>
      !term || [authority.ward, authority.area, authority.name].join(" ").toLowerCase().includes(term),
    );
  }, [authorities.data, query]);

  return (
    <div className="space-y-6">
      <PageHeader title="Authorities & Areas" description="Find the responsible councillor or municipal representative for your ward." icon={IconBuildingCommunity} demo />

      <div className="relative max-w-xl">
        <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="authority-search" className="sr-only">
          Search your area or ward
        </label>
        <Input
          id="authority-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your area or ward"
          className="min-h-12 pl-10 text-base"
        />
      </div>

      <AsyncContent loading={authorities.loading} error={authorities.error} onRetry={authorities.retry} skeleton={<LoadingState />}>
        {filtered.length === 0 ? (
          <EmptyState title="No matching areas" description="Try a different ward or area name." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((authority) => (
              <AuthorityCard key={authority.id} authority={authority} />
            ))}
          </div>
        )}
      </AsyncContent>
    </div>
  );
}
