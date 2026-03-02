"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface FarmMapProps {
  latitude: number;
  longitude: number;
  fields: Array<{
    name: string;
    areaHa: string | null;
  }>;
}

export function FarmMap({ latitude, longitude, fields }: FarmMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current || loaded) return;

    let map: any;

    import("leaflet").then((L) => {
      // Fix default marker icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      map = L.map(mapRef.current!, {
        scrollWheelZoom: false,
      }).setView([latitude, longitude], 14);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      // Main farm marker
      L.marker([latitude, longitude])
        .addTo(map)
        .bindPopup(
          `<strong>Fazenda Primavera</strong><br/>${fields.length} talhões`
        );

      // Spread field markers around the farm location
      fields.forEach((field, i) => {
        const angle = (2 * Math.PI * i) / fields.length;
        const radius = 0.003;
        const lat = latitude + radius * Math.cos(angle);
        const lng = longitude + radius * Math.sin(angle);

        const greenIcon = L.divIcon({
          className: "custom-marker",
          html: `<div style="background:#2d6a2e;color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)">${i + 1}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        L.marker([lat, lng], { icon: greenIcon })
          .addTo(map)
          .bindPopup(
            `<strong>${field.name}</strong><br/>${field.areaHa ? `${field.areaHa} ha` : "Área não definida"}`
          );
      });

      setLoaded(true);
    });

    return () => {
      if (map) map.remove();
    };
  }, [latitude, longitude, fields, loaded]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Mapa da Fazenda</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <div
          ref={mapRef}
          className="h-[300px] sm:h-[400px] w-full rounded-b-lg"
        />
      </CardContent>
    </Card>
  );
}
