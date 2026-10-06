import "@typespec/protobuf";

using Protobuf;

@package
namespace Test;

model Metadata {
  @field(1) progress: int32;
}

model Result {
  @field(1) id: string;
}

@Protobuf.service
interface Service {
  // Not a `google.longrunning.Operation`.
  @operationInfo(Result, Metadata)
  notLongRunning(@field(1) id: string): Result;

  @operationInfo(Result[], Metadata)
  arrayResponse(@field(1) id: string): WellKnown.Operation;

  @operationInfo(Result, Record<string>)
  recordMetadata(@field(1) id: string): WellKnown.Operation;

  @operationInfo({}, Map<string, Metadata>)
  anonymousAndMap(@field(1) id: string): WellKnown.Operation;

  // The last `@operationInfo` applies: errors point at its arguments, not at the overridden ones.
  @operationInfo(Result[], Metadata)
  derived is Templates.base;

  @operationInfo(Result, Metadata)
  augmented(@field(1) id: string): WellKnown.Operation;
}

interface Templates {
  @operationInfo(Result, Metadata)
  base(@field(1) id: string): WellKnown.Operation;
}

@@operationInfo(Service.augmented, Result, Record<string>);
