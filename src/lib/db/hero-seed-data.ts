import type { AgentDetails, LinkedAccount } from "@/lib/agents/enrichment";
import {
  buildAgentEnrichment,
  type EntitlementTuning,
} from "@/lib/agents/enrichment-builder";
import type { NewAgentRow } from "@/lib/db/schema";
import type { Archetype } from "@/lib/constants";
import { mergeDeploymentConfig } from "@/lib/providers/deployment";
import type { DeploymentProvider } from "@/lib/providers/profiles";

const SEED_TIMESTAMP = "2026-01-15T10:00:00.000Z";
const TENANT = "spciem";

const AWS_ACCOUNT_ID = "718666815581";
const AWS_REGION = "us-west-2";
const AWS_AGENT_ID = "OBK4WA6JJN";
const AWS_ALIAS_ID = "LVA0UBIDXW";
const GCP_PROJECT = "infra-agents-484421";
const GCP_REASONING_ENGINE =
  "projects/1096451098857/locations/us-central1/reasoningEngines/8850643092596850688";

const BEDROCK_SOURCE = `AWS Bedrock - ${TENANT}`;
const BEDROCK_ACCOUNT = "CloudOps-Navigator:Infra-DevOps-Agent";
const GCP_VERTEX_SOURCE = `GCP Vertex - ${TENANT}`;
const GCP_VERTEX_ACCOUNT = "sw-bug-assistant-25924";
const AZURE_FOUNDRY_SOURCE = `Azure AI Foundry - ${TENANT}`;
const AZURE_FOUNDRY_ACCOUNT = "Frontline-Support-Bot";

function tune(
  id: string,
  name: string,
  direction: "outbound" | "inbound",
  riskScore: number,
  privilegeLevel: EntitlementTuning["privilegeLevel"],
): EntitlementTuning {
  return { id, name, direction, riskScore, privilegeLevel };
}

interface HeroSeedConfig {
  id: string;
  name: string;
  archetype: Archetype;
  deploymentProvider: DeploymentProvider;
  deploymentConfig: Record<string, string>;
  metadata: Record<string, string>;
  entitlementTuning: EntitlementTuning[];
  agentDetails: AgentDetails;
  linkedAccounts: LinkedAccount[];
}

