import type { Metadata } from "next";
import Link from "next/link";

import { ConnectorEndpoints } from "@/components/ConnectorEndpoints";
import { MarkdownContent } from "@/components/MarkdownContent";
import { loadConnectorSetupGuide } from "@/lib/docs/load-guide";
import { getRequestBaseUrl } from "@/lib/url";

export const metadata: Metadata = {
  title: "Connector reference | AgentForge",
  description:
    "Manual SailPoint Web Services configuration reference for AgentForge maintainers.",
};

export default async function SetupGuideReferencePage() {
  const [content, baseUrl] = await Promise.all([
    loadConnectorSetupGuide(),
    getRequestBaseUrl(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-8">
      <Link
        href="/setup"
        className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        ← Back to Setup (golden import)
      </Link>

      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Connector reference
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Manual Web Services configuration for maintainers and advanced
          troubleshooting. Demo users should use{" "}
          <Link
            href="/setup"
            className="font-medium text-indigo-700 underline underline-offset-2 dark:text-indigo-300"
          >
            Setup → golden import
          </Link>{" "}
          instead of building sources by hand.
        </p>
      </section>

      <ConnectorEndpoints baseUrl={baseUrl} />

      <section className="border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <MarkdownContent content={content} />
      </section>
    </div>
  );
}
