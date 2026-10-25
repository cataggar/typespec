import { resolvePath } from "@typespec/compiler";
import { createTester, expectDiagnostics } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import {
  interpolatePackageOptionsForVersion,
  parseAipVersion,
  resolvePackageNameForVersion,
} from "../src/versioning.js";
import { packageRoot } from "./tester.js";

const VersioningTester = createTester(resolvePath(packageRoot), {
  libraries: ["@typespec/protobuf", "@typespec/versioning"],
})
  .importLibraries()
  .using("Protobuf", "Versioning")
  .emit("@typespec/protobuf");

describe("versioning: package and file naming (AIP-185 / AIP-215)", () => {
  it("auto-appends .{version} when @package name has no {version} placeholder", async () => {
    const result = await VersioningTester.compile(`
      @versioned(Versions)
      @package({ name: "acme.library" })
      namespace Acme.Library;

      enum Versions {
        v1,
        v1beta,
        v1alpha,
        v2,
      }

      model Book {
        @field(1) id: string;
      }
    `);

    expect(Object.keys(result.outputs).sort()).toEqual([
      "acme/library/v1.proto",
      "acme/library/v1alpha.proto",
      "acme/library/v1beta.proto",
      "acme/library/v2.proto",
    ]);
    expect(result.outputs["acme/library/v1.proto"]).toContain("package acme.library.v1;");
    expect(result.outputs["acme/library/v1beta.proto"]).toContain("package acme.library.v1beta;");
    expect(result.outputs["acme/library/v1alpha.proto"]).toContain("package acme.library.v1alpha;");
    expect(result.outputs["acme/library/v2.proto"]).toContain("package acme.library.v2;");
  });

  it("interpolates explicit {version} placeholder in PackageDetails.name", async () => {
    const result = await VersioningTester.compile(`
      @versioned(Versions)
      @package({ name: "acme.{version}.library" })
      namespace Acme.Library;

      enum Versions {
        v1,
        v2,
      }

      model Book {
        @field(1) id: string;
      }
    `);

    expect(Object.keys(result.outputs).sort()).toEqual([
      "acme/v1/library.proto",
      "acme/v2/library.proto",
    ]);
    expect(result.outputs["acme/v1/library.proto"]).toContain("package acme.v1.library;");
    expect(result.outputs["acme/v2/library.proto"]).toContain("package acme.v2.library;");
  });

  it("defaults versioned @package without name to <version>.proto with package <version>", async () => {
    const result = await VersioningTester.compile(`
      @versioned(Versions)
      @package
      namespace Acme.Library;

      enum Versions {
        v1,
        v2,
      }

      model Book {
        @field(1) id: string;
      }
    `);

    expect(Object.keys(result.outputs).sort()).toEqual(["v1.proto", "v2.proto"]);
    expect(result.outputs["v1.proto"]).toContain("package v1;");
    expect(result.outputs["v2.proto"]).toContain("package v2;");
  });

  it("interpolates {version} in string-valued PackageDetails.options and preserves non-strings", async () => {
    const result = await VersioningTester.compile(`
      @versioned(Versions)
      @package({
        name: "acme.library",
        options: {
          go_package: "acme.com/genproto/library/{version};library",
          java_package: "com.acme.library.{version}",
          cc_enable_arenas: true,
        },
      })
      namespace Acme.Library;

      enum Versions {
        v1,
        v1beta,
      }

      model Book {
        @field(1) id: string;
      }
    `);

    expect(result.outputs["acme/library/v1.proto"]).toContain(
      `option go_package = "acme.com/genproto/library/v1;library";\noption java_package = "com.acme.library.v1";\noption cc_enable_arenas = true;`,
    );
    expect(result.outputs["acme/library/v1beta.proto"]).toContain(
      `option go_package = "acme.com/genproto/library/v1beta;library";\noption java_package = "com.acme.library.v1beta";\noption cc_enable_arenas = true;`,
    );
  });
});

