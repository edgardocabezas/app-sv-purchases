import type { ExportDteType } from "@/lib/dte/types";

/**
 * F-07 V14 Anexo Compras (columna O / totales):
 * - Nota de Débito (06) **suma**
 * - Nota de Crédito (05) **resta**
 * - Comprobante de Crédito Fiscal (03) is the base positive purchase
 *
 * We store absolute amounts on `dte_documents` and apply a sign at CSV row
 * build time so G–O money columns subtract for tipo 05 and add for 03/06.
 * Column N (crédito fiscal) and O (total) follow the same sign so annex
 * totals net correctly when DGII sums rows.
 */
export function amountSignForTipo(tipoDocumento: string): 1 | -1 {
  if (tipoDocumento === "05") return -1;
  return 1;
}

export function signedExportAmounts(
  tipoDocumento: ExportDteType | string,
  amounts: { totalGravada: number; iva: number; totalConIva: number },
): { totalGravada: number; iva: number; totalConIva: number } {
  const sign = amountSignForTipo(tipoDocumento);
  return {
    totalGravada: sign * amounts.totalGravada,
    iva: sign * amounts.iva,
    totalConIva: sign * amounts.totalConIva,
  };
}
