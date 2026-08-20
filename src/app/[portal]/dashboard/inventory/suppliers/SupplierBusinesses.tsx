"use client";

import { useRef, useState } from "react";
import { controlClass } from "@/components/form";

export type SupplierBusinessInput = {
  businessName: string;
  tin: string;
  businessRegNo: string;
  isPrimary?: boolean;
};

export function SupplierBusinesses({ initial = [] }: { initial?: SupplierBusinessInput[] }) {
  const [rows, setRows] = useState<SupplierBusinessInput[]>(
    initial.length ? initial : [{ businessName: "", tin: "", businessRegNo: "", isPrimary: true }],
  );
  const counter = useRef(rows.length);

  const add = () => {
    counter.current += 1;
    setRows((r) => [...r, { businessName: "", tin: "", businessRegNo: "", isPrimary: false }]);
  };
  const update = (i: number, key: keyof SupplierBusinessInput, val: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: val } : row)));
  const remove = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));

  return (
    <div className="sm:col-span-2">
      <p className="mb-1.5 text-sm font-medium">Trading businesses</p>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1.4fr_1fr_1fr_auto] items-center gap-2">
            <input
              name={`biz_name_${i}`}
              value={row.businessName}
              onChange={(e) => update(i, "businessName", e.target.value)}
              placeholder="Business name"
              className={controlClass}
            />
            <input
              name={`biz_tin_${i}`}
              value={row.tin}
              onChange={(e) => update(i, "tin", e.target.value)}
              placeholder="TIN"
              className={controlClass}
            />
            <input
              name={`biz_reg_${i}`}
              value={row.businessRegNo}
              onChange={(e) => update(i, "businessRegNo", e.target.value)}
              placeholder="Business reg. no."
              className={controlClass}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={rows.length === 1}
              className="rounded-md border px-2 py-2 text-xs text-red-500 disabled:opacity-40"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 rounded-md border px-2 py-1 text-xs font-medium hover:bg-[var(--background)]"
      >
        + Add business
      </button>
    </div>
  );
}
