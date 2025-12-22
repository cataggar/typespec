import * as esbuild from "esbuild";
import { mkdir } from "fs/promises";
import { dirname } from "path";
import { fileURLToPath } from "url";

import { createNodeBuiltinsShimPlugin, nodeGlobalsBanner } from "@typespec/node-builtins-shim";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function bundle() {
  await mkdir(dirname(__dirname) + "/dist", { recursive: true });

  const result = await esbuild.build({
    entryPoints: [dirname(__dirname) + "/dist/wasm-entry.js"],
    bundle: true,
    platform: "neutral",
    target: "es2022",
    format: "esm",
    mainFields: ["module", "main"],
    banner: {
      js: nodeGlobalsBanner,
    },
    outfile: dirname(__dirname) + "/dist/bundle.js",
    plugins: [createNodeBuiltinsShimPlugin()],
    minify: false,
    sourcemap: true,
    metafile: true,
    treeShaking: true,
  });

  // Log bundle analysis
  if (result.metafile) {
    const text = await esbuild.analyzeMetafile(result.metafile, {
      verbose: true,
    });
    console.log(text);
  }

  console.log("✓ Bundle created at dist/bundle.js");
}

bundle().catch((err) => {
  console.error("Bundle failed:", err);
  process.exit(1);
});
