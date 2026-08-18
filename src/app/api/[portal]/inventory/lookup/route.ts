import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ portal: string }> }) {
  try {
    const { portal: slug } = await params;
    const session = await requireSessionBySlug(slug);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { mode, query } = body || {};

    if (!mode || !query || typeof query !== "string") {
      return NextResponse.json({ error: "mode and query are required." }, { status: 400 });
    }

    const q = query.trim();
    if (!q) return NextResponse.json({ error: "Query is empty." }, { status: 400 });

    let result: { id: string; name: string; sku?: string; barcode?: string; serialNo?: string; productType?: string; lowStock?: boolean } | null = null;

    if (mode === "barcode") {
      const barcode = await prisma.productBarcode.findFirst({
        where: { barcode: q, tenantId: session.tenantId! },
        include: { product: { select: { id: true, name: true, sku: true, productType: true } } },
      });
      if (!barcode) return NextResponse.json({ error: "Barcode not found." }, { status: 404 });
      const stock = await prisma.productStockLevel.findFirst({
        where: { tenantId: session.tenantId!, productId: barcode.product.id },
        select: { quantity: true },
      });
      result = {
        id: barcode.product.id,
        name: barcode.product.name,
        sku: barcode.product.sku,
        barcode: q,
        productType: barcode.product.productType,
        lowStock: Number(stock?.quantity || 0) <= 0,
      };
    } else if (mode === "sku") {
      const product = await prisma.product.findFirst({ where: { sku: q, tenantId: session.tenantId! } });
      if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
      const stock = await prisma.productStockLevel.findFirst({
        where: { tenantId: session.tenantId!, productId: product.id },
        select: { quantity: true },
      });
      result = {
        id: product.id,
        name: product.name,
        sku: product.sku,
        productType: product.productType,
        lowStock: Number(stock?.quantity || 0) <= 0,
      };
    } else if (mode === "serial") {
      const serial = await prisma.productSerial.findFirst({
        where: { serialNo: q, tenantId: session.tenantId! },
        include: { product: { select: { id: true, name: true, sku: true, productType: true } } },
      });
      if (!serial) return NextResponse.json({ error: "Serial not found." }, { status: 404 });
      const stock = await prisma.productStockLevel.findFirst({
        where: { tenantId: session.tenantId!, productId: serial.product.id },
        select: { quantity: true },
      });
      result = {
        id: serial.product.id,
        name: serial.product.name,
        sku: serial.product.sku,
        serialNo: q,
        productType: serial.product.productType,
        lowStock: Number(stock?.quantity || 0) <= 0,
      };
    } else {
      return NextResponse.json({ error: "Unsupported mode." }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

async function requireSessionBySlug(slug: string) {
  // Reuse existing auth path helper pattern.
  const { resolvePortal } = await import("@/lib/auth");
  const portal = await resolvePortal(slug);
  if (!portal) return null;
  const { session } = await (await import("@/lib/auth")).requireSession(portal);
  return session;
}
