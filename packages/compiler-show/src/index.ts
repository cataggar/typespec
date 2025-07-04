import { MANIFEST } from "@typespec/compiler";
// import { createTestRunner } from "@typespec/compiler/testing";

function version(): string {
  return MANIFEST.version;
}

export async function test() {
  console.log(`TypeSpec Compiler ${version()}`);
  // const runner = await createTestRunner();
  // const diagnostics = await runner.compile("model Bar {}");
  // console.log(diagnostics);
}

export const api = { version, test };
