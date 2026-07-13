import { z } from "zod";

import { DEMO_STEP_IDS } from "@/lib/demo/steps";
import { deploymentProviderSchema } from "@/lib/validation/agent.schema";
import { iscRuntimeSchema } from "@/lib/validation/isc.schema";

export const demoStepSchema = z.object({
  step: z.enum(DEMO_STEP_IDS),
  deployment_provider: deploymentProviderSchema.optional(),
  count: z.union([z.literal(0), z.literal(5), z.literal(10), z.literal(20)]).optional(),
  agent_id: z.string().trim().min(1).optional(),
  principal: z.string().trim().min(1).optional(),
  permission: z.string().trim().min(1).optional(),
  entitlement: z.string().trim().min(1).optional(),
  revoke_via: z.enum(["agentforge", "isc"]).optional(),
  identity_id: z.string().trim().min(1).optional(),
  entitlement_id: z.string().trim().min(1).optional(),
  native_identity: z.string().trim().min(1).optional(),
  assignment_id: z.string().trim().min(1).optional(),
  schemas: z.array(z.string().trim().min(1)).max(10).optional(),
  dataset_ids: z.array(z.string().trim().min(1)).max(10).optional(),
  isc_runtime: iscRuntimeSchema,
});

export type DemoStepPayload = z.infer<typeof demoStepSchema>;

export const demoResetSchema = z.object({
  scope: z.enum(["demo-agent", "full-store"]).optional(),
  agent_id: z.string().trim().min(1).optional(),
  remove_bulk_agents: z.boolean().optional(),
});

export type DemoResetPayload = z.infer<typeof demoResetSchema>;

export const demoPreflightQuerySchema = z.object({
  mode: z.enum(["full-sync", "govern-enforce"]),
  agent_id: z.string().trim().min(1).optional(),
  allow_permission: z.string().trim().min(1).optional(),
  revoke_entitlement: z.string().trim().min(1).optional(),
  principal: z.string().trim().min(1).optional(),
  deployment_provider: deploymentProviderSchema.optional(),
  isc_runtime: iscRuntimeSchema,
});
