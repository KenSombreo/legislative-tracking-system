import { RequestStatus } from "./types";

export const REQUEST_STATUS: Record<RequestStatus, { label: string; cls: string; publicHint: string }> = {
  PENDING: {
    label: "Received",
    cls: "bg-amber-100 text-amber-900",
    publicHint: "Your request is waiting to be processed.",
  },
  PROCESSING: {
    label: "Being prepared",
    cls: "bg-sky-100 text-sky-900",
    publicHint: "The SB office is preparing your copy.",
  },
  READY: {
    label: "Ready for pick-up",
    cls: "bg-emerald-100 text-emerald-900",
    publicHint: "Your copy is ready. Please bring your reference code and a valid ID to the SB office.",
  },
  RELEASED: {
    label: "Released",
    cls: "bg-gray-200 text-gray-900",
    publicHint: "This request has been completed.",
  },
  DENIED: {
    label: "Not granted",
    cls: "bg-red-100 text-red-900",
    publicHint: "This request could not be granted. See the message below or visit the SB office.",
  },
};
