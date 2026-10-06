import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "bb_admin";
const MAX_AGE_SEC = 60 * 60 * 12;

const DEV_SECRET = "dev-only-secret-change-me-in-production-please";

function secretKey() {
  return new TextEncoder().encode(process.env.SESSION_SECRET || DEV_SECRET);
}

export function adminPassword() {
  return process.env.ADMIN_PASSWORD || "barber123";
}

export async function createSessionToken() {
  return new SignJWT({ role: "barber" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.role === "barber";
  } catch {
    return false;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SEC,
};
