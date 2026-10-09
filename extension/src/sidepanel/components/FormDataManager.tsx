
import { useEffect, useState } from "react";
import type { SavedFormData } from "../../utils/types";

function sendMessage<T>(message: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response as T);
    });
  });
}

export default function FormDataManager() {
  const [items, setItems] = useState<SavedFormData[]>([]);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [fieldName, setFieldName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);

    try {
      const result = await sendMessage<{
        success: boolean;
        items?: SavedFormData[];
        error?: string;
      }>({ type: "FORM_DATA_LIST" });

      if (!result.success) {
        throw new Error(result.error || "Could not load saved data");
      }

      setItems(result.items || []);
      setError("");
    } catch {
      setError("Could not access saved data. Reload the extension and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!label.trim() || !value.trim()) {
      setError("Enter a label and a value.");
      return;
    }

    if (value.length > 2000) {
      setError("Keep each saved value under 2,000 characters.");
      return;
    }

    const now = Date.now();

    const item: SavedFormData = {
      id: crypto.randomUUID(),
      label: label.trim(),
      value,
      fieldIds: fieldId.trim() ? [fieldId.trim()] : [],
      fieldNames: fieldName.trim() ? [fieldName.trim()] : [],
      createdAt: now,
      updatedAt: now
    };

    try {
      const result = await sendMessage<{
        success: boolean;
        error?: string;
      }>({
        type: "FORM_DATA_SAVE",
        item
      });

      if (!result.success) {
        throw new Error(result.error || "Could not save data");
      }

      setLabel("");
      setValue("");
      setFieldId("");
      setFieldName("");

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save data"
      );
    }
  }

  async function remove(id: string) {
    try {
      const result = await sendMessage<{
        success: boolean;
        error?: string;
      }>({
        type: "FORM_DATA_DELETE",
        id
      });

      if (!result.success) {
        throw new Error(result.error || "Could not delete data");
      }

      setItems(previous => previous.filter(item => item.id !== id));
      setError("");
    } catch {
      setError("Could not delete this entry.");
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <div>
        <h2 className="text-base font-semibold">Saved form data</h2>
        <p className="mt-1 text-xs leading-5 text-neutral-500">
          Save values you choose to reuse on government portals.
          Values stay in this browser's extension storage.
        </p>
      </div>

      <form onSubmit={save} className="space-y-3">
        <label className="block text-xs font-medium">
          Field label
          <input
            className="mt-1 w-full border border-neutral-300 p-2 text-sm"
            value={label}
            onChange={event => setLabel(event.target.value)}
            placeholder="e.g. Applicant name"
            maxLength={100}
            required
          />
        </label>

        <label className="block text-xs font-medium">
          Saved value
          <input
            className="mt-1 w-full border border-neutral-300 p-2 text-sm"
            type="text"
            value={value}
            onChange={event => setValue(event.target.value)}
            maxLength={2000}
            autoComplete="off"
            required
          />
        </label>

        <label className="block text-xs font-medium">
          Field ID (optional)
          <input
            className="mt-1 w-full border border-neutral-300 p-2 text-sm"
            value={fieldId}
            onChange={event => setFieldId(event.target.value)}
            placeholder="e.g. applicantName"
            maxLength={200}
          />
        </label>

        <label className="block text-xs font-medium">
          Field name (optional)
          <input
            className="mt-1 w-full border border-neutral-300 p-2 text-sm"
            value={fieldName}
            onChange={event => setFieldName(event.target.value)}
            placeholder="e.g. applicant_name"
            maxLength={200}
          />
        </label>

        <p className="text-[11px] leading-4 text-neutral-500">
          Never save passwords, OTPs, CAPTCHA codes, security PINs
          or Aadhaar numbers here.
        </p>

        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="w-full bg-black px-3 py-2 text-sm text-white"
        >
          Save data
        </button>
      </form>

      <div className="border-t border-neutral-200 pt-3">
        <h3 className="text-sm font-semibold">
          Your saved entries ({items.length})
        </h3>

        {loading && (
          <p className="py-3 text-xs text-neutral-500">Loading...</p>
        )}

        {!loading && items.length === 0 && (
          <p className="py-3 text-xs text-neutral-500">
            No saved entries yet.
          </p>
        )}

        <div className="mt-2 space-y-2">
          {items.map(item => (
            <article
              key={item.id}
              className="border border-neutral-200 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{item.label}</p>
                  <p className="mt-1 break-words text-xs text-neutral-600">
                    {item.value}
                  </p>
                  {(item.fieldIds.length > 0 ||
                    item.fieldNames.length > 0) && (
                    <p className="mt-1 break-all text-[10px] text-neutral-400">
                      {[
                        ...item.fieldIds,
                        ...item.fieldNames
                      ].join(" · ")}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void remove(item.id)}
                  className="shrink-0 text-xs text-red-600 underline"
                  aria-label={`Delete ${item.label}`}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
