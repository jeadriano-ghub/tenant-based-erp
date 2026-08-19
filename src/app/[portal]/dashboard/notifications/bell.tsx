"use client";

import { useEffect, useRef, useState } from "react";
import { listNotifications, unreadCount, markReadAction, markAllReadAction } from "./actions";

type Note = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
};

const tone: Record<string, string> = {
  INFO: "bg-blue-500/15 text-blue-300",
  SUCCESS: "bg-emerald-500/15 text-emerald-300",
  WARNING: "bg-amber-500/15 text-amber-300",
  ERROR: "bg-red-500/15 text-red-300",
};

export function NotificationBell({ portal }: { portal: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function refresh() {
    try {
      const [list, count] = await Promise.all([listNotifications(portal), unreadCount(portal)]);
      setItems(list as Note[]);
      setUnread(count);
    } catch {
      // Avoid crashing the dashboard shell on backend/storage failures.
      setItems([]);
      setUnread(0);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markRead(id: string) {
    const fd = new FormData();
    fd.set("portal", portal);
    fd.set("id", id);
    await markReadAction({}, fd);
    refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((o) => !o); if (!open) refresh(); }}
        aria-label="Notifications"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border text-[var(--muted)] transition-colors hover:bg-[var(--background)] hover:text-[var(--foreground)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-[var(--surface)] shadow-2xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <div className="flex gap-2">
              <button
                onClick={async () => { const fd = new FormData(); fd.set("portal", portal); await markAllReadAction({}, fd); refresh(); }}
                className="text-xs text-[var(--brand)] hover:underline"
              >
                Mark all read
              </button>
              <a href={`${portal === "admin" ? "/admin" : `/${portal}`}/dashboard/notifications`} className="text-xs text-[var(--muted)] hover:underline">
                View all
              </a>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`flex w-full gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-[var(--background)] ${n.read ? "opacity-60" : ""}`}
                >
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-[var(--brand)]"}`} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{n.title}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${tone[n.type] ?? tone.INFO}`}>{n.type}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--muted)]">{n.message}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
