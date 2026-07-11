import { z } from "zod";

import { deploymentProviderSchema } from "@/lib/validation/agent.schema";

export const iscSourcesUpdateSchema = z.object({
  sources: z
    .object({
      aws_bedrock: z.string().trim().optional(),
      gcp_vertex: z.string().trim().optional(),
      azure_ai_foundry: z.string().trim().optional(),
    })
    .partial()
    .optional(),
  mis_schemas: z
    .object({
      aws_bedrock: z.string().trim().optional(),
      gcp_vertex: z.string().trim().optional(),
      azure_ai_foundry: z.string().trim().optional(),
    })
    .partial()
    .optional(),
});

export const iscCredentialsUpdateSchema = z.object({
  tenant: z.string().trim().min(1, "Tenant slug is required"),
  client_id: z.string().trim().min(1, "Client ID is required"),
  client_secret: z.string().trim().optional(),
  api_version: z.string().trim().optional(),
  domain: z.string().trim().optional(),
});

export const iscSourceVerifySchema = z.object({
  provider: deploymentProviderSchema,
  source_id: z.string().trim().min(1).optional(),
});

