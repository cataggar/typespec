import { describe, it, expect } from "vitest";
import {
  listInterfacesOperationsVirtual,
  ParameterLocation,
  HttpMethod,
} from "../src/wasm-entry.js";

describe("listInterfacesOperationsVirtual", () => {
  it("should extract operation details from Pet API example", async () => {
    const result = await listInterfacesOperationsVirtual(
      [
        {
          path: "/main.tsp",
          contents: `
@route("/pets")
namespace Pets {
  op list(@query skip: int32, @query top: int32): {
    @body pets: Pet[];
  };
  op read(@path petId: int32, @header ifMatch?: string): {
    @header eTag: string;
    @body pet: Pet;
  };
  @post
  op create(@body pet: Pet): {};
}

model Pet {
  id: int32;
  name: string;
}
          `,
        },
      ],
      "/main.tsp",
    );

    expect(result.diagnostics).toHaveLength(0);
    expect(result.interfaces).toHaveLength(1); // Pets namespace with operations
    
    const petsNs = result.interfaces[0];
    expect(petsNs.name).toBe("Pets");
    expect(petsNs.operations).toHaveLength(3);
    
    // Check 'list' operation
    const listOp = petsNs.operations.find((op) => op.name === "list");
    expect(listOp).toBeDefined();
    expect(listOp!.parameters).toHaveLength(2);
    expect(listOp!.parameters[0].name).toBe("skip");
    expect(listOp!.parameters[0].location).toBe(ParameterLocation.Query);
    
    // Check 'create' operation
    const createOp = petsNs.operations.find((op) => op.name === "create");
    expect(createOp).toBeDefined();
    expect(createOp!.httpMethod).toBe(HttpMethod.Post);
    expect(createOp!.body).toBeDefined();
  });

  it("should extract operation details from interface with decorators", async () => {
    const result = await listInterfacesOperationsVirtual(
      [
        {
          path: "/main.tsp",
          contents: `
interface PetStore {
  @get
  list(@query skip: int32, @query top: int32): {
    @body pets: Pet[];
  };
  
  read(@path petId: int32, @header ifMatch?: string): {
    @header eTag: string;
    @body pet: Pet;
  };
  
  @post
  create(@body pet: Pet): {};
}

model Pet {
  id: int32;
  name: string;
}
          `,
        },
      ],
      "/main.tsp",
    );

    expect(result.diagnostics).toHaveLength(0);
    expect(result.interfaces).toHaveLength(1);

    const iface = result.interfaces[0];
    expect(iface.name).toBe("PetStore");
    expect(iface.operations).toHaveLength(3);

    // Check 'list' operation
    const listOp = iface.operations.find((op) => op.name === "list");
    expect(listOp).toBeDefined();
    expect(listOp!.httpMethod).toBe(HttpMethod.Get);
    expect(listOp!.parameters).toHaveLength(2);
    
    const skipParam = listOp!.parameters.find((p) => p.name === "skip");
    expect(skipParam).toBeDefined();
    expect(skipParam!.location).toBe(ParameterLocation.Query);
    expect(skipParam!.paramType).toBe("int32");
    expect(skipParam!.optional).toBe(false);

    const topParam = listOp!.parameters.find((p) => p.name === "top");
    expect(topParam).toBeDefined();
    expect(topParam!.location).toBe(ParameterLocation.Query);
    expect(topParam!.paramType).toBe("int32");
    expect(topParam!.optional).toBe(false);

    expect(listOp!.body).toBeUndefined();
    expect(listOp!.responses).toHaveLength(1);
    expect(listOp!.responses[0].statusCode).toBe("200");
    expect(listOp!.responses[0].bodyType).toBe("Pet[]");
    expect(listOp!.responses[0].headers).toHaveLength(0);

    // Check 'read' operation
    const readOp = iface.operations.find((op) => op.name === "read");
    expect(readOp).toBeDefined();
    expect(readOp!.httpMethod).toBeUndefined(); // No HTTP method decorator
    expect(readOp!.parameters).toHaveLength(2);

    const petIdParam = readOp!.parameters.find((p) => p.name === "petId");
    expect(petIdParam).toBeDefined();
    expect(petIdParam!.location).toBe(ParameterLocation.Path);
    expect(petIdParam!.paramType).toBe("int32");

    const ifMatchParam = readOp!.parameters.find((p) => p.name === "ifMatch");
    expect(ifMatchParam).toBeDefined();
    expect(ifMatchParam!.location).toBe(ParameterLocation.Header);
    expect(ifMatchParam!.optional).toBe(true);

    expect(readOp!.body).toBeUndefined();
    expect(readOp!.responses).toHaveLength(1);
    
    const readResponse = readOp!.responses[0];
    expect(readResponse.bodyType).toBe("Pet");
    expect(readResponse.headers).toHaveLength(1);
    expect(readResponse.headers[0].name).toBe("eTag");
    expect(readResponse.headers[0].location).toBe(ParameterLocation.Header);

    // Check 'create' operation
    const createOp = iface.operations.find((op) => op.name === "create");
    expect(createOp).toBeDefined();
    expect(createOp!.httpMethod).toBe(HttpMethod.Post);
    expect(createOp!.parameters).toHaveLength(0);
    expect(createOp!.body).toBeDefined();
    expect(createOp!.body!.name).toBe("pet");
    expect(createOp!.body!.location).toBe(ParameterLocation.Body);
    expect(createOp!.body!.paramType).toBe("Pet");
  });

  it("should handle interfaces without operations", async () => {
    const result = await listInterfacesOperationsVirtual(
      [
        {
          path: "/main.tsp",
          contents: `
interface EmptyInterface {
}
          `,
        },
      ],
      "/main.tsp",
    );

    expect(result.diagnostics).toHaveLength(0);
    expect(result.interfaces).toHaveLength(1);
    expect(result.interfaces[0].name).toBe("EmptyInterface");
    expect(result.interfaces[0].operations).toHaveLength(0);
  });

  it("should handle multiple interfaces", async () => {
    const result = await listInterfacesOperationsVirtual(
      [
        {
          path: "/main.tsp",
          contents: `
interface Store1 {
  @get op list(): string;
}

interface Store2 {
  @post op create(): void;
}
          `,
        },
      ],
      "/main.tsp",
    );

    expect(result.diagnostics).toHaveLength(0);
    expect(result.interfaces).toHaveLength(2);
    expect(result.interfaces[0].name).toBe("Store1");
    expect(result.interfaces[1].name).toBe("Store2");
  });

  it("should handle namespaced interfaces", async () => {
    const result = await listInterfacesOperationsVirtual(
      [
        {
          path: "/main.tsp",
          contents: `
namespace MyService {
  interface UserApi {
    @get op getUser(@path id: string): string;
  }
}
          `,
        },
      ],
      "/main.tsp",
    );

    expect(result.diagnostics).toHaveLength(0);
    expect(result.interfaces).toHaveLength(1);
    expect(result.interfaces[0].name).toBe("MyService.UserApi");
    expect(result.interfaces[0].operations).toHaveLength(1);
  });

  it("should handle operations with all HTTP methods", async () => {
    const result = await listInterfacesOperationsVirtual(
      [
        {
          path: "/main.tsp",
          contents: `
interface HttpMethods {
  @get op getOp(): void;
  @post op postOp(): void;
  @put op putOp(): void;
  @patch op patchOp(): void;
  @delete op deleteOp(): void;
  @head op headOp(): void;
}
          `,
        },
      ],
      "/main.tsp",
    );

    expect(result.diagnostics).toHaveLength(0);
    expect(result.interfaces).toHaveLength(1);
    
    const iface = result.interfaces[0];
    expect(iface.operations).toHaveLength(6);
    
    expect(iface.operations.find((op) => op.name === "getOp")!.httpMethod).toBe(HttpMethod.Get);
    expect(iface.operations.find((op) => op.name === "postOp")!.httpMethod).toBe(HttpMethod.Post);
    expect(iface.operations.find((op) => op.name === "putOp")!.httpMethod).toBe(HttpMethod.Put);
    expect(iface.operations.find((op) => op.name === "patchOp")!.httpMethod).toBe(HttpMethod.Patch);
    expect(iface.operations.find((op) => op.name === "deleteOp")!.httpMethod).toBe(HttpMethod.Delete);
    expect(iface.operations.find((op) => op.name === "headOp")!.httpMethod).toBe(HttpMethod.Head);
  });

  it("should handle parse errors gracefully", async () => {
    const result = await listInterfacesOperationsVirtual(
      [
        {
          path: "/main.tsp",
          contents: `
interface Bad {
  op test( // missing closing paren and body
}
          `,
        },
      ],
      "/main.tsp",
    );

    // Should not throw, but may have diagnostics
    expect(result).toBeDefined();
    expect(result.interfaces).toBeDefined();
  });

  it("should follow relative imports", async () => {
    const result = await listInterfacesOperationsVirtual(
      [
        {
          path: "/main.tsp",
          contents: `
import "./other.tsp";
interface Main {
  @get op test(): void;
}
          `,
        },
        {
          path: "/other.tsp",
          contents: `
interface Other {
  @post op create(): void;
}
          `,
        },
      ],
      "/main.tsp",
    );

    expect(result.diagnostics).toHaveLength(0);
    expect(result.interfaces).toHaveLength(2);
    expect(result.interfaces.some((i) => i.name === "Main")).toBe(true);
    expect(result.interfaces.some((i) => i.name === "Other")).toBe(true);
  });
});
