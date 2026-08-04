"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export type NavItem = { href: string; label: string };

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    Overview: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6V11h-6v9Zm0-16v5h6V4h-6Z",
    "Tenant Management": "M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5",
    "Manage Users": "M17 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 20v-2a4 4 0 0 0-3-3.87",
    Roles: "M12 2 4 6v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6l-8-4Z",
    Permissions: "M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5V11Z",
    "Branch / Warehouse": "M3 21h18M4 21V8l8-5 8 5v13M9 21v-6h6v6",
  };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
      <path d={paths[name] ?? paths.Overview} />
    </svg>
  );
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {items.map((n) => {
        // Overview must match exactly; section links match their subtree.
        const active = n.href.endsWith("/dashboard")
          ? pathname === n.href
          : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-[var(--brand)] text-white shadow-sm"
                : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            }`}
          >
            <Icon name={n.label} />
            <span className="truncate">{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({
  title, subtitle, logoUrl, defaultLogoUrl,
}: {
  title: string; subtitle: string; logoUrl?: string | null; defaultLogoUrl?: string | null;
}) {
  const shown = logoUrl || defaultLogoUrl;
  return (
    <div className="flex items-center gap-3">
      {shown ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shown} alt="" className="h-9 w-9 shrink-0 rounded-lg object-contain" />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-xs font-bold text-white">
          JRA
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight">{title}</p>
        <p className="truncate text-xs text-[var(--muted)]">{subtitle}</p>
      </div>
    </div>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Profile({ user }: { user: { name: string; email: string; isSuperAdmin: boolean } }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-1">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-sm font-semibold text-white" aria-hidden>
        {initialsOf(user.name)}
      </div>
      <div className="hidden min-w-0 sm:block">
        <p className="truncate text-sm font-medium leading-tight">{user.name}</p>
        <p className="truncate text-xs text-[var(--muted)] leading-tight">{user.email}</p>
      </div>
    </div>
  );
}

function SignOutControl({ signOut }: { signOut: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--background)]"
      >
        Sign out
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border bg-[var(--surface)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">Sign out?</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              You&rsquo;ll need to log in again to access your workspace.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--background)]"
              >
                Cancel
              </button>
              {signOut}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function AppShell({
  nav, title, subtitle, logoUrl, defaultLogoUrl, user, signOut, bell, children,
}: {
  nav: NavItem[];
  title: string;
  subtitle: string;
  logoUrl?: string | null;
  defaultLogoUrl?: string | null;
  user: { name: string; email: string; isSuperAdmin: boolean };
  signOut: ReactNode;
  bell?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const headerControls = (
    <div className="flex items-center gap-2">
      {bell}
      <Profile user={user} />
      <SignOutControl signOut={signOut} />
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar (brand + nav only) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-[var(--surface)] lg:flex">
        <div className="border-b px-4 py-4">
          <Brand title={title} subtitle={subtitle} logoUrl={logoUrl} defaultLogoUrl={defaultLogoUrl} />
        </div>
        <div className="flex-1 overflow-y-auto p-3"><NavLinks items={nav} /></div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 flex w-[17rem] flex-col bg-[var(--surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-4">
              <Brand title={title} subtitle={subtitle} logoUrl={logoUrl} defaultLogoUrl={defaultLogoUrl} />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--background)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3"><NavLinks items={nav} onNavigate={() => setOpen(false)} /></div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Desktop top header (controls live here, not in the side menu) */}
        <header className="sticky top-0 z-30 hidden items-center justify-between border-b bg-[var(--surface)]/90 px-6 py-3 backdrop-blur lg:flex">
          <span className="text-sm text-[var(--muted)]">{title}</span>
          {headerControls}
        </header>

        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-[var(--surface)]/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="rounded-lg border p-2 transition-colors hover:bg-[var(--background)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <Brand title={title} subtitle={subtitle} logoUrl={logoUrl} defaultLogoUrl={defaultLogoUrl} />
          <div className="ml-auto">{headerControls}</div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
