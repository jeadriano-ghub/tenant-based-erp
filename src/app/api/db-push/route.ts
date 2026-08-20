import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

// TEMPORARY one-off migration. Protected by a one-time token.
// Runs the bundled SQL against the runtime DATABASE_URL. Removed after use.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TOKEN = "alter-product-prices-2026";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({ error: "only in production" }, { status: 400 });
  }
  const token = request.headers.get("x-db-push-token");
  if (token !== TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL not set" }, { status: 500 });
  }
  const sql = readFileSync(join(process.cwd(), "tmp_alter_product.sql"), "utf8");
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    await client.query(sql);
    return NextResponse.json({ ok: true, message: "alter applied" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  } finally {
    await client.end().catch(() => {});
  }
}
