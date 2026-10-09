import type { DetectedField } from "./types";

const SENSITIVE_TERMS = [
  "password", "passwd", "passcode", "otp", "one time password",
  "captcha", "mpin", "security pin", "transaction pin"
];

const normalize = (value: string) =>
  value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

function getLabel(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  if (el.id) {
    const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (label?.textContent?.trim()) return label.textContent.trim();
  }
  const parent = el.closest("label");
  if (parent?.textContent?.trim()) return parent.textContent.trim();
  return el.getAttribute("aria-label")?.trim()
    || el.getAttribute("placeholder")?.trim()
    || "";
}

function sensitive(label: string, name: string, type: string): boolean {
  if (type.toLowerCase() === "password") return true;
  const text = normalize(`${label} ${name} ${type}`);
  return SENSITIVE_TERMS.some(term => text.includes(term));
}

export function detectFields(): DetectedField[] {
  return Array.from(document.querySelectorAll<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >("input, select, textarea")).map((el, index) => {
    const label = getLabel(el);
    const name = el.getAttribute("name") || "";
    const id = el.id || name || `field-${index}`;
    const type = el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase();
    return { id, name, label, type, sensitive: sensitive(label, name, type) };
  });
}

const SYNONYMS: Record<string, string[]> = {
  dob: ["date of birth", "birth date", "dob"],
  rto: ["rto", "regional transport office"],
  state: ["state"],
  pin: ["pin code", "postal code", "pincode"]
};

function queryTerms(query: string): string[] {
  let q = normalize(query)
    .replace(/\b(where is|where's|find|locate|highlight|spotlight|show me|which field is for|where do i (?:enter|select|provide))\b/g, " ")
    .replace(/\b(the|field|input|box|for|please)\b/g, " ")
    .trim();
  if (SYNONYMS[q]) return SYNONYMS[q].map(normalize);
  const synonym = Object.entries(SYNONYMS).find(([, vals]) => vals.includes(q));
  if (synonym) return synonym[1].map(normalize);
  return [q];
}

export function findField(query: string): DetectedField | null {
  const terms = queryTerms(query).filter(Boolean);
  if (!terms.length) return null;
  const fields = detectFields().filter(f => !f.sensitive);
  const scored = fields.map(field => {
    const candidates = [field.label, field.name, field.id].map(normalize).filter(Boolean);
    let score = 0;
    for (const term of terms) {
      if (candidates.some(c => c === term)) score = Math.max(score, 100);
      else if (candidates.some(c => c.includes(term) || term.includes(c))) score = Math.max(score, 85);
      else {
        const tokens = term.split(" ").filter(Boolean);
        const overlap = tokens.filter(t => candidates.some(c => c.split(" ").includes(t))).length;
        if (tokens.length && overlap === tokens.length) score = Math.max(score, 70);
      }
    }
    return { field, score };
  }).sort((a, b) => b.score - a.score);
  if (!scored[0] || scored[0].score < 70) return null;
  if (scored[1] && scored[1].score === scored[0].score) return null;
  return scored[0].field;
}
