import type {
  AgentDetails,
  ExtendedEntitlement,
  LinkedAccount,
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

function ext(
  id: string,
  entitlementName: string,
  attributeName: string,
  attributeValue: string,
  sourceName: string,
  accountName: string,
  accessDirection: "outbound" | "inbound" = "outbound",
): ExtendedEntitlement {
  return {
    id,
    entitlementName,
    displayName: entitlementName,
    attributeName,
    attributeValue,
    sourceName,
    accountName,
    accessDirection,
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
        displayName: "CloudOps-Navigator:Infra-DevOps-Agent",
        nativeIdentity: `arn:aws:bedrock:${AWS_REGION}:${AWS_ACCOUNT_ID}:agent-alias/${AWS_AGENT_ID}/${AWS_ALIAS_ID}`,
        sourceName: `AWS Bedrock - ${TENANT}`,
        status: "Enabled",
        accountOwner: "mostafa.helmy@sailpoint.com",
      },
      {
        id: "acct_aws_iam_execution_role",
        name: "AmazonBedrockExecutionRoleForAgents",
        displayName: "AmazonBedrockExecutionRoleForAgents",
        nativeIdentity: `arn:aws:iam::${AWS_ACCOUNT_ID}:role/service-role/AmazonBedrockExecutionRoleForAgents_CID1FXBM9LD`,
        sourceName: `AWS IAM - ${TENANT}`,
        status: "Enabled",
        accountOwner: "mostafa.helmy@sailpoint.com",
      },
      {
        id: "acct_aws_google_workspace",
        name: "sp-readonly@readonly-integration",
        displayName: "sp-readonly@readonly-integration",
        nativeIdentity: "sp-readonly@readonly-integration.spciem.com",
        sourceName: `Google Workspace - ${TENANT}`,
        status: "Disabled",
        accountOwner: "mostafa.helmy@sailpoint.com",
      },
    ],
    extendedEntitlements: [
      ext(
        "ent_aws_aid_devops_readonly",
        "AIDevOpsAgentReadOnlyAccess",
        "AWSManagedPolicies",
        "arn:aws:iam::aws:policy/AIDevOpsAgentReadOnlyAccess",
        `AWS IAM - ${TENANT}`,
        "AmazonBedrockExecutionRoleForAgents",
      ),
      ext(
        "ent_aws_bedrock_inference",
        "AmazonBedrockAgentInferenceProfilesCrossRegionPolicy",
        "CustomerManagedPolicies",
        `arn:aws:iam::${AWS_ACCOUNT_ID}:policy/AmazonBedrockAgentInferenceProfilesCrossRegionPolicy_F0DF6824718`,
        `AWS IAM - ${TENANT}`,
        "AmazonBedrockExecutionRoleForAgents",
      ),
      ext(
        "ent_aws_bedrock_kb",
        "AmazonBedrockAgentRetrieveKnowledgeBasePolicy",
        "CustomerManagedPolicies",
        `arn:aws:iam::${AWS_ACCOUNT_ID}:policy/AmazonBedrockAgentRetrieveKnowledgeBasePolicy_PFH2CNJD64P`,
        `AWS IAM - ${TENANT}`,
        "AmazonBedrockExecutionRoleForAgents",
      ),
      ext(
        "ent_aws_devops_secrets",
        "DevOps_Agent_Secrets",
        "InlinePolicies",
        `arn:aws:iam::${AWS_ACCOUNT_ID}:user/DevOps_Agent_Secrets`,
        `AWS IAM - ${TENANT}`,
        "AmazonBedrockExecutionRoleForAgents",
      ),
      ext(
        "ent_aws_security_audit",
        "SecurityAudit",
        "AWSManagedPolicies",
        "arn:aws:iam::aws:policy/SecurityAudit",
        `AWS IAM - ${TENANT}`,
        "AmazonBedrockExecutionRoleForAgents",
      ),
      ext(
        "ent_aws_gws_security_auditor",
        "Security Auditor (on) spciem.com [Organization]",
        "resourcePermissions",
        "organizations/745688199418:roles/securityAuditor",
        `Google Workspace - ${TENANT}`,
        "sp-readonly@readonly-integration",
      ),
      ext(
        "ent_aws_gws_viewer",
        "Viewer (on) spciem.com [Organization]",
        "resourcePermissions",
        "organizations/745688199418:roles/viewer",
        `Google Workspace - ${TENANT}`,
        "sp-readonly@readonly-integration",
      ),
      ext(
        "ent_aws_s3_read",
        "S3:Read",
        "outboundPermissions",
        "S3:Read",
        `AWS Bedrock - ${TENANT}`,
        "CloudOps-Navigator:Infra-DevOps-Agent",
      ),
      ext(
        "ent_aws_jira_admin",
        "Jira:Admin",
        "outboundPermissions",
        "Jira:Admin",
        `AWS Bedrock - ${TENANT}`,
        "CloudOps-Navigator:Infra-DevOps-Agent",
      ),
      ext(
        "ent_aws_ec2_describe",
        "EC2:Describe",
        "outboundPermissions",
        "EC2:Describe",
        `AWS Bedrock - ${TENANT}`,
        "CloudOps-Navigator:Infra-DevOps-Agent",
      ),
      ext(
        "ent_aws_entra_read_agents",
        "Read agent identities [on] Microsoft Graph",
        "appRoleAssignments",
        "7ab1d2f3-4e5c-4a6b-9c8d-0e1f2a3b4c5d",
        `Entra ID - ${TENANT}`,
        "sp-readonly@readonly-integration",
      ),
      ext(
        "ent_aws_ad_devops_ops",
        "DevOps-Operations",
        "memberOf",
        "CN=DevOps-Operations,OU=Groups,DC=spciem,DC=com",
        "Active Directory",
        "AmazonBedrockExecutionRoleForAgents",
      ),
      ext(
        "ent_aws_invoke_engineering",
        "invoke:engineering-team",
        "inboundCallers",
        "invoke:engineering-team",
        `AWS Bedrock - ${TENANT}`,
        "CloudOps-Navigator:Infra-DevOps-Agent",
        "inbound",
      ),
      ext(
        "ent_aws_invoke_servicenow",
        "invoke:service-now-workflow",
        "inboundCallers",
        "invoke:service-now-workflow",
        `AWS Bedrock - ${TENANT}`,
        "CloudOps-Navigator:Infra-DevOps-Agent",
        "inbound",
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
        name: "sw-bug-assistant-25924",
        displayName: "sw-bug-assistant-25924",
        nativeIdentity: GCP_REASONING_ENGINE,
        sourceName: `Google Workspace - ${TENANT}`,
        status: "Enabled",
        accountOwner: "mostafa.helmy@sailpoint.com",
      },
      {
        id: "acct_gcp_bug_assistant_sa",
        name: "bug-assistant-agent@infra-agents",
        displayName: "bug-assistant-agent@infra-agents",
        nativeIdentity: `bug-assistant-agent@${GCP_PROJECT}.iam.gserviceaccount.com`,
        sourceName: `Google Workspace - ${TENANT}`,
        status: "Enabled",
        accountOwner: "mostafa.helmy@sailpoint.com",
      },
      {
        id: "acct_gcp_compute_default",
        name: "602993474818-compute@developer",
        displayName: "602993474818-compute@developer",
        nativeIdentity: "602993474818-compute@developer.gserviceaccount.com",
        sourceName: `Google Workspace - ${TENANT}`,
        status: "Enabled",
        accountOwner: "mostafa.helmy@sailpoint.com",
      },
      {
        id: "acct_gcp_entra_sp",
        name: "spciem-bug-assistant-sp",
        displayName: "spciem-bug-assistant-sp",
        nativeIdentity: "a460a290-d458-42ba-9dbd-831f4c4e5f01",
        sourceName: `Entra ID - ${TENANT}`,
        status: "Enabled",
        accountOwner: "mostafa.helmy@sailpoint.com",
      },
    ],
    extendedEntitlements: [
      ext(
        "ent_gcp_vertex_user_org",
        "Vertex AI User (on) spciem.com [Organization]",
        "resourcePermissions",
        "organizations/745688199418:roles/vertexai.user",
        `Google Workspace - ${TENANT}`,
        "bug-assistant-agent@infra-agents",
      ),
      ext(
        "ent_gcp_vertex_user_project",
        "Vertex AI User (on) infra-agents [Project]",
        "resourcePermissions",
        `projects/${GCP_PROJECT}:roles/vertexai.user`,
        `Google Workspace - ${TENANT}`,
        "bug-assistant-agent@infra-agents",
      ),
      ext(
        "ent_gcp_cloud_tasks_admin",
        "Cloud Tasks Admin (on) infra-agents [Project]",
        "resourcePermissions",
        `projects/${GCP_PROJECT}:roles/cloudtasks.admin`,
        `Google Workspace - ${TENANT}`,
        "bug-assistant-agent@infra-agents",
      ),
      ext(
        "ent_gcp_editor_dev",
        "Editor (on) Development [Project]",
        "resourcePermissions",
        "projects/eighth-ridge-408013:roles/editor",
        `Google Workspace - ${TENANT}`,
        "602993474818-compute@developer",
      ),
      ext(
        "ent_gcp_support_user",
        "Support User (on) infra-agents [Project]",
        "resourcePermissions",
        `projects/${GCP_PROJECT}:roles/cloudsupport.techSupportEditor`,
        `Google Workspace - ${TENANT}`,
        "bug-assistant-agent@infra-agents",
      ),
      ext(
        "ent_gcp_bigquery_user",
        "BigQuery User (on) infra-agents [Project]",
        "resourcePermissions",
        `projects/${GCP_PROJECT}:roles/bigquery.user`,
        `Google Workspace - ${TENANT}`,
        "bug-assistant-agent@infra-agents",
      ),
      ext(
        "ent_gcp_entra_create_agents",
        "Create agent identities linked to itself [on] Microsoft Graph",
        "appRoleAssignments",
        "a460a290-d458-42ba-9dbd-831f4c4e5f01",
        `Entra ID - ${TENANT}`,
        "spciem-bug-assistant-sp",
      ),
      ext(
        "ent_gcp_entra_read_directory",
        "Read directory data [on] Microsoft Graph",
        "appRoleAssignments",
        "7ab1d2f3-4e5c-4a6b-9c8d-0e1f2a3b4c5d",
        `Entra ID - ${TENANT}`,
        "spciem-bug-assistant-sp",
      ),
      ext(
        "ent_gcp_vertex_simple",
        "VertexAI:User",
        "outboundPermissions",
        "VertexAI:User",
        `Google Workspace - ${TENANT}`,
        "sw-bug-assistant-25924",
      ),
      ext(
        "ent_gcp_ad_engineering",
        "Engineering-Developers",
        "memberOf",
        "CN=Engineering-Developers,OU=Groups,DC=spciem,DC=com",
        "Active Directory",
        "spciem-bug-assistant-sp",
      ),
      ext(
        "ent_gcp_aws_readonly",
        "AIDevOpsAgentReadOnlyAccess",
        "AWSManagedPolicies",
        "arn:aws:iam::aws:policy/AIDevOpsAgentReadOnlyAccess",
        `AWS IAM - ${TENANT}`,
        "602993474818-compute@developer",
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
        name: "Frontline-Support-Bot",
        displayName: "Frontline-Support-Bot",
        nativeIdentity: `${TENANT}-callcenter:asst_mrMrcFIXltnANB4YlPKp4HHd`,
        sourceName: `Entra ID - ${TENANT}`,
        status: "Enabled",
        accountOwner: "mostafa.helmy@sailpoint.com",
      },
      {
        id: "acct_azure_ad_svc",
        name: "SVC_FrontLine_Bot",
        displayName: "SVC_FrontLine_Bot",
        nativeIdentity: "CN=SVC_FrontLine_Bot,OU=ServiceAccounts,DC=spciem,DC=com",
        sourceName: "Active Directory",
        status: "Enabled",
        accountOwner: "mostafa.helmy@sailpoint.com",
      },
      {
        id: "acct_azure_gws_support",
        name: "spciem-callcenter-support-bot",
        displayName: "spciem-callcenter-support-bot",
        nativeIdentity: "spciem-callcenter-support-bot@spciem.com",
        sourceName: `Google Workspace - ${TENANT}`,
        status: "Enabled",
        accountOwner: "mostafa.helmy@sailpoint.com",
      },
      {
        id: "acct_azure_entra_resource",
        name: "spciem-callcenter-resource-sp",
        displayName: "spciem-callcenter-resource-sp",
        nativeIdentity: "spciem-callcenter-resource-sp@spciem.com",
        sourceName: `Entra ID - ${TENANT}`,
        status: "Enabled",
        accountOwner: "mostafa.helmy@sailpoint.com",
      },
    ],
    extendedEntitlements: [
      ext(
        "ent_az_ad_callcenter_data",
        "CallCenter-Customer Data",
        "memberOf",
        "CN=CallCenter-Customer Data,OU=Groups,DC=spciem,DC=com",
        "Active Directory",
        "SVC_FrontLine_Bot",
      ),
      ext(
        "ent_az_ad_password_reset",
        "CallCenter-PasswordReset",
        "memberOf",
        "CN=CallCenter-PasswordReset,OU=Groups,DC=spciem,DC=com",
        "Active Directory",
        "SVC_FrontLine_Bot",
      ),
      ext(
        "ent_az_ad_hr_all",
        "HR_All",
        "memberOf",
        "CN=HR_All,OU=Groups,DC=spciem,DC=com",
        "Active Directory",
        "SVC_FrontLine_Bot",
      ),
      ext(
        "ent_az_ad_customer_claims",
        "CallCenter-Customer claims",
        "memberOf",
        "CN=CallCenter-Customer claims,OU=Groups,DC=spciem,DC=com",
        "Active Directory",
        "SVC_FrontLine_Bot",
      ),
      ext(
        "ent_az_entra_read_profiles",
        "Read all users' full profiles [on] Microsoft Graph",
        "appRoleAssignments",
        "df021288-bdef-446c-9fd1-33e437a9120f",
        `Entra ID - ${TENANT}`,
        "spciem-callcenter-resource-sp",
      ),
      ext(
        "ent_az_entra_send_mail",
        "Send mail as any user [on] Microsoft Graph",
        "appRoleAssignments",
        "b0a0b0a0-0000-4000-8000-000000000001",
        `Entra ID - ${TENANT}`,
        "spciem-callcenter-resource-sp",
      ),
      ext(
        "ent_az_entra_create_agents",
        "Create agent identities linked to itself [on] Microsoft Graph",
        "appRoleAssignments",
        "a460a290-d458-42ba-9dbd-831f4c4e5f01",
        `Entra ID - ${TENANT}`,
        "spciem-callcenter-resource-sp",
      ),
      ext(
        "ent_az_gws_bigquery",
        "BigQuery User (on) infra-agents [Project]",
        "resourcePermissions",
        `projects/${GCP_PROJECT}:roles/bigquery.user`,
        `Google Workspace - ${TENANT}`,
        "spciem-callcenter-support-bot",
      ),
      ext(
        "ent_az_gws_tech_support",
        "Tech Support Viewer (on) infra-agents [Project]",
        "resourcePermissions",
        `projects/${GCP_PROJECT}:roles/viewer`,
        `Google Workspace - ${TENANT}`,
        "spciem-callcenter-support-bot",
      ),
      ext(
        "ent_az_sharepoint_read",
        "Read items in all site collections [on] Office 365 SharePoint Online",
        "appRoleAssignments",
        "67890123-4567-8901-2345-678901234567",
        `Entra ID - ${TENANT}`,
        "spciem-callcenter-resource-sp",
      ),
      ext(
        "ent_az_workday_read",
        "Workday:Read",
        "outboundPermissions",
        "Workday:Read",
        `Entra ID - ${TENANT}`,
        "Frontline-Support-Bot",
      ),
      ext(
        "ent_az_slack_read",
        "Slack:Read",
        "outboundPermissions",
        "Slack:Read",
        `Entra ID - ${TENANT}`,
        "Frontline-Support-Bot",
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
