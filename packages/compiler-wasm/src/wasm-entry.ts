import type { CompilerOptions, Diagnostic } from "@typespec/compiler";
import { parse } from "../../compiler/dist/src/core/parser.js";
import { compile } from "../../compiler/dist/src/core/program.js";
import { SyntaxKind } from "../../compiler/dist/src/core/types.js";
import { createVirtualFsHost, VirtualFile } from "./virtual-fs-host.js";

// WIT types mapping
export interface SourceFile {
  path: string;
  contents: string;
}

export interface CompileOptions {
  emitters: string[];
  outputDir: string;
  arguments: Array<[string, string]>;
}

export enum Severity {
  Error = "error",
  Warning = "warning",
  Info = "info",
}

export interface DiagnosticOutput {
  code: string;
  message: string;
  severity: Severity;
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
  diagnostics: DiagnosticOutput[];
  emitted: EmittedFile[];
}

export interface InterfaceListResult {
  interfaces: string[];
  diagnostics: DiagnosticOutput[];
}

export interface InterfaceInfo {
  name: string;
  operations: string[];
}

export interface InterfaceDetailsResult {
  interfaces: InterfaceInfo[];
  diagnostics: DiagnosticOutput[];
}

export enum ParameterLocation {
  Query = "query",
  Path = "path",
  Header = "header",
  Body = "body",
}

export interface OperationParameter {
  name: string;
  location: ParameterLocation;
  paramType: string;
  optional: boolean;
}

export enum HttpMethod {
  Get = "get",
  Post = "post",
  Put = "put",
  Patch = "patch",
  Delete = "delete",
  Head = "head",
  Options = "options",
  Trace = "trace",
}

export interface OperationResponse {
  statusCode: string;
  bodyType: string;
  headers: OperationParameter[];
}

export interface OperationDetails {
  name: string;
  httpMethod?: HttpMethod;
  parameters: OperationParameter[];
  body?: OperationParameter;
  responses: OperationResponse[];
}

export interface InterfaceWithOperations {
  name: string;
  operations: OperationDetails[];
}

export interface InterfaceOperationsResult {
  interfaces: InterfaceWithOperations[];
  diagnostics: DiagnosticOutput[];
}

/**
 * Compile TypeSpec from in-memory source files.
 */
export async function compileVirtual(
  files: SourceFile[],
  entry: string,
  options: CompileOptions,
): Promise<CompileResult> {
  try {
    const virtualFiles: VirtualFile[] = files.map((f) => ({
      path: f.path,
      contents: f.contents,
    }));

    const host = createVirtualFsHost(virtualFiles, []);

    const compilerOptions: CompilerOptions = {
      outputDir: options.outputDir,
      emit: options.emitters,
      options: {},
    };

    for (const [key, value] of options.arguments) {
      if (key.startsWith("emitter-option-")) {
        const parts = key.substring("emitter-option-".length).split(".");
        const emitterName = parts[0];
        compilerOptions.options ??= {};
        compilerOptions.options[emitterName] ??= {};
        if (parts.length > 1) {
          compilerOptions.options[emitterName][parts[1]] = value;
        }
      } else {
        (compilerOptions as any)[key] = value;
      }
    }

    const program = await compile(host as any, entry, compilerOptions as any);

    return {
      success: !program.hasError(),
      diagnostics: convertDiagnostics(program.diagnostics),
      emitted: [],
    };
  } catch (error) {
    return {
      success: false,
      diagnostics: [
        {
          code: "internal-compiler-error",
          message: error instanceof Error ? error.message : String(error),
          severity: Severity.Error,
          file: entry,
          start: 0,
          end: 0,
        },
      ],
      emitted: [],
    };
  }
}

/**
 * Compile TypeSpec from a filesystem root.
 */
export async function compileRoot(
  rootPath: string,
  entry: string,
  options: CompileOptions,
): Promise<CompileResult> {
  void rootPath;
  void options;

  return {
    success: false,
    diagnostics: [
      {
        code: "not-implemented",
        message: "compile-root not yet implemented - requires WASI host",
        severity: Severity.Error,
        file: entry,
        start: 0,
        end: 0,
      },
    ],
    emitted: [],
  };
}

