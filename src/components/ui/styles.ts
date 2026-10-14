/** Shared class strings for the dashboard / admin shells (Stripe-style redesign). */

/** Borderless square-ish icon button (top bar): 44px on touch screens, 36px with a mouse. */
export const iconButton =
  "relative inline-flex size-11 pointer-fine:size-9 shrink-0 items-center justify-center rounded-[10px] text-muted transition-colors hover:bg-hover hover:text-navy";

/** Sidebar / menu row. Active rows add `navRowActive`. */
export const navRow =
  "flex min-h-11 md:min-h-9 items-center gap-2.5 rounded-lg border border-transparent px-2.5 text-[13.5px] font-medium text-muted transition-colors hover:bg-hover hover:text-navy [&_svg]:shrink-0 [&_svg]:text-faint";
export const navRowActive =
  "!border-line bg-card !text-blue font-semibold shadow-card hover:bg-card [&_svg]:!text-blue";

/** Top bar of the dashboard and admin: sticky, white, hairline bottom border. */
export const topBar =
  "sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-card/92 px-4 backdrop-blur md:h-[60px] md:px-8 print:hidden";
