import Link from "next/link";

import { AgentForm } from "@/components/AgentForm";

export default function NewAgentPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Create Synthetic Agent
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Configure outbound permissions and inbound callers. AgentForge exposes
          agents through Web Services endpoints for SailPoint AIS — see the{" "}
          <Link
            href="/demo"
            className="font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-300"
          >
            setup guide
          </Link>
          .
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <AgentForm />
      </div>
    </div>
  );
}
