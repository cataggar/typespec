import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import checker from "vite-plugin-checker";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(resolve(__dirname, "package.json")).toString());
const dependencies = Object.keys(packageJson.dependencies);
const externals = [
  ...dependencies, // Remove the filter that excludes @typespec/compiler
  "swagger-ui-dist/swagger-ui-es-bundle.js",
  "swagger-ui-dist/swagger-ui.css",
  "@typespec/bundler/vite",
  "react-dom/client",
  "react/jsx-runtime",
  "vite",
  "@vitejs/plugin-react",
  "fs/promises",
];

export default defineConfig({
  build: {
    target: "esnext",
    minify: false,
    chunkSizeWarningLimit: 3000,
    emptyOutDir: false,
    lib: {
      entry: "src/types.ts",
      formats: ["es"],
      fileName: () => "types.js",
    },
    rollupOptions: {
      external: (id) => externals.some((x) => id.startsWith(x)),
      output: {
        entryFileNames: "types.js",
        inlineDynamicImports: true,
        manualChunks: undefined,
        preserveModules: false,
        format: "es",
      },
    },
  },
  esbuild: {
    logOverride: { "this-is-undefined-in-esm": "silent" },
  },
  plugins: [
    react({}),
    dts({
      logLevel: "silent",
    }),
    checker({ typescript: true }),
  ],
});
