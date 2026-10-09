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
  dob: ["date of birth", "birth date", "dob"],
  "date of birth": ["date of birth", "birth date", "dob"],
  state: ["state"],
  district: ["district"],
  pincode: ["pin code", "postal code", "pincode", "zip code"],
  "pin code": ["pin code", "postal code", "pincode", "zip code"],
  aadhaar: ["aadhaar", "aadhar", "uid"],
  aadhar: ["aadhaar", "aadhar", "uid"],
  gender: ["gender", "sex"],
  mobile: ["mobile number", "mobile", "phone number"],
  email: ["email", "email address"],
  name: ["full name", "applicant name", "name"],
  "father name": ["father name", "father's name"],
  "mother name": ["mother name", "mother's name"]
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function isFormElement(el: Element): el is FormElement {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement
  );
}

function isVisible(el: FormElement): boolean {
  const style = getComputedStyle(el);

  return (
    el.getClientRects().length > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    !el.disabled &&
    !el.readOnly
  );
}

function getLabel(el: FormElement): string {
  // Native labels, including labels connected to the input by "for".
  const labels = el.labels
    ? Array.from(el.labels)
        .map(label => label.innerText || label.textContent || "")
        .join(" ")
    : "";

  if (labels.trim()) return labels.trim();

  // Accessible name from aria-labelledby.
  const labelledBy = el.getAttribute("aria-labelledby");

  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map(id => document.getElementById(id)?.textContent || "")
      .join(" ")
      .trim();

    if (text) return text;
  }

  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel?.trim()) return ariaLabel.trim();

  const placeholder = el.getAttribute("placeholder");
  if (placeholder?.trim()) return placeholder.trim();

  // Common government portal layout: label text immediately before input.
  const parent = el.parentElement;

  if (parent) {
    const label = parent.querySelector(
      ":scope > label, :scope > span, :scope > p"
    );

    const text = label?.textContent?.trim();

    if (text && text.length <= 120) return text;
  }

  return "";
}

function isSensitive(
  el: FormElement,
  label: string,
  name: string,
  id: string
): boolean {
  const type =
    el instanceof HTMLInputElement
      ? el.type.toLowerCase()
      : el.tagName.toLowerCase();

  if (
    ["password", "hidden", "file", "submit", "reset", "button", "image"]
      .includes(type)
  ) {
    return true;
  }

  const searchable = normalize(
    [
      label,
      name,
      id,
      el.getAttribute("autocomplete") || "",
      el.getAttribute("aria-label") || "",
      el.getAttribute("placeholder") || ""
    ].join(" ")
  );

  return SENSITIVE_TERMS.some(term =>
    new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
      .test(searchable)
  );
}

export function detectFields(): DetectedField[] {
  const elements = Array.from(
    document.querySelectorAll("input, select, textarea")
  ).filter(isFormElement);

  return elements.map((el, index) => {
    const label = getLabel(el);
    const name = el.getAttribute("name") || "";
    const actualId = el.id || "";
    const type =
      el instanceof HTMLInputElement
        ? el.type.toLowerCase()
        : el.tagName.toLowerCase();

    return {
      id: actualId || name || `field-${index}`,
      name,
      label,
      type,
      sensitive: isSensitive(el, label, name, actualId)
    };
  });
}

function getQueryTerms(query: string): string[] {
  let cleaned = normalize(query)
    .replace(
      /^(where is|where s|find|locate|highlight|spotlight|show me|which field is for)\s+/,
      ""
    )
    .replace(
      /^(where do i|where should i)\s+(enter|select|provide|fill|type)\s+/,
      ""
    )
    .replace(
      /\b(the|field|input|box|please|where|do|i|enter|select|provide|fill|in|for)\b/g,
      " "
    );

  cleaned = normalize(cleaned);

  if (!cleaned) return [];

  return [...new Set(SYNONYMS[cleaned] || [cleaned])];
}

function scoreField(
  field: DetectedField,
  queryTerms: string[]
): number {
  const candidates = [
    field.label,
    field.name,
    field.id
  ].map(normalize).filter(Boolean);

  if (!candidates.length) return 0;

  let best = 0;

  for (const term of queryTerms) {
    for (const candidate of candidates) {
      if (candidate === term) {
        best = Math.max(best, 100);
        continue;
      }

      // Permit phrase matches, but not arbitrary one-character matches.
      if (
        term.length >= 3 &&
        (candidate.includes(term) || term.includes(candidate))
      ) {
        best = Math.max(best, 85);
        continue;
      }

      const words = term.split(" ").filter(word => word.length > 1);
      const candidateWords = candidate.split(" ");

      if (
        words.length > 0 &&
        words.every(word => candidateWords.includes(word))
      ) {
        best = Math.max(best, 75);
      }
    }
  }

  return best;
}

/**
 * Keep the element reference internal to the content script.
 * Never send DOM elements or field values through extension messages.
 */
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
      const actualId = element.id || "";
      const type =
        element instanceof HTMLInputElement
          ? element.type.toLowerCase()
          : element.tagName.toLowerCase();

      const field: DetectedField = {
        id: actualId || name || `field-${index}`,
        name,
        label,
        type,
        sensitive: isSensitive(element, label, name, actualId)
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

  // If the two strongest matches are equally plausible, ask the user
  // to refine the request instead of highlighting a potentially wrong field.
  if (matches[1] && matches[1].score === best.score) {
    return null;
  }

  return {
    field: best.field,
    element: best.element
  };
}

export function findField(query: string): DetectedField | null {
  return findFieldMatch(query)?.field || null;
}
