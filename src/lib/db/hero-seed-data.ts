import type {
  AgentDetails,
  ExtendedEntitlement,
  LinkedAccount,
  PrivilegeLevel,
} from "@/lib/agents/enrichment";
import type { NewAgentRow } from "@/lib/db/schema";
import { mergeDeploymentConfig } from "@/lib/providers/deployment";
import type { DeploymentProvider } from "@/lib/providers/profiles";

const SEED_TIMESTAMP = "2026-01-15T10:00:00.000Z";
const TENANT = "spciem";

interface HeroSeedAgent {
  id: string;
  name: string;
  archetype: string;
  deploymentProvider: DeploymentProvider;
  deploymentConfig: Record<string, string>;
  metadata: Record<string, string>;
  entitlements: string[];
  inbound_access: string[];
  agentDetails: AgentDetails;
  linkedAccounts: LinkedAccount[];
  extendedEntitlements: ExtendedEntitlement[];
}

const AWS_ACCOUNT_ID = "718666815581";
const AWS_REGION = "us-west-2";
const AWS_AGENT_ID = "OBK4WA6JJN";
const AWS_ALIAS_ID = "LVA0UBIDXW";
const GCP_PROJECT = "infra-agents-484421";
const GCP_REASONING_ENGINE =
  "projects/1096451098857/locations/us-central1/reasoningEngines/8850643092596850688";

function platformExt(
  id: string,
  entitlementName: string,
  sourceName: string,
  accountName: string,
  accessDirection: "outbound" | "inbound" = "outbound",
  options?: {
    riskScore?: number;
    privilegeLevel?: PrivilegeLevel;
  },
): ExtendedEntitlement {
  const attributeName =
    accessDirection === "inbound" ? "inboundCallers" : "outboundPermissions";

  return {
    id,
    entitlementName,
    displayName: entitlementName,
    attributeName,
    attributeValue: entitlementName,
    sourceName,
    accountName,
    accessDirection,
    riskScore: options?.riskScore,
    privilegeLevel: options?.privilegeLevel,
  };
}

const GCP_VERTEX_SOURCE = `GCP Vertex - ${TENANT}`;
const GCP_VERTEX_ACCOUNT = "sw-bug-assistant-25924";
const AZURE_FOUNDRY_SOURCE = `Azure AI Foundry - ${TENANT}`;
const AZURE_FOUNDRY_ACCOUNT = "Frontline-Support-Bot";
const BEDROCK_SOURCE = `AWS Bedrock - ${TENANT}`;
const BEDROCK_ACCOUNT = "CloudOps-Navigator:Infra-DevOps-Agent";

function ext(
  id: string,
  entitlementName: string,
  accessDirection: "outbound" | "inbound" = "outbound",
  options?: {
    riskScore?: number;
    privilegeLevel?: PrivilegeLevel;
  },
): ExtendedEntitlement {
  const attributeName =
    accessDirection === "inbound" ? "inboundCallers" : "outboundPermissions";

  return {
    id,
    entitlementName,
    displayName: entitlementName,
    attributeName,
    attributeValue: entitlementName,
    sourceName: BEDROCK_SOURCE,
    accountName: BEDROCK_ACCOUNT,
    accessDirection,
    riskScore: options?.riskScore,
    privilegeLevel: options?.privilegeLevel,
  };
}

