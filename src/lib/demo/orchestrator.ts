import { evaluateAuthorization } from "@/lib/agents/authorization";
import {
  getAgentById,
  createAgentsBulk,
  removeAgentEntitlement,
} from "@/lib/agents/repository";
import { serializeAgent } from "@/lib/agents/serializer";
import { DEMO_STEPS, type DemoStepId } from "@/lib/demo/steps";
import { getIscConfig } from "@/lib/isc/config";
import {
  startAccountAggregation,
  startOutboundEntitlementAggregation,
  startMachineIdentityAggregation,
  updateMachineAccountMappings,
  verifySourceData,
  revokeEntitlementAccess,
} from "@/lib/isc";
import type { DemoStepPayload } from "@/lib/validation/demo.schema";

export interface DemoStepResult {
  step: DemoStepId;
  status: "completed" | "started" | "manual";
  message: string;
  system: "agentforge" | "isc";
  taskId: string | null;
  result: unknown;
}

function requireIscConfig() {
  const config = getIscConfig();
  if (!config) {
    throw new Error(
      "ISC is not configured. Set ISC_TENANT, ISC_CLIENT_ID, ISC_CLIENT_SECRET, and ISC_SOURCE_ID.",
    );
  }
  return config;
}

function defaultAgentId(payload: DemoStepPayload): string {
  return payload.agent_id ?? process.env.ISC_DEMO_AGENT_ID?.trim() ?? "agt_demo_aws_bedrock";
}

function defaultPrincipal(payload: DemoStepPayload): string {
  return payload.principal ?? "demo-user";
}

function defaultAllowPermission(payload: DemoStepPayload): string {
  return payload.permission ?? "S3:Read";
}

function resolveMachineIdentityDatasetIds(payload: DemoStepPayload): string[] {
  if (payload.dataset_ids?.length) {
    return payload.dataset_ids;
  }
  if (payload.schemas?.length) {
    return payload.schemas;
  }
  const fromEnv = process.env.ISC_MIS_DATASET_IDS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (fromEnv?.length) {
    return fromEnv;
  }
  return ["bedrock-agent"];
}

function defaultRevokeEntitlement(payload: DemoStepPayload): string {
  return payload.entitlement ?? "Jira:Admin";
}

