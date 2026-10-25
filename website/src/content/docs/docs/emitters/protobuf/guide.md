---
title: Guide
---

TypeSpec includes a built-in emitter (`@typespec/protobuf`) that can generate Protocol Buffers specifications from TypeSpec sources. The Protobuf files generated can then be used to create gRPC services or any other tools that are compatible with Protocol Buffers.

**Please note**: The Protobuf emitter is designed to work with Protocol Buffers 3 (proto3) syntax. Ensure that your workflow (including `protoc` version) supports proto3 to make full use of this emitter.

## Fundamental Concepts

The Protobuf emitter allows you to write TypeSpec and transform it into corresponding Protocol Buffers for use with systems that support Protobuf (like gRPC). To successfully convert your TypeSpec models and interfaces to Protobuf, they must comply with certain rules and limitations.

### Packages

A protobuf package is established by the [`TypeSpec.Protobuf.package` decorator][protobuf-package], which is applied to a TypeSpec namespace. Essentially, a package defines a `.proto` file, and all contents within the decorated namespace are emitted into a single file.

Consider the following TypeSpec namespace, which results in a Protobuf file named `main.proto` containing the contents of the `Test` namespace, converted into Protobuf.

```typespec
@package
namespace Test {
// ...

}
```

You can specify package names using the optional `PackageDetails` argument with the `@package` decorator. The following TypeSpec namespace will create a file `com/example/test.proto` that includes the line `package com.example.test;`:

```typespec
@package({
  name: "com.example.test",
})
namespace Test {
// ...

}
```

TypeSpec entities (like models, enums, etc.) are transformed into Protobuf declarations within their closest ancestor that has a package annotation. This means that, unlike in Protobuf, TypeSpec package declarations can be nested as needed.

### Messages

TypeSpec models are translated into Protobuf messages. For instance, the following TypeSpec model:

```typespec
model TestMessage {
  @field(1) n: int32;
}
```

will be transformed into the Protobuf message below:

```protobuf
message TestMessage {
  int32 n = 1;
}
```

Models are converted into messages and included in the Protobuf file if they meet any of the following conditions:

