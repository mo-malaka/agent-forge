"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  loadDemoProgress,
  summarizeDemoProgress,
  type DemoProgressSummary,
} from "@/lib/demo/progress-storage";

export function HomeContinueDemo() {
  const [summary, setSummary] = useState<DemoProgressSummary | null>(null);

  useEffect(() => {
    setSummary(summarizeDemoProgress(loadDemoProgress()));
  }, []);

  if (!summary) {
    return null;
  }

  return (
    <Link
      href={summary.continueHref}
      className="group block rounded-lg border border-indigo-300 bg-indigo-50 p-5 transition hover:border-indigo-400 hover:shadow-sm dark:border-indigo-800 dark:bg-indigo-950/40 dark:hover:border-indigo-700"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
        Pick up where you left off
      </p>
      <h2 className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
        {summary.label}
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {summary.detail}
      </p>
      <p className="mt-3 text-sm font-medium text-indigo-700 group-hover:text-indigo-800 dark:text-indigo-300 dark:group-hover:text-indigo-200">
        Continue demo →
      </p>
    </Link>
  );
}
