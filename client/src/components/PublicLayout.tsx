import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { usePublicSection } from "@/hooks/usePublicSection";

const logoUrl = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663920827301/UriSGgVGQZmuEDZB.png";
const navLinks = [["Home", "/"], ["Services", "/services"], ["Digital Products", "/shop"], ["Projects", "/work"], ["About", "/about"], ["Contact", "/contact"]] as const;

function BrandMark({ footer = false }: { footer?: boolean }) {
  return <div className="flex items-center gap-2.5"><img src={logoUrl} alt="DJDC logo" className="size-10 rounded-lg object-contain" /><span className={footer ? "font-display text-xl tracking-tight" : "flex flex-col leading-none"}>{footer ? "Digital Junction" : <><span className="brand-name text-[1.05rem]">Digital Junction</span><span className="brand-kicker mt-1">Development Co.</span></>}</span></div>;
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const footerBrand = usePublicSection("footer", "brand", { body: "Connecting ideas with practical, thoughtful digital experiences—built for the work ahead." });
  const footerContact = usePublicSection("footer", "contact", { body: "Tell us what you are building, where you are stuck, and what success needs to look like.", ctaLabel: "Start a project", ctaHref: "/contact" });
  const footerSocial = usePublicSection("footer", "social", { body: "Official social links will appear here when the company channels are ready." });

  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 12);
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);
  return <div className="site-shell">
    <header className={`site-nav sticky top-0 z-40 transition-[box-shadow,background-color] duration-200 ${scrolled ? "bg-[#FFF4E1]/95 shadow-[0_10px_30px_rgba(26,49,44,0.1)] backdrop-blur" : ""}`}>
      <div className="site-container flex min-h-[4.75rem] items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5" onClick={closeMenu} aria-label="Digital Junction home"><BrandMark /></Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Public navigation">{navLinks.map(([label, href]) => <Link key={href} href={href} className={`nav-link ${location === href || (href === "/shop" && location.startsWith("/shop")) ? "active" : ""}`}>{label}</Link>)}</nav>
        <div className="hidden items-center gap-2 md:flex"><Link href="/shop" className="button-primary buttonlike !min-h-10 !px-3.5">Browse products<ArrowUpRight className="size-3.5" aria-hidden="true" /></Link><Link href="/contact" className="button-quiet buttonlike !min-h-10 !px-3.5">Contact</Link></div>
        <div className="flex items-center gap-1.5 md:hidden"><button type="button" className="button-quiet !min-h-10 !px-2.5" onClick={() => setMenuOpen(value => !value)} aria-label="Toggle navigation" aria-expanded={menuOpen} aria-controls="mobile-site-navigation">{menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}</button></div>
      </div>
      {menuOpen ? <nav id="mobile-site-navigation" className="animate-in slide-in-from-top-2 border-t border-[#1A312C]/10 bg-[#FFF4E1] px-3 py-3 duration-200 md:hidden" aria-label="Mobile navigation"><div className="site-container grid gap-1">{navLinks.map(([label, href]) => <Link key={href} href={href} onClick={closeMenu} className="rounded-xl px-3 py-3 text-sm font-semibold text-[#1A312C] hover:bg-[#1A312C]/5">{label}</Link>)}<Link href="/shop" onClick={closeMenu} className="button-primary buttonlike mt-2 w-full">Browse products</Link><Link href="/contact" onClick={closeMenu} className="button-quiet buttonlike mt-1 w-full">Contact</Link></div></nav> : null}
    </header>
    {children}
    <footer className="bg-[#1A312C] py-12 text-[#FFF4E1]"><div className="site-container grid gap-10 md:grid-cols-[1.25fr_.8fr_.8fr_1fr]">
      {footerBrand.isVisible ? <div><BrandMark footer />{footerBrand.imageUrl ? <img src={footerBrand.imageUrl} alt="Digital Junction" className="mt-5 max-h-32 w-full rounded-xl object-cover" /> : null}<p className="mt-5 whitespace-pre-line text-sm leading-6 text-[#FFF4E1]/70">{footerBrand.body}</p></div> : null}
      <div><p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[#89D7B7]">Company</p><div className="mt-4 grid gap-2.5 text-sm text-[#FFF4E1]/76"><Link href="/about" className="hover:text-[#89D7B7]">About</Link><Link href="/services" className="hover:text-[#89D7B7]">Services</Link><Link href="/work" className="hover:text-[#89D7B7]">Projects</Link><Link href="/contact" className="hover:text-[#89D7B7]">Contact</Link></div></div>
      <div><p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[#89D7B7]">Digital products</p><div className="mt-4 grid gap-2.5 text-sm text-[#FFF4E1]/76"><Link href="/shop" className="hover:text-[#89D7B7]">All products</Link><Link href="/shop" className="hover:text-[#89D7B7]">UI kits</Link><Link href="/shop" className="hover:text-[#89D7B7]">Business resources</Link><Link href="/shop" className="hover:text-[#89D7B7]">Guest checkout</Link></div><p className="mt-7 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[#89D7B7]">Product help</p><div className="mt-4 grid gap-2.5 text-sm text-[#FFF4E1]/76"><Link href="/contact" className="hover:text-[#89D7B7]">Order questions</Link><Link href="/contact" className="hover:text-[#89D7B7]">Delivery support</Link><Link href="/contact" className="hover:text-[#89D7B7]">Support</Link></div></div>
      {footerContact.isVisible ? <div><p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[#89D7B7]">Start a conversation</p>{footerContact.imageUrl ? <img src={footerContact.imageUrl} alt="" className="mt-4 max-h-28 w-full rounded-xl object-cover" /> : null}<p className="mt-4 whitespace-pre-line text-sm leading-6 text-[#FFF4E1]/76">{footerContact.body}</p><Link href={footerContact.ctaHref || "/contact"} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#89D7B7] hover:text-[#FFF4E1]">{footerContact.ctaLabel || "Start a project"}<ArrowUpRight className="size-3.5" /></Link><p className="mt-7 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[#89D7B7]">Contact</p><div className="mt-4 grid gap-2 text-sm text-[#FFF4E1]/76"><span>Email: official address to be confirmed</span><span>Phone: official number to be confirmed</span></div>{footerSocial.isVisible ? <><p className="mt-7 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[#89D7B7]">Social</p>{footerSocial.imageUrl ? <img src={footerSocial.imageUrl} alt="" className="mt-4 max-h-28 w-full rounded-xl object-cover" /> : null}<p className="mt-4 whitespace-pre-line text-sm leading-6 text-[#FFF4E1]/76">{footerSocial.body}</p>{footerSocial.ctaLabel ? <Link href={footerSocial.ctaHref || "/"} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#89D7B7] hover:text-[#FFF4E1]">{footerSocial.ctaLabel}<ArrowUpRight className="size-3.5" /></Link> : null}</> : null}<p className="mt-7 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[#89D7B7]">Legal</p><div className="mt-4 grid gap-2 text-sm text-[#FFF4E1]/76"><Link href="/privacy" className="hover:text-[#89D7B7]">Privacy policy</Link><Link href="/terms" className="hover:text-[#89D7B7]">Terms & conditions</Link><Link href="/refunds" className="hover:text-[#89D7B7]">Refund policy</Link></div></div> : null}
    </div><div className="site-container mt-10 border-t border-[#FFF4E1]/15 pt-5 font-mono text-[0.63rem] uppercase tracking-[0.12em] text-[#FFF4E1]/45">© {new Date().getFullYear()} Digital Junction Development Co.</div></footer>
  </div>;
}
