"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTIVITY_STATUS_LABELS } from "@/lib/constants";

type Status = "planned" | "in_progress" | "completed" | "cancelled";

export function ActivityStatusSelect({
  value,
  onUpdate,
}: {
  value: Status;
  onUpdate: (status: Status) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={value}
      disabled={isPending}
      onValueChange={(newStatus) => {
        startTransition(async () => {
          await onUpdate(newStatus as Status);
        });
      }}
    >
      <SelectTrigger
        className={`h-7 w-[120px] text-xs ${
          value === "completed"
            ? "border-green-300 text-green-700"
            : value === "in_progress"
              ? "border-yellow-300 text-yellow-700"
              : value === "cancelled"
                ? "border-red-300 text-red-700"
                : "border-blue-300 text-blue-700"
        }`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(ACTIVITY_STATUS_LABELS).map(([k, label]) => (
          <SelectItem key={k} value={k}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
