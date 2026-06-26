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
      const config = requireIscConfig();
      const started = await startOutboundEntitlementAggregation(config);

      return {
        step: payload.step,
        status: "started",
        message:
          "Outbound entitlement aggregation started (ISC API uses Group Aggregation HTTP op)",
        system,
        taskId: started.taskId,
        result: started.raw,
      };
    }

    case "entitlement-aggregation-inbound": {
      return {
        step: payload.step,
        status: "manual",
        message:
          "Run in ISC: Source → Entitlement Aggregation → Specific Types → inboundCallers → Start Aggregation. Then continue the remaining steps.",
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
        payload.schemas ?? ["bedrock-agent"],
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
      const mappings = await updateMachineAccountMappings(config);

      return {
        step: payload.step,
        status: "completed",
        message: "Machine account mappings updated",
        system,
        taskId: null,
        result: { mappings },
      };
    }

    case "verify": {
      const config = requireIscConfig();
      const verification = await verifySourceData(config);

      return {
        step: payload.step,
        status: "completed",
        message: `Found ${verification.accountCount} accounts and ${verification.machineAccountCount} machine accounts`,
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
