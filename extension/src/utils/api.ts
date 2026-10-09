
import type {
  CopilotPayload,
  CopilotResponse,
  TelemetryEvent
} from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export async function sendTelemetry(
  token: string,
  event: TelemetryEvent
) {
  const response = await fetch(`${API_BASE_URL}/api/telemetry`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(event)
  });

  if (!response.ok) {
    throw new Error(`Telemetry failed: ${response.status}`);
  }

  return response.json();
}

export async function sendCopilotRequest(
  token: string,
  payload: CopilotPayload
): Promise<CopilotResponse> {
  const response = await fetch(`${API_BASE_URL}/api/copilot`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      success: false,
      error:
        data.error ||
        `CivicPilot request failed (${response.status})`
    };
  }

  return data as CopilotResponse;
}

export async function requestVoiceAudio(
  token: string,
  text: string
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/voice/speech`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(45000)
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));

    throw new Error(
      data.error || `Voice generation failed (${response.status})`
    );
  }

  const bytes = new Uint8Array(await response.arrayBuffer());

  // Convert in chunks to avoid exceeding the argument limit.
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + chunkSize)
    );
  }

  return btoa(binary);
}
