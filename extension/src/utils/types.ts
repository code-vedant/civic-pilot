
export type QueryIntent =
  | "field_location"
  | "security_sensitive"
  | "general_guidance";

export interface DetectedField {
  id: string;
  name: string;
  label: string;
  type: string;
  sensitive: boolean;
}

export interface PageContext {
  headings: string[];
  fieldLabels: string[];
}

export interface PortalContext {
  domain: string;
  title?: string;
  pageContext?: PageContext;
}

export interface TelemetryEvent {
  eventType: string;
  intent?: QueryIntent;
  targetFieldId?: string;
  targetFieldName?: string;
  actionType?: string;
  success: boolean;
  responseTimeMs?: number;
  portalDomain?: string;
}

export interface CopilotPayload {
  query: string;
  portal: PortalContext;
}

export interface CopilotResponse {
  success: boolean;
  intent?: QueryIntent;
  answer?: string;
  error?: string;
  actions?: unknown[];
}

export interface SavedFormData {
  id: string;
  label: string;
  value: string;

  // Match the field on portals that use stable identifiers.
  fieldIds: string[];
  fieldNames: string[];

  createdAt: number;
  updatedAt: number;
}

export interface AutofillFieldRequest {
  id: string;
  name: string;
  label: string;
  type: string;
}

export interface AutofillMatchResponse {
  success: boolean;
  match?: {
    id: string;
    label: string;
    value: string;
  };
  reason?: string;
}
