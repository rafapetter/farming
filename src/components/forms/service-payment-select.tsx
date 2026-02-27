"use client";

import { PaymentStatusSelect } from "./payment-status-select";
import { updateServicePaymentStatus } from "@/server/actions/services";

export function ServicePaymentSelect({
  serviceId,
  seasonId,
  value,
}: {
  serviceId: string;
  seasonId: string;
  value: "pending" | "paid" | "partial";
}) {
  return (
    <PaymentStatusSelect
      value={value}
      onUpdate={async (status) => {
        await updateServicePaymentStatus(serviceId, seasonId, status);
      }}
    />
  );
}
