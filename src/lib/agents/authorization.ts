import {
  getInboundAccess,
  getOutboundAccess,
  type AccessDirection,
} from "@/lib/agents/access";
import type { AgentRow } from "@/lib/db/schema";
import type {
  AuthorizationRequest,
  AuthorizationResult,
} from "@/types/authorization";

function resolveInboundCaller(request: AuthorizationRequest): string | null {
  if (request.caller) {
    return request.caller;
  }

  if (request.principal.startsWith("invoke:")) {
    return request.principal;
  }

  return null;
}

function resolveOutboundPermission(request: AuthorizationRequest): string | null {
  if (request.permission) {
    return request.permission;
  }

  if (request.resource && request.action) {
    return `${request.resource}:${request.action}`;
  }

  return null;
}

function buildRequestedFields(
  request: AuthorizationRequest,
): Record<string, string> {
  const requested: Record<string, string> = {
    principal: request.principal,
    direction: request.direction,
  };

  if (request.direction === "inbound") {
    const caller = resolveInboundCaller(request);
    if (caller) {
      requested.caller = caller;
    }
    if (request.action) {
      requested.action = request.action;
    }
    return requested;
  }

  const permission = resolveOutboundPermission(request);
  if (permission) {
    requested.permission = permission;
  }
  if (request.resource) {
    requested.resource = request.resource;
  }
  if (request.action) {
    requested.action = request.action;
  }

  return requested;
}

function deny(
  agent: AgentRow,
  request: AuthorizationRequest,
  reason: string,
  policy: string,
): AuthorizationResult {
  return {
    agent_id: agent.id,
    decision: "deny",
    reason,
    policy,
    direction: request.direction,
    principal: request.principal,
    requested: buildRequestedFields(request),
    effective_access: {
      outbound: getOutboundAccess(agent),
      inbound: getInboundAccess(agent),
    },
    matched_entitlement: null,
  };
}

function allow(
  agent: AgentRow,
  request: AuthorizationRequest,
  policy: string,
  matchedEntitlement: string,
): AuthorizationResult {
  return {
    agent_id: agent.id,
    decision: "allow",
    reason: "Request matches effective access",
    policy,
    direction: request.direction,
    principal: request.principal,
    requested: buildRequestedFields(request),
    effective_access: {
      outbound: getOutboundAccess(agent),
      inbound: getInboundAccess(agent),
    },
    matched_entitlement: matchedEntitlement,
  };
}

function evaluateInbound(
  agent: AgentRow,
  request: AuthorizationRequest,
): AuthorizationResult {
  const caller = resolveInboundCaller(request);

  if (!caller) {
    return deny(
      agent,
      request,
      "Inbound authorization requires caller or an invoke:* principal",
      "agent_inbound_allowlist",
    );
  }

  const inbound = getInboundAccess(agent);
  if (inbound.includes(caller)) {
    return allow(agent, request, "agent_inbound_allowlist", caller);
  }

  return deny(
    agent,
    request,
    `Caller ${caller} is not in inboundCallers`,
    "agent_inbound_allowlist",
  );
}

function evaluateOutbound(
  agent: AgentRow,
  request: AuthorizationRequest,
): AuthorizationResult {
  const permission = resolveOutboundPermission(request);

  if (!permission) {
    return deny(
      agent,
      request,
      "Outbound authorization requires permission or resource and action",
      "agent_outbound_allowlist",
    );
  }

  const outbound = getOutboundAccess(agent);
  if (outbound.includes(permission)) {
    return allow(agent, request, "agent_outbound_allowlist", permission);
  }

  return deny(
    agent,
    request,
    `Permission ${permission} is not in outboundPermissions`,
    "agent_outbound_allowlist",
  );
}

export function evaluateAuthorization(
  agent: AgentRow,
  request: AuthorizationRequest,
): AuthorizationResult {
  if (agent.status !== "active") {
    return deny(
      agent,
      request,
      "Agent is disabled",
      "agent_disabled",
    );
  }

  if (request.direction === "inbound") {
    return evaluateInbound(agent, request);
  }

  return evaluateOutbound(agent, request);
}

export function directionLabel(direction: AccessDirection): string {
  return direction === "inbound" ? "Inbound" : "Outbound";
}
