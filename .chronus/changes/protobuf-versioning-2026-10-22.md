---
changeKind: feature
packages:
  - "@typespec/protobuf"
---

Add `@typespec/versioning` support to `@typespec/protobuf` aligned with [AIP-185](https://google.aip.dev/185) and [AIP-215](https://google.aip.dev/215), including per-version `.proto` emission, automatic `.{version}` package suffixing and `{version}` option interpolation, automatic `reserved` synthesis for `@removed` and `@renamedFrom` fields and `oneof` variants, `#deprecated` emission, and AIP-185/AIP-215 warning diagnostics.

```tsp
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
  @field(1) id: string;

  @added(Versions.v1beta)
  @removed(Versions.v2)
  @field(2)
  experimental_summary?: string;
}
```