const HERO_AGENTS: HeroSeedAgent[] = [
  {
    id: "agt_demo_aws_bedrock",
    name: "CloudOps-Navigator:Infra-DevOps-Agent",
    archetype: "devops_bot",
    deploymentProvider: "aws_bedrock",
    deploymentConfig: {
      region: AWS_REGION,
      account_id: AWS_ACCOUNT_ID,
      foundation_model: `arn:aws:bedrock:${AWS_REGION}:${AWS_ACCOUNT_ID}:inference-profile/us.amazon.nova-micro-v1:0`,
      agent_alias: "Infra-DevOps-Agent",
    },
    metadata: {
      owner: "mostafa.helmy@sailpoint.com",
      version: "2",
      department: "Platform Operations",
      risk_level: "High",
      environment: "demo",
      agent_type: "AWS Bedrock",
      source: `AWS IAM - ${TENANT}`,
      description:
        "Your intelligent assistant for AWS cloud operations. Ask questions and execute routine tasks to maintain an efficient cloud footprint.",
    },
    entitlements: [
      "S3:Read",
      "EC2:Describe",
      "Jira:Admin",
      "Bedrock:InvokeModel",
    ],
    inbound_access: ["invoke:engineering-team", "invoke:service-now-workflow"],
    agentDetails: {
      agentName: "CloudOps-Navigator",
      aliasName: "Infra-DevOps-Agent",
      aliasId: AWS_ALIAS_ID,
      agentArn: `arn:aws:bedrock:${AWS_REGION}:${AWS_ACCOUNT_ID}:agent/${AWS_AGENT_ID}`,
      agentAliasArn: `arn:aws:bedrock:${AWS_REGION}:${AWS_ACCOUNT_ID}:agent-alias/${AWS_AGENT_ID}/${AWS_ALIAS_ID}`,
      agentAliasStatus: "PREPARED",
      agentCollaboration: "DISABLED",
      foundationModel: `arn:aws:bedrock:${AWS_REGION}:${AWS_ACCOUNT_ID}:inference-profile/us.amazon.nova-micro-v1:0`,
      region: AWS_REGION,
      role: `arn:aws:iam::${AWS_ACCOUNT_ID}:role/service-role/AmazonBedrockExecutionRoleForAgents_CID1FXBM9LD`,
      version: "2",
      description:
        "Your intelligent assistant for AWS cloud operations. Ask questions and execute routine tasks to maintain an efficient cloud footprint.",
      resources: [
        {
          id: "AVCMH591JQ",
          name: "Internal-Design-BestPractices",
          type: "KnowledgeBase",
        },
      ],
      connectedAgents: [],
      createdAt: "2026-04-07T08:07:27.163520006Z",
      updatedAt: "2026-04-22T08:48:33.981929039Z",
    },
    linkedAccounts: [
      {
        id: "acct_aws_bedrock_primary",
        name: `CloudOps-Navigator:${AWS_ALIAS_ID}`,
        displayName: BEDROCK_ACCOUNT,
        nativeIdentity: `arn:aws:bedrock:${AWS_REGION}:${AWS_ACCOUNT_ID}:agent-alias/${AWS_AGENT_ID}/${AWS_ALIAS_ID}`,
        sourceName: BEDROCK_SOURCE,
        status: "Enabled",
        accountOwner: "mostafa.helmy@sailpoint.com",
      },
    ],
    extendedEntitlements: [
      ext("ent_aws_aid_devops_readonly", "AIDevOpsAgentReadOnlyAccess", "outbound", {
        riskScore: 7,
        privilegeLevel: "high",
      }),
      ext(
        "ent_aws_bedrock_inference",
        "AmazonBedrockAgentInferenceProfilesCrossRegionPolicy",
        "outbound",
        { riskScore: 6, privilegeLevel: "medium" },
      ),
      ext(
        "ent_aws_bedrock_kb",
        "AmazonBedrockAgentRetrieveKnowledgeBasePolicy",
        "outbound",
        { riskScore: 5, privilegeLevel: "medium" },
      ),
      ext("ent_aws_devops_secrets", "DevOps_Agent_Secrets", "outbound", {
        riskScore: 9,
        privilegeLevel: "high",
      }),
      ext("ent_aws_security_audit", "SecurityAudit", "outbound", {
        riskScore: 6,
        privilegeLevel: "medium",
      }),
      ext(
        "ent_aws_gws_security_auditor",
        "Security Auditor (on) spciem.com [Organization]",
        "outbound",
        { riskScore: 8, privilegeLevel: "high" },
      ),
      ext(
        "ent_aws_gws_viewer",
        "Viewer (on) spciem.com [Organization]",
        "outbound",
        { riskScore: 3, privilegeLevel: "low" },
      ),
      ext("ent_aws_s3_read", "S3:Read", "outbound", {
        riskScore: 3,
        privilegeLevel: "low",
      }),
      ext("ent_aws_jira_admin", "Jira:Admin", "outbound", {
        riskScore: 8,
        privilegeLevel: "high",
      }),
      ext("ent_aws_ec2_describe", "EC2:Describe", "outbound", {
        riskScore: 3,
        privilegeLevel: "low",
      }),
      ext(
        "ent_aws_entra_read_agents",
        "Read agent identities [on] Microsoft Graph",
        "outbound",
        { riskScore: 5, privilegeLevel: "medium" },
      ),
      ext("ent_aws_ad_devops_ops", "DevOps-Operations", "outbound", {
        riskScore: 6,
        privilegeLevel: "medium",
      }),
      ext("ent_aws_invoke_engineering", "invoke:engineering-team", "inbound", {
        riskScore: 4,
        privilegeLevel: "low",
      }),
      ext(
        "ent_aws_invoke_servicenow",
        "invoke:service-now-workflow",
        "inbound",
        { riskScore: 6, privilegeLevel: "medium" },
      ),
    ],
  },
  {
    id: "agt_demo_gcp_vertex",
    name: "sw-bug-assistant-25924",
    archetype: "customer_support",
    deploymentProvider: "gcp_vertex",
    deploymentConfig: {
      project_id: GCP_PROJECT,
      location: "us-central1",
    },
    metadata: {
      owner: "mostafa.helmy@sailpoint.com",
      version: "1.4.2",
      department: "Engineering",
      risk_level: "Medium",
      environment: "demo",
      agent_type: "GCP Vertex",
      source: `Google Workspace - ${TENANT}`,
      description: "Software bug assistant using ADK",
    },
    entitlements: [
      "VertexAI:User",
      "CloudTasks:Admin",
      "BigQuery:User",
      "Editor:Development",
    ],
    inbound_access: ["invoke:slack-bot", "invoke:api-gateway"],
    agentDetails: {
      description: "Software bug assistant using ADK",
      projectId: GCP_PROJECT,
      locationId: "us-central1",
      name: GCP_REASONING_ENGINE,
      createTime: "2026-01-15T23:35:36.027011Z",
      updateTime: "2026-01-15T23:40:58.483090Z",
      connectedAgents: [],
      metadata: {
        framework: "ADK",
        purpose: "software-bug-triage",
      },
    },
    linkedAccounts: [
      {
        id: "acct_gcp_reasoning_engine",
        name: GCP_VERTEX_ACCOUNT,
        displayName: GCP_VERTEX_ACCOUNT,
        nativeIdentity: GCP_REASONING_ENGINE,
        sourceName: GCP_VERTEX_SOURCE,
        status: "Enabled",
        accountOwner: "mostafa.helmy@sailpoint.com",
      },
    ],
    extendedEntitlements: [
      platformExt(
        "ent_gcp_vertex_user_org",
        "Vertex AI User (on) spciem.com [Organization]",
        GCP_VERTEX_SOURCE,
        GCP_VERTEX_ACCOUNT,
        "outbound",
        { riskScore: 5, privilegeLevel: "medium" },
      ),
      platformExt(
        "ent_gcp_vertex_user_project",
        "Vertex AI User (on) infra-agents [Project]",
        GCP_VERTEX_SOURCE,
        GCP_VERTEX_ACCOUNT,
        "outbound",
        { riskScore: 5, privilegeLevel: "medium" },
      ),
      platformExt(
        "ent_gcp_cloud_tasks_admin",
        "Cloud Tasks Admin (on) infra-agents [Project]",
        GCP_VERTEX_SOURCE,
        GCP_VERTEX_ACCOUNT,
        "outbound",
        { riskScore: 8, privilegeLevel: "high" },
      ),
      platformExt(
        "ent_gcp_editor_dev",
        "Editor (on) Development [Project]",
        GCP_VERTEX_SOURCE,
        GCP_VERTEX_ACCOUNT,
        "outbound",
        { riskScore: 7, privilegeLevel: "high" },
      ),
      platformExt(
        "ent_gcp_support_user",
        "Support User (on) infra-agents [Project]",
        GCP_VERTEX_SOURCE,
        GCP_VERTEX_ACCOUNT,
        "outbound",
        { riskScore: 6, privilegeLevel: "medium" },
      ),
      platformExt(
        "ent_gcp_bigquery_user",
        "BigQuery User (on) infra-agents [Project]",
        GCP_VERTEX_SOURCE,
        GCP_VERTEX_ACCOUNT,
        "outbound",
        { riskScore: 4, privilegeLevel: "low" },
      ),
      platformExt(
        "ent_gcp_entra_create_agents",
        "Create agent identities linked to itself [on] Microsoft Graph",
        GCP_VERTEX_SOURCE,
        GCP_VERTEX_ACCOUNT,
        "outbound",
        { riskScore: 7, privilegeLevel: "high" },
      ),
      platformExt(
        "ent_gcp_entra_read_directory",
        "Read directory data [on] Microsoft Graph",
        GCP_VERTEX_SOURCE,
        GCP_VERTEX_ACCOUNT,
        "outbound",
        { riskScore: 5, privilegeLevel: "medium" },
      ),
      platformExt(
        "ent_gcp_vertex_simple",
        "VertexAI:User",
        GCP_VERTEX_SOURCE,
        GCP_VERTEX_ACCOUNT,
        "outbound",
        { riskScore: 4, privilegeLevel: "low" },
      ),
      platformExt(
        "ent_gcp_ad_engineering",
        "Engineering-Developers",
        GCP_VERTEX_SOURCE,
        GCP_VERTEX_ACCOUNT,
        "outbound",
        { riskScore: 5, privilegeLevel: "medium" },
      ),
      platformExt(
        "ent_gcp_aws_readonly",
        "AIDevOpsAgentReadOnlyAccess",
        GCP_VERTEX_SOURCE,
        GCP_VERTEX_ACCOUNT,
        "outbound",
        { riskScore: 7, privilegeLevel: "high" },
      ),
      platformExt(
        "ent_gcp_invoke_slack",
        "invoke:slack-bot",
        GCP_VERTEX_SOURCE,
        GCP_VERTEX_ACCOUNT,
        "inbound",
        { riskScore: 4, privilegeLevel: "low" },
      ),
      platformExt(
        "ent_gcp_invoke_gateway",
        "invoke:api-gateway",
        GCP_VERTEX_SOURCE,
        GCP_VERTEX_ACCOUNT,
        "inbound",
        { riskScore: 6, privilegeLevel: "medium" },
      ),
    ],
  },
  {
    id: "agt_demo_azure_foundry",
    name: "Frontline-Support-Bot",
    archetype: "hr",
    deploymentProvider: "azure_ai_foundry",
    deploymentConfig: {
      subscription_id: "00000000-0000-0000-0000-000000000001",
      resource_group: "rg-ai-agents",
      workspace: "foundry-demo",
      location: "eastus",
    },
    metadata: {
      owner: "mostafa.helmy@sailpoint.com",
      version: "1.0.0",
      department: "Customer Success",
      risk_level: "Medium",
      environment: "demo",
      agent_type: "Azure AI Foundry",
      source: `Entra ID - ${TENANT}`,
      description: "Direct-to-customer general support and FAQ handling.",
    },
    entitlements: [
      "Workday:Read",
      "Slack:Read",
      "CognitiveServices:OpenAI:User",
      "SharePoint:Read",
    ],
    inbound_access: ["invoke:copilot-studio", "invoke:engineering-team"],
    agentDetails: {
      model: "gpt-4.1-mini",
      temperature: "0.6",
      top_p: "0.4",
      response_format: "auto",
      description: "Direct-to-customer general support and FAQ handling.",
      connectedAgents: [
        {
          id: `${TENANT}-callcenter:asst_QAOaf6WAj4nbIiPCPswOmsJj`,
          name: "submit_claim",
        },
      ],
      metadata: {
        "microsoft.voice-live.enabled": "false",
        "microsoft.voice-live.configuration": JSON.stringify({
          session: {
            voice: {
              name: "en-US-Ava:DragonHDLatestNeural",
              type: "azure-standard",
              temperature: 0.8,
            },
          },
        }),
        modified_at: "1774405687",
        v2_id: "Frontline-Support-Bot:1",
      },
      created_at: "2026-01-15T01:49:22.000Z",
    },
    linkedAccounts: [
      {
        id: "acct_azure_foundry_primary",
        name: AZURE_FOUNDRY_ACCOUNT,
        displayName: AZURE_FOUNDRY_ACCOUNT,
        nativeIdentity: `${TENANT}-callcenter:asst_mrMrcFIXltnANB4YlPKp4HHd`,
        sourceName: AZURE_FOUNDRY_SOURCE,
        status: "Enabled",
        accountOwner: "mostafa.helmy@sailpoint.com",
      },
    ],
    extendedEntitlements: [
      platformExt(
        "ent_az_ad_callcenter_data",
        "CallCenter-Customer Data",
        AZURE_FOUNDRY_SOURCE,
        AZURE_FOUNDRY_ACCOUNT,
        "outbound",
        { riskScore: 6, privilegeLevel: "medium" },
      ),
      platformExt(
        "ent_az_ad_password_reset",
        "CallCenter-PasswordReset",
        AZURE_FOUNDRY_SOURCE,
        AZURE_FOUNDRY_ACCOUNT,
        "outbound",
        { riskScore: 8, privilegeLevel: "high" },
      ),
      platformExt(
        "ent_az_ad_hr_all",
        "HR_All",
        AZURE_FOUNDRY_SOURCE,
        AZURE_FOUNDRY_ACCOUNT,
        "outbound",
        { riskScore: 7, privilegeLevel: "high" },
      ),
      platformExt(
        "ent_az_ad_customer_claims",
        "CallCenter-Customer claims",
        AZURE_FOUNDRY_SOURCE,
        AZURE_FOUNDRY_ACCOUNT,
        "outbound",
        { riskScore: 6, privilegeLevel: "medium" },
      ),
      platformExt(
        "ent_az_entra_read_profiles",
        "Read all users' full profiles [on] Microsoft Graph",
        AZURE_FOUNDRY_SOURCE,
        AZURE_FOUNDRY_ACCOUNT,
        "outbound",
        { riskScore: 8, privilegeLevel: "high" },
      ),
      platformExt(
        "ent_az_entra_send_mail",
        "Send mail as any user [on] Microsoft Graph",
        AZURE_FOUNDRY_SOURCE,
        AZURE_FOUNDRY_ACCOUNT,
        "outbound",
        { riskScore: 9, privilegeLevel: "high" },
      ),
      platformExt(
        "ent_az_entra_create_agents",
        "Create agent identities linked to itself [on] Microsoft Graph",
        AZURE_FOUNDRY_SOURCE,
        AZURE_FOUNDRY_ACCOUNT,
        "outbound",
        { riskScore: 7, privilegeLevel: "high" },
      ),
      platformExt(
        "ent_az_gws_bigquery",
        "BigQuery User (on) infra-agents [Project]",
        AZURE_FOUNDRY_SOURCE,
        AZURE_FOUNDRY_ACCOUNT,
        "outbound",
        { riskScore: 4, privilegeLevel: "low" },
      ),
      platformExt(
        "ent_az_gws_tech_support",
        "Tech Support Viewer (on) infra-agents [Project]",
        AZURE_FOUNDRY_SOURCE,
        AZURE_FOUNDRY_ACCOUNT,
        "outbound",
        { riskScore: 3, privilegeLevel: "low" },
      ),
      platformExt(
        "ent_az_sharepoint_read",
        "Read items in all site collections [on] Office 365 SharePoint Online",
        AZURE_FOUNDRY_SOURCE,
        AZURE_FOUNDRY_ACCOUNT,
        "outbound",
        { riskScore: 5, privilegeLevel: "medium" },
      ),
      platformExt(
        "ent_az_workday_read",
        "Workday:Read",
        AZURE_FOUNDRY_SOURCE,
        AZURE_FOUNDRY_ACCOUNT,
        "outbound",
        { riskScore: 4, privilegeLevel: "low" },
      ),
      platformExt(
        "ent_az_slack_read",
        "Slack:Read",
        AZURE_FOUNDRY_SOURCE,
        AZURE_FOUNDRY_ACCOUNT,
        "outbound",
        { riskScore: 3, privilegeLevel: "low" },
      ),
      platformExt(
        "ent_az_invoke_copilot",
        "invoke:copilot-studio",
        AZURE_FOUNDRY_SOURCE,
        AZURE_FOUNDRY_ACCOUNT,
        "inbound",
        { riskScore: 5, privilegeLevel: "medium" },
      ),
      platformExt(
        "ent_az_invoke_engineering",
        "invoke:engineering-team",
        AZURE_FOUNDRY_SOURCE,
        AZURE_FOUNDRY_ACCOUNT,
        "inbound",
        { riskScore: 4, privilegeLevel: "low" },
      ),
    ],
  },
];

export function buildHeroSeedAgents(): NewAgentRow[] {
  return HERO_AGENTS.map((seed) => ({
    id: seed.id,
    name: seed.name,
    archetype: seed.archetype,
    deploymentProvider: seed.deploymentProvider,
    deploymentConfig: JSON.stringify(
      mergeDeploymentConfig(seed.deploymentProvider, seed.deploymentConfig),
    ),
    status: "active",
    metadata: JSON.stringify(seed.metadata),
    entitlements: JSON.stringify(seed.entitlements),
    inboundAccess: JSON.stringify(seed.inbound_access),
    agentDetails: JSON.stringify(seed.agentDetails),
    linkedAccounts: JSON.stringify(seed.linkedAccounts),
    extendedEntitlements: JSON.stringify(seed.extendedEntitlements),
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    lastActiveAt: SEED_TIMESTAMP,
  }));
}

export const HERO_AGENT_IDS = HERO_AGENTS.map((agent) => agent.id);

export function getHeroSeedById(id: string): HeroSeedAgent | undefined {
  return HERO_AGENTS.find((agent) => agent.id === id);
}
