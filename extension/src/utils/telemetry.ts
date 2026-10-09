import type { TelemetryEvent } from "./types";

export function logTelemetry(event: TelemetryEvent) {
  chrome.runtime.sendMessage({ type: "QUEUE_TELEMETRY", payload: event }).catch(() => {});
}
