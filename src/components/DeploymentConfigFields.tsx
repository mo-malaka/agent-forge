"use client";

import {
  DEPLOYMENT_PROVIDERS,
  type DeploymentProvider,
} from "@/lib/providers/profiles";
import type { DeploymentConfigInput } from "@/types/agent";

interface DeploymentConfigFieldsProps {
  provider: DeploymentProvider;
  config: DeploymentConfigInput;
  onChange: (config: DeploymentConfigInput) => void;
}

export function DeploymentConfigFields({
  provider,
  config,
  onChange,
}: DeploymentConfigFieldsProps) {
  const defaults = DEPLOYMENT_PROVIDERS[provider].defaultConfig as Record<
    string,
    string
  >;

  function updateField(key: keyof DeploymentConfigInput, value: string) {
    onChange({ ...config, [key]: value });
  }

  if (provider === "aws_bedrock") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="AWS Region"
          value={config.region ?? defaults.region}
          onChange={(value) => updateField("region", value)}
          placeholder="us-east-1"
        />
        <Field
          label="Account ID"
          value={config.account_id ?? defaults.account_id}
          onChange={(value) => updateField("account_id", value)}
          placeholder="123456789012"
        />
        <Field
          label="Foundation Model"
          value={config.foundation_model ?? defaults.foundation_model}
          onChange={(value) => updateField("foundation_model", value)}
          className="sm:col-span-2"
        />
        <Field
          label="Agent Alias"
          value={config.agent_alias ?? defaults.agent_alias}
          onChange={(value) => updateField("agent_alias", value)}
        />
      </div>
    );
  }

  if (provider === "gcp_vertex") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="GCP Project ID"
          value={config.project_id ?? defaults.project_id}
          onChange={(value) => updateField("project_id", value)}
        />
        <Field
          label="Location"
          value={config.location ?? defaults.location}
          onChange={(value) => updateField("location", value)}
          placeholder="us-central1"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field
        label="Subscription ID"
        value={config.subscription_id ?? defaults.subscription_id}
        onChange={(value) => updateField("subscription_id", value)}
        className="sm:col-span-2"
      />
      <Field
        label="Resource Group"
        value={config.resource_group ?? defaults.resource_group}
        onChange={(value) => updateField("resource_group", value)}
      />
      <Field
        label="AI Foundry Workspace"
        value={config.workspace ?? defaults.workspace}
        onChange={(value) => updateField("workspace", value)}
      />
      <Field
        label="Azure Region"
        value={config.location ?? defaults.location}
        onChange={(value) => updateField("location", value)}
        placeholder="eastus"
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      />
    </div>
  );
}
