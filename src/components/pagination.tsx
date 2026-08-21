import Link from "next/link";

type SP = Record<string, string | string[] | undefined>;

function norm(sp: SP): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined) continue;
    out[k] = Array.isArray(v) ? v[0] : v;
  }
  return out;
}

export function Pagination({
  searchParams,
  page,
  pageSize,
  total,
  basePath,
}: {
  searchParams: SP;
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1 && total === 0) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams(norm(searchParams));
    sp.set("page", String(p));
    return `${basePath}?${sp.toString()}`;
  };

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
      <span className="text-[var(--muted)]">
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Link
          href={href(page - 1)}
          aria-disabled={page <= 1}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
            page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-[var(--background)]"
          }`}
        >
          Previous
        </Link>
        <span className="px-1 text-xs text-[var(--muted)]">
          Page {page} / {totalPages}
        </span>
        <Link
          href={href(page + 1)}
          aria-disabled={page >= totalPages}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
            page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-[var(--background)]"
          }`}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
