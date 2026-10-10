
import type { DetectedField } from "./types";

type FormElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

const SENSITIVE_TERMS = [
  "password",
  "passwd",
  "passcode",
  "otp",
  "one time password",
  "captcha",
  "mpin",
  "security pin",
  "transaction pin",
  "login pin",
  "secret code"
];

const SYNONYMS: Record<string, string[]> = {
  dob: ["dob", "date of birth", "birth date"],
  "date of birth": ["dob", "date of birth", "birth date"],
  state: ["state"],
  district: ["district"],
  pincode: ["pincode", "pin code", "postal code", "zip code"],
  "pin code": ["pincode", "pin code", "postal code", "zip code"],
  gender: ["gender", "sex"],
  mobile: ["mobile", "mobile number", "phone number"],
  email: ["email", "email address"],
  name: ["name", "full name", "applicant name"]
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function isFormElement(element: Element): element is FormElement {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  );
}

function isVisible(element: FormElement): boolean {
  const style = getComputedStyle(element);

  return (
    element.getClientRects().length > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
}

function getLabel(element: FormElement): string {
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

  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel?.trim()) return ariaLabel.trim();

  const placeholder = element.getAttribute("placeholder");
  if (placeholder?.trim()) return placeholder.trim();

  const parent = element.parentElement;
  const nearbyLabel = parent?.querySelector(
    ":scope > label, :scope > span, :scope > p"
  );

  const nearbyText = nearbyLabel?.textContent?.trim();

  return nearbyText && nearbyText.length <= 120 ? nearbyText : "";
}

function isSensitive(
  element: FormElement,
  label: string,
  name: string,
  id: string,
  type: string
): boolean {
  if (
    ["password", "hidden", "file", "submit", "reset", "button", "image"]
      .includes(type.toLowerCase())
  ) {
    return true;
  }

  const text = normalize([
    label,
    name,
    id,
    element.getAttribute("autocomplete") || "",
    element.getAttribute("placeholder") || ""
  ].join(" "));

  return SENSITIVE_TERMS.some(term => {
    const normalizedTerm = normalize(term);
    return (` ${text} `).includes(` ${normalizedTerm} `);
  });
}

export function detectFields(): DetectedField[] {
  const elements = Array.from(
    document.querySelectorAll("input, select, textarea")
  ).filter(isFormElement);

  return elements.map((element, index) => {
    const label = getLabel(element);
    const name = element.getAttribute("name") || "";
    const id = element.id || name || `field-${index}`;
    const type =
      element instanceof HTMLInputElement
        ? element.type.toLowerCase()
        : element.tagName.toLowerCase();

    return {
      id,
      name,
      label,
      type,
      sensitive: isSensitive(element, label, name, id, type)
    };
  });
}

function getQueryTerms(query: string): string[] {
  const cleaned = normalize(query)
    .replace(
      /^(where is|where's|find|locate|highlight|spotlight|show me|which field is for)\s+/,
      ""
    )
    .replace(
      /^(where do i|where should i)\s+(enter|select|provide|fill|type)\s+/,
      ""
    )
    .replace(
      /\b(the|field|input|box|please|where|do|i|enter|select|provide|fill|type|in|for)\b/g,
      " "
    );

  const queryText = normalize(cleaned);
  if (!queryText) return [];

  return (SYNONYMS[queryText] || [queryText]).map(normalize);
}

function scoreField(field: DetectedField, terms: string[]): number {
  const candidates = [field.label, field.name, field.id]
    .map(normalize)
    .filter(Boolean);

  let best = 0;

  for (const term of terms) {
    for (const candidate of candidates) {
      if (candidate === term) {
        best = Math.max(best, 100);
      } else if (
        term.length >= 3 &&
        (candidate.includes(term) || term.includes(candidate))
      ) {
        best = Math.max(best, 85);
      } else {
        const words = term.split(" ").filter(Boolean);
        const candidateWords = candidate.split(" ");

        if (
          words.length > 0 &&
          words.every(word => candidateWords.includes(word))
        ) {
          best = Math.max(best, 75);
        }
      }
    }
  }

  return best;
}

export function findFieldMatch(
  query: string
): { field: DetectedField; element: HTMLElement } | null {
  const terms = getQueryTerms(query);
  if (!terms.length) return null;

  const elements = Array.from(
    document.querySelectorAll("input, select, textarea")
  ).filter(isFormElement);

  const matches = elements
    .filter(isVisible)
    .map((element, index) => {
      const label = getLabel(element);
      const name = element.getAttribute("name") || "";
      const id = element.id || name || `field-${index}`;
      const type =
        element instanceof HTMLInputElement
          ? element.type.toLowerCase()
          : element.tagName.toLowerCase();

      const field: DetectedField = {
        id,
        name,
        label,
        type,
        sensitive: isSensitive(element, label, name, id, type)
      };

      return {
        field,
        element,
        score: field.sensitive ? 0 : scoreField(field, terms)
      };
    })
    .filter(match => match.score >= 75)
    .sort((a, b) => b.score - a.score);

  const best = matches[0];

  if (!best) return null;

  // Don't arbitrarily choose between equally plausible fields.
  if (matches[1] && matches[1].score === best.score) {
    return null;
  }

  return {
    field: best.field,
    element: best.element
  };
}

export function findField(query: string): DetectedField | null {
  return findFieldMatch(query)?.field ?? null;
}
