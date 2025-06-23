import { beforeEach, describe, it } from "vitest";
import { Interface, Namespace, Operation } from "../../src/core/types.js";
import { getAllTags } from "../../src/lib/decorators.js";
import { TestHost, createTestHost } from "../../src/testing/index.js";
import { assert } from "../../src/testing/system-assert.js";

describe("compiler: tag decorator", () => {
  let testHost: TestHost;

  beforeEach(async () => {
    testHost = await createTestHost();
  });

  it("applies @tag decorator to namespaces, interfaces, and operations", async (): Promise<void> => {
    testHost.addTypeSpecFile(
      "main.tsp",
      `
      @test
      @tag("namespace")
      namespace OpNamespace {
        @test
        @tag("namespaceOp")
        op NamespaceOperation(): string;
      }

      @test
      @tag("interface")
      interface OpInterface {
        @test
        @tag("interfaceOp")
        InterfaceOperation(): string;
      }

      @test
      interface UntaggedInterface {
        @test
        @tag("taggedOp")
        TaggedOperation(): string;
      }

      @test
      @tag("recursiveNamespace")
      namespace RecursiveNamespace {
        @test
        @tag("recursiveInterface")
        interface RecursiveInterface {
          @test
          @tag("recursiveOperation")
          RecursiveOperation(): string;
        }
      }
      `,
    );

    const {
      OpNamespace,
      OpInterface,
      NamespaceOperation,
      UntaggedInterface,
      InterfaceOperation,
      TaggedOperation,
      RecursiveNamespace,
      RecursiveInterface,
      RecursiveOperation,
    } = (await testHost.compile("./")) as {
      OpNamespace: Namespace;
      OpInterface: Interface;
      UntaggedInterface: Interface;
      NamespaceOperation: Operation;
      InterfaceOperation: Operation;
      TaggedOperation: Operation;
      RecursiveNamespace: Namespace;
      RecursiveInterface: Interface;
      RecursiveOperation: Operation;
    };

    assert.deepStrictEqual(getAllTags(testHost.program, OpNamespace), ["namespace"]);
    assert.deepStrictEqual(getAllTags(testHost.program, OpInterface), ["interface"]);
    assert.deepStrictEqual(getAllTags(testHost.program, UntaggedInterface), undefined);
    assert.deepStrictEqual(getAllTags(testHost.program, NamespaceOperation), [
      "namespace",
      "namespaceOp",
    ]);
    assert.deepStrictEqual(getAllTags(testHost.program, InterfaceOperation), [
      "interface",
      "interfaceOp",
    ]);
    assert.deepStrictEqual(getAllTags(testHost.program, TaggedOperation), ["taggedOp"]);

    // Check recursive tag walking
    assert.deepStrictEqual(getAllTags(testHost.program, RecursiveNamespace), [
      "recursiveNamespace",
    ]);
    assert.deepStrictEqual(getAllTags(testHost.program, RecursiveInterface), [
      "recursiveNamespace",
      "recursiveInterface",
    ]);
    assert.deepStrictEqual(getAllTags(testHost.program, RecursiveOperation), [
      "recursiveNamespace",
      "recursiveInterface",
      "recursiveOperation",
    ]);
  });
});
