"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { IscOrgAdminPatGuide } from "@/components/IscOrgAdminPatGuide";

interface PlatformStatus {
  id: string;
  label: string;
  connectorSlug: string;
  suggestedSourceName: string;
  misSchemaDefault: string;
  available: boolean;
  downloadPath: string;
  downloadFileName: string;
}

interface PackageStatus {
  baseUrl: string;
  allAvailable: boolean;
  importGuideUrl: string;
  vscodeExtensionUrl: string;
  platforms: PlatformStatus[];
}

type ImportMethod = "config-hub" | "api";

interface ImportResult {
  connectorSlug: string;
  status: string;
  preview: boolean;
  jobId: string;
  resultSummary?: string;
}

function DownloadPackages({ platforms }: { platforms: PlatformStatus[] }) {
  return (
    <div className="min-w-0 flex-1 space-y-2">
      <p className="font-medium text-zinc-900 dark:text-zinc-100">
        Download all three source packages
      </p>
      <p className="text-xs text-zinc-500">
        Optional for API import — AgentForge loads the same packages server-side.
        Still useful if you want local copies.
      </p>
      <div className="flex flex-wrap gap-2">
        {platforms.map((platform) => (
          <a
            key={platform.id}
            href={platform.available ? platform.downloadPath : undefined}
            download={platform.downloadFileName}
            aria-disabled={!platform.available}
            className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium ${
              platform.available
                ? "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                : "cursor-not-allowed border-zinc-200 text-zinc-400 dark:border-zinc-800 dark:text-zinc-600"
            }`}
          >
            {platform.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function ConfigHubImportSteps({
  importGuideUrl,
}: {
  importGuideUrl: string;
}) {
  return (
    <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
      <p className="font-medium text-zinc-900 dark:text-zinc-100">
        Option 1 — Configuration Hub (browser UI)
      </p>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        Best when you are already signed into ISC as an org admin. No personal
        access token required.
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-xs leading-relaxed">
        <li>
          Open <strong>Solution Center</strong> (grid/waffle icon, upper-left of
          the ISC page — not the Admin megamenu) →{" "}
          <strong>Configuration Hub</strong>.
          <span className="mt-1 block text-zinc-500">
            Direct link:{" "}
            <code className="text-[11px]">
              https://YOUR-TENANT.identitynow.com/ui/ch/admin/config-hub/uploads
            </code>
          </span>
        </li>
        <li>
          Go to <strong>Uploads</strong> → <strong>Upload</strong> → submit
          each downloaded JSON file (Bedrock, Vertex, Foundry).
        </li>
        <li>
          On each upload: <strong>Actions</strong> →{" "}
          <strong>Prepare draft for deployment</strong> → review the draft →{" "}
          <strong>Deploy draft</strong>.
        </li>
      </ol>
      <p className="text-xs text-zinc-500">
        Configuration Hub is separate from the Admin menu (Connections, Global,
        etc.). You need Admin access and Configuration Hub permissions on the
        target tenant.
      </p>
      <a
        href={importGuideUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-block text-xs font-medium text-indigo-700 underline underline-offset-2 hover:text-indigo-900 dark:text-indigo-300"
      >
        SailPoint Configuration Hub import guide →
      </a>
    </div>
  );
}

function ApiImportPanel({
  allAvailable,
  platforms,
}: {
  allAvailable: boolean;
  platforms: PlatformStatus[];
}) {
  const [tenant, setTenant] = useState("");
  const [domain, setDomain] = useState("identitynow.com");
  const [pat, setPat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [lastPreviewOk, setLastPreviewOk] = useState(false);

  async function runImport(preview: boolean) {
    setBusy(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/setup/isc-sp-config/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          import_all: true,
          tenant,
          domain: domain.trim() || undefined,
          personal_access_token: pat,
          preview,
        }),
      });

      const body = (await response.json()) as {
        error?: string;
        results?: ImportResult[];
      };

      if (!response.ok) {
        throw new Error(body.error ?? "Import request failed");
      }

      setResults(body.results ?? []);
      setLastPreviewOk(preview);
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Import request failed",
      );
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = tenant.trim() && pat.trim().length >= 20 && allAvailable;

  return (
    <div className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
      <div>
        <p className="font-medium text-zinc-900 dark:text-zinc-100">
          Option 2 — Import from AgentForge (SP-Config API)
        </p>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          AgentForge calls{" "}
          <code className="text-[11px]">POST /beta/sp-config/import</code> on
          your target tenant using a short-lived ORG_ADMIN PAT. The token is sent
          only for this request and is never saved.
        </p>
      </div>

      <IscOrgAdminPatGuide />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            Target tenant slug
          </span>
          <input
            type="text"
            value={tenant}
            onChange={(event) => setTenant(event.target.value)}
            placeholder="acme-demo"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-950"
          />
        </label>
        <label className="block text-xs">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            API domain (optional)
          </span>
          <input
            type="text"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            placeholder="identitynow.com"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-950"
          />
        </label>
      </div>

      <label className="block text-xs">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          ORG_ADMIN personal access token
        </span>
        <input
          type="password"
          value={pat}
          onChange={(event) => setPat(event.target.value)}
          autoComplete="off"
          placeholder="Paste PAT — not stored"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-950"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canSubmit || busy}
          onClick={() => void runImport(true)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {busy ? "Working…" : "Preview import (all 3)"}
        </button>
        <button
          type="button"
          disabled={!canSubmit || busy}
          onClick={() => void runImport(false)}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Working…" : "Run import (all 3)"}
        </button>
      </div>

      {lastPreviewOk && results ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-300">
          Preview completed — review results below, then click{" "}
          <strong>Run import (all 3)</strong> to apply.
        </p>
      ) : null}

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {results ? (
        <div className="space-y-2 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
          <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
            Import job results
          </p>
          <ul className="space-y-2 text-xs">
            {results.map((result) => {
              const label =
                platforms.find((p) => p.connectorSlug === result.connectorSlug)
                  ?.label ?? result.connectorSlug;

              return (
                <li
                  key={result.connectorSlug}
                  className="rounded border border-zinc-100 p-2 dark:border-zinc-800"
                >
                  <span className="font-medium">{label}</span> — {result.status}
                  {result.preview ? " (preview)" : ""}
                  <span className="mt-1 block font-mono text-[10px] text-zinc-500">
                    job {result.jobId}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function PostImportSteps({
  platforms,
}: {
  platforms: PlatformStatus[];
}) {
  return (
    <>
      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-semibold text-amber-950 dark:bg-amber-900 dark:text-amber-100">
          3
        </span>
        <div>
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            Test each source
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            <strong>Admin → Connections → Sources</strong> — test connection on
            each imported source (
            <code className="text-xs">/api/health</code>).
          </p>
        </div>
      </li>

      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-semibold text-amber-950 dark:bg-amber-900 dark:text-amber-100">
          4
        </span>
        <div>
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            Link sources in AgentForge
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Open{" "}
            <Link
              href="/demo"
              className="font-medium text-indigo-700 underline underline-offset-2 dark:text-indigo-300"
            >
              Demo
            </Link>{" "}
            → <strong>ISC tenant connection</strong> (tenant + OAuth client) →{" "}
            <strong>ISC sources</strong> (paste IDs, verify MIS schemas:{" "}
            {platforms.map((p) => p.misSchemaDefault).join(", ")}).
          </p>
        </div>
      </li>
    </>
  );
}

export function GoldenSpConfigPanel() {
  const [status, setStatus] = useState<PackageStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [importMethod, setImportMethod] = useState<ImportMethod>("config-hub");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/setup/isc-sp-config");
        if (!response.ok) {
          throw new Error("Could not load ISC bootstrap package status");
        }
        const data = (await response.json()) as PackageStatus & {
          vscodeExtensionUrl?: string;
        };
        if (!cancelled) {
          setStatus({
            ...data,
            vscodeExtensionUrl:
              data.vscodeExtensionUrl ??
              "https://marketplace.visualstudio.com/items?itemName=yannick-beot-sp.vscode-sailpoint-identitynow",
          });
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load package status",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id="golden-sp-config"
      className="rounded-lg border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-900/60 dark:bg-amber-950/20"
    >
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Prep your ISC tenant (recommended)
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Import three Web Services sources with your AgentForge URL already
          wired in. Choose Configuration Hub or API import below.
        </p>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading bootstrap package…</p>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {status ? (
        <>
          <p className="mt-3 rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
            Base URL in packages: {status.baseUrl}
          </p>

          {!status.allAvailable ? (
            <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
              Golden packages are not published in this deployment yet.
            </p>
          ) : null}

          <ol className="mt-4 space-y-4 text-sm">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-semibold text-amber-950 dark:bg-amber-900 dark:text-amber-100">
                1
              </span>
              <DownloadPackages platforms={status.platforms} />
            </li>

            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-semibold text-amber-950 dark:bg-amber-900 dark:text-amber-100">
                2
              </span>
              <div className="min-w-0 flex-1 space-y-3">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Choose how to import into your target tenant
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMethod("config-hub")}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                      importMethod === "config-hub"
                        ? "border-indigo-400 bg-indigo-100 text-indigo-950 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-100"
                        : "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                  >
                    Option 1 — Configuration Hub
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMethod("api")}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                      importMethod === "api"
                        ? "border-indigo-400 bg-indigo-100 text-indigo-950 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-100"
                        : "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                  >
                    Option 2 — API import (ORG_ADMIN PAT)
                  </button>
                </div>

                <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
                  {importMethod === "config-hub" ? (
                    <ConfigHubImportSteps
                      importGuideUrl={status.importGuideUrl}
                    />
                  ) : (
                    <ApiImportPanel
                      allAvailable={status.allAvailable}
                      platforms={status.platforms}
                    />
                  )}
                </div>
              </div>
            </li>

            <PostImportSteps platforms={status.platforms} />
          </ol>

          <details className="mt-4 rounded-md border border-zinc-200 bg-white p-3 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
            <summary className="cursor-pointer font-medium text-zinc-800 dark:text-zinc-200">
              Expected ISC source names after import
            </summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {status.platforms.map((platform) => (
                <li key={platform.id}>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {platform.label}:
                  </span>{" "}
                  {platform.suggestedSourceName}
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : null}
    </section>
  );
}
