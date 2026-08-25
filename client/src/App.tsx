import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import NotFound from "@/pages/NotFound";
import ProductDetail from "@/pages/ProductDetail";
import OwnerDashboard from "@/pages/OwnerDashboard";
import OwnerContentManager from "@/pages/OwnerContentManager";
import OwnerProducts from "@/pages/OwnerProducts";
import Portal from "@/pages/Portal";
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
      <Route path={"/portal"} component={Portal} />
      <Route path={"/owner"} component={OwnerDashboard} />
      <Route path={"/owner/manage"} component={OwnerContentManager} />
      <Route path={"/owner/products"} component={OwnerProducts} />
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