describe("versioning: channel superset semantics and evolution", () => {
  it("evolves message fields with @added and @removed across v1, v1beta, v1alpha, and v2", async () => {
    const result = await VersioningTester.compile(`
      @versioned(Versions)
      @package({ name: "acme.library" })
      namespace Acme.Library;

      enum Versions {
        v1,
        v1beta,
        v1alpha,
        v2,
      }

      model Book {
        @field(1) name: string;

        @added(Versions.v1beta)
        @field(2)
        rating?: int32;

        @added(Versions.v1alpha)
        @removed(Versions.v2)
        @field(3)
        experimental_tag?: string;

        @added(Versions.v2)
        @field(4)
        isbn: string;
      }
    `);

    expect(result.outputs["acme/library/v1.proto"]).toContain(`message Book {
  string name = 1;
}`);
    expect(result.outputs["acme/library/v1beta.proto"]).toContain(`message Book {
  string name = 1;
  optional int32 rating = 2;
}`);
    expect(result.outputs["acme/library/v1alpha.proto"]).toContain(`message Book {
  string name = 1;
  optional int32 rating = 2;
  optional string experimental_tag = 3;
}`);
    expect(result.outputs["acme/library/v2.proto"]).toContain(`message Book {
  reserved 3;
  reserved "experimental_tag";

  string name = 1;
  optional int32 rating = 2;
  string isbn = 4;
}`);
  });

  it("supports @renamedFrom on message fields, models, enums, enum members, and operations", async () => {
    const result = await VersioningTester.compile(`
      @versioned(Versions)
      @package({ name: "acme.library" })
      namespace Acme.Library;

      enum Versions {
        v1,
        v2,
      }

      @renamedFrom(Versions.v2, "LegacyStatus")
      enum BookStatus {
        STATUS_UNSPECIFIED: 0,
        @renamedFrom(Versions.v2, "STATUS_DRAFT_OLD")
        STATUS_DRAFT: 1,
      }

      @renamedFrom(Versions.v2, "LegacyBook")
      model Book {
        @field(1) id: string;

        @renamedFrom(Versions.v2, "book_name")
        @field(2)
        title: string;

        @field(3) status: BookStatus;
      }

      model GetBookRequest {
        @field(1) id: string;
      }

      @Protobuf.service
      interface LibraryService {
        @renamedFrom(Versions.v2, "fetchBook")
        getBook(...GetBookRequest): Book;
      }
    `);

    const v1 = result.outputs["acme/library/v1.proto"];
    expect(v1).toContain(`enum LegacyStatus {
  STATUS_UNSPECIFIED = 0;
  STATUS_DRAFT_OLD = 1;
}`);
    expect(v1).toContain(`message LegacyBook {
  string id = 1;
  string book_name = 2;
  LegacyStatus status = 3;
}`);
    expect(v1).toContain(`service LibraryService {
  rpc FetchBook(GetBookRequest) returns (LegacyBook);
}`);

    const v2 = result.outputs["acme/library/v2.proto"];
    expect(v2).toContain(`enum BookStatus {
  STATUS_UNSPECIFIED = 0;
  STATUS_DRAFT = 1;
}`);
    expect(v2).toContain(`message Book {
  reserved "book_name";

  string id = 1;
  string title = 2;
  BookStatus status = 3;
}`);
    expect(v2).toContain(`service LibraryService {
  rpc GetBook(GetBookRequest) returns (Book);
}`);
  });

  it("supports @typeChangedFrom, @madeOptional, and @madeRequired on message fields", async () => {
    const result = await VersioningTester.compile(`
      @versioned(Versions)
      @package({ name: "acme.library" })
      namespace Acme.Library;

      enum Versions {
        v1,
        v2,
      }

      model Book {
        @typeChangedFrom(Versions.v2, int32)
        @field(1)
        page_count: int64;

        @madeOptional(Versions.v2)
        @field(2)
        subtitle?: string;

        @madeRequired(Versions.v2)
        @field(3)
        isbn: string;
      }
    `);

    expect(result.outputs["acme/library/v1.proto"]).toContain(`message Book {
  int32 page_count = 1;
  string subtitle = 2;
  optional string isbn = 3;
}`);
    expect(result.outputs["acme/library/v2.proto"]).toContain(`message Book {
  int64 page_count = 1;
  optional string subtitle = 2;
  string isbn = 3;
}`);
  });

  it("supports @added and @removed on top-level @message models, enums, enum members, services, and RPCs", async () => {
    const result = await VersioningTester.compile(`
      @versioned(Versions)
      @package({ name: "acme.library" })
      namespace Acme.Library;

      enum Versions {
        v1,
        v1beta,
        v2,
      }

      enum ShelfState {
        SHELF_STATE_UNSPECIFIED: 0,
        SHELF_STATE_OPEN: 1,

        @added(Versions.v1beta)
        @removed(Versions.v2)
        SHELF_STATE_TEMP: 2,

        @added(Versions.v2)
        SHELF_STATE_ARCHIVED: 3,
      }

      @added(Versions.v2)
      enum V2Category {
        V2_CATEGORY_UNSPECIFIED: 0,
        V2_CATEGORY_FICTION: 1,
      }

      @removed(Versions.v2)
      @message
      model LegacyMetadata {
        @field(1) notes: string;
      }

      @added(Versions.v2)
      @message
      model AuditRecord {
        @field(1) actor: string;
        @field(2) category: V2Category;
      }

      model Shelf {
        @field(1) name: string;
        @field(2) state: ShelfState;
      }

      model GetShelfRequest {
        @field(1) name: string;
      }

      @Protobuf.service
      interface ShelfService {
        getShelf(...GetShelfRequest): Shelf;

        @added(Versions.v1beta)
        @removed(Versions.v2)
        previewShelf(...GetShelfRequest): Shelf;
      }

      @added(Versions.v2)
      @Protobuf.service
      interface AdminShelfService {
        auditShelf(...GetShelfRequest): AuditRecord;
      }
    `);

    const v1 = result.outputs["acme/library/v1.proto"];
    expect(v1).toContain("message LegacyMetadata {");
    expect(v1).not.toContain("message AuditRecord");
    expect(v1).not.toContain("enum V2Category");
    expect(v1).toContain(`enum ShelfState {
  SHELF_STATE_UNSPECIFIED = 0;
  SHELF_STATE_OPEN = 1;
}`);
    expect(v1).toContain(`service ShelfService {
  rpc GetShelf(GetShelfRequest) returns (Shelf);
}`);
    expect(v1).not.toContain("service AdminShelfService");

    const v1beta = result.outputs["acme/library/v1beta.proto"];
    expect(v1beta).toContain(`enum ShelfState {
  SHELF_STATE_UNSPECIFIED = 0;
  SHELF_STATE_OPEN = 1;
  SHELF_STATE_TEMP = 2;
}`);
    expect(v1beta).toContain(`service ShelfService {
  rpc GetShelf(GetShelfRequest) returns (Shelf);
  rpc PreviewShelf(GetShelfRequest) returns (Shelf);
}`);

    const v2 = result.outputs["acme/library/v2.proto"];
    expect(v2).not.toContain("message LegacyMetadata");
    expect(v2).toContain("message AuditRecord {");
    expect(v2).toContain("enum V2Category {");
    expect(v2).toContain(`enum ShelfState {
  SHELF_STATE_UNSPECIFIED = 0;
  SHELF_STATE_OPEN = 1;
  SHELF_STATE_ARCHIVED = 3;
}`);
    expect(v2).toContain(`service ShelfService {
  rpc GetShelf(GetShelfRequest) returns (Shelf);
}`);
    expect(v2).toContain(`service AdminShelfService {
  rpc AuditShelf(GetShelfRequest) returns (AuditRecord);
}`);
  });

  it("supports versioning on inline oneof properties and wrapper-message unions", async () => {
    const result = await VersioningTester.compile(`
      @versioned(Versions)
      @package({ name: "acme.orders" })
      namespace Acme.Orders;

      enum Versions {
        v1,
        v1beta,
        v2,
      }

      union Payment {
        @field(10) card: string,

        @added(Versions.v1beta)
        @removed(Versions.v2)
        @field(11)
        voucher: string,

        @renamedFrom(Versions.v2, "wire")
        @field(12)
        bank_transfer: string,

        @added(Versions.v2)
        @field(13)
        wallet: string,
      }

      model InlineOrder {
        @field(1) id: string;
        payment?: Payment;
      }

      model WrapperOrder {
        @field(1) id: string;
        @field(2) payment: Payment;
      }
    `);

    const v1 = result.outputs["acme/orders/v1.proto"];
    expect(v1).toContain(`message InlineOrder {
  string id = 1;
  oneof payment {
    string card = 10;
    string wire = 12;
  }
}`);
    expect(v1).toContain(`message Payment {
  oneof value {
    string card = 10;
    string wire = 12;
  }
}`);

    const v1beta = result.outputs["acme/orders/v1beta.proto"];
    expect(v1beta).toContain(`message InlineOrder {
  string id = 1;
  oneof payment {
    string card = 10;
    string voucher = 11;
    string wire = 12;
  }
}`);
    expect(v1beta).toContain(`message Payment {
  oneof value {
    string card = 10;
    string voucher = 11;
    string wire = 12;
  }
}`);

    const v2 = result.outputs["acme/orders/v2.proto"];
    expect(v2).toContain(`message InlineOrder {
  reserved 11;
  reserved "voucher", "wire";

  string id = 1;
  oneof payment {
    string card = 10;
    string bank_transfer = 12;
    string wallet = 13;
  }
}`);
    expect(v2).toContain(`message Payment {
  reserved 11;
  reserved "voucher", "wire";

  oneof value {
    string card = 10;
    string bank_transfer = 12;
    string wallet = 13;
  }
}`);
  });
});

