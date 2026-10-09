import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

const control =
  "w-full rounded-xl border border-navy/16 bg-white px-4 text-base text-navy placeholder:text-muted/70 aria-[invalid=true]:border-bad";

type Base = { id: string; label: string; error?: string; hint?: ReactNode };

/** Labeled text input with an error line (CLAUDE.md accessibility rules). */
export function TextField({ id, label, error, hint, ...props }: Base & InputHTMLAttributes<HTMLInputElement>) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <input id={id} aria-invalid={!!error} aria-describedby={describedBy} className={`${control} min-h-12`} {...props} />
      {hint && <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-sm text-bad">{error}</p>}
    </div>
  );
}

export function TextAreaField({ id, label, error, hint, ...props }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <textarea id={id} aria-invalid={!!error} aria-describedby={describedBy} className={`${control} min-h-28 py-3`} {...props} />
      {hint && <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-sm text-bad">{error}</p>}
    </div>
  );
}
