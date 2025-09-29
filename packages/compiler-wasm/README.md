# TypeSpec WebAssembly Component

This package provides a WebAssembly Component packaging of the TypeSpec compiler using `jco`, enabling other Wasm components (e.g., Rust) to compile TypeSpec projects via WASI.

## Overview

The TypeSpec WebAssembly Component exposes two main functions:

- `compile-virtual`: Compile TypeSpec from in-memory sources
- `compile-root`: Compile TypeSpec from filesystem root (WASI-backed)

## Package Structure

```
packages/compiler-wasm/
├── src/
│   ├── index.ts           # Full compiler integration (WIP)
│   ├── minimal.ts         # Minimal proof-of-concept implementation
│   ├── host-wasi.ts       # WASI-backed CompilerHost implementation
│   └── virtual-fs-host.ts # In-memory filesystem host
├── tools/wasm/
│   └── typespec.wit       # WIT world interface definition
├── test-rs/               # Rust integration test harness
├── build/                 # Generated WebAssembly components
└── dist/                  # Bundled JavaScript files
```

## WIT Interface

The component implements the following WIT world:

```wit
world typespec {
    export compile-virtual: func(files: list<source-file>, entry: string, options: compile-options) -> compile-result;
    export compile-root: func(root-path: string, entry: string, options: compile-options) -> compile-result;
}
```

## Build Commands

```bash
# Build minimal proof-of-concept bundle and component
pnpm build

# Build full compiler integration (work in progress)
pnpm build:bundle:full

# Create WebAssembly component
pnpm build:wasm

# Test with Rust integration harness
pnpm test:wasm
```

## Usage Example (Rust)

```rust
use wasmtime::component::{bindgen, Component, Linker};
use wasmtime::{Config, Engine, Store};
use wasmtime_wasi::{WasiCtx, WasiView};

bindgen!({
    world: "typespec",
    path: "../tools/wasm/typespec.wit",
});

let engine = Engine::new(&Config::new().wasm_component_model(true))?;
let component = Component::from_file(&engine, "typespec-compiler.wasm")?;
let mut linker = Linker::new(&engine);
wasmtime_wasi::add_to_linker_sync(&mut linker)?;

let mut store = Store::new(&engine, TypeSpecHost::new());
let bindings = Typespec::instantiate(&mut store, &component, &linker)?;

// Compile virtual TypeSpec code
let source_files = vec![SourceFile {
    path: "main.tsp".to_string(),
    contents: "scalar MyString extends string;".to_string(),
}];

let result = bindings.call_compile_virtual(
    &mut store, 
    &source_files, 
    "main.tsp", 
    &CompileOptions::default()
)?;

println!("Success: {}", result.success);
```

## Current Implementation Status

### ✅ Completed
- [x] WIT world interface definition
- [x] Minimal proof-of-concept implementation
- [x] WebAssembly component generation with jco
- [x] Rust integration test harness
- [x] Basic virtual compilation functionality
- [x] Error handling and diagnostics
- [x] WASI-backed CompilerHost structure
- [x] In-memory virtual filesystem host

### 🚧 Work in Progress
- [ ] Full TypeSpec compiler integration (bundle currently has Node.js dependency issues)
- [ ] Complete standard library embedding
- [ ] Filesystem-based compilation (compile-root)
- [ ] Advanced emitter support
- [ ] Performance optimizations

### 🔮 Future Enhancements
- [ ] Language Server Protocol functions
- [ ] Streaming diagnostics and emission
- [ ] Caching of compiled dependencies
- [ ] Multiple emitter support

## Technical Details

### Bundling Strategy

The current implementation uses esbuild to create an ESM bundle that:
- Excludes Node.js built-ins that can't run in WebAssembly
- Uses minimal dependencies to reduce bundle size
- Provides stubs for complex TypeSpec compiler features

### WASI Integration

The component uses WASI for:
- File system operations (for `compile-root`)
- Standard I/O
- Environment variable access

### WebAssembly Component Model

The implementation uses the WebAssembly Component Model with:
- Well-defined WIT interfaces
- Strong typing between host and guest
- Resource management via wasmtime
- WASI capabilities for filesystem access

## Testing

Run the Rust integration tests:

```bash
cd test-rs
cargo run --bin test-typespec-component
```

This will test:
1. Virtual compilation with scalar definitions
2. Virtual compilation with namespace definitions  
3. Error handling for missing entry files

## Dependencies

- `@bytecodealliance/jco`: WebAssembly componentization
- `esbuild`: JavaScript bundling
- `wasmtime` (Rust): WebAssembly runtime
- `wasmtime-wasi` (Rust): WASI support

## Limitations

1. **Full Compiler Integration**: The complete TypeSpec compiler has complex Node.js dependencies that are difficult to bundle for WebAssembly. The current implementation uses a minimal proof-of-concept.

2. **Standard Library**: Only basic TypeSpec intrinsics are embedded. Full standard library support requires additional work.

3. **Emitters**: Currently limited emitter support. Full emitter ecosystem integration is planned.

4. **Performance**: No optimizations yet - first focus was on getting the basic architecture working.

## Contributing

This is an experimental feature. Contributions are welcome, especially for:
- Resolving Node.js bundling issues
- Adding more standard library features
- Improving performance
- Adding more comprehensive tests

## Related Documentation

See the main TypeSpec documentation for more information about the TypeSpec language and compiler architecture.