import {
  createSourceFile,
  getSourceFileKindFromExt,
  type CompilerHost,
  type LogSink,
  type RmOptions,
  type SourceFile,
} from "@typespec/compiler";

export interface VirtualFile {
  path: string;
  contents: string;
}

/**
 * Virtual filesystem host for in-memory compilation.
 * Maintains all files in memory and provides filesystem-like interface.
 */
export function createVirtualFsHost(files: VirtualFile[], logSink?: LogSink): CompilerHost {
  const virtualFs = new Map<string, string>();
  const outputFs = new Map<string, string>();

  // Normalize and populate virtual filesystem
  for (const file of files) {
    const normalizedPath = normalizePath(file.path);
    virtualFs.set(normalizedPath, file.contents);
  }

  // Add embedded standard library (minimal set) 
  const embeddedStdLib = getEmbeddedStdLib();
  for (const [path, content] of embeddedStdLib) {
    virtualFs.set(path, content);
  }

  // Add a basic package.json at root to satisfy project structure expectations
  virtualFs.set("/package.json", JSON.stringify({
    name: "wasm-project",
    version: "1.0.0",
    private: true
  }));

  // Add current working directory package.json if not present
  if (!virtualFs.has("./package.json") && !virtualFs.has("package.json")) {
    virtualFs.set("package.json", JSON.stringify({
      name: "wasm-project",
      version: "1.0.0",
      private: true
    }));
  }

  const wasiLogSink: LogSink = logSink || {
    log: (entry) => {
      console.log(`[${entry.level}] ${entry.message}`);
    },
  };

  return {
    // SystemHost implementation using virtual filesystem
    async readUrl(url: string): Promise<SourceFile> {
      throw new Error(`readUrl not supported in virtual filesystem: ${url}`);
    },

    async readFile(path: string): Promise<SourceFile> {
      const normalizedPath = normalizePath(path);
      const contents = virtualFs.get(normalizedPath);
      if (contents === undefined) {
        const e = new Error(`File ${path} not found.`);
        (e as any).code = "ENOENT";
        throw e;
      }
      return createSourceFile(contents, normalizedPath);
    },

    async writeFile(path: string, content: string): Promise<void> {
      const normalizedPath = normalizePath(path);
      outputFs.set(normalizedPath, content);
      // Also update virtual fs for subsequent reads
      virtualFs.set(normalizedPath, content);
    },

    async readDir(path: string): Promise<string[]> {
      const normalizedPath = normalizePath(path);
      const prefix = normalizedPath.endsWith("/") ? normalizedPath : normalizedPath + "/";
      const entries = new Set<string>();

      for (const filePath of virtualFs.keys()) {
        if (filePath.startsWith(prefix)) {
          const relativePath = filePath.substring(prefix.length);
          const nextSlash = relativePath.indexOf("/");
          const entryName = nextSlash === -1 ? relativePath : relativePath.substring(0, nextSlash);
          if (entryName) {
            entries.add(entryName);
          }
        }
      }

      return Array.from(entries).sort();
    },

    async rm(path: string, options?: RmOptions): Promise<void> {
      const normalizedPath = normalizePath(path);
      
      if (options?.recursive) {
        // Remove all files starting with the path
        const prefix = normalizedPath.endsWith("/") ? normalizedPath : normalizedPath + "/";
        const toDelete = Array.from(virtualFs.keys()).filter(p => 
          p === normalizedPath || p.startsWith(prefix)
        );
        toDelete.forEach(p => {
          virtualFs.delete(p);
          outputFs.delete(p);
        });
      } else {
        virtualFs.delete(normalizedPath);
        outputFs.delete(normalizedPath);
      }
    },

    async mkdirp(path: string): Promise<string | undefined> {
      // Virtual filesystem doesn't need explicit directory creation
      return normalizePath(path);
    },

    async stat(path: string): Promise<{ isDirectory(): boolean; isFile(): boolean }> {
      const normalizedPath = normalizePath(path);
      
      if (virtualFs.has(normalizedPath)) {
        return {
          isDirectory: () => false,
          isFile: () => true,
        };
      }

      // Check if it's a directory by seeing if any files start with this path
      const prefix = normalizedPath.endsWith("/") ? normalizedPath : normalizedPath + "/";
      const hasChildren = Array.from(virtualFs.keys()).some(p => p.startsWith(prefix));
      
      if (hasChildren) {
        return {
          isDirectory: () => true,
          isFile: () => false,
        };
      }

      throw new Error(`Path not found: ${path}`);
    },

    async realpath(path: string): Promise<string> {
      return normalizePath(path);
    },

    // CompilerHost specific methods
    getExecutionRoot(): string {
      return "/";
    },

    getLibDirs(): string[] {
      return ["/embedded/std"];
    },

    async getJsImport(path: string): Promise<Record<string, any>> {
      // JS imports are limited in virtual context
      throw new Error(`JS imports not supported in virtual context: ${path}`);
    },

    getSourceFileKind: getSourceFileKindFromExt,

    fileURLToPath(url: string): string {
      if (url.startsWith("file://")) {
        return url.substring(7);
      }
      return url;
    },

    pathToFileURL(path: string): string {
      return `file://${normalizePath(path)}`;
    },

    logSink: wasiLogSink,
  };

  // Helper to get emitted files from output filesystem
  function getEmittedFiles(): Array<{ path: string; contents: string }> {
    return Array.from(outputFs.entries()).map(([path, contents]) => ({
      path,
      contents,
    }));
  }

  // Extend the host with a method to retrieve emitted files
  (globalThis as any).__getEmittedFiles = getEmittedFiles;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

function getEmbeddedStdLib(): Map<string, string> {
  const stdLib = new Map<string, string>();
  
  // Minimal standard library content
  stdLib.set("/embedded/std/main.tsp", `
// TypeSpec Standard Library - Embedded Version
// This is a minimal version for WebAssembly component usage

namespace TypeSpec {
  /**
   * A string type
   */
  scalar string;

  /**
   * A numeric type
   */
  scalar numeric;

  /**
   * A boolean type
   */
  scalar boolean;

  /**
   * An integer type
   */
  scalar integer extends numeric;

  /**
   * A floating-point numeric type
   */
  scalar float extends numeric;
}
`);

  return stdLib;
}