import { assert } from "../../src/testing/system-assert.js";
import { beforeEach, describe, it } from "vitest";
import { Model, StringTemplate } from "../../src/index.js";
import {
  BasicTestRunner,
  createTestRunner,
  expectDiagnosticEmpty,
  expectDiagnostics,
  extractSquiggles,
} from "../../src/testing/index.js";

let runner: BasicTestRunner;

beforeEach(async () => {
  runner = await createTestRunner();
});

async function compileStringTemplate(
  templateString: string,
  other?: string,
): Promise<StringTemplate> {
  const { Test } = (await runner.compile(
    `
      @test model Test {
        test: ${templateString};
      }

      ${other ?? ""}
      `,
  )) as { Test: Model };

  const prop = Test.properties.get("test")!.type;

  assert.strictEqual(prop.kind, "StringTemplate");
  return prop;
}

it("simple", async () => {
  const template = await compileStringTemplate(`"Start \${123} end"`);
  assert.strictEqual(template.spans.length, 3);
  assert.strictEqual(template.spans[0].isInterpolated, false);
  assert.strictEqual(template.spans[0].type.value, "Start ");

  assert.strictEqual(template.spans[1].isInterpolated, true);
  assert.strictEqual(template.spans[1].type.kind, "Number");
  assert.strictEqual(template.spans[1].type.value, 123);

  assert.strictEqual(template.spans[2].isInterpolated, false);
  assert.strictEqual(template.spans[2].type.value, " end");
});

it("string interpolated are marked with isInterpolated", async () => {
  const template = await compileStringTemplate(`"Start \${"interpolate"} end"`);
  assert.strictEqual(template.spans.length, 3);
  assert.strictEqual(template.spans[0].isInterpolated, false);
  assert.strictEqual(template.spans[0].type.value, "Start ");

  assert.strictEqual(template.spans[1].isInterpolated, true);
  assert.strictEqual(template.spans[1].type.kind, "String");
  assert.strictEqual(template.spans[1].type.value, "interpolate");

  assert.strictEqual(template.spans[2].isInterpolated, false);
  assert.strictEqual(template.spans[2].type.value, " end");
});

it("can interpolate a model", async () => {
  const template = await compileStringTemplate(`"Start \${TestModel} end"`, "model TestModel {}");
  assert.strictEqual(template.spans.length, 3);
  assert.strictEqual(template.spans[0].isInterpolated, false);
  assert.strictEqual(template.spans[0].type.value, "Start ");

  assert.strictEqual(template.spans[1].isInterpolated, true);
  assert.strictEqual(template.spans[1].type.kind, "Model");
  assert.strictEqual(template.spans[1].type.name, "TestModel");

  assert.strictEqual(template.spans[2].isInterpolated, false);
  assert.strictEqual(template.spans[2].type.value, " end");
});

// Regression test for https://github.com/microsoft/typespec/issues/7401
it("can use empty string to interpolate in tempalates", async () => {
  const diagnostics = await runner.diagnose(
    `
    @doc("\${T} strange")
    model Test<T extends valueof string> {}
    model B is Test<"">;
    `,
  );
  expectDiagnosticEmpty(diagnostics);
});

it("emit error if interpolating value and types", async () => {
  const diagnostics = await runner.diagnose(
    `
    const str1 = "hi";
    alias str2 = "\${str1} and \${string}";
    `,
  );
  expectDiagnostics(diagnostics, {
    code: "mixed-string-template",
    message:
      "String template is interpolating values and types. It must be either all values to produce a string value or or all types for string template type.",
  });
});

describe("emit error if interpolating value in a context where template is used as a type", () => {
  it.each([
    ["alias", `alias str2 = "with value \${str1}";`],
    ["model prop", `model Foo { a: "with value \${str1}"; }`],
  ])("%s", async (_, code) => {
    const source = `
      const str1 = "hi";
      ${code}
    `;
    const diagnostics = await runner.diagnose(source);
    expectDiagnostics(diagnostics, {
      code: "value-in-type",
      message: "A value cannot be used as a type.",
    });
  });
});

it("emit error if interpolating template parameter that can be a type or value", async () => {
  const { source, pos, end } = extractSquiggles(`
      alias Template<T extends string | (valueof string)> = {
        a: ~~~"\${T}"~~~;
      };
    `);
  const diagnostics = await runner.diagnose(source);
  expectDiagnostics(diagnostics, {
    code: "mixed-string-template",
    message:
      "String template is interpolating values and types. It must be either all values to produce a string value or or all types for string template type.",
    pos,
    end,
  });
});

it("emit error if interpolating template parameter that is a value but using template parmater as a type", async () => {
  const { source, pos, end } = extractSquiggles(`
      alias Template<T extends valueof string> = {
        a: ~~~"\${T}"~~~;
      };
    `);
  const diagnostics = await runner.diagnose(source);
  expectDiagnostics(diagnostics, {
    code: "value-in-type",
    message: "A value cannot be used as a type.",
    pos,
    end,
  });
});
