"use client";

import { useState } from "react";

export type LookupResult = {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  serialNo?: string;
  productType?: string;
  lowStock?: boolean;
};

type Props = {
  portal: string;
  onResult: (result: LookupResult) => void;
};

export default function BarcodeScanner({ portal, onResult }: Props) {
  const [mode, setMode] = useState<"barcode" | "sku" | "serial">("barcode");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/${portal}/inventory/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      onResult(data);
      setQuery("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as any)}
          className="rounded-lg border bg-[var(--background)] px-3 py-2 text-sm"
        >
          <option value="barcode">Barcode</option>
          <option value="sku">SKU</option>
          <option value="serial">Serial</option>
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              lookup();
            }
          }}
          placeholder="Scan or enter value..."
          className="flex-1 rounded-lg border bg-[var(--background)] px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={lookup}
          disabled={loading}
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Looking..." : "Lookup"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
