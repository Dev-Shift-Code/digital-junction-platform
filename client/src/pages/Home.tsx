import { ArrowRight, Blocks, Code2, Layers3, MoveUpRight, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";

const values = [
  { title: "Modern, with intent", description: "Clean interfaces that make a business feel current without chasing noise.", Icon: Sparkles },
  { title: "Built around people", description: "Digital journeys shaped around the people who need to use them every day.", Icon: Layers3 },
  { title: "Ready to grow", description: "Thoughtful systems and components that support the next stage of the work.", Icon: Code2 },
  { title: "Support that stays close", description: "Clear handoffs, project visibility, and an accessible working relationship.", Icon: ShieldCheck },
];

export default function Home() {
  return (
    <PublicLayout>
      <main>
        <section className="hero-grid relative isolate overflow-hidden bg-[#1A312C] text-[#FFF4E1]">
          <div className="hero-orb absolute -right-32 top-0 size-[42rem] opacity-80" />
          <div className="site-container relative grid min-h-[650px] items-center gap-14 py-20 lg:grid-cols-[1.03fr_.97fr] lg:py-24">
            <div className="max-w-xl">
              <p className="font-mono text-[0.69rem] uppercase tracking-[0.15em] text-[#89D7B7]">Digital Junction Development Co.</p>
              <h1 className="display mt-6 text-[3.2rem] leading-[0.96] sm:text-6xl lg:text-[4.5rem]">Turning ideas into <em className="font-normal text-[#89D7B7]">digital</em> solutions that work.</h1>
              <p className="mt-7 max-w-lg text-base leading-7 text-[#FFF4E1]/72 sm:text-lg">We help businesses, startups, entrepreneurs, and creators turn clear ideas into meaningful web experiences, practical systems, and digital products.</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/contact" className="button-primary buttonlike !bg-[#89D7B7] !text-[#1A312C] hover:!bg-[#FFF4E1]">Start a project <ArrowRight className="size-4" /></Link>
                <Link href="/services" className="button-secondary buttonlike">Explore services</Link>
              </div>
              <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-[#FFF4E1]/15 pt-6 font-mono text-[0.65rem] uppercase tracking-[0.09em] text-[#FFF4E1]/55"><span>Design led</span><span className="size-1 rounded-full bg-[#89D7B7]" /><span>Technology minded</span><span className="size-1 rounded-full bg-[#89D7B7]" /><span>Human focused</span></div>
            </div>

            <div className="relative mx-auto w-full max-w-lg lg:mx-0">
              <div className="art-card relative overflow-hidden rounded-[1.65rem] p-4 sm:p-5">
                <div className="flex items-center justify-between border-b border-[#FFF4E1]/15 pb-4"><span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[#89D7B7]">Project compass</span><span className="flex gap-1.5"><i className="size-2 rounded-full bg-[#89D7B7]" /><i className="size-2 rounded-full bg-[#FFF4E1]/35" /><i className="size-2 rounded-full bg-[#FFF4E1]/35" /></span></div>
                <div className="mt-5 grid gap-4 sm:grid-cols-[1.06fr_.94fr]">
                  <div className="rounded-2xl bg-[#FFF4E1] p-5 text-[#1A312C]"><p className="font-mono text-[0.63rem] uppercase tracking-[0.12em] text-[#428475]">Current focus</p><h2 className="display mt-4 text-3xl leading-tight">A more useful digital front door.</h2><div className="mt-7 grid grid-cols-2 gap-2"><div className="rounded-xl bg-[#89D7B7]/35 p-3"><p className="font-mono text-[0.6rem] uppercase text-[#1A312C]/55">Strategy</p><p className="mt-1 text-sm font-bold">Aligned</p></div><div className="rounded-xl bg-[#1A312C] p-3 text-[#FFF4E1]"><p className="font-mono text-[0.6rem] uppercase text-[#89D7B7]">System</p><p className="mt-1 text-sm font-bold">In motion</p></div></div></div>
                  <div className="grid gap-4"><div className="rounded-2xl border border-[#89D7B7]/35 bg-[#1A312C]/70 p-4"><p className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[#89D7B7]">Signals</p><div className="mt-4 flex h-16 items-end gap-2">{[28, 52, 37, 69, 57, 82].map((value, index) => <span key={index} className="flex-1 rounded-t-sm bg-[#89D7B7]" style={{ height: `${value}%`, opacity: 0.45 + index * 0.08 }} />)}</div></div><div className="rounded-2xl bg-[#428475] p-4"><p className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[#FFF4E1]/65">Next milestone</p><p className="mt-3 text-sm font-semibold leading-5 text-[#FFF4E1]">A clear launch plan, seen by everyone.</p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#FFF4E1]/25"><div className="h-full w-[68%] rounded-full bg-[#89D7B7]" /></div></div></div>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-5 hidden rounded-2xl border border-[#89D7B7]/30 bg-[#1A312C] px-4 py-3 shadow-xl sm:flex sm:items-center sm:gap-3"><span className="grid size-8 place-items-center rounded-xl bg-[#89D7B7] text-[#1A312C]"><Blocks className="size-4" /></span><span><span className="block font-mono text-[0.58rem] uppercase tracking-[0.11em] text-[#89D7B7]">Connecting ideas</span><span className="mt-0.5 block text-xs font-semibold">One considered system</span></span></div>
            </div>
          </div>
        </section>

        <section className="section-grid py-20 sm:py-28"><div className="site-container"><div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]"><div><p className="eyebrow">The approach</p><h2 className="display mt-4 max-w-sm text-4xl leading-tight text-[#1A312C]">Technology built around your goals.</h2></div><div className="grid gap-4 sm:grid-cols-2">{values.map(({ title, description, Icon }) => <article key={title} className="service-card p-5"><span className="grid size-10 place-items-center rounded-xl bg-[#89D7B7]/35 text-[#1A312C]"><Icon className="size-5" /></span><h3 className="mt-7 text-base font-bold text-[#1A312C]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#1A312C]/63">{description}</p></article>)}</div></div></div></section>

        <section className="bg-[#FFF4E1] py-20 sm:py-28"><div className="site-container"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="eyebrow">What we shape</p><h2 className="display mt-4 max-w-2xl text-4xl leading-tight text-[#1A312C] sm:text-5xl">From the first screen to the system behind it.</h2></div><Link href="/services" className="button-quiet buttonlike w-fit">View all services <MoveUpRight className="size-4" /></Link></div><div className="mt-12 grid gap-4 md:grid-cols-3"><article className="rounded-[1.35rem] bg-[#1A312C] p-7 text-[#FFF4E1]"><p className="font-mono text-[0.67rem] uppercase tracking-[0.12em] text-[#89D7B7]">01 / Digital presence</p><h3 className="display mt-10 text-3xl">Websites that feel like the business behind them.</h3><p className="mt-5 text-sm leading-6 text-[#FFF4E1]/65">Company sites, landing pages, online shops, and interfaces that make the next step obvious.</p></article><article className="rounded-[1.35rem] bg-[#89D7B7] p-7 text-[#1A312C]"><p className="font-mono text-[0.67rem] uppercase tracking-[0.12em] text-[#1A312C]/60">02 / Useful systems</p><h3 className="display mt-10 text-3xl">Tools designed for how work actually moves.</h3><p className="mt-5 text-sm leading-6 text-[#1A312C]/68">Client portals, operational dashboards, business platforms, and connected workflows.</p></article><article className="rounded-[1.35rem] border border-[#1A312C]/12 bg-white/60 p-7 text-[#1A312C]"><p className="font-mono text-[0.67rem] uppercase tracking-[0.12em] text-[#428475]">03 / Design systems</p><h3 className="display mt-10 text-3xl">A visual language your team can keep using.</h3><p className="mt-5 text-sm leading-6 text-[#1A312C]/65">Brand direction, interface design, reusable components, and ready-to-use digital assets.</p></article></div></div></section>

        <section className="bg-[#1A312C] py-16 text-[#FFF4E1] sm:py-20"><div className="site-container grid gap-8 md:grid-cols-[1fr_auto] md:items-center"><div><p className="font-mono text-[0.67rem] uppercase tracking-[0.13em] text-[#89D7B7]">A digital product shop, too</p><h2 className="display mt-3 max-w-xl text-4xl leading-tight sm:text-5xl">Useful frameworks for the work between big launches.</h2></div><Link href="/shop" className="button-primary buttonlike !bg-[#89D7B7] !text-[#1A312C] hover:!bg-[#FFF4E1]">Browse the shop <ArrowRight className="size-4" /></Link></div></section>
        <section className="bg-[#FFF4E1] py-20 sm:py-28"><div className="site-container rounded-[1.65rem] bg-[#428475] px-6 py-11 text-[#FFF4E1] sm:px-11 sm:py-14"><div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-end"><div><p className="font-mono text-[0.67rem] uppercase tracking-[0.13em] text-[#89D7B7]">Start with a conversation</p><h2 className="display mt-4 text-4xl leading-tight sm:text-5xl">Your next digital move deserves a clear path.</h2></div><div><p className="text-sm leading-6 text-[#FFF4E1]/75">Share the opportunity, the problem, or the idea that has been waiting for the right momentum. We will begin by understanding what needs to change.</p><Link href="/contact" className="button-secondary buttonlike mt-7">Tell us what you are building <ArrowRight className="size-4" /></Link></div></div></div></section>
      </main>
    </PublicLayout>
  );
}
