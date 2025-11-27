import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "@/authConfig";

// Shared MSAL instance for the client to use in non-component modules
export const msalInstance = new PublicClientApplication(msalConfig);

export default msalInstance;
