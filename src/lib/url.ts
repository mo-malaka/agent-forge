export function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export function getPollUrl(): string {
  return `${getBaseUrl()}/api/agents`;
}
