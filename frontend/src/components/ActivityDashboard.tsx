import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, UserButton } from "@clerk/react";
import { AlertCircle, RefreshCw } from "lucide-react";

import { fetchActivityLogs, fetchActivitySummary } from "../lib/api";
import type { ActivityLog, ActivitySummary, EventFilter } from "../types/activity";
import SummaryCards from "./SummaryCards";
import ActivityTable from "./ActivityTable";

const PAGE_SIZE = 10;

export default function ActivityDashboard() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [filter, setFilter] = useState<EventFilter>("");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setError("Your session is not signed in. Please sign in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // getToken is called here, inside the active Clerk session.
      const token = await getToken();
      if (!token) {
        throw new Error("Clerk did not return a session token. Sign out and sign in again, then retry.");
      }

      // The API helpers take a token string, not the getToken function.
      const [logsResponse, summaryResponse] = await Promise.all([
        fetchActivityLogs(token, { limit: PAGE_SIZE, offset, eventType: filter }),
        fetchActivitySummary(token),
      ]);

      setLogs(logsResponse.logs);
      setTotal(logsResponse.pagination.total);
      setHasMore(logsResponse.pagination.hasMore);
      setSummary(summaryResponse.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your activity.");
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn, offset, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  function changeFilter(value: EventFilter) {
    setFilter(value);
    setOffset(0);
  }

  if (!isLoaded || (loading && !summary && !error)) {
    return <div className="grid min-h-screen place-items-center bg-[#f7f8f6] text-sm text-neutral-500">Loading your CivicPilot dashboard…</div>;
  }

  if (!isSignedIn) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f8f6] px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Sign in to view activity</h1>
          <p className="mt-2 text-sm text-neutral-500">Your CivicPilot activity is linked to your account.</p>
          <Link to="/sign-in" className="mt-6 inline-flex bg-neutral-900 px-5 py-3 text-sm text-white">Sign in</Link>
        </div>
      </main>
    );
  }

  const firstItem = total === 0 ? 0 : offset + 1;
  const lastItem = Math.min(offset + logs.length, total);

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-xl font-bold tracking-tight">CivicPilot<span>.</span></Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-neutral-600 hover:text-neutral-950">Home</Link>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-800">CivicPilot / Analytics</p>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">Activity overview</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">Review your interactions and CivicPilot usage across websites.</p>
          </div>
          <button className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-xs font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-50 sm:self-auto" type="button" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </section>

        {error && (
          <section role="alert" className="mb-6 flex flex-col justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center">
            <div className="flex gap-3">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-800">Unable to load activity</p>
                <p className="mt-1 text-xs leading-5 text-red-700">{error}</p>
              </div>
            </div>
            <button type="button" className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50" onClick={() => void load()}>Retry</button>
          </section>
        )}

        {summary ? <SummaryCards summary={summary} /> : !error && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl border border-neutral-200 bg-white" />)}</div>}

        <section className="mt-8 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-neutral-200 p-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Recent activity</h2>
              <p className="mt-1 text-xs text-neutral-500">{total.toLocaleString()} recorded events</p>
            </div>
            <label className="flex flex-col gap-1.5 text-[11px] font-medium text-neutral-500 sm:min-w-48">
              Event type
              <select value={filter} onChange={(event) => changeFilter(event.target.value as EventFilter)} className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-xs text-neutral-800 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100">
                <option value="">All events</option>
                <option value="copilot_interaction">Copilot interactions</option>
                <option value="page_load">Page loads</option>
                <option value="field_dwell">Field activity</option>
                <option value="error">Errors</option>
              </select>
            </label>
          </div>
          {loading && logs.length === 0 ? <div className="px-6 py-16 text-center text-sm text-neutral-500">Loading your activity…</div> : <ActivityTable logs={logs} />}
          <div className="flex flex-col justify-between gap-3 border-t border-neutral-200 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
            <span className="text-xs text-neutral-500">{firstItem}–{lastItem} of {total}</span>
            <div className="flex gap-2">
              <button className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40" disabled={loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} type="button">Previous</button>
              <button className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40" disabled={loading || !hasMore} onClick={() => setOffset(offset + PAGE_SIZE)} type="button">Next</button>
            </div>
          </div>
        </section>

        <p className="mt-5 text-xs leading-5 text-neutral-500">This dashboard displays operational activity metadata, not chat transcripts or form contents.</p>
      </main>
    </div>
  );
}
