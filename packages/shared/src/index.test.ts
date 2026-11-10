import { describe, expect, it } from "vitest";
import { formatCentsToBRL, phoneSchema, roleSchema } from "./index";

describe("phoneSchema", () => {
  it("normaliza celular com máscara", () => {
    expect(phoneSchema.parse("(21) 91234-5678")).toBe("21912345678");
  });

  it("aceita fixo com 10 dígitos", () => {
    expect(phoneSchema.parse("2133224455")).toBe("2133224455");
  });

  it("rejeita número curto", () => {
    expect(phoneSchema.safeParse("912345678").success).toBe(false);
  });

  it("rejeita número longo demais", () => {
    expect(phoneSchema.safeParse("219123456789").success).toBe(false);
  });
});

describe("roleSchema", () => {
  it("aceita os três perfis da spec", () => {
    expect(roleSchema.options).toEqual(["ADMIN", "INSTRUCTOR", "STUDENT"]);
  });

  it("rejeita perfil desconhecido", () => {
    expect(roleSchema.safeParse("OWNER").success).toBe(false);
  });
});

describe("formatCentsToBRL", () => {
  it("formata centavos com separador de milhar", () => {
    expect(formatCentsToBRL(123456)).toBe("R$ 1.234,56");
  });

  it("formata valor sem milhar", () => {
    expect(formatCentsToBRL(9000)).toBe("R$ 90,00");
  });

  it("formata zero", () => {
    expect(formatCentsToBRL(0)).toBe("R$ 0,00");
  });

  it("rejeita valor fracionado", () => {
    expect(() => formatCentsToBRL(10.5)).toThrow(TypeError);
  });
});
