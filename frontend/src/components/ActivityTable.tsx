
import { CheckCircle2, XCircle, Activity } from "lucide-react";
import type { ActivityLog } from "../types/activity";

interface Props {
  logs: ActivityLog[];
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, character => character.toUpperCase());
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function formatDuration(value: number | null) {
  if (value == null) return "—";
  if (value < 1000) return `${value} ms`;

  return `${(value / 1000).toFixed(2)} s`;
}

export default function ActivityTable({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-16 text-center">
        <div className="mb-4 grid size-12 place-items-center rounded-xl bg-neutral-100 text-neutral-500">
          <Activity size={22} />
        </div>

        <h3 className="text-sm font-semibold text-neutral-900">
          No activity found
        </h3>

        <p className="mt-2 max-w-sm text-xs leading-5 text-neutral-500">
          Recorded CivicPilot interactions will appear here when available.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            <th className="px-5 py-4">Activity</th>
            <th className="px-5 py-4">Website</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4">Response time</th>
            <th className="px-5 py-4">Date</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-neutral-100">
          {logs.map(log => (
            <tr
              key={log.id}
              className="transition-colors hover:bg-neutral-50"
            >
              <td className="px-5 py-4">
                <p className="font-medium text-neutral-800">
                  {formatLabel(log.eventType)}
                </p>

                <p className="mt-1 text-xs text-neutral-500">
                  {formatLabel(log.intent)}
                </p>

                {log.targetFieldName && (
                  <p className="mt-1 text-xs text-neutral-500">
                    Field: {log.targetFieldName}
                  </p>
                )}
              </td>

              <td className="max-w-52 break-all px-5 py-4 text-xs text-neutral-600">
                {log.portalDomain || "—"}
              </td>

              <td className="px-5 py-4">
                {log.success ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    <CheckCircle2 size={14} />
                    Success
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                    <XCircle size={14} />
                    Failed
                  </span>
                )}
              </td>

              <td className="whitespace-nowrap px-5 py-4 text-xs text-neutral-600">
                {formatDuration(log.responseTimeMs)}
              </td>

              <td className="min-w-40 whitespace-nowrap px-5 py-4 text-xs text-neutral-500">
                {formatDate(log.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
