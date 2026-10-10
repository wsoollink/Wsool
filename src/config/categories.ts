/** How many categories a creator can pick (owner manages the list in the admin panel). */
export const MAX_PAGE_CATEGORIES = 2;
/** Longest category list the owner can keep. */
export const MAX_CATEGORIES = 40;

export type CategoryItem = { id: string; nameAr: string; nameEn: string };

/** A category's name in the given language. */
export const categoryName = (c: { nameAr: string; nameEn: string }, lang: "ar" | "en") => (lang === "ar" ? c.nameAr : c.nameEn);
