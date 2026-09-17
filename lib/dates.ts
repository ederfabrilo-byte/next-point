/**
 * Colunas `date` (só dia, sem hora) precisam de cuidado no JS:
 *
 * - `new Date('2026-09-17')` é interpretado como meia-noite UTC; em Maringá
 *   (UTC-3) isso vira 21h do dia 16, e a tela mostra o dia anterior.
 * - `new Date().toISOString().slice(0, 10)` devolve o dia em UTC: a partir das
 *   21h já grava "amanhã".
 *
 * Estas duas funções usam sempre o calendário local do aparelho.
 */

/** Hoje como 'YYYY-MM-DD' no fuso local. */
export function todayISODate(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY', sem passar por UTC. */
export function formatISODate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
