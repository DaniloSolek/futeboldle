import crypto from "crypto";

const ALGORITMO = "aes-256-gcm";
const TAMANHO_IV = 12;
const TAMANHO_TAG = 16;

function obterChave(): Buffer {
  const segredo = process.env.GAME_SECRET;
  return crypto.createHash("sha256").update(segredo).digest();
}

export function encriptarId(id: string): string {
  const iv = crypto.randomBytes(TAMANHO_IV);
  const chave = obterChave();
  const cipher = crypto.createCipheriv(ALGORITMO, chave, iv);
  const criptografado = Buffer.concat([cipher.update(id, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, criptografado]).toString("base64url");
}

export function descriptografarId(token: string): string {
  const buffer = Buffer.from(token, "base64url");
  const iv = buffer.subarray(0, TAMANHO_IV);
  const tag = buffer.subarray(TAMANHO_IV, TAMANHO_IV + TAMANHO_TAG);
  const criptografado = buffer.subarray(TAMANHO_IV + TAMANHO_TAG);
  const chave = obterChave();
  const decipher = crypto.createDecipheriv(ALGORITMO, chave, iv);
  decipher.setAuthTag(tag);
  const decriptografado = Buffer.concat([decipher.update(criptografado), decipher.final()]);
  return decriptografado.toString("utf8");
}
