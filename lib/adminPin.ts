import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_PIN_COOKIE = "dds_admin_pin_session";
const sessionDurationSeconds = 4 * 60 * 60;

function getSessionSecret() {
  return process.env.ADMIN_PIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function verifyConfiguredAdminPin(candidate: string) {
  const configuredPin = process.env.ADMIN_PIN;
  if (!configuredPin) return false;

  const candidateBuffer = Buffer.from(candidate.trim(), "utf8");
  const configuredBuffer = Buffer.from(configuredPin, "utf8");
  return candidateBuffer.length === configuredBuffer.length &&
    timingSafeEqual(candidateBuffer, configuredBuffer);
}

export function createAdminPinSessionToken() {
  const secret = getSessionSecret();
  if (!secret) return null;

  const expiresAt = Math.floor(Date.now() / 1000) + sessionDurationSeconds;
  const signature = createHmac("sha256", secret)
    .update(String(expiresAt))
    .digest("base64url");
  return `${expiresAt}.${signature}`;
}

export function verifyAdminPinSessionToken(token?: string) {
  const secret = getSessionSecret();
  if (!secret || !token) return false;

  const [expiresAtText, signature, extra] = token.split(".");
  const expiresAt = Number(expiresAtText);
  if (!signature || extra || !Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(String(expiresAt))
    .digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    return false;
  }

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
