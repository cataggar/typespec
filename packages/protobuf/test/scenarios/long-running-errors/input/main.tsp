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

alias ArrayOperation = LongRunning<Result[], Metadata>;
alias WithMetadata<M extends Reflection.Model> = LongRunning<Result[], M>;
alias Swapped<M extends Reflection.Model, R extends Reflection.Model> = LongRunning<R, M>;

@Protobuf.service
interface Service {
  arrayResponse(@field(1) id: string): LongRunning<Result[], Metadata>;
  recordMetadata(@field(1) id: string): LongRunning<Result, Record<string>>;
  anonymousAndMap(@field(1) id: string): LongRunning<{}, Map<string, Metadata>>;

  // Without the invalid type among the written template arguments, the error points at the return type.
  aliased(@field(1) id: string): ArrayOperation;
  wrapped(@field(1) id: string): WithMetadata<Metadata>;

  // Otherwise it points at the template argument whose type is invalid.
  swapped(@field(1) id: string): Swapped<Record<string>, Result>;
  named(@field(1) id: string): LongRunning<Metadata = Metadata, Response = Result[]>;
  same(@field(1) id: string): LongRunning<Result[], Result[]>;
}
