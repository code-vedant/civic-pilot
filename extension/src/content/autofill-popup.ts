
type Match = {
  id: string;
  label: string;
  value: string;
};

let activePopup: HTMLDivElement | null = null;

function closePopup() {
  activePopup?.remove();
  activePopup = null;
}

export function showAutofillPopup(
  target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  match: Match
) {
  closePopup();

  const popup = document.createElement("div");
  popup.className = "civicpilot-autofill-popup";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-label", "CivicPilot autofill suggestion");

  const title = document.createElement("div");
  title.className = "civicpilot-autofill-title";
  title.textContent = `Saved data: ${match.label}`;

  const preview = document.createElement("div");
  preview.className = "civicpilot-autofill-preview";
  preview.textContent = match.value;

  const actions = document.createElement("div");
  actions.className = "civicpilot-autofill-actions";

  const fillButton = document.createElement("button");
  fillButton.type = "button";
  fillButton.className = "civicpilot-autofill-fill";
  fillButton.textContent = "Fill";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "civicpilot-autofill-close";
  closeButton.textContent = "Dismiss";

  fillButton.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();

    if (
      target instanceof HTMLInputElement &&
      ["password", "hidden", "file", "submit", "button"]
        .includes(target.type.toLowerCase())
    ) {
      closePopup();
      return;
    }

    if (
      target instanceof HTMLInputElement &&
      ["checkbox", "radio"].includes(target.type.toLowerCase())
    ) {
      closePopup();
      return;
    }

    if (target instanceof HTMLSelectElement) {
      const optionExists = Array.from(target.options).some(
        option => option.value === match.value
      );

      if (!optionExists) {
        preview.textContent =
          "This saved value doesn't match an available option.";
        return;
      }
    }

    // Use the native setter so React-controlled fields can detect changes.
    if (target instanceof HTMLInputElement) {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set;

      setter?.call(target, match.value);
    } else if (target instanceof HTMLTextAreaElement) {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;

      setter?.call(target, match.value);
    } else {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value"
      )?.set;

      setter?.call(target, match.value);
    }

    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));

    closePopup();
    target.focus();
  });

  closeButton.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    closePopup();
  });

  actions.append(fillButton, closeButton);
  popup.append(title, preview, actions);

  // Keep popup clicks from triggering portal click handlers.
  popup.addEventListener("click", event => event.stopPropagation());

  document.body.appendChild(popup);
  activePopup = popup;

  const rect = target.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();

  const left = Math.max(
    8,
    Math.min(rect.left, window.innerWidth - popupRect.width - 8)
  );

  let top = rect.bottom + 8;

  if (top + popupRect.height > window.innerHeight - 8) {
    top = Math.max(8, rect.top - popupRect.height - 8);
  }

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

export function dismissAutofillPopup() {
  closePopup();
}
