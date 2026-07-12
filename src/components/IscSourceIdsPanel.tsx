"use client";

import { useCallback, useEffect, useState } from "react";

import {
  hasIscSessionCache,
  loadIscSessionCache,
  saveIscSessionCache,
  withIscRuntimeBody,
} from "@/lib/isc/session-cache";
import {
  DEPLOYMENT_PROVIDERS,
  DEPLOYMENT_PROVIDER_VALUES,
  type DeploymentProvider,
} from "@/lib/providers/profiles";

type SourceMap = Record<DeploymentProvider, string>;

type VerifyState = Partial<
  Record<DeploymentProvider, { ok: boolean; message: string }>
>;

function defaultMisSchemas(): Record<DeploymentProvider, string> {
  return {
    aws_bedrock: DEPLOYMENT_PROVIDERS.aws_bedrock.misSchemaId,
    gcp_vertex: DEPLOYMENT_PROVIDERS.gcp_vertex.misSchemaId,
    azure_ai_foundry: DEPLOYMENT_PROVIDERS.azure_ai_foundry.misSchemaId,
  };
}

interface IscSourceIdsPanelProps {
  credentialsConfigured: boolean;
  tenant: string | null;
  apiBaseUrl?: string | null;
  credentialSource?: "ui" | "env" | "session" | null;
  onSourcesChange?: () => void;
}

export function IscSourceIdsPanel({
  credentialsConfigured,
  tenant,
  apiBaseUrl,
  credentialSource,
  onSourcesChange,
}: IscSourceIdsPanelProps) {
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

  const connectionReady = credentialsConfigured || hasIscSessionCache();

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

      const cached = loadIscSessionCache();

      setSources({
        aws_bedrock:
          body.sources?.aws_bedrock || cached?.sources.aws_bedrock || "",
        gcp_vertex: body.sources?.gcp_vertex || cached?.sources.gcp_vertex || "",
        azure_ai_foundry:
          body.sources?.azure_ai_foundry ||
          cached?.sources.azure_ai_foundry ||
          "",
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

  async function saveSources(options?: { quiet?: boolean }) {
    setSaving(true);
    if (!options?.quiet) {
      setError(null);
      setSavedMessage(null);
    }

    const misSchemas = defaultMisSchemas();

    try {
      const response = await fetch("/api/isc/sources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources, mis_schemas: misSchemas }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save ISC sources");
      }

      const cached = loadIscSessionCache();
      if (cached) {
        saveIscSessionCache({
          sources,
          mis_schemas: misSchemas,
        });
      }

      if (!options?.quiet) {
        setSavedMessage("Source IDs saved.");
      }
      onSourcesChange?.();
    } catch (saveError) {
      if (!options?.quiet) {
        setError(
          saveError instanceof Error ? saveError.message : "Failed to save",
        );
      } else {
        throw saveError;
      }
    } finally {
      setSaving(false);
    }
  }

  async function verifySource(provider: DeploymentProvider) {
    if (!connectionReady) {
      setError("Save ISC tenant credentials in Connect before verifying sources.");
      return;
    }

    if (!sources[provider].trim()) {
      setError(`Enter a source ID for ${DEPLOYMENT_PROVIDERS[provider].label}.`);
      return;
    }

    setVerifying(provider);
    setError(null);

    try {
      await saveSources({ quiet: true });

      const response = await fetch("/api/isc/sources/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          withIscRuntimeBody({
            provider,
            source_id: sources[provider],
          }),
        ),
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

  return (
    <section className="space-y-3 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Web Services source IDs
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Available after golden import — copy each source ID from{" "}
          <strong>Admin → Connections → Sources</strong>
          {tenant ? (
            <>
              {" "}
              on tenant <span className="font-mono">{tenant}</span>
            </>
          ) : null}
          . Machine identity schemas ({DEPLOYMENT_PROVIDERS.aws_bedrock.misSchemaId}
          , {DEPLOYMENT_PROVIDERS.gcp_vertex.misSchemaId},{" "}
          {DEPLOYMENT_PROVIDERS.azure_ai_foundry.misSchemaId}) are already in the
          golden packages.
        </p>
        {apiBaseUrl ? (
          <p className="mt-1 font-mono text-[10px] text-zinc-500">
            Verify calls: {apiBaseUrl}
            {credentialSource === "env" ? (
              <span className="text-amber-700 dark:text-amber-300">
                {" "}
                — using server env vars
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      {!connectionReady ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Complete <strong>Connect</strong> first — save tenant credentials before
          registering source IDs.
        </p>
      ) : null}

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
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {DEPLOYMENT_PROVIDERS[provider].label}
                </p>
                <label className="block space-y-1">
                  <span className="text-[11px] text-zinc-500">Source ID</span>
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={sources[provider]}
                      onChange={(event) =>
                        setSources((current) => ({
                          ...current,
                          [provider]: event.target.value,
                        }))
                      }
                      placeholder="From ISC after import"
                      disabled={!connectionReady}
                      className="min-w-[12rem] flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() => void verifySource(provider)}
                      disabled={
                        !sources[provider].trim() ||
                        verifying !== null ||
                        !connectionReady
                      }
                      className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                    >
                      {verifying === provider ? "Verifying..." : "Verify"}
                    </button>
                  </div>
                </label>
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
          disabled={saving || loading || !connectionReady}
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
