"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface DeleteAgentButtonProps {
  agentId: string;
  agentName: string;
}

export function DeleteAgentButton({
  agentId,
  agentName,
}: DeleteAgentButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete synthetic agent "${agentName}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete agent");
      }

      router.push("/");
      router.refresh();
    } catch {
      window.alert("Failed to delete agent. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
    >
      {deleting ? "Deleting..." : "Delete Agent"}
    </button>
  );
}
