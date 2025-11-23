import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { FileText, Home as HomeIcon, Wand2, BrainCircuit ,Upload } from "lucide-react";
import Home from "@/pages/Home";
import ManualExtractor from "@/pages/ManualExtractor";
import AIExtractor from "@/pages/AIExtractor";
import NotFound from "@/pages/not-found";
import BulkUpload from './pages/BulkUpload';

function Navigation() {
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  return (
    <nav className="border-b h-16 flex items-center justify-between px-6">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Resume Extractor</h1>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/">
            <Button
              variant={isActive("/") ? "default" : "ghost"}
              className="gap-2"
              data-testid="nav-home"
            >
              <HomeIcon className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/manual">
            <Button
              variant={isActive("/manual") ? "default" : "ghost"}
              className="gap-2"
              data-testid="nav-manual"
            >
              <Wand2 className="h-4 w-4" />
              Manual Extractor
            </Button>
          </Link>
          <Link href="/ai">
            <Button
              variant={isActive("/ai") ? "default" : "ghost"}
              className="gap-2"
              data-testid="nav-ai"
            >
              <BrainCircuit className="h-4 w-4" />
              AI Extractor
            </Button>
          </Link>
          <Link href="/bulk-upload">
            <Button
              variant={isActive("/bulk-upload") ? "default" : "ghost"}
              className="gap-2"
              data-testid="nav-ai"
            >
              <Upload  className="h-4 w-4" />
              bulk upload
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/manual" component={ManualExtractor} />
      <Route path="/ai" component={AIExtractor} />
      <Route path="/bulk-upload" component={BulkUpload} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col">
          <Navigation />
          <main className="flex-1">
            <Router />
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
