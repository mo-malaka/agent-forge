export function IscOrgAdminPatGuide() {
  return (
    <div className="space-y-3 rounded-md border border-indigo-200 bg-indigo-50/60 p-4 text-sm text-zinc-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-zinc-300">
      <p className="font-medium text-zinc-900 dark:text-zinc-100">
        How to create an ORG_ADMIN personal access token (PAT)
      </p>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        Use the <strong>target</strong> tenant you are bootstrapping — not your
        reference export tenant. The identity must have{" "}
        <strong>ORG_ADMIN</strong> (organization administrator).
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
          <span className="mt-1 block text-zinc-500">
            Alternate path: <strong>Admin → Identities</strong> → your identity
            → <strong>Personal Access Tokens</strong>.
          </span>
        </li>
        <li>
          Click <strong>New token</strong> and name it (e.g.{" "}
          <code className="text-[11px]">AgentForge bootstrap</code>).
        </li>
        <li>
          Select scopes:
          <ul className="mt-1 list-disc pl-5">
            <li>
              <code className="text-[11px]">sp:config:manage</code> — required
              for import
            </li>
            <li>
              <code className="text-[11px]">sp:config:read</code> — optional,
              for reading import results
            </li>
          </ul>
        </li>
        <li>
          Set a <strong>short expiration</strong> (same day is fine for demo
          bootstrap).
        </li>
        <li>
          Copy the token immediately — SailPoint shows it <strong>once</strong>
          .
        </li>
        <li>
          Paste it below. AgentForge uses it only for this import request and{" "}
          <strong>does not store it</strong>. Revoke the token in ISC when
          finished.
        </li>
      </ol>
      <p className="text-xs text-amber-800 dark:text-amber-200">
        If import returns 403 Forbidden, the identity is missing ORG_ADMIN or
        the <code className="text-[11px]">sp:config:manage</code> scope.
      </p>
    </div>
  );
}
