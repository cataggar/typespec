# TypeSpec Copilot Instructions

**ALWAYS follow these instructions first and only fall back to additional search and context gathering if the information here is incomplete or found to be in error.**

TypeSpec is a language for defining cloud service APIs and shapes. This monorepo contains the TypeSpec compiler, standard library packages, tools, documentation, and various language client emitters.

## Essential Setup and Build Commands

### Prerequisites and Installation

- Install Node.js 20 LTS: `curl -fsSL https://nodejs.org/dist/v20.19.4/node-v20.19.4-linux-x64.tar.xz | tar -xJ --strip-components=1 -C /usr/local`
- Install pnpm globally: `npm install -g pnpm`
- Install dependencies: `pnpm install` (takes ~1.5 minutes)
- Install Playwright browsers (optional for UI testing): `npx playwright install`

### Building the Project

- **CRITICAL**: Build the entire project: `pnpm build` (takes ~7 minutes, NEVER CANCEL - set timeout to 15+ minutes)
- Build in watch mode for development: `pnpm watch`
- Build specific package: `pnpm -r --filter "<package-name>..." build`
- Clean build artifacts: `pnpm clean`

### Testing and Validation

- **CRITICAL**: Run all tests: `pnpm test` (takes ~5 minutes, NEVER CANCEL - set timeout to 10+ minutes)
- Run E2E tests: `pnpm test:e2e` and `node e2e/e2e-tests.js` (~1 minute)
- Run tests with coverage: `pnpm test:ci`
- Run tests in watch mode (in specific package): `pnpm test:watch`

### Code Quality

- Check formatting: `pnpm format:check` (~1 minute)
- Format code: `pnpm format`
- Run linting: `pnpm lint` (~1 minute)
- Fix lint issues: `pnpm lint:fix`

### Essential TypeSpec Development Workflow

1. **ALWAYS** run the full build process after repository clone: `pnpm install && pnpm build`
2. Start watch mode: `pnpm watch`
3. Test TypeSpec compilation works:

   ```bash
   # Create test project
   mkdir test-tsp && cd test-tsp
   echo 'import "@typespec/rest"; import "@typespec/openapi3"; op ping(): void;' > main.tsp
   echo '{"dependencies": {"@typespec/compiler": "latest", "@typespec/rest": "latest", "@typespec/openapi3": "latest"}}' > package.json
   
   # Install and compile
   /path/to/typespec/packages/compiler/cmd/tsp.js install
   /path/to/typespec/packages/compiler/cmd/tsp.js compile main.tsp --emit @typespec/openapi3
   ```

4. Always format and lint before completing changes: `pnpm format && pnpm lint:fix`

## Repository Structure

### Key Packages (packages/)

- **compiler**: Core TypeSpec compiler and CLI tool
- **http, rest, openapi3**: Standard HTTP/REST API libraries
- **versioning**: API versioning support
- **json-schema**: JSON Schema emitter
- **prettier-plugin-typespec**: Code formatting support
- **typespec-vscode, typespec-vs**: Editor extensions
- **playground**: Interactive TypeSpec playground
- **website**: Documentation website (typespec.io)

### Important Directories

- `/packages/`: All TypeSpec packages and libraries
- `/e2e/`: End-to-end integration tests
- `/website/`: Documentation website source
- `/eng/`: Build engineering and automation scripts
- `/.github/workflows/`: CI/CD pipeline definitions

## Manual Validation After Changes

**ALWAYS perform these validation steps after making changes:**

1. **Basic functionality test**: Create and compile a simple TypeSpec file as shown above
2. **Build validation**: Run full build to ensure no build breaks: `pnpm build`
3. **Test validation**: Run relevant tests: `pnpm test`
4. **Code quality**: Ensure formatting and linting pass: `pnpm format:check && pnpm lint`

## Website Development

- Navigate to website: `cd website`
- Start development server: `pnpm start` (runs on port 4321)
- Build website: `pnpm build`
- The website includes documentation, API references, and the playground

## Critical Timing and Performance Notes

- **NEVER CANCEL** long-running commands - builds can take 7+ minutes, tests 5+ minutes
- Set explicit timeouts: Build commands need 15+ minutes, test commands need 10+ minutes
- Package installation: ~1.5 minutes
- Full rebuild from clean state: ~7 minutes
- Full test suite: ~5 minutes
- Lint check: ~1 minute
- E2E tests: ~1 minute

## Common Development Tasks

- Add change description: `pnpm change add`
- Generate external signatures: `pnpm gen-compiler-extern-signature`
- Regenerate samples: `pnpm regen-samples`
- Regenerate docs: `pnpm regen-docs`
- Sync dependency versions: `pnpm fix-version-mismatch`

## Troubleshooting

