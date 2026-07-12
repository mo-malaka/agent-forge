#!/usr/bin/env bash
# Export privilege classification from golden source tenant company23069-poc.
#
# Prerequisites:
#   1. ORG_ADMIN PAT on company23069-poc (identitynow-demo.com)
#   2. Run from agent-forge repo root
#
# Usage:
#   export ISC_CLIENT_ID='pat-client-id'
#   export ISC_CLIENT_SECRET='pat-client-secret'
#   ./scripts/export-privilege-criteria-company23069.sh
#
# Do NOT put Client ID or Secret in ORG_ADMIN_PAT — those are not JWTs.
# ISC PATs are OAuth clients; the script exchanges them for an access token.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TENANT="company23069-poc"
DOMAIN="identitynow-demo.com"

if [[ -z "${ISC_CLIENT_ID:-}" || -z "${ISC_CLIENT_SECRET:-}" ]]; then
  if [[ -n "${ORG_ADMIN_PAT:-}" ]]; then
    echo "ORG_ADMIN_PAT is set — using as pre-fetched access token (must be a JWT from oauth/token)." >&2
    AUTH_ARGS=(--token "$ORG_ADMIN_PAT")
  else
    echo "Set ISC_CLIENT_ID and ISC_CLIENT_SECRET from your PAT (Preferences → Personal Access Tokens)." >&2
    echo "  export ISC_CLIENT_ID='...'" >&2
    echo "  export ISC_CLIENT_SECRET='...'" >&2
    exit 1
  fi
else
  AUTH_ARGS=(--client-id "$ISC_CLIENT_ID" --client-secret "$ISC_CLIENT_SECRET")
fi

export_one() {
  local platform="$1"
  local source_id="$2"
  local output="$3"
  local label="$4"

  echo ""
  echo "=== Exporting ${label} (${platform}) ==="
  node scripts/export-privilege-criteria.mjs \
    --tenant "$TENANT" \
    --domain "$DOMAIN" \
    "${AUTH_ARGS[@]}" \
    --source-id "$source_id" \
    --platform "$platform" \
    --output "$output"
}

export_one aws_bedrock \
  "97aa9f1151a64ed0bd0319da98ef620b" \
  "config/isc/golden/privilege-classification.aws-bedrock.json" \
  "AI Agents Bedrock"

export_one gcp_vertex \
  "27a98701d1ea42d9a4022aa22ff6049e" \
  "config/isc/golden/privilege-classification.gcp-vertex.json" \
  "AI Agents GCP"

export_one azure_ai_foundry \
  "98f020072250499592542d46d08b69bd" \
  "config/isc/golden/privilege-classification.azure-ai-foundry.json" \
  "AI Agent Foundry"

echo ""
echo "Done. Review and commit:"
echo "  config/isc/golden/privilege-classification.aws-bedrock.json"
echo "  config/isc/golden/privilege-classification.gcp-vertex.json"
echo "  config/isc/golden/privilege-classification.azure-ai-foundry.json"
