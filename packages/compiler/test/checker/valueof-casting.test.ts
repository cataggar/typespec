import { it } from "vitest";
import { isType, isValue } from "../../src/index.js";
import { expectDiagnostics } from "../../src/testing/expect.js";
import { assert } from "../../src/testing/system-assert.js";
import { compileValueOrType, diagnoseValueOrType } from "./values/utils.js";

it("extends valueof string returns a string value", async () => {
  const entity = await compileValueOrType("valueof string", `"hello"`);
  assert.ok(isValue(entity));
  assert.strictEqual(entity.valueKind, "StringValue");
});

it("extends valueof int32 returns a numeric value", async () => {
  const entity = await compileValueOrType("valueof int32", `123`);
  assert.ok(isValue(entity));
  assert.strictEqual(entity.valueKind, "NumericValue");
});

it("extends string returns a string literal type", async () => {
  const entity = await compileValueOrType("string", `"hello"`);
  assert.ok(isType(entity));
  assert.strictEqual(entity.kind, "String");
});

it("extends int32 returns a numeric literal type", async () => {
  const entity = await compileValueOrType("int32", `123`);
  assert.ok(isType(entity));
  assert.strictEqual(entity.kind, "Number");
});

it("value wins over type if both are accepted", async () => {
  const entity = await compileValueOrType("(valueof string) | string", `"hello"`);
  assert.ok(isValue(entity));
  assert.strictEqual(entity.valueKind, "StringValue");
});

it("ambiguous valueof with type option still emit ambiguous error", async () => {
  const diagnostics = await diagnoseValueOrType("(valueof int32 | int64) | int32", `123`);
  expectDiagnostics(diagnostics, {
    code: "ambiguous-scalar-type",
    message:
      "Value 123 type is ambiguous between int32, int64. To resolve be explicit when instantiating this value(e.g. 'int32(123)').",
  });
});

it("passing an enum member to 'EnumMember | valueof string' pass the type", async () => {
  const entity = await compileValueOrType(
    "Reflection.EnumMember | valueof string",
    `A.a`,
    `enum A { a }`,
  );
  assert.ok(isType(entity));
  assert.strictEqual(entity.kind, "EnumMember");
});
