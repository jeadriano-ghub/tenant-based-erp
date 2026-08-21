import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const TOKEN = "seed-products-2026";

export async function POST(req: Request) {
  if (req.headers.get("x-db-push-token") !== TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = process.env.DATABASE_URL;
  if (!url) return NextResponse.json({ error: "no DATABASE_URL" }, { status: 500 });
  const sql = readFileSync(join(process.cwd(), "seed_products.sql"), "utf8");
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await client.query(sql);
    return NextResponse.json({ ok: true, message: "products seeded" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  } finally {
    await client.end();
  }
}
