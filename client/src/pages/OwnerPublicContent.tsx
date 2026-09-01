import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { getPublicSectionDefault } from "@/data/publicContentDefaults";
import { ownerNavigation } from "@/data/ownerNavigation";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ChevronRight, CircleAlert, Eye, EyeOff, FileText, Image, Link2, Loader2, RotateCcw, Save, ShieldAlert } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

const pages = ["home", "shop", "services", "work", "about", "contact", "footer", "legal"] as const;
type Page = (typeof pages)[number];

const pageMeta: Record<Page, { label: string; detail: string }> = {
  home: { label: "Home page", detail: "Hero, featured work, services, and final call-to-action." },
  shop: { label: "Digital products", detail: "Catalogue introduction, filters, and direct-purchase prompt." },
  services: { label: "Services", detail: "Service introduction, service list, and inquiry prompt." },
  work: { label: "Projects", detail: "Work introduction, project collection, and next-project prompt." },
  about: { label: "About", detail: "Company introduction, story, and conversation prompt." },
  contact: { label: "Contact", detail: "Contact page introduction, guidance, and inquiry prompt." },
  footer: { label: "Footer", detail: "Brand statement, navigation, contact invitation, social information, and legal links." },
  legal: { label: "Legal pages", detail: "Privacy, terms, and refund copy shown on the public legal pages." },
};

