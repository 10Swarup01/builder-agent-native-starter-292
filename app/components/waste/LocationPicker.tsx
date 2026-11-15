import { IconCircleCheck, IconCurrentLocation } from "@tabler/icons-react";
import type { Marker, MapMouseEvent } from "mapbox-gl";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ADDRESS_ZOOM, LOCATE_ZOOM, type MapStyleMode } from "@/lib/mapbox";
import type { ReportLocation } from "@/lib/waste";
import {
  getCurrentPosition,
  getGeolocationAccess,
  reverseGeocode,
  type GeoPoint,
  type GeolocationAccess,
  type PlaceResult,
} from "@/services/maps";

import { AddressSearch } from "./AddressSearch";
import { MapFrame, MapStyleToggle, useMapboxMap, type MapFocus } from "./MapCanvas";

const PIN_COLOR = "#1e5e3f";

interface LocationPickerProps {
  value: ReportLocation | null;
  onChange: (location: ReportLocation) => void;
}

interface PlaceDraft {
  address: string;
  area: string;
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [autoDetect] = useState(() => value === null);
  const [pin, setPin] = useState<GeoPoint | null>(value ? { latitude: value.latitude, longitude: value.longitude } : null);
  const [place, setPlace] = useState<PlaceDraft | null>(value ? { address: value.address, area: value.area } : null);
  const [resolving, setResolving] = useState(false);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [locating, setLocating] = useState(false);
  const [access, setAccess] = useState<GeolocationAccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lookupRef = useRef<AbortController | null>(null);

  useEffect(() => () => lookupRef.current?.abort(), []);

  const resolvePin = useCallback((point: GeoPoint) => {
    lookupRef.current?.abort();
    const controller = new AbortController();
    lookupRef.current = controller;
    setResolving(true);
    setPlace(null);
    reverseGeocode(point, controller.signal).then(
      (found) => {
        if (controller.signal.aborted) return;
        if (found) setPlace({ address: found.address, area: found.area });
        else setError("No address was found for this spot. Move the pin or search for an address.");
        setResolving(false);
      },
      () => {
        if (controller.signal.aborted) return;
        setError("Could not look up the address for this spot. Please try again.");
        setResolving(false);
      },
    );
  }, []);

  const movePin = useCallback(
    (point: GeoPoint) => {
      setError(null);
      setPin(point);
      resolvePin(point);
    },
    [resolvePin],
  );

  const locateMe = useCallback(async () => {
    setError(null);
    setLocating(true);
    try {
      const point = await getCurrentPosition();
      setAccess("granted");
      setFocus({ ...point, zoom: LOCATE_ZOOM });
      movePin(point);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not read your location.");
    } finally {
      setLocating(false);
    }
  }, [movePin]);

  useEffect(() => {
    let active = true;
    void getGeolocationAccess().then((state) => {
      if (!active) return;
      setAccess(state);
      if (autoDetect && state === "granted") void locateMe();
    });
    return () => {
      active = false;
    };
  }, [autoDetect, locateMe]);

  const selectPlace = (result: PlaceResult) => {
    lookupRef.current?.abort();
    setResolving(false);
    setError(null);
    const point = { latitude: result.latitude, longitude: result.longitude };
    setPin(point);
    setPlace({ address: result.address, area: result.area });
    setFocus({ ...point, zoom: ADDRESS_ZOOM });
  };

  const confirmed =
    value !== null &&
    pin !== null &&
    place !== null &&
    value.latitude === pin.latitude &&
    value.longitude === pin.longitude &&
    value.address === place.address;
  const canConfirm = pin !== null && place !== null && !resolving && !confirmed;

  const confirm = () => {
    if (!pin || !place) return;
    onChange({ address: place.address, area: place.area, ward: "", latitude: pin.latitude, longitude: pin.longitude });
  };

  const accessNote =
    access === "denied"
      ? "Location access is blocked for this site. Search for an address or tap the map instead."
      : access === "unsupported"
        ? "This device cannot share its location. Search for an address or tap the map instead."
        : null;

  const addressText = place?.address ?? (resolving ? "Finding address…" : pin ? "No address for this spot yet" : "No location selected yet");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button size="lg" className="min-h-12" onClick={locateMe} disabled={locating}>
          <IconCurrentLocation size={18} aria-hidden="true" />
          {locating ? "Finding your location..." : "Use My Current Location"}
        </Button>
        {accessNote ? <p className="text-sm text-muted-foreground">{accessNote}</p> : null}
      </div>

      <AddressSearch id="location-search" onSelect={selectPlace} />

      {error ? (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <PinMap pin={pin} focus={focus} onPick={movePin} />
      <p className="text-sm text-muted-foreground">Drag the pin or tap the map to fine-tune the spot.</p>

      <dl className="grid gap-3 rounded-2xl border border-border bg-card p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Address</dt>
          <dd className="mt-1 font-medium text-foreground">{addressText}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Area</dt>
          <dd className="mt-1 font-medium text-foreground">{place?.area || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Coordinates</dt>
          <dd className="mt-1 font-medium tabular-nums text-foreground">{pin ? `${pin.latitude.toFixed(5)}, ${pin.longitude.toFixed(5)}` : "—"}</dd>
        </div>
      </dl>

      <Button size="lg" className="min-h-12 w-full" onClick={confirm} disabled={!canConfirm}>
        {confirmed ? <IconCircleCheck size={18} aria-hidden="true" /> : null}
        {confirmed ? "Location confirmed" : "Confirm this location"}
      </Button>
    </div>
  );
}

interface PinMapProps {
  pin: GeoPoint | null;
  focus: MapFocus | null;
  onPick: (point: GeoPoint) => void;
}

function PinMap({ pin, focus, onPick }: PinMapProps) {
  const [styleMode, setStyleMode] = useState<MapStyleMode>("light");
  const { containerRef, map, mapboxgl, status } = useMapboxMap({ styleMode, initialCenter: pin ?? undefined, focus });
  const markerRef = useRef<Marker | null>(null);
  const onPickRef = useRef(onPick);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    if (!map || !mapboxgl) return;
    const marker = new mapboxgl.Marker({ color: PIN_COLOR, draggable: true });
    const onDragEnd = () => {
      const { lat, lng } = marker.getLngLat();
      onPickRef.current({ latitude: lat, longitude: lng });
    };
    const onMapClick = (event: MapMouseEvent) => {
      onPickRef.current({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
    };
    marker.on("dragend", onDragEnd);
    map.on("click", onMapClick);
    markerRef.current = marker;
    return () => {
      marker.remove();
      map.off("click", onMapClick);
      markerRef.current = null;
    };
  }, [map, mapboxgl]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!map || !marker) return;
    if (pin) marker.setLngLat([pin.longitude, pin.latitude]).addTo(map);
    else marker.remove();
  }, [map, pin]);

  return (
    <MapFrame containerRef={containerRef} status={status} className="h-72 sm:h-96">
      <MapStyleToggle value={styleMode} onChange={setStyleMode} />
    </MapFrame>
  );
}
