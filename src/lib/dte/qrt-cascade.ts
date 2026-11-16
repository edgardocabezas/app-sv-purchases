/**
 * F-07 V14 Anexo de Compras — Q/R/S/T cascade rules (manual page 21).
 *
 * Stored values remain numeric codes. UI labels come from classification-options.
 * Cascade is fully defined for Tipo de Operación = Gravada (Q=1); the same
 * R/S → T matrix is applied for other normal Q values (2–4) so Costo/Gasto
 * never pairs with the wrong Tipo de Costo/Gasto. Special codes 0 / 8 / 9
 * bypass the matrix.
 */

import type { ExportClassification } from "./types";
import {
  CLASIFICACION_OPTIONS,
  SECTOR_OPTIONS,
  TIPO_COSTO_GASTO_OPTIONS,
  TIPO_OPERACION_OPTIONS,
  type ClassificationOption,
} from "./classification-options";
import { DEFAULT_CLASSIFICATION } from "./types";

/** Special codes that skip Gravada cascade enforcement. */
const SPECIAL_CODES = new Set(["0", "8", "9"]);

/**
 * Allowed T codes for Gravada (and mirrored for Q 2–4) keyed by
 * Clasificación (R) → Sector (S).
 */
export const GRAVADA_ALLOWED_T: Readonly<
  Record<string, Readonly<Record<string, readonly string[]>>>
> = {
  // R=1 Costo
  "1": {
    "1": ["4", "5", "6", "7"], // Industria
    "2": ["4", "5"], // Comercio
    "3": ["4", "5"], // Agropecuaria
    "4": ["4", "5"], // Servicios…
  },
  // R=2 Gasto
  "2": {
    "1": ["1", "2", "3"],
    "2": ["1", "2", "3"],
    "3": ["1", "2", "3"],
    "4": ["1", "2", "3"],
  },
} as const;

function isSpecialCode(code: string): boolean {
  return SPECIAL_CODES.has(code);
}

/**
 * Returns the allowed T codes for a Q/R/S triple, or `null` when the matrix
 * does not constrain T (special codes / incomplete upstream).
 */
export function allowedTipoCostoGastoCodes(
  tipoOperacion: string,
  clasificacion: string,
  sector: string,
): readonly string[] | null {
  if (
    isSpecialCode(tipoOperacion) ||
    isSpecialCode(clasificacion) ||
    isSpecialCode(sector)
  ) {
    return null;
  }

  // Cascade matrix applies for Gravada (1) and other normal Q (2–4).
  if (!["1", "2", "3", "4"].includes(tipoOperacion)) {
    return null;
  }

  const bySector = GRAVADA_ALLOWED_T[clasificacion];
  if (!bySector) return null;
  return bySector[sector] ?? null;
}

export function isAllowedTipoCostoGasto(
  tipoOperacion: string,
  clasificacion: string,
  sector: string,
  tipoCostoGasto: string,
): boolean {
  if (isSpecialCode(tipoCostoGasto)) return true;
  const allowed = allowedTipoCostoGastoCodes(
    tipoOperacion,
    clasificacion,
    sector,
  );
  if (allowed == null) return true;
  return allowed.includes(tipoCostoGasto);
}

export function isValidClassification(
  classification: ExportClassification,
): boolean {
  return isAllowedTipoCostoGasto(
    classification.tipoOperacion,
    classification.clasificacion,
    classification.sector,
    classification.tipoCostoGasto,
  );
}

function filterOptions(
  all: readonly ClassificationOption[],
  codes: readonly string[] | null,
): ClassificationOption[] {
  if (codes == null) return [...all];
  const set = new Set(codes);
  // Keep specials (0/8/9) available alongside cascade-allowed codes.
  return all.filter((o) => set.has(o.code) || isSpecialCode(o.code));
}

/** Q options for the UI (always the full Tipo de Operación catalog). */
export function optionsForTipoOperacion(): ClassificationOption[] {
  return [...TIPO_OPERACION_OPTIONS];
}

/** R options — full catalog (cascade does not restrict R). */
export function optionsForClasificacion(): ClassificationOption[] {
  return [...CLASIFICACION_OPTIONS];
}

/** S options — full catalog (cascade does not restrict S). */
export function optionsForSector(): ClassificationOption[] {
  return [...SECTOR_OPTIONS];
}

/** T options filtered by current Q/R/S cascade. */
export function optionsForTipoCostoGasto(
  tipoOperacion: string,
  clasificacion: string,
  sector: string,
): ClassificationOption[] {
  const allowed = allowedTipoCostoGastoCodes(
    tipoOperacion,
    clasificacion,
    sector,
  );
  return filterOptions(TIPO_COSTO_GASTO_OPTIONS, allowed);
}

/**
 * Apply a partial classification patch and reset any downstream field that
 * becomes invalid under the cascade (typically T).
 */
export function applyClassificationPatch(
  current: ExportClassification,
  patch: Partial<ExportClassification>,
): ExportClassification {
  const next: ExportClassification = {
    ...current,
    ...patch,
  };

  if (
    !isAllowedTipoCostoGasto(
      next.tipoOperacion,
      next.clasificacion,
      next.sector,
      next.tipoCostoGasto,
    )
  ) {
    const allowed = allowedTipoCostoGastoCodes(
      next.tipoOperacion,
      next.clasificacion,
      next.sector,
    );
    next.tipoCostoGasto =
      allowed?.[0] ?? DEFAULT_CLASSIFICATION.tipoCostoGasto;
  }

  return next;
}

/** Convenience: coerce a full classification into a cascade-valid one. */
export function coerceClassification(
  classification: ExportClassification,
): ExportClassification {
  return applyClassificationPatch(classification, {});
}
