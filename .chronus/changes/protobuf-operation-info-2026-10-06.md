---
changeKind: feature
packages:
  - "@typespec/protobuf"
---

Add the `@operationInfo` decorator and `WellKnown.Operation` for long-running operations ([AIP-151](https://google.aip.dev/151)). An operation that returns `WellKnown.Operation` (`google.longrunning.Operation`) declares its response and metadata types with `@operationInfo`, and the emitter writes them in the method's `google.longrunning.operation_info` option.

```tsp
@operationInfo(ImportBooksResponse, ImportBooksMetadata)
importBooks(...ImportBooksRequest): WellKnown.Operation;
```

```proto
rpc ImportBooks(ImportBooksRequest) returns (google.longrunning.Operation) {
  option (google.longrunning.operation_info) = {
    response_type: "ImportBooksResponse"
    metadata_type: "ImportBooksMetadata"
  };
}
```
