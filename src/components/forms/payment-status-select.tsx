"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYMENT_STATUS_LABELS } from "@/lib/constants";

type Status = "pending" | "paid" | "partial";

export function PaymentStatusSelect({
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
        className={`h-7 w-[100px] text-xs ${
          value === "paid"
            ? "border-green-300 text-green-700"
            : value === "pending"
              ? "border-yellow-300 text-yellow-700"
              : ""
        }`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(PAYMENT_STATUS_LABELS).map(([k, label]) => (
          <SelectItem key={k} value={k}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
