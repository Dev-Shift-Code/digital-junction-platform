import { Link, useLocation } from "wouter";
import { LayoutDashboard } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout, { type DashboardNavigationItem } from "@/components/DashboardLayout";

export const clientNavigation: DashboardNavigationItem[] = [
  { icon: LayoutDashboard, label: "Overview", path: "/client" },
];

const customerTabs = [
  { label: "Dashboard", path: "/client" },
  { label: "My Purchases", path: "/client/purchases" },
  { label: "Billing & Invoices", path: "/client/billing" },
];

export default function ClientAreaLayout({ children, title = "Client Side" }: { children: React.ReactNode; title?: string }) {
  const { user } = useAuth();
  const [location] = useLocation();
  const displayName = user?.name || user?.email?.split("@")[0] || "Digital Junction customer";
  return <DashboardLayout navigation={clientNavigation} title={title}><div className="mx-auto max-w-7xl space-y-6 py-2"><section className="rounded-[1.35rem] border border-[#1A312C]/10 bg-white/70 p-5 sm:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><span className="grid size-16 shrink-0 place-items-center rounded-full bg-[#1A312C] font-display text-2xl text-[#89D7B7]">{displayName.charAt(0).toUpperCase()}</span><div><p className="font-mono text-[0.59rem] uppercase tracking-[0.11em] text-[#428475]">Customer account</p><h1 className="display mt-1 text-3xl text-[#1A312C]">{displayName}</h1><p className="mt-1 break-all text-sm text-[#1A312C]/60">{user?.email || "Signed-in customer"}</p></div></div></div><nav className="mt-6 flex gap-1 overflow-x-auto border-t border-[#1A312C]/10 pt-4" aria-label="Customer account sections">{customerTabs.map(tab => <Link key={tab.path} href={tab.path} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold transition ${location === tab.path ? "bg-[#89D7B7]/30 text-[#1A312C]" : "text-[#1A312C]/58 hover:bg-[#FFF4E1] hover:text-[#1A312C]"}`}>{tab.label}</Link>)}</nav></section>{children}</div></DashboardLayout>;
}
