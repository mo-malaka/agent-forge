import { evaluateAuthorization } from "@/lib/agents/authorization";
import {
  collectAccessEntitlements,
  getInboundAccess,
  getOutboundAccess,
} from "@/lib/agents/access";
import type { DemoModeId } from "@/lib/demo/steps";
import {
  DEMO_GOVERN_ALLOW_PERMISSION,
  DEMO_GOVERN_REVOKE_ENTITLEMENT,
  DEMO_RESET_AGENT_ID,
  getDemoSeedInboundAccess,
  getDemoSeedOutboundEntitlements,
} from "@/lib/db/seed";
import { countAgents, findAgents } from "@/lib/db/store";
import {
  findDemoAgent,
  getDemoGovernExpectedInbound,
  getDemoGovernRequiredEntitlements,
} from "@/lib/demo/reset";
import { getIscConfig, getIscPublicStatus } from "@/lib/isc/config";
import { verifySourceData } from "@/lib/isc/verify";

export type PreflightStatus = "pass" | "warn" | "fail";

export interface PreflightCheck {
  id: string;
  label: string;
  status: PreflightStatus;
  message: string;
  detail?: unknown;
}

export interface PreflightResult {
  ready: boolean;
  mode: DemoModeId;
  checked_at: string;
  checks: PreflightCheck[];
}

function hasFailures(checks: PreflightCheck[]): boolean {
  return checks.some((check) => check.status === "fail");
}

