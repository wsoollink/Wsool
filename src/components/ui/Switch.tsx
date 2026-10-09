"use client";

type Props = {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Visible description under the label. */
  hint?: string;
  disabled?: boolean;
  /** Hide the visible label (it stays the accessible name). */
  labelHidden?: boolean;
};

/** 52×32 toggle from the dashboard design (role="switch"), inside a 44px row. */
export function Switch({ id, checked, onChange, label, hint, disabled, labelHidden }: Props) {
  const button = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={labelHidden ? label : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full p-1 transition-colors disabled:opacity-50 ${checked ? "bg-blue" : "bg-navy/15"}`}
    >
      <span
        aria-hidden="true"
        className={`size-6 rounded-full bg-white shadow-[0_1px_3px_rgba(2,25,65,0.25)] transition-transform ${checked ? "translate-x-5 rtl:-translate-x-5" : ""}`}
      />
    </button>
  );
  if (labelHidden) return <span className="inline-flex min-h-11 items-center">{button}</span>;
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4" htmlFor={id}>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
      {button}
    </label>
  );
}
