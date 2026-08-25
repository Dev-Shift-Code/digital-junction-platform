import { useCart } from "@/contexts/CartContext";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";

function money(amount: string, currency: string) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(amount));
}

export default function CartDrawer() {
  const { cart, isOpen, closeCart, loading, updateQuantity, removeItem, proceedToCheckout } = useCart();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping basket">
      <button className="absolute inset-0 bg-[#1A312C]/55" onClick={closeCart} aria-label="Close basket" />
      <aside className="cart-panel relative flex h-full w-full max-w-md flex-col bg-[#FFF4E1] p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-[#1A312C]/10 pb-5">
          <div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-[#1A312C] text-[#89D7B7]"><ShoppingBag className="size-4" /></span><div><h2 className="font-display text-xl tracking-tight text-[#1A312C]">Your basket</h2><p className="font-mono text-[0.64rem] uppercase tracking-[0.1em] text-[#428475]">{cart?.itemCount ?? 0} selected</p></div></div>
          <button type="button" className="button-quiet !min-h-9 !border-0 !px-2" onClick={closeCart} aria-label="Close basket"><X className="size-4" /></button>
        </div>
        {!cart?.items.length ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center"><div className="grid size-14 place-items-center rounded-2xl bg-[#89D7B7]/35 text-[#1A312C]"><ShoppingBag className="size-6" /></div><h3 className="mt-5 font-display text-2xl text-[#1A312C]">A clear desk.</h3><p className="mt-2 text-sm leading-6 text-[#1A312C]/65">Explore the shop when you are ready to add a useful digital tool.</p></div>
        ) : (
          <div className="flex-1 overflow-y-auto py-5">
            <div className="grid gap-4">
              {cart.items.map(item => (
                <div key={item.lineId} className="flex gap-3 rounded-2xl border border-[#1A312C]/10 bg-white/55 p-3">
                  {item.image ? <img src={item.image.url} alt={item.image.altText ?? item.productTitle} className="size-16 rounded-xl object-cover" /> : <div className="size-16 rounded-xl bg-[#89D7B7]/35" />}
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#1A312C]">{item.productTitle}</p>{item.variantTitle !== "Default Title" && <p className="mt-0.5 text-xs text-[#1A312C]/55">{item.variantTitle}</p>}<p className="mt-1 font-mono text-xs text-[#428475]">{money(item.lineTotal.amount, item.lineTotal.currencyCode)}</p><div className="mt-2 flex items-center justify-between"><div className="flex items-center rounded-lg border border-[#1A312C]/12 bg-[#FFF4E1]"><button type="button" className="grid size-7 place-items-center disabled:opacity-45" disabled={loading} onClick={() => updateQuantity(item.lineId, item.quantity - 1)} aria-label={`Reduce ${item.productTitle} quantity`}><Minus className="size-3" /></button><span className="w-6 text-center font-mono text-xs">{item.quantity}</span><button type="button" className="grid size-7 place-items-center disabled:opacity-45" disabled={loading} onClick={() => updateQuantity(item.lineId, item.quantity + 1)} aria-label={`Increase ${item.productTitle} quantity`}><Plus className="size-3" /></button></div><button type="button" className="p-1.5 text-[#1A312C]/45 hover:text-red-700" disabled={loading} onClick={() => removeItem(item.lineId)} aria-label={`Remove ${item.productTitle}`}><Trash2 className="size-3.5" /></button></div></div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="border-t border-[#1A312C]/10 pt-5">
          <div className="mb-4 flex items-center justify-between"><span className="text-sm text-[#1A312C]/65">Total</span><strong className="font-display text-2xl text-[#1A312C]">{cart ? money(cart.total.amount, cart.total.currencyCode) : "—"}</strong></div>
          <button type="button" className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-50" disabled={!cart?.itemCount || loading} onClick={proceedToCheckout}>Checkout securely</button>
          <p className="mt-3 text-center text-xs leading-5 text-[#1A312C]/50">Checkout is completed securely through Shopify.</p>
        </div>
      </aside>
    </div>
  );
}
