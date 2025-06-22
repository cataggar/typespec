import type {
  CompilerHost,
  CompilerOptions,
  LinterDefinition,
  PackageJson,
  TypeSpecLibrary,
} from "@typespec/compiler";
export * from "@typespec/compiler/testing";
import { createTestRunner as _createTestRunner } from "@typespec/compiler/testing";
export function createTestRunner(...args: any[]) {
  return _createTestRunner(...args);
}

export interface PlaygroundSample {
  filename: string;
  preferredEmitter?: string;
  content: string;

  /**
   * Compiler options for the sample.
   */
  compilerOptions?: CompilerOptions;
}

export interface PlaygroundTspLibrary {
  name: string;
  packageJson: PackageJson;
  isEmitter: boolean;
  definition?: TypeSpecLibrary<any>;
  linter?: LinterDefinition;
}

export interface BrowserHost extends CompilerHost {
  compiler: typeof import("@typespec/compiler");
  libraries: Record<string, PlaygroundTspLibrary>;
}
