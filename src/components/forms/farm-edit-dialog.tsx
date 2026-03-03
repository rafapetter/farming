"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Loader2, MapPin } from "lucide-react";
import { updateFarm, geocodeAddress } from "@/server/actions/farm";

interface FarmEditDialogProps {
  farm: {
    id: string;
    name: string;
    location: string | null;
    latitude: string | null;
    longitude: string | null;
    totalAreaHa: string | null;
  };
}

export function FarmEditDialog({ farm }: FarmEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [name, setName] = useState(farm.name);
  const [location, setLocation] = useState(farm.location ?? "");
  const [latitude, setLatitude] = useState(farm.latitude ?? "");
  const [longitude, setLongitude] = useState(farm.longitude ?? "");
  const [totalAreaHa, setTotalAreaHa] = useState(farm.totalAreaHa ?? "");
  const router = useRouter();

  const handleGeocode = async () => {
    if (!location.trim()) return;
    setGeocoding(true);
    const result = await geocodeAddress(location);
    if (result) {
      setLatitude(result.lat.toFixed(7));
      setLongitude(result.lon.toFixed(7));
    }
    setGeocoding(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateFarm(farm.id, {
      name,
      location: location || undefined,
      latitude: latitude || undefined,
      longitude: longitude || undefined,
      totalAreaHa: totalAreaHa || undefined,
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Propriedade</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="farm-name">Nome</Label>
            <Input
              id="farm-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="farm-location">Localização</Label>
            <div className="flex gap-2">
              <Input
                id="farm-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Vianópolis, Goiás, Brasil"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleGeocode}
                disabled={geocoding || !location.trim()}
                title="Buscar coordenadas"
              >
                {geocoding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="farm-lat">Latitude</Label>
              <Input
                id="farm-lat"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="-16.74"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farm-lon">Longitude</Label>
              <Input
                id="farm-lon"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="-48.52"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="farm-area">Área Total (ha)</Label>
            <Input
              id="farm-area"
              value={totalAreaHa}
              onChange={(e) => setTotalAreaHa(e.target.value)}
              placeholder="39.23"
            />
          </div>
          <Button onClick={handleSave} className="w-full" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
