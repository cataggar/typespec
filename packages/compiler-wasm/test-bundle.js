// Simple test of the ESM bundle before componentization
import { compileVirtual } from "./dist/index.js";

const files = [
  {
    path: "main.tsp",
    contents: `
namespace Test {
  op ping(): void;
}
`
  }
];

const options = {
  emitters: [],
  outputDir: "./temp",
  arguments: []
};

try {
  console.log("Testing virtual compilation...");
  const result = await compileVirtual(files, "main.tsp", options);
  console.log("Result:", {
    success: result.success,
    diagnosticsCount: result.diagnostics.length,
    emittedCount: result.emitted.length
  });
  
  if (result.diagnostics.length > 0) {
    console.log("Diagnostics:", result.diagnostics);
  }
} catch (error) {
  console.error("Error:", error.message);
}