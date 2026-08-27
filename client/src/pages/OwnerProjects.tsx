import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import ConfirmDialog from "@/components/ConfirmDialog";
import { ownerNavigation } from "@/data/ownerNavigation";
import { trpc } from "@/lib/trpc";
import { Check, Eye, EyeOff, ImagePlus, Loader2, Pencil, Plus, ShieldAlert, Trash2, X } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";

type ProjectRecord = {
  id: number;
  title: string;
  slug: string;
  summary: string;
  problem: string | null;
  solution: string | null;
  results: string | null;
  technologies: string | null;
  coverImageUrl: string | null;
  isPublished: boolean;
  sortOrder: number;
};
type PendingCover = { fileName: string; mimeType: string; sizeBytes: number; base64: string; previewUrl: string };

function readCover(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Project cover could not be read."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function slugify(title: string) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>{label}</span>{children}</label>;
}

export default function OwnerProjects() {
  const { user } = useAuth({ scope: "owner" });
  const isOwner = user?.role === "admin";
  const projects = trpc.portal.admin.caseStudies.list.useQuery(undefined, { enabled: isOwner });
  const saveProject = trpc.portal.admin.caseStudies.save.useMutation();
  const uploadCover = trpc.portal.admin.caseStudies.uploadCover.useMutation();
  const removeCover = trpc.portal.admin.caseStudies.removeCover.useMutation();
  const deleteProject = trpc.portal.admin.caseStudies.delete.useMutation();
  const [editor, setEditor] = useState<ProjectRecord | "new" | null>(null);
  const [pendingCover, setPendingCover] = useState<PendingCover | null>(null);
  const [notice, setNotice] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ProjectRecord | null>(null);
  const editedProject = editor && editor !== "new" ? editor : undefined;
  const coverInputId = `project-cover-${editedProject?.id ?? "new"}`;
  const busy = saveProject.isPending || uploadCover.isPending || removeCover.isPending || deleteProject.isPending;
  const coverUrl = pendingCover?.previewUrl || editedProject?.coverImageUrl;

  const openEditor = (project: ProjectRecord | "new") => {
    setEditor(project);
    setPendingCover(null);
    setNotice("");
  };
  const closeEditor = () => {
    setEditor(null);
    setPendingCover(null);
  };
  const selectCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("Project cover must be an image file.");
      return;
    }
    try {
      const previewUrl = await readCover(file);
      setPendingCover({ fileName: file.name, mimeType: file.type, sizeBytes: file.size, base64: previewUrl.split(",")[1] ?? "", previewUrl });
    } catch {
      setNotice("We could not read that project cover. Please try again.");
    }
  };
  const clearCover = () => {
    if (pendingCover) {
      setPendingCover(null);
      return;
    }
    if (!editedProject?.coverImageUrl) return;
    removeCover.mutate({ caseStudyId: editedProject.id }, {
      onSuccess: async updated => {
        setEditor(updated as ProjectRecord);
        await projects.refetch();
        setNotice("Project cover removed.");
      },
      onError: () => setNotice("We could not remove the project cover. Please try again."),
    });
  };
  const removeProject = (project: ProjectRecord) => setPendingDelete(project);
  const confirmDelete = () => {
    const project = pendingDelete;
    if (!project) return;
    setPendingDelete(null);
    deleteProject.mutate({ caseStudyId: project.id }, {
      onSuccess: async () => {
        if (editedProject?.id === project.id) closeEditor();
        await projects.refetch();
        setNotice("Project deleted.");
      },
      onError: () => setNotice("We could not delete this project. Please try again."),
    });
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    try {
      let saved = await saveProject.mutateAsync({
        caseStudyId: editedProject?.id,
        title,
        slug: editedProject?.slug ?? slugify(title),
        category: "Project",
        clientName: null,
        summary: String(form.get("summary") ?? "").trim(),
        problem: String(form.get("problem") ?? "").trim() || null,
        solution: String(form.get("solution") ?? "").trim() || null,
        results: String(form.get("results") ?? "").trim() || null,
        technologies: String(form.get("technologies") ?? "").trim() || null,
        coverImageUrl: editedProject?.coverImageUrl ?? null,
        isPublished: form.get("isPublished") === "on",
        sortOrder: Number(form.get("sortOrder")) || 0,
      });
      if (pendingCover) {
        saved = await uploadCover.mutateAsync({ caseStudyId: saved.id, fileName: pendingCover.fileName, mimeType: pendingCover.mimeType, sizeBytes: pendingCover.sizeBytes, base64: pendingCover.base64 });
      }
      await projects.refetch();
      setPendingCover(null);
      setEditor(saved as ProjectRecord);
      setNotice(pendingCover ? "Project and cover saved." : "Project saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "We could not save this project. Please check the fields and try again.");
    }
  };

  if (!isOwner) {
    return <DashboardLayout navigation={ownerNavigation} title="DJDC Owner"><section className="grid min-h-[60vh] place-items-center rounded-[1.6rem] border border-[#1A312C]/12 bg-[#FFF4E1]"><div className="max-w-md p-8 text-center"><ShieldAlert className="mx-auto size-8 text-[#428475]" /><h1 className="display mt-5 text-3xl text-[#1A312C]">Owner access required.</h1><p className="mt-3 text-sm leading-6 text-[#1A312C]/65">Only the owner can create and manage publicly shared projects.</p></div></section></DashboardLayout>;
  }

  return <DashboardLayout navigation={ownerNavigation} title="DJDC Owner"><div className="mx-auto max-w-7xl space-y-6 py-2">
    <ConfirmDialog
      open={Boolean(pendingDelete)}
      onOpenChange={open => { if (!open) setPendingDelete(null); }}
      title={pendingDelete ? `Delete “${pendingDelete.title}”?` : "Delete project?"}
      description="This project case study cannot be recovered after deletion. Archive it instead if you may need it later."
      confirmLabel="Delete project"
      destructive
      onConfirm={confirmDelete}
    />
    <header className="flex flex-col gap-5 rounded-[1.55rem] bg-[#1A312C] px-6 py-8 text-[#FFF4E1] sm:px-8 lg:flex-row lg:items-end lg:justify-between"><div><p className="font-mono text-[.62rem] uppercase tracking-[.14em] text-[#89D7B7]">Owner workspace / selected work</p><h1 className="display mt-3 text-4xl">Projects</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#FFF4E1]/72">Add real work when it is ready to share. Published projects appear on the public Projects page; nothing is prefilled or fabricated.</p></div><button type="button" onClick={() => openEditor("new")} className="button-primary w-fit !bg-[#89D7B7] !text-[#1A312C]"><Plus className="size-4" />Add project</button></header>
    {notice ? <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-[#428475]/22 bg-[#89D7B7]/15 px-4 py-3 text-sm text-[#1A312C]"><span className="flex items-center gap-2"><Check className="size-4" />{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss notification"><X className="size-4" /></button></div> : null}
    {editor ? <section className="rounded-[1.55rem] border border-[#1A312C]/12 bg-[#FFF4E1] p-5 shadow-[0_18px_45px_rgba(26,49,44,.06)] sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">{editedProject ? "Edit project" : "New project"}</p><h2 className="display mt-2 text-3xl text-[#1A312C]">{editedProject?.title || "Add project"}</h2><p className="mt-2 text-sm leading-6 text-[#1A312C]/62">Describe only genuine work that you are allowed to share publicly.</p></div><button type="button" onClick={closeEditor} className="button-quiet !min-h-9 !px-3"><X className="size-4" />Close</button></div><form key={editedProject?.id ?? "new"} onSubmit={submit} className="mt-6"><section className="rounded-xl border border-dashed border-[#428475]/35 bg-[#89D7B7]/10 p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-[#1A312C]">Project Cover</p><p className="mt-1 text-xs leading-5 text-[#1A312C]/60">Upload a local image for this project. You can remove or replace it if the wrong image was selected.</p></div><input id={coverInputId} type="file" accept="image/*" className="sr-only" onChange={selectCover} disabled={busy} /><label htmlFor={coverInputId} className={`button-quiet w-fit cursor-pointer !min-h-9 !px-3 text-xs ${busy ? "pointer-events-none opacity-60" : ""}`}><ImagePlus className="size-3.5" />{coverUrl ? "Replace cover" : "Upload cover"}</label></div>{coverUrl ? <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#1A312C]/10 bg-white/75 p-2"><img src={coverUrl} alt="Project cover preview" className="size-18 rounded-md border border-[#1A312C]/10 object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#1A312C]">{pendingCover?.fileName || "Current project cover"}</p><p className="mt-1 text-[.68rem] text-[#1A312C]/55">Local image preview</p></div><button type="button" onClick={clearCover} disabled={busy} className="button-quiet !min-h-9 !px-3 text-xs text-rose-700"><X className="size-3.5" />Remove</button></div> : null}</section><div className="mt-5 grid gap-5"><Field label="Project Title"><input required name="title" minLength={2} maxLength={180} defaultValue={editedProject?.title ?? ""} className="form-field !bg-[#FFF4E1]" placeholder="Project title" /></Field><Field label="Project Description"><textarea required name="summary" minLength={10} maxLength={5000} defaultValue={editedProject?.summary ?? ""} className="form-field min-h-28 resize-y !bg-[#FFF4E1]" placeholder="Describe the project clearly." /></Field><div className="grid gap-5 lg:grid-cols-2"><Field label="Problem Addressed"><textarea name="problem" maxLength={5000} defaultValue={editedProject?.problem ?? ""} className="form-field min-h-28 resize-y !bg-[#FFF4E1]" placeholder="What problem did the project address?" /></Field><Field label="Key Features"><textarea name="solution" maxLength={5000} defaultValue={editedProject?.solution ?? ""} className="form-field min-h-28 resize-y !bg-[#FFF4E1]" placeholder="List the real key features." /></Field><Field label="My Contribution"><textarea name="results" maxLength={5000} defaultValue={editedProject?.results ?? ""} className="form-field min-h-28 resize-y !bg-[#FFF4E1]" placeholder="Describe your real contribution." /></Field><Field label="Tech Stack"><textarea name="technologies" maxLength={2000} defaultValue={editedProject?.technologies ?? ""} className="form-field min-h-28 resize-y !bg-[#FFF4E1]" placeholder="Tools, frameworks, and technologies used" /></Field></div><div className="flex flex-wrap items-center gap-5"><label className="flex items-center gap-2 text-sm font-bold text-[#1A312C]"><input name="isPublished" type="checkbox" defaultChecked={editedProject?.isPublished ?? false} className="size-4 accent-[#428475]" />Publish on public Projects</label><label className="flex items-center gap-2 text-sm font-bold text-[#1A312C]">Display order <input name="sortOrder" type="number" min={0} defaultValue={editedProject?.sortOrder ?? 0} className="form-field !h-9 !w-20 !bg-[#FFF4E1] !py-1" /></label></div></div><div className="mt-6 flex flex-wrap gap-3"><button disabled={busy} className="button-primary disabled:opacity-60">{busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}{editedProject ? "Save changes" : "Save project"}</button><button type="button" className="button-quiet" onClick={closeEditor}>Cancel</button>{editedProject ? <button type="button" disabled={busy} onClick={() => removeProject(editedProject)} className="button-quiet text-rose-700 disabled:opacity-60"><Trash2 className="size-4" />Delete project</button> : null}</div></form></section> : null}
    <section className="rounded-[1.55rem] border border-[#1A312C]/12 bg-[#FFF4E1] p-5 sm:p-7"><p className="eyebrow">Project library</p><h2 className="display mt-2 text-3xl text-[#1A312C]">Your selected work</h2>{projects.isLoading ? <div className="grid min-h-44 place-items-center"><Loader2 className="size-6 animate-spin text-[#428475]" /></div> : projects.data?.length ? <div className="mt-6 grid gap-4 md:grid-cols-2">{(projects.data as ProjectRecord[]).map(project => <article key={project.id} className="overflow-hidden rounded-xl border border-[#1A312C]/12 bg-white/72"><div className="flex aspect-[16/7] items-center justify-center bg-[#1A312C]/7">{project.coverImageUrl ? <img src={project.coverImageUrl} alt="" className="size-full object-cover" /> : <p className="font-mono text-[.58rem] uppercase tracking-[.1em] text-[#1A312C]/45">No cover image</p>}</div><div className="p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold text-[#1A312C]">{project.title}</h3><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[.54rem] uppercase tracking-[.08em] ${project.isPublished ? "bg-[#89D7B7]/32 text-[#1A312C]" : "bg-[#1A312C]/8 text-[#1A312C]/60"}`}>{project.isPublished ? <Eye className="size-3" /> : <EyeOff className="size-3" />}{project.isPublished ? "Published" : "Draft"}</span></div><p className="mt-2 line-clamp-2 text-sm leading-6 text-[#1A312C]/62">{project.summary}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => openEditor(project)} className="button-quiet !min-h-9 !px-3 text-xs"><Pencil className="size-3.5" />Edit project</button><button type="button" onClick={() => removeProject(project)} disabled={busy} className="button-quiet !min-h-9 !px-3 text-xs text-rose-700 disabled:opacity-60"><Trash2 className="size-3.5" />Delete</button></div></div></article>)}</div> : <div className="mt-6 rounded-xl border border-dashed border-[#1A312C]/16 bg-[#89D7B7]/10 p-7"><p className="font-mono text-[.58rem] uppercase tracking-[.1em] text-[#428475]">No projects added</p><p className="mt-2 text-sm leading-6 text-[#1A312C]/62">Add a genuine project when you are ready to share it publicly. No sample projects are shown here.</p></div>}</section>
  </div></DashboardLayout>;
}
