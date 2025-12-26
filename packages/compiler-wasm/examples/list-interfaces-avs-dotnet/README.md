# list-interfaces-avs-dotnet

C#/.NET example that demonstrates the same logic as `list-interfaces-avs` (Rust) for calling the TypeSpec WASI component.

## Status

This is a **partial implementation** because Wasmtime .NET does not yet have full Component Model support with generated bindings similar to Rust's `wasmtime::component::bindgen!` macro.

This example demonstrates:
- ✅ File loading and virtual filesystem setup (same logic as Rust version)
- ✅ Component location and validation
- ✅ Host-side architecture and approach
- ❌ Actual component invocation (requires Component Model bindings)

For a **working implementation**, see the Rust version at `../list-interfaces-avs/`.

## What This Shows

This C# project demonstrates the essential host-side setup that would be needed for calling the TypeSpec WASM component:

1. Loading all `.tsp` files from a directory structure
2. Mapping physical paths to virtual paths for the WASI component
3. Locating and validating the WASM component
4. The architecture of what a full implementation would look like

## Prerequisites

- .NET 8.0 SDK or later
- TypeSpec WASM component (build it first, see below)

## Build

From the repository root:

1. Build the TypeSpec WASM component:
   ```bash
   pnpm -C packages/compiler-wasm build:wasm
   ```

2. Build the C# project:
   ```bash
   cd packages/compiler-wasm/examples/list-interfaces-avs-dotnet
   dotnet build
   ```

## Run

From the repository root:

```bash
dotnet run --project packages/compiler-wasm/examples/list-interfaces-avs-dotnet/ListInterfacesAvsDotnet.csproj
```

Or pass a custom entry file:

```bash
dotnet run --project packages/compiler-wasm/examples/list-interfaces-avs-dotnet/ListInterfacesAvsDotnet.csproj -- /path/to/entry.tsp
```

## Default Entry

By default, it attempts to scan:
- `/Users/cataggar/ms/azure-rest-api-specs/specification/vmware/resource-manager/Microsoft.AVS/AVS/client.tsp`

## Implementation Notes

### Why Not Use Wasmtime .NET Directly?

As of 2024, the Wasmtime .NET library (`Wasmtime` NuGet package) provides excellent support for traditional WebAssembly modules but does not yet expose Component Model APIs for *consuming* components as a host.

The ecosystem currently offers:
- **componentize-dotnet**: Creates WASM components *from* C# code
- **Wasmtime .NET**: Hosts traditional WASM modules (not components with WIT interfaces)

For consuming components with WIT-defined interfaces from a .NET host, you would need:
1. Component Model bindings generated from WIT files (like Rust's `bindgen!` macro)
2. Support in Wasmtime .NET for instantiating and calling component exports
3. Proper type marshaling between C# and Component Model types

### Future Path Forward

When Component Model support matures in the .NET ecosystem, this example could be extended to:

1. Generate C# bindings from `typespec.wit` using wit-bindgen (once C# support is complete)
2. Use those bindings to:
   - Create a properly-typed `list-interfaces-details-virtual` function wrapper
   - Marshal the file list and entry path to the component
   - Receive and deserialize the result
3. Display the interface details just like the Rust version

## Comparison with Rust Version

The Rust version at `../list-interfaces-avs/` is fully functional because:
- `wasmtime` crate has complete Component Model support
- `wasmtime::component::bindgen!` macro generates type-safe bindings from WIT
- Full type system integration between Rust and Component Model

This C# version provides the equivalent file handling and setup logic, demonstrating how the .NET version would work once the tooling catches up.

## For Now, Use the Rust Version

If you need a working implementation, use:
```bash
cargo run --manifest-path packages/compiler-wasm/examples/list-interfaces-avs/Cargo.toml
```

This C# example serves as:
1. A reference for the host-side logic in C#
2. A foundation for when Component Model bindings become available
3. Documentation of the current state of the .NET/Component Model ecosystem
