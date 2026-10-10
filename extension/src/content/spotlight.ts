// src/content/spotlight.ts

type SpotlightField = {
  id: string;
  name: string;
  label: string;
};

type SpotlightResponse = {
  success: boolean;
  field?: SpotlightField;
  reason?: string;
};

let highlightedElement: HTMLElement | null = null;
let highlightTimer: ReturnType<typeof setTimeout> | undefined;

const STYLE_ID = "civicpilot-spotlight-styles";
const HIGHLIGHT_CLASS = "civicpilot-spotlight";

/**
 * Inject highlighting styles directly into the webpage.
 */
function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;

  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      outline: 3px solid #f59e0b !important;
      outline-offset: 4px !important;
      box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.2),
                  0 0 20px rgba(245, 158, 11, 0.55) !important;
      border-radius: 4px !important;
      position: relative !important;
      z-index: 2147483646 !important;
      animation: civicpilot-spotlight-pulse 1s ease-in-out 2;
    }

    @keyframes civicpilot-spotlight-pulse {
      0%, 100% {
        box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.2);
      }
      50% {
        box-shadow: 0 0 0 10px rgba(245, 158, 11, 0.4);
      }
    }
  `;

  (document.head || document.documentElement).appendChild(style);
}

/**
 * Remove the previous highlight.
 */
function clearSpotlight(): void {
  if (highlightTimer) {
    clearTimeout(highlightTimer);
    highlightTimer = undefined;
  }

  highlightedElement?.classList.remove(HIGHLIGHT_CLASS);
  highlightedElement = null;
}

/**
 * Normalize text for matching.
 */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Read the accessible label associated with an element.
 */
function getFieldLabel(element: HTMLElement): string {
  const labels: string[] = [];

  if (element instanceof HTMLInputElement) {
    if (element.labels) {
      labels.push(
        ...Array.from(element.labels).map((label) => label.innerText)
      );
    }
  } else if (element instanceof HTMLSelectElement ||
             element instanceof HTMLTextAreaElement) {
    if (element.labels) {
      labels.push(
        ...Array.from(element.labels).map((label) => label.innerText)
      );
    }
  }

  const labelledBy = element.getAttribute("aria-labelledby");

  if (labelledBy) {
    labelledBy.split(/\s+/).forEach((id) => {
      const label = document.getElementById(id);
      if (label) labels.push(label.innerText);
    });
  }

  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) labels.push(ariaLabel);

  const parentLabel = element.closest("label");
  if (parentLabel) labels.push(parentLabel.innerText);

  const placeholder = element.getAttribute("placeholder");
  if (placeholder) labels.push(placeholder);

  const name = element.getAttribute("name");
  if (name) labels.push(name);

  const id = element.id;
  if (id) labels.push(id);

  return labels.join(" ");
}

/**
 * Find the best matching visible form field.
 */
function findMatchingField(
  query: string
): { element: HTMLElement; field: SpotlightField } | null {
  const target = normalize(query);

  if (!target) return null;

  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(
      "input:not([type='hidden']), select, textarea, [role='textbox'], [role='combobox']"
    )
  );

  const matches: Array<{
    element: HTMLElement;
    field: SpotlightField;
    score: number;
  }> = [];

  for (const element of elements) {
    if (!element.isConnected) continue;
    if (element.matches(":disabled, [aria-disabled='true']")) continue;

    const style = window.getComputedStyle(element);

    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number(style.opacity) === 0 ||
      element.getClientRects().length === 0
    ) {
      continue;
    }

    const labelText = getFieldLabel(element);
    const normalizedLabel = normalize(labelText);

    if (!normalizedLabel) continue;

    let score = 0;

    if (normalizedLabel === target) {
      score = 100;
    } else if (normalizedLabel.split(" ").includes(target)) {
      score = 85;
    } else if (normalizedLabel.includes(target)) {
      score = 70;
    } else if (target.includes(normalizedLabel)) {
      score = 50;
    }

    // Avoid matching unrelated fields with generic names.
    if (score === 0) continue;

    const input = element as HTMLInputElement;
    const field: SpotlightField = {
      id: element.id || input.name || "",
      name: input.name || "",
      label: labelText.trim() || input.name || element.id || "Form field",
    };

    matches.push({ element, field, score });
  }

  matches.sort((a, b) => b.score - a.score);

  if (!matches.length) return null;

  // Do not guess if the two best candidates are equally good.
  if (
    matches.length > 1 &&
    matches[0].score === matches[1].score &&
    matches[0].element !== matches[1].element
  ) {
    return null;
  }

  return {
    element: matches[0].element,
    field: matches[0].field,
  };
}

/**
 * Scroll to the element and highlight it for five seconds.
 */
function highlightField(element: HTMLElement): void {
  clearSpotlight();
  injectStyles();

  highlightedElement = element;

  element.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });

  element.classList.add(HIGHLIGHT_CLASS);

  highlightTimer = setTimeout(() => {
    clearSpotlight();
  }, 5000);
}

/**
 * Public function for locating and highlighting a field.
 */
export function spotlightField(query: string): SpotlightResponse {
  const result = findMatchingField(query);

  if (!result) {
    return {
      success: false,
      reason: "field_not_found",
    };
  }

  highlightField(result.element);

  return {
    success: true,
    field: result.field,
  };
}

/**
 * Initialize the standalone Spotlight feature.
 * Register this listener only once.
 */
export function initSpotlightFeature(): void {
  if (window.__civicPilotSpotlightInitialized) return;

  window.__civicPilotSpotlightInitialized = true;

  injectStyles();

  chrome.runtime.onMessage.addListener(
    (message, _sender, sendResponse) => {
      if (message?.type === "CLEAR_SPOTLIGHT") {
        clearSpotlight();
        sendResponse({ success: true });
        return;
      }

      if (message?.type !== "FIND_FIELD") return;

      if (typeof message.query !== "string") {
        sendResponse({
          success: false,
          reason: "invalid_query",
        } satisfies SpotlightResponse);

        return;
      }

      const result = spotlightField(message.query);
      sendResponse(result);
    }
  );
}

// Keep TypeScript aware of our initialization flag.
declare global {
  interface Window {
    __civicPilotSpotlightInitialized?: boolean;
  }
}