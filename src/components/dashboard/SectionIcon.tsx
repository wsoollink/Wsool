import {
  BadgeCheck, Bell, Briefcase, ChartColumn, CreditCard, Ellipsis, House,
  MessageCircle, Palette, Pencil, Tag, Users, type LucideProps,
} from "lucide-react";
import type { SectionKey } from "@/config/dashboard";

const ICONS: Record<SectionKey, React.ComponentType<LucideProps>> = {
  home: House,
  edit: Pencil,
  accounts: Users,
  work: Briefcase,
  rates: Tag,
  contact: MessageCircle,
  verification: BadgeCheck,
  appearance: Palette,
  analytics: ChartColumn,
  subscription: CreditCard,
  notifications: Bell,
  more: Ellipsis,
};

export function SectionIcon({ section, ...props }: { section: SectionKey } & LucideProps) {
  const Icon = ICONS[section];
  return <Icon aria-hidden="true" size={20} strokeWidth={1.8} {...props} />;
}