export async function runDemoStep(
  payload: DemoStepPayload,
  baseUrl: string,
): Promise<DemoStepResult> {
  const definition = DEMO_STEPS[payload.step];
  const system = definition.system;

  switch (payload.step) {
    case "bulk-create": {
      const created = await createAgentsBulk({
        deployment_provider: payload.deployment_provider ?? "aws_bedrock",
        count: payload.count ?? 5,
      });

      return {
        step: payload.step,
        status: "completed",
        message: `Created ${created.length} agents in AgentForge`,
        system,
        taskId: null,
        result: {
          created_count: created.length,
          agents: created.map((row) => serializeAgent(row, baseUrl)),
        },
      };
    }

    case "entitlement-aggregation":
    case "entitlement-aggregation-outbound": {
      return {
        step: payload.step,
        status: "manual",
        message:
          "Run in ISC first: Source → Entitlement Aggregation → Specific Types → outboundPermissions → Start. Wait for SUCCESS, then click Run here to acknowledge.",
        system,
        taskId: null,
        result: {
          manual: true,
          entitlementType: "outboundPermissions",
          uiPath:
            "Source → Entitlement Aggregation → Specific Types → outboundPermissions",
        },
      };
    }

    case "entitlement-aggregation-inbound": {
      return {
        step: payload.step,
        status: "manual",
        message:
          "Run in ISC first: Source → Entitlement Aggregation → Specific Types → inboundCallers → Start. Wait for SUCCESS, then click Run here to acknowledge.",
        system,
        taskId: null,
        result: {
          manual: true,
          entitlementType: "inboundCallers",
          uiPath:
            "Source → Entitlement Aggregation → Specific Types → inboundCallers",
        },
      };
    }

    case "machine-identity-aggregation": {
      const config = requireIscConfig();
      const started = await startMachineIdentityAggregation(
        config,
        resolveMachineIdentityDatasetIds(payload),
      );

      return {
        step: payload.step,
        status: "started",
        message: "Machine identity aggregation started",
        system,
        taskId: started.taskId,
        result: started.raw,
      };
    }

    case "account-aggregation": {
      const config = requireIscConfig();
      const started = await startAccountAggregation(config);

      return {
        step: payload.step,
        status: "started",
        message: "Account aggregation started",
        system,
        taskId: started.taskId,
        result: started.raw,
      };
    }

    case "machine-account-mappings": {
      const config = requireIscConfig();
      const result = await updateMachineAccountMappings(config);
      const submitted = result.classification.accountsSubmitted ?? 0;
      const mode = result.classification.mode;

      return {
        step: payload.step,
        status: submitted > 0 ? "completed" : "manual",
        message:
          submitted > 0
            ? `Machine account mappings updated; ${submitted} account(s) classified via ${mode}`
            : "Mappings saved but 0 accounts classified. Configure machine account classification on the source in ISC, then re-run Step 6.",
        system,
        taskId: null,
        result,
      };
    }

    case "verify": {
      const config = requireIscConfig();
      const verification = await verifySourceData(config);
      const summary = `Found ${verification.accountCount} accounts, ${verification.machineAccountCount} machine accounts, ${verification.entitlementCount} entitlements`;
      const message = verification.accessReady
        ? `${summary}. Link accounts on AI Agent → Accounts if Access is still empty.`
        : `${summary}. ${verification.hints.join(" ")}`;

      return {
        step: payload.step,
        status: verification.accessReady ? "completed" : "manual",
        message,
        system,
        taskId: null,
        result: verification,
      };
    }

    case "authorize-allow": {
      const agentId = defaultAgentId(payload);
      const agent = await getAgentById(agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      const authorization = evaluateAuthorization(agent, {
        principal: defaultPrincipal(payload),
        direction: "outbound",
        permission: defaultAllowPermission(payload),
      });

      return {
        step: payload.step,
        status: "completed",
        message: `Authorization decision: ${authorization.decision}`,
        system,
        taskId: null,
        result: authorization,
      };
    }

    case "revoke-entitlement": {
      const revokeVia = payload.revoke_via ?? "agentforge";
      const entitlement = defaultRevokeEntitlement(payload);

      if (revokeVia === "isc") {
        const config = requireIscConfig();
        if (
          !payload.identity_id ||
          !payload.entitlement_id ||
          !payload.native_identity
        ) {
          throw new Error(
            "ISC revoke requires identity_id, entitlement_id, and native_identity",
          );
        }

        const response = await revokeEntitlementAccess(config, {
          identityId: payload.identity_id,
          entitlementId: payload.entitlement_id,
          nativeIdentity: payload.native_identity,
          assignmentId: payload.assignment_id,
        });

        return {
          step: payload.step,
          status: "started",
          message: "ISC access revoke request submitted",
          system: "isc",
          taskId: null,
          result: response,
        };
      }

      const agentId = defaultAgentId(payload);
      const updated = await removeAgentEntitlement({
        ref: { accountId: agentId },
        deploymentProvider: payload.deployment_provider ?? "aws_bedrock",
        attribute: "outboundPermissions",
        entitlement,
        baseUrl,
      });

      return {
        step: payload.step,
        status: "completed",
        message: `Removed entitlement ${entitlement} from agent ${updated.name}`,
        system,
        taskId: null,
        result: serializeAgent(updated, baseUrl),
      };
    }

    case "account-aggregation-refresh": {
      const config = requireIscConfig();
      const started = await startAccountAggregation(config, {
        disableOptimization: true,
      });

      return {
        step: payload.step,
        status: "started",
        message: "Unoptimized account aggregation started",
        system,
        taskId: started.taskId,
        result: started.raw,
      };
    }

    case "authorize-deny": {
      const agentId = defaultAgentId(payload);
      const agent = await getAgentById(agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      const permission = defaultRevokeEntitlement(payload);
      const authorization = evaluateAuthorization(agent, {
        principal: defaultPrincipal(payload),
        direction: "outbound",
        permission,
      });

      return {
        step: payload.step,
        status: "completed",
        message: `Authorization decision: ${authorization.decision}`,
        system,
        taskId: null,
        result: authorization,
      };
    }

    default: {
      const unreachable: never = payload.step;
      throw new Error(`Unsupported demo step: ${unreachable}`);
    }
  }
}
