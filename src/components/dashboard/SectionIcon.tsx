import {
  Activity, BadgeCheck, HandCoins, Bell, Briefcase, ChartColumn, CreditCard, House,
  Link2, MessageCircle, Palette, Pencil, Tag, type LucideProps,
} from "lucide-react";
import type { SectionKey } from "@/config/dashboard";

const ICONS: Record<SectionKey, React.ComponentType<LucideProps>> = {
  home: House,
  edit: Pencil,
  accounts: ChartColumn,
  work: Briefcase,
  rates: Tag,
  links: Link2,
  contact: MessageCircle,
  verification: BadgeCheck,
  appearance: Palette,
  analytics: Activity,
  referrals: HandCoins,
  subscription: CreditCard,
  notifications: Bell,
};

export function SectionIcon({ section, ...props }: { section: SectionKey } & LucideProps) {
  const Icon = ICONS[section];
  return <Icon aria-hidden="true" size={20} strokeWidth={1.8} {...props} />;
}
