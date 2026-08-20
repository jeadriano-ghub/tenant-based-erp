"use client";

import { useState, useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { controlClass, type ActionState } from "@/components/form";
import { savePurchaseOrderAction } from "@/app/[portal]/dashboard/actions";

type SupplierOpt = { id: string; name: string; termsDays: number | null };
type ProductOpt = { id: string; name: string; sku: string; costPrice: number | null };

export function PurchaseOrderForm({
  suppliers,
  products,
  portal,
  redirectOnSuccess,
  cancelHref,
}: {
  suppliers: SupplierOpt[];
  products: ProductOpt[];
  portal: string;
  redirectOnSuccess: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(savePurchaseOrderAction, {});
  const router = useRouter();
  useEffect(() => {
    if (state?.success && redirectOnSuccess) {
      router.push(redirectOnSuccess);
    }
  }, [state, redirectOnSuccess, router]);
  const [supplierId, setSupplierId] = useState("");
  const [termsDays, setTermsDays] = useState("30");
  const [productId, setProductId] = useState("");

  const onSupplier = (id: string) => {
    setSupplierId(id);
    const s = suppliers.find((x) => x.id === id);
    setTermsDays(String(s?.termsDays ?? 30));
  };

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="portal" value={portal} />
      {state?.error && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {state.error}
        </div>
      )}
      {state?.success && <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">{state.success}</div>}

      <section className="border-b py-6 first:pt-0">
        <div className="grid gap-5 lg:grid-cols-[15rem_1fr] lg:gap-8">
          <div>
            <h3 className="text-sm font-semibold">Purchase order</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              Pick a supplier (terms auto-fill) and select the first product for this order.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Supplier <span className="text-red-500">*</span></label>
              <select name="supplierId" value={supplierId} onChange={(e) => onSupplier(e.target.value)} required className={controlClass}>
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <Field label="Reference no." name="referenceNo" />
            <Field label="Payment terms (days)" name="termsDays" value={termsDays} onChange={(e) => setTermsDays(e.target.value)} type="number" />
            <Field label="Expected date" name="expectedDate" type="date" />
          </div>
        </div>
      </section>

      <section className="border-b py-6 last:border-b-0 last:pb-0">
        <div className="grid gap-5 lg:grid-cols-[15rem_1fr] lg:gap-8">
          <div>
            <h3 className="text-sm font-semibold">First product</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              A product must be selected to create the purchase order.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Product <span className="text-red-500">*</span></label>
              <select name="productId" value={productId} onChange={(e) => setProductId(e.target.value)} required className={controlClass}>
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>
            <Field label="Quantity" name="quantity" type="number" />
            <Field label="Unit cost" name="unitCost" type="number" step="0.01" />
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-2 border-t pt-4">
        <a href={cancelHref} className="inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors hover:bg-[var(--background)]">Cancel</a>
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--brand)] px-4 text-sm font-medium text-white transition-colors disabled:opacity-60">
      {pending ? "Saving…" : "Save purchase order"}
    </button>
  );
}

function Field({ label, name, type = "text", value, onChange, step }: { label: string; name: string; type?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; step?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input name={name} type={type} value={value} onChange={onChange} step={step} className={controlClass} />
    </div>
  );
}
