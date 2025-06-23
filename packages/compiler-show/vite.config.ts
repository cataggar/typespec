import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import dts from "vite-plugin-dts";

function logBundledFiles() {
  return {
    name: "log-bundled-files",
    generateBundle(options: any, bundle: any) {
      console.log("Bundled files:");
      for (const fileName of Object.keys(bundle)) {
        console.log(" -", fileName);
      }
    },
  };
}

function logInputFiles() {
  return {
    name: "log-input-files",
    buildStart() {
      console.log("Build started. Input .ts files:");
    },
    transform(code: any, id: string) {
      if (id.endsWith(".ts")) {
        console.log(" -", id);
      }
      return null;
    },
  };
}

function logBundledSources() {
  return {
    name: "log-bundled-sources",
    renderChunk(code: any, chunk: any, options: any) {
      if (chunk && chunk.modules) {
        console.log(`\nChunk: ${chunk.fileName}`);
        console.log("Included source files:");
        for (const mod of Object.keys(chunk.modules)) {
          console.log(" -", mod);
        }
      }
      return null;
    },
  };
}

export default defineConfig({
  build: {
    target: "esnext",
    minify: false,
    chunkSizeWarningLimit: 3000,
    lib: { entry: { index: "src/index.ts" }, formats: ["es"] },
    rollupOptions: {
      output: { manualChunks: undefined, entryFileNames: "[name].bundle.js" },
      external: (id) =>
        ["@sindresorhus/merge-streams", "unicorn-magic", "url", "fs", "path"].includes(id) ||
        /@typespec\/compiler\/node-.*\.js$/.test(id),
    },
  },
  optimizeDeps: {},
  plugins: [
    dts({
      logLevel: "silent", // checker reports the errors
    }),
    checker({
      // e.g. use TypeScript check
      typescript: true,
    }),
    logBundledFiles(),
    logBundledSources(),
    logInputFiles(),
  ],
  server: { fs: { strict: false } },
});
