
import { detectFields, findFieldMatch } from "../utils/field-detector";
import "./overlay.css";
import { dismissAutofillPopup, showAutofillPopup } from "./autofill-popup";

let currentSpotlight: HTMLElement | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;

function clearSpotlight(): void {
  if (currentSpotlight) {
    currentSpotlight.classList.remove("civicpilot-spotlight");
    currentSpotlight.removeAttribute("data-civicpilot-spotlight");
    currentSpotlight = null;
  }

  if (clearTimer !== null) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
}

function spotlight(element: HTMLElement): void {
  clearSpotlight();

  currentSpotlight = element;

  element.setAttribute("data-civicpilot-spotlight", "true");
  element.classList.add("civicpilot-spotlight");

  element.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest"
  });

  // Remove the visual highlight after 8 seconds.
  clearTimer = setTimeout(() => {
    clearSpotlight();
  }, 8000);
}

function containsPotentialPersonalData(value: string): boolean {
  return (
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value) ||
    /\b\d{10,12}\b/.test(value)
  );
}

function cleanPageText(value: string, maxLength: number): string {
  const text = value.replace(/\s+/g, " ").trim();

  if (!text || containsPotentialPersonalData(text)) {
    return "";
  }

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
      cleanPageText(
        element.innerText || element.textContent || "",
        120
      )
    )
    .filter(Boolean)
    .slice(0, 8);

  // Return field labels only, never entered field values.
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
        fields: detectFields().filter(field => !field.sensitive)
      });

      return;
    }

    if (message?.type === "CLEAR_SPOTLIGHT") {
      clearSpotlight();
      sendResponse({ success: true });

      return;
    }

    if (
      message?.type === "FIND_FIELD" &&
      typeof message.query === "string"
    ) {
      const query = message.query.trim();

      if (!query || query.length > 150) {
        sendResponse({
          success: false,
          reason: "invalid_query"
        });

        return;
      }

      const match = findFieldMatch(query);

      if (!match) {
        sendResponse({
          success: false,
          reason: "field_not_found"
        });

        return;
      }

      spotlight(match.element);

      sendResponse({
        success: true,
        field: match.field
      });
    }
  }
);


const blockedAutofillTerms = [
  "password",
  "passwd",
  "passcode",
  "otp",
  "captcha",
  "mpin",
  "security pin",
  "transaction pin",
  "aadhaar number",
  "aadhar number"
];

function isBlockedAutofillField(
  field: { id: string; name: string; label: string; type: string }
): boolean {
  const metadata = `${field.id} ${field.name} ${field.label}`
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  return (
    ["password", "hidden", "file", "submit", "button", "image"]
      .includes(field.type.toLowerCase()) ||
    blockedAutofillTerms.some(term => metadata.includes(term))
  );
}

function requestAutofillMatch(
  target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  field: {
    id: string;
    name: string;
    label: string;
    type: string;
  }
) {
  chrome.runtime.sendMessage(
    {
      type: "GET_AUTOFILL_MATCH",
      field
    },
    response => {
      if (chrome.runtime.lastError) return;
      if (!response?.success || !response.match) return;

      const active = document.activeElement;

      if (
        !(active instanceof HTMLInputElement) &&
        !(active instanceof HTMLSelectElement) &&
        !(active instanceof HTMLTextAreaElement)
      ) {
        return;
      }

      // Ensure the suggestion still belongs to the focused element.
      const activeField = detectFields().find(
        item =>
          item.id === (active.id || active.getAttribute("name") || "") ||
          (item.name !== "" && item.name === active.getAttribute("name"))
      );

      if (
        document.activeElement !== target ||
        !target.isConnected
      ) {
        return;
      }
      
      showAutofillPopup(target, response.match);
    }
  );
}

document.addEventListener(
  "focusin",
  event => {
    const target = event.target;

    if (
      !(target instanceof HTMLInputElement) &&
      !(target instanceof HTMLSelectElement) &&
      !(target instanceof HTMLTextAreaElement)
    ) {
      return;
    }

    dismissAutofillPopup();

    const elements = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input, select, textarea"
      )
    );

    const index = elements.indexOf(target);
    if (index < 0) return;

    const field = detectFields()[index];

    if (!field || field.sensitive || isBlockedAutofillField(field)) {
      return;
    }

    requestAutofillMatch(
      target,
      {
        id: target.id || field.id,
        name: target.getAttribute("name") || "",
        label: field.label,
        type: field.type
      }
    );
  },
  true
);

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    dismissAutofillPopup();
  }
});

document.addEventListener("click", event => {
  const target = event.target;

  if (
    target instanceof Element &&
    !target.closest(".civicpilot-autofill-popup")
  ) {
    dismissAutofillPopup();
  }
});
