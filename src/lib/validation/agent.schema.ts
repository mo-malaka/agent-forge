import { z } from "zod";

export const archetypeSchema = z.enum([
  "code_assistant",
  "devops_bot",
  "customer_support",
  "financial_analyst",
  "security_analyst",
  "hr",
]);

export const deploymentProviderSchema = z.enum([
  "aws_bedrock",
  "gcp_vertex",
  "azure_ai_foundry",
]);

export const deploymentConfigSchema = z
  .object({
    region: z.string().trim().min(1).optional(),
    account_id: z.string().trim().min(1).optional(),
    foundation_model: z.string().trim().min(1).optional(),
    agent_alias: z.string().trim().min(1).optional(),
    project_id: z.string().trim().min(1).optional(),
    location: z.string().trim().min(1).optional(),
    subscription_id: z.string().trim().min(1).optional(),
    resource_group: z.string().trim().min(1).optional(),
    workspace: z.string().trim().min(1).optional(),
  })
  .optional();

export const createAgentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Agent name is required")
    .max(120, "Agent name must be 120 characters or fewer"),
  archetype: archetypeSchema,
  deployment_provider: deploymentProviderSchema.default("aws_bedrock"),
  deployment_config: deploymentConfigSchema,
  metadata: z
    .record(z.string().trim().min(1), z.string().trim().min(1))
    .default({}),
  entitlements: z
    .array(z.string().trim().min(1))
    .min(1, "At least one entitlement is required")
    .max(50, "A maximum of 50 entitlements is allowed"),
});

export const listAgentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.enum(["active", "inactive"]).optional(),
  archetype: archetypeSchema.optional(),
  deployment_provider: deploymentProviderSchema.optional(),
});

export const bulkCreateAgentsSchema = z.object({
  deployment_provider: deploymentProviderSchema,
  count: z.union([z.literal(5), z.literal(10), z.literal(20)]),
});

export type BulkCreateAgentsPayload = z.infer<typeof bulkCreateAgentsSchema>;

export type CreateAgentPayload = z.infer<typeof createAgentSchema>;
export type ListAgentsQueryPayload = z.infer<typeof listAgentsQuerySchema>;
