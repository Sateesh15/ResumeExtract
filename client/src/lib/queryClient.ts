import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { msalInstance, loginRequest } from "@/msalConfig";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

async function getAccessToken() {
  const account = msalInstance.getActiveAccount();
  if (!account) {
    throw new Error("No active account! Please log in.");
  }

  const response = await msalInstance.acquireTokenSilent({
    ...loginRequest,
    account,
  }).catch(async (error) => {
    if (error instanceof InteractionRequiredAuthError) {
      return msalInstance.acquireTokenRedirect(loginRequest);
    }
    throw error;
  });

  return response?.accessToken;
}


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
  const accessToken = await getAccessToken();
  const headers: HeadersInit = {};
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let body: BodyInit | undefined;
  if (data instanceof FormData) {
    body = data;
  } else if (data) {
    body = JSON.stringify(data);
    headers["Content-Type"] = "application/json";
  }


  const res = await fetch(url, {
    method,
    headers,
    body,
  });

  await throwIfResNotOk(res);
  return res;
}



type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const accessToken = await getAccessToken();
    const headers: HeadersInit = {};
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const res = await fetch(queryKey.join("/") as string, {
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
