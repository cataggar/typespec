import { assert } from "../../../src/testing/system-assert.js";
import { describe, it } from "vitest";
import { expectDiagnostics } from "../../../src/testing/expect.js";
import { compileValue, diagnoseValue } from "./utils.js";

describe("instantiate with constructor", () => {
  it("with boolean literal", async () => {
    const value = await compileValue(`boolean(true)`);
    assert.strictEqual(value.valueKind, "BooleanValue");
    assert.strictEqual(value.type.kind, "Scalar");
    assert.strictEqual(value.type.name, "boolean");
    assert.strictEqual(value.scalar?.name, "boolean");
    assert.strictEqual(value.value, true);
  });
});

describe("implicit type", () => {
  it("doesn't pick scalar if const has no type", async () => {
    const value = await compileValue(`a`, `const a = true;`);
    assert.strictEqual(value.valueKind, "BooleanValue");
    assert.strictEqual(value.type.kind, "Boolean");
    assert.strictEqual(value.type.value, true);
    assert.strictEqual(value.scalar, undefined);
    assert.strictEqual(value.value, true);
  });

  it("instantiate if there is a single string option", async () => {
    const value = await compileValue(`a`, `const a: boolean | string = true;`);
    assert.strictEqual(value.valueKind, "BooleanValue");
    assert.strictEqual(value.type.kind, "Union");
    assert.strictEqual(value.scalar?.name, "boolean");
    assert.strictEqual(value.value, true);
  });

  it("emit diagnostics if there is multiple numeric choices", async () => {
    const diagnostics = await diagnoseValue(
      `a`,
      `
      const a: boolean | myBoolean = true;
      scalar myBoolean extends boolean;`,
    );
    expectDiagnostics(diagnostics, {
      code: "ambiguous-scalar-type",
      message: `Value true type is ambiguous between boolean, myBoolean. To resolve be explicit when instantiating this value(e.g. 'boolean(true)').`,
    });
  });
});

describe("validate literal are assignable", () => {
  const cases: Array<[string, Array<["✔" | "✘", string, string?]>]> = [
    [
      "boolean",
      [
        ["✔", `false`],
        ["✔", `true`],
        ["✘", `"boolean"`, "Expected a single argument of type BooleanValue but got StringValue."],
        ["✘", `123`, "Expected a single argument of type BooleanValue but got NumericValue."],
      ],
    ],
  ];

  describe.each(cases)("%s", (scalarName, values) => {
    it.each(values)(`%s %s`, async (expected, value, message) => {
      const diagnostics = await diagnoseValue(`${scalarName}(${value})`);
      expectDiagnostics(diagnostics, expected === "✔" ? [] : [{ message: message ?? "" }]);
    });
  });
});
