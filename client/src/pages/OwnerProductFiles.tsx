import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { ownerNavigation } from "@/data/ownerNavigation";
import { trpc } from "@/lib/trpc";
import { Check, FileText, Loader2, LockKeyhole, ShieldAlert, Upload, X } from "lucide-react";
import { ChangeEvent, useMemo, useState } from "react";

function formatBytes(sizeBytes: number | null) {
  if (!sizeBytes) return "Unknown size";
  return sizeBytes < 1024 * 1024 ? `${Math.max(1, Math.round(sizeBytes / 1024))} KB` : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function OwnerProductFiles() {
  const { user } = useAuth({ scope: "owner" });
  const isOwner = user?.role === "admin";
  const products = trpc.portal.admin.products.list.useQuery(undefined, { enabled: isOwner });
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const productIdInput = useMemo(() => ({ productId: selectedProductId ?? 0 }), [selectedProductId]);
  const files = trpc.portal.admin.productFiles.list.useQuery(productIdInput, { enabled: isOwner && Boolean(selectedProductId) });
  const upload = trpc.portal.admin.productFiles.upload.useMutation({ onSuccess: () => files.refetch() });
  const remove = trpc.portal.admin.productFiles.remove.useMutation({ onSuccess: () => files.refetch() });
  const [notice, setNotice] = useState("");

  const uploadFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProductId) return;
    if (file.size > 8_000_000) { setNotice("Files must be smaller than 8 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.split(",", 2)[1] : result;
      upload.mutate({ productId: selectedProductId, fileName: file.name, mimeType: file.type || undefined, sizeBytes: file.size, base64 }, { onSuccess: () => setNotice(`${file.name} added to this product.`), onError: () => setNotice("We could not upload that file. Please try again.") });
    };
    reader.readAsDataURL(file);
    event.currentTarget.value = "";
  };

  return <DashboardLayout navigation={ownerNavigation} title="DJDC Owner"><div className="mx-auto max-w-5xl space-y-6 py-2">{!isOwner ? <section className="grid min-h-[60vh] place-items-center rounded-[1.5rem] border border-[#1A312C]/12 bg-white"><div className="max-w-md p-8 text-center"><ShieldAlert className="mx-auto size-8 text-[#428475]" /><h1 className="display mt-5 text-3xl text-[#1A312C]">Owner access required.</h1><p className="mt-3 text-sm leading-6 text-[#1A312C]/65">Only the owner can upload or manage product files.</p></div></section> : <><header className="rounded-[1.55rem] bg-[#1A312C] px-6 py-8 text-[#FFF4E1] sm:px-8"><p className="font-mono text-[.62rem] uppercase tracking-[.14em] text-[#89D7B7]">Product delivery files</p><h1 className="display mt-3 text-4xl">Manage the files included with each product.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#FFF4E1]/72">Upload PDFs, ZIPs, PNGs, images, documents, or other common file types. File names appear as product inclusions; actual file links remain controlled by the owner.</p></header>{notice ? <div className="flex items-center justify-between gap-3 rounded-xl bg-[#89D7B7]/30 px-4 py-3 text-sm text-[#1A312C]"><span className="flex items-center gap-2"><Check className="size-4" />{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notice"><X className="size-4" /></button></div> : null}<section className="rounded-[1.5rem] border border-[#1A312C]/10 bg-white p-5 sm:p-7"><label className="grid max-w-xl gap-2 text-sm font-bold text-[#1A312C]"><span>Choose a real product</span><select value={selectedProductId ?? ""} onChange={event => setSelectedProductId(event.target.value ? Number(event.target.value) : null)} className="form-field"><option value="">Select a product</option>{products.data?.filter(product => !product.isArchived).map(product => <option key={product.id} value={product.id}>{product.title} {product.isPublished ? "· published" : "· draft"}</option>)}</select></label>{products.isLoading ? <div className="grid min-h-36 place-items-center"><Loader2 className="size-6 animate-spin text-[#428475]" /></div> : !products.data?.length ? <div className="mt-6 rounded-xl border border-dashed border-[#1A312C]/15 bg-[#FFF4E1]/60 p-6 text-sm leading-6 text-[#1A312C]/64">Create a real product in Inventory first. Sample preview products intentionally cannot receive files or be purchased.</div> : selectedProductId ? <div className="mt-7"><div className="flex flex-col gap-4 border-b border-[#1A312C]/10 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Inclusions</p><h2 className="display mt-2 text-3xl text-[#1A312C]">Files attached to this product</h2></div><label className="button-primary w-fit cursor-pointer"><Upload className="size-4" />{upload.isPending ? "Uploading…" : "Upload file"}<input type="file" className="sr-only" onChange={uploadFile} disabled={upload.isPending} /></label></div><div className="mt-5 grid gap-3">{files.isLoading ? <div className="grid min-h-28 place-items-center"><Loader2 className="size-5 animate-spin text-[#428475]" /></div> : files.data?.length ? files.data.map(file => <article key={file.id} className="flex items-center justify-between gap-4 rounded-xl border border-[#1A312C]/10 bg-[#FFF4E1]/45 p-4"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#89D7B7]/26 text-[#428475]"><FileText className="size-5" /></span><div className="min-w-0"><p className="truncate text-sm font-bold text-[#1A312C]">{file.fileName}</p><p className="mt-1 text-xs text-[#1A312C]/55">{file.mimeType || "File"} · {formatBytes(file.sizeBytes)}</p></div></div><button onClick={() => remove.mutate({ productFileId: file.id }, { onSuccess: () => setNotice(`${file.fileName} removed.`) })} className="button-quiet !min-h-9 !px-3 text-xs" disabled={remove.isPending}>Remove</button></article>) : <div className="rounded-xl border border-dashed border-[#1A312C]/15 bg-[#FFF4E1]/45 p-6 text-sm leading-6 text-[#1A312C]/62">No files are attached yet. Upload the actual product file(s) to show their names and formats under Inclusions on the public product page.</div>}</div></div> : null}</section><aside className="flex items-start gap-3 rounded-[1.3rem] border border-[#428475]/18 bg-[#89D7B7]/14 p-5 text-sm leading-6 text-[#1A312C]/67"><LockKeyhole className="mt-0.5 size-5 shrink-0 text-[#428475]" /><p><strong className="text-[#1A312C]">Delivery safeguard:</strong> public product pages show file names and formats, not their stored links. Do not mark an order fulfilled or send a delivery link until you have confirmed its real payment and fulfilment conditions.</p></aside></>}</div></DashboardLayout>;
}
