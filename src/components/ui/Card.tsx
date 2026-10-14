import type { HTMLAttributes, ReactNode } from "react";

/** Dashboard / admin card (Stripe-style redesign): white surface, hairline border, soft shadow. */
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-card border border-line bg-card p-5 shadow-card ${className}`} {...props} />;
}

type PanelProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title: ReactNode;
  /** Small muted text or a link at the end of the header row. */
  aside?: ReactNode;
  /** Body without padding (tables, lists that run edge to edge). */
  flush?: boolean;
  bodyClassName?: string;
};

/** Card with a header row (title + aside) over a divider, then the body. */
export function Panel({ title, aside, flush, className = "", bodyClassName = "", children, ...props }: PanelProps) {
  return (
    <section className={`flex flex-col rounded-card border border-line bg-card shadow-card ${className}`} {...props}>
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-line-soft px-5 py-3">
        <h2 className="text-[14.5px] font-bold">{title}</h2>
        {aside && <div className="flex shrink-0 items-center gap-2 text-[12.5px] text-muted">{aside}</div>}
      </div>
      <div className={`flex-1 ${flush ? "" : "p-5"} ${bodyClassName}`}>{children}</div>
    </section>
  );
}
