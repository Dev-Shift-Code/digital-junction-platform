import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { ownerNavigation } from "@/data/ownerNavigation";
import { ownerWorkspacePreview } from "@/data/ownerSamplePreview";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  BadgePercent,
  CircleHelp,
  FileClock,
  KeyRound,
  Loader2,
  Settings2,
  ShieldAlert,
} from "lucide-react";
import { Link } from "wouter";

type ViewKind = "sales" | "customers" | "vouchers" | "settings" | "support";
type CustomerSummary = { id: number; name?: string | null; email?: string | null };
type CustomerQueryView = { isLoading: boolean; data?: CustomerSummary[] };

const copy: Record<ViewKind, { eyebrow: string; title: string; description: string }> = {
  sales: {
    eyebrow: "Sales workspace",
    title: "Sales records, when you are ready.",
    description:
      "This view will show genuine transaction and fulfilment data once Digital Junction records real completed sales. No sample sale, revenue, payment, or transaction has been invented here.",
  },
  customers: {
    eyebrow: "Customer workspace",
    title: "Manage people with access.",
    description: "Review registered customer accounts and grant product access from a single owner-controlled workspace.",
  },
  vouchers: {
    eyebrow: "Voucher workspace",
    title: "Prepare future promotions safely.",
    description: "The preview panels below show voucher workspace structure only. No real code, campaign, or redemption has been configured.",
  },
  settings: {
    eyebrow: "Owner settings",
    title: "Keep administration secure.",
    description: "Review the dedicated owner login setup and keep your separate Owner Dashboard session protected.",
  },
  support: {
    eyebrow: "Owner support",
    title: "Keep operating notes in reach.",
    description: "Use the existing Contact channel for support requests. This page shows workspace structure, not fabricated support history.",
  },
};

