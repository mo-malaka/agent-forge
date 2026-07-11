"use client";

import { useCallback, useEffect, useState } from "react";

interface CredentialsView {
  configured: boolean;
  tenant: string | null;
  clientId: string | null;
  clientSecretSet: boolean;
  apiVersion: string;
  domain: string;
  source: "ui" | "env" | null;
}

interface IscCredentialsPanelProps {
  onCredentialsChange?: () => void;
}

export function IscCredentialsPanel({
  onCredentialsChange,
}: IscCredentialsPanelProps) {
  const [view, setView] = useState<CredentialsView | null>(null);
  const [tenant, setTenant] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [apiVersion, setApiVersion] = useState("v2026");
  const [domain, setDomain] = useState("identitynow.com");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const loadCredentials = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/isc/credentials");
      const body = (await response.json()) as CredentialsView & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to load ISC credentials");
      }

      setView(body);
      setTenant(body.tenant ?? "");
      setClientId(body.clientId ?? "");
      setApiVersion(body.apiVersion ?? "v2026");
      setDomain(body.domain ?? "identitynow.com");
      setClientSecret("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load ISC credentials",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCredentials();
  }, [loadCredentials]);

  async function saveCredentials() {
    setSaving(true);
    setError(null);
    setSavedMessage(null);

    try {
      const response = await fetch("/api/isc/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant,
          client_id: clientId,
          client_secret: clientSecret.trim() || undefined,
          api_version: apiVersion,
          domain,
        }),
      });

      const body = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save ISC credentials");
      }

      setSavedMessage(body.message ?? "ISC credentials saved.");
      setClientSecret("");
      await loadCredentials();
      onCredentialsChange?.();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          ISC tenant connection
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Connect AgentForge to your target ISC tenant using an OAuth API client.
          Saved on the server — no Amplify redeploy required.
        </p>
      </div>

      <details className="rounded-md border border-indigo-200 bg-indigo-50/50 p-3 text-xs text-zinc-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-zinc-300">
        <summary className="cursor-pointer font-medium text-zinc-900 dark:text-zinc-100">
          How to create the API client in ISC
        </summary>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-relaxed">
          <li>
            In your <strong>target</strong> tenant:{" "}
            <strong>Admin → Connections → API Management</strong> (or{" "}
            <strong>OAuth Clients</strong>).
          </li>
          <li>Create a client with grant type <strong>Client Credentials</strong>.</li>
          <li>
            Add scopes for the demo orchestrator, e.g.{" "}
            <code className="text-[11px]">idn:sources:read</code>,{" "}
            <code className="text-[11px]">idn:sources:manage</code>,{" "}
            <code className="text-[11px]">idn:accounts:read</code>,{" "}
            <code className="text-[11px]">idn:entitlement:manage</code>,{" "}
            <code className="text-[11px]">idn:mis-agents:aggregate</code>,{" "}
            <code className="text-[11px]">idn:mis-account:read</code>.
          </li>
          <li>Copy the client ID and secret into the form below.</li>
        </ol>
      </details>

      {loading ? (
        <p className="text-xs text-zinc-500">Loading connection settings…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs sm:col-span-2">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              Tenant slug
            </span>
            <input
              value={tenant}
              onChange={(event) => setTenant(event.target.value)}
              placeholder="acme-demo"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="block text-xs sm:col-span-2">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              Client ID
            </span>
            <input
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="block text-xs sm:col-span-2">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              Client secret
            </span>
            <input
              type="password"
              value={clientSecret}
              onChange={(event) => setClientSecret(event.target.value)}
              placeholder={
                view?.clientSecretSet
                  ? "Leave blank to keep existing secret"
                  : "Paste client secret"
              }
              autoComplete="off"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="block text-xs">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              API version
            </span>
            <input
              value={apiVersion}
              onChange={(event) => setApiVersion(event.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="block text-xs">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              API domain
            </span>
            <input
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder="identitynow.com"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void saveCredentials()}
          disabled={saving || loading || !tenant.trim() || !clientId.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? "Verifying…" : "Save & verify connection"}
        </button>
        {view?.configured ? (
          <span className="text-xs text-emerald-700 dark:text-emerald-300">
            Connected
            {view.source === "env" ? " (from server env)" : ""}
          </span>
        ) : null}
        {savedMessage ? (
          <span className="text-xs text-emerald-700 dark:text-emerald-300">
            {savedMessage}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
      ) : null}
    </section>
  );
}
