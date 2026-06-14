import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <div>
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
          >
            AgentForge
          </Link>
          <p className="text-xs text-zinc-500">
            Synthetic AI agents for identity governance demos
          </p>
        </div>
        <Link
          href="/agents/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          New Agent
        </Link>
      </div>
    </header>
  );
}
