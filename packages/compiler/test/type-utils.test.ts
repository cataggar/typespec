import { beforeEach, describe, it } from "vitest";
import {
  Enum,
  Interface,
  Model,
  Namespace,
  Operation,
  isDeclaredInNamespace,
  isTemplateDeclaration,
  isTemplateDeclarationOrInstance,
  isTemplateInstance,
} from "../src/index.js";
import { BasicTestRunner, createTestRunner } from "../src/testing/index.js";
import { assert } from "../src/testing/system-assert.js";

describe("compiler: type-utils", () => {
  let runner: BasicTestRunner;

  beforeEach(async () => {
    runner = await createTestRunner();
  });

  describe("template utils", () => {
    it("check model is a template declaration", async () => {
      await runner.compile(`
       model Foo<T> {t: T};
    `);
      const Foo = runner.program.checker.getGlobalNamespaceType().models.get("Foo")!;
      assert.ok(isTemplateDeclarationOrInstance(Foo));
      assert.ok(isTemplateDeclaration(Foo), "Should BE a template declaration");
      assert.ok(!isTemplateInstance(Foo), "Should NOT be a template instance");
    });

    it("check model reference is a template instance", async () => {
      const { Bar } = (await runner.compile(`
      model Foo<T> {t: T};

      @test model Bar {
        foo: Foo<string> 
      }
      `)) as { Bar: Model };
      const Foo = Bar.properties.get("foo")!.type as Model;

      assert.ok(isTemplateDeclarationOrInstance(Foo));
      assert.ok(isTemplateInstance(Foo), "Should BE a template instance");
      assert.ok(!isTemplateDeclaration(Foo), "Should NOT be a template declaration");
    });

    it("check model expression inside a template instance is also a template instance", async () => {
      const { Bar } = (await runner.compile(`
      model Foo<T> {a: { b: T }};

      @test model Bar {
        foo: Foo<string> 
      }
      `)) as { Bar: Model };
      const Foo = Bar.properties.get("foo")!.type as Model;
      const expr = Foo.properties.get("a")!.type;

      assert.ok(isTemplateInstance(expr), "Should BE a template instance");
      assert.ok(!isTemplateDeclaration(expr), "Should NOT be a template declaration");
    });

    it("check union expression inside a template instance is also a template instance", async () => {
      const { Bar } = (await runner.compile(`
      model Foo<T> {a: int32 | T};

      @test model Bar {
        foo: Foo<string> 
      }
      `)) as { Bar: Model };
      const Foo = Bar.properties.get("foo")!.type as Model;
      const expr = Foo.properties.get("a")!.type;

      assert.ok(isTemplateInstance(expr), "Should BE a template instance");
      assert.ok(!isTemplateDeclaration(expr), "Should NOT be a template declaration");
    });
  });

  describe("definition utils", () => {
    it("checks if a type is defined in a particular namespace or its child namespaces", async () => {
      const {
        Alpha,
        SubAlpha,
        Beta,
        FooModel,
        FooEnum,
        FooOperation,
        BarOperation,
        FooNamespace,
        FooInterface,
      } = (await runner.compile(`
          @test
          namespace Alpha {
            @test
            namespace SubAlpha {
              @test model FooModel {}
              @test enum FooEnum {}
              @test op FooOperation(): unknown;
              @test namespace FooNamespace {}
              @test interface FooInterface {
                @test op BarOperation(): unknown;
              }
            }
          }

          @test
          namespace Beta {}
`)) as {
        Alpha: Namespace;
        SubAlpha: Namespace;
        Beta: Namespace;
        FooModel: Model;
        FooEnum: Enum;
        FooOperation: Operation;
        BarOperation: Operation;
        FooNamespace: Namespace;
        FooInterface: Interface;
      };

      const candidates: [string, Model | Enum | Operation | Namespace | Interface][] = [
        ["FooModel", FooModel],
        ["FooEnum", FooEnum],
        ["FooOperation", FooOperation],
        ["BarOperation", BarOperation],
        ["FooNamespace", FooNamespace],
        ["FooInterface", FooInterface],
      ];

      for (const [name, type] of candidates) {
        assert.ok(
          isDeclaredInNamespace(type, Alpha),
          `${name} was not found recursively under Alpha`,
        );
        assert.ok(isDeclaredInNamespace(type, SubAlpha), `${name} was not found under SubAlpha`);
        assert.ok(
          !isDeclaredInNamespace(type, Alpha, { recursive: false }),
          `${name} should not be found when recursive: false`,
        );
        assert.ok(
          !isDeclaredInNamespace(type, Beta, { recursive: false }),
          `${name} should not be found in namespace Beta`,
        );
      }
    });
  });
});
