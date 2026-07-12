"use client";

import { IscCredentialsPanel } from "@/components/IscCredentialsPanel";
import { IscSourceIdsPanel } from "@/components/IscSourceIdsPanel";

interface IscSourceSettingsPanelProps {
  credentialsConfigured: boolean;
  tenant: string | null;
  apiBaseUrl?: string | null;
  credentialSource?: "ui" | "env" | "session" | null;
  onSourcesChange?: () => void;
  onCredentialsChange?: () => void;
  /** credentials = Connect only; sources = after import; all = legacy combined view */
  mode?: "credentials" | "sources" | "all";
}

export function IscSourceSettingsPanel({
  credentialsConfigured,
  tenant,
  apiBaseUrl,
  credentialSource,
  onSourcesChange,
  onCredentialsChange,
  mode = "all",
}: IscSourceSettingsPanelProps) {
  if (mode === "credentials") {
    return (
      <IscCredentialsPanel
        onCredentialsChange={() => {
          onCredentialsChange?.();
          onSourcesChange?.();
        }}
      />
    );
  }

  if (mode === "sources") {
    return (
      <IscSourceIdsPanel
        credentialsConfigured={credentialsConfigured}
        tenant={tenant}
        apiBaseUrl={apiBaseUrl}
        credentialSource={credentialSource}
        onSourcesChange={onSourcesChange}
      />
    );
  }

  return (
    <div className="space-y-4">
      <IscCredentialsPanel
        onCredentialsChange={() => {
          onCredentialsChange?.();
          onSourcesChange?.();
        }}
      />
      <IscSourceIdsPanel
        credentialsConfigured={credentialsConfigured}
        tenant={tenant}
        apiBaseUrl={apiBaseUrl}
        credentialSource={credentialSource}
        onSourcesChange={onSourcesChange}
      />
    </div>
  );
}
