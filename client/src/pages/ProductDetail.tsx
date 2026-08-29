import PublicLayout from "@/components/PublicLayout";
import ProductPurchaseActions from "@/components/ProductPurchaseActions";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileBox, Loader2, ShoppingBag } from "lucide-react";
import { useMemo } from "react";
import { Link, useRoute } from "wouter";

function money(value: string | number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(Number(value));
}

export default function ProductDetail() {
  const [, params] = useRoute("/shop/:handle");
  const input = useMemo(() => ({ slug: params?.handle ?? "" }), [params?.handle]);
  const productQuery = trpc.portal.products.bySlug.useQuery(input, { enabled: Boolean(input.slug) });
  const product = productQuery.data;
  const textInclusions = productQuery.data?.deliveryNotes?.trim();

  if (productQuery.isLoading) return <PublicLayout><main className="grid min-h-[60vh] place-items-center"><Loader2 className="size-7 animate-spin text-[#428475]" /></main></PublicLayout>;
  if (!product || productQuery.error) return <PublicLayout><main className="site-container py-24"><Link href="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-[#428475]"><ArrowLeft className="size-4" />Back to products</Link><h1 className="display mt-8 text-5xl text-[#1A312C]">This product is not available.</h1></main></PublicLayout>;

  return (
    <PublicLayout>
      <main className="section-grid py-10 sm:py-16">
        <div className="site-container">
          <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-[#428475] hover:text-[#1A312C]"><ArrowLeft className="size-4" />Back to products</Link>
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)] lg:items-start">
            <div className="mx-auto w-full max-w-[24rem] overflow-hidden rounded-[1.5rem] bg-[#89D7B7]/25">
              {product.coverImageUrl ? <img src={product.coverImageUrl} alt={product.title} className="aspect-square size-full object-cover" /> : <div className="relative aspect-square overflow-hidden bg-[linear-gradient(135deg,#1A312C,#428475)]"><span className="absolute left-5 top-5 rounded-full bg-[#FFF4E1]/14 px-3 py-1 font-mono text-[.58rem] uppercase tracking-[.1em] text-[#FFF4E1]">{product.category}</span><div className="absolute inset-x-6 bottom-6 rounded-2xl border border-[#FFF4E1]/16 bg-[#FFF4E1]/10 p-5 text-[#FFF4E1]"><FileBox className="size-6 text-[#89D7B7]" /><p className="mt-5 font-mono text-[.56rem] uppercase tracking-[.1em] text-[#89D7B7]">Digital Junction</p><p className="mt-2 text-xl font-bold">{product.title}</p></div></div>}
            </div>
            <div className="lg:pt-4">
              <p className="font-mono text-[.66rem] uppercase tracking-[.12em] text-[#428475]">{product.category}</p>
              <h1 className="display mt-4 text-5xl leading-[.98] text-[#1A312C]">{product.title}</h1>
              <section className="mt-7"><p className="font-mono text-[.6rem] uppercase tracking-[.1em] text-[#428475]">Description</p><p className="mt-3 text-base leading-7 text-[#1A312C]/68">{product.description || product.summary}</p></section>
              <div className="mt-8 flex items-center justify-between border-y border-[#1A312C]/12 py-5"><span className="text-sm text-[#1A312C]/65">Product price</span><strong className="font-display text-3xl text-[#1A312C]">{money(product.price)}</strong></div>
              <section className="mt-7">
                <p className="font-mono text-[.6rem] uppercase tracking-[.1em] text-[#428475]">Inclusions</p>
                {textInclusions ? <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#1A312C]/68">{textInclusions}</p> : <div className="mt-3 rounded-xl border border-dashed border-[#1A312C]/15 bg-[#FFF4E1]/55 p-4 text-sm leading-6 text-[#1A312C]/63">The owner has not added text inclusions for this product yet.</div>}
              </section>
              <section className="mt-7 rounded-2xl border border-[#1A312C]/12 bg-[#FFF4E1]/78 p-5 shadow-[0_12px_30px_rgba(26,49,44,.04)]"><span className="grid size-10 place-items-center rounded-xl bg-[#89D7B7]/32 text-[#1A312C]"><ShoppingBag className="size-5" /></span><p className="eyebrow mt-5">Direct purchase</p><h2 className="display mt-3 text-2xl text-[#1A312C]">Ready to buy?</h2><p className="mt-2 text-sm leading-6 text-[#1A312C]/64">No account required. Your order is created on the next step; payment and file delivery are confirmed by the owner.</p><Link href={`/checkout/${product.slug}`} className="button-primary buttonlike mt-5">Buy now</Link><ProductPurchaseActions product={product} showGcash={false} showMarketplaceNote /></section>
            </div>
          </div>
        </div>
      </main>
    </PublicLayout>
  );
}
