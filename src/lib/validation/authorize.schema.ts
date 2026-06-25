import { z } from "zod";

export const authorizeRequestSchema = z
  .object({
    principal: z.string().trim().min(1, "principal is required"),
    direction: z.enum(["inbound", "outbound"]),
    action: z.string().trim().min(1).optional(),
    caller: z.string().trim().min(1).optional(),
    resource: z.string().trim().min(1).optional(),
    permission: z.string().trim().min(1).optional(),
  })
  .superRefine((value, context) => {
    if (value.direction === "outbound") {
      const hasPermission = Boolean(value.permission);
      const hasResourceAction = Boolean(value.resource && value.action);

      if (!hasPermission && !hasResourceAction) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Outbound requests require permission or both resource and action",
          path: ["permission"],
        });
      }
    }
  });

export type AuthorizeRequestPayload = z.infer<typeof authorizeRequestSchema>;
