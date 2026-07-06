"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DEPLOYMENT_PROVIDERS,
  DEPLOYMENT_PROVIDER_VALUES,
  type DeploymentProvider,
} from "@/lib/providers/profiles";

type SourceMap = Record<DeploymentProvider, string>;

type VerifyState = Partial<
  Record<DeploymentProvider, { ok: boolean; message: string }>
>;

interface IscSourceSettingsPanelProps {
  credentialsConfigured: boolean;
  tenant: string | null;
  onSourcesChange?: () => void;
}

export function IscSourceSettingsPanel({
  credentialsConfigured,
  tenant,
  onSourcesChange,
}: IscSourceSettingsPanelProps) {
  const [sources, setSources] = useState<SourceMap>({
    aws_bedrock: "",
    gcp_vertex: "",
    azure_ai_foundry: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState<DeploymentProvider | null>(null);
  const [verifyState, setVerifyState] = useState<VerifyState>({});
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/isc/sources");
      const body = (await response.json()) as {
        sources?: SourceMap;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to load ISC sources");
      }

      setSources({
        aws_bedrock: body.sources?.aws_bedrock ?? "",
        gcp_vertex: body.sources?.gcp_vertex ?? "",
        azure_ai_foundry: body.sources?.azure_ai_foundry ?? "",
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load ISC sources",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  async function saveSources() {
    setSaving(true);
    setError(null);
    setSavedMessage(null);

    try {
      const response = await fetch("/api/isc/sources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save ISC sources");
      }

      setSavedMessage("Source IDs saved.");
      onSourcesChange?.();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save",
      );
    } finally {
      setSaving(false);
    }
  }

  async function verifySource(provider: DeploymentProvider) {
    setVerifying(provider);
    setError(null);

    try {
      const response = await fetch("/api/isc/sources/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          source_id: sources[provider],
        }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };

      setVerifyState((current) => ({
        ...current,
        [provider]: {
          ok: body.ok === true,
          message: body.message ?? body.error ?? "Verification failed",
        },
      }));
    } catch (verifyError) {
      setVerifyState((current) => ({
        ...current,
        [provider]: {
          ok: false,
          message:
            verifyError instanceof Error
              ? verifyError.message
              : "Verification failed",
        },
      }));
    } finally {
      setVerifying(null);
    }
  }

  if (!credentialsConfigured) {
    return (
      <section className="rounded-md border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <p className="font-medium">ISC credentials required</p>
        <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
          Set <span className="font-mono">ISC_TENANT</span>,{" "}
          <span className="font-mono">ISC_CLIENT_ID</span>, and{" "}
          <span className="font-mono">ISC_CLIENT_SECRET</span> on the server
          (Amplify env). Source IDs are configured here — no redeploy when
          switching platforms.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          ISC sources
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          One Web Services source ID per platform on tenant{" "}
          <span className="font-mono">{tenant}</span>. Saved in AgentForge —
          switch platforms in the demo without redeploying.
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-zinc-500">Loading source settings...</p>
      ) : (
        <div className="space-y-3">
          {DEPLOYMENT_PROVIDER_VALUES.map((provider) => {
            const verify = verifyState[provider];
            return (
              <div
                key={provider}
                className="space-y-1.5 rounded-md border border-zinc-200 p-3 dark:border-zinc-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {DEPLOYMENT_PROVIDERS[provider].label}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    MIS schema:{" "}
                    <span className="font-mono">
                      {DEPLOYMENT_PROVIDERS[provider].misSchemaId}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={sources[provider]}
                    onChange={(event) =>
                      setSources((current) => ({
                        ...current,
                        [provider]: event.target.value,
                      }))
                    }
                    placeholder="ISC source ID"
                    className="min-w-[12rem] flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <button
                    type="button"
                    onClick={() => void verifySource(provider)}
                    disabled={!sources[provider].trim() || verifying !== null}
                    className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    {verifying === provider ? "Verifying..." : "Verify"}
                  </button>
                </div>
                {verify ? (
                  <p
                    className={`text-xs ${
                      verify.ok
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    {verify.message}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void saveSources()}
          disabled={saving || loading}
          className="rounded-md bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? "Saving..." : "Save source IDs"}
        </button>
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
