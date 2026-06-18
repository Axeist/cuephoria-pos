import {
  BarChart2,
  Bot,
  Calendar,
  CheckSquare,
  Clock,
  CreditCard,
  Globe,
  Home,
  Layers,
  Package,
  Rocket,
  Settings,
  Shield,
  ShoppingCart,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export const GUIDE_ICONS: Record<string, LucideIcon> = {
  rocket: Rocket,
  checklist: CheckSquare,
  home: Home,
  cart: ShoppingCart,
  clock: Clock,
  package: Package,
  users: Users,
  calendar: Calendar,
  trophy: Trophy,
  chart: BarChart2,
  staff: Users,
  settings: Settings,
  globe: Globe,
  bot: Bot,
  credit: CreditCard,
  shield: Shield,
  layers: Layers,
  zap: Zap,
};

export function getGuideIcon(key: string): LucideIcon {
  return GUIDE_ICONS[key] ?? Rocket;
}
