import { AgentForm } from "@/components/AgentForm";

export default function NewAgentPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Create Synthetic Agent
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Configure agent metadata and entitlements. AgentForge exposes agents
          through Web Services endpoints for your SailPoint connector.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <AgentForm />
      </div>
    </div>
  );
}
