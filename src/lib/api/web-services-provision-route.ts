import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import type { EntitlementAttributeName } from "@/lib/agents/provisioning";
import {
  addAgentEntitlement,
  getAgentForProvisioning,
  ProvisioningError,
  removeAgentEntitlement,
  setAgentStatus,
} from "@/lib/agents/repository";
import { jsonError, jsonValidationError } from "@/lib/api/response";
import type { DeploymentProvider } from "@/lib/providers/profiles";
import { buildWebServicesAccount } from "@/lib/providers/web-services-serializers";
import { resolveBaseUrl } from "@/lib/url";
import {
  getProvisionAccountQuerySchema,
  provisionAccountStatusBodySchema,
  provisionEntitlementBodySchema,
} from "@/lib/validation/agent.schema";

function unwrapPlanBody(body: Record<string, unknown>): Record<string, unknown> {
  const plan = body.plan;
  if (plan && typeof plan === "object" && !Array.isArray(plan)) {
    return { ...body, ...(plan as Record<string, unknown>) };
  }

  return body;
}

function firstStringValue(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string") {
    return value.trim() || undefined;
  }

  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === "string" && entry.trim());
    return typeof first === "string" ? first.trim() : undefined;
  }

  return undefined;
}

function resolveAccountRef(body: {
  accountId?: string;
  nativeIdentity?: string;
  id?: string;
}) {
  return {
    accountId: body.accountId ?? body.id,
    nativeIdentity: body.nativeIdentity,
  };
}

function resolveEntitlementOperation(body: {
  entitlement?: string;
  entitlementType?: EntitlementAttributeName;
  outboundPermissions?: string | string[];
  inboundCallers?: string | string[];
}): { attribute: EntitlementAttributeName; entitlement: string } | null {
  if (body.entitlement && body.entitlementType) {
    return {
      attribute: body.entitlementType,
      entitlement: body.entitlement,
    };
  }

  const outbound = firstStringValue(body.outboundPermissions);
  if (outbound) {
    return { attribute: "outboundPermissions", entitlement: outbound };
  }

  const inbound = firstStringValue(body.inboundCallers);
  if (inbound) {
    return { attribute: "inboundCallers", entitlement: inbound };
  }

  if (body.entitlement) {
    return {
      attribute: body.entitlementType ?? "outboundPermissions",
      entitlement: body.entitlement,
    };
  }

  return null;
}

function provisionAccountResponse(
  agent: Awaited<ReturnType<typeof addAgentEntitlement>>,
  baseUrl: string,
) {
  const account = buildWebServicesAccount(agent, baseUrl);
  return NextResponse.json({
    success: true,
    account,
    object: account,
    nativeIdentity: account.nativeIdentity,
    accountId: account.accountId,
    status: account.status,
  });
}

function handleProvisioningError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonValidationError(error);
  }

  if (error instanceof ProvisioningError) {
    return jsonError(error.message, error.status);
  }

  console.error("Web Services provisioning failed:", error);
  return jsonError("Provisioning operation failed", 500);
}

export async function handleAddEntitlementRequest(
  request: NextRequest,
  deploymentProvider: DeploymentProvider,
) {
  try {
    const rawBody = unwrapPlanBody(
      (await request.json()) as Record<string, unknown>,
    );
    const body = provisionEntitlementBodySchema.parse(rawBody);
    const operation = resolveEntitlementOperation(body);

    if (!operation) {
      return jsonError(
        "entitlement and entitlementType, or outboundPermissions/inboundCallers, is required",
        400,
      );
    }

    const baseUrl = resolveBaseUrl(request.headers);
    const agent = await addAgentEntitlement({
      ref: resolveAccountRef(body),
      deploymentProvider,
      attribute: operation.attribute,
      entitlement: operation.entitlement,
      baseUrl,
    });

    return provisionAccountResponse(agent, baseUrl);
  } catch (error) {
    return handleProvisioningError(error);
  }
}

export async function handleRemoveEntitlementRequest(
  request: NextRequest,
  deploymentProvider: DeploymentProvider,
) {
  try {
    const rawBody = unwrapPlanBody(
      (await request.json()) as Record<string, unknown>,
    );
    const body = provisionEntitlementBodySchema.parse(rawBody);
    const operation = resolveEntitlementOperation(body);

    if (!operation) {
      return jsonError(
        "entitlement and entitlementType, or outboundPermissions/inboundCallers, is required",
        400,
      );
    }

    const baseUrl = resolveBaseUrl(request.headers);
    const agent = await removeAgentEntitlement({
      ref: resolveAccountRef(body),
      deploymentProvider,
      attribute: operation.attribute,
      entitlement: operation.entitlement,
      baseUrl,
    });

    return provisionAccountResponse(agent, baseUrl);
  } catch (error) {
    return handleProvisioningError(error);
  }
}

export async function handleDisableAccountRequest(
  request: NextRequest,
  deploymentProvider: DeploymentProvider,
) {
  try {
    const rawBody = unwrapPlanBody(
      (await request.json()) as Record<string, unknown>,
    );
    const body = provisionAccountStatusBodySchema.parse(rawBody);
    const baseUrl = resolveBaseUrl(request.headers);
    const agent = await setAgentStatus({
      ref: resolveAccountRef(body),
      deploymentProvider,
      status: "inactive",
      baseUrl,
    });

    return provisionAccountResponse(agent, baseUrl);
  } catch (error) {
    return handleProvisioningError(error);
  }
}

export async function handleEnableAccountRequest(
  request: NextRequest,
  deploymentProvider: DeploymentProvider,
) {
  try {
    const rawBody = unwrapPlanBody(
      (await request.json()) as Record<string, unknown>,
    );
    const body = provisionAccountStatusBodySchema.parse(rawBody);
    const baseUrl = resolveBaseUrl(request.headers);
    const agent = await setAgentStatus({
      ref: resolveAccountRef(body),
      deploymentProvider,
      status: "active",
      baseUrl,
    });

    return provisionAccountResponse(agent, baseUrl);
  } catch (error) {
    return handleProvisioningError(error);
  }
}

export async function handleGetProvisionAccountRequest(
  request: NextRequest,
  deploymentProvider: DeploymentProvider,
) {
  try {
    const query = getProvisionAccountQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    const baseUrl = resolveBaseUrl(request.headers);
    const agent = await getAgentForProvisioning({
      ref: resolveAccountRef(query),
      deploymentProvider,
      baseUrl,
    });
    const account = buildWebServicesAccount(agent, baseUrl);

    return NextResponse.json({
      account,
      object: account,
    });
  } catch (error) {
    return handleProvisioningError(error);
  }
}
