// This script renames types-*.js to types.js in the dist directory after build.
import { readdirSync, renameSync } from "fs";
import { join } from "path";

const distDir = join(process.cwd(), "packages/playground/dist");
const files = readdirSync(distDir);
const typesFile = files.find((f) => /^types-.*\.js$/.test(f));
if (typesFile) {
  renameSync(join(distDir, typesFile), join(distDir, "types.js"));
  console.log(`Renamed ${typesFile} to types.js`);
} else {
  console.error("No types-*.js file found to rename.");
  process.exit(1);
}