describe("versioning: automatic reserved synthesis", () => {
  it("reserves removed field number and name only in versions after it was added and then removed", async () => {
    const result = await VersioningTester.compile(`
      @versioned(Versions)
      @package({ name: "acme.library" })
      namespace Acme.Library;

      enum Versions {
        v1,
        v1beta,
        v1alpha,
        v2,
      }

      model Book {
        @field(1) id: string;

        @field(4)
        @added(Versions.v1alpha)
        @removed(Versions.v2)
        experimental_summary?: string;
      }
    `);

    expect(result.outputs["acme/library/v1.proto"]).toContain(`message Book {
  string id = 1;
}`);
    expect(result.outputs["acme/library/v1.proto"]).not.toContain("reserved");

    expect(result.outputs["acme/library/v1beta.proto"]).toContain(`message Book {
  string id = 1;
}`);
    expect(result.outputs["acme/library/v1beta.proto"]).not.toContain("reserved");

    expect(result.outputs["acme/library/v1alpha.proto"]).toContain(`message Book {
  string id = 1;
  optional string experimental_summary = 4;
}`);
    expect(result.outputs["acme/library/v1alpha.proto"]).not.toContain("reserved");

    expect(result.outputs["acme/library/v2.proto"]).toContain(`message Book {
  reserved 4;
  reserved "experimental_summary";

  string id = 1;
}`);
  });

  it("reserves only the old field name (not the field index) when a field is renamed with @renamedFrom", async () => {
    const result = await VersioningTester.compile(`
      @versioned(Versions)
      @package({ name: "acme.library" })
      namespace Acme.Library;

      enum Versions {
        v1,
        v2,
      }

      model Book {
        @field(1) id: string;

        @renamedFrom(Versions.v2, "old_title")
        @field(2)
        title: string;
      }
    `);

    expect(result.outputs["acme/library/v1.proto"]).toContain(`message Book {
  string id = 1;
  string old_title = 2;
}`);
    expect(result.outputs["acme/library/v1.proto"]).not.toContain("reserved");

    expect(result.outputs["acme/library/v2.proto"]).toContain(`message Book {
  reserved "old_title";

  string id = 1;
  string title = 2;
}`);
    expect(result.outputs["acme/library/v2.proto"]).not.toContain("reserved 2");
  });

  it("reserves all historical names and field index when a renamed field is later removed", async () => {
    const result = await VersioningTester.compile(`
      @versioned(Versions)
      @package({ name: "acme.library" })
      namespace Acme.Library;

      enum Versions {
        v1,
        v2,
        v3,
      }

      model Book {
        @field(1) id: string;

        @renamedFrom(Versions.v2, "old_title")
        @removed(Versions.v3)
        @field(2)
        title: string;
      }
    `);

    expect(result.outputs["acme/library/v2.proto"]).toContain(`message Book {
  reserved "old_title";

  string id = 1;
  string title = 2;
}`);
    expect(result.outputs["acme/library/v3.proto"]).toContain(`message Book {
  reserved 2;
  reserved "old_title", "title";

  string id = 1;
}`);
  });

  it("merges explicit @reserve with automatic @removed and @renamedFrom reservations", async () => {
    const result = await VersioningTester.compile(`
      @versioned(Versions)
      @package({ name: "acme.library" })
      namespace Acme.Library;

      enum Versions {
        v1,
        v2,
      }

      @reserve(10, #[20, 25], "legacy_manual")
      model Book {
        @field(1) id: string;

        @renamedFrom(Versions.v2, "old_title")
        @field(2)
        title: string;

        @removed(Versions.v2)
        @field(4)
        removed_field: string;
      }
    `);

    expect(result.outputs["acme/library/v1.proto"]).toContain(`message Book {
  reserved 10, 20 to 25;
  reserved "legacy_manual";

  string id = 1;
  string old_title = 2;
  string removed_field = 4;
}`);

    expect(result.outputs["acme/library/v2.proto"]).toContain(`message Book {
  reserved 10, 20 to 25, 4;
  reserved "legacy_manual", "old_title", "removed_field";

  string id = 1;
  string title = 2;
}`);
  });

  it("auto-reserves removed and renamed variants on inline oneof and @message wrapper union", async () => {
    const result = await VersioningTester.compile(`
      @versioned(Versions)
      @package({ name: "acme.library" })
      namespace Acme.Library;

      enum Versions {
        v1,
        v2,
      }

      @message
      union ContactChannel {
        @field(1) email: string,

        @removed(Versions.v2)
        @field(2)
        fax: string,

        @renamedFrom(Versions.v2, "pager")
        @field(3)
        sms: string,
      }

      model Author {
        @field(10) name: string;
        contact?: ContactChannel;
      }
    `);

    const v2 = result.outputs["acme/library/v2.proto"];
    expect(v2).toContain(`message Author {
  reserved 2;
  reserved "fax", "pager";

  string name = 10;
  oneof contact {
    string email = 1;
    string sms = 3;
  }
}`);
    expect(v2).toContain(`message ContactChannel {
  reserved 2;
  reserved "fax", "pager";

  oneof value {
    string email = 1;
    string sms = 3;
  }
}`);
  });
});