- The model is explicitly annotated with the [`TypeSpec.Protobuf.message` decorator][protobuf-message].
- The model is referenced by any service operation (refer to [Services](#services) below).
- The model is a direct child of a [package namespace](#packages) and every field is annotated with the [`TypeSpec.Protobuf.field` decorator][protobuf-field] (an unannotated property whose type is a named union with `@field` on every variant also counts; see [Unions and `oneof`](#unions-and-oneof)).

#### Field Indices

Protobuf requires manual specification of the offset for each field within a Protobuf message. In TypeSpec, these field indices are specified using the [`TypeSpec.Protobuf.field` decorator][protobuf-field]. To be converted into a Protobuf message, all fields within a model must have an attached `@field` decorator.

The following TypeSpec model:

```typespec
model TestMessage {
  @field(1) n: int32;
}
```

will be transformed into the Protobuf message below:

```protobuf
message TestMessage {
  int32 n = 1;
}
```

#### Optional fields

When a TypeSpec property is defined as optional (`?`) inside of a model that defines a `message`, the protobuf emitter writes the proto3 `optional` label for singular scalar and enum fields.

```typespec
model Example {
  @field(1)
  count?: int32;

  @field(2)
  name?: string;
}
```

```protobuf
message Example {
  optional int32 count = 1;
  optional string name = 2;
}
```

Optional message fields (TypeSpec optional properties where the type is a model) are emitted without the `optional` label because message-typed fields always have explicit presence discipline in proto3 (in other words, _all message-typed fields are effectively optional in the Protocol Buffers layer_). Validating optionality constraints on message-typed fields requires checking the presence of the field in the application that uses the protobuf implementation.

Optional `repeated` and `map` fields are emitted without `optional` and produce a warning; protobuf cannot distinguish between _unset_ and _empty_ for those shapes because they are represented by "repeating" a field index within the protobuf message payload (if the field isn't set in the message, that means "_empty_" and there is no alternative to represent "_this field is not set_").

#### Unions and `oneof`

A named union whose variants are each annotated with the [`TypeSpec.Protobuf.field` decorator][protobuf-field] can be used as the type of a message field. How it is emitted depends on whether the property itself has a `@field` decorator.

An optional property **without** `@field` is emitted inline as a `oneof` named after the property. The variant field indices share the field index space of the containing message:

```typespec
union Payment {
  @field(10) card: CardPayment,
  @field(11) bank_transfer: BankTransfer,
}

model Order {
  @field(1) id: string;
  payment?: Payment;
}
```

```protobuf
message Order {
  string id = 1;
  oneof payment {
    CardPayment card = 10;
    BankTransfer bank_transfer = 11;
  }
}
```

Members of a `oneof` are encoded the same as ordinary fields, so moving existing fields that are never set together into an inline `oneof` keeps the same wire format.

A property **with** `@field` refers to a wrapper message named after the union. The wrapper message contains a `oneof value`, and the variant field indices belong to the wrapper message. Wrapper messages can also be used in arrays and maps, and `@reserve` on the union applies to the wrapper message. Wrapper messages are only emitted when referenced, unless the union is annotated with the [`TypeSpec.Protobuf.message` decorator][protobuf-message]:

```typespec
model Order {
  @field(1) id: string;
  @field(2) payment: Payment;
}
```

```protobuf
message Payment {
  oneof value {
    CardPayment card = 10;
    BankTransfer bank_transfer = 11;
  }
}

message Order {
  string id = 1;
  Payment payment = 2;
}
```

:::caution
Switching a property between the inline and wrapper forms (by adding or removing `@field` on the property) changes the wire format. Inline members are encoded directly in the containing message, while the wrapper form encodes a nested message under the property's field index, so existing clients and servers cannot read data written using the other form.
:::

Neither form guarantees that exactly one member is set. A `oneof` holds _at most_ one member, and a wrapper message behaves like any other message-typed field: it can be absent, or present with no member selected, even when the TypeSpec property is required. Applications that need exactly one member must validate it themselves.

The following rules apply:

- Anonymous unions (such as `CardPayment | BankTransfer`) and unnamed variants are not supported, because every `oneof` member needs a name.
- The names of an inline `oneof` (the property name) and of its members (the variant names) must be valid Protobuf identifiers, so quoted names such as `"payment-method"` are rejected.
- A property emitted as an inline `oneof` must be optional, because a `oneof` may have no member set.
- Variants cannot be arrays or maps, because Protobuf does not allow `repeated` or `map` fields in a `oneof`.
- Field indices and names of `oneof` members must not collide with other fields of the same message (including members of other `oneof`s) or with the message's `@reserve` declarations. A union used inline by several models is validated separately for each of them.
- Scalar members of a `oneof` are emitted without the `optional` label.

### Enums

Enums referenced by messages are translated into Protobuf enums. Every member must have an explicit integer value, and the first member must have value `0`. Values do not need to be consecutive. If multiple members share a number, the emitter adds `option allow_alias = true`.

By default, enum member names are emitted unchanged. Protobuf enum values share their containing scope, so values from different package-level enums cannot have the same name. Both [AIP-126](https://google.aip.dev/126) and the [Protobuf style guide](https://protobuf.dev/programming-guides/style/#enum-value-prefixing) recommend prefixing all package-level enum values with the enum name.

To write short TypeSpec member names while emitting prefixed `UPPER_SNAKE_CASE` values, enable `enum-value-prefix`:

```yaml
options:
  "@typespec/protobuf":
    enum-value-prefix: enum-name
```

For example, this enum referenced by a message:

```typespec
enum OrderState {
  Unspecified: 0,
  Pending: 1,
  Shipped: 2,
}
```

is emitted as:

```protobuf
enum OrderState {
  ORDER_STATE_UNSPECIFIED = 0;
  ORDER_STATE_PENDING = 1;
  ORDER_STATE_SHIPPED = 2;
}
```

The enum name and member name are converted to `UPPER_SNAKE_CASE`, with acronyms treated as words: `HTTPStatus.HttpTimeout` becomes `HTTP_STATUS_HTTP_TIMEOUT`. Names that already start with the emitted enum prefix are preserved unchanged. Names that acquire the prefix during case conversion are not prefixed twice. The emitter reports an error if the resulting value name collides with another enum value or a declaration in the same Protobuf package, including packages without a name. The diagnostic identifies the original conflicting enum member, or the kind and emitted name of the conflicting message, enum, or service.

This option changes names only. It does not insert an `Unspecified` member or infer numbers, and an existing zero member such as `Unknown: 0` keeps its meaning. Numeric values, member order, and enum type names are preserved. Changing value names can affect generated APIs and Protobuf JSON strings, even though the numeric binary values remain unchanged.

### Services

TypeSpec defines a "service" using the [`TypeSpec.service` decorator][native-service], but the Protobuf "service" concept is different and is denoted by the [`TypeSpec.Protobuf.service` decorator][protobuf-service].

When using the Protobuf emitter, a Protobuf service designation is applied to an interface within a package. For example, the following TypeSpec:

```typespec
@package
namespace Example {
  @Protobuf.service
  interface Test {
    // ...
  }
}
```

will generate the following Protobuf file (named `example.proto`):

```protobuf
syntax = "proto3";

package example;

service Test {
  // ...
}
```

#### Operations

Within a [service interface](#services), TypeSpec operations are represented as Protobuf service methods. Each operation in the service interface is converted into an equivalent Protobuf method declaration. For instance, the following specification:

```typespec
model Input {
  @field(1) exampleField: string;
}

model Output {
  @field(1) parsed: uint32;
}

@Protobuf.service
interface Example {
  testOperation(...Input): Output;
}
```

Results in the following `.proto` file:

```protobuf
message Input {
  string exampleField = 1;
}

message Output {
  uint32 parsed = 1;
}

service Example {
  rpc TestOperation(Input) returns (Output);
}
```

#### Streams

The Protobuf emitter supports the declaration of an operation's streaming mode using the [`TypeSpec.Protobuf.stream` decorator][protobuf-stream]. The streaming mode is defined using the [`StreamMode`][protobuf-stream-mode] enum. An operation can have one of four streaming modes:

- `None`: This is the default mode, indicating that neither the request nor the response are streamed.

  Example: `rpc Example(In) returns (Out);`

- `In`: This mode indicates that the request is streamed, but the response is received synchronously.

  Example: `rpc Example(stream In) returns (Out);`

- `Out`: This mode indicates that the request is sent synchronously, but the response is streamed.

  Example: `rpc Example(In) returns (stream Out);`

- `Duplex`: This mode indicates that both the request and response are streamed.

  Example: `rpc Example(stream In) returns (stream Out);`

#### Long-running operations

A long-running operation ([AIP-151](https://google.aip.dev/151)) returns a `google.longrunning.Operation` that the client polls through the standard `google.longrunning.Operations` service until it is done. Return [`LongRunningOperation<Response, Metadata>`][protobuf-long-running] to declare the types of the operation's `response` and `metadata`:

```typespec
model ImportBooksResponse {
  @field(1) books: Book[];
}

model ImportBooksMetadata {
  @field(1) imported_count: int32;
}

@Protobuf.service
interface Library {
  importBooks(...ImportBooksRequest): LongRunningOperation<
    ImportBooksResponse,
    ImportBooksMetadata
  >;
}
```

The emitter writes the types in the method's `google.longrunning.operation_info` option, and emits and imports them like any other message the operation refers to. A type declared in another package is fully qualified.

```protobuf
import "google/longrunning/operations.proto";

service Library {
  rpc ImportBooks(ImportBooksRequest) returns (google.longrunning.Operation) {
    option (google.longrunning.operation_info) = {
      response_type: "ImportBooksResponse"
      metadata_type: "ImportBooksMetadata"
    };
  }
}
```

Use [`WellKnown.Empty`][protobuf-empty] as the response type of an operation that has no response. AIP-151 asks for a metadata message of the operation's own, even an empty one, rather than `WellKnown.Empty`. Code generators need `google/longrunning/operations.proto` and its imports from [googleapis](https://github.com/googleapis/googleapis) on their include path.

## Versioning

The Protobuf emitter integrates with [`@typespec/versioning`][versioning-guide] to generate versioned `.proto` packages aligned with [AIP-185](https://google.aip.dev/185) and [AIP-215](https://google.aip.dev/215).

### Versioned Packages

When a namespace is decorated with both [`@versioned`][versioning-versioned] and [`@package`][protobuf-package], the emitter generates a separate, self-contained `.proto` file for each version in the version enum:

- When [`PackageDetails.name`][protobuf-package-details] does not contain `{version}` (for example, `"acme.library"`), the emitter automatically appends `.{version}` to the Protobuf package name (`package acme.library.v1;` in `acme/library/v1.proto`, `package acme.library.v1beta;` in `acme/library/v1beta.proto`, and so on). If `name` is omitted, `.{version}` is appended to the namespace-derived package name.
- You can also explicitly interpolate `{version}` in `PackageDetails.name` (for example, `"acme.{version}.library"`) and in string-valued `PackageDetails.options` (such as `go_package`, `java_package`, and `csharp_namespace`).

```typespec
import "@typespec/protobuf";
import "@typespec/versioning";

using TypeSpec.Protobuf;
using TypeSpec.Versioning;

@versioned(Versions)
@package({
  name: "acme.library",
  options: {
    go_package: "github.com/acme/library/{version};library",
    java_package: "com.acme.library.{version}",
    csharp_namespace: "Acme.Library.{version}",
  },
})
namespace Acme.Library;

enum Versions {
  v1,
  v1beta,
}

model Book {
  @field(1) name: string;
  @field(2) title: string;

  @added(Versions.v1beta)
  @field(3)
  summary?: string;
}
```

Compiling this specification emits `acme/library/v1.proto`:

```protobuf
syntax = "proto3";

package acme.library.v1;

option go_package = "github.com/acme/library/v1;library";
option java_package = "com.acme.library.v1";
option csharp_namespace = "Acme.Library.v1";

message Book {
  string name = 1;
  string title = 2;
}
```

and `acme/library/v1beta.proto`:

```protobuf
syntax = "proto3";

package acme.library.v1beta;

option go_package = "github.com/acme/library/v1beta;library";
option java_package = "com.acme.library.v1beta";
option csharp_namespace = "Acme.Library.v1beta";

message Book {
  string name = 1;
  string title = 2;
  optional string summary = 3;
}
```

When a versioned package references another versioned `@package` namespace, use [`@useDependency`][versioning-use-dependency] on each version enum member to select the corresponding dependency version.

### Channel-Based Versioning and Evolution

In [AIP-185](https://google.aip.dev/185) channel-based versioning, each version enum member represents a stability channel or major version (for example, `v1`, `v1beta`, `v1alpha`, `v2`). Ordering channels from most stable to pre-release within a major version lets features accumulate in beta or alpha channels while keeping stable channels clean.

You can use TypeSpec's versioning decorators—[`@added`][versioning-added], [`@removed`][versioning-removed], [`@renamedFrom`][versioning-renamed-from], [`@typeChangedFrom`][versioning-type-changed-from], [`@madeOptional`][versioning-made-optional], and [`@madeRequired`][versioning-made-required]—to evolve messages, `oneof` unions, enums, and `@Protobuf.service` operations across channels and major versions:

```typespec
import "@typespec/protobuf";
import "@typespec/versioning";

using TypeSpec.Protobuf;
using TypeSpec.Versioning;

@versioned(Versions)
@package({
  name: "acme.library",
})
namespace Acme.Library;

enum Versions {
  v1,
  v1beta,
  v1alpha,
  v2,
}

enum BookState {
  BOOK_STATE_UNSPECIFIED: 0,
  BOOK_STATE_ACTIVE: 1,

  @added(Versions.v1beta)
  BOOK_STATE_ARCHIVED: 2,
}

union DeliveryTarget {
  @field(10) email: string,

  @added(Versions.v1alpha)
  @field(11)
  webhook: string,
}

model Book {
  @field(1) name: string;

  @madeOptional(Versions.v2)
  @field(2)
  isbn?: string;

  @madeRequired(Versions.v2)
  @field(3)
  title: string;

  @typeChangedFrom(Versions.v2, int32)
  @field(4)
  page_count: int64;

  @added(Versions.v1beta)
  @field(5)
  state: BookState;

  delivery?: DeliveryTarget;
}

model GetBookRequest {
  @field(1) name: string;
}

@Protobuf.service
interface LibraryService {
  getBook(...GetBookRequest): Book;

  @added(Versions.v1beta)
  @removed(Versions.v2)
  previewBook(...GetBookRequest): Book;
}
```

### Automatic Field Reservations

In Protocol Buffers, deleting or renaming a field without reserving its field number and name can corrupt wire payloads or JSON serialization if a later version reuses them.

When a `@field` property or `oneof` variant is removed with [`@removed`][versioning-removed] or renamed with [`@renamedFrom`][versioning-renamed-from], the Protobuf emitter automatically synthesizes `reserved` statements in the version where the change takes effect and all subsequent versions:

- Removing a field or `oneof` variant with `@removed` emits both `reserved <index>;` and `reserved "<name>";`.
- Renaming a field or `oneof` variant with `@renamedFrom(version, "old_name")` emits `reserved "old_name";` while keeping the field number on the renamed field.

Automatic reservations are merged with any explicit [`@reserve`][protobuf-reserve] annotations on the model or wrapper union.

```typespec
model Book {
  @field(1) name: string;

  @removed(Versions.v2)
  @field(2)
  legacy_code: string;

  @renamedFrom(Versions.v2, "author")
  @field(3)
  primary_author: string;
}
```

In `v1`, `Book` includes all original fields:

```protobuf
message Book {
  string name = 1;
  string legacy_code = 2;
  string author = 3;
}
```

In `v2`, the removed field index (`2`) and previous field names (`"legacy_code"` and `"author"`) are automatically reserved:

```protobuf
message Book {
  reserved 2;
  reserved "legacy_code", "author";

  string name = 1;
  string primary_author = 3;
}
```

### Deprecations

Declarations marked with TypeSpec's `#deprecated` directive are emitted with standard Protocol Buffers deprecation annotations:

- **Fields and enum values**: Emit `[deprecated = true]` on the field or enum value declaration.
- **Messages, enums, services, and RPC methods**: Emit `option deprecated = true;` inside the declaration block.

```typespec
#deprecated "Use BookV2 instead."
@message
model LegacyBook {
  @field(1) id: string;
}

enum BookFormat {
  BOOK_FORMAT_UNSPECIFIED: 0,
  #deprecated "Paperback format is being phased out."
  BOOK_FORMAT_PAPERBACK: 1,
  BOOK_FORMAT_EBOOK: 2,
}

model Book {
  @field(1) name: string;

  #deprecated "Use format instead."
  @field(2)
  legacy_format: string;

  @field(3) format: BookFormat;
}

#deprecated "Use LibraryService instead."
@Protobuf.service
interface LegacyLibraryService {
  getBook(...LegacyBook): Book;
}

@Protobuf.service
interface LibraryService {
  #deprecated "Use getBookV2 instead."
  getBook(...LegacyBook): Book;
}
```

This produces the following Protobuf definitions:

```protobuf
message LegacyBook {
  option deprecated = true;

  string id = 1;
}

enum BookFormat {
  BOOK_FORMAT_UNSPECIFIED = 0;
  BOOK_FORMAT_PAPERBACK = 1 [deprecated = true];
  BOOK_FORMAT_EBOOK = 2;
}

message Book {
  string name = 1;
  string legacy_format = 2 [deprecated = true];
  BookFormat format = 3;
}

service LegacyLibraryService {
  option deprecated = true;

  rpc GetBook(LegacyBook) returns (Book);
}

service LibraryService {
  rpc GetBook(LegacyBook) returns (Book) {
    option deprecated = true;
  }
}
```

### AIP-185 and AIP-215 Guardrails

To help keep versioned Protobuf definitions compliant with [AIP-185](https://google.aip.dev/185) and [AIP-215](https://google.aip.dev/215), the emitter reports warnings for common versioning anti-patterns:

- **`@typespec/protobuf/invalid-version-identifier`**: Emitted when a version in `@versioned` does not match the AIP-185 version identifier pattern (`v<major>[alpha|beta][<channelVersion>]`, such as `v1`, `v1beta`, `v1alpha`, `v1beta1`, or `v2`).
- **`@typespec/protobuf/cross-package-version-import`**: Emitted when a versioned package imports a declaration from another versioned package with a different version (for example, `acme.library.v2` importing from `acme.common.v1`). AIP-185 and AIP-215 require versioned packages to be self-contained and only import matching versions of peer packages.
- **`@typespec/protobuf/deprecated-channel-graduation`**: Emitted when a declaration added in a pre-release stability channel (such as `v1alpha` or `v1beta`) is marked `#deprecated` and graduates into a more stable channel or later major version (such as `v1` or `v2`) instead of being removed with `@removed`.

[native-service]: ../../../standard-library/built-in-decorators/#@service
[protobuf-service]: ../reference/decorators/#@TypeSpec.Protobuf.service
[protobuf-package]: ../reference/decorators/#@TypeSpec.Protobuf.package
[protobuf-package-details]: ../reference/data-types/#TypeSpec.Protobuf.PackageDetails
[protobuf-field]: ../reference/decorators/#@TypeSpec.Protobuf.field
[protobuf-reserve]: ../reference/decorators/#@TypeSpec.Protobuf.reserve
[protobuf-stream]: ../reference/decorators/#@TypeSpec.Protobuf.stream
[protobuf-stream-mode]: ../reference/data-types/#TypeSpec.Protobuf.StreamMode
[protobuf-message]: ../reference/decorators/#@TypeSpec.Protobuf.message
[protobuf-long-running]: ../reference/data-types/#TypeSpec.Protobuf.LongRunningOperation
[protobuf-empty]: ../reference/data-types/#TypeSpec.Protobuf.WellKnown.Empty
[versioning-guide]: ../../../libraries/versioning/guide/
[versioning-versioned]: ../../../libraries/versioning/reference/decorators/#@TypeSpec.Versioning.versioned
[versioning-use-dependency]: ../../../libraries/versioning/reference/decorators/#@TypeSpec.Versioning.useDependency
[versioning-added]: ../../../libraries/versioning/reference/decorators/#@TypeSpec.Versioning.added
[versioning-removed]: ../../../libraries/versioning/reference/decorators/#@TypeSpec.Versioning.removed
[versioning-renamed-from]: ../../../libraries/versioning/reference/decorators/#@TypeSpec.Versioning.renamedFrom
[versioning-type-changed-from]: ../../../libraries/versioning/reference/decorators/#@TypeSpec.Versioning.typeChangedFrom
[versioning-made-optional]: ../../../libraries/versioning/reference/decorators/#@TypeSpec.Versioning.madeOptional
[versioning-made-required]: ../../../libraries/versioning/reference/decorators/#@TypeSpec.Versioning.madeRequired
