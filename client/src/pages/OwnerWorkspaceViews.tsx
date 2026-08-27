import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { ownerNavigation } from "@/data/ownerNavigation";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  BadgePercent,
  CircleHelp,
  CheckCircle2,
  ExternalLink,
  FileClock,
  KeyRound,
  Loader2,
  Settings2,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { Link } from "wouter";

type ViewKind = "sales" | "customers" | "vouchers" | "settings" | "support";
type CustomerSummary = { id: number; name?: string | null; email?: string | null };
type CustomerQueryView = { isLoading: boolean; data?: CustomerSummary[] };
type OrderSummary = { order: { id: number; name: string; email: string; company: string | null; message: string | null; status: "submitted" | "contacted" | "fulfilled" | "cancelled"; paymentMethodName: string | null; paymentReference: string | null; paymentProofUrl: string | null; paymentProofFileName: string | null; paymentStatus: "awaiting_payment" | "submitted" | "verified" | "rejected"; paymentReviewedAt: Date | null; paymentReviewNote: string | null; createdAt: Date }; product: { title: string; price: string } };
type OrderQueryView = { isLoading: boolean; data?: OrderSummary[] };

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
    description: "No voucher code, campaign, or redemption has been configured yet.",
  },
  settings: {
    eyebrow: "Owner settings",
    title: "Keep administration secure.",
    description: "Review the dedicated owner login setup and keep your separate Owner Dashboard session protected.",
  },
  support: {
    eyebrow: "Owner support",
    title: "Keep operating notes in reach.",
    description: "Use the existing Contact channel for support requests. Support history will appear here only when it exists.",
  },
};

export function OwnerWorkspaceView({ kind }: { kind: ViewKind }) {
  const { user } = useAuth({ scope: "owner" });
  const isOwner = user?.role === "admin";
  const clients = trpc.portal.admin.clients.useQuery(undefined, { enabled: isOwner && kind === "customers" });
  const orders = trpc.portal.admin.orders.list.useQuery(undefined, { enabled: isOwner && kind === "sales" });
  const updateOrder = trpc.portal.admin.orders.updateStatus.useMutation({ onSuccess: () => orders.refetch() });
  const reviewPayment = trpc.portal.admin.orders.reviewPayment.useMutation({ onSuccess: () => orders.refetch() });
  const title = copy[kind];
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
            ) : kind === "sales" ? (
              <SalesWorkspace orders={orders} onUpdate={(orderId, status) => updateOrder.mutate({ orderId, status })} onReview={(orderId, paymentStatus) => reviewPayment.mutate({ orderId, paymentStatus })} updating={updateOrder.isPending || reviewPayment.isPending} />
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
                      {kind === "vouchers"
                        ? "Voucher creation will be added only when your programme rules, terms, and real promotion dates are ready."
                        : kind === "settings"
                          ? "Use one direct owner password and the separate Owner sign-in page to keep client activity independent."
                          : "Use the public Contact page to send an owner support request with the relevant product, customer, or content context."}
                    </p>
                    <div className="mt-7 flex flex-wrap gap-3">
                      {kind === "settings" && <><Link href="/owner/settings/payment-methods" className="button-primary buttonlike">Payment methods <ArrowRight className="size-4" /></Link><Link href="/owner/setup" className="button-quiet buttonlike">Owner setup</Link></>}
                      {kind === "support" && <Link href="/contact" className="button-primary buttonlike">Contact support <ArrowRight className="size-4" /></Link>}
                    </div>
                  </article>
                  <aside className="rounded-[1.55rem] bg-[#89D7B7] p-6 text-[#1A312C]">
                    <p className="eyebrow">Operational status</p>
                    <h2 className="display mt-3 text-3xl">Ready when your records are.</h2>
                    <p className="mt-4 text-sm leading-6 text-[#1A312C]/70">This area intentionally stays clear until there is genuine voucher, support, or operational information to show.</p>
                  </aside>
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
    </section>
  );
}

