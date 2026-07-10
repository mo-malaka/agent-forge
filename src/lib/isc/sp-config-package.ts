import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { DEPLOYMENT_PROVIDERS, type DeploymentProvider } from "@/lib/providers/profiles";

const CONFIG_ROOT = path.join(process.cwd(), "config", "isc");
export const SP_CONFIG_BASE_URL_TOKEN = "{{AGENTFORGE_BASE_URL}}";

export interface SpConfigManifestPlatform {
  id: DeploymentProvider;
  goldenFile: string;
  connectorSlug: string;
  misSchemaDefault: string;
  suggestedSourceName: string;
}

export interface SpConfigManifest {
  version: number;
  description: string;
  baseUrlToken: string;
  defaultBaseUrl: string;
  platforms: SpConfigManifestPlatform[];
}

export interface SpConfigPlatformStatus {
  id: DeploymentProvider;
  label: string;
  connectorSlug: string;
  suggestedSourceName: string;
  misSchemaDefault: string;
  available: boolean;
  downloadPath: string;
  downloadFileName: string;
}

let manifestCache: SpConfigManifest | null = null;

export async function loadSpConfigManifest(): Promise<SpConfigManifest> {
  if (manifestCache) {
    return manifestCache;
  }

  const raw = await readFile(path.join(CONFIG_ROOT, "manifest.json"), "utf8");
  manifestCache = JSON.parse(raw) as SpConfigManifest;
  return manifestCache;
}

async function goldenFileIsPublished(relativePath: string): Promise<boolean> {
  const fullPath = path.join(CONFIG_ROOT, relativePath);
  try {
    await access(fullPath);
    const raw = await readFile(fullPath, "utf8");
    return raw.trim().length > 10;
  } catch {
    return false;
  }
}

export function substituteSpConfigBaseUrl(content: string, baseUrl: string): string {
  const normalized = baseUrl.replace(/\/$/, "");
  return content.split(SP_CONFIG_BASE_URL_TOKEN).join(normalized);
}

export async function getSpConfigPlatformStatuses(): Promise<SpConfigPlatformStatus[]> {
  const manifest = await loadSpConfigManifest();

  return Promise.all(
    manifest.platforms.map(async (platform) => {
      const profile = DEPLOYMENT_PROVIDERS[platform.id];
      const available = await goldenFileIsPublished(platform.goldenFile);

      return {
        id: platform.id,
        label: profile.label,
        connectorSlug: platform.connectorSlug,
        suggestedSourceName: platform.suggestedSourceName,
        misSchemaDefault: platform.misSchemaDefault,
        available,
        downloadPath: `/api/setup/isc-sp-config/${platform.connectorSlug}`,
        downloadFileName: `agentforge-${platform.connectorSlug}.sp-config.json`,
      };
    }),
  );
}

export async function loadPreparedSpConfig(
  connectorSlug: string,
  baseUrl: string,
): Promise<{ fileName: string; body: string } | null> {
  const manifest = await loadSpConfigManifest();
  const platform = manifest.platforms.find((entry) => entry.connectorSlug === connectorSlug);

  if (!platform) {
    return null;
  }

  const available = await goldenFileIsPublished(platform.goldenFile);
  if (!available) {
    return null;
  }

  const raw = await readFile(path.join(CONFIG_ROOT, platform.goldenFile), "utf8");
  const body = substituteSpConfigBaseUrl(raw, baseUrl);

  return {
    fileName: `agentforge-${platform.connectorSlug}.sp-config.json`,
    body,
  };
}
