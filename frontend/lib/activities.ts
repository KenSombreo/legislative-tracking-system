import { ActivityCategory, ActivityMedia } from "./types";

export const ACTIVITY_CATEGORIES: { key: ActivityCategory; label: string }[] = [
  { key: "SESSION", label: "Session" },
  { key: "COMMITTEE_HEARING", label: "Committee hearing / meeting" },
  { key: "PUBLIC_HEARING", label: "Public hearing / consultation" },
  { key: "OUTREACH", label: "Outreach / community activity" },
  { key: "TRAINING", label: "Training / seminar" },
  { key: "OTHER", label: "Other activity" },
];

export function categoryLabel(key: ActivityCategory) {
  return ACTIVITY_CATEGORIES.find((c) => c.key === key)?.label || "Activity";
}

export const isVideo = (m: Pick<ActivityMedia, "mimeType">) => m.mimeType.startsWith("video/");

export const MEDIA_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

export const MAX_MEDIA_MB = 200;
