import fs from "fs";
import path from "path";

import {
  DEPLOYMENT_PROVIDER_VALUES,
  type DeploymentProvider,
} from "@/lib/providers/profiles";

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_PATH = path.join(DATA_DIR, "isc-settings.json");

export type IscPlatformSources = Record<DeploymentProvider, string>;

export interface IscSettingsFile {
  sources: IscPlatformSources;
  updatedAt: string;
}

function emptySources(): IscPlatformSources {
  return {
    aws_bedrock: "",
    gcp_vertex: "",
    azure_ai_foundry: "",
  };
}

function normalizeSources(
  sources: Partial<Record<DeploymentProvider, string>> | undefined,
): IscPlatformSources {
  const base = emptySources();
  if (!sources) {
    return base;
  }

  for (const provider of DEPLOYMENT_PROVIDER_VALUES) {
    const value = sources[provider];
    if (typeof value === "string") {
      base[provider] = value.trim();
    }
  }

  return base;
}

/** One-time migration for deployments that still have source IDs in env. */
function migrateFromEnvIfNeeded(settings: IscSettingsFile): IscSettingsFile {
  const envByProvider: Record<DeploymentProvider, readonly string[]> = {
    aws_bedrock: ["ISC_SOURCE_ID_AWS_BEDROCK", "ISC_SOURCE_ID"],
    gcp_vertex: ["ISC_SOURCE_ID_GCP_VERTEX"],
    azure_ai_foundry: ["ISC_SOURCE_ID_AZURE_FOUNDRY"],
  };

  let changed = false;
  const sources = { ...settings.sources };

  for (const provider of DEPLOYMENT_PROVIDER_VALUES) {
    if (sources[provider]) {
      continue;
    }

    for (const key of envByProvider[provider]) {
      const value = process.env[key]?.trim();
      if (value) {
        sources[provider] = value;
        changed = true;
        break;
      }
    }
  }

  if (!changed) {
    return settings;
  }

  const migrated: IscSettingsFile = {
    sources,
    updatedAt: new Date().toISOString(),
  };
  writeSettingsFile(migrated);
  return migrated;
}

function writeSettingsFile(settings: IscSettingsFile) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

export function readIscSettings(): IscSettingsFile {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(SETTINGS_PATH)) {
    const initial: IscSettingsFile = {
      sources: emptySources(),
      updatedAt: new Date().toISOString(),
    };
    writeSettingsFile(initial);
    return migrateFromEnvIfNeeded(initial);
  }

  const raw = fs.readFileSync(SETTINGS_PATH, "utf8");
  const parsed = JSON.parse(raw) as Partial<IscSettingsFile>;
  const settings: IscSettingsFile = {
    sources: normalizeSources(parsed.sources),
    updatedAt: parsed.updatedAt ?? new Date().toISOString(),
  };

  return migrateFromEnvIfNeeded(settings);
}

export function getIscSourceId(provider: DeploymentProvider): string | null {
  const value = readIscSettings().sources[provider]?.trim();
  return value || null;
}

export function getConfiguredIscSourceIds(): Record<
  DeploymentProvider,
  string | null
> {
  const sources = readIscSettings().sources;
  return {
    aws_bedrock: sources.aws_bedrock || null,
    gcp_vertex: sources.gcp_vertex || null,
    azure_ai_foundry: sources.azure_ai_foundry || null,
  };
}

export function updateIscPlatformSources(
  patch: Partial<Record<DeploymentProvider, string>>,
): IscSettingsFile {
  const current = readIscSettings();
  const sources = { ...current.sources };

  for (const provider of DEPLOYMENT_PROVIDER_VALUES) {
    if (provider in patch) {
      sources[provider] = patch[provider]?.trim() ?? "";
    }
  }

  const next: IscSettingsFile = {
    sources,
    updatedAt: new Date().toISOString(),
  };
  writeSettingsFile(next);
  return next;
}
