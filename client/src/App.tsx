import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import NotFound from "@/pages/NotFound";
import ProductDetail from "@/pages/ProductDetail";
import GuestCheckout from "@/pages/GuestCheckout";
import OwnerDashboard from "@/pages/OwnerDashboard";
import OwnerPublicContent from "@/pages/OwnerPublicContent";
import OwnerProducts from "@/pages/OwnerProducts";
import OwnerProjects from "@/pages/OwnerProjects";
import OwnerShopPreview from "@/pages/OwnerShopPreview";
import OwnerProductAccess from "@/pages/OwnerProductAccess";
import OwnerPasswordSetup from "@/pages/OwnerPasswordSetup";
import OwnerPaymentMethods from "@/pages/OwnerPaymentMethods";
import { OwnerCustomers, OwnerSales, OwnerSettings, OwnerSupport, OwnerVouchers } from "@/pages/OwnerWorkspaceViews";
import { PrivacyPage, RefundsPage, TermsPage } from "@/pages/LegalPages";
import { OwnerLoginEntry } from "@/pages/AuthEntry";
import { useEffect } from "react";
import Services from "@/pages/Services";
import Shop from "@/pages/Shop";
import Work from "@/pages/Work";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/services"} component={Services} />
      <Route path={"/work"} component={Work} />
      <Route path={"/shop/:handle"} component={ProductDetail} />
      <Route path={"/shop"} component={Shop} />
      <Route path={"/checkout/:handle"} component={GuestCheckout} />
      <Route path={"/about"} component={About} />
      <Route path={"/contact"} component={Contact} />
      <Route path={"/owner/login"} component={OwnerLoginEntry} />
      <Route path={"/owner/setup"} component={OwnerPasswordSetup} />
      <Route path={"/owner/inventory"} component={OwnerProducts} />
      <Route path={"/owner/projects"} component={OwnerProjects} />
      <Route path={"/owner/sales"} component={OwnerSales} />
      <Route path={"/owner/customers"} component={OwnerCustomers} />
      <Route path={"/owner/content"} component={OwnerPublicContent} />
      <Route path={"/owner/vouchers"} component={OwnerVouchers} />
      <Route path={"/owner/settings"} component={OwnerSettings} />
      <Route path={"/owner/payment-methods"} component={OwnerPaymentMethods} />
      <Route path={"/owner/support"} component={OwnerSupport} />
      <Route path={"/owner"} component={OwnerDashboard} />
      <Route path={"/owner/products"} component={OwnerProducts} />
      <Route path={"/owner/product-access"} component={OwnerProductAccess} />
      <Route path={"/owner/shop-preview"} component={OwnerShopPreview} />
      <Route path={"/privacy"} component={PrivacyPage} />
      <Route path={"/terms"} component={TermsPage} />
      <Route path={"/refunds"} component={RefundsPage} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  const d1Only = import.meta.env.VITE_D1_ONLY === "true";

  useEffect(() => {
    if (!d1Only) return;
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'));
    inputs.forEach(input => {
      input.disabled = true;
      input.setAttribute("aria-disabled", "true");
      input.title = "Binary uploads are unavailable in the D1-only deployment.";
    });
  }, [d1Only]);

  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          {d1Only ? <div role="status" className="fixed inset-x-0 top-0 z-50 border-b border-[#1A312C]/15 bg-[#FFF4E1] px-4 py-2 text-center text-xs font-semibold text-[#1A312C] shadow-sm">D1-only deployment: structured website data is persistent. New binary file uploads are unavailable.</div> : null}
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
