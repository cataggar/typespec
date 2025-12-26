// C#/.NET example for calling TypeSpec WASM component
// 
// NOTE: This is a simplified version because Wasmtime .NET does not yet have 
// full Component Model support with generated bindings like Rust's wasmtime crate.
// 
// This example demonstrates:
// 1. The same file loading and virtual filesystem setup logic
// 2. Component location and validation
// 3. How the C# version would work once Component Model bindings are available
//
// For a working implementation, see the Rust version at ../list-interfaces-avs/

using System.Text;

const string DefaultEntry = "/Users/cataggar/ms/azure-rest-api-specs/specification/vmware/resource-manager/Microsoft.AVS/AVS/client.tsp";

Console.WriteLine("=== TypeSpec list-interfaces-avs (.NET version) ===");
Console.WriteLine();

// Get entry file path from command line or use default
string entry = args.Length > 0 ? args[0] : DefaultEntry;
string entryPath = Path.GetFullPath(entry);

if (!File.Exists(entryPath))
{
    Console.Error.WriteLine($"Entry file does not exist: {entryPath}");
    return 1;
}

string entryDir = Path.GetDirectoryName(entryPath) 
    ?? throw new InvalidOperationException("Entry file has no parent directory");

// Map the on-disk project directory to a virtual root
const string VirtualRoot = "/project";
string entryRel = Path.GetRelativePath(entryDir, entryPath);
string entryVirtual = $"{VirtualRoot}/{ToPosixPath(entryRel)}";

Console.WriteLine($"Entry file: {entryPath}");
Console.WriteLine($"Virtual path: {entryVirtual}");
Console.WriteLine();

// Load all .tsp files under the entry directory
Console.WriteLine("Loading .tsp files...");
var files = LoadAllTspUnder(entryDir, VirtualRoot);
Console.WriteLine($"Loaded {files.Count} TypeSpec files");
Console.WriteLine();

// Locate component
string repoRoot = GetRepoRoot();
string componentPath = Path.Combine(repoRoot, "packages", "compiler-wasm", "build", "typespec-compiler.wasm");

if (!File.Exists(componentPath))
{
    Console.Error.WriteLine($"WASI component not found at {componentPath}.");
    Console.Error.WriteLine("Build it first with: pnpm -C packages/compiler-wasm build:wasm");
    return 1;
}

Console.WriteLine($"Component: {componentPath}");
Console.WriteLine();

// Show what would happen next in a full implementation
Console.WriteLine("--- Implementation Status ---");
Console.WriteLine();
Console.WriteLine("✓ File loading and virtual filesystem setup");
Console.WriteLine("✓ Component location and validation");
Console.WriteLine("✗ Component Model bindings (not yet available in Wasmtime .NET)");
Console.WriteLine();
Console.WriteLine("In a full implementation with Component Model support:");
Console.WriteLine("  1. Create Engine with Component Model enabled");
Console.WriteLine("  2. Load the .wasm component");
Console.WriteLine("  3. Set up WASI environment (stdio, filesystem)");
Console.WriteLine("  4. Instantiate the component with proper imports");
Console.WriteLine("  5. Call list-interfaces-details-virtual(files, entry)");
Console.WriteLine("  6. Parse and display the results");
Console.WriteLine();
Console.WriteLine("Current status:");
Console.WriteLine("  - Wasmtime .NET supports traditional WASM modules");
Console.WriteLine("  - Component Model support for .NET hosts is in development");
Console.WriteLine("  - componentize-dotnet creates components but doesn't consume them");
Console.WriteLine("  - Use the Rust version (../list-interfaces-avs) for a working example");
Console.WriteLine();
Console.WriteLine("This C# project demonstrates the host-side setup and serves as a");
Console.WriteLine("foundation for when Component Model bindings become available.");

return 0;

// Helper methods

string GetRepoRoot()
{
    string currentDir = AppContext.BaseDirectory;
    int attempts = 0;
    while (currentDir != null && attempts++ < 10)
    {
        if (File.Exists(Path.Combine(currentDir, "pnpm-workspace.yaml")))
        {
            return currentDir;
        }
        var parent = Directory.GetParent(currentDir);
        if (parent == null) break;
        currentDir = parent.FullName;
    }
    throw new InvalidOperationException("Could not find repository root (no pnpm-workspace.yaml found)");
}

List<(string VirtualPath, string Contents)> LoadAllTspUnder(string rootDir, string virtualRoot)
{
    var result = new List<(string, string)>();
    
    foreach (string file in Directory.EnumerateFiles(rootDir, "*.tsp", SearchOption.AllDirectories))
    {
        string contents = File.ReadAllText(file);
        string rel = Path.GetRelativePath(rootDir, file);
        string virtualPath = $"{virtualRoot}/{ToPosixPath(rel)}";
        result.Add((virtualPath, contents));
    }
    
    return result;
}

string ToPosixPath(string path)
{
    return path.Replace('\\', '/');
}
