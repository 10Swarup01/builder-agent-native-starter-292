import { IconCurrentLocation, IconMapPin, IconSearch } from "@tabler/icons-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveLocation, getCurrentPosition, searchLocation } from "@/services/maps";
import type { ReportLocation } from "@/lib/waste";

import { MapCanvas } from "./MapCanvas";

interface LocationPickerProps {
  value: ReportLocation | null;
  onChange: (location: ReportLocation) => void;
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReportLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [pickingOnMap, setPickingOnMap] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const useCurrentLocation = async () => {
    setError(null);
    setLocating(true);
    try {
      const point = await getCurrentPosition();
      onChange(await resolveLocation(point));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not read your location.");
    } finally {
      setLocating(false);
    }
  };

  const runSearch = async () => {
    setError(null);
    setSearching(true);
    try {
      setResults(await searchLocation(query));
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const pickFromMap = async (point: { latitude: number; longitude: number }) => {
    setPickingOnMap(false);
    onChange(await resolveLocation(point));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Button size="lg" className="min-h-12" onClick={useCurrentLocation} disabled={locating}>
          <IconCurrentLocation size={18} aria-hidden="true" />
          {locating ? "Locating..." : "Use My Current Location"}
        </Button>
        <Button size="lg" variant="outline" className="min-h-12" aria-expanded={showSearch} onClick={() => setShowSearch((open) => !open)}>
          <IconSearch size={18} aria-hidden="true" />
          Search Location
        </Button>
        <Button size="lg" variant="outline" className="min-h-12" aria-pressed={pickingOnMap} onClick={() => setPickingOnMap((on) => !on)}>
          <IconMapPin size={18} aria-hidden="true" />
          {pickingOnMap ? "Tap the map to place pin" : "Select on Map"}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {showSearch ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void runSearch();
          }}
        >
          <Label htmlFor="location-search">Search for a street, landmark or ward</Label>
          <div className="flex gap-2">
            <Input id="location-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. Demo location" className="min-h-12" />
            <Button type="submit" className="min-h-12" disabled={searching}>
              {searching ? "Searching..." : "Search"}
            </Button>
          </div>
          {results.length > 0 ? (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {results.map((result) => (
                <li key={`${result.address}-${result.latitude}`}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-4 py-3 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      onChange(result);
                      setResults([]);
                    }}
                  >
                    <IconMapPin size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                    <span>{result.address}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </form>
      ) : null}

      <MapCanvas
        className="aspect-[16/10] min-h-56 lg:aspect-[21/9]"
        compact
        markers={
          value
            ? [{ id: "picked", label: "Selected waste location", latitude: value.latitude, longitude: value.longitude, severity: "high", status: "reported" }]
            : []
        }
        selectedId="picked"
        onPickPoint={pickingOnMap ? pickFromMap : undefined}
      />

      <dl className="grid gap-3 rounded-2xl border border-border bg-card p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Address</dt>
          <dd className="mt-1 font-medium text-foreground">{value?.address ?? "Not set yet"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Area</dt>
          <dd className="mt-1 font-medium text-foreground">{value?.area ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ward</dt>
          <dd className="mt-1 font-medium text-foreground">{value?.ward ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