function SalesWorkspace({ orders, onUpdate, onReview, updating }: { orders: OrderQueryView; onUpdate: (orderId: number, status: OrderSummary["order"]["status"]) => void; onReview: (orderId: number, paymentStatus: "verified" | "rejected") => void; updating: boolean }) {
  return <section className="rounded-[1.55rem] border border-[#1A312C]/12 bg-white p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Direct purchase orders</p><h2 className="display mt-1 text-3xl text-[#1A312C]">Payment review & fulfilment</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#1A312C]/62">Payment verification and order fulfilment are intentionally separate. Verify or reject genuine proof first, then change the fulfilment status only after you have completed the delivery process.</p></div><Link href="/owner/inventory" className="button-quiet buttonlike w-fit">Manage files in Inventory</Link></div><p className="mt-4 text-xs leading-5 text-[#1A312C]/55">Proof images, payment references, and method snapshots are visible only in this owner workspace. Verifying a payment does not send files, create an invoice, or mark an order fulfilled.</p>{orders.isLoading ? <div className="grid min-h-36 place-items-center"><Loader2 className="size-6 animate-spin text-[#428475]" /></div> : orders.data?.length ? <div className="mt-6 overflow-x-auto rounded-xl border border-[#1A312C]/10"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-[#FFF4E1]/55 font-mono text-[.57rem] uppercase tracking-[.1em] text-[#1A312C]/50"><tr><th className="px-4 py-3 font-medium">Order</th><th className="px-4 py-3 font-medium">Buyer</th><th className="px-4 py-3 font-medium">Product</th><th className="px-4 py-3 font-medium">Payment proof</th><th className="px-4 py-3 font-medium">Payment review</th><th className="px-4 py-3 text-right font-medium">Fulfilment</th></tr></thead><tbody>{orders.data.map(({ order, product }) => <tr key={order.id} className="border-t border-[#1A312C]/8 align-top"><td className="px-4 py-4"><p className="font-bold text-[#1A312C]">#{order.id}</p><p className="mt-1 text-xs text-[#1A312C]/52">{new Date(order.createdAt).toLocaleDateString()}</p></td><td className="px-4 py-4"><p className="font-semibold text-[#1A312C]">{order.name}</p><p className="mt-1 text-xs text-[#1A312C]/55">{order.email}</p>{order.company ? <p className="mt-1 text-xs text-[#1A312C]/45">{order.company}</p> : null}</td><td className="px-4 py-4"><p className="font-semibold text-[#1A312C]">{product.title}</p><p className="mt-1 text-xs text-[#1A312C]/55">₱{product.price}</p></td><td className="px-4 py-4"><p className="font-semibold text-[#1A312C]">{order.paymentMethodName || "No method recorded"}</p><p className="mt-1 font-mono text-[.58rem] text-[#1A312C]/58">{order.paymentReference || "No reference"}</p>{order.paymentProofUrl ? <a href={order.paymentProofUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#428475]">View proof <ExternalLink className="size-3.5" /></a> : <p className="mt-2 text-xs text-[#1A312C]/45">No proof uploaded</p>}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 font-mono text-[.55rem] uppercase tracking-[.08em] ${order.paymentStatus === "verified" ? "bg-[#89D7B7]/32 text-[#1A312C]" : order.paymentStatus === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>{order.paymentStatus.replace("_", " ")}</span>{order.paymentStatus === "submitted" ? <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={updating} onClick={() => onReview(order.id, "verified")} className="inline-flex items-center gap-1 rounded-lg bg-[#428475] px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"><CheckCircle2 className="size-3.5" />Verify</button><button type="button" disabled={updating} onClick={() => onReview(order.id, "rejected")} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50"><XCircle className="size-3.5" />Reject</button></div> : order.paymentReviewedAt ? <p className="mt-2 text-xs text-[#1A312C]/50">Reviewed {new Date(order.paymentReviewedAt).toLocaleDateString()}</p> : null}</td><td className="px-4 py-4 text-right"><span className="rounded-full bg-[#89D7B7]/24 px-2.5 py-1 font-mono text-[.55rem] uppercase tracking-[.08em] text-[#1A312C]/70">{order.status}</span><select value={order.status} disabled={updating} onChange={event => onUpdate(order.id, event.target.value as OrderSummary["order"]["status"])} className="form-field mt-3 ml-auto !h-9 !w-30 !py-1 text-xs"><option value="submitted">Submitted</option><option value="contacted">Contacted</option><option value="fulfilled">Fulfilled</option><option value="cancelled">Cancelled</option></select></td></tr>)}</tbody></table></div> : <div className="mt-6 rounded-xl border border-dashed border-[#1A312C]/16 bg-[#FFF4E1]/55 p-7"><p className="font-mono text-[.58rem] uppercase tracking-[.1em] text-[#428475]">No live orders</p><p className="mt-2 text-sm leading-6 text-[#1A312C]/62">Submitted guest purchases will appear here only after a visitor sends a real checkout request and payment proof.</p></div>}</section>;
}

export const OwnerSales = () => <OwnerWorkspaceView kind="sales" />;
export const OwnerCustomers = () => <OwnerWorkspaceView kind="customers" />;
export const OwnerVouchers = () => <OwnerWorkspaceView kind="vouchers" />;
export const OwnerSettings = () => <OwnerWorkspaceView kind="settings" />;
export const OwnerSupport = () => <OwnerWorkspaceView kind="support" />;
