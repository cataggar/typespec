import "@typespec/protobuf";
import "@typespec/versioning";

using TypeSpec.Protobuf;
using TypeSpec.Versioning;

@versioned(Versions)
@package({
  name: "acme.library",
  options: {
    go_package: "acme.com/genproto/library/{version};library",
  },
})
namespace Acme.Library;

enum Versions {
  v1,
  v1beta,
  v2,
}

model Book {
  @field(1) name: string;

  @renamedFrom(Versions.v2, "book_title")
  @field(2)
  title: string;

  @added(Versions.v1beta)
  @removed(Versions.v2)
  @field(3)
  experimental_summary?: string;

  @added(Versions.v2)
  @field(4)
  isbn: string;
}

model GetBookRequest {
  @field(1) name: string;
}

@Protobuf.service
interface LibraryService {
  getBook(...GetBookRequest): Book;

  #deprecated "Use getBook instead."
  @removed(Versions.v2)
  findBook(...GetBookRequest): Book;
}
