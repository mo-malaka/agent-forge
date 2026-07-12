import type { DeploymentProvider } from "@/lib/providers/profiles";

export const DEMO_SETTINGS_STORAGE_KEY = "agentforge-demo-settings";

export type AdditionalAgentCount = 0 | 5 | 10 | 20;

export interface DemoSettingsSnapshot {
  provider: DeploymentProvider;
  additionalCount: AdditionalAgentCount;
}

const DEFAULT_SETTINGS: DemoSettingsSnapshot = {
  provider: "aws_bedrock",
  additionalCount: 0,
};

export function loadDemoSettings(): DemoSettingsSnapshot {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(DEMO_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<DemoSettingsSnapshot>;
    const additionalCount = parsed.additionalCount;
    const provider = parsed.provider;

    return {
      provider:
        provider === "gcp_vertex" ||
        provider === "azure_ai_foundry" ||
        provider === "aws_bedrock"
          ? provider
          : DEFAULT_SETTINGS.provider,
      additionalCount:
        additionalCount === 0 ||
        additionalCount === 5 ||
        additionalCount === 10 ||
        additionalCount === 20
          ? additionalCount
          : DEFAULT_SETTINGS.additionalCount,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveDemoSettings(settings: DemoSettingsSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(DEMO_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function describeAgentTotals(
  provider: DeploymentProvider,
  additionalCount: AdditionalAgentCount,
): string {
  const heroCount = 1;
  const platformTotal = heroCount + additionalCount;
  const platformLabel =
    provider === "aws_bedrock"
      ? "AWS Bedrock"
      : provider === "gcp_vertex"
        ? "Google Cloud Vertex AI"
        : "Microsoft Azure AI Foundry";

  if (additionalCount === 0) {
    return `Hero only on ${platformLabel} (1 seeded agent). Three heroes exist across platforms.`;
  }

  return `${platformLabel}: 1 hero + ${additionalCount} additional = ${platformTotal} agents in AgentForge.`;
}
