import { beforeEach, describe, it } from "vitest";
import { DecoratorContext, Enum, EnumMember, Model, Type } from "../../src/core/types.js";
import { getDoc } from "../../src/index.js";
import { TestHost, createTestHost, expectDiagnostics } from "../../src/testing/index.js";
import { assert } from "../../src/testing/system-assert.js";

describe("compiler: enums", () => {
  let testHost: TestHost;

  beforeEach(async () => {
    testHost = await createTestHost();
  });

  it("can be valueless", async () => {
    testHost.addTypeSpecFile(
      "main.tsp",
      `
      @test enum E {
        A, B, C
      }
      `,
    );

    const { E } = (await testHost.compile("./")) as {
      E: Enum;
    };

    assert.ok(E);
    assert.ok(!E.members.get("A")!.value);
    assert.ok(!E.members.get("B")!.value);
    assert.ok(!E.members.get("C")!.value);
  });

  it("can have values", async () => {
    testHost.addTypeSpecFile(
      "main.tsp",
      `
      @test enum E {
        @test("A") A: "a";
        @test("B") B: "b";
        @test("C") C: "c";
      }
      `,
    );

    const { E, A, B, C } = (await testHost.compile("./")) as {
      E: Enum;
      A: EnumMember;
      B: EnumMember;
      C: EnumMember;
    };

    assert.ok(E);
    assert.strictEqual(A.value, "a");
    assert.strictEqual(B.value, "b");
    assert.strictEqual(C.value, "c");
  });

  it("can be a model property", async () => {
    testHost.addTypeSpecFile(
      "main.tsp",
      `
      namespace Foo;
      enum E { A, B, C }
      @test model Foo {
        prop: E;
      }
      `,
    );

    const { Foo } = (await testHost.compile("./")) as {
      Foo: Model;
    };

    assert.ok(Foo);
    assert.strictEqual(Foo.properties.get("prop")!.type.kind, "Enum");
  });

  it("can't have duplicate variants", async () => {
    testHost.addTypeSpecFile(
      "main.tsp",
      `
      enum A { A, A }
      `,
    );
    const diagnostics = await testHost.diagnose("main.tsp");
    expectDiagnostics(diagnostics, {
      code: "enum-member-duplicate",
      message: "Enum already has a member named A",
    });
  });

  it("can have spread members", async () => {
    testHost.addTypeSpecFile(
      "main.tsp",
      `
      @test enum Bar {
        One: "1",
        Two: "2",
      }
      @test enum Foo  {
        ...Bar,
        Three: "3"
      }
      `,
    );

    const { Foo, Bar } = (await testHost.compile("main.tsp")) as {
      Foo: Enum;
      Bar: Enum;
    };
    assert.ok(Foo);
    assert.ok(Bar);

    assert.strictEqual(Foo.members.size, 3);
    assert.strictEqual(Foo.members.get("One")!.name, "One");
    assert.strictEqual(Foo.members.get("One")!.enum, Foo);
    assert.strictEqual(Foo.members.get("One")!.sourceMember, Bar.members.get("One"));

    assert.strictEqual(Bar.members.size, 2);
    assert.strictEqual(Bar.members.get("One")!.name, "One");
    assert.strictEqual(Bar.members.get("One")!.enum, Bar);
  });

  // Issue here was the same EnumType was create twice for each decorator on different namespaces causing equality issues when comparing the enum or enum member
  it("enums can be referenced from decorator on namespace", async () => {
    let refViaMyService: Enum | undefined;
    let refViaMyLib: Enum | undefined;
    testHost.addJsFile("lib.js", {
      $saveMyService(context: DecoratorContext, target: Type, ref: Enum) {
        refViaMyService = ref;
      },
      $saveMyLib(context: DecoratorContext, target: Type, ref: Enum) {
        refViaMyLib = ref;
      },
    });
    testHost.addTypeSpecFile(
      "main.tsp",
      `
      import "./lib.js";

      @saveMyService(MyLib.E)
      namespace MyService {}

      @saveMyLib(E)
      namespace MyLib{
        @test enum E {
          a, b
        }
      }
      `,
    );

    await testHost.compile("./");

    assert.ok(refViaMyService);
    assert.ok(refViaMyLib);
    assert.strictEqual(refViaMyService, refViaMyLib);
  });

  it("can decorate spread member independently", async () => {
    testHost.addTypeSpecFile(
      "main.tsp",
      `
      @test enum Base {@doc("base doc") one}
      @test enum Spread {...Base}

      @@doc(Spread.one, "override for spread");
      `,
    );
    const { Base, Spread } = (await testHost.compile("main.tsp")) as {
      Base: Enum;
      Spread: Enum;
    };
    assert.strictEqual(getDoc(testHost.program, Spread.members.get("one")!), "override for spread");
    assert.strictEqual(getDoc(testHost.program, Base.members.get("one")!), "base doc");
  });
});