- If builds fail with watch mode conflicts, run: `pnpm clean && pnpm build`
- For installation issues, try: `pnpm install-conflict`
- If TypeScript compilation fails, check that compiler built first: `pnpm -r --filter "@typespec/compiler" build`
- For VS Code extension development, ensure you have the workspace open at the repository root

## Available Task Instructions

- [Testserver Generation](./prompts/testserver-generation.md): Instructions for generating TypeSpec HTTP spec test servers
- [http-client-csharp Development](./prompts/http-client-csharp-development.md): Instructions for developing the C# HTTP client
- [http-client-java Development](./prompts/http-client-java-development.md): Instructions for developing the TypeSpec library for Java client.

## WebAssembly Component (jco + WASI) Integration

This section describes how to package the TypeSpec compiler (and selected standard libraries) as a WebAssembly Component using the `jco` toolchain so it can be embedded and driven from a separate Wasm component (e.g. written in Rust and run under Wasmtime). The existing `CompilerHost` abstraction already isolates Node.js APIs (filesystem, path resolution, timing, etc.). The goal is to (1) bundle the TypeSpec compilation core as an ES Module, (2) expose a minimal world interface via WIT, (3) componentize that bundle with `jco`, and (4) invoke it from another component using WASI + the generated bindings.

### High-Level Goals

1. Stable component boundary for: providing TypeSpec source files, resolving imports, configuring emitters, invoking `compile`, retrieving diagnostics & emitted artifacts.
2. Zero direct Node.js dependencies at the dynamic boundary (only via `CompilerHost` which we supply an implementation for inside the component).
3. Deterministic, pure compile entrypoint (no global mutable ambient Node state) so it can be safely invoked from other Wasm components.

### Architecture Overview

```
Rust (host component) ──imports──> TypeSpec Wasm Component
            │                                │
            │  (WIT world functions)         │ internal JS bundle
            │                                │  - @typespec/compiler core
            │                                │  - Selected std libs (@typespec/rest, ...)
            ▼                                │  - In-component CompilerHost (WASI-backed)
       WASI FS  <────────── uses ──────────┘
```

### What `CompilerHost` Covers

`CompilerHost` abstracts at least: file read/write/enumeration, path ops, realpath, performance timestamps, log/trace, and optional environment concerns. For the Wasm build we implement a host that delegates to WASI syscalls (or higher-level WASI FS bindings) instead of Node's `fs`/`path`.

### Minimal Surface (Recommended WIT World)

Create a WIT file (e.g. `typespec.wit`) describing the world. Keep it small and data-oriented.

```wit
package typespec:component

// Basic data structs
record source-file { path: string, contents: string }
record compile-options { emitters: list<string>, output-dir: string, arguments: list<string> }
record diagnostic { code: string, message: string, severity: string, file: string, start: u32, end: u32 }
record emitted-file { path: string, contents: string }
record compile-result { success: bool, diagnostics: list<diagnostic>, emitted: list<emitted-file> }

world typespec {
   // Provide a virtual project (in-memory overlay). Paths are POSIX style.
   export compile-virtual: func(files: list<source-file>, entry: string, options: compile-options) -> compile-result

   // Compile relying on WASI filesystem for reading sources rooted at `root-path`.
   export compile-root: func(root-path: string, entry: string, options: compile-options) -> compile-result
}
```

You can extend later for: incremental builds, cancellation, formatting, or language server hooks.

### JS Glue (Entry Module)

Create an internal ESM entry (e.g. `packages/compiler-wasm/src/index.ts`) that:

1. Imports `@typespec/compiler` (and required standard libs you want baked in).
2. Constructs a `CompilerHost` whose methods call WASI (via polyfills provided by `jco` or custom shims) or the in-memory overlay.
3. Implements two exported async functions: `compileVirtual(files, entry, options)` and `compileRoot(rootPath, entry, options)` that wire into the regular compiler API.
4. Normalizes emitted outputs (collect file contents written to an in-memory sink rather than persisting if you want them in the return payload).

Edge considerations:
- Large outputs: consider a size limit or streaming API (future WIT change) to avoid huge linear memory copies.
- Paths: canonicalize & enforce forward slashes.
- Determinism: avoid reading process env or current working directory; pass everything explicitly.

### Bundling Strategy

We want a single ESM suitable for componentization.

Recommended approach (esbuild example):

```bash
pnpm -r --filter "@typespec/compiler" build
pnpm -r --filter "@typespec/rest" build # add any other std libs you plan to embed

# Bundle (example script)
esbuild packages/compiler-wasm/src/index.ts \
   --bundle --format=esm --platform=browser \
   --tree-shaking=true --sourcemap --outdir=dist \
   --external:fs --external:path --external:os --external:crypto

# (Optional) Provide lightweight shims for required Node built-ins actually used by CompilerHost
```

