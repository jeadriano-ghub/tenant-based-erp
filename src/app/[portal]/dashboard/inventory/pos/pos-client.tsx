"use client";

import { useActionState, useState } from "react";
import { PageHeader, Card } from "@/components/ui";
import BarcodeScanner, { LookupResult } from "@/components/barcode-scanner";
import CameraScanner from "@/components/camera-scanner";
import { saveStockMovementAction } from "../../actions";
import type { ActionState } from "@/app/[portal]/dashboard/actions";

type CartItem = LookupResult & { quantity: number };

export default function PosClient({ portal }: { portal: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveStockMovementAction, {});
  const [movementType, setMovementType] = useState("SALE");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (result: LookupResult) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === result.id);
      if (existing) {
        return prev.map((item) => (item.id === result.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prev, { ...result, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setCart((prev) => prev.map((item) => (item.id === id ? { ...item, quantity } : item)));
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSubmit = (formData: FormData) => {
    formData.set("portal", portal);
    formData.set("type", movementType);
    formData.set("reference", reference);
    formData.set("notes", notes);
    formData.set("quantity", String(totalItems));

    const first = cart[0];
    if (first) {
      formData.set("productId", first.id);
      if (first.productType === "SERIALIZED" && first.serialNo) {
        formData.set("serialId", first.serialNo);
      }
      if (first.productType === "BARCODE" && first.barcode) {
        formData.set("barcode", first.barcode);
      }
    }

    formAction(formData);
    setCart([]);
    setReference("");
    setNotes("");
  };

  return (
    <div>
      <PageHeader title="Point of sale" description="Fast stock-out sales and receipts." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-sm font-semibold">Scan / lookup</h3>
          <div className="mt-2 space-y-3">
            <CameraScanner onDetected={(r) => addToCart({ ...r, name: r.barcode, productType: "BARCODE" } as any)} />
            <BarcodeScanner portal={portal} onResult={addToCart} />
          </div>
          <div className="mt-4">
            <label className="text-xs font-medium text-[var(--muted)]">Movement type</label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm"
            >
              <option value="PURCHASE">Purchase / stock-in</option>
              <option value="SALE">Sale / stock-out</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="RETURN">Return</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>
          <div className="mt-3">
            <label className="text-xs font-medium text-[var(--muted)]">Reference</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Receipt/ref no." className="mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm" />
          </div>
          <div className="mt-3">
            <label className="text-xs font-medium text-[var(--muted)]">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm" />
          </div>

          <form action={handleSubmit} className="mt-4">
            <input type="hidden" name="portal" value={portal} />
            <input type="hidden" name="productId" value={cart[0]?.id ?? ""} />
            <input type="hidden" name="quantity" value={String(totalItems)} />
            <input type="hidden" name="type" value={movementType} />
            <input type="hidden" name="reference" value={reference} />
            <input type="hidden" name="notes" value={notes} />
            <input type="hidden" name="serialId" value={cart[0]?.serialNo ?? ""} />
            <input type="hidden" name="barcode" value={cart[0]?.barcode ?? ""} />
            <button type="submit" className="w-full rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90">
              Save movement
            </button>
          </form>

          {state?.error && <p className="mt-2 text-sm text-red-500">{state.error}</p>}
          {state?.success && <p className="mt-2 text-sm text-green-600">{state.success}</p>}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold">Cart</h3>
          {cart.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">Scan a barcode, SKU, or serial to add items.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {item.productType} · {item.sku || item.serialNo || item.barcode}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.lowStock && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Low stock</span>}
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, parseInt(e.target.value || "1", 10))}
                      className="w-16 rounded-lg border bg-[var(--background)] px-2 py-1 text-sm"
                    />
                    <button type="button" onClick={() => removeFromCart(item.id)} className="text-sm text-red-500">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 text-sm text-[var(--muted)]">Total scanned items: {totalItems}</div>
        </Card>
      </div>
    </div>
  );
}
