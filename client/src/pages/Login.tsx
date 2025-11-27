import { useEffect } from "react";
import { useLocation } from "wouter";
import { useMsal } from "@azure/msal-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader } from "lucide-react";

export default function Login() {
  const { instance, inProgress } = useMsal();
  const { setUser, setIsAuthenticated, isLoading, setIsLoading } = useAuth();
  const [, navigate] = useLocation();

  // Ensure logout helper is available for useEffect (avoid TDZ)
  async function handleLogout() {
    try {
      await instance.logoutPopup();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  useEffect(() => {
    // Check if already authenticated
    const accounts = instance.getAllAccounts();
    if (accounts.length > 0) {
      const account = accounts[0];
      const email = account.username || "";

      // Domain check
      if (!email.endsWith("@iwebte.com")) {
        handleLogout();
        return;
      }

      setUser(account);
      setIsAuthenticated(true);
      setIsLoading(false);
      navigate("/");
    } else {
      setIsLoading(false);
    }
  }, [instance, setUser, setIsAuthenticated, navigate, setIsLoading]);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const response = await instance.loginPopup({
        scopes: ["user.read"],
      });

      const email = response.account?.username || "";

      // Domain validation
      if (!email.endsWith("@iwebte.com")) {
        await instance.logoutPopup({
          account: response.account || undefined,
        });
        alert(
          "⛔ Access Denied\nOnly @iwebte.com email addresses are allowed."
        );
        setIsLoading(false);
        return;
      }

      setUser(response.account);
      setIsAuthenticated(true);
      setIsLoading(false);
      navigate("/");
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed. Please try again.");
      setIsLoading(false);
    }
  };

  if (isLoading || inProgress === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-6 w-6 text-primary" />
              <CardTitle>Resume Extractor</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Loader className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Authenticating...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-lg p-2">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">Resume Extractor</CardTitle>
              <p className="text-sm text-muted-foreground">
                Extract & manage resumes with AI
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-lg font-semibold">Welcome</h2>
            <p className="text-sm text-muted-foreground">
              Sign in with your{" "}
              <span className="font-semibold text-foreground">
                @iwebte.com
              </span>{" "}
              email
            </p>
          </div>

          <Button
            onClick={handleLogin}
            className="w-full h-10 bg-[#0078D4] hover:bg-[#005A9E]"
          >
            <svg
              className="w-4 h-4 mr-2"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
            </svg>
            Sign in with Microsoft
          </Button>

          <div className="space-y-2 text-xs text-muted-foreground text-center">
            <p>Only corporate email accounts are allowed</p>
            <p>Contact IT support if you need access</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}