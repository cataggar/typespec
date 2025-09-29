// Simple test of the ESM bundle before componentization
import { compileVirtual } from "./dist/index.js";

const files = [
  {
    path: "main.tsp",
    contents: `
scalar MyString extends string;
`
  }
];

const options = {
  emitters: [],
  outputDir: "./temp",
  arguments: ["--nostdlib"]
};

try {
  console.log("Testing virtual compilation with minimal example...");
  const result = await compileVirtual(files, "main.tsp", options);
  console.log("Result:", {
    success: result.success,
    diagnosticsCount: result.diagnostics.length,
    emittedCount: result.emitted.length
  });
  
  if (result.diagnostics.length > 0) {
    console.log("Diagnostics:");
    result.diagnostics.forEach(d => console.log(`  ${d.severity}: ${d.message}`));
  }
} catch (error) {
  console.error("Error:", error.message);
  console.error("Stack:", error.stack);
}