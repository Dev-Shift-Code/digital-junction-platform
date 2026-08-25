import { ArrowLeft, Check, Loader2, ShoppingBag } from "lucide-react";
import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";

function money(amount: string, currency: string) { return new Intl.NumberFormat("en-PH", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(amount)); }

export default function ProductDetail() {
  const [, params] = useRoute("/shop/:handle");
  const input = useMemo(() => ({ handle: params?.handle ?? "" }), [params?.handle]);
  const { data: product, isLoading, error } = trpc.commerce.products.byHandle.useQuery(input, { enabled: Boolean(input.handle) });
  const { addItem, loading } = useCart();
  if (isLoading) return <PublicLayout><main className="grid min-h-[60vh] place-items-center"><Loader2 className="size-7 animate-spin text-[#428475]" /></main></PublicLayout>;
  if (!product || error) return <PublicLayout><main className="site-container py-24"><Link href="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-[#428475]"><ArrowLeft className="size-4" />Back to the shop</Link><h1 className="display mt-8 text-5xl text-[#1A312C]">That product is not available.</h1></main></PublicLayout>;
  const variant = product.variants[0];
  return <PublicLayout><main><section className="section-grid py-10 sm:py-16"><div className="site-container"><Link href="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-[#428475] hover:text-[#1A312C]"><ArrowLeft className="size-4" />Back to the shop</Link><div className="mt-8 grid gap-10 lg:grid-cols-[1.08fr_.92fr]"><div className="overflow-hidden rounded-[1.5rem] bg-[#89D7B7]/25">{product.images[0] ? <img src={product.images[0].url} alt={product.images[0].altText ?? product.title} className="aspect-[1.18] size-full object-cover" /> : <div className="aspect-[1.18] bg-[linear-gradient(135deg,#1A312C,#428475)]" />}</div><div className="lg:pt-6"><p className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-[#428475]">{product.productType || "Digital product"}</p><h1 className="display mt-4 text-5xl leading-[0.98] text-[#1A312C]">{product.title}</h1><p className="mt-6 text-base leading-7 text-[#1A312C]/68">{product.description}</p><div className="mt-8 flex items-center justify-between border-y border-[#1A312C]/12 py-5"><span className="text-sm text-[#1A312C]/65">One-time purchase</span><strong className="font-display text-3xl text-[#1A312C]">{money(product.priceRange.min.amount, product.priceRange.min.currencyCode)}</strong></div><button type="button" className="button-primary mt-6 w-full disabled:opacity-45" disabled={!variant?.availableForSale || loading} onClick={() => variant && addItem(variant.id)}>{loading ? <Loader2 className="size-4 animate-spin" /> : <ShoppingBag className="size-4" />}{variant?.availableForSale ? "Add to basket" : "Currently unavailable"}</button><div className="mt-8 grid gap-3">{["Digital delivery after secure checkout", "Designed for a clear, practical starting point", "Shopify-managed order and checkout experience"].map(item => <div key={item} className="flex items-center gap-3 text-sm text-[#1A312C]/67"><span className="grid size-5 place-items-center rounded-full bg-[#89D7B7]/35 text-[#1A312C]"><Check className="size-3" /></span>{item}</div>)}</div>{product.tags.length > 0 && <div className="mt-8 flex flex-wrap gap-2">{product.tags.map(tag => <span key={tag} className="rounded-full border border-[#1A312C]/12 px-3 py-1.5 text-xs text-[#1A312C]/65">{tag}</span>)}</div>}</div></div></div></section></main></PublicLayout>;
}
