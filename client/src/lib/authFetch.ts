import { useMsal } from "@azure/msal-react";
import { IPublicClientApplication } from "@azure/msal-browser";
import { loginRequest } from "../msalConfig";

// Function to get access token
export async function getAccessToken(instance: IPublicClientApplication) {
  const accounts = instance.getAllAccounts();
  if (accounts.length === 0) throw new Error("No signed-in user");
  const { accessToken } = await instance.acquireTokenSilent({
    ...loginRequest,
    account: accounts[0],
  });
  return accessToken;
}

// Usage: const apiFetch = useApiFetch();
export function useApiFetch() {
  const { instance } = useMsal();

  return async (url: string, options: RequestInit = {}) => {
    const accessToken = await getAccessToken(instance);
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  };
}
