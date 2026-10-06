import "@typespec/protobuf";

using Protobuf;

@package({
  name: "example.library.v1",
})
namespace Library {
  model Book {
    @field(1) name: string;
    @field(2) title: string;
  }

  model ImportBooksRequest {
    @field(1) source_uri: string;
  }

  model ImportBooksResponse {
    @field(1) books: Book[];
  }

  model DeleteShelfRequest {
    @field(1) name: string;
  }

  // Only `@operationInfo` refers to the metadata and response; they are emitted even with
  // `omit-unreachable-types`.
  model ImportBooksMetadata {
    @field(1) common: Shared.OperationMetadata;
    @field(2) imported_count: int32;
  }

  @Protobuf.service
  interface LibraryService {
    getBook(@field(1) name: string): Book;

    /**
     * Imports books into the library.
     */
    @operationInfo(ImportBooksResponse, ImportBooksMetadata)
    importBooks(...ImportBooksRequest): WellKnown.Operation;

    @operationInfo(WellKnown.Empty, Shared.OperationMetadata)
    deleteShelf(...DeleteShelfRequest): WellKnown.Operation;
  }
}

@package({
  name: "example.shared",
})
namespace Shared {
  model OperationMetadata {
    @field(1) create_time: WellKnown.Timestamp;
    @field(2) requested_cancellation: boolean;
  }
}
