/**
 * F-07 V14 Anexo de Compras — columns Q / R / S / T option catalogs
 * (manual page ~21 + notes for codes 0 / 8 / 9).
 *
 * UI shows **names only** (no leading numeric codes). Persist codes via
 * `option.code` in DB / CSV / Excel.
 */

export type ClassificationOption = {
  code: string;
  label: string;
};

/** Q — Tipo de Operación */
export const TIPO_OPERACION_OPTIONS: readonly ClassificationOption[] = [
  { code: "0", label: "N/A (periodo < feb 2024)" },
  { code: "1", label: "Gravada" },
  { code: "2", label: "No Gravada" },
  { code: "3", label: "Excluido o no Constituye Renta" },
  { code: "4", label: "Mixta" },
  {
    code: "9",
    label: "Instituciones públicas / no deducible",
  },
] as const;

/** R — Clasificación */
export const CLASIFICACION_OPTIONS: readonly ClassificationOption[] = [
  { code: "0", label: "N/A (periodo < feb 2024)" },
  { code: "1", label: "Costo" },
  { code: "2", label: "Gasto" },
  {
    code: "9",
    label: "Instituciones públicas / no deducible",
  },
] as const;

/** S — Sector */
export const SECTOR_OPTIONS: readonly ClassificationOption[] = [
  { code: "0", label: "N/A (periodo < feb 2024)" },
  { code: "1", label: "Industria" },
  { code: "2", label: "Comercio" },
  { code: "3", label: "Agropecuaria" },
  {
    code: "4",
    label: "Servicios, Profesiones, Artes y Oficios",
  },
  {
    code: "9",
    label: "Instituciones públicas / no deducible",
  },
] as const;

/** T — Tipo de Costo / Gasto */
export const TIPO_COSTO_GASTO_OPTIONS: readonly ClassificationOption[] = [
  { code: "0", label: "N/A (periodo < feb 2024)" },
  { code: "1", label: "Gastos de Venta sin Donación" },
  { code: "2", label: "Gastos de Administración sin Donación" },
  { code: "3", label: "Gastos Financieros sin Donación" },
  {
    code: "4",
    label: "Costo Artículos Producidos/Comprados Importaciones/Internaciones",
  },
  {
    code: "5",
    label: "Costo Artículos Producidos/Comprados Interno",
  },
  { code: "6", label: "Costos Indirectos de Fabricación" },
  { code: "7", label: "Mano de obra" },
  {
    code: "8",
    label: "Operaciones informadas en más de 1 anexo",
  },
  {
    code: "9",
    label: "Instituciones públicas / no deducible",
  },
] as const;

export function optionLabel(
  options: readonly ClassificationOption[],
  code: string,
): string {
  return options.find((o) => o.code === code)?.label ?? code;
}
