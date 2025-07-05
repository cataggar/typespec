import { MANIFEST } from "@typespec/compiler";
import { createTestRunner } from "@typespec/compiler/testing";
// Re-export system setup functions for Node/test environments
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
  const runner = await createTestRunner();
  const diagnostics = await runner.compile("model Bar {}");
  console.log(diagnostics);
}

export const api = { version, test };
