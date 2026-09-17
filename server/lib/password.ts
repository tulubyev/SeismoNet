import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

/** scrypt hash stored as `<hex hash>.<hex salt>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export function isHashed(stored: string): boolean {
  const [hash, salt] = stored.split(".");
  return /^[0-9a-f]{128}$/.test(hash ?? "") && /^[0-9a-f]{32}$/.test(salt ?? "");
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  if (!isHashed(stored)) return false;
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return hashedBuf.length === suppliedBuf.length && timingSafeEqual(hashedBuf, suppliedBuf);
}
