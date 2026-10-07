import type { HTMLAttributes } from "react";

/** White dashboard card with a soft border. */
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card border border-line bg-card p-5 shadow-card ${className}`}
      {...props}
    />
  );
}