describe("versioning: deprecations (#deprecated)", () => {
  it("emits deprecated annotations on fields, enum variants, messages, enums, services, and RPC operations", async () => {
    const result = await VersioningTester.compile(`
      @package({ name: "acme.library.v1" })
      namespace Acme.Library;

      #deprecated "Use BookStatus instead."
      enum LegacyStatus {
        LEGACY_STATUS_UNSPECIFIED: 0,
        LEGACY_STATUS_ACTIVE: 1,
      }

      enum BookStatus {
        BOOK_STATUS_UNSPECIFIED: 0,
        #deprecated "Use BOOK_STATUS_PUBLISHED instead."
        BOOK_STATUS_OLD: 1,
        BOOK_STATUS_PUBLISHED: 2,
      }

      #deprecated "Use Book instead."
      @message
      model LegacyBook {
        @field(1) id: string;
        @field(2) status: LegacyStatus;
      }

      model Book {
        @field(1) id: string;

        #deprecated "Use title instead."
        @field(2)
        legacy_name: string;

        @field(3) status: BookStatus;
      }

      #deprecated "Use LibraryService instead."
      @Protobuf.service
      interface LegacyLibraryService {
        getLegacyBook(...LegacyBook): LegacyBook;
      }

      @Protobuf.service
      interface LibraryService {
        #deprecated "Use getBookV2 instead."
        getBook(...Book): Book;
      }
    `);

    const proto = result.outputs["acme/library/v1.proto"];
    expect(proto).toContain(`enum LegacyStatus {
  option deprecated = true;

  LEGACY_STATUS_UNSPECIFIED = 0;
  LEGACY_STATUS_ACTIVE = 1;
}`);
    expect(proto).toContain(`enum BookStatus {
  BOOK_STATUS_UNSPECIFIED = 0;
  BOOK_STATUS_OLD = 1 [deprecated = true];
  BOOK_STATUS_PUBLISHED = 2;
}`);
    expect(proto).toContain(`message LegacyBook {
  option deprecated = true;

  string id = 1;
  LegacyStatus status = 2;
}`);
    expect(proto).toContain(`message Book {
  string id = 1;
  string legacy_name = 2 [deprecated = true];
  BookStatus status = 3;
}`);
    expect(proto).toContain(`service LegacyLibraryService {
  option deprecated = true;

  rpc GetLegacyBook(LegacyBook) returns (LegacyBook);
}`);
    expect(proto).toContain(`service LibraryService {
  rpc GetBook(Book) returns (Book) {
    option deprecated = true;
  }
}`);
  });
});

