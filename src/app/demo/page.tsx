import { Suspense } from "react";

import { DemoOrchestratorPanel } from "@/components/DemoOrchestratorPanel";

function DemoOrchestratorFallback() {
  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-8 text-center text-sm text-zinc-500 dark:border-indigo-900 dark:bg-indigo-950/20">
      Loading demo orchestrator...
    </div>
  );
}

export default function DemoPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          ISC demo
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Run full sync and govern + enforce against your configured ISC tenant.
          Share a tab with{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
            /demo?tab=govern-enforce
          </code>
          .
        </p>
      </section>
      <Suspense fallback={<DemoOrchestratorFallback />}>
        <DemoOrchestratorPanel />
      </Suspense>
    </div>
  );
}
