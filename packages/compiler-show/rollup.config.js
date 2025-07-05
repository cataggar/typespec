import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import nodeBuiltins from "rollup-plugin-node-builtins";

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
      nodeBuiltins({ preferBuiltins: false }),
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        exclude: ["vite.config.ts"],
      }),
      json(),
    ],
    // Do not mark built-ins as external; let the plugin error if referenced
    external: (id) =>
      /@typespec\/compiler\/node-.*\.js$/.test(id) ||
      /src\/core\/node-system-host\.js$/.test(id) ||
      /src\/testing\//.test(id) ||
      /test\//.test(id),
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
