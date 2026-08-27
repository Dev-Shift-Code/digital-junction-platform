import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import ConfirmDialog from "@/components/ConfirmDialog";
import { ownerNavigation } from "@/data/ownerNavigation";
import { trpc } from "@/lib/trpc";
import {
  Archive,
  Check,
  Eye,
  FileText,
  FolderArchive,
  ImagePlus,
  Loader2,
  LockKeyhole,
  PackageOpen,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Store,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";

type ProductValues = {
  id: number;
  title: string;
  slug: string;
  category: string;
  summary: string;
  description: string | null;
  deliveryNotes: string | null;
  price: string;
  coverImageUrl: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  isArchived: boolean;
  sortOrder: number;
};

type InventoryStatus = "all" | "active" | "draft" | "archived";

type InventoryRow = {
  id: number | string;
  title: string;
  category: string;
  summary: string;
  price: number;
  status: "Active" | "Draft" | "Archived" | "Preview only";
  detail: string;
  isSample: boolean;
  source?: ProductValues;
};

type PendingCover = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  base64: string;
  previewUrl: string;
};

type PendingBuyerFile = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  base64: string;
};

type StoredBuyerFile = {
  id: number;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
};

function money(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(value);
}

function formatBytes(sizeBytes: number | null) {
  if (sizeBytes === null) return "Unknown size";
  return sizeBytes < 1024 * 1024 ? `${Math.max(1, Math.round(sizeBytes / 1024))} KB` : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",", 2)[1] : result);
    };
    reader.onerror = () => reject(new Error("File could not be read."));
    reader.readAsDataURL(file);
  });
}

