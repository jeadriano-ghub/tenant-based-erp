import { controlClass } from "@/components/form";

// A GET-form filter bar. All filters live in one form, so they persist across submits.
// Submitting resets to page 1 (hidden input). The page reads searchParams server-side.
export function FilterBar({
  basePath,
  children,
}: {
  basePath: string;
  children: React.ReactNode;
}) {
  return (
    <form method="get" action={basePath} className="mb-4 flex flex-wrap items-end gap-3">
      <input type="hidden" name="page" value="1" />
      {children}
      <button
        type="submit"
        className="rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
      >
        Filter
      </button>
    </form>
  );
}

export function FilterInput({
  name,
  defaultValue,
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  placeholder: string;
}) {
  return (
    <input
      type="text"
      name={name}
      defaultValue={defaultValue ?? ""}
      placeholder={placeholder}
      className={`${controlClass} w-auto min-w-[12rem]`}
    />
  );
}

export function FilterSelect({
  name,
  defaultValue,
  placeholder,
  options,
}: {
  name: string;
  defaultValue?: string;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className={`${controlClass} w-auto min-w-[10rem]`}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
