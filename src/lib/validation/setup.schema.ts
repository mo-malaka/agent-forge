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
});

export const iscSpConfigImportAllSchema = z.object({
  tenant: z.string().trim().min(1, "Tenant slug is required"),
  domain: z.string().trim().optional(),
  personal_access_token: z
    .string()
    .trim()
    .min(20, "Personal access token is required"),
  preview: z.boolean().optional().default(true),
});
