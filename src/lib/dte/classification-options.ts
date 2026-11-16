/**
 * F-07 V14 Anexo de Compras — columns Q / R / S / T option catalogs
 * (manual page ~21 + notes for codes 0 / 8 / 9).
 */

export type ClassificationOption = {
  code: string;
  label: string;
};

/** Q — Tipo de Operación */
export const TIPO_OPERACION_OPTIONS: readonly ClassificationOption[] = [
  { code: "0", label: "0 — N/A (periodo < feb 2024)" },
  { code: "1", label: "1 — Gravada" },
  { code: "2", label: "2 — No Gravada" },
  { code: "3", label: "3 — Excluido o no Constituye Renta" },
  { code: "4", label: "4 — Mixta" },
  {
    code: "9",
    label: "9 — Instituciones públicas / no deducible",
  },
] as const;

/** R — Clasificación */
export const CLASIFICACION_OPTIONS: readonly ClassificationOption[] = [
  { code: "0", label: "0 — N/A (periodo < feb 2024)" },
  { code: "1", label: "1 — Costo" },
  { code: "2", label: "2 — Gasto" },
  {
    code: "9",
    label: "9 — Instituciones públicas / no deducible",
  },
] as const;

/** S — Sector */
export const SECTOR_OPTIONS: readonly ClassificationOption[] = [
  { code: "0", label: "0 — N/A (periodo < feb 2024)" },
  { code: "1", label: "1 — Industria" },
  { code: "2", label: "2 — Comercio" },
  { code: "3", label: "3 — Agropecuaria" },
  {
    code: "4",
    label: "4 — Servicios, Profesiones, Artes y Oficios",
  },
  {
    code: "9",
    label: "9 — Instituciones públicas / no deducible",
  },
] as const;

/** T — Tipo de Costo / Gasto */
export const TIPO_COSTO_GASTO_OPTIONS: readonly ClassificationOption[] = [
  { code: "0", label: "0 — N/A (periodo < feb 2024)" },
  { code: "1", label: "1 — Gastos de Venta sin Donación" },
  { code: "2", label: "2 — Gastos de Administración sin Donación" },
  { code: "3", label: "3 — Gastos Financieros sin Donación" },
  {
    code: "4",
    label: "4 — Costo Artículos Producidos/Comprados Importaciones/Internaciones",
  },
  {
    code: "5",
    label: "5 — Costo Artículos Producidos/Comprados Interno",
  },
  { code: "6", label: "6 — Costos Indirectos de Fabricación" },
  { code: "7", label: "7 — Mano de obra" },
  {
    code: "8",
    label: "8 — Operaciones informadas en más de 1 anexo",
  },
  {
    code: "9",
    label: "9 — Instituciones públicas / no deducible",
  },
] as const;

export function optionLabel(
  options: readonly ClassificationOption[],
  code: string,
): string {
  return options.find((o) => o.code === code)?.label ?? code;
}
