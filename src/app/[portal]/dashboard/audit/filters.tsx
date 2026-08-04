"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

const control =
  "rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20";

export function AuditFilters({
  entities,
  actions,
  actors,
  params,
}: {
  entities: string[];
  actions: string[];
  actors: { id: string; label: string }[];
  params: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(() => params.q ?? "");

  function apply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sp = new URLSearchParams();
    for (const [k, v] of fd.entries()) {
      const s = String(v).trim();
      if (s) sp.set(k, s);
    }
    const qs = sp.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  function reset() {
    router.push(pathname);
  }

  return (
    <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Entity</label>
        <select name="entity" defaultValue={params.entity ?? ""} className={control}>
          <option value="">All</option>
          {entities.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Action</label>
        <select name="action" defaultValue={params.action ?? ""} className={control}>
          <option value="">All</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Actor</label>
        <select name="actor" defaultValue={params.actor ?? ""} className={control}>
          <option value="">All</option>
          {actors.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">From</label>
        <input type="date" name="from" defaultValue={params.from ?? ""} className={control} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">To</label>
        <input type="date" name="to" defaultValue={params.to ?? ""} className={control} />
      </div>
      <div className="min-w-[12rem] flex-1">
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Search</label>
        <input
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="name, field or value…"
          className={control + " w-full"}
        />
      </div>
      <button type="submit" className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white">
        Apply
      </button>
      <button type="button" onClick={reset} className="rounded-lg border px-4 py-2 text-sm font-medium">
        Clear
      </button>
    </form>
  );
}
