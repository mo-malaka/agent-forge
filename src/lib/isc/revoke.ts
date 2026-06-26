import { iscRequest } from "@/lib/isc/client";
import type { IscConfig } from "@/lib/isc/types";

export interface RevokeEntitlementInput {
  identityId: string;
  entitlementId: string;
  nativeIdentity: string;
  assignmentId?: string;
  comment?: string;
}

export interface AccessRequestResponse {
  id?: string;
  name?: string;
  state?: string;
  [key: string]: unknown;
}

export async function revokeEntitlementAccess(
  config: IscConfig,
  input: RevokeEntitlementInput,
): Promise<AccessRequestResponse> {
  const requestedItem: Record<string, unknown> = {
    type: "ENTITLEMENT",
    id: input.entitlementId,
    comment: input.comment ?? "AgentForge demo revoke",
    clientMetadata: {},
    nativeIdentity: input.nativeIdentity,
  };

  if (input.assignmentId) {
    requestedItem.assignmentId = input.assignmentId;
  }

  return iscRequest<AccessRequestResponse>(config, "/access-requests", {
    method: "POST",
    body: {
      requestType: "REVOKE_ACCESS",
      requestedFor: [
        {
          type: "IDENTITY",
          id: input.identityId,
        },
      ],
      requestedItems: [requestedItem],
    },
  });
}
