import { decodeWithFallback } from "./encoding";
import { sumTributo, roundMoney } from "./tributos";
import {
  TRIBUTO_COTRANS,
  TRIBUTO_FOVIAL,
  TRIBUTO_IVA,
  type ParseDteResult,
  type DteTributo,
} from "./types";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function asNumber(value: unknown, fallback = 0): number {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Parse DTE JSON bytes with encoding fallbacks and extract Anexo Compras fields.
 * Accepts any tipoDte (01/03/05/06/07 and unexpected); callers decide export vs informative.
 */
export function parseDteJson(bytes: Uint8Array): ParseDteResult {
  let text: string;
  let encoding: ReturnType<typeof decodeWithFallback>["encoding"];
  try {
    ({ text, encoding } = decodeWithFallback(bytes));
  } catch {
    return { ok: false, error: "No se pudo decodificar el archivo", code: "malformed" };
  }

  if (!text.trim()) {
    return { ok: false, error: "Archivo vacío", code: "empty" };
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return {
      ok: false,
      error: "JSON malformado o vacío",
      code: "malformed",
    };
  }

  if (!data || typeof data !== "object") {
    return { ok: false, error: "JSON raíz inválido", code: "malformed" };
  }

  const root = data as Record<string, unknown>;
  const identificacion = asRecord(root.identificacion);
  const emisor = asRecord(root.emisor);
  const resumen = asRecord(root.resumen);

  const fecEmi = asString(identificacion.fecEmi).trim();
  if (!fecEmi) {
    return {
      ok: false,
      error: "Falta identificacion.fecEmi",
      code: "missing_fec_emi",
    };
  }

  const tipoDte = asString(identificacion.tipoDte).trim();
  if (!tipoDte) {
    return {
      ok: false,
      error: "Falta identificacion.tipoDte",
      code: "missing_tipo",
    };
  }

  const codigoGeneracion = asString(identificacion.codigoGeneracion).trim();
  if (!codigoGeneracion) {
    return {
      ok: false,
      error: "Falta identificacion.codigoGeneracion",
      code: "missing_codigo",
    };
  }

  try {
    const totalGravada = roundMoney(asNumber(resumen.totalGravada, 0));
    const tributos = (resumen.tributos as DteTributo[] | null) ?? [];
    const iva = sumTributo(tributos, TRIBUTO_IVA);
    const cotrans = sumTributo(tributos, TRIBUTO_COTRANS);
    const fovial = sumTributo(tributos, TRIBUTO_FOVIAL);
    const totalConIva = roundMoney(totalGravada + iva);
    const exento = roundMoney(fovial + cotrans);
    const totalPagar = roundMoney(asNumber(resumen.totalPagar, 0));

    return {
      ok: true,
      data: {
        tipoDte,
        codigoGeneracion,
        fecEmi,
        emisorNit: asString(emisor.nit).trim(),
        emisorNrc: asString(emisor.nrc).trim(),
        emisorNombre: asString(emisor.nombre).trim(),
        totalGravada,
        iva,
        cotrans,
        fovial,
        totalConIva,
        exento,
        totalPagar,
        encoding,
        raw: root,
      },
    };
  } catch {
    return {
      ok: false,
      error: "Error al calcular montos/tributos",
      code: "invalid_amounts",
    };
  }
}

/** Convenience: parse from a UTF-8 string (tests / already-decoded content). */
export function parseDteJsonText(text: string): ParseDteResult {
  return parseDteJson(new TextEncoder().encode(text));
}
