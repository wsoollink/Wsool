import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "secondary";

const variants: Record<Variant, string> = {
  primary: "border border-blue bg-blue text-on-blue hover:bg-blue/90 active:bg-[#004BB5] dark:active:bg-blue/75",
  accent: "border border-blue bg-blue text-on-blue hover:bg-blue/90 active:bg-[#004BB5] dark:active:bg-blue/75",
  // Stripe-style: white surface, hairline border, soft shadow.
  secondary: "border border-line bg-card text-navy shadow-card hover:bg-hover active:border-blue/40 active:bg-blue/10 active:text-blue",
};

/** Pill-shaped button: 44px tall on touch screens, 38px with a mouse. */
export function buttonClasses(variant: Variant = "primary", className = "") {
  return `inline-flex min-h-11 pointer-fine:min-h-[38px] items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-[color,background-color,border-color,transform,filter] duration-150 disabled:opacity-50 ${variants[variant]} ${className}`;
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

export function Button({ variant = "primary", className, type = "button", ...props }: Props) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}
