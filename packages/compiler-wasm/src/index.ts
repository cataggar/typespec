// Re-export everything from wasm-entry for consistency
export {
  type SourceFile,
  type CompileOptions,
  Severity,
  type DiagnosticOutput,
  type EmittedFile,
  type CompileResult,
  type InterfaceListResult,
  type InterfaceInfo,
  type InterfaceDetailsResult,
  Program,
  compileVirtual,
  compileRoot,
  listInterfacesVirtual,
  listInterfacesDetailsVirtual,
} from "./wasm-entry.js";