describe("versioning: self-contained versioned packages and cross-package @useDependency", () => {
  it("resolves versioned imports when an unversioned @package uses @useDependency", async () => {
    const result = await VersioningTester.compile(`
      @versioned(Versions)
      @package({ name: "acme.shared" })
      namespace Acme.Shared {
        enum Versions {
          v1,
          v2,
        }

        model CommonItem {
          @field(1) id: string;
          @added(Versions.v2)
          @field(2)
          label?: string;
        }
      }

      @useDependency(Acme.Shared.Versions.v1)
      @package({ name: "acme.consumer" })
      namespace Acme.Consumer {
        model Order {
          @field(1) item: Acme.Shared.CommonItem;
        }
      }
    `);

    expect(result.outputs["acme/consumer.proto"]).toContain('import "acme/shared/v1.proto";');
    expect(result.outputs["acme/consumer.proto"]).toContain(
      `message Order {\n  acme.shared.v1.CommonItem item = 1;\n}`,
    );
  });

  it("maps matching versions across versioned @package namespaces via @useDependency", async () => {
    const result = await VersioningTester.compile(`
      @versioned(Versions)
      @package({ name: "acme.shared" })
      namespace Acme.Shared {
        enum Versions {
          v1,
          v2,
        }

        model CommonItem {
          @field(1) id: string;
        }
      }

      @versioned(Versions)
      @package({ name: "acme.service" })
      namespace Acme.Service {
        enum Versions {
          @useDependency(Acme.Shared.Versions.v1)
          v1,
          @useDependency(Acme.Shared.Versions.v2)
          v2,
        }

        model ServiceRecord {
          @field(1) shared: Acme.Shared.CommonItem;
        }
      }
    `);

    expect(result.outputs["acme/service/v1.proto"]).toContain('import "acme/shared/v1.proto";');
    expect(result.outputs["acme/service/v1.proto"]).toContain(
      `message ServiceRecord {\n  acme.shared.v1.CommonItem shared = 1;\n}`,
    );
    expect(result.outputs["acme/service/v2.proto"]).toContain('import "acme/shared/v2.proto";');
    expect(result.outputs["acme/service/v2.proto"]).toContain(
      `message ServiceRecord {\n  acme.shared.v2.CommonItem shared = 1;\n}`,
    );
  });
});

