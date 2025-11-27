import { expressjwt as jwt } from "express-jwt";
import jwksRsa from "jwks-rsa";
import type { Request, Response, NextFunction } from "express";

const TENANT_ID = process.env.AZURE_TENANT_ID || "604aebc4-9926-4009-9333-43f333827c56";
const CLIENT_ID = process.env.AZURE_CLIENT_ID || "5b21943f-59c2-4cf9-ad62-056b6302e168";
const ALLOWED_DOMAIN = "@iwebte.com";

// ✅ FIXED: Accept multiple audience formats
export const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`,
  }),
  audience: [
    CLIENT_ID,
    `api://${CLIENT_ID}`,
    `https://${CLIENT_ID}`,
  ],
  issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
  algorithms: ["RS256"],
});

export const logAuthRequest = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const auth = (req.headers && req.headers.authorization) || "";
    const present = !!auth;
    console.log(`[auth] ${new Date().toISOString()} ${req.method} ${req.path} - Authorization present: ${present}`);
    if (present && typeof auth === "string") {
      console.log(`[auth] token preview: ${auth.slice(0, 80)}${auth.length > 80 ? "..." : ""}`);
    }
  } catch (e) {
    console.error("[auth] logAuthRequest error", e);
  }
  next();
};

export const checkJwtWithLogging = (req: Request, res: Response, next: NextFunction) => {
  console.log(`[auth] Verifying JWT for ${req.method} ${req.path}`);
  try {
    (checkJwt as any)(req, res, (err: any) => {
      if (err) {
        console.error(`[auth] JWT verification failed: ${err && err.message ? err.message : err}`);
        return next(err);
      }

      try {
        const user = (req as any).user;
        if (user) {
          const preview = {
            sub: user.sub,
            aud: user.aud || user.appid || user.azp,
            upn: user.preferred_username || user.upn || user.email,
            scp: user.scp,
          };
          console.log(`[auth] JWT verified, claims preview: ${JSON.stringify(preview)}`);
        } else {
          console.log(`[auth] JWT verified but no user claims present on request`);
        }
      } catch (e) {
        console.error("[auth] error logging decoded token", e);
      }

      next();
    });
  } catch (e) {
    console.error("[auth] checkJwtWithLogging unexpected error:", e);
    next(e);
  }
};

export const validateDomain = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const email = user.preferred_username || user.email || "";
  if (!email.endsWith(ALLOWED_DOMAIN)) {
    return res.status(403).json({
      error: "Access Denied",
      message: `Only ${ALLOWED_DOMAIN} email addresses are allowed`,
    });
  }

  (req as any).userEmail = email;
  next();
};

export const extractUserInfo = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (user) {
    (req as any).userInfo = {
      email: user.preferred_username || user.email,
      name: user.name || "Unknown",
      oid: user.oid,
    };
  }
  next();
};
