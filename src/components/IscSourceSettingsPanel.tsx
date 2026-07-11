"use client";

import { useCallback, useEffect, useState } from "react";

import { IscCredentialsPanel } from "@/components/IscCredentialsPanel";
import {
  DEPLOYMENT_PROVIDERS,
  DEPLOYMENT_PROVIDER_VALUES,
  type DeploymentProvider,
} from "@/lib/providers/profiles";

type SourceMap = Record<DeploymentProvider, string>;
type MisSchemaMap = Record<DeploymentProvider, string>;

type VerifyState = Partial<
  Record<DeploymentProvider, { ok: boolean; message: string }>
>;

interface IscSourceSettingsPanelProps {
  credentialsConfigured: boolean;
  tenant: string | null;
  onSourcesChange?: () => void;
  onCredentialsChange?: () => void;
}

export function IscSourceSettingsPanel({
  credentialsConfigured,
  tenant,
  onSourcesChange,
  onCredentialsChange,
}: IscSourceSettingsPanelProps) {
  const [sources, setSources] = useState<SourceMap>({
    aws_bedrock: "",
    gcp_vertex: "",
    azure_ai_foundry: "",
  });
  const [misSchemas, setMisSchemas] = useState<MisSchemaMap>({
    aws_bedrock: DEPLOYMENT_PROVIDERS.aws_bedrock.misSchemaId,
    gcp_vertex: DEPLOYMENT_PROVIDERS.gcp_vertex.misSchemaId,
    azure_ai_foundry: DEPLOYMENT_PROVIDERS.azure_ai_foundry.misSchemaId,
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
        misSchemas?: MisSchemaMap;
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
      setMisSchemas({
        aws_bedrock:
          body.misSchemas?.aws_bedrock ??
          DEPLOYMENT_PROVIDERS.aws_bedrock.misSchemaId,
        gcp_vertex:
          body.misSchemas?.gcp_vertex ??
          DEPLOYMENT_PROVIDERS.gcp_vertex.misSchemaId,
        azure_ai_foundry:
          body.misSchemas?.azure_ai_foundry ??
          DEPLOYMENT_PROVIDERS.azure_ai_foundry.misSchemaId,
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
        body: JSON.stringify({ sources, mis_schemas: misSchemas }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save ISC sources");
      }

      setSavedMessage("Source settings saved.");
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
    if (!credentialsConfigured) {
      setError("Save ISC tenant connection credentials before verifying sources.");
      return;
    }

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

  return (
    <div className="space-y-4">
      <IscCredentialsPanel
        onCredentialsChange={() => {
          onCredentialsChange?.();
          onSourcesChange?.();
        }}
      />

      <section className="space-y-3 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            ISC sources
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Paste one Web Services source ID per platform
            {tenant ? (
              <>
                {" "}
                on tenant <span className="font-mono">{tenant}</span>
              </>
            ) : (
              " after saving tenant connection above"
            )}
            . Copy IDs from{" "}
            <strong>Admin → Connections → Sources</strong> in ISC.
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
                        placeholder="ISC source ID"
                        className="min-w-[12rem] flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <button
                        type="button"
                        onClick={() => void verifySource(provider)}
                        disabled={
                          !sources[provider].trim() ||
                          verifying !== null ||
                          !credentialsConfigured
                        }
                        className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                      >
                        {verifying === provider ? "Verifying..." : "Verify"}
                      </button>
                    </div>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] text-zinc-500">
                      Machine identity schema
                    </span>
                    <input
                      value={misSchemas[provider]}
                      onChange={(event) =>
                        setMisSchemas((current) => ({
                          ...current,
                          [provider]: event.target.value,
                        }))
                      }
                      placeholder={DEPLOYMENT_PROVIDERS[provider].misSchemaId}
                      className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
                    />
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
            disabled={saving || loading}
            className="rounded-md bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {saving ? "Saving..." : "Save source settings"}
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
    </div>
  );
}
