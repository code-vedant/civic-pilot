
import {
  sendCopilotRequest,
  sendTelemetry,
  requestVoiceAudio
} from "../utils/api";
import type { CopilotPayload, TelemetryEvent } from "../utils/types";

import { createClerkClient } from "@clerk/chrome-extension/client";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

async function getToken(): Promise<string | null> {
  if (!publishableKey) return null;

  const clerk = await createClerkClient({
    publishableKey,
    background: true
  });

  if (!clerk.session) return null;

  return clerk.session.getToken();
}

async function deliver(event: TelemetryEvent) {
  try {
    const token = await getToken();

    if (!token) return;

    await sendTelemetry(token, event);
  } catch {
    // Telemetry must never interrupt assistance.
  }
}

chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    if (message?.type === "QUEUE_TELEMETRY") {
      void deliver(message.payload as TelemetryEvent);
      sendResponse({ accepted: true });
      return;
    }

    // Only CivicPilot extension pages may call protected handlers.
    const extensionOrigin =
      `chrome-extension://${chrome.runtime.id}/`;

    if (
      message?.type === "COPILOT_REQUEST" ||
      message?.type === "VOICE_REQUEST"
    ) {
      if (!sender.url?.startsWith(extensionOrigin)) {
        sendResponse({
          success: false,
          error: "Unauthorized extension request"
        });
        return;
      }

      void (async () => {
        const token = await getToken();

        if (!token) {
          sendResponse({
            success: false,
            error: "Please sign in to use CivicPilot."
          });
          return;
        }

        if (message.type === "COPILOT_REQUEST") {
          const result = await sendCopilotRequest(
            token,
            message.payload as CopilotPayload
          );

          sendResponse(result);
          return;
        }

        const text = message.payload?.text;

        if (typeof text !== "string" || !text.trim()) {
          sendResponse({
            success: false,
            error: "There is no response text to read."
          });
          return;
        }

        const audioBase64 = await requestVoiceAudio(
          token,
          text.trim()
        );

        sendResponse({
          success: true,
          audioBase64
        });
      })().catch(error => {
        sendResponse({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not contact CivicPilot."
        });
      });

      return true;
    }
  }
);

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: true
  });
});
