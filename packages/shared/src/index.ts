import { z } from "zod";

/**
 * Telefone brasileiro: normaliza para dígitos e exige DDD + número (10 ou 11).
 * Usado no cadastro de aluno, no checkout e no contato da escola.
 */
export const phoneSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => value.length === 10 || value.length === 11, {
    message: "Informe DDD e número",
  });

/** Perfis previstos na spec (seção 7). */
export const roleSchema = z.enum(["ADMIN", "INSTRUCTOR", "STUDENT"]);
export type Role = z.infer<typeof roleSchema>;

/** Situações de uma cobrança (spec, seção 8.2). */
export const chargeStatusSchema = z.enum([
  "PENDING",
  "PAID",
  "OVERDUE",
  "CANCELED",
  "REFUNDED",
]);
export type ChargeStatus = z.infer<typeof chargeStatusSchema>;

/** Formata centavos no padrão brasileiro: 123456 -> "R$ 1.234,56". */
export function formatCentsToBRL(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new TypeError("Valor em centavos deve ser inteiro");
  }
  const units = Math.trunc(cents / 100);
  const decimals = Math.abs(cents % 100)
    .toString()
    .padStart(2, "0");
  const grouped = units
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${grouped},${decimals}`;
}
