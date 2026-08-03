import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* ------------------------------- layout -------------------------------- */

export function PageHeader({
  title, description, breadcrumb, action,
}: {
  title: string;
  description?: string;
  breadcrumb?: { href: string; label: string };
  action?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {breadcrumb && (
        <Link
          href={breadcrumb.href}
          className="mb-2 inline-flex items-center gap-1 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {breadcrumb.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

export function Card({
  title, description, children, footer,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[var(--radius)] border bg-[var(--surface)] shadow-sm">
      {title && (
        <div className="border-b px-4 py-4 sm:px-6">
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-[var(--muted)]">{description}</p>}
        </div>
      )}
      <div className="p-4 sm:p-6">{children}</div>
      {footer && <div className="border-t bg-[var(--background)] px-4 py-3 sm:px-6">{footer}</div>}
    </section>
  );
}

export function FormSection({
  title, description, children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b py-6 first:pt-0 last:border-b-0 last:pb-0">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,15rem)_1fr] lg:gap-8">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{description}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border bg-[var(--background)]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-[var(--muted)]" aria-hidden>
          <path d="M5 7h14M5 12h14M5 17h9" strokeLinecap="round" />
        </svg>
      </div>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ------------------------------ primitives ------------------------------ */

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-60";

const variants = {
  primary: "bg-[var(--brand)] text-white shadow-sm hover:opacity-90 active:scale-[0.98]",
  secondary: "border bg-[var(--surface)] hover:bg-[var(--background)] active:scale-[0.98]",
  danger: "border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40",
  ghost: "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]",
} as const;

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4",
} as const;

type BtnProps = {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  full?: boolean;
};

export function Button({
  variant = "primary", size = "md", full, className = "", ...props
}: BtnProps & ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={`${buttonBase} ${variants[variant]} ${sizes[size]} ${full ? "w-full" : ""} ${className}`}
    />
  );
}

export function LinkButton({
  variant = "primary", size = "md", full, className = "", ...props
}: BtnProps & ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={`${buttonBase} ${variants[variant]} ${sizes[size]} ${full ? "w-full" : ""} ${className}`}
    />
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "brand" }) {
  const tones = {
    neutral: "bg-[var(--background)] text-[var(--muted)] border",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900",
    warning: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900",
    danger: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900",
    brand: "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900",
  } as const;
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function statusTone(status: string) {
  switch (status) {
    case "ACTIVE": return "success" as const;
    case "PENDING": return "warning" as const;
    case "SUSPENDED":
    case "EXPIRED":
    case "CANCELLED":
    case "LOCKED": return "danger" as const;
    default: return "neutral" as const;
  }
}

/* --------------------------- detail rendering --------------------------- */

export function DescriptionList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{it.label}</dt>
          <dd className="mt-1 break-words text-sm">{it.value || <span className="text-[var(--muted)]">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
