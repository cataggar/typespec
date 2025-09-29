import {
  createSourceFile,
  getSourceFileKindFromExt,
  type CompilerHost,
  type LogSink,
  type RmOptions,
  type SourceFile,
} from "@typespec/compiler";

/**
 * WASI-backed CompilerHost implementation.
 * Uses WASI syscalls for filesystem operations instead of Node.js APIs.
 */
export function createWasiHost(logSink?: LogSink): CompilerHost {
  // Note: In a real WASI environment, these would use WASI filesystem APIs
  // For now, we'll use stubs that throw clear errors if called without WASI context

  const wasiLogSink: LogSink = logSink || {
    log: (entry) => {
      console.log(`[${entry.level}] ${entry.message}`);
    },
  };

  return {
    // SystemHost implementation using WASI
    async readUrl(url: string): Promise<SourceFile> {
      throw new Error(`readUrl not supported in WASI context: ${url}`);
    },

    async readFile(path: string): Promise<SourceFile> {
      // In real WASI context, this would use WASI file read
      try {
        // This will be replaced by WASI fs operations when componentized
        if (typeof globalThis.__wasi_readFile === "function") {
          const content = await globalThis.__wasi_readFile(path);
          return createSourceFile(content, path);
        }
        throw new Error(`WASI readFile not available for: ${path}`);
      } catch (error: any) {
        const e = new Error(`File ${path} not found: ${error.message}`);
        (e as any).code = "ENOENT";
        throw e;
      }
    },

    async writeFile(path: string, content: string): Promise<void> {
      try {
        if (typeof globalThis.__wasi_writeFile === "function") {
          await globalThis.__wasi_writeFile(path, content);
          return;
        }
        throw new Error(`WASI writeFile not available for: ${path}`);
      } catch (error: any) {
        throw new Error(`Failed to write file ${path}: ${error.message}`);
      }
    },

    async readDir(path: string): Promise<string[]> {
      try {
        if (typeof globalThis.__wasi_readDir === "function") {
          return await globalThis.__wasi_readDir(path);
        }
        throw new Error(`WASI readDir not available for: ${path}`);
      } catch (error: any) {
        throw new Error(`Failed to read directory ${path}: ${error.message}`);
      }
    },

    async rm(path: string, options?: RmOptions): Promise<void> {
      try {
        if (typeof globalThis.__wasi_rm === "function") {
          await globalThis.__wasi_rm(path, options);
          return;
        }
        throw new Error(`WASI rm not available for: ${path}`);
      } catch (error: any) {
        throw new Error(`Failed to remove ${path}: ${error.message}`);
      }
    },

    async mkdirp(path: string): Promise<string | undefined> {
      try {
        if (typeof globalThis.__wasi_mkdirp === "function") {
          return await globalThis.__wasi_mkdirp(path);
        }
        throw new Error(`WASI mkdirp not available for: ${path}`);
      } catch (error: any) {
        throw new Error(`Failed to create directory ${path}: ${error.message}`);
      }
    },

    async stat(path: string): Promise<{ isDirectory(): boolean; isFile(): boolean }> {
      try {
        if (typeof globalThis.__wasi_stat === "function") {
          const stat = await globalThis.__wasi_stat(path);
          return {
            isDirectory: () => stat.type === "directory",
            isFile: () => stat.type === "file",
          };
        }
        throw new Error(`WASI stat not available for: ${path}`);
      } catch (error: any) {
        throw new Error(`Failed to stat ${path}: ${error.message}`);
      }
    },

    async realpath(path: string): Promise<string> {
      try {
        if (typeof globalThis.__wasi_realpath === "function") {
          return await globalThis.__wasi_realpath(path);
        }
        // Fallback: just normalize the path
        return path.replace(/\\/g, "/").replace(/\/+/g, "/");
      } catch (error: any) {
        // If realpath fails, return the original path
        return path;
      }
    },

    // CompilerHost specific methods
    getExecutionRoot(): string {
      return "/";
    },

    getLibDirs(): string[] {
      // Standard library will be embedded in the component
      return ["/embedded/std"];
    },

    async getJsImport(path: string): Promise<Record<string, any>> {
      // JS imports are not supported in WASI context by default
      throw new Error(`JS imports not supported in WASI context: ${path}`);
    },

    getSourceFileKind: getSourceFileKindFromExt,

    fileURLToPath(url: string): string {
      // Simple URL to path conversion for WASI
      if (url.startsWith("file://")) {
        return url.substring(7);
      }
      return url;
    },

    pathToFileURL(path: string): string {
      // Simple path to URL conversion for WASI
      return `file://${path}`;
    },

    logSink: wasiLogSink,
  };
}

// Type declarations for WASI functions that will be provided by the runtime
declare global {
  var __wasi_readFile: ((path: string) => Promise<string>) | undefined;
  var __wasi_writeFile: ((path: string, content: string) => Promise<void>) | undefined;
  var __wasi_readDir: ((path: string) => Promise<string[]>) | undefined;
  var __wasi_rm: ((path: string, options?: any) => Promise<void>) | undefined;
  var __wasi_mkdirp: ((path: string) => Promise<string>) | undefined;
  var __wasi_stat: ((path: string) => Promise<{ type: string }>) | undefined;
  var __wasi_realpath: ((path: string) => Promise<string>) | undefined;
}