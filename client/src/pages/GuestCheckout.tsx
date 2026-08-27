import PublicLayout from "@/components/PublicLayout";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, Clock3, Loader2, LockKeyhole, ShoppingBag, WalletCards } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";

function money(value: string | number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(Number(value));
}

function centsToMoney(value: number) {
  return money(value / 100);
}

export default function GuestCheckout() {
  const [, params] = useRoute("/checkout/:handle");
  const input = useMemo(() => ({ slug: params?.handle ?? "" }), [params?.handle]);
  const productQuery = trpc.portal.products.bySlug.useQuery(input, { enabled: Boolean(input.slug) });
  const paymentToken = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("payment");
  const paymentStatus = trpc.portal.products.payrexPaymentStatus.useQuery({ publicToken: paymentToken || "00000000-0000-0000-0000-000000000000" }, { enabled: Boolean(paymentToken), refetchInterval: query => query.state.data?.status === "pending" ? 3_000 : false });
  const purchase = trpc.portal.products.createPayrexCheckout.useMutation();
  const [quantity, setQuantity] = useState(1);
  const product = productQuery.data;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product) return;
    const form = new FormData(event.currentTarget);
    purchase.mutate({
      productId: product.id,
      quantity,
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      company: String(form.get("company") ?? "") || undefined,
      message: String(form.get("message") ?? "") || undefined,
    }, { onSuccess: checkout => window.location.assign(checkout.checkoutUrl) });
  };

  if (productQuery.isLoading) return <PublicLayout><main className="grid min-h-[60vh] place-items-center bg-[#FFF4E1]"><Loader2 className="size-7 animate-spin text-[#428475]" /></main></PublicLayout>;
  if (!product || productQuery.error) return <PublicLayout><main className="section-grid min-h-[60vh] py-24"><div className="site-container"><Link href="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-[#428475]"><ArrowLeft className="size-4" />Back to products</Link><h1 className="display mt-8 text-5xl text-[#1A312C]">This product is not available.</h1></div></main></PublicLayout>;

  const status = paymentStatus.data;
  const isPaid = status?.status === "paid";
  const isPending = status?.status === "pending";

  return <PublicLayout><main className="section-grid bg-[#FFF4E1] py-10 sm:py-16"><div className="site-container"><Link href={`/shop/${product.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-[#428475]"><ArrowLeft className="size-4" />Back to product details</Link><div className="mt-8 grid gap-8 lg:grid-cols-[.82fr_1.18fr]"><aside className="h-fit rounded-[1.5rem] bg-[#1A312C] p-6 text-[#FFF4E1] shadow-[0_18px_45px_rgba(26,49,44,.14)] sm:p-8"><span className="grid size-11 place-items-center rounded-xl bg-[#89D7B7]/20 text-[#89D7B7]"><ShoppingBag className="size-5" /></span><p className="mt-7 font-mono text-[.6rem] uppercase tracking-[.12em] text-[#89D7B7]">Secure GCash checkout</p><h1 className="display mt-3 text-4xl leading-tight">{product.title}</h1><p className="mt-4 text-sm leading-6 text-[#FFF4E1]/68">{product.summary}</p><div className="mt-7 border-y border-[#FFF4E1]/18 py-5"><p className="font-mono text-[.55rem] uppercase tracking-[.1em] text-[#FFF4E1]/46">Order total</p><p className="mt-2 text-3xl font-bold">{status ? centsToMoney(status.amountCents) : money(Number(product.price) * quantity)}</p><p className="mt-1 text-xs text-[#FFF4E1]/58">{status ? "Final amount held by the payment provider" : `${quantity} ${quantity === 1 ? "unit" : "units"} at ${money(product.price)} each`}</p></div><div className="mt-6 flex items-start gap-3 text-xs leading-5 text-[#FFF4E1]/66"><LockKeyhole className="mt-0.5 size-4 shrink-0 text-[#89D7B7]" /><p><strong className="text-[#FFF4E1]">GCash only.</strong> Payment amount is calculated by the server and confirmed only by PayRex’s verified payment notification.</p></div></aside><section className="rounded-[1.5rem] border border-[#1A312C]/12 bg-[#FFF4E1] p-6 shadow-[0_18px_45px_rgba(26,49,44,.06)] sm:p-8">{paymentToken ? <div className="grid min-h-80 place-items-center text-center"><div className="max-w-md">{isPaid ? <><CheckCircle2 className="mx-auto size-10 text-[#428475]" /><p className="eyebrow mt-5">GCash payment confirmed</p><h2 className="display mt-3 text-3xl text-[#1A312C]">Thank you for your purchase.</h2><p className="mt-3 text-sm leading-6 text-[#1A312C]/62">Your payment for {status?.productTitle} was confirmed by PayRex. Digital Junction will fulfil your order using the submitted email.</p><Link href="/shop" className="button-primary buttonlike mt-6">Continue browsing</Link></> : isPending ? <><Clock3 className="mx-auto size-10 text-[#428475]" /><p className="eyebrow mt-5">Checking payment status</p><h2 className="display mt-3 text-3xl text-[#1A312C]">Your GCash payment is still pending.</h2><p className="mt-3 text-sm leading-6 text-[#1A312C]/62">If you completed payment, wait a moment while PayRex sends its verified confirmation. Do not submit another payment.</p>{status?.checkoutUrl ? <button type="button" onClick={() => window.location.assign(status.checkoutUrl!)} className="button-primary mt-6"><WalletCards className="size-4" />Return to secure GCash payment</button> : null}</> : <><Clock3 className="mx-auto size-10 text-[#1A312C]/50" /><p className="eyebrow mt-5">Payment update</p><h2 className="display mt-3 text-3xl text-[#1A312C]">This payment session is {status?.status || "unavailable"}.</h2><p className="mt-3 text-sm leading-6 text-[#1A312C]/62">Start a new checkout only if you have not completed the GCash payment.</p><Link href={`/checkout/${product.slug}`} className="button-primary buttonlike mt-6">Start a new checkout</Link></>}</div></div> : <form onSubmit={submit} className="grid gap-6"><div><p className="eyebrow">Place your order</p><h2 className="display mt-3 text-3xl text-[#1A312C]">Pay securely with GCash.</h2><p className="mt-2 text-sm leading-6 text-[#1A312C]/62">Continue to the PayRex secure checkout page. On desktop, GCash payment may be completed by scanning the dynamic provider QR code; on mobile, PayRex may open the GCash payment flow.</p></div><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>Name</span><input required name="name" autoComplete="name" className="form-field !bg-[#FFF4E1]" placeholder="Your name" /></label><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>Email</span><input required type="email" name="email" autoComplete="email" className="form-field !bg-[#FFF4E1]" placeholder="you@example.com" /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>Company <span className="font-normal text-[#1A312C]/45">(optional)</span></span><input name="company" autoComplete="organization" className="form-field !bg-[#FFF4E1]" placeholder="Company or team name" /></label><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>Quantity</span><select value={quantity} onChange={event => setQuantity(Number(event.target.value))} className="form-field !bg-[#FFF4E1]">{Array.from({ length: 20 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label></div><div className="rounded-xl border border-[#428475]/22 bg-[#89D7B7]/14 p-4"><div className="flex items-center gap-2"><WalletCards className="size-4 text-[#428475]" /><h3 className="text-sm font-bold text-[#1A312C]">GCash via PayRex</h3></div><p className="mt-2 text-xs leading-5 text-[#1A312C]/70">You will be redirected to a one-time PayRex-hosted payment session. The exact amount is fixed by the server, and only a verified PayRex confirmation marks the order as paid.</p></div><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>Order note <span className="font-normal text-[#1A312C]/45">(optional)</span></span><textarea name="message" maxLength={5000} className="form-field min-h-24 resize-y !bg-[#FFF4E1]" placeholder="Anything we should know before fulfilment?" /></label>{purchase.error ? <p role="alert" className="rounded-xl border border-red-400/40 bg-red-50 px-4 py-3 text-sm text-red-800">{purchase.error.message || "We could not start secure checkout. Please try again."}</p> : null}<div className="flex flex-wrap items-center gap-4"><button disabled={purchase.isPending} className="button-primary disabled:opacity-60">{purchase.isPending ? <Loader2 className="size-4 animate-spin" /> : <WalletCards className="size-4" />}Continue to secure GCash payment</button><p className="text-xs leading-5 text-[#1A312C]/55">No screenshot or “I paid” button is used for payment confirmation.</p></div></form>}</section></div></div></main></PublicLayout>;
}
