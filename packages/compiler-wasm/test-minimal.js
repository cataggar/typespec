// Simple test of the minimal ESM bundle before componentization
import { compileVirtual } from "./dist/minimal.js";

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
  arguments: []
};

try {
  console.log("Testing minimal virtual compilation...");
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
  
  if (result.emitted.length > 0) {
    console.log("Emitted files:");
    result.emitted.forEach(f => console.log(`  ${f.path}: ${f.contents.length} chars`));
  }
} catch (error) {
  console.error("Error:", error.message);
}