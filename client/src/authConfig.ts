export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || "5b21943f-59c2-4cf9-ad62-056b6302e168",
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_REDIRECT_URI || "http://localhost:5000/",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: [
    "User.Read",
    "openid",
    "profile",
    "email",
  ],
};

// ✅ CRITICAL: Use the exposed scope format
export const apiScopes = [
  "api://5b21943f-59c2-4cf9-ad62-056b6302e168/access",  // ← The scope you just created
];

console.log("[authConfig] API scopes configured:", apiScopes);
