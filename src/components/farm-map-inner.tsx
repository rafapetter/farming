"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

// This file is loaded via next/dynamic with ssr: false
// so top-level browser-only requires are safe.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MapPin, Save, X, Loader2, Search } from "lucide-react";
import { updateFieldCoordinates } from "@/server/actions/fields";
import { geocodeAddress } from "@/server/actions/farm";

// Import leaflet at the top level — safe because ssr: false
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface FieldData {
  id: string;
  name: string;
  areaHa: string | null;
  coordinates: unknown;
}

export interface FarmMapProps {
  latitude: number;
  longitude: number;
  fields: FieldData[];
}

const FIELD_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
];

interface PendingPolygon {
  coordinates: number[][];
  areaHa: number;
  layer: any;
}

export default function FarmMapInner({
  latitude,
  longitude,
  fields,
}: FarmMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const [pending, setPending] = useState<PendingPolygon | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const router = useRouter();

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !mapInstance.current) return;
    setSearching(true);
    const result = await geocodeAddress(searchQuery);
    if (result && mapInstance.current) {
      mapInstance.current.setView([result.lat, result.lon], 15);
    }
    setSearching(false);
  }, [searchQuery]);

  const handleSave = useCallback(async () => {
    if (!pending || !selectedFieldId) return;
    setSaving(true);
    try {
      await updateFieldCoordinates(
        selectedFieldId,
        pending.coordinates,
        pending.areaHa
      );
      setPending(null);
      setSelectedFieldId("");
      router.refresh();
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  }, [pending, selectedFieldId, router]);

  const handleCancel = useCallback(() => {
    if (pending?.layer && drawnItemsRef.current) {
      drawnItemsRef.current.removeLayer(pending.layer);
    }
    setPending(null);
    setSelectedFieldId("");
  }, [pending]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      scrollWheelZoom: true,
    }).setView([latitude, longitude], 15);

    mapInstance.current = map;

    // Satellite base map (ESRI)
    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Esri", maxZoom: 19 }
    );

    // OpenStreetMap
    const osm = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution: "&copy; OpenStreetMap", maxZoom: 19 }
    );

    satellite.addTo(map);

    // Layer switcher
    L.control
      .layers(
        { Satélite: satellite, Mapa: osm },
        {},
        { position: "topright" }
      )
      .addTo(map);

    // Feature group for newly drawn items
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    // Render existing field polygons
    const allBounds: L.LatLng[] = [];

    fields.forEach((field, i) => {
      const color = FIELD_COLORS[i % FIELD_COLORS.length];

      if (field.coordinates && Array.isArray(field.coordinates)) {
        const latlngs = (field.coordinates as number[][]).map((c) =>
          L.latLng(c[0], c[1])
        );
        const polygon = L.polygon(latlngs, {
          color,
          fillColor: color,
          fillOpacity: 0.35,
          weight: 2,
        }).addTo(map);

        // Center label
        const center = polygon.getBounds().getCenter();
        const label = L.divIcon({
          className: "field-label",
          html: `<div style="background:rgba(0,0,0,0.7);color:white;padding:2px 8px;border-radius:4px;font-size:11px;white-space:nowrap;font-weight:500">${field.name}${field.areaHa ? ` · ${field.areaHa} ha` : ""}</div>`,
          iconSize: [120, 20] as any,
          iconAnchor: [60, 10] as any,
        });
        L.marker(center, { icon: label, interactive: false }).addTo(map);

        polygon.bindPopup(
          `<strong>${field.name}</strong><br/>${
            field.areaHa ? `${field.areaHa} ha` : "Área não definida"
          }`
        );

        allBounds.push(...latlngs);
      }
    });

    // Fit to existing polygons, or stay at farm center
    if (allBounds.length > 0) {
      map.fitBounds(L.latLngBounds(allBounds), { padding: [50, 50] });
    }

    // Draw controls
    const drawControl = new (L.Control as any).Draw({
      position: "topleft",
      draw: {
        polygon: {
          shapeOptions: {
            color: "#fbbf24",
            fillColor: "#fbbf24",
            fillOpacity: 0.3,
            weight: 3,
          },
          allowIntersection: false,
          showArea: true,
        },
        rectangle: {
          shapeOptions: {
            color: "#fbbf24",
            fillColor: "#fbbf24",
            fillOpacity: 0.3,
            weight: 3,
          },
        },
        polyline: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: {
        featureGroup: drawnItems,
      },
    });
    map.addControl(drawControl);

    // Handle polygon creation
    map.on("draw:created", (e: any) => {
      const layer = e.layer;
      drawnItems.addLayer(layer);

      const latlngs = layer.getLatLngs()[0];
      const areaM2 = (L as any).GeometryUtil.geodesicArea(latlngs);
      const areaHa = areaM2 / 10000;

      const coords = latlngs.map((ll: any) => [ll.lat, ll.lng]);

      setPending({ coordinates: coords, areaHa, layer });
    });

    // Force a resize after mount to ensure tiles render correctly
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      mapInstance.current = null;
      drawnItemsRef.current = null;
      map.remove();
    };
  }, [latitude, longitude, fields]);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Mapa da Fazenda</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Use o botão de polígono para desenhar os limites de cada talhão
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Buscar endereço (ex: Vianópolis, GO)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="h-8 px-3"
          >
            {searching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={mapRef}
          className={`h-[400px] sm:h-[500px] w-full ${pending ? "" : "rounded-b-lg"}`}
        />

        {/* Assignment panel for newly drawn polygon */}
        {pending && (
          <div className="border-t bg-muted/50 p-4 rounded-b-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  Nova área desenhada:{" "}
                  <span className="text-primary font-bold">
                    {pending.areaHa.toFixed(2)} ha
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Selecione o talhão para associar esta área
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select
                  value={selectedFieldId}
                  onValueChange={setSelectedFieldId}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Escolha o talhão" />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                        {f.coordinates ? " ✓" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!selectedFieldId || saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  {saving ? "" : "Salvar"}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
