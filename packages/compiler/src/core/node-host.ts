import { mkdir, stat } from "fs/promises";
import { findProjectRoot } from "../utils/io.js";
import { createConsoleSink } from "./logger/index.js";
import { NodeSystemHost } from "./node-system-host.js";
import { joinPaths } from "./path-utils.js";
import { getSourceFileKindFromExt } from "./source-file.js";
import { getSystemUrl } from "./system-url.js";
import { CompilerHost } from "./types.js";

let _compilerPackageRoot: string | undefined;
async function getCompilerPackageRoot(): Promise<string> {
  if (_compilerPackageRoot === undefined) {
    _compilerPackageRoot = (await findProjectRoot(
      stat,
      getSystemUrl().fileURLToPath(import.meta.url),
    ))!;
  }
  return _compilerPackageRoot;
}

/**
 * Implementation of the @see CompilerHost using the real file system.
 * This is the the CompilerHost used by TypeSpec CLI.
 */
export const NodeHost: CompilerHost = {
  ...NodeSystemHost,
  getExecutionRoot: async () => {
    return getCompilerPackageRoot();
  },
  getJsImport: (path: string) => import(getSystemUrl().pathToFileURL(path).href),
  async getLibDirs() {
    const rootDir = await this.getExecutionRoot();
    return [joinPaths(rootDir, "lib/std")];
  },
  getSourceFileKind: getSourceFileKindFromExt,
  mkdirp: (path: string) => mkdir(path, { recursive: true }),
  logSink: createConsoleSink(),
  fileURLToPath: (url: string) => getSystemUrl().fileURLToPath(url),
  pathToFileURL(path: string) {
    return getSystemUrl().pathToFileURL(path).href;
  },
};
