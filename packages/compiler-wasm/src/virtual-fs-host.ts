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

  // Add essential package.json files that the compiler expects
  addPackageStructure();

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
      // Return the path to our embedded standard library
      return ["/node_modules/@typespec/compiler/lib/std"];
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

  // Helper to add required package structure
  function addPackageStructure() {
    // Add a basic package.json at root to satisfy project structure expectations
    virtualFs.set("/package.json", JSON.stringify({
      name: "wasm-project",
      version: "1.0.0",
      private: true,
      dependencies: {
        "@typespec/compiler": "^1.4.0"
      }
    }));

    // Add current working directory package.json if not present
    if (!virtualFs.has("./package.json") && !virtualFs.has("package.json")) {
      virtualFs.set("package.json", JSON.stringify({
        name: "wasm-project",
        version: "1.0.0",
        private: true,
        dependencies: {
          "@typespec/compiler": "^1.4.0"
        }
      }));
    }

    // Add TypeSpec compiler package.json in expected location
    virtualFs.set("/node_modules/@typespec/compiler/package.json", JSON.stringify({
      name: "@typespec/compiler",
      version: "1.4.0",
      main: "dist/src/index.js",
      type: "module",
      exports: {
        ".": {
          "types": "./dist/src/index.d.ts",
          "default": "./dist/src/index.js"
        }
      }
    }));

    // Add other expected directories and files
    virtualFs.set("/node_modules/@typespec/compiler/dist/src/index.js", "// Stub");
    
    // Make sure intrinsics is also available at the root lib level
    const embeddedStdLib = getEmbeddedStdLib();
    const intrinsics = embeddedStdLib.get("/node_modules/@typespec/compiler/lib/intrinsics.tsp");
    if (intrinsics) {
      virtualFs.set("/node_modules/@typespec/compiler/lib/intrinsics.tsp", intrinsics);
    }
  }

  // Extend the host with a method to retrieve emitted files
  (globalThis as any).__getEmittedFiles = getEmittedFiles;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

