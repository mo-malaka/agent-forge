export function IscOrgAdminPatGuide({
  defaultOpen = false,
}: {
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="rounded-md border border-indigo-200 bg-indigo-50/60 text-sm text-zinc-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-zinc-300"
      open={defaultOpen}
    >
      <summary className="cursor-pointer select-none px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
        How to create an ORG_ADMIN personal access token (PAT)
      </summary>
      <div className="space-y-3 border-t border-indigo-200/80 px-4 py-3 dark:border-indigo-900/80">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Use the <strong>target</strong> tenant you are bootstrapping. The
          identity must have <strong>ORG_ADMIN</strong> (organization
          administrator).
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-xs leading-relaxed">
          <li>
            Sign in to Identity Security Cloud on the <strong>target</strong>{" "}
            tenant as an ORG_ADMIN user.
          </li>
          <li>
            Open your user menu (top right) →{" "}
            <strong>Preferences</strong> → <strong>Personal Access Tokens</strong>
            .
          </li>
          <li>
            Click <strong>New token</strong> and name it (e.g.{" "}
            <code className="text-[11px]">AgentForge bootstrap</code>).
          </li>
          <li>
            Select scopes — for bootstrap use{" "}
            <code className="text-[11px]">sp:scopes:all</code> if allowed, or at
            minimum <code className="text-[11px]">sp:config:manage</code> for
            import and privilege criteria scopes for Step 3.
          </li>
          <li>
            Copy <strong>Client ID</strong> and <strong>Client Secret</strong>{" "}
            immediately — SailPoint shows the secret <strong>once</strong>.
          </li>
          <li>
            Paste both below. AgentForge exchanges them for a short-lived access
            token and <strong>does not store them</strong> on the server. Revoke
            the PAT in ISC when finished.
          </li>
        </ol>
        <p className="text-xs text-amber-800 dark:text-amber-200">
          If a request returns 403 Forbidden, the identity is missing ORG_ADMIN
          or the required scope.
        </p>
      </div>
    </details>
  );
}
