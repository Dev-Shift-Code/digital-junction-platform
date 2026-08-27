import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { ownerNavigation } from "@/data/ownerNavigation";
import { trpc } from "@/lib/trpc";
import { Check, ImagePlus, Loader2, Pencil, Plus, QrCode, ShieldAlert, Trash2, Upload } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";

const paymentMethodTypes = ["GoTyme", "PayPal", "GCash", "MariBank"] as const;
type PaymentMethodType = (typeof paymentMethodTypes)[number];
type Draft = { paymentMethodId?: number; methodType: PaymentMethodType | ""; displayName: string; qrCodeUrl: string | null; qrCodeKey: string | null; instructions: string; isActive: boolean; sortOrder: number };
const blankDraft = (): Draft => ({ methodType: "", displayName: "", qrCodeUrl: null, qrCodeKey: null, instructions: "", isActive: true, sortOrder: 0 });
const acceptedQrImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File read failed."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export default function OwnerPaymentMethods() {
  const { user } = useAuth({ scope: "owner" });
  const isOwner = user?.role === "admin";
  const methods = trpc.portal.admin.paymentMethods.list.useQuery(undefined, { enabled: isOwner });
  const utils = trpc.useUtils();
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [notice, setNotice] = useState("");
  const [qrError, setQrError] = useState("");
  const save = trpc.portal.admin.paymentMethods.save.useMutation({ onSuccess: async () => { await utils.portal.admin.paymentMethods.list.invalidate(); setDraft(blankDraft()); setNotice("Payment method saved. Only active methods appear at buyer checkout."); } });
  const remove = trpc.portal.admin.paymentMethods.remove.useMutation({ onSuccess: async () => { await utils.portal.admin.paymentMethods.list.invalidate(); setDraft(blankDraft()); setNotice("Payment method removed."); } });
  const uploadQr = trpc.portal.admin.paymentMethods.uploadQrCode.useMutation();

  const chooseQrCode = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!acceptedQrImageTypes.has(file.type)) { setQrError("QR code must be a PNG, JPG, or WEBP image."); return; }
    try {
      setQrError("");
      const stored = await uploadQr.mutateAsync({ fileName: file.name, mimeType: file.type as "image/png" | "image/jpeg" | "image/webp", sizeBytes: file.size, base64: await readFileAsBase64(file) });
      setDraft(current => ({ ...current, qrCodeUrl: stored.url, qrCodeKey: stored.key }));
    } catch (error) {
      setQrError(error instanceof Error ? error.message : "The QR code could not be uploaded. Please try again.");
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    if (!draft.methodType) { setNotice("Select a payment method type before saving."); return; }
    save.mutate({ ...draft, logoUrl: null, logoKey: null, methodType: draft.methodType }, { onError: error => setNotice(error.message || "Payment method could not be saved.") });
  };
  const edit = (method: NonNullable<typeof methods.data>[number]) => { setDraft({ paymentMethodId: method.id, methodType: method.methodType as PaymentMethodType, displayName: method.displayName, qrCodeUrl: method.qrCodeUrl, qrCodeKey: method.qrCodeKey, instructions: method.instructions, isActive: method.isActive, sortOrder: method.sortOrder }); setNotice(""); setQrError(""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const deleteMethod = (id: number) => { if (window.confirm("Delete this payment method? Methods linked to recorded orders are protected and cannot be deleted.")) remove.mutate({ paymentMethodId: id }, { onError: error => setNotice(error.message || "Payment method could not be deleted.") }); };

  return <DashboardLayout navigation={ownerNavigation} title="DJDC Owner"><div className="mx-auto max-w-7xl space-y-6 py-2">{!isOwner ? <section className="grid min-h-[60vh] place-items-center rounded-[1.6rem] border border-[#1A312C]/12 bg-[#FFF4E1]"><div className="max-w-md p-8 text-center"><ShieldAlert className="mx-auto size-8 text-[#428475]" /><h1 className="display mt-5 text-3xl text-[#1A312C]">Owner access required.</h1><p className="mt-3 text-sm leading-6 text-[#1A312C]/65">Sign in with the separate owner account to configure payment methods.</p></div></section> : <><header className="rounded-[1.55rem] bg-[#1A312C] px-6 py-8 text-[#FFF4E1] sm:px-8"><p className="font-mono text-[.62rem] uppercase tracking-[.14em] text-[#89D7B7]">Owner payments</p><h1 className="display mt-3 text-4xl">Payment Methods</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#FFF4E1]/72">Configure only the payment methods you personally use. Buyer checkout shows the method name, QR code, instructions, and exact total; no payment logo is required.</p></header><div className="grid gap-6 xl:grid-cols-[.93fr_1.07fr]"><form onSubmit={submit} className="rounded-[1.55rem] border border-[#1A312C]/12 bg-[#FFF4E1] p-6 shadow-[0_14px_38px_rgba(26,49,44,.06)]"><div className="flex items-center justify-between gap-3"><div><p className="eyebrow">{draft.paymentMethodId ? "Edit payment method" : "New payment method"}</p><h2 className="display mt-1 text-3xl text-[#1A312C]">{draft.paymentMethodId ? draft.displayName || "Payment method" : "Add your method"}</h2></div>{draft.paymentMethodId ? <button type="button" className="button-quiet" onClick={() => { setDraft(blankDraft()); setQrError(""); }}>New method <Plus className="size-4" /></button> : null}</div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>Method type</span><select required className="form-field !bg-[#FFF4E1]" value={draft.methodType} onChange={event => setDraft({ ...draft, methodType: event.target.value as PaymentMethodType })}><option value="" disabled>Select payment type</option>{paymentMethodTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></label><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>Display name</span><input required className="form-field !bg-[#FFF4E1]" value={draft.displayName} onChange={event => setDraft({ ...draft, displayName: event.target.value })} placeholder="Shown to buyers" /></label></div><div className="mt-4"><QrCodePicker preview={draft.qrCodeUrl} busy={uploadQr.isPending} onChange={chooseQrCode} onRemove={() => setDraft({ ...draft, qrCodeUrl: null, qrCodeKey: null })} /></div>{qrError ? <p role="alert" className="mt-3 text-sm text-red-700">{qrError}</p> : null}<label className="mt-4 grid gap-2 text-sm font-bold text-[#1A312C]"><span>Buyer instructions</span><textarea required className="form-field min-h-32 resize-y !bg-[#FFF4E1]" value={draft.instructions} onChange={event => setDraft({ ...draft, instructions: event.target.value })} placeholder="Add the steps a buyer needs to complete payment. Do not place personal account numbers here; use the QR code where appropriate." /></label><div className="mt-4 flex flex-wrap items-center gap-5"><label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-[#1A312C]"><input type="checkbox" checked={draft.isActive} onChange={event => setDraft({ ...draft, isActive: event.target.checked })} className="size-4 accent-[#428475]" />Active at checkout</label><label className="flex items-center gap-2 text-sm font-bold text-[#1A312C]">Sort order <input type="number" min={0} className="form-field !h-9 !w-20 !bg-[#FFF4E1] !py-1" value={draft.sortOrder} onChange={event => setDraft({ ...draft, sortOrder: Number(event.target.value) || 0 })} /></label></div>{notice ? <p role="status" className="mt-5 rounded-xl border border-[#428475]/25 bg-[#89D7B7]/15 px-4 py-3 text-sm text-[#1A312C]">{notice}</p> : null}<button disabled={save.isPending || uploadQr.isPending} className="button-primary mt-6 disabled:opacity-60">{save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}{draft.paymentMethodId ? "Save changes" : "Save payment method"}</button></form><section className="rounded-[1.55rem] border border-[#1A312C]/12 bg-[#FFF4E1] p-6"><p className="eyebrow">Configured methods</p><h2 className="display mt-1 text-3xl text-[#1A312C]">Checkout availability</h2>{methods.isLoading ? <div className="grid min-h-64 place-items-center"><Loader2 className="size-6 animate-spin text-[#428475]" /></div> : methods.data?.length ? <div className="mt-6 space-y-3">{methods.data.map(method => <article key={method.id} className="flex gap-4 rounded-xl border border-[#1A312C]/12 bg-[#FFF4E1]/75 p-4"><div className="grid size-13 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#89D7B7]/22">{method.qrCodeUrl ? <img src={method.qrCodeUrl} alt="" className="size-full object-contain p-1" /> : <QrCode className="size-5 text-[#428475]" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-[#1A312C]">{method.displayName}</h3><span className={`rounded-full px-2 py-1 font-mono text-[.53rem] uppercase tracking-[.08em] ${method.isActive ? "bg-[#89D7B7]/32 text-[#1A312C]" : "bg-[#1A312C]/8 text-[#1A312C]/60"}`}>{method.isActive ? "Active" : "Inactive"}</span></div><p className="mt-1 font-mono text-[.55rem] uppercase tracking-[.08em] text-[#428475]">{method.methodType} · Order {method.sortOrder}</p><p className="mt-2 line-clamp-2 whitespace-pre-line text-xs leading-5 text-[#1A312C]/60">{method.instructions}</p></div><div className="flex flex-col gap-2"><button type="button" onClick={() => edit(method)} className="grid size-9 place-items-center rounded-lg border border-[#1A312C]/12 text-[#428475] transition hover:bg-[#89D7B7]/18" aria-label={`Edit ${method.displayName}`}><Pencil className="size-4" /></button><button type="button" onClick={() => deleteMethod(method.id)} disabled={remove.isPending} className="grid size-9 place-items-center rounded-lg border border-red-500/22 text-red-700 transition hover:bg-red-50 disabled:opacity-50" aria-label={`Delete ${method.displayName}`}><Trash2 className="size-4" /></button></div></article>)}</div> : <div className="mt-6 rounded-xl border border-dashed border-[#1A312C]/16 bg-[#89D7B7]/10 p-7"><p className="font-mono text-[.58rem] uppercase tracking-[.1em] text-[#428475]">No payment methods configured</p><p className="mt-2 text-sm leading-6 text-[#1A312C]/62">Add a real method here to enable payment selection in guest checkout. Nothing is prefilled or fabricated.</p></div>}</section></div></>}</div></DashboardLayout>;
}

function QrCodePicker({ preview, busy, onChange, onRemove }: { preview: string | null; busy: boolean; onChange: (event: ChangeEvent<HTMLInputElement>) => void; onRemove: () => void }) {
  return <div className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>QR code <span className="font-normal text-[#1A312C]/45">(optional)</span></span><div className="flex min-h-24 items-center gap-3 rounded-xl border border-dashed border-[#428475]/35 bg-[#89D7B7]/10 p-3">{preview ? <img src={preview} alt="QR code preview" className="size-16 rounded-lg border border-[#1A312C]/10 bg-[#FFF4E1] object-contain p-1" /> : <span className="grid size-16 place-items-center rounded-lg bg-[#1A312C]/7 text-[#428475]"><ImagePlus className="size-5" /></span>}<div className="min-w-0"><label className={`inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-[#428475] ${busy ? "pointer-events-none opacity-60" : ""}`}><Upload className="size-3.5" />{busy ? "Uploading…" : "Upload QR code"}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy} onChange={onChange} /></label>{preview ? <button type="button" onClick={onRemove} className="mt-2 block text-xs font-semibold text-red-700">Remove</button> : <p className="mt-2 text-[.68rem] font-normal leading-4 text-[#1A312C]/50">PNG, JPG, or WEBP · no app file-size limit</p>}<p className="mt-1 text-[.65rem] font-normal leading-4 text-[#1A312C]/50">The image is stored in Cloudinary; D1 stores only its secure reference.</p></div></div></div>;
}
