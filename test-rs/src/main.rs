mod bindings;
use bindings::ts::compiler_show::api as cs;

fn main() -> Result<(), Box<dyn std::error::Error>> {

    let version = cs::version();
    println!("typespec version: {version}");
    cs::test();
    Ok(())
}
