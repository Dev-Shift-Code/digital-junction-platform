import ClientAreaLayout from "@/components/ClientAreaLayout";
import { sampleResources } from "@/data/samplePreview";
import { trpc } from "@/lib/trpc";
import { BookOpen, Loader2 } from "lucide-react";

export default function ClientResources() {
  const resources = trpc.portal.content.listPublished.useQuery();
  const usingSamples = !resources.isLoading && !resources.data?.length;
  const items = usingSamples ? sampleResources : resources.data ?? [];
  return <ClientAreaLayout><div className="mx-auto max-w-6xl space-y-6 py-2"><header><p className="eyebrow">Customer resources</p><h1 className="display mt-2 text-4xl text-[#1A312C]">Resources & updates</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#1A312C]/64">Service guidance, product-access notes, and customer resources published for your Digital Junction account.</p></header>{usingSamples && <div className="rounded-xl border border-[#428475]/20 bg-[#89D7B7]/18 px-4 py-3 text-xs leading-5 text-[#1A312C]/72"><strong className="text-[#1A312C]">Sample preview:</strong> these are placeholder resource cards for layout review. They are not published account notices.</div>}<section className="rounded-[1.35rem] border border-[#1A312C]/10 bg-white/70 p-6 sm:p-8">{resources.isLoading ? <div className="grid min-h-48 place-items-center"><Loader2 className="size-6 animate-spin text-[#428475]" /></div> : <div className="grid gap-4 md:grid-cols-2">{items.map(resource => <article key={resource.id} className="rounded-xl bg-[#FFF4E1]/70 p-5"><BookOpen className="size-5 text-[#428475]" /><p className="mt-5 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[#428475]">{usingSamples ? `Sample · ${resource.placement}` : resource.placement}</p><h2 className="mt-2 text-base font-bold text-[#1A312C]">{resource.title}</h2><p className="mt-3 text-sm leading-6 text-[#1A312C]/63">{resource.body}</p></article>)}</div>}</section></div></ClientAreaLayout>;
}
