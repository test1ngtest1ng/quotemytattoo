"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Circle, CircleMarker } from "leaflet";
import { MILES_TO_METERS } from "@/lib/geo";

/**
 * A small OpenStreetMap (Leaflet) map showing the customer's location with a
 * shaded circle that grows/shrinks with the travel radius. Free tiles, no API
 * key. Leaflet is loaded lazily inside an effect so it never runs during SSR.
 */
export function LocationRadiusMap({
  lat,
  lng,
  radiusMiles,
}: {
  lat: number;
  lng: number;
  radiusMiles: number;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const circleRef = useRef<Circle | null>(null);
  const dotRef = useRef<CircleMarker | null>(null);

  // Recompute size + frame the whole circle. No-op until the container actually
  // has a size (it can mount inside a hidden wizard step), so re-running this on
  // resize handles both first layout and hidden -> visible transitions.
  const fit = () => {
    const el = elRef.current;
    if (!mapRef.current || !circleRef.current || !el) return;
    if (el.offsetWidth === 0 || el.offsetHeight === 0) return;
    mapRef.current.invalidateSize();
    mapRef.current.fitBounds(circleRef.current.getBounds(), { padding: [20, 20] });
  };

  // Init once.
  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !elRef.current || mapRef.current) return;

      const map = L.map(elRef.current, { zoomControl: true, scrollWheelZoom: false }).setView(
        [lat, lng],
        11,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      circleRef.current = L.circle([lat, lng], {
        radius: radiusMiles * MILES_TO_METERS,
        color: "#6a2e96",
        weight: 2,
        fillColor: "#6a2e96",
        fillOpacity: 0.12,
      }).addTo(map);

      dotRef.current = L.circleMarker([lat, lng], {
        radius: 6,
        color: "#fff",
        weight: 2,
        fillColor: "#6a2e96",
        fillOpacity: 1,
      }).addTo(map);

      mapRef.current = map;
      requestAnimationFrame(fit);
      // Re-fit whenever the container resizes (initial layout, or the wizard
      // step becoming visible after the map was created while hidden).
      ro = new ResizeObserver(() => fit());
      ro.observe(elRef.current);
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      circleRef.current = null;
      dotRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to location changes.
  useEffect(() => {
    if (!mapRef.current || !circleRef.current || !dotRef.current) return;
    circleRef.current.setLatLng([lat, lng]);
    dotRef.current.setLatLng([lat, lng]);
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  // React to radius changes.
  useEffect(() => {
    if (!mapRef.current || !circleRef.current) return;
    circleRef.current.setRadius(radiusMiles * MILES_TO_METERS);
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusMiles]);

  return (
    <div
      ref={elRef}
      className="h-56 w-full overflow-hidden rounded-[12px] border border-line"
      style={{ zIndex: 0 }}
    />
  );
}
