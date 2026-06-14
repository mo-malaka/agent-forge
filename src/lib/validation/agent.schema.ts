import { z } from "zod";

export const archetypeSchema = z.enum([
  "code_assistant",
  "devops_bot",
  "customer_support",
  "financial_analyst",
  "security_analyst",
  "hr",
]);

export const createAgentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Agent name is required")
    .max(120, "Agent name must be 120 characters or fewer"),
  archetype: archetypeSchema,
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
});

export type CreateAgentPayload = z.infer<typeof createAgentSchema>;
export type ListAgentsQueryPayload = z.infer<typeof listAgentsQuerySchema>;