Because we supply our own `CompilerHost`, most Node built-ins can be excluded. If the compiler code still pulls in some Node modules indirectly, create tiny runtime guards or alias them to stubs when not required (e.g. dynamic `import('fs')` replaced by a module that throws a clear error if inadvertently called).

### Componentization with `jco`

Assuming the WIT file lives at `tools/wasm/typespec.wit` and the bundle at `dist/index.js`:

```bash
# Validate WIT
jco wit tools/wasm/typespec.wit

# Componentize the JS bundle implementing the world
jco componentize dist/index.js \
   --wit tools/wasm/typespec.wit \
   --world typespec \
   --name typespec-compiler \
   --out build/typespec-compiler.wasm

# (Optional) Optimize
wasm-tools component optimize build/typespec-compiler.wasm -o build/typespec-compiler.opt.wasm
```

If you need to import other components (e.g. capability providers), list them via `--adapt` or compose afterwards.

### Consuming from Rust

1. Generate Rust bindings using `wit-bindgen` (or `wasmtime::component::bindgen!`).
2. Instantiate with a WASI context whose preopened dirs include the TypeSpec project roots you plan to compile.
3. Call `compile_virtual` (for in-memory sources) or `compile_root`.
4. Map diagnostics to your tooling UI.

Rust (simplified pseudo-code):

```rust
let engine = wasmtime::Engine::default();
let component = wasmtime::component::Component::from_file(&engine, "typespec-compiler.wasm")?;
let mut linker = wasmtime::component::Linker::new(&engine);
// Add WASI
wasmtime_wasi::add_to_linker(&mut linker, |cx: &mut Ctx| &mut cx.wasi)?;
let mut store = wasmtime::Store::new(&engine, Ctx::new_with_wasi(preopened_dirs));
let (instance, _exports) = MyTypespec::instantiate(&mut store, &component, &linker)?;
let result = instance.call_compile_root(&mut store, project_root, entry, options)?;
```

### Data Conversion Tips

Diagnostics may include offsets; you can optionally compute line/column on the JS side to prevent recomputation in Rust. If large emitted artifacts are expected, consider switching to a filesystem-only emission mode and return just the file list (adjust WIT accordingly) to reduce copies.

### Auditing Remaining Node.js Touch Points

Before finalizing the bundle, grep for these modules in the compiler package(s):

- `fs`, `path`, `os`, `process`, `worker_threads`, `crypto`, `perf_hooks`, `url`

All usage should either:
1. Flow through `CompilerHost` methods you implement in the Wasm component, or
2. Be pruned by bundling/tree-shaking, or
3. Be replaced by safe browser/WASI polyfills.

If you encounter a direct Node call outside `CompilerHost`, refactor it behind the host interface (new method if needed). Keep the interface narrow; prefer passing additional context parameters over exposing raw Node primitives.

### Extending `CompilerHost` for WASI

If a missing capability blocks you (e.g., high-resolution timer or directory globbing):

1. Add a method to `CompilerHost` interface (ensure backward compatibility or provide a fallback).
2. Implement in existing Node host with current behavior.
3. Implement in the WASI host using WASI syscalls or pure JS.
4. Rebuild and re-bundle.

### Testing Strategy

1. JS side unit tests (Node) still run unchanged.
2. Add a Wasm integration test harness (Rust) that: packs a small TypeSpec project, invokes compile, asserts outputs.
3. Include at least: simple success, syntax error (diagnostics path), emitter output presence.

### Performance Considerations

The initial startup includes module instantiation + JS engine warmup. Mitigations:
- Pre-instantiate and keep the component resident.
- Cache parsed standard library IR (future optimization) by persisting serialized forms in a sidecar component or using a second function to return a snapshot.

### Copilot Task Guidance (When Asked to Work on Wasm Component)

When a user requests changes related to the Wasm component:
- Do NOT remove or rewrite earlier sections of this file.
- Limit code changes to new Wasm-specific packages or clearly marked additions in a `compiler-wasm` style folder unless explicitly told otherwise.
- Prefer adding a new entry module rather than modifying core compiler internals; if a core change is required to remove a Node dependency, isolate it behind `CompilerHost`.
- Always describe which Node API usages you eliminated or encapsulated.

### Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Missing import at runtime | Tree-shaken std lib not bundled | Add explicit import in entry module |
| `ENOENT` for files that exist | WASI preopened dirs not configured | Preopen the project root in the Rust host |
| Large memory spikes | Returning huge emitted contents | Switch to filesystem emission + file list return |
| Direct `fs` call crash | Unabstracted Node usage | Refactor behind `CompilerHost` |

### Future Extensions

- Language Server (LSP) world: incremental parse & symbol queries.
- Streaming emitter outputs over an interface instead of returning all at once.
- Caching compiled library dependencies across invocations.

---
Use this section as the authoritative reference for Wasm component work. If anything here conflicts with earlier general instructions, defer to the specific guidance above for Wasm tasks.
