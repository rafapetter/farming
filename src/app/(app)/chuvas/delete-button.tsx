"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteRainEntry } from "@/server/actions/rain";

export function DeleteRainButton({ entryId }: { entryId: string }) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="shrink-0 h-8 w-8"
      onClick={async () => {
        await deleteRainEntry(entryId);
        router.refresh();
      }}
    >
      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
    </Button>
  );
}
