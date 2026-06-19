import type { Metadata } from "next";
import Link from "next/link";

import { MarkdownContent } from "@/components/MarkdownContent";
import { loadConnectorSetupGuide } from "@/lib/docs/load-guide";

export const metadata: Metadata = {
  title: "SailPoint Setup Guide | AgentForge",
  description:
    "Configure Identity Security Cloud Web Services SaaS to aggregate AgentForge synthetic AI agents.",
};

export default async function SetupGuidePage() {
  const content = await loadConnectorSetupGuide();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
      <Link
        href="/"
        className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        ← Back to dashboard
      </Link>
      <MarkdownContent content={content} />
    </div>
  );
}