/**
 * List interface declarations by parsing TypeSpec files from an in-memory source set.
 *
 * This uses the TypeSpec parser AST and follows relative imports ("./" and "../") as long as
 * the imported files are present in the virtual file set.
 */
export async function listInterfacesVirtual(
  files: SourceFile[],
  entry: string,
): Promise<InterfaceListResult> {
  const virtualFiles: VirtualFile[] = files.map((f) => ({
    path: f.path,
    contents: f.contents,
  }));

  const host = createVirtualFsHost(virtualFiles, []);

  const diagnostics: DiagnosticOutput[] = [];
  const interfaces = new Set<string>();
  const visitedFiles = new Set<string>();

  const normalize = (p: string) => p.replace(/\\/g, "/");

  const dirname = (p: string) => {
    const n = normalize(p);
    const idx = n.lastIndexOf("/");
    if (idx === -1) return ".";
    if (idx === 0) return "/";
    return n.slice(0, idx);
  };

  const joinAndNormalize = (baseDir: string, rel: string) => {
    const base = normalize(baseDir);
    const joined = (base.endsWith("/") ? base : base + "/") + rel;
    const isAbs = joined.startsWith("/");
    const parts = joined.split("/").filter((x) => x !== "" && x !== ".");
    const out: string[] = [];
    for (const part of parts) {
      if (part === "..") {
        if (out.length > 0) out.pop();
      } else {
        out.push(part);
      }
    }
    return (isAbs ? "/" : "") + out.join("/");
  };

  function reportError(code: string, message: string, file: string) {
    diagnostics.push({
      code,
      message,
      severity: Severity.Error,
      file,
      start: 0,
      end: 0,
    });
  }

  function qualifyName(namespace: string[], name: string): string {
    return namespace.length === 0 ? name : `${namespace.join(".")}.${name}`;
  }

  function collectFromStatement(stmt: any, namespace: string[], imports: string[]) {
    if (!stmt || typeof stmt !== "object") return;

    switch (stmt.kind) {
      case SyntaxKind.InterfaceStatement: {
        const name = stmt.id?.sv;
        if (typeof name === "string" && name.length > 0) {
          interfaces.add(qualifyName(namespace, name));
        }
        return;
      }
      case SyntaxKind.NamespaceStatement: {
        const ns = stmt.id?.sv;
        const nextNs = typeof ns === "string" && ns.length > 0 ? [...namespace, ns] : namespace;

        const inner = stmt.statements;
        if (Array.isArray(inner)) {
          for (const s of inner) {
            collectFromStatement(s, nextNs, imports);
          }
        } else if (inner && typeof inner === "object") {
          // `namespace A.B {}` parses into nested NamespaceStatements.
          collectFromStatement(inner, nextNs, imports);
        }
        return;
      }
      case SyntaxKind.ImportStatement: {
        const spec = stmt.path?.value;
        if (typeof spec === "string") {
          imports.push(spec);
        }
        return;
      }
      default:
        return;
    }
  }

  async function visitFile(filePath: string) {
    const normalizedPath = normalize(filePath);
    if (visitedFiles.has(normalizedPath)) return;
    visitedFiles.add(normalizedPath);

    let source: any;
    try {
      source = await host.readFile(normalizedPath);
    } catch (e) {
      reportError("file-not-found", e instanceof Error ? e.message : String(e), normalizedPath);
      return;
    }

    let ast: any;
    try {
      ast = parse(source);
    } catch (e) {
      reportError("parse-failed", e instanceof Error ? e.message : String(e), normalizedPath);
      return;
    }

    const imports: string[] = [];

    if (Array.isArray(ast?.statements)) {
      for (const stmt of ast.statements) {
        collectFromStatement(stmt, [], imports);
      }
    }

    const baseDir = dirname(normalizedPath);
    for (const specifier of imports) {
      if (specifier.startsWith("./") || specifier.startsWith("../")) {
        const resolved = joinAndNormalize(baseDir, specifier);
        await visitFile(resolved);
      }
    }
  }

  await visitFile(entry);

  return {
    interfaces: [...interfaces].sort(),
    diagnostics,
  };
}