describe("versioning: AIP-185 / AIP-215 warning diagnostics", () => {
  it.each(["v1.0", "v1stable", "2024-01-01"])(
    "emits invalid-version-identifier warning for non-AIP version %s",
    async (badVersion) => {
      const [, diagnostics] = await VersioningTester.compileAndDiagnose(`
        @versioned(Versions)
        @package({ name: "acme.library" })
        namespace Acme.Library;

        enum Versions {
          v_bad: "${badVersion}",
        }

        model Book {
          @field(1) id: string;
        }
      `);

      expectDiagnostics(diagnostics, {
        code: "@typespec/protobuf/invalid-version-identifier",
        severity: "warning",
        message: `version '${badVersion}' does not follow AIP-185 channel-based versioning format (expected 'v<major>[alpha|beta][<channelVersion>]', such as 'v1', 'v1beta', 'v1alpha', or 'v1beta1')`,
      });
    },
  );

  it("emits cross-package-version-import warning when v2 imports v1 of another versioned package", async () => {
    const [, diagnostics] = await VersioningTester.compileAndDiagnose(`
      @versioned(Versions)
      @package({ name: "acme.shared" })
      namespace Acme.Shared {
        enum Versions {
          v1,
          v2,
        }

        model CommonItem {
          @field(1) id: string;
        }
      }

      @versioned(Versions)
      @package({ name: "acme.service" })
      namespace Acme.Service {
        enum Versions {
          @useDependency(Acme.Shared.Versions.v1)
          v1,
          @useDependency(Acme.Shared.Versions.v1)
          v2,
        }

        model ServiceRecord {
          @field(1) shared: Acme.Shared.CommonItem;
        }
      }
    `);

    expectDiagnostics(diagnostics, {
      code: "@typespec/protobuf/cross-package-version-import",
      severity: "warning",
      message:
        "package 'acme.service.v2' imports from versioned package 'acme.shared.v1' with a different version (AIP-185 / AIP-215 require versioned packages to be self-contained)",
    });
  });

  it("emits deprecated-channel-graduation warning when a #deprecated declaration added in alpha/beta graduates to stable", async () => {
    const [, diagnostics] = await VersioningTester.compileAndDiagnose(`
      @versioned(Versions)
      @package({ name: "acme.library" })
      namespace Acme.Library;

      enum Versions {
        v1,
        v1beta,
        v1alpha,
        v2,
      }

      model Book {
        @field(1) id: string;

        #deprecated "Experimental field that was deprecated before v2."
        @added(Versions.v1beta)
        @field(2)
        beta_field?: string;
      }

      #deprecated "Alpha message that was not removed before v2."
      @added(Versions.v1alpha)
      @message
      model AlphaExperiment {
        @field(1) note: string;
      }
    `);

    expectDiagnostics(diagnostics, [
      {
        code: "@typespec/protobuf/deprecated-channel-graduation",
        severity: "warning",
        message:
          "deprecated declaration 'beta_field' added in stability channel 'v1beta' should not graduate to 'v2' (AIP-185)",
      },
      {
        code: "@typespec/protobuf/deprecated-channel-graduation",
        severity: "warning",
        message:
          "deprecated declaration 'AlphaExperiment' added in stability channel 'v1alpha' should not graduate to 'v2' (AIP-185)",
      },
    ]);
  });

  it("does not emit deprecated-channel-graduation when a #deprecated pre-release declaration is @removed before stable", async () => {
    const result = await VersioningTester.compile(`
      @versioned(Versions)
      @package({ name: "acme.library" })
      namespace Acme.Library;

      enum Versions {
        v1,
        v1beta,
        v2,
      }

      model Book {
        @field(1) id: string;

        #deprecated "Deprecated in beta and removed in v2."
        @added(Versions.v1beta)
        @removed(Versions.v2)
        @field(2)
        beta_field?: string;
      }
    `);

    expect(result.outputs["acme/library/v1beta.proto"]).toContain(
      "optional string beta_field = 2 [deprecated = true];",
    );
    expect(result.outputs["acme/library/v2.proto"]).toContain('reserved "beta_field";');
  });
});

