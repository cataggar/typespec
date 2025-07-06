import { MANIFEST } from "@typespec/compiler";
import { createTestRunner } from "@typespec/compiler/testing";
// Re-export system setup functions for Node/test environments
export { setCompilerHost } from "@typespec/compiler";
export type { SystemUrl } from "@typespec/compiler";
export {
  setSystemAssert,
  setSystemFsPromises,
  setSystemGlobby,
  setSystemPath,
  setSystemUrl,
} from "@typespec/compiler/testing";
export type {
  SystemAssert,
  SystemFsPromises,
  SystemGlobby,
  SystemPath,
} from "@typespec/compiler/testing";

function version(): string {
  return MANIFEST.version;
}

export async function test() {
  console.log(`TypeSpec Compiler ${version()}`);
  console.log("do createTestRunner");
  const runner = await createTestRunner();
  console.log("tsp compile");
  const diagnostics = await runner.compile("model Bar {}");
  console.log(`Diagnostics: ${JSON.stringify(diagnostics, null, 2)}`);
}

export const api = { version, test };
