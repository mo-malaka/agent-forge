import {
  getProviderConnectorUrl,
  getWebServicesAccountUrl,
} from "@/lib/url";

import {
  DEPLOYMENT_PROVIDERS,
  type DeploymentConfig,
  type DeploymentProvider,
} from "./profiles";

import type { AgentRow } from "@/lib/db/schema";

export interface ResolvedDeployment {
  provider: DeploymentProvider;
  provider_label: string;
  cloud: "aws" | "gcp" | "azure";
  infrastructure: string;
  web_services_endpoint: string;
  reference_api: string;
  native_status: string;
  resource_id: string;
  resource_arn?: string;
  resource_name?: string;
  region?: string;
  location?: string;
  config: DeploymentConfig;
}

function parseConfig(value: string | undefined): DeploymentConfig {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

export function resolveDeploymentProvider(
  value: string | undefined,
): DeploymentProvider {
  if (value && value in DEPLOYMENT_PROVIDERS) {
    return value as DeploymentProvider;
  }

  return "aws_bedrock";
}

export function mergeDeploymentConfig(
  provider: DeploymentProvider,
  overrides: DeploymentConfig = {},
): DeploymentConfig {
  return {
    ...DEPLOYMENT_PROVIDERS[provider].defaultConfig,
    ...overrides,
  };
}

export function buildDeployment(row: AgentRow, baseUrl: string): ResolvedDeployment {
  const provider = resolveDeploymentProvider(row.deploymentProvider);
  const profile = DEPLOYMENT_PROVIDERS[provider];
  const config = mergeDeploymentConfig(provider, parseConfig(row.deploymentConfig));
  const base = {
    provider,
    provider_label: profile.label,
    cloud: profile.cloud,
    infrastructure: profile.infrastructure,
    web_services_endpoint: getWebServicesAccountUrl(profile.connectorSlug, baseUrl),
    reference_api: getProviderConnectorUrl(profile.connectorSlug, baseUrl),
  };

  if (provider === "aws_bedrock") {
    const region = config.region ?? "us-east-1";
    const accountId = config.account_id ?? "123456789012";
    const arn = `arn:aws:bedrock:${region}:${accountId}:agent/${row.id}`;

    return {
      ...base,
      native_status: row.status === "active" ? profile.nativeStatusActive : "FAILED",
      resource_id: arn,
      resource_arn: arn,
      region,
      config,
    };
  }

  if (provider === "gcp_vertex") {
    const projectId = config.project_id ?? "demo-ai-governance";
    const location = config.location ?? "us-central1";
    const resourceName = `projects/${projectId}/locations/${location}/agents/${row.id}`;

    return {
      ...base,
      native_status: row.status === "active" ? profile.nativeStatusActive : "DELETED",
      resource_id: resourceName,
      resource_name: resourceName,
      location,
      config,
    };
  }

  const subscriptionId =
    config.subscription_id ?? "00000000-0000-0000-0000-000000000001";
  const resourceGroup = config.resource_group ?? "rg-ai-agents";
  const workspace = config.workspace ?? "foundry-demo";
  const location = config.location ?? "eastus";
  const resourceId = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.CognitiveServices/accounts/${workspace}/agents/${row.id}`;

  return {
    ...base,
    native_status:
      row.status === "active" ? profile.nativeStatusActive : "Failed",
    resource_id: resourceId,
    resource_name: row.name,
    location,
    config,
  };
}

export function normalizeAgentRow(row: AgentRow): AgentRow {
  const provider = resolveDeploymentProvider(row.deploymentProvider);

  return {
    ...row,
    deploymentProvider: provider,
    deploymentConfig: JSON.stringify(
      mergeDeploymentConfig(provider, parseConfig(row.deploymentConfig)),
    ),
    inboundAccess: row.inboundAccess ?? "[]",
  };
}
