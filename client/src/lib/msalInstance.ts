import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "@/authConfig";

// Create MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);

// ✅ CRITICAL: Initialize MSAL before handling redirect
msalInstance.initialize().then(() => {
  console.log("[MSAL] ✅ MSAL initialized successfully");
  
  // Now handle the redirect from Azure login
  return msalInstance.handleRedirectPromise();
}).then((response) => {
  if (response) {
    console.log("[MSAL] ✅ Login successful! Account:", response.account?.username);
  } else {
    console.log("[MSAL] No redirect response (first load or already logged in)");
  }
}).catch((error) => {
  console.error("[MSAL] ❌ Error during initialization or redirect:", error);
});

export default msalInstance;
