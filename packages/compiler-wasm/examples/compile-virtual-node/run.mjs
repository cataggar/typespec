import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compileVirtual } from "../../dist/index.js";

async function collectTspFiles(absDir) {
  /** @type {{ virtualPath: string; contents: string }[]} */
  const out = [];

  /** @param {string} current */
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(absPath);
      } else if (entry.isFile() && entry.name.endsWith(".tsp")) {
        const rel = path.relative(absDir, absPath).split(path.sep).join("/");
        const virtualPath = `/lib/${rel}`;
        const contents = await readFile(absPath, "utf8");
        out.push({ virtualPath, contents });
      }
    }
  }

  await walk(absDir);
  return out;
}

async function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(here, "../../../../");
  const compilerLibDir = path.join(repoRoot, "packages", "compiler", "lib");

  const stdlibFiles = await collectTspFiles(compilerLibDir);

  const files = [
    ...stdlibFiles.map((f) => ({ path: f.virtualPath, contents: f.contents })),
    {
      path: "/main.tsp",
      contents: "namespace MyService { op test(): void; }\n",
    },
  ];

  const program = await compileVirtual(files, "/main.tsp", {
    emitters: [],
    outputDir: "/output",
    arguments: [],
  });

  // eslint-disable-next-line no-console
  console.log(`success: ${program.isSuccess()}`);
  // eslint-disable-next-line no-console
  console.log(`diagnostics: ${program.getDiagnostics().length}`);

  for (const d of program.getDiagnostics().slice(0, 20)) {
    const loc = d.file ? `${d.file}:${d.start}-${d.end}` : "";
    // eslint-disable-next-line no-console
    console.log(`${d.severity} ${d.code} ${loc}`);
    // eslint-disable-next-line no-console
    console.log(`  ${d.message}`);
  }

  if (!program.isSuccess()) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});
