"use client";

import { PaymentStatusSelect } from "./payment-status-select";
import { updateInputPaymentStatus } from "@/server/actions/inputs";

export function InputPaymentSelect({
  inputId,
  seasonId,
  value,
}: {
  inputId: string;
  seasonId: string;
  value: "pending" | "paid" | "partial";
}) {
  return (
    <PaymentStatusSelect
      value={value}
      onUpdate={async (status) => {
        await updateInputPaymentStatus(inputId, seasonId, status);
      }}
    />
  );
}
