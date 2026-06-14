"use client";

import { useState } from "react";

interface EntitlementsEditorProps {
  entitlements: string[];
  onChange: (entitlements: string[]) => void;
}

export function EntitlementsEditor({
  entitlements,
  onChange,
}: EntitlementsEditorProps) {
  const [input, setInput] = useState("");

  function addEntitlement(raw: string) {
    const items = raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (items.length === 0) {
      return;
    }

    const next = [...entitlements];
    for (const item of items) {
      if (!next.includes(item)) {
        next.push(item);
      }
    }

    onChange(next);
    setInput("");
  }

  function removeEntitlement(value: string) {
    onChange(entitlements.filter((item) => item !== value));
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        IAM Entitlements
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addEntitlement(input);
            }
          }}
          placeholder="e.g. S3:Read — press Enter or comma to add"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="button"
          onClick={() => addEntitlement(input)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Add
        </button>
      </div>

      {entitlements.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {entitlements.map((entitlement) => (
            <span
              key={entitlement}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              {entitlement}
              <button
                type="button"
                onClick={() => removeEntitlement(entitlement)}
                className="text-zinc-400 hover:text-red-500"
                aria-label={`Remove ${entitlement}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          Add at least one permission or role (e.g. S3:Read, Jira:Admin).
        </p>
      )}
    </div>
  );
}
