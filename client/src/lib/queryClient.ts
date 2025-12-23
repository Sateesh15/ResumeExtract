import { QueryClient, QueryFunction } from "@tanstack/react-query";
import msalInstance from "./msalInstance";
import { loginRequest, apiScopes } from "@/authConfig";  // ← Import apiScopes

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

// ✅ Wait for accounts to be available
async function waitForAccounts(maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    const accounts = msalInstance.getAllAccounts();
    if (accounts && accounts.length > 0) {
      console.log(`[queryClient] ✅ Found ${accounts.length} account(s) on attempt ${i + 1}`);
      return accounts;
    }
    console.log(`[queryClient] Waiting for accounts... (attempt ${i + 1}/${maxRetries})`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return [];
}

export const getQueryFn: (options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;

    const accounts = await waitForAccounts();
    let headers: Record<string, string> = {};

    if (accounts && accounts.length > 0) {
      try {
        console.log("[queryClient] Attempting acquireTokenSilent...");
        console.log("[queryClient] Using API scopes:", apiScopes);
        
        // ✅ CRITICAL: Use apiScopes from authConfig (the correct format)
        const response = await msalInstance.acquireTokenSilent({
          account: accounts[0],
          scopes: apiScopes,  // ← This is ["5b21943f-59c2-4cf9-ad62-056b6302e168"]
        } as any);

        if (response && response.accessToken) {
          console.log("[queryClient] ✅ Token acquired, adding to headers");
          try {
            const parts = response.accessToken.split(".");
            if (parts.length >= 2) {
              const payload = JSON.parse(atob(parts[1]));
              console.log("[queryClient] ✅ Token received!");
              console.log("[queryClient] Token aud:", payload.aud);
              console.log("[queryClient] Token scp:", payload.scp);  
            }
          } catch (e) {
            console.debug("[queryClient] failed to decode token", e);
          }
          headers["Authorization"] = `Bearer ${response.accessToken}`;
        } else {
          console.log("[queryClient] ⚠️ No access token in response");
        }
      } catch (err) {
        console.error("[queryClient] ❌ acquireTokenSilent failed:", err);
        try {
          console.log("[queryClient] Attempting acquireTokenPopup...");
          const response = await msalInstance.acquireTokenPopup({
            account: accounts[0],
            scopes: apiScopes,  // ← Use apiScopes here too
          } as any);

          if (response && response.accessToken) {
            console.log("[queryClient] ✅ Token acquired via popup");
            headers["Authorization"] = `Bearer ${response.accessToken}`;
          }
        } catch (popupErr) {
          console.error("[queryClient] ❌ acquireTokenPopup also failed:", popupErr);
        }
      }
    } else {
      console.log("[queryClient] ⚠️ No accounts found after retries");
    }

    console.log("[queryClient] Sending request with headers:", { Authorization: headers["Authorization"] ? "Bearer ..." : "NONE" });

    const res = await fetch(url, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
