import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "secondary";

const variants: Record<Variant, string> = {
  primary: "bg-navy text-white hover:bg-navy/90",
  accent: "bg-blue text-white hover:bg-blue/90",
  secondary: "border border-line bg-card text-navy hover:bg-bg",
};

/** Pill-shaped button with a 44px minimum touch target. */
export function buttonClasses(variant: Variant = "primary", className = "") {
  return `inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors disabled:opacity-50 ${variants[variant]} ${className}`;
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

export function Button({ variant = "primary", className, type = "button", ...props }: Props) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}
