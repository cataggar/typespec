# compiler-wasm examples

- `compile-virtual-node`: Node.js example that loads stdlib sources into the virtual file set and calls `compileVirtual`.
- `compile-virtual-wasmtime`: Rust + wasmtime example that runs the WASI component (`build/typespec-compiler.wasm`) and calls `compile-virtual`.
- `list-interfaces-avs`: Rust + wasmtime example that runs the WASI component and prints `interface` declarations using the TypeSpec parser API.
- `list-interfaces-avs-dotnet`: C#/.NET example demonstrating the same host-side logic as `list-interfaces-avs`. Note: Full Component Model support in Wasmtime .NET is still in development; this example shows the architecture and file handling approach.
