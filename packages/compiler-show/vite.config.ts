import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    target: "esnext",
    minify: false,
    chunkSizeWarningLimit: 3000,
    lib: { entry: { index: "src/index.ts" }, formats: ["es"] },
    rollupOptions: { output: { manualChunks: undefined, entryFileNames: "[name].bundle.js" } },
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
  ],
  server: { fs: { strict: false } },
});
