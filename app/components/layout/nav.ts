import {
  IconAlertTriangle,
  IconBell,
  IconBuildingCommunity,
  IconChartBar,
  IconCircleCheck,
  IconCamera,
  IconHome,
  IconLayoutDashboard,
  IconMap,
  IconPhone,
  IconRobot,
  IconSettings,
  IconShieldCheck,
  IconUsers,
  IconUserCircle,
  IconMapPin,
  IconCode,
  IconSparkles,
  IconMapSearch,
  type Icon,
} from "@tabler/icons-react";

export interface NavItem {
  to: string;
  label: string;
  icon: Icon;
  end?: boolean;
}

export const PUBLIC_NAV: NavItem[] = [
  { to: "/", label: "Home", icon: IconHome, end: true },
  { to: "/report", label: "Report Waste", icon: IconCamera },
  { to: "/problems", label: "Active Problems", icon: IconAlertTriangle },
  { to: "/resolved", label: "Resolved", icon: IconCircleCheck },
  { to: "/map", label: "Map", icon: IconMap },
  { to: "/authorities", label: "Authorities", icon: IconBuildingCommunity },
  { to: "/analytics", label: "Analytics", icon: IconChartBar },
  { to: "/forecast", label: "AI Forecast", icon: IconRobot },
  { to: "/profile", label: "Profile", icon: IconUserCircle },
  { to: "/contact", label: "Contact", icon: IconPhone },
];

export const MOBILE_NAV: NavItem[] = [
  { to: "/", label: "Home", icon: IconHome, end: true },
  { to: "/problems", label: "Problems", icon: IconAlertTriangle },
  { to: "/map", label: "Map", icon: IconMapPin },
  { to: "/profile", label: "Profile", icon: IconUserCircle },
];

export const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: IconLayoutDashboard, end: true },
  { to: "/admin/reports", label: "Reports", icon: IconAlertTriangle },
  { to: "/admin/users", label: "Users", icon: IconUsers },
  { to: "/admin/authorities", label: "Authorities", icon: IconBuildingCommunity },
  { to: "/admin/areas", label: "Areas/Wards", icon: IconMapSearch },
  { to: "/admin/ai-review", label: "AI Classifications", icon: IconSparkles },
  { to: "/admin/analytics", label: "Analytics", icon: IconChartBar },
  { to: "/admin/developer-contact", label: "Developer Contact", icon: IconCode },
  { to: "/admin/settings", label: "Settings", icon: IconSettings },
];

export const ADMIN_ENTRY_ICON = IconShieldCheck;