const sectionMeta: Record<Page, Array<{ id: string; label: string; detail: string; eyebrow: string }>> = {
  home: [
    { id: "hero", label: "Hero and public summary", detail: "Main heading, introduction, feature image, and primary button.", eyebrow: "Home introduction" },
    { id: "services", label: "Solutions overview", detail: "The introduction above the Home solutions cards.", eyebrow: "Home services" },
    { id: "products", label: "Featured digital products", detail: "The introduction and button above published product cards.", eyebrow: "Home products" },
    { id: "projects", label: "Featured projects", detail: "The introduction and button above published project cards.", eyebrow: "Home projects" },
    { id: "story", label: "Story highlight", detail: "The green About preview card near the end of the Home page.", eyebrow: "Home story" },
    { id: "call-to-action", label: "Final call-to-action", detail: "The final full-width action panel on the Home page.", eyebrow: "Home action" },
    { id: "services-grid", label: "Services grid introduction", detail: "The heading, description, and link above the Home service cards.", eyebrow: "Home service grid" },
    { id: "services-grid-cards", label: "Home service cards", detail: "One editable Home service per line in Title | Description format.", eyebrow: "Home service cards" },
    { id: "advantages", label: "Advantages cards", detail: "Heading and one editable card per line for the Home advantages section.", eyebrow: "Home advantages" },
    { id: "process", label: "Process steps", detail: "Heading and one editable step per line for the Home process section.", eyebrow: "Home process" },
    { id: "partnership", label: "Partnership statement", detail: "The supporting statement beside the Home story card.", eyebrow: "Home partnership" },
  ],
  shop: [
    { id: "hero", label: "Catalogue hero", detail: "The top introduction for Digital Products.", eyebrow: "Shop introduction" },
    { id: "filter-controls", label: "Catalogue controls", detail: "Search, filter, sort, and empty-state labels in Digital Products.", eyebrow: "Catalogue controls" },
    { id: "catalogue", label: "Catalogue details", detail: "The introduction above search, filters, and product listings.", eyebrow: "Shop catalogue" },
    { id: "call-to-action", label: "Guest checkout prompt", detail: "The assistance panel below the product catalogue.", eyebrow: "Shop action" },
  ],
  services: [
    { id: "hero", label: "Services hero", detail: "The top heading and overview on the Services page.", eyebrow: "Services introduction" },
    { id: "service-list", label: "Service list introduction", detail: "The heading and supporting copy above the service cards.", eyebrow: "Services list" },
    { id: "service-cards", label: "Service cards", detail: "One editable service per line with optional comma-separated detail pills.", eyebrow: "Service cards" },
    { id: "call-to-action", label: "Services call-to-action", detail: "The closing conversation prompt on the Services page.", eyebrow: "Services action" },
  ],
  work: [
    { id: "hero", label: "Projects hero", detail: "The top heading and overview for the public work page.", eyebrow: "Projects introduction" },
    { id: "projects", label: "Projects collection", detail: "The public introduction placed above the project cards.", eyebrow: "Projects list" },
    { id: "call-to-action", label: "Projects call-to-action", detail: "The final project inquiry panel.", eyebrow: "Projects action" },
  ],
  about: [
    { id: "hero", label: "About hero", detail: "The main public introduction for Digital Junction.", eyebrow: "About introduction" },
    { id: "story", label: "Vision and story", detail: "The highlighted story card on the About page.", eyebrow: "About story" },
    { id: "mission", label: "Mission", detail: "The mission card beside the About vision card.", eyebrow: "About mission" },
    { id: "values", label: "Values cards", detail: "Heading and one editable value per line for the About values section.", eyebrow: "About values" },
    { id: "call-to-action", label: "About call-to-action", detail: "The conversation prompt at the bottom of the About page.", eyebrow: "About action" },
  ],
  contact: [
    { id: "hero", label: "Contact hero", detail: "The top heading and supporting text above the inquiry area.", eyebrow: "Contact introduction" },
    { id: "form", label: "Contact form copy", detail: "Field labels, placeholders, options, success, and error messages in the inquiry form.", eyebrow: "Contact form" },
    { id: "contact-details", label: "Contact guidance", detail: "The explanatory panel beside the working inquiry form.", eyebrow: "Contact details" },
    { id: "call-to-action", label: "Contact call-to-action", detail: "The secondary prompt under the inquiry form.", eyebrow: "Contact action" },
  ],
  footer: [
    { id: "brand", label: "Footer brand statement", detail: "The company description at the left side of the site footer.", eyebrow: "Footer brand" },
    { id: "contact", label: "Footer contact invitation", detail: "The contact prompt and button in the footer.", eyebrow: "Footer contact" },
    { id: "social", label: "Footer social information", detail: "The social heading, supporting text, optional image, and link.", eyebrow: "Footer social" },
    { id: "navigation", label: "Footer company navigation", detail: "One footer link per line in Label | /route format.", eyebrow: "Footer navigation" },
    { id: "products-navigation", label: "Footer product navigation", detail: "One product link per line in Label | /route format.", eyebrow: "Footer products" },
    { id: "help-navigation", label: "Footer help navigation", detail: "One help link per line in Label | /route format.", eyebrow: "Footer help" },
    { id: "contact-details", label: "Footer contact details", detail: "Editable footer contact heading and contact lines.", eyebrow: "Footer contact details" },
    { id: "legal", label: "Footer legal navigation", detail: "One legal link per line in Label | /route format.", eyebrow: "Footer legal" },
  ],
  legal: [
    { id: "privacy", label: "Privacy policy", detail: "Visitor-facing privacy policy title and body.", eyebrow: "Legal privacy" },
    { id: "terms", label: "Terms and conditions", detail: "Visitor-facing terms title and body.", eyebrow: "Legal terms" },
    { id: "refunds", label: "Refund policy", detail: "Visitor-facing refund policy title and body.", eyebrow: "Legal refunds" },
  ],
};

type SectionDraft = { id?: number; eyebrow: string; title: string; body: string; imageUrl: string; ctaLabel: string; ctaHref: string; isPublished: boolean };
type SavedSection = SectionDraft & { id: number; page: string; section: string };
const emptyDraft = (): SectionDraft => ({ eyebrow: "", title: "", body: "", imageUrl: "", ctaLabel: "", ctaHref: "", isPublished: true });
const keyFor = (page: Page, section: string) => `${page}:${section}`;

