"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, MapPin } from "lucide-react";

interface CoordinateInputProps {
  initialCoordinates?: number[][];
  onChange: (coordinates: number[][]) => void;
}

export function CoordinateInput({
  initialCoordinates,
  onChange,
}: CoordinateInputProps) {
  const [vertices, setVertices] = useState<
    Array<{ lat: string; lng: string }>
  >(
    initialCoordinates?.map((c) => ({
      lat: String(c[0]),
      lng: String(c[1]),
    })) ?? []
  );

  function updateVertices(newVertices: Array<{ lat: string; lng: string }>) {
    setVertices(newVertices);
    const valid = newVertices
      .filter((v) => v.lat.trim() !== "" && v.lng.trim() !== "")
      .map((v) => [parseFloat(v.lat), parseFloat(v.lng)])
      .filter((c) => !isNaN(c[0]) && !isNaN(c[1]));
    onChange(valid.length >= 3 ? valid : []);
  }

  function addVertex() {
    updateVertices([...vertices, { lat: "", lng: "" }]);
  }

  function removeVertex(index: number) {
    updateVertices(vertices.filter((_, i) => i !== index));
  }

  function updateVertex(index: number, field: "lat" | "lng", value: string) {
    const updated = [...vertices];
    updated[index] = { ...updated[index], [field]: value };
    updateVertices(updated);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          Coordenadas (lat, lng)
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addVertex}
          className="h-7 text-xs"
        >
          <Plus className="mr-1 h-3 w-3" />
          Vértice
        </Button>
      </div>

      {vertices.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Adicione pelo menos 3 vértices para definir o polígono do talhão.
        </p>
      )}

      {vertices.length > 0 && (
        <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
          {vertices.map((vertex, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                {i + 1}.
              </span>
              <Input
                type="number"
                step="any"
                placeholder="Latitude"
                value={vertex.lat}
                onChange={(e) => updateVertex(i, "lat", e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                type="number"
                step="any"
                placeholder="Longitude"
                value={vertex.lng}
                onChange={(e) => updateVertex(i, "lng", e.target.value)}
                className="h-8 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => removeVertex(i)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {vertices.length > 0 && vertices.length < 3 && (
        <p className="text-xs text-destructive">
          Mínimo 3 vértices para um polígono válido.
        </p>
      )}
    </div>
  );
}
