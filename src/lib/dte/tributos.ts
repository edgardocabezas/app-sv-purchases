import type { DteTributo } from "./types";

/** Sum tributo values matching a código (Licuadora `sum_tributo`). */
export function sumTributo(
  tributos: DteTributo[] | null | undefined,
  codigoObjetivo: string,
): number {
  if (!Array.isArray(tributos)) return 0;
  let total = 0;
  for (const t of tributos) {
    try {
      const codigo = String(t?.codigo ?? "").trim();
      if (codigo !== codigoObjetivo) continue;
      const raw = t?.valor;
      const val = raw == null ? 0 : Number(raw);
      if (Number.isFinite(val)) total += val;
    } catch {
      continue;
    }
  }
  return roundMoney(total);
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
