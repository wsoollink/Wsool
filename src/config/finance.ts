/** Finance settings (admin panel + investor links). */
export const EXPENSE_CATEGORIES = ["hosting", "software", "marketing", "salaries", "payment_fees", "legal", "other"] as const;
export const RECURRENCES = ["none", "monthly", "yearly"] as const;
export const FINANCE_PERIODS = [3, 6, 12] as const;
/** What an investor link can show (never personal user data). */
export const INVESTOR_SECTIONS = ["revenue", "pnl", "unit", "growth"] as const;
export type InvestorSection = (typeof INVESTOR_SECTIONS)[number];
