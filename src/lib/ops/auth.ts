import { createHash, randomBytes } from "crypto";

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateToken(): string {
  // 32 bytes → 64 hex chars. Prefixed for human recognizability.
  return `ops_${randomBytes(32).toString("hex")}`;
}
