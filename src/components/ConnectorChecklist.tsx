"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "agentforge-connector-checklist";

const CHECKLIST_ITEMS = [
  {
    id: "create-source",
    title: "Create Web Services source",
    description: "Add a SaaS source in ISC pointing at AgentForge.",
    href: "/setup#create-the-web-services-source",
  },
  {
    id: "account-aggregation",
    title: "Configure account aggregation",
    description: "Paste the platform account URL and set root path $.accounts[*].",
    href: "/connector",
  },
  {
    id: "entitlement-aggregation",
    title: "Configure entitlement aggregations",
    description:
      "Set up outboundPermissions and inboundCallers under Specific Types.",
    href: "/setup#entitlement-aggregation",
  },
  {
    id: "run-demo",
    title: "Run the demo",
    description: "Full sync agents into ISC, then govern + enforce.",
    href: "/demo",
  },
] as const;

function loadChecked(): Record<string, boolean> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function ConnectorChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setChecked(loadChecked());
    setHydrated(true);
  }, []);

  function toggleItem(id: string) {
    setChecked((current) => {
      const next = { ...current, [id]: !current[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function resetAll() {
    setChecked({});
    localStorage.removeItem(STORAGE_KEY);
  }

  const doneCount = CHECKLIST_ITEMS.filter((item) => checked[item.id]).length;

  return (
    <section className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Setup checklist
          </h2>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            {hydrated
              ? `${doneCount}/${CHECKLIST_ITEMS.length} complete — saved in this browser`
              : "Work through these once, then use the demo orchestrator."}
          </p>
        </div>
        {doneCount > 0 ? (
          <button
            type="button"
            onClick={resetAll}
            className="shrink-0 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          >
            Reset
          </button>
        ) : null}
      </div>
      <ol className="mt-3 space-y-2">
        {CHECKLIST_ITEMS.map((item, index) => {
          const isDone = checked[item.id] ?? false;
          return (
            <li key={item.id}>
              <div
                className={`flex gap-3 rounded-md border px-3 py-2 transition ${
                  isDone
                    ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
                    : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950"
                }`}
              >
                <label className="flex shrink-0 cursor-pointer items-start pt-0.5">
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => toggleItem(item.id)}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                </label>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    isDone
                      ? "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {isDone ? "✓" : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <Link
                    href={item.href}
                    className={`text-sm font-medium hover:underline ${
                      isDone
                        ? "text-zinc-500 line-through dark:text-zinc-400"
                        : "text-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    {item.title}
                  </Link>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {item.description}
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-zinc-500">
        Full walkthrough in the{" "}
        <Link
          href="/setup"
          className="font-medium underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          setup guide
        </Link>
        .
      </p>
    </section>
  );
}
