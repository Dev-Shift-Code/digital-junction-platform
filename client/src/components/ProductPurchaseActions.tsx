import { ExternalLink, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export type ProductPurchaseMethods = {
  title: string;
  gcashQrCodeUrl?: string | null;
  gumroadUrl?: string | null;
  payhipUrl?: string | null;
};

function isExternalUrl(value: string | null | undefined): value is string {
  return Boolean(value && /^https?:\/\//i.test(value));
}

export default function ProductPurchaseActions({ product, showGcash = true, showMarketplaceNote = false }: { product: ProductPurchaseMethods; showGcash?: boolean; showMarketplaceNote?: boolean }) {
  const [qrOpen, setQrOpen] = useState(false);
  const hasGcash = showGcash && Boolean(product.gcashQrCodeUrl);
  const hasGumroad = isExternalUrl(product.gumroadUrl);
  const hasPayhip = isExternalUrl(product.payhipUrl);
  const portalTarget = typeof document === "undefined" ? null : document.body;

  useEffect(() => {
    if (!qrOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setQrOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [qrOpen]);

  if (!hasGcash && !hasGumroad && !hasPayhip) return null;

  return (
    <>
      {showMarketplaceNote && (hasGumroad || hasPayhip) ? <p className="mb-3 text-xs leading-5 text-[#1A312C]/62">If you don't want to wait for manual checking of your payment, you can purchase here:</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        {hasGcash ? (
          <button type="button" onClick={() => setQrOpen(true)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#1A312C] px-3 py-2 text-xs font-bold text-[#FFF4E1] transition hover:bg-[#428475] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#428475] focus-visible:ring-offset-2">
            <span aria-hidden="true">⌁</span>Purchase Here
          </button>
        ) : null}
        {hasGumroad ? (
          <a href={product.gumroadUrl!} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#1A312C]/18 bg-white px-3 py-2 text-xs font-bold text-[#1A312C] transition hover:border-[#428475] hover:text-[#428475] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#428475] focus-visible:ring-offset-2">
            Gumroad<ExternalLink className="size-3.5" />
          </a>
        ) : null}
        {hasPayhip ? (
          <a href={product.payhipUrl!} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#1A312C]/18 bg-white px-3 py-2 text-xs font-bold text-[#1A312C] transition hover:border-[#428475] hover:text-[#428475] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#428475] focus-visible:ring-offset-2">
            Payhip<ExternalLink className="size-3.5" />
          </a>
        ) : null}
      </div>
      {qrOpen && hasGcash && portalTarget
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] grid place-items-center bg-[#1A312C]/70 p-4"
              role="presentation"
              onMouseDown={event => {
                if (event.target === event.currentTarget) setQrOpen(false);
              }}
            >
              <section
                onMouseDown={event => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="gcash-qr-title"
                className="relative max-h-[90vh] w-full max-w-md overflow-auto rounded-[1.5rem] bg-[#FFF4E1] p-5 shadow-2xl sm:p-7"
              >
                <button type="button" onClick={() => setQrOpen(false)} aria-label="Close GCash QR code" className="absolute right-4 top-4 grid size-9 place-items-center rounded-full border border-[#1A312C]/12 text-[#1A312C] transition hover:bg-[#89D7B7]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#428475]">
                  <X className="size-4" />
                </button>
                <p className="eyebrow">GCash purchase</p>
                <h2 id="gcash-qr-title" className="display mt-2 pr-10 text-3xl text-[#1A312C]">Scan to purchase {product.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#1A312C]/65">Use your GCash app to scan this product’s QR code. Keep your payment confirmation for your records.</p>
                <img src={product.gcashQrCodeUrl!} alt={`GCash QR code for ${product.title}`} className="mx-auto mt-6 max-h-[55vh] w-full rounded-2xl border border-[#1A312C]/10 bg-white p-4 object-contain" />
                <button type="button" onClick={() => setQrOpen(false)} className="button-primary mt-5 w-full">Close</button>
              </section>
            </div>,
            portalTarget,
          )
        : null}
    </>
  );
}
