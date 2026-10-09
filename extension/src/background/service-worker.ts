
import { sendCopilotRequest, sendTelemetry, requestVoiceAudio } from "../utils/api";

import type {
  CopilotPayload,
  TelemetryEvent,
  SavedFormData,
  AutofillFieldRequest
} from "../utils/types";

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

async function deliver(event: TelemetryEvent): Promise<void> {
  try {
    const token = await getToken();

    if (!token) return;

    await sendTelemetry(token, event);
  } catch {
    // Telemetry must never interrupt assistance.
  }
}

// --------------------------------------------------
// Form data storage
// --------------------------------------------------

const FORM_DATA_KEY = "civicpilot.savedFormData";

const BLOCKED_TERMS = [
  "password",
  "passwd",
  "passcode",
  "otp",
  "one time password",
  "captcha",
  "mpin",
  "security pin",
  "transaction pin",
  "aadhaar number",
  "aadhar number"
];

function normalizeField(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isBlockedLabel(value: string): boolean {
  const normalized = normalizeField(value);

  return BLOCKED_TERMS.some(term => {
    const blocked = normalizeField(term);

    return (
      normalized === blocked ||
      normalized.startsWith(`${blocked} `) ||
      normalized.includes(` ${blocked} `) ||
      normalized.endsWith(` ${blocked}`)
    );
  });
}

function isExtensionPage(sender: chrome.runtime.MessageSender): boolean {
  return (
    sender.id === chrome.runtime.id &&
    typeof sender.url === "string" &&
    sender.url.startsWith(`chrome-extension://${chrome.runtime.id}/`)
  );
}

function isOurContentScript(sender: chrome.runtime.MessageSender): boolean {
  return (
    sender.id === chrome.runtime.id &&
    sender.tab?.id !== undefined
  );
}

async function readSavedFormData(): Promise<SavedFormData[]> {
  const result = await chrome.storage.local.get(FORM_DATA_KEY);
  const value = result[FORM_DATA_KEY];

  return Array.isArray(value) ? value as SavedFormData[] : [];
}

async function saveFormData(item: SavedFormData): Promise<void> {
  const existing = await readSavedFormData();

  const next = existing.filter(entry => entry.id !== item.id);
  next.push(item);

  await chrome.storage.local.set({
    [FORM_DATA_KEY]: next
  });
}

async function deleteFormData(id: string): Promise<void> {
  const existing = await readSavedFormData();

  await chrome.storage.local.set({
    [FORM_DATA_KEY]: existing.filter(item => item.id !== id)
  });
}

async function findAutofillMatch(
  field: AutofillFieldRequest
): Promise<{
  id: string;
  label: string;
  value: string;
} | null> {
  if (
    !field ||
    typeof field.id !== "string" ||
    typeof field.name !== "string" ||
    typeof field.label !== "string" ||
    typeof field.type !== "string"
  ) {
    return null;
  }

  if (
    isBlockedLabel(field.label) ||
    isBlockedLabel(field.name) ||
    isBlockedLabel(field.id) ||
    ["password", "hidden", "file", "submit", "reset", "button", "image"]
      .includes(field.type.toLowerCase())
  ) {
    return null;
  }

  const records = await readSavedFormData();

  // Prefer exact ID, then exact name, then exact label.
  const match =
    records.find(item =>
      item.fieldIds.some(id => id !== "" && id === field.id)
    ) ||
    records.find(item =>
      item.fieldNames.some(name => name !== "" && name === field.name)
    ) ||
    records.find(item =>
      normalizeField(item.label) === normalizeField(field.label)
    );

  if (!match) return null;

  return {
    id: match.id,
    label: match.label,
    value: match.value
  };
}

// --------------------------------------------------
// Extension message handling
// --------------------------------------------------

chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {

    // Telemetry
    if (message?.type === "QUEUE_TELEMETRY") {
      if (sender.id !== chrome.runtime.id) {
        sendResponse({ accepted: false });
        return;
      }

      void deliver(message.payload as TelemetryEvent);

      sendResponse({ accepted: true });
      return;
    }

    // List saved data — extension pages only
    if (message?.type === "FORM_DATA_LIST") {
      if (!isExtensionPage(sender)) {
        sendResponse({
          success: false,
          error: "Unauthorized"
        });
        return;
      }

      void readSavedFormData()
        .then(items => {
          sendResponse({ success: true, items });
        })
        .catch(() => {
          sendResponse({
            success: false,
            error: "Could not read saved data"
          });
        });

      return true;
    }

    // Save a record — extension pages only
    if (message?.type === "FORM_DATA_SAVE") {
      if (!isExtensionPage(sender)) {
        sendResponse({
          success: false,
          error: "Unauthorized"
        });
        return;
      }

      void (async () => {
        const item = message.item as SavedFormData;

        if (
          !item ||
          typeof item.id !== "string" ||
          item.id.length === 0 ||
          item.id.length > 100 ||
          typeof item.label !== "string" ||
          typeof item.value !== "string" ||
          item.label.trim().length === 0 ||
          item.label.length > 100 ||
          item.value.length > 2000 ||
          !Array.isArray(item.fieldIds) ||
          !Array.isArray(item.fieldNames) ||
          item.fieldIds.length > 10 ||
          item.fieldNames.length > 10 ||
          !item.fieldIds.every((v: unknown) =>
            typeof v === "string" && v.length <= 200
          ) ||
          !item.fieldNames.every((v: unknown) =>
            typeof v === "string" && v.length <= 200
          ) ||
          isBlockedLabel(item.label) ||
          item.fieldIds.some(isBlockedLabel) ||
          item.fieldNames.some(isBlockedLabel)
        ) {
          sendResponse({
            success: false,
            error: "Invalid or unsupported data"
          });
          return;
        }

        const now = Date.now();

        const record: SavedFormData = {
          id: item.id,
          label: item.label.trim(),
          value: item.value,
          fieldIds: item.fieldIds,
          fieldNames: item.fieldNames,
          createdAt:
            typeof item.createdAt === "number" &&
            Number.isFinite(item.createdAt)
              ? item.createdAt
              : now,
          updatedAt: now
        };

        await saveFormData(record);

        sendResponse({ success: true });
      })().catch(() => {
        sendResponse({
          success: false,
          error: "Could not save data"
        });
      });

      return true;
    }

    // Delete a record — extension pages only
    if (message?.type === "FORM_DATA_DELETE") {
      if (
        !isExtensionPage(sender) ||
        typeof message.id !== "string" ||
        message.id.length > 100
      ) {
        sendResponse({
          success: false,
          error: "Unauthorized or invalid request"
        });
        return;
      }

      void deleteFormData(message.id)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch(() => {
          sendResponse({
            success: false,
            error: "Could not delete data"
          });
        });

      return true;
    }

    // Match a focused field — content scripts only
    if (message?.type === "GET_AUTOFILL_MATCH") {
      if (!isOurContentScript(sender)) {
        sendResponse({
          success: false,
          reason: "unauthorized"
        });
        return;
      }

      void findAutofillMatch(
        message.field as AutofillFieldRequest
      )
        .then(match => {
          sendResponse(
            match
              ? { success: true, match }
              : { success: false, reason: "no_match" }
          );
        })
        .catch(() => {
          sendResponse({
            success: false,
            reason: "storage_error"
          });
        });

      return true;
    }

    // AI guidance and voice — extension pages only
    if (
      message?.type === "COPILOT_REQUEST" ||
      message?.type === "VOICE_REQUEST"
    ) {
      if (!isExtensionPage(sender)) {
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

// --------------------------------------------------
// Extension installation
// --------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: true
  });
});
