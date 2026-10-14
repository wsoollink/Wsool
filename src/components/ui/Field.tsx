import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

const control =
  "w-full rounded-[10px] border border-navy/15 bg-card px-3.5 text-[15px] text-navy shadow-card transition-[border-color,box-shadow] outline-none placeholder:text-muted/70 focus:border-blue focus:ring-3 focus:ring-blue/15 aria-[invalid=true]:border-bad";

type Base = { id: string; label: string; error?: string; hint?: ReactNode; /** e.g. "12/80", shown at the end of the label row. */ counter?: string };

/** Labeled text input with an error line (CLAUDE.md accessibility rules). */
function LabelRow({ id, label, counter }: { id: string; label: string; counter?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {counter && <span dir="ltr" className="text-xs text-muted" aria-hidden="true">{counter}</span>}
    </div>
  );
}

export function TextField({ id, label, error, hint, counter, ...props }: Base & InputHTMLAttributes<HTMLInputElement>) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <LabelRow id={id} label={label} counter={counter} />
      <input id={id} aria-invalid={!!error} aria-describedby={describedBy} className={`${control} min-h-11`} {...props} />
      {hint && <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-sm text-bad">{error}</p>}
    </div>
  );
}

export function TextAreaField({ id, label, error, hint, counter, ...props }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <LabelRow id={id} label={label} counter={counter} />
      <textarea id={id} aria-invalid={!!error} aria-describedby={describedBy} className={`${control} min-h-28 py-3`} {...props} />
      {hint && <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-sm text-bad">{error}</p>}
    </div>
  );
}
