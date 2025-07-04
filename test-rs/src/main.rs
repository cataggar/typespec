mod bindings;
use bindings::ts::typescript::typescript as ts;
// use bindings::ts::typescript_system::types as sys;

fn main() -> Result<(), Box<dyn std::error::Error>> {

    // ts::set_sys(sys::System::new());

    ts::test();
    let version = ts::version();
    // println!("typespec version: {version}");
    println!("Hello, world!");

    // let compilerOptions = ts::CompilerOptions::new();
    // let programOptions = ts::CreateProgramOptions::new(&["abc.ts".to_string()], &compilerOptions);
    // let program = ts::create_program2(&programOptions)?;

    // 
    // let host = ts::create_compiler_host(&options, true)?;
    // let program = ts::create_program(
    //     &["abc.ts".to_string()],
    //     &options,
    //     &host
    // )?;
    // println!("program: {:?}", program);
    // let _checker = program.get_type_checker()?;
    // let _diagnostics = ts::get_pre_emit_diagnostics(&program);
    // print node count
    // println!("node count: {}", program.get_node_count());
    // println!("type count: {}", program.get_type_count());
    // let source_files = program.get_source_files()?;
    // println!("source files: {:?}", source_files);

    Ok(())
}
