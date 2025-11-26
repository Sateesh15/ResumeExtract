import { PublicClientApplication } from "@azure/msal-browser";

export const msalConfig = {
  auth: {
    clientId: '5b21943f-59c2-4cf9-ad62-056b6302e168',
    authority: 'https://login.microsoftonline.com/604aebc4-9926-4009-9333-43f333827c56',
    redirectUri: '/'
  }
};

export const loginRequest = { scopes: ["openid", "profile", "email", "api://5b21943f-59c2-4cf9-ad62-056b6302e168/access_as_user"] };

export const msalInstance = new PublicClientApplication(msalConfig);
