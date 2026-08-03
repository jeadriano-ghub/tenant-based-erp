"use client";

import { useState, useRef, useTransition } from "react";
import { uploadTenantLogoAction } from "./upload-logo";

/**
 * File picker that uploads the chosen logo to Supabase Storage and writes the
 * resulting public URL into the hidden `logoUrl` field the parent form submits.
 * Shows a live preview and any upload error.
 */
export function LogoUploadField({
  portal, subdomain, defaultValue,
}: {
  portal: string;
  subdomain?: string;
  defaultValue?: string | null;
}) {
  const [url, setUrl] = useState<string | null>(defaultValue ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("portal", portal);
    if (subdomain) fd.set("subdomain", subdomain);
    fd.set("logo", file);
    startTransition(async () => {
      const res = await uploadTenantLogoAction({}, fd);
      setBusy(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      setUrl(res.url ?? null);
    });
  }

  return (
    <div className="sm:col-span-2">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-[var(--background)]">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Tenant logo preview" className="h-full w-full object-contain" />
          ) : (
            <span className="text-[11px] font-semibold text-[var(--muted)]">LOGO</span>
          )}
        </div>
        <div className="min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="block w-full max-w-sm text-sm text-[var(--muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--brand)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:opacity-90"
            onChange={(e) => onPick(e.target.files?.[0])}
            disabled={busy || pending}
          />
          <p className="mt-1 text-xs text-[var(--muted)]">PNG, JPG, WebP or SVG · max 2 MB</p>
          {busy || pending ? <p className="mt-1 text-xs text-[var(--brand)]">Uploading…</p> : null}
          {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
        </div>
      </div>
      {/* Hidden field carries the uploaded URL (or manual override) into the save action. */}
      <input type="hidden" name="logoUrl" value={url ?? ""} />
      <div className="mt-2">
        <label className="text-xs text-[var(--muted)]">
          Or paste a logo URL
          <input
            type="url"
            name="logoUrlManual"
            defaultValue={defaultValue ?? ""}
            placeholder="https://…/logo.png"
            onChange={(e) => setUrl(e.target.value || null)}
            className="mt-1 w-full max-w-sm rounded-lg border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
          />
        </label>
      </div>
    </div>
  );
}
