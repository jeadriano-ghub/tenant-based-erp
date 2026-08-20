import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

// TEMPORARY one-off migration. Protected by a one-time token.
const TOKEN = "inventory-v2-migrate-2026";

export async function POST(req: Request) {
  const token = req.headers.get("x-db-push-token");
  if (token !== TOKEN) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sql = readFileSync(join(process.cwd(), "inventory_v2_migration.sql"), "utf8");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    await client.query(sql);
    return NextResponse.json({ ok: true, message: "inventory v2 migration applied" });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  } finally {
    await client.end();
  }
}
