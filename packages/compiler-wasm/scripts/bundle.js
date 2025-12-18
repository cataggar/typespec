import * as esbuild from "esbuild";
import { mkdir } from "fs/promises";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function bundle() {
  await mkdir(dirname(__dirname) + "/dist", { recursive: true });

  const result = await esbuild.build({
    entryPoints: [dirname(__dirname) + "/dist/index.js"],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "esm",
    outfile: dirname(__dirname) + "/dist/bundle.js",
    external: [
      // Mark Node.js built-ins as external - they should not be bundled
      "fs",
      "fs/promises",
      "path",
      "url",
      "crypto",
      "stream",
      "util",
      "os",
      "events",
      "buffer",
      "module",
      "assert",
      "child_process",
      "worker_threads",
      "perf_hooks",
    ],
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
