"use client";

export interface MetadataRow {
  key: string;
  value: string;
}

interface MetadataEditorProps {
  rows: MetadataRow[];
  onChange: (rows: MetadataRow[]) => void;
}

export function MetadataEditor({ rows, onChange }: MetadataEditorProps) {
  function updateRow(index: number, field: "key" | "value", nextValue: string) {
    onChange(
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: nextValue } : row,
      ),
    );
  }

  function addRow() {
    onChange([...rows, { key: "", value: "" }]);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Metadata
        </label>
        <button
          type="button"
          onClick={addRow}
          className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          + Add field
        </button>
      </div>

      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              placeholder="Key (e.g. Owner)"
              value={row.key}
              onChange={(event) => updateRow(index, "key", event.target.value)}
              className="w-1/3 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <input
              type="text"
              placeholder="Value"
              value={row.value}
              onChange={(event) => updateRow(index, "value", event.target.value)}
              className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <button
              type="button"
              onClick={() => removeRow(index)}
              className="rounded-md px-2 text-sm text-zinc-500 hover:text-red-600"
              aria-label="Remove metadata field"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function metadataRowsToRecord(rows: MetadataRow[]): Record<string, string> {
  return Object.fromEntries(
    rows
      .filter((row) => row.key.trim() && row.value.trim())
      .map((row) => [row.key.trim(), row.value.trim()]),
  );
}

export const DEFAULT_METADATA_ROWS: MetadataRow[] = [
  { key: "owner", value: "" },
  { key: "version", value: "1.0.0" },
  { key: "department", value: "" },
  { key: "risk_level", value: "Medium" },
];
