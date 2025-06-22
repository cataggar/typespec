import { createTestRunner } from "@typespec/compiler/testing";

function version(): string {
  return "0.0.1";
}

export async function test() {
  const runner = await createTestRunner();
  const diagnostics = await runner.compile("model Bar {}");
  console.log(diagnostics);
}

export const typescript = { version, test };

// Use top-level await for ESM entrypoint
if (process.argv[1] && process.argv[1].endsWith("index.js")) {
  await test();
}
