import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { ownerNavigation } from "@/data/ownerNavigation";
import { ownerInventoryPreview } from "@/data/ownerSamplePreview";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Boxes,
  ChartNoAxesCombined,
  CircleDollarSign,
  FileText,
  FolderKanban,
  KeyRound,
  Loader2,
  PackagePlus,
  Search,
  ShieldAlert,
  ShoppingBag,
  UsersRound,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";

const weeklyBars = [32, 48, 39, 62, 45, 71, 56];
const monthlyTrend = [40, 35, 48, 44, 57, 52, 67, 59, 73, 68, 79, 76];
const previewActivities = [
  { title: "Analytics workspace prepared", detail: "Sample activity layout · no business event recorded", icon: <ChartNoAxesCombined className="size-4" /> },
  { title: "Product catalogue layout available", detail: "Preview listing cards are ready for your genuine inventory", icon: <Boxes className="size-4" /> },
  { title: "Customer access controls ready", detail: "Access is granted only after a real owner decision", icon: <KeyRound className="size-4" /> },
];

export default function OwnerDashboard() {
  const { user } = useAuth({ scope: "owner" });
  const isOwner = user?.role === "admin";
  const [search, setSearch] = useState("");
  const products = trpc.portal.admin.products.list.useQuery(undefined, { enabled: isOwner });
  const projects = trpc.portal.admin.projects.useQuery(undefined, { enabled: isOwner });
  const clients = trpc.portal.admin.clients.useQuery(undefined, { enabled: isOwner });
  const hasLiveInventory = Boolean(products.data?.length);
  const inventory = useMemo(() => (products.data ?? []).filter(item => item.title.toLowerCase().includes(search.toLowerCase())), [products.data, search]);
  const sampleInventory = useMemo(() => ownerInventoryPreview.filter(item => item.title.toLowerCase().includes(search.toLowerCase())), [search]);

  return (
    <DashboardLayout navigation={ownerNavigation} title="DJDC Owner">
      <div className="mx-auto max-w-7xl space-y-6 py-2">
        {!isOwner ? (
          <section className="grid min-h-[60vh] place-items-center rounded-[1.6rem] border border-[#1A312C]/12 bg-white">
            <div className="max-w-md p-8 text-center">
              <ShieldAlert className="mx-auto size-8 text-[#428475]" />
              <h1 className="display mt-5 text-3xl text-[#1A312C]">Owner access required.</h1>
              <p className="mt-3 text-sm leading-6 text-[#1A312C]/65">Use the separate owner session to manage Digital Junction.</p>
            </div>
          </section>
        ) : (
          <>
            <header className="flex flex-col gap-4 rounded-[1.55rem] border border-[#1A312C]/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[#1A312C]/10 bg-[#FFF4E1]/60 px-4 py-3 sm:max-w-md">
                <Search className="size-4 text-[#428475]" />
                <input value={search} onChange={event => setSearch(event.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-[#1A312C]/42" placeholder="Search inventory…" />
              </label>
              <div className="flex items-center gap-3">
                <button type="button" className="grid size-10 place-items-center rounded-xl border border-[#1A312C]/10 text-[#1A312C]/66" aria-label="Notifications"><Bell className="size-4" /></button>
                <Link href="/owner/inventory" className="button-primary buttonlike"><PackagePlus className="size-4" />Add new product</Link>
              </div>
            </header>

            <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="eyebrow">Admin dashboard overview</p>
                <h1 className="display mt-2 text-4xl text-[#1A312C]">Your business, at a glance.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#1A312C]/65">Monitor real inventory, projects, customers, and future sales in one owner-controlled workspace.</p>
              </div>
              <div className="rounded-xl border border-dashed border-[#428475]/25 bg-[#89D7B7]/12 px-4 py-3 text-xs leading-5 text-[#1A312C]/68"><strong className="text-[#1A312C]">Data-safe dashboard:</strong> financial sections remain blank until genuine sales records exist.</div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric icon={<CircleDollarSign className="size-5" />} label="Total Revenue" value="₱ —" detail="Awaiting real sales · No real sales recorded" tone="dark" />
              <Metric icon={<FolderKanban className="size-5" />} label="Total Projects" value={projects.isLoading ? "…" : String(projects.data?.length ?? 0)} detail="Real owner-managed projects" />
              <Metric icon={<UsersRound className="size-5" />} label="Total Customers" value={clients.isLoading ? "…" : String(clients.data?.length ?? 0)} detail="Registered customer accounts" />
              <Metric icon={<ShoppingBag className="size-5" />} label="Avg. Order Value" value="₱ —" detail="Awaiting real orders" />
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.45fr_.85fr]">
              <ChartCard title="Sales Overview" subtitle="Live revenue visualisation will appear when sales exist." className="min-h-[20rem]">
                <div className="grid h-52 grid-cols-7 items-end gap-2 rounded-2xl border border-dashed border-[#428475]/22 bg-[#FFF4E1]/45 p-5" aria-label="Sales overview sample chart placeholder">
                  {weeklyBars.map((height, index) => <div key={index} className="flex h-full flex-col justify-end gap-2"><div className="rounded-t-lg bg-[#89D7B7]/45" style={{ height: `${height}%` }} /><span className="text-center font-mono text-[0.52rem] uppercase text-[#1A312C]/45">{["M", "T", "W", "T", "F", "S", "S"][index]}</span></div>)}
                </div>
                <p className="mt-4 text-xs leading-5 text-[#1A312C]/58"><span className="font-bold text-[#428475]">Sample chart shape only.</span> It is not a sales total, revenue figure, or recorded result.</p>
              </ChartCard>
              <article className="rounded-[1.55rem] bg-[#1A312C] p-6 text-[#FFF4E1]"><p className="font-mono text-[0.62rem] uppercase tracking-[.14em] text-[#89D7B7]">Recent Activities</p><h2 className="display mt-3 text-3xl">Ready for operations.</h2><div className="mt-6 grid gap-4">{previewActivities.map((item, index) => <div key={item.title} className="flex gap-3 border-t border-white/12 pt-4 first:border-t-0 first:pt-0"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-[#89D7B7]">{item.icon}</span><div><p className="text-sm font-bold">{item.title}</p><p className="mt-1 text-xs leading-5 text-[#FFF4E1]/62">{item.detail}</p></div><span className="ml-auto pt-1 font-mono text-[0.52rem] text-[#89D7B7]">Preview {index + 1}</span></div>)}</div></article>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <ChartCard title="Weekly Sales" subtitle="A week-at-a-glance view for future real sales.">
                <div className="mt-6 grid grid-cols-7 items-end gap-3" aria-label="Weekly sales sample chart placeholder">{weeklyBars.map((height, index) => <div key={index} className="grid gap-2"><div className="h-28 overflow-hidden rounded-t-xl bg-[#1A312C]/7"><div className="w-full rounded-t-xl bg-[#428475]/42" style={{ height: `${height}%`, marginTop: `${100 - height}%` }} /></div><span className="text-center font-mono text-[0.56rem] text-[#1A312C]/46">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}</span></div>)}</div>
                <p className="mt-4 text-xs text-[#1A312C]/58">Preview bars only · real weekly values are not recorded yet.</p>
              </ChartCard>
              <ChartCard title="Monthly Revenue" subtitle="Monthly revenue remains unavailable until paid records exist.">
                <div className="relative mt-6 h-36 overflow-hidden rounded-xl border border-dashed border-[#428475]/22 bg-[#FFF4E1]/45 p-4" aria-label="Monthly revenue sample chart placeholder"><svg className="h-full w-full" viewBox="0 0 320 96" preserveAspectRatio="none" aria-hidden="true"><polyline points={monthlyTrend.map((point, index) => `${(index / (monthlyTrend.length - 1)) * 320},${96 - point}`).join(" ")} fill="none" stroke="#428475" strokeWidth="3" strokeDasharray="7 6" opacity="0.55" /><line x1="0" y1="78" x2="320" y2="78" stroke="#1A312C" strokeOpacity="0.14" /></svg><div className="absolute inset-x-4 bottom-3 flex justify-between font-mono text-[0.52rem] uppercase text-[#1A312C]/42"><span>Jan</span><span>Apr</span><span>Aug</span><span>Dec</span></div></div>
                <p className="mt-4 text-xs text-[#1A312C]/58">Sample line shape only · no revenue amount is represented.</p>
              </ChartCard>
            </section>

            <section className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
              <article className="rounded-[1.55rem] border border-[#1A312C]/12 bg-white p-6"><div className="flex items-center justify-between gap-4"><div><p className="eyebrow">Top Products</p><h2 className="display mt-1 text-3xl text-[#1A312C]">Catalogue potential</h2></div><Link href="/owner/inventory" className="button-quiet !min-h-9 !px-3 text-xs">Inventory <ArrowRight className="size-3.5" /></Link></div>{products.isLoading ? <div className="grid min-h-40 place-items-center"><Loader2 className="size-6 animate-spin text-[#428475]" /></div> : hasLiveInventory ? <div className="mt-5 grid gap-3">{inventory.slice(0, 4).map((product, index) => <ProductRow key={product.id} index={index + 1} title={product.title} detail={`${product.category} · ${product.isPublished ? "Published" : "Draft"}`} value="Live listing" />)}</div> : <><p className="mt-4 text-xs leading-5 text-[#1A312C]/58">Sample listing layouts, not ranked products or recorded sales.</p><div className="mt-4 grid gap-3">{sampleInventory.slice(0, 4).map((item, index) => <ProductRow key={item.id} index={index + 1} title={item.title} detail={`Sample preview · ${item.category}`} value="Preview only" />)}</div></>}</article>
              <article className="rounded-[1.55rem] border border-[#1A312C]/12 bg-white p-6"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Recent Transactions</p><h2 className="display mt-1 text-3xl text-[#1A312C]">Awaiting real activity.</h2></div><span className="rounded-full bg-[#89D7B7]/25 px-3 py-1 font-mono text-[0.55rem] uppercase tracking-[.1em] text-[#1A312C]/66">0 recorded</span></div><div className="mt-5 overflow-hidden rounded-xl border border-dashed border-[#1A312C]/16"><div className="grid grid-cols-[1.3fr_.7fr_.7fr] gap-3 bg-[#FFF4E1]/60 px-4 py-3 font-mono text-[0.56rem] uppercase tracking-[.08em] text-[#1A312C]/48"><span>Transaction</span><span>Amount</span><span>Status</span></div><div className="grid min-h-32 place-items-center p-6 text-center"><div><Activity className="mx-auto size-5 text-[#428475]" /><p className="mt-3 text-sm font-bold text-[#1A312C]">No real transactions yet.</p><p className="mt-1 max-w-sm text-xs leading-5 text-[#1A312C]/58">Transactions will appear only after real product fulfilment and sales records exist.</p></div></div></div></article>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function Metric({ icon, label, value, detail, tone = "light" }: { icon: ReactNode; label: string; value: string; detail: string; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return <article className={`rounded-[1.35rem] border p-5 ${dark ? "border-[#1A312C] bg-[#1A312C] text-[#FFF4E1]" : "border-[#1A312C]/12 bg-white text-[#1A312C]"}`}><span className={`grid size-10 place-items-center rounded-xl ${dark ? "bg-[#89D7B7]/18 text-[#89D7B7]" : "bg-[#89D7B7]/28 text-[#428475]"}`}>{icon}</span><p className={`mt-5 font-mono text-[0.58rem] uppercase tracking-[.1em] ${dark ? "text-[#FFF4E1]/58" : "text-[#1A312C]/52"}`}>{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className={`mt-1 text-xs ${dark ? "text-[#FFF4E1]/58" : "text-[#1A312C]/58"}`}>{detail}</p></article>;
}

function ChartCard({ title, subtitle, children, className = "" }: { title: string; subtitle: string; children: ReactNode; className?: string }) { return <article className={`rounded-[1.55rem] border border-[#1A312C]/12 bg-white p-6 ${className}`}><p className="eyebrow">Analytics preview</p><h2 className="display mt-1 text-3xl text-[#1A312C]">{title}</h2><p className="mt-2 text-sm leading-6 text-[#1A312C]/62">{subtitle}</p>{children}</article>; }
function ProductRow({ index, title, detail, value }: { index: number; title: string; detail: string; value: string }) { return <div className="flex items-center gap-3 rounded-xl border border-[#1A312C]/10 bg-[#FFF4E1]/50 p-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#89D7B7]/28 font-mono text-xs font-bold text-[#1A312C]">{index}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#1A312C]">{title}</p><p className="mt-1 truncate text-xs text-[#1A312C]/58">{detail}</p></div><span className="rounded-full bg-white px-2.5 py-1 text-[0.56rem] font-bold text-[#428475]">{value}</span></div>; }
