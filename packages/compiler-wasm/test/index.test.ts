import { describe, it, expect } from "vitest";
import { compileVirtual, Severity } from "../src/index.js";

describe("compiler-wasm", () => {
  describe("compileVirtual", () => {
    it("should compile a simple TypeSpec file", async () => {
      const program = await compileVirtual(
        [
          {
            path: "/main.tsp",
            contents: "namespace MyService { op test(): void; }",
          },
        ],
        "/main.tsp",
        {
          emitters: [],
          outputDir: "/output",
          arguments: [],
        },
      );

      expect(program).toBeDefined();
      expect(program.getDiagnostics()).toBeDefined();
      // Note: success depends on whether stdlib is available
    });

    it("should handle syntax errors gracefully", async () => {
      const program = await compileVirtual(
        [
          {
            path: "/main.tsp",
            contents: "namespace MyService { op test( }",
          },
        ],
        "/main.tsp",
        {
          emitters: [],
          outputDir: "/output",
          arguments: [],
        },
      );

      expect(program).toBeDefined();
      expect(program.isSuccess()).toBe(false);
      expect(program.getDiagnostics().length).toBeGreaterThan(0);
      expect(program.getDiagnostics().some((d) => d.severity === Severity.Error)).toBe(true);
    });

    it("should handle missing entry file", async () => {
      const program = await compileVirtual(
        [
          {
            path: "/other.tsp",
            contents: "namespace MyService { }",
          },
        ],
        "/main.tsp",
        {
          emitters: [],
          outputDir: "/output",
          arguments: [],
        },
      );

      expect(program).toBeDefined();
      expect(program.isSuccess()).toBe(false);
      expect(program.getDiagnostics().length).toBeGreaterThan(0);
    });

    it("should handle internal errors without throwing", async () => {
      // Try to trigger an internal error by providing invalid state
      const program = await compileVirtual(
        [],
        "",
        {
          emitters: [],
          outputDir: "/output",
          arguments: [],
        },
      );

      expect(program).toBeDefined();
      expect(program.isSuccess()).toBe(false);
      expect(program.getDiagnostics().length).toBeGreaterThan(0);
    });

    it("should expose hasError method", async () => {
      const program = await compileVirtual(
        [
          {
            path: "/main.tsp",
            contents: "namespace MyService { op test( }",
          },
        ],
        "/main.tsp",
        {
          emitters: [],
          outputDir: "/output",
          arguments: [],
        },
      );

      expect(program.hasError()).toBe(true);
    });
  });
});
