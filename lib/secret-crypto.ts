import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
export function encryptionKey(value: string | undefined): Buffer {
  if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value))
    throw Error("ENCRYPTION_NOT_CONFIGURED");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw Error("ENCRYPTION_NOT_CONFIGURED");
  return key;
}
export function sealSecret(
  id: string,
  value: string,
  master: string | undefined,
) {
  const key = encryptionKey(master),
    iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from("eko-integrations:v1:" + id));
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return JSON.stringify({
    v: 1,
    iv: iv.toString("base64"),
    data: encrypted.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  });
}
export function openSecret(
  id: string,
  payload: string,
  master: string | undefined,
) {
  const key = encryptionKey(master);
  try {
    const p = JSON.parse(payload);
    if (p.v !== 1) throw Error();
    const iv = Buffer.from(p.iv, "base64"),
      tag = Buffer.from(p.tag, "base64");
    if (iv.length !== 12 || tag.length !== 16) throw Error();
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(Buffer.from("eko-integrations:v1:" + id));
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(Buffer.from(p.data, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw Error("SECRET_DECRYPTION_FAILED");
  }
}
