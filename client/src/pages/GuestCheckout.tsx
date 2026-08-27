import PublicLayout from "@/components/PublicLayout";
import { sampleProducts } from "@/data/samplePreview";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, Loader2, LockKeyhole, Send, ShoppingBag } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";

function money(value: string | number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(Number(value));
}

export default function GuestCheckout() {
  const [, params] = useRoute("/checkout/:handle");
  const input = useMemo(() => ({ slug: params?.handle ?? "" }), [params?.handle]);
  const sampleProduct = useMemo(() => sampleProducts.find(item => item.slug === input.slug), [input.slug]);
  const productQuery = trpc.portal.products.bySlug.useQuery(input, { enabled: Boolean(input.slug) });
  const checkout = trpc.portal.products.guestCheckout.useMutation();
  const [completed, setCompleted] = useState(false);
  const product = productQuery.data ?? sampleProduct;
  const isSample = Boolean(sampleProduct && !productQuery.data);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!productQuery.data) return;
    const form = new FormData(event.currentTarget);
    checkout.mutate({
      productId: productQuery.data.id,
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      company: String(form.get("company") ?? "") || undefined,
      message: String(form.get("message") ?? "") || undefined,
    }, { onSuccess: () => setCompleted(true) });
  };

  if (productQuery.isLoading && !sampleProduct) return <PublicLayout><main className="grid min-h-[60vh] place-items-center"><Loader2 className="size-7 animate-spin text-[#428475]" /></main></PublicLayout>;
  if (!product || productQuery.error) return <PublicLayout><main className="site-container py-24"><Link href="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-[#428475]"><ArrowLeft className="size-4" />Back to products</Link><h1 className="display mt-8 text-5xl text-[#1A312C]">That product is not available for checkout.</h1></main></PublicLayout>;

  return <PublicLayout><main className="section-grid py-10 sm:py-16"><div className="site-container"><Link href={`/shop/${product.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-[#428475] hover:text-[#1A312C]"><ArrowLeft className="size-4" />Back to product</Link><div className="mt-8 grid gap-8 lg:grid-cols-[.82fr_1.18fr]"><aside className="h-fit rounded-[1.5rem] bg-[#1A312C] p-6 text-[#FFF4E1] sm:p-8"><span className="grid size-11 place-items-center rounded-xl bg-[#89D7B7]/20 text-[#89D7B7]"><ShoppingBag className="size-5" /></span><p className="mt-7 font-mono text-[.6rem] uppercase tracking-[.12em] text-[#89D7B7]">Guest checkout</p><h1 className="display mt-3 text-4xl">{product.title}</h1><p className="mt-4 text-sm leading-6 text-[#FFF4E1]/68">{product.summary}</p><div className="mt-7 border-y border-white/15 py-5"><p className="font-mono text-[.55rem] uppercase tracking-[.1em] text-[#FFF4E1]/46">{isSample ? "Preview price" : "Product price"}</p><p className="mt-2 text-3xl font-bold">{money(product.price)}</p></div><div className="mt-6 flex items-start gap-3 text-xs leading-5 text-[#FFF4E1]/62"><LockKeyhole className="mt-0.5 size-4 shrink-0 text-[#89D7B7]" /><p><strong className="text-[#FFF4E1]">No account is required.</strong> This on-site form securely records a checkout request only. No card, payment, invoice, download, or delivery confirmation is collected here.</p></div></aside><section className="rounded-[1.5rem] border border-[#1A312C]/10 bg-white p-6 shadow-[0_18px_45px_rgba(26,49,44,.06)] sm:p-8">{isSample ? <div className="grid min-h-80 place-items-center text-center"><div className="max-w-md"><p className="eyebrow">Sample preview</p><h2 className="display mt-3 text-3xl text-[#1A312C]">This product is not available for checkout.</h2><p className="mt-3 text-sm leading-6 text-[#1A312C]/62">Sample listings only demonstrate the design. Publish a real product in Owner Inventory to enable guest checkout.</p><Link href="/shop" className="button-primary buttonlike mt-6">Browse products</Link></div></div> : completed ? <div className="grid min-h-80 place-items-center text-center"><div className="max-w-md"><CheckCircle2 className="mx-auto size-9 text-[#428475]" /><p className="eyebrow mt-5">Checkout request sent</p><h2 className="display mt-3 text-3xl text-[#1A312C]">We received your product request.</h2><p className="mt-3 text-sm leading-6 text-[#1A312C]/62">Digital Junction will confirm the next steps directly using your email. This is not a payment receipt, invoice, fulfilment, or download confirmation.</p><Link href="/shop" className="button-primary buttonlike mt-6">Continue browsing</Link></div></div> : <form onSubmit={submit} className="grid gap-5"><div><p className="eyebrow">Your details</p><h2 className="display mt-3 text-3xl text-[#1A312C]">Checkout without an account.</h2><p className="mt-2 text-sm leading-6 text-[#1A312C]/62">Share only the details needed to contact you about this product.</p></div><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>Name</span><input required name="name" autoComplete="name" className="form-field" placeholder="Your name" /></label><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>Email</span><input required name="email" type="email" autoComplete="email" className="form-field" placeholder="you@example.com" /></label></div><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>Company <span className="font-normal text-[#1A312C]/45">(optional)</span></span><input name="company" autoComplete="organization" className="form-field" placeholder="Company or team name" /></label><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>Note <span className="font-normal text-[#1A312C]/45">(optional)</span></span><textarea name="message" maxLength={5000} className="form-field min-h-28 resize-y" placeholder="Anything you would like us to know?" /></label>{checkout.error ? <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">We could not submit your checkout request. Please try again.</p> : null}<div className="flex flex-wrap items-center gap-4"><button disabled={checkout.isPending} className="button-primary disabled:opacity-60">{checkout.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}Submit checkout request</button><p className="text-xs leading-5 text-[#1A312C]/53">No payment is taken at this step.</p></div></form>}</section></div></div></main></PublicLayout>;
}
