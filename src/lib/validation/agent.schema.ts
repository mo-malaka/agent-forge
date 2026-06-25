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
    .min(1, "At least one outbound access permission is required")
    .max(50, "A maximum of 50 outbound permissions is allowed"),
  inbound_access: z
    .array(z.string().trim().min(1))
    .max(20, "A maximum of 20 inbound callers is allowed")
    .default([]),
});

export const listAgentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.enum(["active", "inactive"]).optional(),
  archetype: archetypeSchema.optional(),
  deployment_provider: deploymentProviderSchema.optional(),
});

export const webServicesEntitlementsQuerySchema = z.object({
  type: z.enum(["inbound", "outbound"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const bulkCreateAgentsSchema = z.object({
  deployment_provider: deploymentProviderSchema,
  count: z.union([z.literal(5), z.literal(10), z.literal(20)]),
});

export const entitlementAttributeSchema = z.enum([
  "outboundPermissions",
  "inboundCallers",
]);

export const provisionAccountRefSchema = z
  .object({
    accountId: z.string().trim().min(1).optional(),
    nativeIdentity: z.string().trim().min(1).optional(),
    id: z.string().trim().min(1).optional(),
  })
  .refine((value) => Boolean(value.accountId || value.nativeIdentity || value.id), {
    message: "accountId, nativeIdentity, or id is required",
  });

export const provisionEntitlementBodySchema = provisionAccountRefSchema.and(
  z.object({
    entitlement: z.string().trim().min(1).optional(),
    entitlementType: entitlementAttributeSchema.optional(),
    outboundPermissions: z
      .union([z.string().trim().min(1), z.array(z.string().trim().min(1))])
      .optional(),
    inboundCallers: z
      .union([z.string().trim().min(1), z.array(z.string().trim().min(1))])
      .optional(),
  }),
);

export const provisionAccountStatusBodySchema = provisionAccountRefSchema;

export const updateAgentSchema = z
  .object({
    status: z.enum(["active", "inactive"]).optional(),
    entitlements: z.array(z.string().trim().min(1)).max(50).optional(),
    inbound_access: z.array(z.string().trim().min(1)).max(20).optional(),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.entitlements !== undefined ||
      value.inbound_access !== undefined,
    { message: "At least one field must be provided" },
  );

export const getProvisionAccountQuerySchema = z
  .object({
    accountId: z.string().trim().min(1).optional(),
    nativeIdentity: z.string().trim().min(1).optional(),
    id: z.string().trim().min(1).optional(),
  })
  .refine((value) => Boolean(value.accountId || value.nativeIdentity || value.id), {
    message: "accountId, nativeIdentity, or id is required",
  });

export type BulkCreateAgentsPayload = z.infer<typeof bulkCreateAgentsSchema>;

export type CreateAgentPayload = z.infer<typeof createAgentSchema>;
export type ListAgentsQueryPayload = z.infer<typeof listAgentsQuerySchema>;
export type UpdateAgentPayload = z.infer<typeof updateAgentSchema>;
