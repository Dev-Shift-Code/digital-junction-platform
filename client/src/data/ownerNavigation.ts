import type { DashboardNavigationItem } from "@/components/DashboardLayout";
import { BadgePercent, Boxes, ChartNoAxesCombined, CircleHelp, FileText, FolderKanban, LayoutDashboard, Settings2, UsersRound } from "lucide-react";

export const ownerNavigation: DashboardNavigationItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/owner" },
  { icon: Boxes, label: "Inventory", path: "/owner/inventory" },
  { icon: FolderKanban, label: "Projects", path: "/owner/projects" },
  { icon: ChartNoAxesCombined, label: "Sales", path: "/owner/sales" },
  { icon: UsersRound, label: "Customers", path: "/owner/customers" },
  { icon: FileText, label: "Content", path: "/owner/content" },
  { icon: BadgePercent, label: "Vouchers", path: "/owner/vouchers" },
  { icon: Settings2, label: "Settings", path: "/owner/settings" },
  { icon: CircleHelp, label: "Support", path: "/owner/support" },
];