describe("versioning: helper unit tests", () => {
  it("parses valid AIP-185 / AIP-215 version identifiers and rejects invalid ones", () => {
    expect(parseAipVersion("v1")).toEqual({ major: 1, channel: "stable" });
    expect(parseAipVersion("v2")).toEqual({ major: 2, channel: "stable" });
    expect(parseAipVersion("v1beta")).toEqual({ major: 1, channel: "beta" });
    expect(parseAipVersion("v1alpha")).toEqual({ major: 1, channel: "alpha" });
    expect(parseAipVersion("v1beta1")).toEqual({ major: 1, channel: "beta", channelNumber: 1 });
    expect(parseAipVersion("v2alpha3")).toEqual({ major: 2, channel: "alpha", channelNumber: 3 });

    expect(parseAipVersion("v0")).toBeUndefined();
    expect(parseAipVersion("v1.0")).toBeUndefined();
    expect(parseAipVersion("v1stable")).toBeUndefined();
    expect(parseAipVersion("2024-01-01")).toBeUndefined();
  });

  it("resolves package names and options for version snapshots", () => {
    expect(resolvePackageNameForVersion("acme.library", undefined)).toBe("acme.library");
    expect(resolvePackageNameForVersion(undefined, "v1")).toBe("v1");
    expect(resolvePackageNameForVersion("", "v1")).toBe("v1");
    expect(resolvePackageNameForVersion("acme.library", "v1beta")).toBe("acme.library.v1beta");
    expect(resolvePackageNameForVersion("acme.{version}.library", "v2")).toBe("acme.v2.library");

    expect(
      interpolatePackageOptionsForVersion(
        [
          ["go_package", "acme.com/gen/{version};lib"],
          ["cc_enable_arenas", true],
        ],
        "v1",
      ),
    ).toEqual({
      go_package: "acme.com/gen/v1;lib",
      cc_enable_arenas: true,
    });
  });
});