export function OwnerWorkspaceView({ kind }: { kind: ViewKind }) {
  const { user } = useAuth({ scope: "owner" });
  const isOwner = user?.role === "admin";
  const clients = trpc.portal.admin.clients.useQuery(undefined, { enabled: isOwner && kind === "customers" });
  const title = copy[kind];
  const previewPanels = kind === "customers" ? [] : ownerWorkspacePreview[kind];
  const icon =
    kind === "sales" ? <FileClock className="size-5" /> : kind === "vouchers" ? <BadgePercent className="size-5" /> : kind === "settings" ? <Settings2 className="size-5" /> : <CircleHelp className="size-5" />;

  return (
    <DashboardLayout navigation={ownerNavigation} title="DJDC Owner">
      <div className="mx-auto max-w-7xl space-y-6 py-2">
        {!isOwner ? (
          <section className="grid min-h-[60vh] place-items-center rounded-[1.6rem] border border-[#1A312C]/12 bg-white">
            <div className="max-w-md p-8 text-center">
              <ShieldAlert className="mx-auto size-8 text-[#428475]" />
              <h1 className="display mt-5 text-3xl text-[#1A312C]">Owner access required.</h1>
              <p className="mt-3 text-sm leading-6 text-[#1A312C]/65">Sign in with the separate owner account to open this workspace.</p>
            </div>
          </section>
        ) : (
          <>
            <header className="rounded-[1.55rem] bg-[#1A312C] px-6 py-8 text-[#FFF4E1] sm:px-8">
              <p className="font-mono text-[0.62rem] uppercase tracking-[.14em] text-[#89D7B7]">{title.eyebrow}</p>
              <h1 className="display mt-3 text-4xl">{title.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#FFF4E1]/72">{title.description}</p>
            </header>
            {kind === "customers" ? (
              <CustomerWorkspace clients={clients} />
            ) : (
              <>
                <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
                  <article className="rounded-[1.55rem] border border-[#1A312C]/12 bg-white p-6">
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 place-items-center rounded-xl bg-[#89D7B7]/28 text-[#428475]">{icon}</span>
                      <div>
                        <p className="eyebrow">Owner controlled</p>
                        <h2 className="display mt-1 text-3xl text-[#1A312C]">Clear next step</h2>
                      </div>
                    </div>
                    <p className="mt-6 max-w-xl text-sm leading-7 text-[#1A312C]/68">
                      {kind === "sales"
                        ? "Continue to the customer product-access workspace for genuine controlled delivery records once listings and customer access are configured."
                        : kind === "vouchers"
                          ? "Voucher creation will be added only when your programme rules, terms, and real promotion dates are ready."
                          : kind === "settings"
                            ? "Use one direct owner password and the separate Owner sign-in page to keep client activity independent."
                            : "Use the public Contact page to send an owner support request with the relevant product, customer, or content context."}
                    </p>
                    <div className="mt-7 flex flex-wrap gap-3">
                      {kind === "sales" && <Link href="/owner/product-access" className="button-primary buttonlike">Open product access <ArrowRight className="size-4" /></Link>}
                      {kind === "settings" && <Link href="/owner/setup" className="button-primary buttonlike">Owner setup <ArrowRight className="size-4" /></Link>}
                      {kind === "support" && <Link href="/contact" className="button-primary buttonlike">Contact support <ArrowRight className="size-4" /></Link>}
                    </div>
                  </article>
                  <aside className="rounded-[1.55rem] bg-[#89D7B7] p-6 text-[#1A312C]">
                    <p className="eyebrow">Sample admin preview</p>
                    <h2 className="display mt-3 text-3xl">Data-safe by design.</h2>
                    <p className="mt-4 text-sm leading-6 text-[#1A312C]/70">The populated panels below are workflow layouts only. They never represent a real sale, payment, voucher, redemption, support outcome, or invoice.</p>
                  </aside>
                </section>
                <section className="grid gap-4 md:grid-cols-3">
                  {previewPanels.map(panel => (
                    <article key={panel.label} className="rounded-[1.35rem] border border-dashed border-[#428475]/28 bg-white p-5">
                      <p className="font-mono text-[0.58rem] uppercase tracking-[.1em] text-[#428475]">Sample preview · {panel.label}</p>
                      <p className="display mt-4 text-2xl text-[#1A312C]">{panel.value}</p>
                      <p className="mt-3 text-sm leading-6 text-[#1A312C]/65">{panel.detail}</p>
                    </article>
                  ))}
                </section>
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function CustomerWorkspace({ clients }: { clients: CustomerQueryView }) {
  return (
    <section className="rounded-[1.55rem] border border-[#1A312C]/12 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Registered accounts</p>
          <h2 className="display mt-1 text-3xl text-[#1A312C]">Customer access</h2>
        </div>
        <Link href="/owner/product-access" className="button-primary buttonlike"><KeyRound className="size-4" />Manage product access</Link>
      </div>
      {clients.isLoading ? (
        <div className="grid min-h-32 place-items-center"><Loader2 className="size-6 animate-spin text-[#428475]" /></div>
      ) : clients.data?.length ? (
        <div className="mt-6 divide-y divide-[#1A312C]/10 rounded-xl border border-[#1A312C]/10">
          {clients.data.map(client => (
            <div key={client.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-bold text-[#1A312C]">{client.name || "Customer account"}</p>
                <p className="mt-1 text-sm text-[#1A312C]/60">{client.email || `Customer #${client.id}`}</p>
              </div>
              <span className="rounded-full bg-[#89D7B7]/30 px-3 py-1 font-mono text-[0.58rem] uppercase tracking-[.1em] text-[#1A312C]/70">Registered</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-[#1A312C]/16 bg-[#FFF4E1]/60 p-6 text-sm leading-6 text-[#1A312C]/65">No customer accounts are available yet. When a person registers directly with Digital Junction, they will appear here for controlled product-access grants.</div>
      )}
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {["Account status layout", "Access-control layout", "Customer notes layout"].map(label => (
          <div key={label} className="rounded-xl border border-dashed border-[#428475]/25 bg-[#89D7B7]/10 p-4">
            <p className="font-mono text-[0.56rem] uppercase tracking-[.1em] text-[#428475]">Sample preview</p>
            <p className="mt-2 font-bold text-[#1A312C]">{label}</p>
            <p className="mt-2 text-xs leading-5 text-[#1A312C]/62">Structure only — no fictional customer activity is shown.</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export const OwnerSales = () => <OwnerWorkspaceView kind="sales" />;
export const OwnerCustomers = () => <OwnerWorkspaceView kind="customers" />;
export const OwnerVouchers = () => <OwnerWorkspaceView kind="vouchers" />;
export const OwnerSettings = () => <OwnerWorkspaceView kind="settings" />;
export const OwnerSupport = () => <OwnerWorkspaceView kind="support" />;
