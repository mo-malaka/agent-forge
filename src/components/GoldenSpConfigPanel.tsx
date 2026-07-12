"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { IscOrgAdminPatGuide } from "@/components/IscOrgAdminPatGuide";
import {
  CONNECTOR_SLUG_TO_PROVIDER,
  type ConnectorSlug,
  loadIscBootstrapPrefill,
  resolveBootstrapClientSecret,
} from "@/lib/isc/bootstrap-prefill";
import {
  hasIscSessionCache,
  saveIscSessionCache,
  withIscRuntimeBody,
  withIscRuntimeHeaders,
} from "@/lib/isc/session-cache";
import { DEPLOYMENT_PROVIDERS } from "@/lib/providers/profiles";

interface PlatformStatus {
  id: string;
  label: string;
  connectorSlug: string;
  suggestedSourceName: string;
  misSchemaDefault: string;
  available: boolean;
  privilegeGoldenAvailable: boolean;
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

interface PrivilegeApplyResult {
  connectorSlug: string;
  ok: boolean;
  message: string;
}

export interface IscConnectionContext {
  credentialsConfigured: boolean;
  tenant: string | null;
  domain?: string | null;
}

function PrivilegeClassificationApplyPanel({
  platforms,
  connection,
  onApplied,
}: {
  platforms: PlatformStatus[];
  connection?: IscConnectionContext;
  onApplied?: () => void;
}) {
  const [tenant, setTenant] = useState("");
  const [domain, setDomain] = useState("identitynow-demo.com");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [sourceIds, setSourceIds] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PrivilegeApplyResult[] | null>(null);

  const eligible = platforms.filter((p) => p.privilegeGoldenAvailable);
  const anyGolden = eligible.length > 0;

  useEffect(() => {
    let cancelled = false;
    const slugs = platforms
      .filter((p) => p.privilegeGoldenAvailable)
      .map((p) => p.connectorSlug as ConnectorSlug);

    void loadIscBootstrapPrefill(slugs).then((prefill) => {
      if (cancelled) {
        return;
      }
      if (prefill.tenant) {
        setTenant(prefill.tenant);
      }
      if (prefill.domain) {
        setDomain(prefill.domain);
      }
      if (prefill.clientId) {
        setClientId(prefill.clientId);
      }
      if (Object.keys(prefill.sourceIds).length > 0) {
        setSourceIds((current) => ({ ...current, ...prefill.sourceIds }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [platforms]);

  const usingSavedConnection =
    Boolean(connection?.credentialsConfigured && connection.tenant?.trim()) ||
    hasIscSessionCache();

  async function runApply() {
    setBusy(true);
    setError(null);
    setResults(null);

    const applied: PrivilegeApplyResult[] = [];

    try {
      const resolvedSecret = resolveBootstrapClientSecret(clientSecret);

      for (const platform of eligible) {
        const sourceId = sourceIds[platform.connectorSlug]?.trim();
        if (!sourceId) {
          continue;
        }

        try {
          const response = await fetch(
            "/api/setup/isc-sp-config/apply-privilege-classification",
            {
              method: "POST",
              headers: withIscRuntimeHeaders({
                "Content-Type": "application/json",
              }),
              body: JSON.stringify(
                withIscRuntimeBody({
                  ...(tenant.trim() ? { tenant } : {}),
                  ...(domain.trim() ? { domain: domain.trim() } : {}),
                  ...(!usingSavedConnection
                    ? {
                        client_id: clientId,
                        client_secret: resolvedSecret,
                      }
                    : {}),
                  connector_slug: platform.connectorSlug,
                  source_id: sourceId,
                }),
              ),
            },
          );

          let body: { error?: string; message?: string } = {};
          try {
            body = (await response.json()) as { error?: string; message?: string };
          } catch {
            body = { error: `AgentForge API error (${response.status})` };
          }

          applied.push({
            connectorSlug: platform.connectorSlug,
            ok: response.ok,
            message: response.ok
              ? (body.message ?? "Applied")
              : (body.error ?? "Apply failed"),
          });
        } catch (fetchError) {
          applied.push({
            connectorSlug: platform.connectorSlug,
            ok: false,
            message:
              fetchError instanceof Error
                ? fetchError.message
                : "Network error calling AgentForge",
          });
        }
      }

      if (applied.length === 0) {
        throw new Error("Enter at least one ISC source ID to apply.");
      }

      if (applied.every((row) => row.ok)) {
        const sources = {
          aws_bedrock: "",
          gcp_vertex: "",
          azure_ai_foundry: "",
        };
        for (const platform of eligible) {
          const sourceId = sourceIds[platform.connectorSlug]?.trim();
          if (!sourceId) {
            continue;
          }
          const provider =
            CONNECTOR_SLUG_TO_PROVIDER[platform.connectorSlug as ConnectorSlug];
          sources[provider] = sourceId;
        }

        saveIscSessionCache({
          tenant: tenant.trim(),
          domain: domain.trim() || "identitynow-demo.com",
          client_id: clientId.trim(),
          client_secret: resolvedSecret,
          sources,
        });

        await fetch("/api/isc/sources", {
          method: "PUT",
          headers: withIscRuntimeHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            sources,
            mis_schemas: {
              aws_bedrock: DEPLOYMENT_PROVIDERS.aws_bedrock.misSchemaId,
              gcp_vertex: DEPLOYMENT_PROVIDERS.gcp_vertex.misSchemaId,
              azure_ai_foundry:
                DEPLOYMENT_PROVIDERS.azure_ai_foundry.misSchemaId,
            },
          }),
        });

        onApplied?.();
      }

      setResults(applied);
    } catch (applyError) {
      setError(
        applyError instanceof Error ? applyError.message : "Apply request failed",
      );
    } finally {
      setBusy(false);
    }
  }

  const canApply = usingSavedConnection
    ? eligible.some((p) => sourceIds[p.connectorSlug]?.trim())
    : tenant.trim() &&
      clientId.trim() &&
      (clientSecret.trim().length >= 8 ||
        Boolean(resolveBootstrapClientSecret(""))) &&
      eligible.some((p) => sourceIds[p.connectorSlug]?.trim());

  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium text-zinc-900 dark:text-zinc-100">
          Step 3 — Apply privilege classification
        </p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          <strong>Required for Identity Graph rings.</strong> SP-Config import
          (Step 2) creates sources only — it does <em>not</em> copy privilege
          classification. Copy source IDs from{" "}
          <strong>Admin → Connections → Sources</strong> after import. Uses
          tenant and API client from <strong>Connect</strong> when saved.
        </p>
      </div>

      {usingSavedConnection ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          Using Client ID &amp; secret from <strong>Connect</strong>
          {connection?.tenant ? (
            <>
              {" "}
              (<span className="font-mono">{connection.tenant}</span>
              {connection.domain ? ` · ${connection.domain}` : null})
            </>
          ) : null}
          . No need to re-enter credentials here.
        </p>
      ) : null}

      {!anyGolden ? (
        <p className="text-xs text-amber-800 dark:text-amber-200">
          Golden privilege files are not published in this deployment. Maintainer
          must commit{" "}
          <code className="text-[10px]">
            config/isc/golden/privilege-classification.*.json
          </code>{" "}
          and redeploy.
        </p>
      ) : null}

      {!usingSavedConnection ? (
        <>
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Save tenant, Client ID, and secret in <strong>Connect</strong> first
            — then return here. Or enter them below if you have not connected
            yet.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                Target tenant slug
              </span>
              <input
                type="text"
                value={tenant}
                onChange={(event) => setTenant(event.target.value)}
                placeholder="company23447-poc"
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
                placeholder="identitynow-demo.com"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="block text-xs">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                Client ID
              </span>
              <input
                type="text"
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                autoComplete="off"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="block text-xs">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                Client secret
              </span>
              <input
                type="password"
                value={clientSecret}
                onChange={(event) => setClientSecret(event.target.value)}
                autoComplete="off"
                placeholder="From Preferences → Personal Access Tokens"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
          </div>
        </>
      ) : null}

      {eligible.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {eligible.map((platform) => (
            <label key={platform.connectorSlug} className="block text-xs">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {platform.label} source ID (target tenant)
              </span>
              <input
                type="text"
                value={sourceIds[platform.connectorSlug] ?? ""}
                onChange={(event) =>
                  setSourceIds((current) => ({
                    ...current,
                    [platform.connectorSlug]: event.target.value,
                  }))
                }
                placeholder="32-char id from Connections → Sources"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        disabled={!canApply || busy || !anyGolden}
        onClick={() => void runApply()}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Applying…" : "Apply privilege classification"}
      </button>

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {results ? (
        <ul className="space-y-1 text-xs">
          {results.map((result) => {
            const label =
              platforms.find((p) => p.connectorSlug === result.connectorSlug)
                ?.label ?? result.connectorSlug;

            return (
              <li
                key={result.connectorSlug}
                className={
                  result.ok
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-red-600 dark:text-red-400"
                }
              >
                {label}: {result.message}
              </li>
            );
          })}
        </ul>
      ) : null}

      <p className="text-xs text-zinc-500">
        After apply succeeds, re-run <strong>outboundPermissions</strong> and{" "}
        <strong>inboundCallers</strong> entitlement aggregation on each source in
        ISC.
      </p>
    </div>
  );
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
        <li>
          Continue in AgentForge <strong>Step 3</strong> below — apply privilege
          classification (required for Identity Graph rings). Configuration Hub
          does not copy those settings.
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
  connection,
}: {
  allAvailable: boolean;
  platforms: PlatformStatus[];
  connection?: IscConnectionContext;
}) {
  const [tenant, setTenant] = useState("");
  const [domain, setDomain] = useState("identitynow.com");
  const [pat, setPat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [lastPreviewOk, setLastPreviewOk] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void loadIscBootstrapPrefill(
      platforms.map((p) => p.connectorSlug as ConnectorSlug),
    ).then((prefill) => {
      if (cancelled) {
        return;
      }
      if (prefill.tenant) {
        setTenant(prefill.tenant);
      }
      if (prefill.domain) {
        setDomain(prefill.domain);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [platforms]);

  useEffect(() => {
    if (connection?.tenant?.trim()) {
      setTenant(connection.tenant.trim());
    }
    if (connection?.domain?.trim()) {
      setDomain(connection.domain.trim());
    }
  }, [connection?.tenant, connection?.domain]);

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
  const usingSavedTenant = Boolean(connection?.tenant?.trim());

  return (
    <div className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
      <div>
        <p className="font-medium text-zinc-900 dark:text-zinc-100">
          Option 2 — Import from AgentForge (SP-Config API)
        </p>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          AgentForge calls{" "}
          <code className="text-[11px]">POST /beta/sp-config/import</code> on
          your target tenant. This is separate from Connect — paste a one-time
          ORG_ADMIN access token below (not saved).
        </p>
      </div>

      <IscOrgAdminPatGuide defaultOpen={false} />

      {usingSavedTenant ? (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          Target tenant:{" "}
          <span className="font-mono font-medium">{connection?.tenant}</span>
          {connection?.domain ? ` · ${connection.domain}` : null} (from Connect)
        </p>
      ) : (
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
      )}

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

      {results && !lastPreviewOk ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          Import completed. Scroll to{" "}
          <a
            href="#privilege-classification"
            className="font-semibold underline underline-offset-2"
          >
            Step 3 — Apply privilege classification
          </a>{" "}
          (required for Identity Graph rings).
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

function PostImportSteps({ embedded = false }: { embedded?: boolean }) {
  return (
    <>
      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-semibold text-amber-950 dark:bg-amber-900 dark:text-amber-100">
          4
        </span>
        <div>
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            Test sources &amp; clean up entitlement types
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            <strong>Admin → Connections → Sources</strong> — test connection on
            each source. If you see an unused default{" "}
            <strong>group</strong> entitlement type with an empty schema, delete
            it under <strong>Entitlement Management → Entitlement Types</strong>{" "}
            — golden import uses <code className="text-xs">outboundPermissions</code>{" "}
            and <code className="text-xs">inboundCallers</code> only.
          </p>
        </div>
      </li>

      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-semibold text-amber-950 dark:bg-amber-900 dark:text-amber-100">
          5
        </span>
        <div>
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            {embedded ? "Continue to Run demo" : "Continue on Demo"}
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {embedded ? (
              <>
                Register source IDs in <strong>Run demo</strong> below (or enter
                them here for privilege apply). Then start with step 1 (prepare
                agents).
              </>
            ) : (
              <>
                Open{" "}
                <Link
                  href="/demo"
                  className="font-medium text-indigo-700 underline underline-offset-2 dark:text-indigo-300"
                >
                  Demo
                </Link>{" "}
                — tenant and source IDs from Step 3 carry over when saved in this
                browser session.
              </>
            )}
          </p>
        </div>
      </li>
    </>
  );
}

export function GoldenSpConfigPanel({
  embedded = false,
  connection,
  onBootstrapAction,
}: {
  embedded?: boolean;
  connection?: IscConnectionContext;
  onBootstrapAction?: () => void;
}) {
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
      id="bootstrap"
      className={
        embedded
          ? "space-y-4"
          : "rounded-lg border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-900/60 dark:bg-amber-950/20"
      }
    >
      {!embedded ? (
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Prep your ISC tenant (recommended)
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Import three Web Services sources with your AgentForge URL already
            wired in, then complete <strong>Step 3</strong> for privilege
            classification (Identity Graph rings). Steps 1–2 create sources only.
          </p>
        </div>
      ) : null}

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
                      connection={connection}
                    />
                  )}
                </div>
              </div>
            </li>

            <li className="flex gap-3" id="privilege-classification">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-200 text-xs font-semibold text-indigo-950 dark:bg-indigo-900 dark:text-indigo-100">
                3
              </span>
              <div className="min-w-0 flex-1 rounded-md border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                <PrivilegeClassificationApplyPanel
                  platforms={status.platforms}
                  connection={connection}
                  onApplied={onBootstrapAction}
                />
              </div>
            </li>

            <PostImportSteps embedded={embedded} />
          </ol>
        </>
      ) : null}
    </section>
  );
}