function getEmbeddedStdLib(): Map<string, string> {
  const stdLib = new Map<string, string>();
  
  // Main standard library file
  stdLib.set("/node_modules/@typespec/compiler/lib/std/main.tsp", `
// TypeSpec standard library. Everything in here can be omitted by using \`--nostdlib\` cli flag or \`nostdlib\` in the config.
import "./types.tsp";
import "./decorators.tsp";
import "./reflection.tsp";
import "./visibility.tsp";
`);

  // Types
  stdLib.set("/node_modules/@typespec/compiler/lib/std/types.tsp", `
namespace TypeSpec;

/**
 * Represent a URL string as described by https://url.spec.whatwg.org/
 */
scalar url extends string;

/**
 * Represents a collection of optional properties.
 *
 * @template Source An object whose spread properties are all optional.
 */
@doc("The template for adding optional properties.")
@withOptionalProperties
model OptionalProperties<Source> {
  ...Source;
}
`);

  // Minimal decorators
  stdLib.set("/node_modules/@typespec/compiler/lib/std/decorators.tsp", `
namespace TypeSpec;

/**
 * Specify that property is optional.
 */
extern dec optional(target: ModelProperty): void;

/**
 * Attach a documentation string.
 */
extern dec doc(target: unknown, doc: string): void;

/**
 * Mark this type as deprecated.
 */
extern dec deprecated(target: unknown, message: string): void;
`);

  // Minimal reflection
  stdLib.set("/node_modules/@typespec/compiler/lib/std/reflection.tsp", `
namespace TypeSpec.Reflection;

/**
 * Represents a model.
 */
model Model {
  name: string;
}
`);

  // Minimal visibility
  stdLib.set("/node_modules/@typespec/compiler/lib/std/visibility.tsp", `
namespace TypeSpec;

/**
 * Indicates that a property is only considered when serializing for the given visibilities.
 */
extern dec visibility(...visibilities: string[]): void;
`);

  // Core intrinsics
  stdLib.set("/node_modules/@typespec/compiler/lib/intrinsics.tsp", `
namespace TypeSpec {
  /**
   * The most primitive value.
   */
  @doc("A value, but not further specified.")
  scalar unknown;

  /**
   * Represents any type
   */
  @doc("Represents any type")
  scalar never;

  /**
   * A value that can be one of several different types.
   */
  @doc("A value that can be one of several different types.")
  scalar void;
  
  /**
   * A 8-bit string.
   */
  @doc("A sequence of textual characters.")
  scalar string;

  /**
   * A numeric type
   */
  @doc("A numeric type")
  scalar numeric;

  /**
   * A boolean value
   */
  @doc("A boolean value")
  scalar boolean;

  /**
   * A 32-bit integer.
   */
  @doc("A whole number.")
  scalar integer extends numeric;

  /**
   * A floating-point number.
   */
  @doc("A number with a fractional component")
  scalar float extends numeric;

  /**
   * A 64-bit floating point number.
   */
  @doc("A 64-bit floating point number.")
  scalar float64 extends float;

  /**
   * A 32-bit floating point number.
   */
  @doc("A 32-bit floating point number.")
  scalar float32 extends float;

  /**
   * A 8-bit integer.
   */
  @doc("A 8-bit integer")
  scalar int8 extends integer;

  /**
   * A 16-bit integer.
   */
  @doc("A 16-bit integer")
  scalar int16 extends integer;

  /**
   * A 32-bit integer.
   */
  @doc("A 32-bit integer")
  scalar int32 extends integer;

  /**
   * A 64-bit integer.
   */
  @doc("A 64-bit integer")
  scalar int64 extends integer;

  /**
   * An integer that can be serialized to JSON
   */
  @doc("An integer that can be serialized to JSON")
  scalar safeint extends integer;

  /**
   * A 8-bit unsigned integer.
   */
  @doc("A 8-bit unsigned integer")
  scalar uint8 extends integer;

  /**
   * A 16-bit unsigned integer.
   */
  @doc("A 16-bit unsigned integer")
  scalar uint16 extends integer;

  /**
   * A 32-bit unsigned integer.
   */
  @doc("A 32-bit unsigned integer")
  scalar uint32 extends integer;

  /**
   * A 64-bit unsigned integer.
   */
  @doc("A 64-bit unsigned integer")
  scalar uint64 extends integer;

  /**
   * A sequence of bytes.
   */
  @doc("A sequence of bytes")
  scalar bytes;

  /**
   * A date on a calendar without a time zone, e.g. "April 10th"
   */
  @doc("A date on a calendar without a time zone")
  scalar plainDate;

  /**
   * A time on a clock without a date and without a time zone, e.g. "3:00 am"
   */
  @doc("A time on a clock without a date and without a time zone")
  scalar plainTime;

  /**
   * A date and time in a particular time zone, e.g. "April 10th at 3:00am in PST"
   */
  @doc("A date and time in a particular time zone")
  scalar offsetDateTime;

  /**
   * A date and time without a time zone, e.g. "April 10th at 3:00am"
   */
  @doc("A date and time without a time zone")
  scalar utcDateTime;

  /**
   * A duration/time period. e.g 5s, 10h
   */
  @doc("A duration/time period")
  scalar duration;

  /**
   * A decimal number with any precision and scale
   */
  @doc("A decimal number with any precision and scale")
  scalar decimal extends numeric;

  /**
   * A 128-bit decimal number
   */
  @doc("A 128-bit decimal number")
  scalar decimal128 extends decimal;

  /**
   * Represents an array of items.
   */
  @doc("An array of items")
  model Array<T> {
    @doc("Array items")
    items: T[];
  }

  /**
   * Represents a record/object.
   */
  @doc("A record/object type")
  model Record<T> {
    @doc("Record properties")
    properties: T;
  }

  /**
   * Represents null
   */
  @doc("Represents a null value")
  scalar null;
}
`);

  return stdLib;
}