function ProductFields({
  product,
  pendingCover,
  onCoverChange,
  onCoverRemove,
}: {
  product?: ProductValues;
  pendingCover: PendingCover | null;
  onCoverChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCoverRemove: () => void;
}) {
  const currentCover = pendingCover?.previewUrl || product?.coverImageUrl;

  return (
    <div className="grid gap-3">
      <div className="rounded-xl border border-dashed border-[#428475]/35 bg-[#89D7B7]/12 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[#1A312C]">Product cover</p>
            <p className="mt-1 text-xs leading-5 text-[#1A312C]/60">Upload a local image for the public product cover. You can remove or replace it anytime.</p>
          </div>
          <label className="button-quiet w-fit cursor-pointer !min-h-9 !px-3 text-xs">
            <ImagePlus className="size-3.5" />
            {currentCover ? "Replace cover" : "Upload cover"}
            <input type="file" accept="image/*" className="sr-only" onChange={onCoverChange} />
          </label>
        </div>
        {currentCover ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#1A312C]/10 bg-white/75 p-2">
            <img src={currentCover} alt="Selected product cover preview" className="size-16 rounded-md border border-[#1A312C]/10 object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-[#1A312C]">{pendingCover?.fileName || "Current product cover"}</p>
              <p className="mt-1 text-[.68rem] text-[#1A312C]/55">Local upload preview</p>
            </div>
            <button type="button" onClick={onCoverRemove} className="button-quiet !min-h-9 !px-3 text-xs text-rose-700">
              <X className="size-3.5" />Remove
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input required name="title" defaultValue={product?.title ?? ""} className="form-field text-sm" placeholder="Product title" />
        <input required name="category" defaultValue={product?.category ?? ""} className="form-field text-sm" placeholder="Category" />
      </div>
      <textarea required minLength={10} name="summary" defaultValue={product?.summary ?? ""} className="form-field min-h-20 resize-y text-sm" placeholder="Short public summary" />
      <textarea name="description" defaultValue={product?.description ?? ""} className="form-field min-h-24 resize-y text-sm" placeholder="Full product description (optional)" />
      <label className="grid gap-1.5 text-sm font-bold text-[#1A312C]">
        <span>Inclusions <span className="font-normal text-[#1A312C]/55">(text only)</span></span>
        <textarea name="deliveryNotes" defaultValue={product?.deliveryNotes ?? ""} className="form-field min-h-20 resize-y text-sm font-normal" placeholder="Example: Editable source files, step-by-step guide, bonus templates" />
      </label>
      <input required min="0" step="0.01" type="number" name="price" defaultValue={product?.price ?? ""} className="form-field text-sm" placeholder="Price in PHP" />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <label className="flex items-center gap-2 text-sm text-[#1A312C]/70"><input name="isPublished" type="checkbox" defaultChecked={product?.isPublished ?? false} />Publish publicly</label>
        <label className="flex items-center gap-2 text-sm text-[#1A312C]/70"><input name="isFeatured" type="checkbox" defaultChecked={product?.isFeatured ?? false} />Feature on catalogue</label>
        <label className="flex items-center gap-2 text-sm text-[#1A312C]/70">Order <input name="sortOrder" type="number" min="0" defaultValue={product?.sortOrder ?? 0} className="form-field !h-9 !w-18 !py-1 text-sm" /></label>
      </div>
    </div>
  );
}

function BuyerFilesPanel({
  product,
  pendingFiles,
  storedFiles,
  filesLoading,
  isUploading,
  isRemoving,
  onSelectFiles,
  onRemovePending,
  onRemoveStored,
}: {
  product?: ProductValues;
  pendingFiles: PendingBuyerFile[];
  storedFiles?: StoredBuyerFile[];
  filesLoading: boolean;
  isUploading: boolean;
  isRemoving: boolean;
  onSelectFiles: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemovePending: (fileId: string) => void;
  onRemoveStored: (fileId: number, fileName: string) => void;
}) {
  const canAttachFiles = !product || !product.isArchived;

  return (
    <section className="mt-5 rounded-[1.25rem] border border-[#428475]/22 bg-[#89D7B7]/10 p-4 sm:p-5">
      <div className="flex flex-col gap-4 border-b border-[#1A312C]/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Buyer delivery files</p>
          <h3 className="display mt-2 text-2xl text-[#1A312C]">Files the buyer receives</h3>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-[#1A312C]/62">Upload PDFs, ZIPs, PNGs, documents, or any other file type here. These are separate from the text-only Inclusions above.</p>
        </div>
        {canAttachFiles ? (
          <div>
            <input id={`buyer-delivery-files-${product?.id ?? "new"}`} type="file" multiple accept="*/*" className="sr-only" onChange={onSelectFiles} disabled={isUploading} />
            <label htmlFor={`buyer-delivery-files-${product?.id ?? "new"}`} className={`button-primary w-fit cursor-pointer ${isUploading ? "pointer-events-none opacity-60" : ""}`}>
              <Upload className="size-4" />
              {isUploading ? "Uploading…" : "Add buyer files"}
            </label>
          </div>
        ) : null}
      </div>

      {product?.isArchived ? <p className="mt-4 rounded-lg bg-white/65 px-3 py-3 text-xs leading-5 text-[#1A312C]/64">Restore this archived listing before attaching buyer files.</p> : null}

      {pendingFiles.length ? (
        <div className="mt-5">
          <p className="font-mono text-[.58rem] uppercase tracking-[.1em] text-[#1A312C]/48">Queued for upload</p>
          <p className="mt-1 text-xs leading-5 text-[#1A312C]/60">{product ? "These files will upload when you save changes." : "These files will upload when you save this new product."}</p>
          <div className="mt-3 grid gap-2">
            {pendingFiles.map(file => (
              <article key={file.id} className="flex items-center justify-between gap-4 rounded-xl border border-[#1A312C]/10 bg-white/75 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#89D7B7]/28 text-[#428475]"><FileText className="size-4" /></span>
                  <div className="min-w-0"><p className="truncate text-sm font-bold text-[#1A312C]">{file.fileName}</p><p className="mt-0.5 text-xs text-[#1A312C]/55">{file.mimeType || "File"} · {formatBytes(file.sizeBytes)}</p></div>
                </div>
                <button type="button" onClick={() => onRemovePending(file.id)} className="button-quiet !min-h-9 !px-3 text-xs text-rose-700"><X className="size-3.5" />Remove</button>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {product ? (
        <div className="mt-5">
          <p className="font-mono text-[.58rem] uppercase tracking-[.1em] text-[#1A312C]/48">Saved buyer files</p>
          {filesLoading ? <div className="grid min-h-20 place-items-center"><Loader2 className="size-5 animate-spin text-[#428475]" /></div> : storedFiles?.length ? <div className="mt-3 grid gap-2">{storedFiles.map(file => <article key={file.id} className="flex items-center justify-between gap-4 rounded-xl border border-[#1A312C]/10 bg-white/75 p-3"><div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#89D7B7]/28 text-[#428475]"><FileText className="size-4" /></span><div className="min-w-0"><p className="truncate text-sm font-bold text-[#1A312C]">{file.fileName}</p><p className="mt-0.5 text-xs text-[#1A312C]/55">{file.mimeType || "File"} · {formatBytes(file.sizeBytes)}</p></div></div><button type="button" onClick={() => onRemoveStored(file.id, file.fileName)} disabled={isRemoving} className="button-quiet !min-h-9 !px-3 text-xs text-rose-700 disabled:opacity-50"><X className="size-3.5" />Remove</button></article>)}</div> : <p className="mt-3 rounded-lg border border-dashed border-[#1A312C]/15 bg-white/60 px-3 py-3 text-xs leading-5 text-[#1A312C]/60">No buyer files are attached yet.</p>}
        </div>
      ) : null}

      <aside className="mt-5 flex items-start gap-3 rounded-xl border border-[#428475]/18 bg-white/52 p-3 text-xs leading-5 text-[#1A312C]/65">
        <LockKeyhole className="mt-0.5 size-4 shrink-0 text-[#428475]" />
        <p><strong className="text-[#1A312C]">Delivery safeguard:</strong> public product pages show only file names and formats. The stored delivery links remain owner-controlled until you confirm real payment and fulfilment.</p>
      </aside>
    </section>
  );
}

export default function OwnerProducts() {
  const { user } = useAuth({ scope: "owner" });
  const isOwner = user?.role === "admin";
  const products = trpc.portal.admin.products.list.useQuery(undefined, { enabled: isOwner });
  const saveProduct = trpc.portal.admin.products.save.useMutation();
  const uploadCover = trpc.portal.admin.productCovers.upload.useMutation();
  const removeCover = trpc.portal.admin.productCovers.remove.useMutation();
  const uploadBuyerFile = trpc.portal.admin.productFiles.upload.useMutation();
  const removeBuyerFile = trpc.portal.admin.productFiles.remove.useMutation();
  const deleteProduct = trpc.portal.admin.products.delete.useMutation();
  const [status, setStatus] = useState<InventoryStatus>("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [editor, setEditor] = useState<ProductValues | "new" | null>(null);
  const [notice, setNotice] = useState("");
  const [pendingCover, setPendingCover] = useState<PendingCover | null>(null);
  const [pendingBuyerFiles, setPendingBuyerFiles] = useState<PendingBuyerFile[]>([]);
  const [pendingDelete, setPendingDelete] = useState<{ kind: "product" | "buyer-file"; id: number; label: string } | null>(null);

  const currentProductId = editor && editor !== "new" ? editor.id : 0;
  const currentProductFileInput = useMemo(() => ({ productId: currentProductId }), [currentProductId]);
  const attachedBuyerFiles = trpc.portal.admin.productFiles.list.useQuery(currentProductFileInput, { enabled: isOwner && currentProductId > 0 });

  const realRows = useMemo<InventoryRow[]>(() => (products.data ?? []).map(raw => {
    const item = raw as ProductValues;
    const itemStatus: InventoryRow["status"] = item.isArchived ? "Archived" : item.isPublished ? "Active" : "Draft";
    return { id: item.id, title: item.title, category: item.category, summary: item.summary, price: Number(item.price), status: itemStatus, detail: item.deliveryNotes?.slice(0, 52) || "Digital product listing", isSample: false, source: item };
  }), [products.data]);
  const usingSamples = false;
  const sourceRows = realRows;
  const categories = useMemo(() => Array.from(new Set(sourceRows.map(row => row.category))).sort(), [sourceRows]);
  const filteredRows = useMemo(() => sourceRows.filter(row => {
    const matchesStatus = status === "all" || (status === "active" && row.status === "Active") || (status === "draft" && row.status === "Draft") || (status === "archived" && row.status === "Archived");
    const matchesCategory = category === "all" || row.category === category;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${row.title} ${row.category} ${row.summary}`.toLowerCase().includes(query);
    return matchesStatus && matchesCategory && matchesSearch;
  }), [category, search, sourceRows, status]);
  const counts = useMemo(() => ({
    all: realRows.length,
    active: realRows.filter(row => row.status === "Active").length,
    draft: realRows.filter(row => row.status === "Draft").length,
    archived: realRows.filter(row => row.status === "Archived").length,
  }), [realRows]);

  const payloadFromForm = (form: FormData, product?: ProductValues) => {
    const title = String(form.get("title") ?? "").trim();
    return {
      ...(product ? { productId: product.id, slug: product.slug, isArchived: product.isArchived } : { slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), isArchived: false }),
      title,
      category: String(form.get("category")),
      summary: String(form.get("summary")),
      description: String(form.get("description")) || null,
      deliveryNotes: String(form.get("deliveryNotes")) || null,
      price: Number(form.get("price")),
      coverImageUrl: product?.coverImageUrl ?? null,
      isPublished: form.get("isPublished") === "on",
      isFeatured: form.get("isFeatured") === "on",
      sortOrder: Number(form.get("sortOrder")) || 0,
    };
  };

  const closeEditor = () => {
    setEditor(null);
    setPendingCover(null);
    setPendingBuyerFiles([]);
  };
  const openEditor = (value: ProductValues | "new") => {
    setPendingCover(null);
    setPendingBuyerFiles([]);
    setEditor(value);
  };
  const finishSave = async (message: string) => {
    setNotice(message);
    closeEditor();
    await products.refetch();
  };

  const selectCover = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setNotice("Product covers must be image files."); return; }
    if (file.size > 5_000_000) { setNotice("Product covers must be smaller than 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      setPendingCover({ fileName: file.name, mimeType: file.type, sizeBytes: file.size, base64: result.includes(",") ? result.split(",", 2)[1] : result, previewUrl: result });
    };
    reader.readAsDataURL(file);
  };
  const clearCover = () => {
    if (pendingCover) { setPendingCover(null); return; }
    if (editor && editor !== "new" && editor.coverImageUrl) {
      removeCover.mutate({ productId: editor.id }, {
        onSuccess: async updated => {
          setEditor({ ...editor, coverImageUrl: updated.coverImageUrl });
          setNotice("Product cover removed.");
          await products.refetch();
        },
        onError: () => setNotice("We could not remove the cover. Please try again."),
      });
    }
  };

  const selectBuyerFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.currentTarget.value = "";
    if (!selected.length) return;
    try {
      const staged = await Promise.all(selected.map(async file => ({
        id: `${file.name}-${file.lastModified}-${file.size}-${Math.random().toString(36).slice(2)}`,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        base64: await readFileAsBase64(file),
      })));
      if (editor && editor !== "new") {
        const failedFiles: PendingBuyerFile[] = [];
        let failureDetail = "";
        let uploadedCount = 0;
        for (const file of staged) {
          try {
            await uploadBuyerFile.mutateAsync({ productId: editor.id, fileName: file.fileName, mimeType: file.mimeType, sizeBytes: file.sizeBytes, base64: file.base64 });
            uploadedCount += 1;
          } catch (error) {
            failedFiles.push(file);
            failureDetail ||= error instanceof Error ? error.message : "The server did not accept the file.";
          }
        }
        await attachedBuyerFiles.refetch();
        if (failedFiles.length) {
          setPendingBuyerFiles(current => [...current, ...failedFiles]);
          setNotice(uploadedCount ? `${uploadedCount} file${uploadedCount === 1 ? "" : "s"} uploaded. Retry the remaining file${failedFiles.length === 1 ? "" : "s"} below. ${failureDetail}` : `We could not upload those files. ${failureDetail}`);
          return;
        }
        setNotice(`${uploadedCount} buyer file${uploadedCount === 1 ? "" : "s"} uploaded.`);
        return;
      }
      setPendingBuyerFiles(current => [...current, ...staged]);
      setNotice(`${staged.length} file${staged.length === 1 ? "" : "s"} queued. Save the new product to upload ${staged.length === 1 ? "it" : "them"}.`);
    } catch {
      setNotice("We could not read one of those files. Please try again.");
    }
  };
  const removeStoredBuyerFile = (fileId: number, fileName: string) => setPendingDelete({ kind: "buyer-file", id: fileId, label: fileName });

  const submitProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cover = pendingCover;
    let savedProduct: ProductValues | null = null;
    try {
      savedProduct = await saveProduct.mutateAsync(payloadFromForm(new FormData(event.currentTarget), editor === "new" ? undefined : editor ?? undefined)) as ProductValues;
      if (cover) {
        savedProduct = await uploadCover.mutateAsync({ productId: savedProduct.id, fileName: cover.fileName, mimeType: cover.mimeType, sizeBytes: cover.sizeBytes, base64: cover.base64 }) as ProductValues;
        setPendingCover(null);
      }
      for (const file of pendingBuyerFiles) {
        await uploadBuyerFile.mutateAsync({ productId: savedProduct.id, fileName: file.fileName, mimeType: file.mimeType, sizeBytes: file.sizeBytes, base64: file.base64 });
        setPendingBuyerFiles(current => current.filter(item => item.id !== file.id));
      }
      await finishSave(cover || pendingBuyerFiles.length ? "Product listing and buyer files saved." : "Product listing saved.");
    } catch {
      if (savedProduct) {
        setEditor(savedProduct);
        setNotice("The product was saved, but one or more files could not upload. Retry the queued file below.");
        await products.refetch();
      } else {
        setNotice("We could not save this product. Please check the fields and try again.");
      }
    }
  };

  const updateProduct = (product: ProductValues, changes: Partial<Pick<ProductValues, "isPublished" | "isFeatured" | "isArchived">>) => {
    saveProduct.mutate({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      category: product.category,
      summary: product.summary,
      description: product.description,
      deliveryNotes: product.deliveryNotes,
      price: Number(product.price),
      coverImageUrl: product.coverImageUrl,
      isPublished: changes.isPublished ?? product.isPublished,
      isFeatured: changes.isFeatured ?? product.isFeatured,
      isArchived: changes.isArchived ?? product.isArchived,
      sortOrder: product.sortOrder,
    });
  };
  const removeProduct = (product: ProductValues) => setPendingDelete({ kind: "product", id: product.id, label: product.title });
  const confirmDelete = () => {
    const pending = pendingDelete;
    if (!pending) return;
    setPendingDelete(null);
    if (pending.kind === "buyer-file") {
      removeBuyerFile.mutate({ productFileId: pending.id }, {
        onSuccess: async () => {
          setNotice(`${pending.label} removed.`);
          await attachedBuyerFiles.refetch();
        },
        onError: () => setNotice("We could not remove that buyer file. Please try again."),
      });
      return;
    }
    deleteProduct.mutate({ productId: pending.id }, {
      onSuccess: async () => {
        setNotice("Product deleted.");
        await products.refetch();
      },
      onError: error => setNotice(error.message || "This product could not be deleted. Archive it instead."),
    });
  };

  const statusTabs: Array<{ id: InventoryStatus; label: string; count: number }> = [
    { id: "all", label: "All products", count: counts.all },
    { id: "active", label: "Active", count: counts.active },
    { id: "draft", label: "Drafts", count: counts.draft },
    { id: "archived", label: "Archived", count: counts.archived },
  ];
  const isSaving = saveProduct.isPending || uploadCover.isPending || uploadBuyerFile.isPending || removeCover.isPending;

  return (
    <DashboardLayout navigation={ownerNavigation} title="DJDC Owner">
      <div className="mx-auto max-w-7xl space-y-6 py-2">
        <ConfirmDialog
          open={Boolean(pendingDelete)}
          onOpenChange={open => { if (!open) setPendingDelete(null); }}
          title={pendingDelete?.kind === "product" ? `Delete “${pendingDelete.label}”?` : `Remove “${pendingDelete?.label ?? "this file"}”?`}
          description={pendingDelete?.kind === "product" ? "This cannot be undone. Products with buyer records cannot be deleted and must be archived instead." : "This buyer delivery file will be removed from the product. The action cannot be undone."}
          confirmLabel={pendingDelete?.kind === "product" ? "Delete product" : "Remove file"}
          destructive
          onConfirm={confirmDelete}
        />
        {!isOwner ? (
          <section className="grid min-h-[60vh] place-items-center"><div className="max-w-md rounded-[1.35rem] border border-[#1A312C]/12 bg-white/70 p-8 text-center"><ShieldAlert className="mx-auto size-8 text-[#428475]" /><h1 className="display mt-5 text-3xl text-[#1A312C]">Owner access required.</h1><p className="mt-3 text-sm leading-6 text-[#1A312C]/65">Only the Digital Junction owner can manage the inventory.</p></div></section>
        ) : (
          <>
            <header className="flex flex-col gap-5 rounded-[1.5rem] border border-[#1A312C]/10 bg-white p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
              <div><p className="eyebrow">DJDC owner operations</p><h1 className="display mt-2 text-4xl text-[#1A312C]">Inventory management</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#1A312C]/62">Track and manage every digital offering from your owner-only Digital Junction catalogue.</p></div>
              <button type="button" onClick={() => openEditor("new")} className="button-primary w-fit"><Plus className="size-4" />Add new product</button>
            </header>

            {notice ? <div className="flex items-center justify-between gap-3 rounded-xl bg-[#89D7B7]/30 px-4 py-3 text-sm text-[#1A312C]"><span className="flex items-center gap-2"><Check className="size-4" />{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notification"><X className="size-4" /></button></div> : null}

            {editor ? (
              <section className="rounded-[1.4rem] border border-[#428475]/25 bg-white p-5 shadow-[0_18px_45px_rgba(26,49,44,.08)] sm:p-7">
                <div className="flex items-start justify-between gap-5">
                  <div><p className="eyebrow">{editor === "new" ? "New listing" : "Edit listing"}</p><h2 className="display mt-2 text-3xl text-[#1A312C]">{editor === "new" ? "Add a digital product" : editor.title}</h2><p className="mt-2 text-sm leading-6 text-[#1A312C]/62">Add a local cover, write text-only inclusions, and attach the actual buyer delivery files in this form.</p></div>
                  <button type="button" onClick={closeEditor} className="button-quiet !min-h-9 !px-3"><X className="size-4" />Close</button>
                </div>
                <form key={editor === "new" ? "new" : editor.id} onSubmit={submitProduct} className="mt-6">
                  <ProductFields product={editor === "new" ? undefined : editor} pendingCover={pendingCover} onCoverChange={selectCover} onCoverRemove={clearCover} />
                  <BuyerFilesPanel product={editor === "new" ? undefined : editor} pendingFiles={pendingBuyerFiles} storedFiles={attachedBuyerFiles.data as StoredBuyerFile[] | undefined} filesLoading={attachedBuyerFiles.isLoading} isUploading={isSaving} isRemoving={removeBuyerFile.isPending} onSelectFiles={selectBuyerFiles} onRemovePending={fileId => setPendingBuyerFiles(current => current.filter(file => file.id !== fileId))} onRemoveStored={removeStoredBuyerFile} />
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button className="button-primary disabled:opacity-60" disabled={isSaving}>{isSaving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}{editor === "new" ? "Save product" : "Save changes"}</button>
                    <button type="button" className="button-quiet" onClick={closeEditor}>Cancel</button>
                  </div>
                </form>
              </section>
            ) : null}

            <section className="overflow-hidden rounded-[1.45rem] border border-[#1A312C]/10 bg-white shadow-[0_14px_35px_rgba(26,49,44,.04)]">
              <div className="flex flex-col gap-4 border-b border-[#1A312C]/10 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">{statusTabs.map(tab => <button key={tab.id} type="button" onClick={() => setStatus(tab.id)} className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${status === tab.id ? "bg-[#428475] text-[#FFF4E1]" : "border border-[#1A312C]/10 bg-[#FFF4E1]/35 text-[#1A312C]/66 hover:bg-[#89D7B7]/25"}`}>{tab.label} <span className="ml-1 opacity-70">({tab.count})</span></button>)}</div>
                <div className="flex flex-wrap items-center gap-2"><label className="relative min-w-48 flex-1 sm:flex-none"><Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#428475]" /><input value={search} onChange={event => setSearch(event.target.value)} className="form-field !h-9 !py-1.5 !pl-9 text-xs" placeholder="Search inventory" /></label><button type="button" onClick={() => setShowFilters(value => !value)} className={`button-quiet !min-h-9 !px-3 text-xs ${showFilters ? "!border-[#428475] !bg-[#89D7B7]/20" : ""}`}><SlidersHorizontal className="size-3.5" />More filters</button></div>
              </div>
              {showFilters ? <div className="flex flex-wrap items-center gap-2 border-b border-[#1A312C]/10 bg-[#FFF4E1]/38 p-4"><span className="mr-1 font-mono text-[.58rem] uppercase tracking-[.11em] text-[#1A312C]/46">Category</span><button onClick={() => setCategory("all")} className={`rounded-full px-3 py-1.5 text-xs font-bold ${category === "all" ? "bg-[#1A312C] text-[#FFF4E1]" : "bg-white text-[#1A312C]/65"}`}>All categories</button>{categories.map(item => <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${category === item ? "bg-[#1A312C] text-[#FFF4E1]" : "bg-white text-[#1A312C]/65"}`}>{item}</button>)}</div> : null}
              {usingSamples ? <div className="mx-4 mt-4 rounded-xl border border-dashed border-[#428475]/28 bg-[#89D7B7]/13 px-4 py-3 text-xs leading-5 text-[#1A312C]/70"><strong className="text-[#1A312C]">Sample inventory preview:</strong> these products and prices are design-only placeholders. They are not saved, active, purchasable, editable, or archived listings.</div> : null}
              <div className="overflow-x-auto"><table className="w-full min-w-[860px] border-collapse text-left"><thead><tr className="border-b border-[#1A312C]/10 bg-[#FFF4E1]/43 font-mono text-[.57rem] uppercase tracking-[.1em] text-[#1A312C]/48"><th className="px-5 py-4 font-medium">Product name</th><th className="px-4 py-4 font-medium">Category</th><th className="px-4 py-4 font-medium">Product details</th><th className="px-4 py-4 font-medium">Price</th><th className="px-4 py-4 font-medium">Status</th><th className="px-5 py-4 text-right font-medium">Actions</th></tr></thead><tbody>{products.isLoading ? <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="mx-auto size-6 animate-spin text-[#428475]" /></td></tr> : filteredRows.length ? filteredRows.map(row => <tr key={row.id} className="border-b border-[#1A312C]/8 last:border-0 hover:bg-[#FFF4E1]/32"><td className="px-5 py-4"><div className="flex items-center gap-3">{row.source?.coverImageUrl ? <img src={row.source.coverImageUrl} alt="" className="size-10 shrink-0 rounded-xl border border-[#1A312C]/10 object-cover" /> : <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${row.isSample ? "bg-[#89D7B7]/26 text-[#428475]" : "bg-[#1A312C] text-[#89D7B7]"}`}>{row.title.slice(0, 1).toUpperCase()}</span>}<div><p className="text-sm font-bold text-[#1A312C]">{row.title}</p><p className="mt-1 max-w-64 truncate text-xs text-[#1A312C]/52">{row.summary}</p></div></div></td><td className="px-4 py-4"><span className="rounded-full bg-[#1A312C]/6 px-2.5 py-1 font-mono text-[.55rem] uppercase tracking-[.08em] text-[#1A312C]/65">{row.category}</span></td><td className="max-w-52 px-4 py-4 text-xs leading-5 text-[#1A312C]/57">{row.detail}</td><td className="px-4 py-4"><p className="text-sm font-bold text-[#1A312C]">{money(row.price)}</p>{row.isSample ? <p className="mt-1 font-mono text-[.5rem] uppercase text-[#1A312C]/42">Preview price</p> : null}</td><td className="px-4 py-4"><StatusPill status={row.status} /></td><td className="px-5 py-4"><div className="flex justify-end gap-1.5">{row.isSample ? <><button disabled title="Sample previews cannot be edited" className="grid size-8 place-items-center rounded-lg text-[#1A312C]/28"><Pencil className="size-3.5" /></button><button disabled title="Sample previews cannot be deleted" className="grid size-8 place-items-center rounded-lg text-[#1A312C]/28"><Trash2 className="size-3.5" /></button></> : <><button title={`Edit ${row.title}`} onClick={() => row.source && openEditor(row.source)} className="grid size-8 place-items-center rounded-lg text-[#428475] transition hover:bg-[#89D7B7]/25"><Pencil className="size-3.5" /></button><button title={row.source?.isPublished ? "Unpublish listing" : "Publish listing"} onClick={() => row.source && updateProduct(row.source, { isPublished: !row.source.isPublished })} disabled={row.source?.isArchived} className="grid size-8 place-items-center rounded-lg text-[#428475] transition hover:bg-[#89D7B7]/25 disabled:opacity-35"><Eye className="size-3.5" /></button><button title={row.source?.isArchived ? "Restore listing" : "Archive listing"} onClick={() => row.source && updateProduct(row.source, { isArchived: !row.source.isArchived, isPublished: row.source.isArchived ? row.source.isPublished : false })} className="grid size-8 place-items-center rounded-lg text-[#1A312C]/58 transition hover:bg-[#89D7B7]/25"><Archive className="size-3.5" /></button><button title={`Delete ${row.title}`} onClick={() => row.source && removeProduct(row.source)} disabled={deleteProduct.isPending} className="grid size-8 place-items-center rounded-lg text-rose-700 transition hover:bg-rose-50 disabled:opacity-40"><Trash2 className="size-3.5" /></button></>}</div></td></tr>) : <tr><td colSpan={6} className="px-5 py-16 text-center"><PackageOpen className="mx-auto size-6 text-[#428475]" /><p className="mt-3 text-sm font-bold text-[#1A312C]">No inventory matches these filters.</p><button className="mt-3 text-xs font-bold text-[#428475]" onClick={() => { setSearch(""); setCategory("all"); setStatus("all"); }}>Clear filters</button></td></tr>}</tbody></table></div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1A312C]/10 px-5 py-4 text-xs text-[#1A312C]/55"><span>Showing {filteredRows.length} of {sourceRows.length} {usingSamples ? "sample preview" : "inventory"} products</span><span className="rounded-lg border border-[#1A312C]/10 bg-[#FFF4E1]/45 px-3 py-1.5 font-mono text-[.58rem] uppercase tracking-[.08em] text-[#1A312C]/55">Page 1 of 1</span></div>
            </section>

            <section className="grid gap-4 md:grid-cols-3"><SummaryCard icon={<Store className="size-5" />} label="Published listings" value={String(counts.active)} detail="Real products visible on the public catalogue" /><SummaryCard icon={<Sparkles className="size-5" />} label="Draft products" value={String(counts.draft)} detail="Owner-only listings still being prepared" /><SummaryCard icon={<FolderArchive className="size-5" />} label="Archived listings" value={String(counts.archived)} detail="Kept out of public product browsing" /></section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatusPill({ status }: { status: InventoryRow["status"] }) {
  const tone = status === "Active" ? "bg-[#89D7B7]/32 text-[#1A312C]" : status === "Draft" ? "bg-[#FFF4E1] text-[#1A312C]/67" : status === "Archived" ? "bg-[#1A312C]/8 text-[#1A312C]/58" : "bg-[#89D7B7]/18 text-[#1A312C]/62";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[.55rem] uppercase tracking-[.08em] ${tone}`}><span className={`size-1.5 rounded-full ${status === "Active" ? "bg-emerald-500" : status === "Draft" ? "bg-amber-400" : "bg-[#428475]/60"}`} />{status}</span>;
}

function SummaryCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <article className="rounded-[1.25rem] border border-[#1A312C]/10 bg-white p-5"><span className="grid size-10 place-items-center rounded-xl bg-[#89D7B7]/26 text-[#428475]">{icon}</span><p className="mt-4 font-mono text-[.58rem] uppercase tracking-[.1em] text-[#1A312C]/48">{label}</p><p className="mt-1 text-2xl font-bold text-[#1A312C]">{value}</p><p className="mt-1 text-xs leading-5 text-[#1A312C]/57">{detail}</p></article>;
}