export async function runDemoPreflight(
  mode: DemoModeId,
  options?: {
    agentId?: string;
    allowPermission?: string;
    principal?: string;
  },
): Promise<PreflightResult> {
  const agentId = options?.agentId ?? DEMO_RESET_AGENT_ID;
  const allowPermission = options?.allowPermission ?? DEMO_GOVERN_ALLOW_PERMISSION;
  const principal = options?.principal ?? "demo-user";
  const checks: PreflightCheck[] = [];

  checks.push({
    id: "agentforge",
    label: "AgentForge",
    status: "pass",
    message: "Application is running",
  });

  const iscStatus = getIscPublicStatus();
  checks.push({
    id: "isc_config",
    label: "ISC configuration",
    status: iscStatus.configured ? "pass" : "fail",
    message: iscStatus.configured
      ? `Connected to tenant ${iscStatus.tenant}`
      : "Set ISC_TENANT, ISC_CLIENT_ID, ISC_CLIENT_SECRET, and ISC_SOURCE_ID",
    detail: iscStatus,
  });

  const activeAgentCount = countAgents({ status: "active" });
  checks.push({
    id: "active_agents",
    label: "Active agents in AgentForge",
    status: activeAgentCount > 0 ? "pass" : "warn",
    message:
      activeAgentCount > 0
        ? `${activeAgentCount} active agent(s) available`
        : "No active agents — run bulk create (step 1) first",
    detail: { count: activeAgentCount },
  });

  const { rows: bedrockAgents } = findAgents({
    page: 1,
    limit: 200,
    status: "active",
    deploymentProvider: "aws_bedrock",
  });
  const outboundCatalog = collectAccessEntitlements(bedrockAgents, {
    direction: "outbound",
    platform: "AWS Bedrock",
  });
  const inboundCatalog = collectAccessEntitlements(bedrockAgents, {
    direction: "inbound",
    platform: "AWS Bedrock",
  });

  if (mode === "full-sync") {
    checks.push({
      id: "entitlement_catalog",
      label: "Entitlement catalog (AgentForge)",
      status:
        outboundCatalog.length > 0 && inboundCatalog.length > 0 ? "pass" : "warn",
      message:
        outboundCatalog.length > 0 && inboundCatalog.length > 0
          ? `${outboundCatalog.length} outbound and ${inboundCatalog.length} inbound entitlements`
          : "Entitlement catalog is empty — run step 1 or reset demo agent",
      detail: {
        outbound: outboundCatalog.length,
        inbound: inboundCatalog.length,
      },
    });

    if (iscStatus.configured) {
      const config = getIscConfig();
      if (config) {
        try {
          const verify = await verifySourceData(config);
          const synced =
            verify.accountCount > 0 &&
            verify.machineAccountCount > 0 &&
            verify.entitlementCount > 0;
          checks.push({
            id: "isc_sync",
            label: "ISC sync state",
            status: synced ? "pass" : "warn",
            message: synced
              ? `ISC has ${verify.accountCount} accounts, ${verify.machineAccountCount} machine accounts, ${verify.entitlementCount} entitlements`
              : "ISC not fully synced yet — complete full sync steps or run verify",
            detail: verify,
          });
        } catch (error) {
          checks.push({
            id: "isc_sync",
            label: "ISC sync state",
            status: "warn",
            message:
              error instanceof Error
                ? `Could not verify ISC sync: ${error.message}`
                : "Could not verify ISC sync",
          });
        }
      }
    }
  }

  if (mode === "govern-enforce") {
    const demoAgent = findDemoAgent(agentId);
    const expectedOutbound = getDemoSeedOutboundEntitlements();
    const expectedInbound = getDemoGovernExpectedInbound();
    const required = getDemoGovernRequiredEntitlements();

    if (!demoAgent) {
      checks.push({
        id: "demo_agent",
        label: "Demo agent",
        status: "fail",
        message: `Agent ${agentId} not found — run demo reset or full sync step 1`,
        detail: { expected_id: agentId, expected_name: "DevOps-Bot-Prod" },
      });
    } else {
      checks.push({
        id: "demo_agent",
        label: "Demo agent",
        status: demoAgent.status === "active" ? "pass" : "fail",
        message:
          demoAgent.status === "active"
            ? `${demoAgent.name} (${demoAgent.id}) is active`
            : `${demoAgent.name} is ${demoAgent.status} — enable or reset demo agent`,
        detail: { id: demoAgent.id, name: demoAgent.name, status: demoAgent.status },
      });

      const actualOutbound = getOutboundAccess(demoAgent);
      const missingRequired = required.filter(
        (entitlement) => !actualOutbound.includes(entitlement),
      );
      const entitlementsOk = missingRequired.length === 0;

      checks.push({
        id: "demo_entitlements",
        label: "Govern demo entitlements",
        status: entitlementsOk ? "pass" : "fail",
        message: entitlementsOk
          ? `Required entitlements present (${required.join(", ")})`
          : `Missing ${missingRequired.join(", ")} — run demo reset to restore after revoke`,
        detail: {
          required,
          expected: expectedOutbound,
          actual: actualOutbound,
          missing: missingRequired,
        },
      });

      const actualInbound = getInboundAccess(demoAgent);
      const inboundOk =
        expectedInbound.length === 0 ||
        expectedInbound.every((caller) => actualInbound.includes(caller));

      checks.push({
        id: "demo_inbound",
        label: "Inbound callers",
        status: inboundOk ? "pass" : "warn",
        message: inboundOk
          ? `${actualInbound.length} inbound caller(s) configured`
          : "Inbound callers differ from demo seed — reset demo agent if needed",
        detail: { expected: expectedInbound, actual: actualInbound },
      });

      if (demoAgent.status === "active" && entitlementsOk) {
        const authorization = evaluateAuthorization(demoAgent, {
          principal,
          direction: "outbound",
          permission: allowPermission,
        });
        checks.push({
          id: "authorize_allow_probe",
          label: `Authorize allow probe (${allowPermission})`,
          status: authorization.decision === "allow" ? "pass" : "fail",
          message:
            authorization.decision === "allow"
              ? `Authorization returns allow for ${allowPermission}`
              : `Authorization denied ${allowPermission} — reset demo agent`,
          detail: {
            decision: authorization.decision,
            reason: authorization.reason,
          },
        });

        const denyProbe = evaluateAuthorization(demoAgent, {
          principal,
          direction: "outbound",
          permission: DEMO_GOVERN_REVOKE_ENTITLEMENT,
        });
        if (!actualOutbound.includes(DEMO_GOVERN_REVOKE_ENTITLEMENT)) {
          checks.push({
            id: "revoke_already_applied",
            label: "Revoke entitlement state",
            status: "warn",
            message: `${DEMO_GOVERN_REVOKE_ENTITLEMENT} already removed — reset demo agent before re-running govern + enforce`,
          });
        } else {
          checks.push({
            id: "revoke_ready",
            label: "Revoke entitlement ready",
            status: "pass",
            message: `${DEMO_GOVERN_REVOKE_ENTITLEMENT} is present and can be revoked in step 2`,
            detail: { probe_decision: denyProbe.decision },
          });
        }
      }
    }
  }

  return {
    ready: !hasFailures(checks),
    mode,
    checked_at: new Date().toISOString(),
    checks,
  };
}
