import { MANIFEST } from "@typespec/compiler";
import { createTestRunner } from "@typespec/compiler/testing";

function version(): string {
  return MANIFEST.version;
}

async function test() {
  console.log(`TypeSpec Compiler ${version()}`);
  const runner = await createTestRunner();
  const diagnostics = await runner.compile("model Bar {}");
  console.log(diagnostics);
}

const compilerShow = { version, test };

// Use top-level await for ESM entrypoint
// if (process.argv[1] && process.argv[1].endsWith("index.js")) {
//   await test();
// }

export { compilerShow, test };
