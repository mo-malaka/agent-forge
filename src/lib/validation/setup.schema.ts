import { z } from "zod";

export const iscSpConfigImportSchema = z.object({
  tenant: z.string().trim().min(1, "Tenant slug is required"),
  domain: z.string().trim().optional(),
  personal_access_token: z
    .string()
    .trim()
    .min(20, "Personal access token is required"),
  connector_slug: z.enum(["aws-bedrock", "gcp-vertex", "azure-ai-foundry"]),
  preview: z.boolean().optional().default(true),
  apply_privilege_classification: z.boolean().optional().default(false),
  source_id: z.string().trim().min(1).optional(),
});

export const iscPrivilegeClassificationApplySchema = z
  .object({
    tenant: z.string().trim().min(1, "Tenant slug is required"),
    domain: z.string().trim().optional(),
    personal_access_token: z.string().trim().min(20).optional(),
    client_id: z.string().trim().min(1).optional(),
    client_secret: z.string().trim().min(1).optional(),
    connector_slug: z.enum(["aws-bedrock", "gcp-vertex", "azure-ai-foundry"]),
    source_id: z.string().trim().min(1, "ISC source ID is required"),
  })
  .refine(
    (data) =>
      Boolean(data.personal_access_token) ||
      Boolean(data.client_id && data.client_secret),
    {
      message:
        "Provide personal_access_token (JWT) or PAT client_id + client_secret",
      path: ["client_id"],
    },
  );

export const iscSpConfigImportAllSchema = z.object({
  tenant: z.string().trim().min(1, "Tenant slug is required"),
  domain: z.string().trim().optional(),
  personal_access_token: z
    .string()
    .trim()
    .min(20, "Personal access token is required"),
  preview: z.boolean().optional().default(true),
  privilege_source_ids: z
    .object({
      "aws-bedrock": z.string().trim().min(1).optional(),
      "gcp-vertex": z.string().trim().min(1).optional(),
      "azure-ai-foundry": z.string().trim().min(1).optional(),
    })
    .optional(),
});
