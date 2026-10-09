import type { ActivityLogsResponse, ActivitySummaryResponse, EventFilter } from "../types/activity";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");

async function apiRequest<T>(path: string, token: string): Promise<T> {
  if (!token) throw new Error("No Clerk session token was provided. Please sign in again.");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });

  const data: unknown = await response.json().catch(() => ({}));
  const errorMessage = (data && typeof data === "object" && "error" in data && typeof data.error === "string") ? data.error : undefined;

  if (response.status === 401 || response.status === 403) {
    throw new Error("Authentication failed. The backend rejected the Clerk session token. Check that the backend uses the same Clerk application as this frontend.");
  }
  if (!response.ok) throw new Error(errorMessage || `Request failed with status ${response.status}.`);
  return data as T;
}

export function fetchActivityLogs(token: string, options: { limit?: number; offset?: number; eventType?: EventFilter } = {}): Promise<ActivityLogsResponse> {
  const params = new URLSearchParams({ limit: String(options.limit ?? 10), offset: String(options.offset ?? 0) });
  if (options.eventType) params.set("eventType", options.eventType);
  return apiRequest<ActivityLogsResponse>(`/api/telemetry/me?${params.toString()}`, token);
}

export function fetchActivitySummary(token: string): Promise<ActivitySummaryResponse> {
  return apiRequest<ActivitySummaryResponse>("/api/telemetry/me/summary", token);
}
