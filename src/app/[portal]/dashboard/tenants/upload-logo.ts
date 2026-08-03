"use server";

import { requireSession, resolvePortal } from "@/lib/auth";
import { supabase, LOGO_BUCKET } from "@/lib/supabase";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export type UploadState = { error?: string; url?: string };

/**
 * Uploads a tenant logo to Supabase Storage and returns its public URL.
 * Only platform admins (tenantId === null) may call this.
 */
export async function uploadTenantLogoAction(_p: UploadState, fd: FormData): Promise<UploadState> {
  const slug = String(fd.get("portal") ?? "").trim().toLowerCase();
  const portal = await resolvePortal(slug);
  if (!portal) return { error: "Unknown portal." };
  const { session } = await requireSession(portal);
  if (!session) return { error: "Not authenticated." };
  if (session.tenantId !== null) return { error: "Only platform administrators may upload logos." };

  if (!supabase) return { error: "Storage is not configured." };

  const file = fd.get("logo") as File | null;
  if (!file || file.size === 0) return { error: "No file selected." };
  if (file.size > MAX_BYTES) return { error: "Logo must be 2 MB or smaller." };
  if (!ALLOWED.includes(file.type)) return { error: "Use PNG, JPG, WebP or SVG." };

  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  // Stable, collision-free path: tenant URL + timestamp.
  const subdomain = String(fd.get("subdomain") ?? "").trim().toLowerCase() || "tenant";
  const path = `${subdomain}-${Date.now()}.${ext}`;

  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: true });

  if (error) return { error: `Upload failed: ${error.message}` };

  const url = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
  return { url };
}
