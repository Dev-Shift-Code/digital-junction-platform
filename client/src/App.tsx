import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import NotFound from "@/pages/NotFound";
import ProductDetail from "@/pages/ProductDetail";
import OwnerDashboard from "@/pages/OwnerDashboard";
import OwnerContentManager from "@/pages/OwnerContentManager";
import OwnerProducts from "@/pages/OwnerProducts";
import OwnerShopPreview from "@/pages/OwnerShopPreview";
import { PrivacyPage, RefundsPage, TermsPage } from "@/pages/LegalPages";
import ClientSide from "@/pages/ClientSide";
import ClientPurchases from "@/pages/ClientPurchases";
import ClientBilling from "@/pages/ClientBilling";
import ClientAccount from "@/pages/ClientAccount";
import ClientSupport from "@/pages/ClientSupport";
import ClientResources from "@/pages/ClientResources";
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
      <Route path={"/about"} component={About} />
      <Route path={"/contact"} component={Contact} />
      <Route path={"/client"} component={ClientSide} />
      <Route path={"/client/projects"} component={ClientSide} />
      <Route path={"/client/purchases"} component={ClientPurchases} />
      <Route path={"/client/billing"} component={ClientBilling} />
      <Route path={"/client/account"} component={ClientAccount} />
      <Route path={"/client/support"} component={ClientSupport} />
      <Route path={"/client/resources"} component={ClientResources} />
      <Route path={"/owner"} component={OwnerDashboard} />
      <Route path={"/owner/manage"} component={OwnerContentManager} />
      <Route path={"/owner/products"} component={OwnerProducts} />
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
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
