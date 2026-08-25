import DashboardLayout, { type DashboardNavigationItem } from "@/components/DashboardLayout";
import { BookOpen, CircleHelp, CreditCard, FolderKanban, LayoutDashboard, PackageOpen, UserRound } from "lucide-react";

export const clientNavigation: DashboardNavigationItem[] = [
  { icon: LayoutDashboard, label: "Overview", path: "/client" },
  { icon: FolderKanban, label: "My projects", path: "/client/projects" },
  { icon: PackageOpen, label: "Purchases", path: "/client/purchases" },
  { icon: CreditCard, label: "Billing", path: "/client/billing" },
  { icon: UserRound, label: "Account", path: "/client/account" },
  { icon: CircleHelp, label: "Support", path: "/client/support" },
  { icon: BookOpen, label: "Resources", path: "/client/resources" },
];

export default function ClientAreaLayout({ children, title = "Client Side" }: { children: React.ReactNode; title?: string }) {
  return <DashboardLayout navigation={clientNavigation} title={title}>{children}</DashboardLayout>;
}
