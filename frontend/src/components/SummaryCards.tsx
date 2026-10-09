
import {
  Activity,
  CheckCircle2,
  Globe2,
  Clock3
} from "lucide-react";
import type { ActivitySummary } from "../types/activity";

interface Props {
  summary: ActivitySummary;
}

export default function SummaryCards({ summary }: Props) {
  const successRate =
    summary.total > 0
      ? Math.round((summary.successful / summary.total) * 100)
      : 0;

  const averageTime =
    summary.averageResponseTimeMs == null
      ? "—"
      : summary.averageResponseTimeMs < 1000
        ? `${summary.averageResponseTimeMs} ms`
        : `${(summary.averageResponseTimeMs / 1000).toFixed(1)} s`;

  const cards = [
    {
      title: "Total interactions",
      value: summary.total.toLocaleString(),
      detail: `${summary.last7Days} events in the last 7 days`,
      icon: Activity
    },
    {
      title: "Success rate",
      value: `${successRate}%`,
      detail: `${summary.successful} successful events`,
      icon: CheckCircle2
    },
    {
      title: "Portals visited",
      value: summary.portalsVisited.toLocaleString(),
      detail: "Unique website domains",
      icon: Globe2
    },
    {
      title: "Avg. response time",
      value: averageTime,
      detail: "Recorded response duration",
      icon: Clock3
    }
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(card => {
        const Icon = card.icon;

        return (
          <article
            key={card.title}
            className="rounded-2xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-3 text-sm text-neutral-500">
              <span>{card.title}</span>
              <Icon size={19} className="text-emerald-700" />
            </div>

            <strong className="mt-5 block text-3xl font-semibold tracking-tight text-neutral-900">
              {card.value}
            </strong>

            <p className="mt-2 text-xs leading-5 text-neutral-500">
              {card.detail}
            </p>
          </article>
        );
      })}
    </section>
  );
}
