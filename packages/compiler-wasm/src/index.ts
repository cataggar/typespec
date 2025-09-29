import { compile, type CompilerOptions, type Diagnostic } from "@typespec/compiler";
import { createVirtualFsHost, type VirtualFile } from "./virtual-fs-host.js";
import { createWasiHost } from "./host-wasi.js";

// WIT interface types
export interface SourceFile {
  path: string;
  contents: string;
}

export interface CompileOptions {
  emitters: string[];
  outputDir: string;
  arguments: string[];
}

export interface DiagnosticInfo {
  code: string;
  message: string;
  severity: string;
  file: string;
  start: number;
  end: number;
}

export interface EmittedFile {
  path: string;
  contents: string;
}

export interface CompileResult {
  success: boolean;
  diagnostics: DiagnosticInfo[];
  emitted: EmittedFile[];
}

/**
 * Compile TypeSpec from in-memory sources (virtual filesystem)
 */
export async function compileVirtual(
  files: SourceFile[],
  entry: string,
  options: CompileOptions
): Promise<CompileResult> {
  try {
    const virtualFiles: VirtualFile[] = files.map(f => ({
      path: normalizePath(f.path),
      contents: f.contents,
    }));

    const host = createVirtualFsHost(virtualFiles);
    const compilerOptions = buildCompilerOptions(options);
    
    // Find the entry file
    const entryPath = normalizePath(entry);
    const entryFile = virtualFiles.find(f => normalizePath(f.path) === entryPath);
    if (!entryFile) {
      return {
        success: false,
        diagnostics: [{
          code: "entry-not-found",
          message: `Entry file not found: ${entry}`,
          severity: "error",
          file: entry,
          start: 0,
          end: 0,
        }],
        emitted: [],
      };
    }

    const program = await compile(host, entryPath, compilerOptions);
    
    const diagnostics = formatDiagnostics(program.diagnostics);
    const success = !program.hasError();
    
    // Get emitted files from the virtual filesystem
    const emitted = getEmittedFiles();

    return {
      success,
      diagnostics,
      emitted,
    };
  } catch (error: any) {
    return {
      success: false,
      diagnostics: [{
        code: "internal-error",
        message: `Internal error: ${error.message}`,
        severity: "error",
        file: entry,
        start: 0,
        end: 0,
      }],
      emitted: [],
    };
  }
}

/**
 * Compile TypeSpec from filesystem root (WASI filesystem)
 */
export async function compileRoot(
  rootPath: string,
  entry: string,
  options: CompileOptions
): Promise<CompileResult> {
  try {
    const host = createWasiHost();
    const compilerOptions = buildCompilerOptions(options);
    
    // Construct full entry path
    const entryPath = joinPaths(normalizePath(rootPath), normalizePath(entry));
    
    const program = await compile(host, entryPath, compilerOptions);
    
    const diagnostics = formatDiagnostics(program.diagnostics);
    const success = !program.hasError();
    
    // For root compilation, we need to collect emitted files from the output directory
    const emitted = await collectEmittedFiles(host, options.outputDir);

    return {
      success,
      diagnostics,
      emitted,
    };
  } catch (error: any) {
    return {
      success: false,
      diagnostics: [{
        code: "internal-error",
        message: `Internal error: ${error.message}`,
        severity: "error",
        file: entry,
        start: 0,
        end: 0,
      }],
      emitted: [],
    };
  }
}

function buildCompilerOptions(options: CompileOptions): CompilerOptions {
  const compilerOptions: CompilerOptions = {
    outputDir: options.outputDir,
  };

  // Parse emitters
  if (options.emitters.length > 0) {
    compilerOptions.emit = options.emitters;
  }

  // Parse additional arguments
  for (const arg of options.arguments) {
    if (arg.startsWith("--output-dir=")) {
      compilerOptions.outputDir = arg.substring("--output-dir=".length);
    }
    // Add more argument parsing as needed
  }

  return compilerOptions;
}

function formatDiagnostics(diagnostics: readonly Diagnostic[]): DiagnosticInfo[] {
  return diagnostics.map(d => ({
    code: d.code || "unknown",
    message: d.message,
    severity: d.severity,
    file: d.target?.file?.path || "",
    start: d.target?.pos || 0,
    end: d.target?.end || 0,
  }));
}

function getEmittedFiles(): EmittedFile[] {
  // This function is set by the virtual filesystem host
  const getEmitted = (globalThis as any).__getEmittedFiles;
  if (typeof getEmitted === "function") {
    return getEmitted();
  }
  return [];
}

async function collectEmittedFiles(host: any, outputDir: string): Promise<EmittedFile[]> {
  try {
    const files: EmittedFile[] = [];
    
    // Recursively collect files from output directory
    async function collectDir(dir: string, basePath: string = ""): Promise<void> {
      try {
        const entries = await host.readDir(dir);
        for (const entry of entries) {
          const fullPath = joinPaths(dir, entry);
          const relativePath = basePath ? joinPaths(basePath, entry) : entry;
          
          const stat = await host.stat(fullPath);
          if (stat.isFile()) {
            const file = await host.readFile(fullPath);
            files.push({
              path: relativePath,
              contents: file.text,
            });
          } else if (stat.isDirectory()) {
            await collectDir(fullPath, relativePath);
          }
        }
      } catch {
        // Ignore errors when collecting files
      }
    }
    
    if (outputDir) {
      await collectDir(outputDir);
    }
    
    return files;
  } catch {
    return [];
  }
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

function joinPaths(...paths: string[]): string {
  return paths
    .filter(p => p)
    .map(p => normalizePath(p))
    .join("/")
    .replace(/\/+/g, "/");
}

// Export for WIT world
export { compileVirtual as "compile-virtual", compileRoot as "compile-root" };