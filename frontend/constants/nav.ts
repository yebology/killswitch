import { LayoutDashboard, Shield, type LucideIcon } from "lucide-react";

/** A navigation item rendered in the Sidebar. */
export interface NavItem {
  /** Display label for the menu item. */
  label: string;
  /** Route path this item links to. */
  path: string;
  /** Lucide icon component rendered beside the label. */
  icon: LucideIcon;
  /** Whether this route is accessible without wallet authentication. */
  isPublic: boolean;
}

/**
 * Primary navigation items for the Navbar.
 * Order determines display order in the menu.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    isPublic: false,
  },
  {
    label: "Protocols",
    path: "/protocols",
    icon: Shield,
    isPublic: false,
  },
];
