import Link from "next/link";
import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Hide on smaller desktop widths to keep tables readable. */
  hideBelow?: "md" | "lg" | "xl";
};

/**
 * Renders a table on >=md and a stacked card list on mobile.
 * Each row links to its detail page.
 */
export function ResponsiveList<T extends { id: string }>({
  rows, columns, href, primary, secondary, meta, actions,
}: {
  rows: T[];
  columns: Column<T>[];
  href: (row: T) => string;
  /** Mobile card title. */
  primary: (row: T) => ReactNode;
  /** Mobile card subtitle. */
  secondary?: (row: T) => ReactNode;
  /** Mobile card key/value pairs. */
  meta?: (row: T) => { label: string; value: ReactNode }[];
  actions?: (row: T) => ReactNode;
}) {
  const hideClass = { md: "hidden md:table-cell", lg: "hidden lg:table-cell", xl: "hidden xl:table-cell" };

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)] ${c.hideBelow ? hideClass[c.hideBelow] : ""}`}
                >
                  {c.header}
                </th>
              ))}
              <th scope="col" className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-b-0 transition-colors hover:bg-[var(--background)]">
                {columns.map((c, i) => (
                  <td key={c.key} className={`px-4 py-3 align-middle ${c.hideBelow ? hideClass[c.hideBelow] : ""}`}>
                    {i === 0 ? (
                      <Link href={href(row)} className="font-medium hover:text-[var(--brand)] hover:underline">
                        {c.cell(row)}
                      </Link>
                    ) : (
                      c.cell(row)
                    )}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">{actions?.(row)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y md:hidden">
        {rows.map((row) => (
          <li key={row.id} className="py-3 first:pt-0 last:pb-0">
            <Link href={href(row)} className="block rounded-lg p-2 -m-2 transition-colors active:bg-[var(--background)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{primary(row)}</p>
                  {secondary && <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{secondary(row)}</p>}
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-[var(--muted)]" aria-hidden>
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {meta && (
                <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
                  {meta(row).map((m) => (
                    <div key={m.label} className="min-w-0">
                      <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">{m.label}</dt>
                      <dd className="mt-0.5 truncate text-xs">{m.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Link>
            {actions && <div className="mt-2.5 flex flex-wrap gap-2">{actions(row)}</div>}
          </li>
        ))}
      </ul>
    </>
  );
}
