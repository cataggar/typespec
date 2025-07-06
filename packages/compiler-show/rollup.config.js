// Plugin to log bundled sources per chunk (like Vite's logBundledSources)
const logBundledSources = () => ({
  name: "log-bundled-sources",
  renderChunk(code, chunk) {
    if (chunk && chunk.modules) {
      console.log(`\nChunk: ${chunk.fileName}`);
      console.log("Included source files:");
      for (const mod of Object.keys(chunk.modules)) {
        console.log(" -", mod);
      }
    }
    return null;
  },
});
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import nodeBuiltins from "rollup-plugin-node-builtins";

// Plugin to log input files
const logInputPlugin = () => ({
  name: "log-input",
  buildStart(options) {
    console.log("Rollup input files:", options.input);
  },
});

export default [
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.js",
      format: "es",
      exports: "named",
      sourcemap: true,
      inlineDynamicImports: true,
    },
    plugins: [
      logInputPlugin(),
      logBundledSources(),
      nodeBuiltins({ preferBuiltins: false }),
      resolve({
        browser: true,
        preferBuiltins: false,
        extensions: [".js", ".ts"],
        mainFields: ["browser", "module", "main"],
        exportConditions: ["browser", "default"],
      }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        exclude: ["vite.config.ts"],
      }),
      json(),
    ],
    // Do not mark built-ins as external; let the plugin error if referenced
    external: (id) => /@typespec\/compiler\/node-.*\.js$/.test(id),
  },
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.d.ts",
      format: "es",
    },
    plugins: [dts()],
  },
];
