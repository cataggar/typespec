import { typespecBundlePlugin } from "@typespec/bundler/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: ["es2022", "edge89", "firefox89", "chrome89", "safari15"],
    lib: {
      entry: "packages/playground/src/index.ts",
      formats: ["es"],
      fileName: "storybook-bundle3",
    },
  },
  plugins: [
    react({}),
    typespecBundlePlugin({ folderName: "libs", libraries: ["@typespec/compiler"] }),
  ],
});
