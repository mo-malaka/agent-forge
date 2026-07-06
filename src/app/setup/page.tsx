import type { Metadata } from "next";
import Link from "next/link";

import { ConnectorChecklist } from "@/components/ConnectorChecklist";
import { ConnectorEndpoints } from "@/components/ConnectorEndpoints";
import { MarkdownContent } from "@/components/MarkdownContent";
import { loadConnectorSetupGuide } from "@/lib/docs/load-guide";
import { getRequestBaseUrl } from "@/lib/url";

export const metadata: Metadata = {
  title: "SailPoint Setup Guide | AgentForge",
  description:
    "Configure Identity Security Cloud Web Services SaaS to aggregate AgentForge synthetic AI agents.",
};

export default async function SetupGuidePage() {
  const [content, baseUrl] = await Promise.all([
    loadConnectorSetupGuide(),
    getRequestBaseUrl(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-8">
      <Link
        href="/"
        className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        ← Back to dashboard
      </Link>

      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Setup
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Connect AgentForge to Identity Security Cloud — copy Web Services URLs,
          work through the checklist, then read the full guide below.
        </p>
      </section>

      <ConnectorChecklist />
      <ConnectorEndpoints baseUrl={baseUrl} />

      <section className="border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <MarkdownContent content={content} />
      </section>
    </div>
  );
}
