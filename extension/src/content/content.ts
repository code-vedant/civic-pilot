
import { detectFields, findField } from "../utils/field-detector";

let current: HTMLElement | null = null;

function clear() {
  current?.classList.remove("civicpilot-spotlight");
  current = null;
}

function findElement(id: string, name: string): HTMLElement | null {
  const byId = document.getElementById(id);

  if (byId instanceof HTMLElement) return byId;

  const elements = document.querySelectorAll<HTMLElement>(
    "input, select, textarea"
  );

  return (
    Array.from(elements).find(
      el =>
        (el as HTMLInputElement).name === name ||
        el.id === id
    ) ?? null
  );
}

function spotlight(element: HTMLElement) {
  clear();
  current = element;
  element.classList.add("civicpilot-spotlight");
  element.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

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
    document.querySelectorAll<HTMLElement>(
      "h1, h2, h3, [role='heading']"
    )
  )
    .filter(element => element.getClientRects().length > 0)
    .map(element =>
      cleanPageText(element.innerText || element.textContent || "", 120)
    )
    .filter(Boolean)
    .slice(0, 8);

  // Only labels and field types are returned. Never read field values.
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

chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse) => {
    if (message?.type === "GET_PAGE_CONTEXT") {
      sendResponse({
        success: true,
        context: getPageContext()
      });
      return;
    }

    if (message?.type === "GET_FIELDS") {
      sendResponse({
        success: true,
        fields: detectFields()
      });
      return;
    }

    if (message?.type === "CLEAR_SPOTLIGHT") {
      clear();
      sendResponse({ success: true });
      return;
    }

    if (
      message?.type === "FIND_FIELD" &&
      typeof message.query === "string"
    ) {
      const field = findField(message.query);

      if (!field) {
        sendResponse({
          success: false,
          reason: "field_not_found"
        });
        return;
      }

      const element = findElement(field.id, field.name);

      if (!element) {
        sendResponse({
          success: false,
          reason: "element_not_found"
        });
        return;
      }

      spotlight(element);
      sendResponse({ success: true, field });
    }
  }
);
