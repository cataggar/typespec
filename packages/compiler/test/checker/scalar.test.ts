import { beforeEach, describe, it } from "vitest";
import { Model } from "../../src/index.js";
import {
  BasicTestRunner,
  createTestHost,
  createTestWrapper,
  expectDiagnostics,
  expectTypeEquals,
} from "../../src/testing/index.js";
import { assert } from "../../src/testing/system-assert.js";

describe("compiler: scalars", () => {
  let runner: BasicTestRunner;

  beforeEach(async () => {
    const host = await createTestHost();
    runner = createTestWrapper(host);
  });

  it("declare simple scalar", async () => {
    const { A } = await runner.compile(`
      @test scalar A;
    `);

    assert.strictEqual(A.kind, "Scalar");
    assert.strictEqual(A.name, "A");
    assert.strictEqual(A.baseScalar, undefined);
  });

  it("declare simple scalar extending another", async () => {
    const { A } = await runner.compile(`
      @test scalar A extends numeric;
    `);

    assert.strictEqual(A.kind, "Scalar");
    assert.strictEqual(A.name, "A");
    assert.strictEqual(A.baseScalar, runner.program.checker.getStdType("numeric"));
  });

  it("declare scalar with template parameters", async () => {
    const { A } = await runner.compile(`
      @doc(T)
      @test
      scalar A<T extends valueof string>;

      alias B = A<"123">;
    `);

    assert.strictEqual(A.kind, "Scalar");
    assert.strictEqual(A.name, "A");
  });

  // Test for https://github.com/microsoft/typespec/issues/1764
  it("template parameter are scoped to the scalar", async () => {
    const { A, B } = await runner.compile(`
      @test @doc(T) scalar A<T extends valueof string>;
      @test @doc(T) scalar B<T extends valueof string>;

      alias AIns = A<"">;
      alias BIns = B<"">;
    `);

    assert.strictEqual(A.kind, "Scalar");
    assert.strictEqual(B.kind, "Scalar");
  });

  it("allows a decimal to have a default value", async () => {
    const { A } = (await runner.compile(`
      @test model A {
        x: decimal = 42;
      }
    `)) as { A: Model };

    const def = A.properties.get("x")!.defaultValue!;
    assert.strictEqual(def.valueKind, "NumericValue");
    assert.strictEqual(def.value.asNumber(), 42);
  });

  describe("custom scalars and default values", () => {
    it("allows custom numeric scalar to have a default value", async () => {
      const { S, M } = await runner.compile(`
      @test scalar S extends int32;
      @test model M { p?: S = 42; }
    `);

      assert.strictEqual(S.kind, "Scalar");
      assert.strictEqual(M.kind, "Model");
      const p = M.properties.get("p");
      assert.ok(p);
      expectTypeEquals(p.type, S);
      assert.strictEqual(p.defaultValue?.valueKind, "NumericValue");
      assert.strictEqual(p.defaultValue.value.asNumber(), 42);
    });

    it("allows custom boolean scalar to have a default value", async () => {
      const { S, M } = await runner.compile(`
      @test scalar S extends boolean;
      @test model M { p?: S = true; }
    `);

      assert.strictEqual(S.kind, "Scalar");
      assert.strictEqual(M.kind, "Model");
      const p = M.properties.get("p");
      assert.ok(p);
      expectTypeEquals(p.type, S);
      assert.strictEqual(p.defaultValue?.valueKind, "BooleanValue");
      assert.strictEqual(p.defaultValue.value, true);
    });

    it("allows custom string scalar to have a default value", async () => {
      const { S, M } = await runner.compile(`
      @test scalar S extends string;
      @test model M { p?: S = "hello"; }
    `);

      assert.strictEqual(S.kind, "Scalar");
      assert.strictEqual(M.kind, "Model");
      const p = M.properties.get("p");
      assert.ok(p);
      expectTypeEquals(p.type, S);
      assert.strictEqual(p.defaultValue?.valueKind, "StringValue");
      assert.strictEqual(p.defaultValue.value, "hello");
    });

    it("does not allow custom numeric scalar to have a default outside range", async () => {
      const diagnostics = await runner.diagnose(`
      namespace SomeNamespace;
      scalar S extends int8;
      model M { p?: S = 9999; }
    `);
      expectDiagnostics(diagnostics, [{ code: "unassignable", message: /9999.*S/ }]);
    });

    it("does not allow non-numeric/boolean/string custom scalar to have a default", async () => {
      const diagnostics = await runner.diagnose(`
      scalar S;
      model M { p?: S = 42; }
    `);
      expectDiagnostics(diagnostics, [{ code: "unassignable", message: /42.*S/ }]);
    });
  });

  describe("circular references", () => {
    describe("emit diagnostic when circular reference in extends", () => {
      it("reference itself", async () => {
        const diagnostics = await runner.diagnose(`scalar a extends a;`);
        expectDiagnostics(diagnostics, {
          code: "circular-base-type",
          message: "Type 'a' recursively references itself as a base type.",
        });
      });
      it("reference itself via another scalar", async () => {
        const diagnostics = await runner.diagnose(`
          scalar a extends b;
          scalar b extends a;
        `);
        expectDiagnostics(diagnostics, {
          code: "circular-base-type",
          message: "Type 'a' recursively references itself as a base type.",
        });
      });
      it("reference itself via an alias", async () => {
        const diagnostics = await runner.diagnose(`
          scalar a extends b;
          alias b = a;
        `);
        expectDiagnostics(diagnostics, {
          code: "circular-base-type",
          message: "Type 'a' recursively references itself as a base type.",
        });
      });
    });
  });
});
