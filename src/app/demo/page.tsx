import { DemoOrchestratorPanel } from "@/components/DemoOrchestratorPanel";

export default function DemoPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          ISC demo
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Run full sync and govern + enforce against your configured ISC tenant.
        </p>
      </section>
      <DemoOrchestratorPanel />
    </div>
  );
}
