import { describe, expect, it } from "vitest";
import { fullNameSchema, isAllowedEmail, otpSchema, studentEmailError, studentEmailSchema } from "@/lib/auth/domain";
import { safeNextPath } from "@/lib/auth/redirect";

describe("email domain restriction", () => {
  it.each([
    ["alumno@esdi.edu.es", true],
    ["  Alumno.Nombre@ESDI.EDU.ES ", true],
    ["a+tag@esdi.edu.es", true],
    ["alumno@gmail.com", false],
    ["alumno@esdi.es", false],
    ["alumno@esdi.edu.es.evil.com", false],
    ["alumno@sub.esdi.edu.es", false],
    ["a@b@esdi.edu.es", false],
    [".alumno@esdi.edu.es", false],
    ["alu..mno@esdi.edu.es", false],
    ["@esdi.edu.es", false],
    ["alumno@", false],
    ["", false],
  ])("%s → %s", (email, ok) => {
    expect(isAllowedEmail(email)).toBe(ok);
  });

  it("returns Spanish messages", () => {
    const r1 = studentEmailSchema.safeParse("alumno@gmail.com");
    expect(r1.success).toBe(false);
    expect(r1.error?.issues[0]?.message).toBe("Solo se admiten correos @esdi.edu.es.");
    const r2 = studentEmailSchema.safeParse("no-es-un-correo");
    expect(r2.error?.issues[0]?.message).toBe("Escribe un correo válido.");
    const ok = studentEmailSchema.safeParse(" Alumno@Esdi.Edu.Es ");
    expect(ok.data).toBe("alumno@esdi.edu.es");
  });

  it("gives the access form the same verdict in the browser", () => {
    expect(studentEmailError("alumno@gmail.com")).toBe("Solo se admiten correos @esdi.edu.es.");
    expect(studentEmailError("   ")).toBe("Escribe tu correo.");
    expect(studentEmailError("alumno@")).toBe("Escribe un correo válido.");
    expect(studentEmailError(" Alumno@ESDI.edu.es ")).toBeNull();
  });
});

describe("profile name and OTP", () => {
  it("normalises names and rejects junk", () => {
    expect(fullNameSchema.parse("  Laia   Puig  Ferrer ")).toBe("Laia Puig Ferrer");
    expect(fullNameSchema.safeParse("L").success).toBe(false);
    expect(fullNameSchema.safeParse("<script>").success).toBe(false);
    expect(fullNameSchema.parse("Àngels O'Neill-Güell")).toBe("Àngels O'Neill-Güell");
  });

  it("accepts 6-digit codes with spaces", () => {
    expect(otpSchema.parse("123 456")).toBe("123456");
    expect(otpSchema.safeParse("12345").success).toBe(false);
  });
});

describe("post-login redirects", () => {
  it("allows only same-origin relative paths", () => {
    expect(safeNextPath("/mis-reservas")).toBe("/mis-reservas");
    expect(safeNextPath("/reservar?semana=2026-10-12")).toBe("/reservar?semana=2026-10-12");
    expect(safeNextPath("https://evil.example")).toBe("/reservar");
    expect(safeNextPath("//evil.example")).toBe("/reservar");
    expect(safeNextPath("/\\evil.example")).toBe("/reservar");
    expect(safeNextPath("/acceso")).toBe("/reservar");
    expect(safeNextPath(null)).toBe("/reservar");
  });
});