const HERO_CONFIGS: HeroSeedConfig[] = [
  {
    id: "agt_demo_aws_bedrock",
    name: BEDROCK_ACCOUNT,
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
    entitlementTuning: [
      tune("ent_aws_aid_devops_readonly", "AIDevOpsAgentReadOnlyAccess", "outbound", 7, "high"),
      tune("ent_aws_bedrock_inference", "AmazonBedrockAgentInferenceProfilesCrossRegionPolicy", "outbound", 6, "medium"),
      tune("ent_aws_bedrock_kb", "AmazonBedrockAgentRetrieveKnowledgeBasePolicy", "outbound", 5, "medium"),
      tune("ent_aws_devops_secrets", "DevOps_Agent_Secrets", "outbound", 9, "high"),
      tune("ent_aws_security_audit", "SecurityAudit", "outbound", 6, "medium"),
      tune("ent_aws_gws_security_auditor", "Security Auditor (on) spciem.com [Organization]", "outbound", 8, "high"),
      tune("ent_aws_gws_viewer", "Viewer (on) spciem.com [Organization]", "outbound", 3, "low"),
      tune("ent_aws_s3_read", "S3:Read", "outbound", 3, "low"),
      tune("ent_aws_jira_admin", "Jira:Admin", "outbound", 8, "high"),
      tune("ent_aws_ec2_describe", "EC2:Describe", "outbound", 3, "low"),
      tune("ent_aws_entra_read_agents", "Read agent identities [on] Microsoft Graph", "outbound", 5, "medium"),
      tune("ent_aws_ad_devops_ops", "DevOps-Operations", "outbound", 6, "medium"),
      tune("ent_aws_invoke_engineering", "invoke:engineering-team", "inbound", 4, "low"),
      tune("ent_aws_invoke_servicenow", "invoke:service-now-workflow", "inbound", 6, "medium"),
    ],
  },
  {
    id: "agt_demo_gcp_vertex",
    name: GCP_VERTEX_ACCOUNT,
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
    entitlementTuning: [
      tune("ent_gcp_vertex_user_org", "Vertex AI User (on) spciem.com [Organization]", "outbound", 5, "medium"),
      tune("ent_gcp_vertex_user_project", "Vertex AI User (on) infra-agents [Project]", "outbound", 5, "medium"),
      tune("ent_gcp_cloud_tasks_admin", "Cloud Tasks Admin (on) infra-agents [Project]", "outbound", 8, "high"),
      tune("ent_gcp_editor_dev", "Editor (on) Development [Project]", "outbound", 7, "high"),
      tune("ent_gcp_support_user", "Support User (on) infra-agents [Project]", "outbound", 6, "medium"),
      tune("ent_gcp_bigquery_user", "BigQuery User (on) infra-agents [Project]", "outbound", 4, "low"),
      tune("ent_gcp_entra_create_agents", "Create agent identities linked to itself [on] Microsoft Graph", "outbound", 7, "high"),
      tune("ent_gcp_entra_read_directory", "Read directory data [on] Microsoft Graph", "outbound", 5, "medium"),
      tune("ent_gcp_vertex_simple", "VertexAI:User", "outbound", 4, "low"),
      tune("ent_gcp_ad_engineering", "Engineering-Developers", "outbound", 5, "medium"),
      tune("ent_gcp_aws_readonly", "AIDevOpsAgentReadOnlyAccess", "outbound", 7, "high"),
      tune("ent_gcp_invoke_slack", "invoke:slack-bot", "inbound", 4, "low"),
      tune("ent_gcp_invoke_gateway", "invoke:api-gateway", "inbound", 6, "medium"),
    ],
  },
  {
    id: "agt_demo_azure_foundry",
    name: AZURE_FOUNDRY_ACCOUNT,
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
    entitlementTuning: [
      tune("ent_az_ad_callcenter_data", "CallCenter-Customer Data", "outbound", 6, "medium"),
      tune("ent_az_ad_password_reset", "CallCenter-PasswordReset", "outbound", 8, "high"),
      tune("ent_az_ad_hr_all", "HR_All", "outbound", 7, "high"),
      tune("ent_az_ad_customer_claims", "CallCenter-Customer claims", "outbound", 6, "medium"),
      tune("ent_az_entra_read_profiles", "Read all users' full profiles [on] Microsoft Graph", "outbound", 8, "high"),
      tune("ent_az_entra_send_mail", "Send mail as any user [on] Microsoft Graph", "outbound", 9, "high"),
      tune("ent_az_entra_create_agents", "Create agent identities linked to itself [on] Microsoft Graph", "outbound", 7, "high"),
      tune("ent_az_gws_bigquery", "BigQuery User (on) infra-agents [Project]", "outbound", 4, "low"),
      tune("ent_az_gws_tech_support", "Tech Support Viewer (on) infra-agents [Project]", "outbound", 3, "low"),
      tune("ent_az_sharepoint_read", "Read items in all site collections [on] Office 365 SharePoint Online", "outbound", 5, "medium"),
      tune("ent_az_workday_read", "Workday:Read", "outbound", 4, "low"),
      tune("ent_az_slack_read", "Slack:Read", "outbound", 3, "low"),
      tune("ent_az_invoke_copilot", "invoke:copilot-studio", "inbound", 5, "medium"),
      tune("ent_az_invoke_engineering", "invoke:engineering-team", "inbound", 4, "low"),
    ],
  },
];

function buildHeroRow(config: HeroSeedConfig): NewAgentRow {
  const deploymentConfig = mergeDeploymentConfig(
    config.deploymentProvider,
    config.deploymentConfig,
  );
  const enrichment = buildAgentEnrichment({
    id: config.id,
    name: config.name,
    archetype: config.archetype,
    deploymentProvider: config.deploymentProvider,
    deploymentConfig,
    metadata: config.metadata,
    entitlements: [],
    inboundAccess: [],
    entitlementTuning: config.entitlementTuning,
    overrides: {
      linkedAccounts: config.linkedAccounts,
      agentDetails: config.agentDetails,
    },
  });

  return {
    id: config.id,
    name: config.name,
    archetype: config.archetype,
    deploymentProvider: config.deploymentProvider,
    deploymentConfig: JSON.stringify(deploymentConfig),
    status: "active",
    metadata: JSON.stringify(config.metadata),
    entitlements: JSON.stringify(enrichment.entitlements),
    inboundAccess: JSON.stringify(enrichment.inboundAccess),
    agentDetails: JSON.stringify(enrichment.agentDetails),
    linkedAccounts: JSON.stringify(enrichment.linkedAccounts),
    extendedEntitlements: JSON.stringify(enrichment.extendedEntitlements),
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    lastActiveAt: SEED_TIMESTAMP,
  };
}

export function buildHeroSeedAgents(): NewAgentRow[] {
  return HERO_CONFIGS.map(buildHeroRow);
}

export const HERO_AGENT_IDS = HERO_CONFIGS.map((agent) => agent.id);

export function getHeroSeedById(id: string): HeroSeedConfig | undefined {
  return HERO_CONFIGS.find((agent) => agent.id === id);
}
