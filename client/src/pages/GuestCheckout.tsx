import PublicLayout from "@/components/PublicLayout";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, CreditCard, ImagePlus, Loader2, LockKeyhole, ShoppingBag } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";

type PaymentProof = { fileName: string; mimeType: string; sizeBytes: number; base64: string };
const acceptedPaymentImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

function money(value: string | number) { return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(Number(value)); }

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export default function GuestCheckout() {
  const [, params] = useRoute("/checkout/:handle");
  const input = useMemo(() => ({ slug: params?.handle ?? "" }), [params?.handle]);
  const productQuery = trpc.portal.products.bySlug.useQuery(input, { enabled: Boolean(input.slug) });
  const paymentMethods = trpc.portal.paymentMethods.listActive.useQuery();
  const purchase = trpc.portal.products.guestCheckout.useMutation();
  const [orderId, setOrderId] = useState<number | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [proof, setProof] = useState<PaymentProof | null>(null);
  const [proofError, setProofError] = useState("");
  const [isReadingProof, setIsReadingProof] = useState(false);
  const product = productQuery.data;
  const selectedMethod = paymentMethods.data?.find(method => method.id === selectedPaymentId) ?? null;

  useEffect(() => {
    if (!selectedPaymentId && paymentMethods.data?.[0]) setSelectedPaymentId(paymentMethods.data[0].id);
  }, [paymentMethods.data, selectedPaymentId]);

  const chooseProof = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!acceptedPaymentImageTypes.has(file.type)) { setProof(null); setProofError("Payment proof must be a PNG, JPG, or WEBP image."); return; }
    if (file.size > 5_000_000) { setProof(null); setProofError("Payment proof must be 5 MB or smaller."); return; }
    try {
      setIsReadingProof(true);
      setProof({ fileName: file.name, mimeType: file.type, sizeBytes: file.size, base64: await readFileAsBase64(file) });
      setProofError("");
    } catch {
      setProof(null);
      setProofError("We could not read that image. Please choose it again.");
    } finally {
      setIsReadingProof(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!productQuery.data || !selectedMethod || !proof) {
      setProofError(!selectedMethod ? "Select a payment method first." : "Upload your payment screenshot before placing the order.");
      return;
    }
    const form = new FormData(event.currentTarget);
    purchase.mutate({ productId: productQuery.data.id, name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), company: String(form.get("company") ?? "") || undefined, message: String(form.get("message") ?? "") || undefined, paymentMethodId: selectedMethod.id, paymentReference: String(form.get("paymentReference") ?? ""), paymentProofFileName: proof.fileName, paymentProofMimeType: proof.mimeType as "image/png" | "image/jpeg" | "image/webp", paymentProofSizeBytes: proof.sizeBytes, paymentProofBase64: proof.base64 }, { onSuccess: order => setOrderId(order.requestId) });
  };

  if (productQuery.isLoading) return <PublicLayout><main className="grid min-h-[60vh] place-items-center bg-[#FFF4E1]"><Loader2 className="size-7 animate-spin text-[#428475]" /></main></PublicLayout>;
  if (!product || productQuery.error) return <PublicLayout><main className="section-grid min-h-[60vh] py-24"><div className="site-container"><Link href="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-[#428475]"><ArrowLeft className="size-4" />Back to products</Link><h1 className="display mt-8 text-5xl text-[#1A312C]">This product is not available.</h1></div></main></PublicLayout>;

  // Payment remains pending until it is manually verified; checkout never treats a proof upload as a completed payment.
  return <PublicLayout><main className="section-grid bg-[#FFF4E1] py-10 sm:py-16"><div className="site-container"><Link href={`/shop/${product.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-[#428475]"><ArrowLeft className="size-4" />Back to product details</Link><div className="mt-8 grid gap-8 lg:grid-cols-[.82fr_1.18fr]"><aside className="h-fit rounded-[1.5rem] bg-[#1A312C] p-6 text-[#FFF4E1] shadow-[0_18px_45px_rgba(26,49,44,.14)] sm:p-8"><span className="grid size-11 place-items-center rounded-xl bg-[#89D7B7]/20 text-[#89D7B7]"><ShoppingBag className="size-5" /></span><p className="mt-7 font-mono text-[.6rem] uppercase tracking-[.12em] text-[#89D7B7]">Direct purchase</p><h1 className="display mt-3 text-4xl leading-tight">{product.title}</h1><p className="mt-4 text-sm leading-6 text-[#FFF4E1]/68">{product.summary}</p><div className="mt-7 border-y border-[#FFF4E1]/18 py-5"><p className="font-mono text-[.55rem] uppercase tracking-[.1em] text-[#FFF4E1]/46">Order total</p><p className="mt-2 text-3xl font-bold">{money(product.price)}</p></div><div className="mt-6 flex items-start gap-3 text-xs leading-5 text-[#FFF4E1]/66"><LockKeyhole className="mt-0.5 size-4 shrink-0 text-[#89D7B7]" /><p><strong className="text-[#FFF4E1]">No account is required.</strong> Your payment proof is sent only to Digital Junction for manual verification. Files remain protected until the owner confirms payment and fulfilment.</p></div></aside><section className="rounded-[1.5rem] border border-[#1A312C]/12 bg-[#FFF4E1] p-6 shadow-[0_18px_45px_rgba(26,49,44,.06)] sm:p-8">{orderId ? <div className="grid min-h-80 place-items-center text-center"><div className="max-w-md"><CheckCircle2 className="mx-auto size-9 text-[#428475]" /><p className="eyebrow mt-5">Payment proof submitted</p><h2 className="display mt-3 text-3xl text-[#1A312C]">Your order is pending review.</h2><p className="mt-3 text-sm leading-6 text-[#1A312C]/62">Reference #{orderId}. This is not a payment receipt, invoice, or delivery confirmation. Digital Junction will review the proof and contact you using the submitted email.</p><Link href="/shop" className="button-primary buttonlike mt-6">Continue browsing</Link></div></div> : <form onSubmit={submit} className="grid gap-6"><div><p className="eyebrow">Place your order</p><h2 className="display mt-3 text-3xl text-[#1A312C]">Buy without an account.</h2><p className="mt-2 text-sm leading-6 text-[#1A312C]/62">Choose an available payment method, follow its instructions, then submit your payment reference and screenshot.</p></div><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>Name</span><input required name="name" autoComplete="name" className="form-field !bg-[#FFF4E1]" placeholder="Your name" /></label><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>Email</span><input required type="email" name="email" autoComplete="email" className="form-field !bg-[#FFF4E1]" placeholder="you@example.com" /></label></div><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>Company <span className="font-normal text-[#1A312C]/45">(optional)</span></span><input name="company" autoComplete="organization" className="form-field !bg-[#FFF4E1]" placeholder="Company or team name" /></label><div className="rounded-xl border border-[#428475]/22 bg-[#89D7B7]/14 p-4"><div className="flex items-center gap-2"><CreditCard className="size-4 text-[#428475]" /><h3 className="text-sm font-bold text-[#1A312C]">Payment method</h3></div>{paymentMethods.isLoading ? <div className="grid min-h-24 place-items-center"><Loader2 className="size-5 animate-spin text-[#428475]" /></div> : paymentMethods.data?.length ? <><div className="mt-4 grid gap-2 sm:grid-cols-2">{paymentMethods.data.map(method => <button key={method.id} type="button" onClick={() => { setSelectedPaymentId(method.id); setProofError(""); }} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${selectedPaymentId === method.id ? "border-[#428475] bg-[#FFF4E1] shadow-sm" : "border-[#1A312C]/12 bg-[#FFF4E1]/55 hover:border-[#428475]/45"}`}>{method.logoUrl ? <img src={method.logoUrl} alt="" className="size-9 rounded-lg object-cover" /> : <span className="grid size-9 place-items-center rounded-lg bg-[#1A312C] font-mono text-[.55rem] text-[#89D7B7]">DJ</span>}<span><span className="block text-sm font-bold text-[#1A312C]">{method.displayName}</span><span className="mt-0.5 block font-mono text-[.53rem] uppercase tracking-[.08em] text-[#428475]">{method.methodType}</span></span></button>)}</div>{selectedMethod ? <div className="mt-4 grid gap-4 rounded-xl border border-[#1A312C]/10 bg-[#FFF4E1]/65 p-4 sm:grid-cols-[8rem_1fr]">{selectedMethod.qrCodeUrl ? <img src={selectedMethod.qrCodeUrl} alt={`${selectedMethod.displayName} QR code`} className="aspect-square w-full rounded-lg border border-[#1A312C]/12 bg-[#FFF4E1] object-contain p-1" /> : <div className="grid aspect-square place-items-center rounded-lg bg-[#1A312C] p-3 text-center font-mono text-[.58rem] uppercase tracking-[.08em] text-[#89D7B7]">Use the instructions</div>}<div><p className="font-mono text-[.56rem] uppercase tracking-[.1em] text-[#428475]">{selectedMethod.displayName}</p><p className="mt-2 whitespace-pre-line text-xs leading-5 text-[#1A312C]/70">{selectedMethod.instructions}</p></div></div> : null}</> : <p className="mt-3 text-sm leading-6 text-[#1A312C]/65">No payment methods are available yet. The owner needs to add one in Owner Settings before an order can be placed.</p>}</div><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>Payment reference</span><input required disabled={!selectedMethod} name="paymentReference" maxLength={180} className="form-field !bg-[#FFF4E1] disabled:opacity-55" placeholder="Transaction or reference number" /></label><div className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>Payment screenshot</span><label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#428475]/38 bg-[#FFF4E1]/72 px-3 text-xs font-semibold text-[#428475] transition hover:bg-[#89D7B7]/22 ${isReadingProof ? "pointer-events-none opacity-60" : ""}`}><ImagePlus className="size-4" />{isReadingProof ? "Reading image…" : proof ? proof.fileName : "Upload screenshot"}<input type="file" accept="image/*" className="sr-only" onChange={chooseProof} disabled={!selectedMethod || isReadingProof} /></label></div></div><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>Order note <span className="font-normal text-[#1A312C]/45">(optional)</span></span><textarea name="message" maxLength={5000} className="form-field min-h-24 resize-y !bg-[#FFF4E1]" placeholder="Anything we should know before fulfilment?" /></label>{proofError || purchase.error ? <p role="alert" className="rounded-xl border border-red-400/40 bg-red-50 px-4 py-3 text-sm text-red-800">{proofError || "We could not submit your order. Please check the details and try again."}</p> : null}<div className="flex flex-wrap items-center gap-4"><button disabled={purchase.isPending || !selectedMethod || !proof} className="button-primary disabled:opacity-60">{purchase.isPending ? <Loader2 className="size-4 animate-spin" /> : <ShoppingBag className="size-4" />}Place order</button><p className="text-xs leading-5 text-[#1A312C]/55">Payment proof will be verified by DJDC before delivery.</p></div></form>}</section></div></div></main></PublicLayout>;
}
