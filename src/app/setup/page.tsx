import type { Metadata } from "next";
import Link from "next/link";

import { GoldenSpConfigPanel } from "@/components/GoldenSpConfigPanel";

export const metadata: Metadata = {
  title: "Prep ISC tenant | AgentForge",
  description:
    "Import golden Web Services sources and apply privilege classification for AgentForge demos.",
};

export default function SetupPage() {
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
          Prep your ISC tenant
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Import three golden Web Services sources, apply privilege
          classification, then continue on{" "}
          <Link
            href="/demo"
            className="font-medium text-indigo-700 underline underline-offset-2 dark:text-indigo-300"
          >
            Demo
          </Link>
          .{" "}
          <Link
            href="/setup/guide"
            className="text-zinc-500 underline underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Manual connector reference
          </Link>{" "}
          for maintainers only.
        </p>
      </section>

      <GoldenSpConfigPanel />
    </div>
  );
}
