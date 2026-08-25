import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowUpRight, Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { startLogin } from "@/const";
import { useCart } from "@/contexts/CartContext";
import CartDrawer from "./CartDrawer";

const navLinks = [
  ["Services", "/services"],
  ["Work", "/work"],
  ["Shop", "/shop"],
  ["About", "/about"],
] as const;

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { itemCount, openCart } = useCart();
  const { isAuthenticated } = useAuth();

  const closeMenu = () => setMenuOpen(false);
  const portalAction = () => {
    if (isAuthenticated) window.location.assign("/portal");
    else startLogin();
  };

  return (
    <div className="site-shell">
      <header className="site-nav sticky top-0 z-40">
        <div className="site-container flex min-h-[4.75rem] items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5" onClick={closeMenu} aria-label="Digital Junction home">
            <img src="/manus-storage/djdc-logo_bb40eabf.png" alt="DJDC logo" className="size-10 rounded-lg object-contain" />
            <span className="flex flex-col leading-none">
              <span className="brand-name text-[1.05rem]">Digital Junction</span>
              <span className="brand-kicker mt-1">Development Co.</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Public navigation">
            {navLinks.map(([label, href]) => (
              <Link key={href} href={href} className={`nav-link ${location === href || (href === "/shop" && location.startsWith("/shop")) ? "active" : ""}`}>
                {label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <button type="button" className="button-quiet !min-h-10 !border-0 !px-2.5" onClick={openCart} aria-label={`Open basket, ${itemCount} items`}>
              <ShoppingBag className="size-4" aria-hidden="true" />
              <span className="font-mono text-[0.7rem]">{String(itemCount).padStart(2, "0")}</span>
            </button>
            <button type="button" className="button-primary !min-h-10 !px-3.5" onClick={portalAction}>
              {isAuthenticated ? "Client portal" : "Portal sign in"}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 md:hidden">
            <button type="button" className="button-quiet !min-h-10 !border-0 !px-2.5" onClick={openCart} aria-label={`Open basket, ${itemCount} items`}>
              <ShoppingBag className="size-4" aria-hidden="true" />
              <span className="font-mono text-[0.68rem]">{itemCount}</span>
            </button>
            <button type="button" className="button-quiet !min-h-10 !px-2.5" onClick={() => setMenuOpen(value => !value)} aria-label="Toggle navigation" aria-expanded={menuOpen}>
              {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="border-t border-[#1A312C]/10 bg-[#FFF4E1] px-3 py-3 md:hidden" aria-label="Mobile navigation">
            <div className="site-container grid gap-1">
              {navLinks.map(([label, href]) => (
                <Link key={href} href={href} onClick={closeMenu} className="rounded-xl px-3 py-3 text-sm font-semibold text-[#1A312C] hover:bg-[#1A312C]/5">
                  {label}
                </Link>
              ))}
              <button type="button" className="button-primary mt-2 w-full" onClick={portalAction}>
                {isAuthenticated ? "Open client portal" : "Sign in to portal"}
              </button>
            </div>
          </nav>
        )}
      </header>

      {children}

      <footer className="bg-[#1A312C] py-12 text-[#FFF4E1]">
        <div className="site-container grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <img src="/manus-storage/djdc-logo_bb40eabf.png" alt="DJDC logo" className="size-10 rounded-lg object-contain" />
              <span className="font-display text-xl tracking-tight">Digital Junction</span>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-6 text-[#FFF4E1]/70">Connecting ideas with practical, thoughtful digital experiences—built for the work ahead.</p>
          </div>
          <div>
            <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[#89D7B7]">Explore</p>
            <div className="mt-4 grid gap-2.5 text-sm text-[#FFF4E1]/76">
              {navLinks.map(([label, href]) => <Link key={href} href={href} className="hover:text-[#89D7B7]">{label}</Link>)}
            </div>
          </div>
          <div>
            <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[#89D7B7]">Start a conversation</p>
            <p className="mt-4 text-sm leading-6 text-[#FFF4E1]/76">Tell us what you are building, where you are stuck, and what success needs to look like.</p>
            <Link href="/contact" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#89D7B7] hover:text-[#FFF4E1]">Start a project <ArrowUpRight className="size-3.5" /></Link>
          </div>
        </div>
        <div className="site-container mt-10 border-t border-[#FFF4E1]/15 pt-5 font-mono text-[0.63rem] uppercase tracking-[0.12em] text-[#FFF4E1]/45">© {new Date().getFullYear()} Digital Junction Development Co.</div>
      </footer>
      <CartDrawer />
    </div>
  );
}
