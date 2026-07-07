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

export const iscSourceVerifySchema = z.object({
  provider: deploymentProviderSchema,
  source_id: z.string().trim().min(1).optional(),
});
