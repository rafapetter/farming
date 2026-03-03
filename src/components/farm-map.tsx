"use client";

import dynamic from "next/dynamic";
import { Loader2, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Load the map component with SSR disabled — Leaflet requires browser APIs
const FarmMapInner = dynamic(() => import("./farm-map-inner"), {
  ssr: false,
  loading: () => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Mapa da Fazenda</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[400px] sm:h-[500px] w-full flex items-center justify-center rounded-b-lg bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando mapa...
          </div>
        </div>
      </CardContent>
    </Card>
  ),
});

interface FieldData {
  id: string;
  name: string;
  areaHa: string | null;
  coordinates: unknown;
}

interface FarmMapProps {
  latitude: number;
  longitude: number;
  fields: FieldData[];
}

export function FarmMap({ latitude, longitude, fields }: FarmMapProps) {
  return (
    <FarmMapInner
      latitude={latitude}
      longitude={longitude}
      fields={fields}
    />
  );
}
