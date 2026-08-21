"use client";

import { useRouter } from "next/navigation";

type SP = Record<string, string | string[] | undefined>;

const SIZES = [10, 15, 25, 50, 100];

export function PageSizeSelector({
  searchParams,
  basePath,
  current,
}: {
  searchParams: SP;
  basePath: string;
  current: number;
}) {
  const router = useRouter();

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v === undefined) continue;
      if (k === "page" || k === "size") continue;
      sp.set(k, Array.isArray(v) ? v[0] : v);
    }
    sp.set("size", e.target.value);
    sp.set("page", "1");
    router.push(`${basePath}?${sp.toString()}`);
  };

  return (
    <label className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
      Rows
      <select
        value={current}
        onChange={onChange}
        className="rounded-md border bg-[var(--surface)] px-2 py-1 text-xs outline-none focus:border-[var(--brand)]"
      >
        {SIZES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}
