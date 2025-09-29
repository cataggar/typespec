use wasmtime::component::{bindgen, Component, Linker, ResourceTable};
use wasmtime::{Config, Engine, Store};
use wasmtime_wasi::{WasiCtx, WasiView};

// Generate bindings for the TypeSpec component WIT interface
bindgen!({
    world: "typespec",
    path: "../tools/wasm/typespec.wit",
});

struct TypeSpecHost {
    wasi: WasiCtx,
    table: ResourceTable,
}

impl TypeSpecHost {
    fn new() -> Self {
        let wasi = wasmtime_wasi::WasiCtxBuilder::new()
            .inherit_stdio()
            .build();
        let table = ResourceTable::new();

        Self { wasi, table }
    }
}

impl WasiView for TypeSpecHost {
    fn ctx(&mut self) -> &mut WasiCtx {
        &mut self.wasi
    }
    
    fn table(&mut self) -> &mut ResourceTable {
        &mut self.table
    }
}

#[tokio::main]
async fn main() -> wasmtime::Result<()> {
    println!("Testing TypeSpec WebAssembly Component");

    // Configure Wasmtime engine
    let mut config = Config::new();
    config.wasm_component_model(true);
    
    let engine = Engine::new(&config)?;

    // Load the TypeSpec component
    let component = Component::from_file(&engine, "../build/typespec-compiler.wasm")?;

    // Set up WASI linker
    let mut linker = Linker::new(&engine);
    wasmtime_wasi::add_to_linker_sync(&mut linker)?;

    // Create store with host
    let mut store = Store::new(&engine, TypeSpecHost::new());

    // Instantiate the component
    let bindings = Typespec::instantiate(&mut store, &component, &linker)?;

    // Test 1: Compile virtual with scalar definition
    println!("\\n=== Test 1: Virtual compilation with scalar ===");
    let source_files = vec![SourceFile {
        path: "main.tsp".to_string(),
        contents: "scalar MyString extends string;".to_string(),
    }];

    let options = CompileOptions {
        emitters: vec![],
        output_dir: "./temp".to_string(),
        arguments: vec![],
    };

    match bindings.call_compile_virtual(&mut store, &source_files, "main.tsp", &options) {
        Ok(result) => {
            println!("Success: {}", result.success);
            println!("Diagnostics count: {}", result.diagnostics.len());
            println!("Emitted files count: {}", result.emitted.len());
            
            for diagnostic in &result.diagnostics {
                println!("  {}: {}", diagnostic.severity, diagnostic.message);
            }
            
            for emitted in &result.emitted {
                println!("  Emitted: {} ({} bytes)", emitted.path, emitted.contents.len());
            }
        }
        Err(e) => {
            println!("Error: {}", e);
        }
    }

    // Test 2: Compile virtual with namespace
    println!("\\n=== Test 2: Virtual compilation with namespace ===");
    let source_files2 = vec![SourceFile {
        path: "service.tsp".to_string(),
        contents: "namespace MyService { op ping(): void; }".to_string(),
    }];

    match bindings.call_compile_virtual(&mut store, &source_files2, "service.tsp", &options) {
        Ok(result) => {
            println!("Success: {}", result.success);
            println!("Diagnostics count: {}", result.diagnostics.len());
            println!("Emitted files count: {}", result.emitted.len());
            
            for diagnostic in &result.diagnostics {
                println!("  {}: {}", diagnostic.severity, diagnostic.message);
            }
            
            for emitted in &result.emitted {
                println!("  Emitted: {} ({} bytes)", emitted.path, emitted.contents.len());
                if emitted.path.ends_with(".json") {
                    println!("    Content preview: {}", 
                        emitted.contents.chars().take(100).collect::<String>());
                }
            }
        }
        Err(e) => {
            println!("Error: {}", e);
        }
    }

    // Test 3: Error case - missing entry file
    println!("\\n=== Test 3: Error case - missing entry file ===");
    match bindings.call_compile_virtual(&mut store, &source_files, "missing.tsp", &options) {
        Ok(result) => {
            println!("Success: {}", result.success);
            println!("Diagnostics count: {}", result.diagnostics.len());
            
            for diagnostic in &result.diagnostics {
                println!("  {}: {}", diagnostic.severity, diagnostic.message);
            }
        }
        Err(e) => {
            println!("Error: {}", e);
        }
    }

    println!("\\n=== All tests completed ===");
    Ok(())
}
