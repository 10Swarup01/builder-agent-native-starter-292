import { IconMapPin, IconSearch } from "@tabler/icons-react";
import { useEffect, useState, type FormEvent } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMapboxConfigIssue } from "@/lib/mapbox";
import { cn } from "@/lib/utils";
import { searchLocation, type PlaceResult } from "@/services/maps";

const MIN_QUERY_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 350;

interface AddressSearchProps {
  id: string;
  onSelect: (place: PlaceResult) => void;
  className?: string;
  placeholder?: string;
}

export function AddressSearch({ id, onSelect, className, placeholder = "Search an address, place or landmark" }: AddressSearchProps) {
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState<{ term: string; places: PlaceResult[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const configIssue = getMapboxConfigIssue();
  const term = query.trim();
  const active = !configIssue && term.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    setError(null);
    if (!active) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchLocation(term, controller.signal).then(
        (places) => setOutcome({ term, places }),
        () => {
          if (!controller.signal.aborted) setError("Address search failed. Please try again.");
        },
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term, active]);

  const current = outcome?.term === term ? outcome.places : null;

  const choose = (place: PlaceResult) => {
    setQuery("");
    setOutcome(null);
    onSelect(place);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const first = current?.[0];
    if (first) choose(first);
  };

  return (
    <form onSubmit={submit} className={cn("relative", className)} role="search">
      <Label htmlFor={id} className="sr-only">
        Search an address
      </Label>
      <div className="relative">
        <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id={id}
          type="search"
          autoComplete="off"
          value={query}
          disabled={configIssue !== null}
          placeholder={configIssue ? "Address search needs a Mapbox token" : placeholder}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-12 bg-card pl-10"
        />
      </div>

      {active ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {error ? (
            <p role="alert" className="px-4 py-3 text-sm text-danger">
              {error}
            </p>
          ) : current === null ? (
            <p role="status" className="px-4 py-3 text-sm text-muted-foreground">
              Searching…
            </p>
          ) : current.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">No matching addresses in India.</p>
          ) : (
            <ul className="max-h-64 divide-y divide-border overflow-y-auto">
              {current.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => choose(place)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <IconMapPin size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                    <span className="text-foreground">{place.address}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </form>
  );
}
