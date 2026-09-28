import {
  Bell,
  ChartCandlestick,
  LayoutDashboard,
  Newspaper,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  /** Page title shown in the top bar. */
  title: string;
  href: string | null; // null = not built yet
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Overview", title: "Gold Market Overview", href: "/", icon: LayoutDashboard },
  { label: "Market", title: "Market Data", href: "/market", icon: ChartCandlestick },
  { label: "Predictions", title: "Predictions", href: null, icon: Sparkles },
  { label: "News Impact", title: "News Impact", href: null, icon: Newspaper },
  { label: "Alerts", title: "Alerts", href: null, icon: Bell },
];

export function pageTitle(pathname: string): string {
  return NAV_ITEMS.find((item) => item.href === pathname)?.title ?? "Gold Market";
}
