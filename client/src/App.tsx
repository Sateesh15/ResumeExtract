import { Switch, Route, Link, useLocation } from "wouter";
import { useEffect, useRef } from "react";
import { MsalProvider } from "@azure/msal-react";
import msalInstance from "./lib/msalInstance";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { FileText, Home as HomeIcon, Wand2, BrainCircuit, Upload, LogOut, Loader } from "lucide-react";
import Home from "@/pages/Home";
import ManualExtractor from "@/pages/ManualExtractor";
import AIExtractor from "@/pages/AIExtractor";
import NotFound from "@/pages/not-found";
import BulkUpload from "./pages/BulkUpload";
import Login from "@/pages/Login";
import { useMsal } from "@azure/msal-react";

// msalInstance is created in `client/src/lib/msalInstance.ts`

function Navigation() {
  const [location, setLocation] = useLocation();
  const { userEmail, logout } = useAuth();
  const { instance } = useMsal();

  const isActive = (path: string) => location === path;

  const handleLogout = async () => {
    try {
      await instance.logoutPopup();
    } catch (err) {
      console.error("Logout popup failed:", err);
    }
    // clear local auth context and navigate to login
    logout();
    setLocation("/login");
  };

  // ✅ FIXED: Don't show nav on LOGIN page (not home page!)
  if (location === "/login") return null;

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
              data-testid="nav-bulk"
            >
              <Upload className="h-4 w-4" />
              Bulk Upload
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{userEmail}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </nav>
  );
}

function ProtectedRouter() {
  return (
    <Switch>
      {/* ✅ FIXED: Changed /Home to / */}
      <Route path="/" component={Home} />
      <Route path="/manual" component={ManualExtractor} />
      <Route path="/ai" component={AIExtractor} />
      <Route path="/bulk-upload" component={BulkUpload} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // ✅ FIXED: Use ref to prevent infinite loop
    if (!isLoading && !isAuthenticated && !hasRedirected.current && location !== "/login") {
      hasRedirected.current = true;
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated]);

  // ✅ FIXED: Check for /login route specifically
  if (location === "/login") {
    return (
      <Switch>
        <Route path="/login" component={Login} />
      </Switch>
    );
  }

  // While checking auth, show loader
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated, redirect to login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">Redirecting to login...</p>
          <Loader className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  // Authenticated, show all routes
  return <ProtectedRouter />;
}

function AppContent() {
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

export default function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </MsalProvider>
  );
}