export default function OwnerPublicContent() {
  const { user } = useAuth({ scope: "owner" });
  const isOwner = user?.role === "admin";
  const content = trpc.portal.admin.publicSiteContent.list.useQuery(undefined, { enabled: isOwner });
  const save = trpc.portal.admin.publicSiteContent.save.useMutation();
  const [activePage, setActivePage] = useState<Page>("home");
  const [drafts, setDrafts] = useState<Record<string, SectionDraft>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);

  const savedContent = content.data as SavedSection[] | undefined;
  useEffect(() => {
    if (!savedContent || hydrated) return;
    const next: Record<string, SectionDraft> = {};
    pages.forEach(page => sectionMeta[page].forEach(meta => {
      const saved = savedContent.find(item => item.page === page && item.section === meta.id);
      const defaults = getPublicSectionDefault(page, meta.id);
      next[keyFor(page, meta.id)] = saved ? { id: saved.id, eyebrow: saved.eyebrow ?? defaults.eyebrow, title: saved.title ?? defaults.title, body: saved.body ?? defaults.body, imageUrl: saved.imageUrl ?? defaults.imageUrl, ctaLabel: saved.ctaLabel ?? defaults.ctaLabel, ctaHref: saved.ctaHref ?? defaults.ctaHref, isPublished: saved.isPublished } : defaults;
    }));
    setDrafts(next);
    setHydrated(true);
  }, [hydrated, savedContent]);

  const activeSections = useMemo(() => sectionMeta[activePage], [activePage]);
  const editedCount = Array.from(dirty).filter(key => key.startsWith(`${activePage}:`)).length;
  const draftFor = (section: string) => drafts[keyFor(activePage, section)] ?? emptyDraft();
  const updateDraft = (section: string, patch: Partial<SectionDraft>) => {
    const key = keyFor(activePage, section);
    setDrafts(current => ({ ...current, [key]: { ...(current[key] ?? emptyDraft()), ...patch } }));
    setDirty(current => new Set(current).add(key));
    setNotice(null);
  };
  const resetDraft = (section: string) => updateDraft(section, { ...getPublicSectionDefault(activePage, section), id: draftFor(section).id });
  const savePage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const changed = activeSections.filter(section => dirty.has(keyFor(activePage, section.id)));
    if (!changed.length) { setNotice({ kind: "info", text: "No changes to save on this page." }); return; }
    try {
      await Promise.all(changed.map(section => {
        const draft = draftFor(section.id);
        return save.mutateAsync({ contentId: draft.id, page: activePage, section: section.id, eyebrow: draft.eyebrow.trim() || null, title: draft.title.trim() || null, body: draft.body.trim() || null, imageUrl: draft.imageUrl.trim() || null, ctaLabel: draft.ctaLabel.trim() || null, ctaHref: draft.ctaHref.trim() || null, isPublished: draft.isPublished });
      }));
      setDirty(current => { const next = new Set(current); changed.forEach(section => next.delete(keyFor(activePage, section.id))); return next; });
      setNotice({ kind: "success", text: `${changed.length} public section${changed.length === 1 ? "" : "s"} saved.` });
      await content.refetch();
    } catch {
      setNotice({ kind: "error", text: "Unable to save all changes. Please review the section fields and try again." });
    }
  };

  return <DashboardLayout navigation={ownerNavigation} title="DJDC Owner"><div className="mx-auto max-w-7xl space-y-6 py-2">{!isOwner ? <section className="grid min-h-[60vh] place-items-center rounded-[1.5rem] border border-[#1A312C]/12 bg-white"><div className="max-w-md p-8 text-center"><ShieldAlert className="mx-auto size-8 text-[#428475]" /><h1 className="display mt-5 text-3xl text-[#1A312C]">Owner access required.</h1><p className="mt-3 text-sm leading-6 text-[#1A312C]/65">Only the owner can change the public website content.</p></div></section> : <><header className="rounded-[1.55rem] bg-[#1A312C] px-5 py-6 text-[#FFF4E1] shadow-[0_20px_48px_rgba(26,49,44,.18)] sm:px-8 sm:py-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="font-mono text-[.6rem] uppercase tracking-[.14em] text-[#89D7B7]">Owner workspace / public portfolio</p><h1 className="display mt-3 text-4xl">Public content</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#FFF4E1]/72">Edit the public website page by page. Every section keeps the DJDC default until you save an owner override; product and project records stay in their own management workspaces.</p></div><div className="flex items-center gap-3"><span className="inline-flex items-center gap-2 text-xs font-semibold text-[#89D7B7]"><CheckCircle2 className="size-4" />Owner-only editor</span><button type="submit" form="public-content-form" disabled={save.isPending || !hydrated} className="button-primary !min-h-10 !bg-[#89D7B7] !px-4 !text-[#1A312C] disabled:opacity-60">{save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save changes{editedCount ? ` (${editedCount})` : ""}</button></div></div></header>
      <section className="rounded-[1.5rem] border border-[#1A312C]/10 bg-white p-4 shadow-[0_14px_35px_rgba(26,49,44,.05)] sm:p-6"><div className="flex flex-col gap-3 border-b border-[#1A312C]/10 pb-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Public page</p><h2 className="display mt-2 text-3xl text-[#1A312C]">Choose what you want to edit.</h2></div><p className="max-w-md text-sm leading-6 text-[#1A312C]/60">Each card controls a real visitor-facing section. Blank text fields use the page’s established default copy.</p></div><div className="mt-5 flex gap-2 overflow-x-auto pb-1">{pages.map(page => <button type="button" key={page} onClick={() => { setActivePage(page); setNotice(null); }} className={`shrink-0 rounded-xl border px-4 py-3 text-left transition ${activePage === page ? "border-[#1A312C] bg-[#1A312C] text-[#FFF4E1]" : "border-[#1A312C]/12 bg-[#FFF4E1]/45 text-[#1A312C] hover:border-[#428475]/45 hover:bg-[#89D7B7]/16"}`}><span className="block text-sm font-bold">{pageMeta[page].label}</span><span className={`mt-1 block text-[.68rem] ${activePage === page ? "text-[#89D7B7]" : "text-[#1A312C]/52"}`}>{sectionMeta[page].length} editable sections</span></button>)}</div></section>
      {notice && <div role={notice.kind === "error" ? "alert" : "status"} className={`notice ${notice.kind === "success" ? "notice-success" : notice.kind === "error" ? "notice-error" : "notice-info"}`}>{notice.kind === "error" ? <CircleAlert className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0" />}{notice.text}</div>}
      <form id="public-content-form" onSubmit={savePage} className="space-y-5">{content.isLoading || !hydrated ? <section className="grid min-h-72 place-items-center rounded-[1.5rem] border border-[#1A312C]/10 bg-white"><div className="flex items-center gap-3 text-sm text-[#1A312C]/65"><Loader2 className="size-5 animate-spin text-[#428475]" />Loading saved public content…</div></section> : activeSections.map((section, index) => { const draft = draftFor(section.id); const key = keyFor(activePage, section.id); const changed = dirty.has(key); return <section key={section.id} className={`overflow-hidden rounded-[1.45rem] border bg-white shadow-[0_14px_35px_rgba(26,49,44,.05)] transition ${changed ? "border-[#428475]/50 ring-2 ring-[#89D7B7]/22" : "border-[#1A312C]/10"}`}><div className="flex flex-col gap-4 border-b border-[#1A312C]/10 bg-[#FFF4E1]/42 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-7"><div className="flex min-w-0 gap-4"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#1A312C] font-mono text-xs text-[#89D7B7]">{String(index + 1).padStart(2, "0")}</span><div><p className="font-mono text-[.59rem] uppercase tracking-[.11em] text-[#428475]">{draft.eyebrow}</p><h2 className="display mt-2 text-2xl text-[#1A312C]">{section.label}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#1A312C]/62">{section.detail}</p></div></div><label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-[#1A312C]/12 bg-white px-3 py-2 text-xs font-bold text-[#1A312C]"><input checked={draft.isPublished} onChange={event => updateDraft(section.id, { isPublished: event.target.checked })} type="checkbox" className="size-3.5 accent-[#428475]" />{draft.isPublished ? <Eye className="size-3.5 text-[#428475]" /> : <EyeOff className="size-3.5 text-[#1A312C]/50" />}{draft.isPublished ? "Visible" : "Hidden"}</label></div><div className="grid gap-5 p-5 sm:p-7"><div className="grid gap-5 lg:grid-cols-2"><Field label="Public heading" hint="Loaded from the current visitor-facing section. Edit to replace it."><input value={draft.title} onChange={event => updateDraft(section.id, { title: event.target.value })} className="form-field" placeholder="Section heading" /></Field><Field label="Eyebrow label" hint="Loaded from the current public section. Edit to replace it."><span className="relative"><FileText className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#428475]" /><input value={draft.eyebrow} onChange={event => updateDraft(section.id, { eyebrow: event.target.value })} className="form-field !pl-10" placeholder="Section label" /></span></Field></div><Field label="Public description" hint="Loaded from the current visitor-facing section. Supports line breaks."><textarea value={draft.body} onChange={event => updateDraft(section.id, { body: event.target.value })} className="form-field min-h-30 resize-y" placeholder="Public section description" /></Field><div className="grid gap-5 lg:grid-cols-2"><Field label="Section image URL" hint="Optional public image. Use a complete https:// URL."><span className="relative"><Image className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#428475]" /><input value={draft.imageUrl} onChange={event => updateDraft(section.id, { imageUrl: event.target.value })} type="url" className="form-field !pl-10" placeholder="https://…" /></span></Field><Field label="Button label" hint="Loaded from the current public button when this section has one."><input value={draft.ctaLabel} onChange={event => updateDraft(section.id, { ctaLabel: event.target.value })} className="form-field" placeholder="Explore products" /></Field></div><div className="grid gap-5 lg:grid-cols-[1fr_auto]"><Field label="Button link" hint="Use a public internal path such as /shop or a full https:// URL."><span className="relative"><Link2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#428475]" /><input value={draft.ctaHref} onChange={event => updateDraft(section.id, { ctaHref: event.target.value })} className="form-field !pl-10" placeholder="/contact" /></span></Field><div className="flex items-end"><button type="button" onClick={() => resetDraft(section.id)} className="button-quiet w-full !min-h-11 !px-3 text-xs sm:w-auto"><RotateCcw className="size-3.5" />Restore current default</button></div></div><p className="rounded-xl border border-[#89D7B7]/35 bg-[#89D7B7]/12 px-4 py-3 text-xs leading-5 text-[#1A312C]/70"><strong className="text-[#1A312C]">Ready to edit:</strong> these values are the current visitor-facing section content. Change only what you want, then save the page. Turn visibility off to hide the section.</p></div></section>; })}</form>
      <section className="rounded-[1.4rem] border border-[#1A312C]/10 bg-[#FFF4E1]/55 p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow">Current editing page</p><h2 className="display mt-2 text-2xl text-[#1A312C]">{pageMeta[activePage].label}</h2><p className="mt-2 text-sm leading-6 text-[#1A312C]/63">{pageMeta[activePage].detail}</p></div><button type="submit" form="public-content-form" disabled={save.isPending || !hydrated} className="button-primary w-fit disabled:opacity-60">{save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save changes{editedCount ? ` (${editedCount})` : ""}<ChevronRight className="size-4" /></button></div></section>
    </>}</div></DashboardLayout>;
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>{label}</span>{children}<span className="text-xs font-normal leading-5 text-[#1A312C]/54">{hint}</span></label>;
}
