import type { ParseEncoding } from "./types";

const ENCODINGS: ParseEncoding[] = ["utf-8-sig", "cp1252", "latin-1"];

/**
 * Decode file bytes with the same fallback chain as Licuadora.py:
 * utf-8-sig → cp1252 → latin-1.
 */
export function decodeWithFallback(bytes: Uint8Array): {
  text: string;
  encoding: ParseEncoding;
} {
  let lastError: unknown;
  for (const encoding of ENCODINGS) {
    try {
      const label =
        encoding === "utf-8-sig"
          ? "utf-8"
          : encoding === "cp1252"
            ? "windows-1252"
            : "latin1";
      const decoder = new TextDecoder(label, {
        fatal: encoding === "utf-8-sig" || encoding === "cp1252",
      });
      let text = decoder.decode(bytes);
      if (encoding === "utf-8-sig" && text.charCodeAt(0) === 0xfeff) {
        text = text.slice(1);
      }
      return { text, encoding };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to decode file with known encodings");
}

/** Browser File / Blob helper. */
export async function readFileWithFallback(file: Blob): Promise<{
  text: string;
  encoding: ParseEncoding;
}> {
  const buffer = await file.arrayBuffer();
  return decodeWithFallback(new Uint8Array(buffer));
}
