/** Search field with a leading glyph and a clear button (no native search-cancel control). */
export function InventorySearch({
  value,
  onChange,
  id = "owner-search",
  label = "Search",
  placeholder = "Face ID, street or neighbourhood",
  className = "flex min-w-0 flex-col gap-1.5",
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  label?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-small text-ink">{label}</label>
      <div className="relative">
        <svg aria-hidden width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          <circle cx="9" cy="9" r="5.5" />
          <path d="m13.2 13.2 3.8 3.8" />
        </svg>
        <input
          id={id}
          data-testid={id}
          type="text"
          inputMode="search"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="block h-10 w-full rounded-md border border-line bg-surface pl-9 pr-9 text-body text-ink placeholder:text-muted transition-[border-color,box-shadow] duration-200 hover:border-[color-mix(in_oklab,var(--line),var(--ink)_25%)] focus:border-cobalt focus:outline-none focus:ring-[3px] focus:ring-cobalt/20"
        />
        {value ? (
          <button type="button" aria-label="Clear search" onClick={() => onChange("")} className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-xs text-muted hover:bg-panel hover:text-ink">
            <svg aria-hidden width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m5 5 10 10M15 5 5 15" /></svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
