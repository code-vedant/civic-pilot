
export interface ActivityLog {
  id: string;
  eventType: string;
  intent: string | null;
  targetFieldName: string | null;
  actionType: string | null;
  success: boolean;
  responseTimeMs: number | null;
  portalDomain: string | null;
  createdAt: string;
}

export interface ActivitySummary {
  total: number;
  successful: number;
  unsuccessful: number;
  portalsVisited: number;
  last7Days: number;
  averageResponseTimeMs: number | null;
}

export interface ActivityLogsResponse {
  success: boolean;
  logs: ActivityLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ActivitySummaryResponse {
  success: boolean;
  summary: ActivitySummary;
}

export type EventFilter =
  | ""
  | "copilot_interaction"
  | "page_load"
  | "field_dwell"
  | "error";
