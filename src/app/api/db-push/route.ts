import { NextResponse } from "next/server";
import { execSync } from "node:child_process";

// TEMPORARY migration endpoint. Protected by a one-time token.
// Runs `prisma db push` using the runtime DATABASE_URL (which Vercel injects
// into the deployed app). Removed after the inventory tables are created.
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
  try {
    const out = execSync("./node_modules/.bin/prisma db push --accept-data-loss", {
      cwd: process.cwd(),
      env: process.env,
      timeout: 55000,
      encoding: "utf8",
    });
    return NextResponse.json({ ok: true, output: out.toString() });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e), stdout: e?.stdout?.toString?.() || "", stderr: e?.stderr?.toString?.() || "" },
      { status: 500 },
    );
  }
}
