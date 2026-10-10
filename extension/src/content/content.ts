import { initSpotlightFeature } from "./spotlight";
import { showAutofillPopup, dismissAutofillPopup } from "./autofill-popup";
import { detectFields } from "../utils/field-detector";
import "./overlay.css";

initSpotlightFeature();

function containsSensitiveText(value: string): boolean {
  return (
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value) ||
    /\b\d{10,12}\b/.test(value)
  );
}

function cleanPageText(value: string, maxLength: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || containsSensitiveText(text)) return "";
  return text.slice(0, maxLength);
}

function getPageContext() {
  const headings = Array.from(
    document.querySelectorAll<HTMLElement>("h1, h2, h3, [role='heading']")
  )
    .filter(element => element.getClientRects().length > 0)
    .map(element =>
      cleanPageText(element.innerText || element.textContent || "", 120)
    )
    .filter(Boolean)
    .slice(0, 8);

  const fieldLabels = detectFields()
    .filter(field => !field.sensitive)
    .map(field => cleanPageText(field.label, 100))
    .filter(Boolean)
    .slice(0, 30);

  return {
    title: cleanPageText(document.title, 200),
    headings,
    fieldLabels
  };
}

function getAutofillLabel(
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
): string {
  const nativeLabels = element.labels
    ? Array.from(element.labels)
        .map(label => label.innerText || label.textContent || "")
        .join(" ")
        .trim()
    : "";

  if (nativeLabels) return nativeLabels;

  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map(id => document.getElementById(id)?.textContent || "")
      .join(" ")
      .trim();
    if (text) return text;
  }

  return (
    element.getAttribute("aria-label") ||
    element.getAttribute("placeholder") ||
    element.getAttribute("name") ||
    element.id ||
    ""
  ).trim();
}

const blockedTerms = [
  "password", "passwd", "passcode", "otp", "one time password",
  "captcha", "mpin", "security pin", "transaction pin",
  "aadhaar", "aadhar", "secret code"
];

function isSensitiveField(
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  label: string
): boolean {
  const type = element instanceof HTMLInputElement
    ? element.type.toLowerCase()
    : element.tagName.toLowerCase();

  if (
    ["password", "hidden", "file", "submit", "reset", "button", "image"]
      .includes(type)
  ) return true;

  const haystack = [
    label,
    element.getAttribute("name") || "",
    element.id,
    element.getAttribute("autocomplete") || ""
  ].join(" ").toLowerCase();

  return blockedTerms.some(term => haystack.includes(term));
}

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function handleFocusIn(event: FocusEvent): void {
  const target = event.target;
  if (
    !(target instanceof HTMLInputElement) &&
    !(target instanceof HTMLSelectElement) &&
    !(target instanceof HTMLTextAreaElement)
  ) return;

  dismissAutofillPopup();

  if (
    !target.isConnected ||
    target.disabled ||
    target.readOnly ||
    (target instanceof HTMLInputElement &&
      ["checkbox", "radio", "password", "hidden", "file", "submit", "reset", "button", "image"]
        .includes(target.type.toLowerCase()))
  ) return;

  const label = getAutofillLabel(target);
  if (!label || isSensitiveField(target, label)) return;

  const field: FormControl = target;
  const request = {
    type: "GET_AUTOFILL_MATCH",
    field: {
      id: field.id || "",
      name: field.getAttribute("name") || "",
      label,
      type: field instanceof HTMLInputElement
        ? field.type.toLowerCase()
        : field.tagName.toLowerCase()
    }
  };

  chrome.runtime.sendMessage(request, response => {
    // Reading lastError prevents Chrome from reporting an unchecked messaging error.
    if (chrome.runtime.lastError) return;

    if (
      !response?.success ||
      !response.match ||
      !field.isConnected ||
      document.activeElement !== field
    ) return;

    showAutofillPopup(field, response.match);
  });
}

document.addEventListener("focusin", handleFocusIn, true);
document.addEventListener("pointerdown", event => {
  const target = event.target;
  if (
    target instanceof Element &&
    !target.closest(".civicpilot-autofill-popup") &&
    !target.matches("input, select, textarea")
  ) {
    dismissAutofillPopup();
  }
}, true);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GET_PAGE_CONTEXT") {
    sendResponse({ success: true, context: getPageContext() });
    return;
  }

  if (message?.type === "GET_FIELDS") {
    sendResponse({
      success: true,
      fields: detectFields().filter(field => !field.sensitive)
    });
  }
});
