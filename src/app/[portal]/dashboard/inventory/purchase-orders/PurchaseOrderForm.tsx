"use client";

import { useState, useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { controlClass, type ActionState } from "@/components/form";
import { savePurchaseOrderAction } from "@/app/[portal]/dashboard/actions";

type SupplierOpt = { id: string; name: string; termsDays: number | null };
type ProductOpt = { id: string; name: string; sku: string; costPrice: number | null; categoryId: string | null };
type CategoryOpt = { id: string; name: string };

type Row = { id: string; productId: string; quantity: string; unitCost: string };

const uid = () => Math.random().toString(36).slice(2, 9);

export function PurchaseOrderForm({
  suppliers,
  products,
  categories,
  globalTaxRate,
  portal,
  redirectOnSuccess,
  cancelHref,
  defaults,
}: {
  suppliers: SupplierOpt[];
  products: ProductOpt[];
  categories: CategoryOpt[];
  globalTaxRate: number;
  portal: string;
  redirectOnSuccess: string;
  cancelHref: string;
  defaults?: {
    supplierId?: string;
    referenceNo?: string;
    termsDays?: number | null;
    expectedDate?: string;
    notes?: string;
    remarks?: string;
    taxExempt?: boolean;
    taxRate?: number | null;
    supplierCreditApplied?: number | null;
    earnedCredit?: number | null;
    earnedCreditScope?: string;
    earnedCreditCategoryIds?: string[];
    earnedCreditProductIds?: string[];
  };
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(savePurchaseOrderAction, {});
  const router = useRouter();
  useEffect(() => {
    if (state?.success && redirectOnSuccess) router.push(redirectOnSuccess);
  }, [state, redirectOnSuccess, router]);

  const [supplierId, setSupplierId] = useState(defaults?.supplierId ?? "");
  const [termsDays, setTermsDays] = useState(String(defaults?.termsDays ?? 30));
  const [taxExempt, setTaxExempt] = useState(Boolean(defaults?.taxExempt));
  const [taxRate, setTaxRate] = useState(String(defaults?.taxRate ?? globalTaxRate));
  const [rows, setRows] = useState<Row[]>(
    defaults?.supplierId
      ? [{ id: uid(), productId: "", quantity: "", unitCost: "" }]
      : [{ id: uid(), productId: "", quantity: "", unitCost: "" }],
  );
  const [supplierCredit, setSupplierCredit] = useState(String(defaults?.supplierCreditApplied ?? ""));
  const [earnedCredit, setEarnedCredit] = useState(String(defaults?.earnedCredit ?? ""));
  const [earnedScope, setEarnedScope] = useState(defaults?.earnedCreditScope ?? "any");

  const onSupplier = (id: string) => {
    setSupplierId(id);
    const s = suppliers.find((x) => x.id === id);
    setTermsDays(String(s?.termsDays ?? 30));
  };

  const addRow = () => setRows((r) => [...r, { id: uid(), productId: "", quantity: "", unitCost: "" }]);
  const updateRow = (id: string, key: keyof Row, val: string) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, [key]: val } : x)));

  const onProduct = (id: string, productId: string) => {
    const p = products.find((x) => x.id === productId);
    setRows((r) =>
      r.map((x) => {
        if (x.id !== id) return x;
        // Auto-fill unit cost from the product's current costPrice when a product is picked,
        // but don't overwrite a cost the user has already typed.
        const unitCost = productId && (x.unitCost === "" || x.unitCost == null)
          ? String(p?.costPrice ?? "")
          : x.unitCost;
        return { ...x, productId, unitCost };
      }),
    );
  };
  const removeRow = (id: string) => setRows((r) => r.filter((x) => x.id !== id));

  const subtotal = rows.reduce((sum, r) => {
    const q = parseFloat(r.quantity) || 0;
    const c = parseFloat(r.unitCost) || 0;
    return sum + q * c;
  }, 0);
  const taxAmount = taxExempt ? 0 : subtotal * (parseFloat(taxRate) || 0) / 100;
  const credit = parseFloat(supplierCredit) || 0;
  const grandTotal = Math.max(0, subtotal + taxAmount - credit);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="portal" value={portal} />
      {state?.error && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {state.error}
        </div>
      )}

      <section className="border-b py-6 first:pt-0">
        <div className="grid gap-5 lg:grid-cols-[15rem_1fr] lg:gap-8">
          <div>
            <h3 className="text-sm font-semibold">Purchase order</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Pick a supplier (terms auto-fill) and add the products for this order.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Supplier <span className="text-red-500">*</span></label>
              <select name="supplierId" value={supplierId} onChange={(e) => onSupplier(e.target.value)} required className={controlClass}>
                <option value="">Select supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <Field label="Reference no." name="referenceNo" defaultValue={defaults?.referenceNo} />
            <Field label="Payment terms (days)" name="termsDays" value={termsDays} onChange={(e) => setTermsDays(e.target.value)} type="number" />
            <Field label="Expected date" name="expectedDate" type="date" defaultValue={defaults?.expectedDate} />
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Notes</label>
              <textarea name="notes" defaultValue={defaults?.notes} className={controlClass} rows={2} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Remarks</label>
              <textarea name="remarks" defaultValue={defaults?.remarks} className={controlClass} rows={2} />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b py-6">
        <div className="grid gap-5 lg:grid-cols-[15rem_1fr] lg:gap-8">
          <div>
            <h3 className="text-sm font-semibold">Products</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Add one or more products to this purchase order.</p>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-[1.6fr_0.7fr_0.9fr_auto] gap-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
              <span>Product</span>
              <span>Qty</span>
              <span>Unit cost</span>
              <span />
            </div>
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-[1.6fr_0.7fr_0.9fr_auto] items-center gap-2">
                <select name="productId" value={r.productId} onChange={(e) => onProduct(r.id, e.target.value)} required className={controlClass}>
                  <option value="">Select product</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku}){p.costPrice != null ? ` · ₱${Number(p.costPrice).toFixed(2)}` : ""}</option>)}
                </select>
                <input name="quantity" type="number" min="1" value={r.quantity} onChange={(e) => updateRow(r.id, "quantity", e.target.value)} placeholder="Qty" className={controlClass} />
                <input name="unitCost" type="number" step="0.01" value={r.unitCost} onChange={(e) => updateRow(r.id, "unitCost", e.target.value)} placeholder="Cost" className={controlClass} />
                <button type="button" onClick={() => removeRow(r.id)} disabled={rows.length === 1} className="rounded-md border px-2 py-2 text-xs text-red-500 disabled:opacity-40">✕</button>
              </div>
            ))}
            <button type="button" onClick={addRow} className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-[var(--background)]">+ Add product</button>
          </div>
        </div>
      </section>

      <section className="border-b py-6">
        <div className="grid gap-5 lg:grid-cols-[15rem_1fr] lg:gap-8">
          <div>
            <h3 className="text-sm font-semibold">Taxes &amp; credit</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Tax defaults to the global rate ({globalTaxRate}%). Apply a supplier credit if available.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="taxExempt" checked={taxExempt} onChange={(e) => setTaxExempt(e.target.checked)} className="accent-[var(--brand)]" />
              Tax exempt
            </label>
            <Field label="Tax rate (%)" name="taxRate" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} type="number" step="0.01" />
            <Field label="Supplier credit applied" name="supplierCreditApplied" value={supplierCredit} onChange={(e) => setSupplierCredit(e.target.value)} type="number" step="0.01" />
            <Field label="Earned credit (reward)" name="earnedCredit" value={earnedCredit} onChange={(e) => setEarnedCredit(e.target.value)} type="number" step="0.01" />
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Earned credit usable on</label>
              <select value={earnedScope} onChange={(e) => setEarnedScope(e.target.value)} className={controlClass}>
                <option value="any">Any purchase</option>
                <option value="category">Specific categories</option>
                <option value="product">Specific products</option>
              </select>
            </div>
            {earnedScope === "category" && (
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Allowed categories</label>
                <select multiple name="earnedCreditCategoryIds" defaultValue={defaults?.earnedCreditCategoryIds ?? []} className={`${controlClass} h-32`}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <p className="mt-1 text-xs text-[var(--muted)]">Hold Ctrl/Cmd to select multiple.</p>
              </div>
            )}
            {earnedScope === "product" && (
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Allowed products</label>
                <select multiple name="earnedCreditProductIds" defaultValue={defaults?.earnedCreditProductIds ?? []} className={`${controlClass} h-32`}>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
                <p className="mt-1 text-xs text-[var(--muted)]">Hold Ctrl/Cmd to select multiple.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-6 last:pb-0">
        <div className="grid gap-5 lg:grid-cols-[15rem_1fr] lg:gap-8">
          <div><h3 className="text-sm font-semibold">Summary</h3></div>
          <div className="space-y-1 text-sm">
            <Line label="Subtotal" value={`₱${subtotal.toFixed(2)}`} />
            <Line label={`Tax${taxExempt ? " (exempt)" : ` (${taxRate}%)`}`} value={`₱${taxAmount.toFixed(2)}`} />
            <Line label="Invoice amount (cost + tax)" value={`₱${(subtotal + taxAmount).toFixed(2)}`} bold />
            <Line label="Supplier credit" value={`− ₱${credit.toFixed(2)}`} />
            <Line label="Grand total" value={`₱${grandTotal.toFixed(2)}`} bold />
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

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-[var(--muted)]">{label}</span>
      <span>{value}</span>
    </div>
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

function Field({ label, name, type = "text", value, defaultValue, onChange, step }: { label: string; name: string; type?: string; value?: string; defaultValue?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; step?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input name={name} type={type} value={value} defaultValue={defaultValue} onChange={onChange} step={step} className={controlClass} />
    </div>
  );
}
