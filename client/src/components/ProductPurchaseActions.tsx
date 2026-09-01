import { ExternalLink } from "lucide-react";

export type ProductPurchaseMethods = {
  title: string;
  gumroadUrl?: string | null;
  payhipUrl?: string | null;
};

function isExternalUrl(value: string | null | undefined): value is string {
  return Boolean(value && /^https?:\/\//i.test(value));
}

export default function ProductPurchaseActions({ product, showMarketplaceNote = false }: { product: ProductPurchaseMethods; showMarketplaceNote?: boolean }) {
  const hasGumroad = isExternalUrl(product.gumroadUrl);
  const hasPayhip = isExternalUrl(product.payhipUrl);

  if (!hasGumroad && !hasPayhip) return null;

  return (
    <>
      {showMarketplaceNote ? <p className="mb-3 text-xs leading-5 text-[#1A312C]/62">If you don't want to wait for manual checking of your payment, you can purchase here:</p> : null}
      <div className="flex w-full flex-nowrap items-center gap-2">
        {hasGumroad ? (
          <a href={product.gumroadUrl!} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#1A312C]/18 bg-white px-2 py-2 text-xs font-bold text-[#1A312C] transition hover:border-[#428475] hover:text-[#428475] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#428475] focus-visible:ring-offset-2">
            Gumroad<ExternalLink className="size-3.5" />
          </a>
        ) : null}
        {hasPayhip ? (
          <a href={product.payhipUrl!} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#1A312C]/18 bg-white px-2 py-2 text-xs font-bold text-[#1A312C] transition hover:border-[#428475] hover:text-[#428475] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#428475] focus-visible:ring-offset-2">
            Payhip<ExternalLink className="size-3.5" />
          </a>
        ) : null}
      </div>
    </>
  );
}
