import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../msalConfig";


export default function Login() {
  const { instance } = useMsal();
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Login with Azure Entra</h1>
      <button style={{ padding: "0.75rem 2rem", background: "#2563eb", color: "white", borderRadius: 8 }}
        onClick={() => instance.loginRedirect(loginRequest)}>
        Login with Company Account
      </button>
    </div>
  );
}