/**
 * List interface declarations (with operation names) by parsing TypeSpec files from an in-memory
 * source set.
 *
 * This uses the TypeSpec parser AST and follows relative imports ("./" and "../") as long as
 * the imported files are present in the virtual file set.
 */
export async function listInterfacesDetailsVirtual(
  files: SourceFile[],
  entry: string,
): Promise<InterfaceDetailsResult> {
  const virtualFiles: VirtualFile[] = files.map((f) => ({
    path: f.path,
    contents: f.contents,
  }));

  const host = createVirtualFsHost(virtualFiles, []);

  const diagnostics: DiagnosticOutput[] = [];
  const interfaceMap = new Map<string, Set<string>>();
  const visitedFiles = new Set<string>();

  const normalize = (p: string) => p.replace(/\\/g, "/");

  const dirname = (p: string) => {
    const n = normalize(p);
    const idx = n.lastIndexOf("/");
    if (idx === -1) return ".";
    if (idx === 0) return "/";
    return n.slice(0, idx);
  };

  const joinAndNormalize = (baseDir: string, rel: string) => {
    const base = normalize(baseDir);
    const joined = (base.endsWith("/") ? base : base + "/") + rel;
    const isAbs = joined.startsWith("/");
    const parts = joined.split("/").filter((x) => x !== "" && x !== ".");
    const out: string[] = [];
    for (const part of parts) {
      if (part === "..") {
        if (out.length > 0) out.pop();
      } else {
        out.push(part);
      }
    }
    return (isAbs ? "/" : "") + out.join("/");
  };

  function reportError(code: string, message: string, file: string) {
    diagnostics.push({
      code,
      message,
      severity: Severity.Error,
      file,
      start: 0,
      end: 0,
    });
  }

  function qualifyName(namespace: string[], name: string): string {
    return namespace.length === 0 ? name : `${namespace.join(".")}.${name}`;
  }

  function addInterfaceOperation(ifaceName: string, opName: string) {
    let ops = interfaceMap.get(ifaceName);
    if (!ops) {
      ops = new Set<string>();
      interfaceMap.set(ifaceName, ops);
    }
    ops.add(opName);
  }

  function ensureInterface(ifaceName: string) {
    if (!interfaceMap.has(ifaceName)) {
      interfaceMap.set(ifaceName, new Set<string>());
    }
  }

  function collectFromStatement(stmt: any, namespace: string[], imports: string[]) {
    if (!stmt || typeof stmt !== "object") return;

    switch (stmt.kind) {
      case SyntaxKind.InterfaceStatement: {
        const name = stmt.id?.sv;
        if (typeof name === "string" && name.length > 0) {
          const qualifiedName = qualifyName(namespace, name);
          ensureInterface(qualifiedName);

          const ops: any[] = Array.isArray(stmt.operations) ? stmt.operations : [];
          for (const op of ops) {
            const opName = op?.id?.sv;
            if (typeof opName === "string" && opName.length > 0) {
              addInterfaceOperation(qualifiedName, opName);
            }
          }
        }
        return;
      }
      case SyntaxKind.NamespaceStatement: {
        const ns = stmt.id?.sv;
        const nextNs = typeof ns === "string" && ns.length > 0 ? [...namespace, ns] : namespace;

        const inner = stmt.statements;
        if (Array.isArray(inner)) {
          for (const s of inner) {
            collectFromStatement(s, nextNs, imports);
          }
        } else if (inner && typeof inner === "object") {
          // `namespace A.B {}` parses into nested NamespaceStatements.
          collectFromStatement(inner, nextNs, imports);
        }
        return;
      }
      case SyntaxKind.ImportStatement: {
        const spec = stmt.path?.value;
        if (typeof spec === "string") {
          imports.push(spec);
        }
        return;
      }
      default:
        return;
    }
  }

  async function visitFile(filePath: string) {
    const normalizedPath = normalize(filePath);
    if (visitedFiles.has(normalizedPath)) return;
    visitedFiles.add(normalizedPath);

    let source: any;
    try {
      source = await host.readFile(normalizedPath);
    } catch (e) {
      reportError("file-not-found", e instanceof Error ? e.message : String(e), normalizedPath);
      return;
    }

    let ast: any;
    try {
      ast = parse(source);
    } catch (e) {
      reportError("parse-failed", e instanceof Error ? e.message : String(e), normalizedPath);
      return;
    }

    const imports: string[] = [];
    if (Array.isArray(ast?.statements)) {
      for (const stmt of ast.statements) {
        collectFromStatement(stmt, [], imports);
      }
    }

    const baseDir = dirname(normalizedPath);
    for (const specifier of imports) {
      if (specifier.startsWith("./") || specifier.startsWith("../")) {
        const resolved = joinAndNormalize(baseDir, specifier);
        await visitFile(resolved);
      }
    }
  }

  await visitFile(entry);

  const interfaces: InterfaceInfo[] = [...interfaceMap.entries()]
    .map(([name, operations]) => ({
      name,
      operations: [...operations].sort(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    interfaces,
    diagnostics,
  };
}

/**
 * List interface declarations with full operation details by parsing TypeSpec files from an
 * in-memory source set.
 *
 * This extracts operation parameters, HTTP methods, body information, and responses from decorators.
 */
export async function listInterfacesOperationsVirtual(
  files: SourceFile[],
  entry: string,
): Promise<InterfaceOperationsResult> {
  const virtualFiles: VirtualFile[] = files.map((f) => ({
    path: f.path,
    contents: f.contents,
  }));

  const host = createVirtualFsHost(virtualFiles, []);

  const diagnostics: DiagnosticOutput[] = [];
  const interfaceMap = new Map<string, OperationDetails[]>();
  const visitedFiles = new Set<string>();

  const normalize = (p: string) => p.replace(/\\/g, "/");

  const dirname = (p: string) => {
    const n = normalize(p);
    const idx = n.lastIndexOf("/");
    if (idx === -1) return ".";
    if (idx === 0) return "/";
    return n.slice(0, idx);
  };

  const joinAndNormalize = (baseDir: string, rel: string) => {
    const base = normalize(baseDir);
    const joined = (base.endsWith("/") ? base : base + "/") + rel;
    const isAbs = joined.startsWith("/");
    const parts = joined.split("/").filter((x) => x !== "" && x !== ".");
    const out: string[] = [];
    for (const part of parts) {
      if (part === "..") {
        if (out.length > 0) out.pop();
      } else {
        out.push(part);
      }
    }
    return (isAbs ? "/" : "") + out.join("/");
  };

  function reportError(code: string, message: string, file: string) {
    diagnostics.push({
      code,
      message,
      severity: Severity.Error,
      file,
      start: 0,
      end: 0,
    });
  }

  function qualifyName(namespace: string[], name: string): string {
    return namespace.length === 0 ? name : `${namespace.join(".")}.${name}`;
  }

  function ensureInterface(ifaceName: string) {
    if (!interfaceMap.has(ifaceName)) {
      interfaceMap.set(ifaceName, []);
    }
  }

  function typeToString(typeExpr: any): string {
    if (!typeExpr || typeof typeExpr !== "object") return "unknown";

    switch (typeExpr.kind) {
      case SyntaxKind.TypeReference:
        return typeExpr.target?.sv || "unknown";
      case SyntaxKind.ArrayExpression:
        return `${typeToString(typeExpr.elementType)}[]`;
      case SyntaxKind.ModelExpression:
        return "{ ... }";
      case SyntaxKind.StringLiteral:
        return `"${typeExpr.value}"`;
      case SyntaxKind.NumericLiteral:
        return String(typeExpr.value);
      default:
        return "unknown";
    }
  }

  function extractHttpMethod(decorators: readonly any[]): HttpMethod | undefined {
    for (const dec of decorators) {
      if (dec.kind !== SyntaxKind.DecoratorExpression) continue;
      
      const target = dec.target;
      let decoratorName = "";
      
      if (target?.kind === SyntaxKind.Identifier) {
        decoratorName = target.sv;
      } else if (target?.kind === SyntaxKind.MemberExpression) {
        decoratorName = target.id?.sv || "";
      }

      switch (decoratorName.toLowerCase()) {
        case "get": return HttpMethod.Get;
        case "post": return HttpMethod.Post;
        case "put": return HttpMethod.Put;
        case "patch": return HttpMethod.Patch;
        case "delete": return HttpMethod.Delete;
        case "head": return HttpMethod.Head;
        case "options": return HttpMethod.Options;
        case "trace": return HttpMethod.Trace;
      }
    }
    return undefined;
  }

  function extractParameterLocation(decorators: readonly any[]): ParameterLocation | undefined {
    for (const dec of decorators) {
      if (dec.kind !== SyntaxKind.DecoratorExpression) continue;
      
      const target = dec.target;
      let decoratorName = "";
      
      if (target?.kind === SyntaxKind.Identifier) {
        decoratorName = target.sv;
      } else if (target?.kind === SyntaxKind.MemberExpression) {
        decoratorName = target.id?.sv || "";
      }

      switch (decoratorName.toLowerCase()) {
        case "query": return ParameterLocation.Query;
        case "path": return ParameterLocation.Path;
        case "header": return ParameterLocation.Header;
        case "body": return ParameterLocation.Body;
      }
    }
    return undefined;
  }

  function extractOperationDetails(opNode: any): OperationDetails {
    const opName = opNode.id?.sv || "unknown";
    const httpMethod = extractHttpMethod(opNode.decorators || []);
    const parameters: OperationParameter[] = [];
    let body: OperationParameter | undefined;
    const responses: OperationResponse[] = [];

    // Extract parameters from operation signature
    if (
      opNode.signature?.kind === SyntaxKind.OperationSignatureDeclaration &&
      opNode.signature.parameters?.kind === SyntaxKind.ModelExpression
    ) {
      const props = opNode.signature.parameters.properties || [];
      for (const prop of props) {
        if (prop.kind !== SyntaxKind.ModelProperty) continue;

        const paramName = prop.id?.sv || "unknown";
        const paramType = typeToString(prop.value);
        const optional = prop.optional || false;
        const location = extractParameterLocation(prop.decorators || []);

        if (location === ParameterLocation.Body) {
          body = {
            name: paramName,
            location: ParameterLocation.Body,
            paramType,
            optional,
          };
        } else if (location) {
          parameters.push({
            name: paramName,
            location,
            paramType,
            optional,
          });
        } else {
          // Default to query if no location specified
          parameters.push({
            name: paramName,
            location: ParameterLocation.Query,
            paramType,
            optional,
          });
        }
      }
    }

    // Extract response information from return type
    if (
      opNode.signature?.kind === SyntaxKind.OperationSignatureDeclaration &&
      opNode.signature.returnType
    ) {
      const returnType = opNode.signature.returnType;
      
      if (returnType.kind === SyntaxKind.ModelExpression) {
        const responseHeaders: OperationParameter[] = [];
        let responseBody = "";
        
        const props = returnType.properties || [];
        for (const prop of props) {
          if (prop.kind !== SyntaxKind.ModelProperty) continue;

          const propName = prop.id?.sv || "unknown";
          const propType = typeToString(prop.value);
          const location = extractParameterLocation(prop.decorators || []);

          if (location === ParameterLocation.Header) {
            responseHeaders.push({
              name: propName,
              location: ParameterLocation.Header,
              paramType: propType,
              optional: prop.optional || false,
            });
          } else if (location === ParameterLocation.Body) {
            responseBody = propType;
          }
        }

        responses.push({
          statusCode: "200",
          bodyType: responseBody,
          headers: responseHeaders,
        });
      } else {
        // Simple return type
        responses.push({
          statusCode: "200",
          bodyType: typeToString(returnType),
          headers: [],
        });
      }
    }

    return {
      name: opName,
      httpMethod,
      parameters,
      body,
      responses,
    };
  }

  function collectFromStatement(stmt: any, namespace: string[], imports: string[]) {
    if (!stmt || typeof stmt !== "object") return;

    switch (stmt.kind) {
      case SyntaxKind.InterfaceStatement: {
        const name = stmt.id?.sv;
        if (typeof name === "string" && name.length > 0) {
          const qualifiedName = qualifyName(namespace, name);
          ensureInterface(qualifiedName);

          const ops: any[] = Array.isArray(stmt.operations) ? stmt.operations : [];
          const operations = interfaceMap.get(qualifiedName)!;
          
          for (const op of ops) {
            if (op?.kind === SyntaxKind.OperationStatement) {
              operations.push(extractOperationDetails(op));
            }
          }
        }
        return;
      }
      case SyntaxKind.NamespaceStatement: {
        const ns = stmt.id?.sv;
        const nextNs = typeof ns === "string" && ns.length > 0 ? [...namespace, ns] : namespace;

        const inner = stmt.statements;
        if (Array.isArray(inner)) {
          for (const s of inner) {
            collectFromStatement(s, nextNs, imports);
          }
        } else if (inner && typeof inner === "object") {
          collectFromStatement(inner, nextNs, imports);
        }
        return;
      }
      case SyntaxKind.ImportStatement: {
        const spec = stmt.path?.value;
        if (typeof spec === "string") {
          imports.push(spec);
        }
        return;
      }
      default:
        return;
    }
  }

  async function visitFile(filePath: string) {
    const normalizedPath = normalize(filePath);
    if (visitedFiles.has(normalizedPath)) return;
    visitedFiles.add(normalizedPath);

    let source: any;
    try {
      source = await host.readFile(normalizedPath);
    } catch (e) {
      reportError("file-not-found", e instanceof Error ? e.message : String(e), normalizedPath);
      return;
    }

    let ast: any;
    try {
      ast = parse(source);
    } catch (e) {
      reportError("parse-failed", e instanceof Error ? e.message : String(e), normalizedPath);
      return;
    }

    const imports: string[] = [];
    if (Array.isArray(ast?.statements)) {
      for (const stmt of ast.statements) {
        collectFromStatement(stmt, [], imports);
      }
    }

    const baseDir = dirname(normalizedPath);
    for (const specifier of imports) {
      if (specifier.startsWith("./") || specifier.startsWith("../")) {
        const resolved = joinAndNormalize(baseDir, specifier);
        await visitFile(resolved);
      }
    }
  }

  await visitFile(entry);

  const interfaces: InterfaceWithOperations[] = [...interfaceMap.entries()]
    .map(([name, operations]) => ({
      name,
      operations,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    interfaces,
    diagnostics,
  };
}

function convertDiagnostics(diagnostics: readonly Diagnostic[]): DiagnosticOutput[] {
  return diagnostics.map((d) => {
    let file = "";
    let start = 0;
    let end = 0;

    if (d.target && typeof d.target === "object" && "file" in d.target) {
      const target = d.target as any;
      file = target.file?.path ?? "";
      start = target.pos ?? 0;
      end = target.end ?? 0;
    }

    return {
      code: String(d.code),
      message: d.message,
      severity: d.severity === "error" ? Severity.Error : Severity.Warning,
      file,
      start,
      end,
    };
  });
}

// Export for WIT component - these will be the exported functions
export const exports = {
  compileVirtual,
  compileRoot,
  listInterfacesVirtual,
  listInterfacesDetailsVirtual,
  listInterfacesOperationsVirtual,
};
