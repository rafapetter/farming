"use client";

import { ActivityStatusSelect } from "./activity-status-select";
import { updateActivityStatus } from "@/server/actions/activities";

export function ActivityStatusInline({
  activityId,
  seasonId,
  value,
}: {
  activityId: string;
  seasonId: string;
  value: "planned" | "in_progress" | "completed" | "cancelled";
}) {
  return (
    <ActivityStatusSelect
      value={value}
      onUpdate={async (status) => {
        await updateActivityStatus(activityId, seasonId, status);
      }}
    />
  );
}
