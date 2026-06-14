export const ARCHETYPES = {
  code_assistant: "Code Assistant",
  devops_bot: "DevOps Bot",
  customer_support: "Customer Support Agent",
  financial_analyst: "Financial Analyst",
  security_analyst: "Security Analyst",
  hr: "HR Agent",
} as const;

export type Archetype = keyof typeof ARCHETYPES;

export const ARCHETYPE_VALUES = Object.keys(ARCHETYPES) as Archetype[];

export const SCHEMA_VERSION = "1.0";
export const PLATFORM_ID = "agentforge-synthetic-ais";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;
