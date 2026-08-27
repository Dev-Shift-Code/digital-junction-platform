import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { ownerNavigation } from "@/data/ownerNavigation";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Download, ExternalLink, FileText, Loader2, Search, ShieldAlert, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

type PaymentStatus = "awaiting_payment" | "submitted" | "verified" | "rejected";
type FulfilmentStatus = "submitted" | "contacted" | "fulfilled" | "cancelled";
type SalesOrder = {
  order: {
    id: number;
    name: string;
    email: string;
    status: FulfilmentStatus;
    paymentStatus: PaymentStatus;
    paymentMethodName: string | null;
    paymentReference: string | null;
    paymentProofUrl: string | null;
    paymentProofFileName: string | null;
    createdAt: Date;
  };
  product: { title: string; category: string; price: string };
};

const money = (value: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(value);
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
const pageSize = 10;

function toCsvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export default function OwnerSalesManagement() {
  const { user } = useAuth({ scope: "owner" });
  const isOwner = user?.role === "admin";
  const orders = trpc.portal.admin.orders.list.useQuery(undefined, { enabled: isOwner });
  const updateOrder = trpc.portal.admin.orders.updateStatus.useMutation({ onSuccess: () => orders.refetch() });
  const reviewPayment = trpc.portal.admin.orders.reviewPayment.useMutation({ onSuccess: () => orders.refetch() });
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [category, setCategory] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "all">("all");
  const [fulfilmentStatus, setFulfilmentStatus] = useState<FulfilmentStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const sales = (orders.data ?? []) as SalesOrder[];
  const categories = useMemo(() => Array.from(new Set(sales.map(({ product }) => product.category))).sort(), [sales]);
  const filteredOrders = useMemo(() => {
    const now = Date.now();
    const rangeStart = dateRange === "30" ? now - 30 * 86_400_000 : dateRange === "90" ? now - 90 * 86_400_000 : null;
    const query = search.trim().toLowerCase();
    return sales.filter(({ order, product }) => {
      const createdAt = new Date(order.createdAt).getTime();
      return (!rangeStart || createdAt >= rangeStart)
        && (category === "all" || product.category === category)
        && (paymentStatus === "all" || order.paymentStatus === paymentStatus)
        && (fulfilmentStatus === "all" || order.status === fulfilmentStatus)
        && (!query || [String(order.id), order.name, order.email, product.title, product.category, order.paymentReference ?? ""].join(" ").toLowerCase().includes(query));
    });
  }, [sales, search, dateRange, category, paymentStatus, fulfilmentStatus]);
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const pageOrders = filteredOrders.slice((Math.min(page, totalPages) - 1) * pageSize, Math.min(page, totalPages) * pageSize);
  const metrics = useMemo(() => {
    const liveOrders = sales.filter(({ order }) => order.status !== "cancelled");
    const totalValue = liveOrders.reduce((sum, { product }) => sum + Number(product.price), 0);
    const verified = liveOrders.filter(({ order }) => order.paymentStatus === "verified");
    const verifiedValue = verified.reduce((sum, { product }) => sum + Number(product.price), 0);
    const awaitingReview = liveOrders.filter(({ order }) => order.paymentStatus === "submitted").length;
    return { totalValue, verifiedValue, awaitingReview, averageValue: liveOrders.length ? totalValue / liveOrders.length : 0 };
  }, [sales]);

  const changeFilter = (action: () => void) => { action(); setPage(1); };
  const exportCsv = () => {
    const rows = [
      ["Order ID", "Product", "Category", "Customer", "Email", "Date", "Amount", "Payment status", "Fulfilment status", "Payment reference"],
      ...filteredOrders.map(({ order, product }) => [order.id, product.title, product.category, order.name, order.email, new Date(order.createdAt).toISOString(), Number(product.price).toFixed(2), order.paymentStatus, order.status, order.paymentReference ?? ""]),
    ];
    const file = new Blob([rows.map(row => row.map(toCsvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(file);
    const download = document.createElement("a");
    download.href = href;
    download.download = `digital-junction-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    download.click();
    URL.revokeObjectURL(href);
  };
  const performPaymentReview = (orderId: number, status: "verified" | "rejected") => {
    setError("");
    reviewPayment.mutate({ orderId, paymentStatus: status }, { onError: issue => setError(issue.message || "Payment review could not be saved.") });
  };
  const setFulfilment = (orderId: number, status: FulfilmentStatus) => {
    setError("");
    updateOrder.mutate({ orderId, status }, { onError: issue => setError(issue.message || "Order status could not be saved.") });
  };

  if (!isOwner) return <DashboardLayout navigation={ownerNavigation} title="DJDC Owner"><section className="grid min-h-[60vh] place-items-center rounded-[1.6rem] border border-[#1A312C]/12 bg-[#FFF4E1]"><div className="max-w-md p-8 text-center"><ShieldAlert className="mx-auto size-8 text-[#428475]" /><h1 className="display mt-5 text-3xl text-[#1A312C]">Owner access required.</h1><p className="mt-3 text-sm leading-6 text-[#1A312C]/65">Sign in with the separate owner account to review sales and payment records.</p></div></section></DashboardLayout>;

  return <DashboardLayout navigation={ownerNavigation} title="DJDC Owner"><div className="mx-auto max-w-7xl space-y-6 py-2"><header className="flex flex-col gap-5 rounded-[1.55rem] bg-[#1A312C] px-6 py-8 text-[#FFF4E1] sm:px-8 lg:flex-row lg:items-end lg:justify-between"><div><p className="font-mono text-[.62rem] uppercase tracking-[.14em] text-[#89D7B7]">Sales management</p><h1 className="display mt-3 text-4xl">Track real digital product orders.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#FFF4E1]/72">Review submitted payment proof, manage fulfilment, and export only the actual D1 order records received by Digital Junction.</p></div><button type="button" onClick={exportCsv} disabled={!filteredOrders.length} className="button-secondary buttonlike w-fit disabled:cursor-not-allowed disabled:opacity-50"><Download className="size-4" />Export CSV</button></header><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Gross order value" value={money(metrics.totalValue)} help="Non-cancelled real orders" /><MetricCard label="Verified payment value" value={money(metrics.verifiedValue)} help="Orders with verified payment proof" accent="mint" /><MetricCard label="Pending payment review" value={String(metrics.awaitingReview)} help="Proof submitted, waiting for review" accent="amber" /><MetricCard label="Average order value" value={money(metrics.averageValue)} help="Non-cancelled real orders" /></section><section className="overflow-hidden rounded-[1.55rem] border border-[#1A312C]/12 bg-[#FFF4E1] shadow-[0_14px_38px_rgba(26,49,44,.06)]"><div className="grid gap-3 border-b border-[#1A312C]/10 p-5 xl:grid-cols-[minmax(15rem,1.2fr)_repeat(4,minmax(0,1fr))]"><label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#428475]" /><input value={search} onChange={event => changeFilter(() => setSearch(event.target.value))} className="form-field w-full !bg-white !pl-9" placeholder="Search order or customer" aria-label="Search sales" /></label><FilterSelect label="Date range" value={dateRange} onChange={value => changeFilter(() => setDateRange(value))} options={[["all", "All time"], ["30", "Last 30 days"], ["90", "Last 90 days"]]} /><FilterSelect label="Category" value={category} onChange={value => changeFilter(() => setCategory(value))} options={[["all", "All products"], ...categories.map(value => [value, value] as [string, string])]} /><FilterSelect label="Payment" value={paymentStatus} onChange={value => changeFilter(() => setPaymentStatus(value as PaymentStatus | "all"))} options={[["all", "All payment states"], ["awaiting_payment", "Awaiting payment"], ["submitted", "Submitted"], ["verified", "Verified"], ["rejected", "Rejected"]]} /><FilterSelect label="Fulfilment" value={fulfilmentStatus} onChange={value => changeFilter(() => setFulfilmentStatus(value as FulfilmentStatus | "all"))} options={[["all", "All order states"], ["submitted", "Submitted"], ["contacted", "Contacted"], ["fulfilled", "Fulfilled"], ["cancelled", "Cancelled"]]} /></div>{error ? <p role="alert" className="mx-5 mt-5 rounded-xl border border-red-400/35 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}{orders.isLoading ? <div className="grid min-h-72 place-items-center"><Loader2 className="size-7 animate-spin text-[#428475]" /></div> : filteredOrders.length ? <><div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-sm"><thead className="bg-[#1A312C]/4 font-mono text-[.56rem] uppercase tracking-[.09em] text-[#1A312C]/56"><tr><th className="px-5 py-4 font-medium">Order ID</th><th className="px-5 py-4 font-medium">Product</th><th className="px-5 py-4 font-medium">Customer</th><th className="px-5 py-4 font-medium">Date</th><th className="px-5 py-4 text-right font-medium">Amount</th><th className="px-5 py-4 font-medium">Payment status</th><th className="px-5 py-4 font-medium">Fulfilment</th><th className="px-5 py-4 text-right font-medium">Actions</th></tr></thead><tbody>{pageOrders.map(({ order, product }) => <tr key={order.id} className="border-t border-[#1A312C]/8 align-top"><td className="px-5 py-4"><p className="font-bold text-[#1A312C]">#{order.id}</p><p className="mt-1 text-xs text-[#1A312C]/48">{order.paymentReference || "No reference"}</p></td><td className="px-5 py-4"><p className="font-bold text-[#1A312C]">{product.title}</p><p className="mt-1 font-mono text-[.55rem] uppercase tracking-[.07em] text-[#428475]">{product.category}</p></td><td className="px-5 py-4"><p className="font-semibold text-[#1A312C]">{order.name}</p><p className="mt-1 text-xs text-[#1A312C]/55">{order.email}</p></td><td className="px-5 py-4"><p className="text-[#1A312C]">{new Date(order.createdAt).toLocaleDateString()}</p><p className="mt-1 text-xs text-[#1A312C]/50">{new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></td><td className="px-5 py-4 text-right font-bold text-[#1A312C]">{money(Number(product.price))}</td><td className="px-5 py-4"><StatusBadge value={order.paymentStatus} />{order.paymentProofUrl ? <a href={order.paymentProofUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#428475]">View proof <ExternalLink className="size-3" /></a> : <p className="mt-2 text-xs text-[#1A312C]/45">No proof uploaded</p>}{order.paymentStatus === "submitted" ? <div className="mt-3 flex gap-2"><button type="button" disabled={reviewPayment.isPending} onClick={() => performPaymentReview(order.id, "verified")} className="inline-flex items-center gap-1 rounded-lg bg-[#428475] px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"><CheckCircle2 className="size-3.5" />Verify</button><button type="button" disabled={reviewPayment.isPending} onClick={() => performPaymentReview(order.id, "rejected")} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50"><XCircle className="size-3.5" />Reject</button></div> : null}</td><td className="px-5 py-4"><StatusBadge value={order.status} /><select value={order.status} disabled={updateOrder.isPending} onChange={event => setFulfilment(order.id, event.target.value as FulfilmentStatus)} className="form-field mt-3 !h-9 !w-36 !bg-white !py-1 text-xs"><option value="submitted">Submitted</option><option value="contacted">Contacted</option><option value="fulfilled">Fulfilled</option><option value="cancelled">Cancelled</option></select></td><td className="px-5 py-4 text-right"><span className="inline-flex size-9 items-center justify-center rounded-lg border border-[#1A312C]/12 text-[#428475]" aria-label="Order record"><FileText className="size-4" /></span></td></tr>)}</tbody></table></div><footer className="flex flex-col gap-3 border-t border-[#1A312C]/10 px-5 py-4 text-sm text-[#1A312C]/58 sm:flex-row sm:items-center sm:justify-between"><p>Showing {Math.min((Math.min(page, totalPages) - 1) * pageSize + 1, filteredOrders.length)}–{Math.min(Math.min(page, totalPages) * pageSize, filteredOrders.length)} of {filteredOrders.length} real order{filteredOrders.length === 1 ? "" : "s"}</p><div className="flex items-center gap-2"><button type="button" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page <= 1} className="button-quiet !min-h-9 disabled:opacity-40">Previous</button><span className="rounded-lg bg-[#89D7B7]/25 px-3 py-2 text-xs font-bold text-[#1A312C]">{Math.min(page, totalPages)} / {totalPages}</span><button type="button" onClick={() => setPage(current => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="button-quiet !min-h-9 disabled:opacity-40">Next</button></div></footer></> : <div className="grid min-h-72 place-items-center p-8 text-center"><div className="max-w-md"><FileText className="mx-auto size-8 text-[#428475]" /><p className="eyebrow mt-5">No matching order records</p><h2 className="display mt-3 text-3xl text-[#1A312C]">Sales will appear here when real orders arrive.</h2><p className="mt-3 text-sm leading-6 text-[#1A312C]/62">This workspace does not create sample sales, payments, customers, or revenue figures.</p></div></div>}</section></div></DashboardLayout>;
}

function MetricCard({ label, value, help, accent = "green" }: { label: string; value: string; help: string; accent?: "green" | "mint" | "amber" }) {
  const accentClass = accent === "amber" ? "bg-amber-100 text-amber-900" : accent === "mint" ? "bg-[#89D7B7]/30 text-[#1A312C]" : "bg-[#1A312C] text-[#FFF4E1]";
  return <article className="rounded-[1.35rem] border border-[#1A312C]/12 bg-white p-5 shadow-[0_10px_28px_rgba(26,49,44,.05)]"><p className="font-mono text-[.57rem] uppercase tracking-[.1em] text-[#1A312C]/55">{label}</p><p className="mt-3 text-3xl font-bold tracking-tight text-[#1A312C]">{value}</p><span className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-[.63rem] font-semibold ${accentClass}`}>{help}</span></article>;
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <label className="grid gap-1"><span className="font-mono text-[.53rem] uppercase tracking-[.08em] text-[#1A312C]/55">{label}</span><select value={value} onChange={event => onChange(event.target.value)} className="form-field w-full !bg-white !py-1.5 text-sm">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}

function StatusBadge({ value }: { value: string }) {
  const classes = value === "verified" || value === "fulfilled" ? "bg-[#89D7B7]/35 text-[#1A312C]" : value === "rejected" || value === "cancelled" ? "bg-red-100 text-red-700" : value === "submitted" ? "bg-amber-100 text-amber-900" : "bg-[#1A312C]/8 text-[#1A312C]/65";
  return <span className={`inline-flex rounded-full px-2.5 py-1 font-mono text-[.54rem] uppercase tracking-[.07em] ${classes}`}>{label(value)}</span>;
}
