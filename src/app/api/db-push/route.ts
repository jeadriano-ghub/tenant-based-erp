import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

// TEMPORARY migration endpoint. Protected by a one-time token.
// Executes the bundled inventory migration SQL against the runtime DATABASE_URL
// (which Vercel injects into the deployed app). Removed after the inventory
// tables are created.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TOKEN = "fix-inventory-tables-2026";

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
    return NextResponse.json({ ok: false, error: "DATABASE_URL not set in runtime env" }, { status: 500 });
  }
  // The migration script is committed at the project root and ships with the deploy.
  const sqlPath = join(process.cwd(), "inventory_migration.sql");
  let sql: string;
  try {
    sql = readFileSync(sqlPath, "utf8");
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: `cannot read migration file: ${String(e?.message || e)}` }, { status: 500 });
  }
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    await client.query(sql);
    return NextResponse.json({ ok: true, message: "inventory migration applied" });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 },
    );
  } finally {
    await client.end().catch(() => {});
  }
}
