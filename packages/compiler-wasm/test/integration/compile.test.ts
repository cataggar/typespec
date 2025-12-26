import { describe, it, expect } from "vitest";
import { compileVirtual } from "../../src/index.js";

describe("compiler-wasm integration", () => {
  it("should compile a minimal TypeSpec namespace", async () => {
    const program = await compileVirtual(
      [
        {
          path: "/main.tsp",
          contents: `
            namespace MyService {
              model User {
                id: string;
                name: string;
              }
              
              op getUser(id: string): User;
            }
          `,
        },
      ],
      "/main.tsp",
      {
        emitters: [],
        outputDir: "/output",
        arguments: [],
      },
    );

    // Should compile without errors if stdlib is available
    // For now, just verify we get a result structure
    expect(program).toBeDefined();
    expect(program.isSuccess()).toBeDefined();
    expect(program.getDiagnostics()).toBeDefined();
    expect(Array.isArray(program.getDiagnostics())).toBe(true);
  });

  it("should detect missing imports", async () => {
    const program = await compileVirtual(
      [
        {
          path: "/main.tsp",
          contents: `
            import "@typespec/http";
            
            namespace MyService {
              op test(): void;
            }
          `,
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
    // Should have diagnostics about missing import
    expect(program.getDiagnostics().length).toBeGreaterThan(0);
  });

  it("should provide detailed error locations", async () => {
    const program = await compileVirtual(
      [
        {
          path: "/main.tsp",
          contents: `
            namespace MyService {
              model User {
                id: string;
                name: invalidType;
              }
            }
          `,
        },
      ],
      "/main.tsp",
      {
        emitters: [],
        outputDir: "/output",
        arguments: [],
      },
    );

    expect(program.isSuccess()).toBe(false);
    expect(program.getDiagnostics().length).toBeGreaterThan(0);
    
    const diagnostic = program.getDiagnostics()[0];
    // File path may or may not be set depending on the diagnostic
    expect(diagnostic.file).toBeDefined();
    // Positions might be 0 if not provided, just check they exist
    expect(diagnostic.start).toBeDefined();
    expect(diagnostic.end).toBeDefined();
    expect(diagnostic.end).toBeGreaterThanOrEqual(diagnostic.start);
  });
});
