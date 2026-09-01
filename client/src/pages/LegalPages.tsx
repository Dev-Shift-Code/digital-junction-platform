import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { getPublicSectionDefault } from "@/data/publicContentDefaults";
import { usePublicSection } from "@/hooks/usePublicSection";

type LegalSection = "privacy" | "terms" | "refunds";

function LegalPage({ page, fallbackTitle, fallbackBody }: { page: LegalSection; fallbackTitle: string; fallbackBody: string }) {
  const section = usePublicSection("legal", page, { ...getPublicSectionDefault("legal", page), title: fallbackTitle, body: fallbackBody });
  const [description, policyText = ""] = (section.body ?? "").split(/\n\n/, 2);
  const [policyHeading, ...policyParagraphs] = policyText.split("\n");
  return <PublicLayout><main>{section.isVisible && <>
    <section className="bg-[#1A312C] py-20 text-[#FFF4E1] sm:py-28"><div className="site-container max-w-4xl"><p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[#89D7B7]">{section.eyebrow}</p><h1 className="display mt-5 text-5xl leading-[0.98] sm:text-6xl">{section.title}</h1><p className="mt-7 max-w-2xl whitespace-pre-line text-base leading-7 text-[#FFF4E1]/72">{description}</p></div></section>
    <section className="section-grid py-16 sm:py-24"><div className="site-container max-w-4xl"><div className="rounded-[1.3rem] border border-[#1A312C]/12 bg-white/65 p-7 sm:p-10"><p className="eyebrow">Policy content</p><h2 className="display mt-4 text-3xl text-[#1A312C]">{policyHeading || "Policy text will be maintained here by the owner."}</h2><p className="mt-5 whitespace-pre-line text-sm leading-7 text-[#1A312C]/65">{policyParagraphs.join("\n") || "The owner can replace this placeholder with reviewed, business-specific policy language before commercial launch."}</p><Link href="/contact" className="button-primary buttonlike mt-7">Ask a question <ArrowRight className="size-4" /></Link></div></div></section>
  </>}</main></PublicLayout>;
}

export function PrivacyPage() { return <LegalPage page="privacy" fallbackTitle="Privacy policy" fallbackBody={"How Digital Junction will handle personal information and enquiry details.\n\nFinal policy text will be published here before commercial launch.\nThis page is intentionally presented as a clear placeholder rather than a fabricated legal policy."} />; }
export function TermsPage() { return <LegalPage page="terms" fallbackTitle="Terms & conditions" fallbackBody={"The terms that will guide services, digital products, and the use of this website.\n\nFinal policy text will be published here before commercial launch.\nThis page is intentionally presented as a clear placeholder rather than a fabricated legal policy."} />; }
export function RefundsPage() { return <LegalPage page="refunds" fallbackTitle="Refund policy" fallbackBody={"The policy that will explain eligibility and processes for digital product refunds.\n\nFinal policy text will be published here before commercial launch.\nThis page is intentionally presented as a clear placeholder rather than a fabricated legal policy."} />; }
