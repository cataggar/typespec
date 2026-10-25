import type { Namespace } from "@typespec/compiler";
import { describe, expect, it } from "vitest";
import {
  ref,
  scalar,
  type ProtoFile,
  type ProtoOption,
  type ProtoTopLevelDeclaration,
} from "../src/ast.js";
import { writeProtoFile } from "../src/write.js";

function writeDeclarations(declarations: ProtoTopLevelDeclaration[]): string {
  const file: ProtoFile = {
    package: "example",
    options: {},
    imports: [],
    declarations,
    source: {} as Namespace,
  };

  return writeProtoFile(file);
}

function writeService(options?: ProtoOption[]): string {
  return writeDeclarations([
    {
      kind: "service",
      name: "Service",
      operations: [
        {
          kind: "method",
          stream: 0,
          name: "Run",
          input: ref("RunRequest"),
          returns: ref("RunResponse"),
          options,
        },
      ],
    },
  ]);
}

describe("method options", () => {
  it.each([undefined, []])("ends the rpc with a semicolon without options (%j)", (options) => {
    expect(writeService(options)).toContain(`service Service {
  rpc Run(RunRequest) returns (RunResponse);
}`);
  });

  it("writes scalar values", () => {
    expect(
      writeService([
        { name: "deprecated", value: true },
        { name: "(example.enabled)", value: false },
        { name: "(example.count)", value: 42 },
        { name: "(example.offset)", value: -7 },
        { name: "(example.ratio)", value: 1.5 },
        { name: "(example.label)", value: "plain" },
      ]),
    ).toContain(`service Service {
  rpc Run(RunRequest) returns (RunResponse) {
    option deprecated = true;
    option (example.enabled) = false;
    option (example.count) = 42;
    option (example.offset) = -7;
    option (example.ratio) = 1.5;
    option (example.label) = "plain";
  }
}`);
  });

  it("escapes quotes, backslashes, and whitespace in strings", () => {
    expect(
      writeService([
        {
          name: "(example.label)",
          value: 'say "hi" from C:\\path\\\nline\r\tend',
        },
        { name: "(example.info)", value: { text: '\\"\n' } },
      ]),
    ).toContain(`  rpc Run(RunRequest) returns (RunResponse) {
    option (example.label) = "say \\"hi\\" from C:\\\\path\\\\\\nline\\r\\tend";
    option (example.info) = {
      text: "\\\\\\"\\n"
    };
  }`);
  });

  it("writes nested message literals with increasing indentation", () => {
    expect(
      writeService([
        {
          name: "(example.info)",
          value: {
            name: "outer",
            inner: {
              count: 2,
              enabled: true,
              deepest: { ratio: 0.25 },
            },
            empty: {},
            after: "last",
          },
        },
      ]),
    ).toContain(`  rpc Run(RunRequest) returns (RunResponse) {
    option (example.info) = {
      name: "outer"
      inner {
        count: 2
        enabled: true
        deepest {
          ratio: 0.25
        }
      }
      empty {
      }
      after: "last"
    };
  }`);
  });

  it("writes an empty message literal", () => {
    expect(writeService([{ name: "(example.info)", value: {} }])).toContain(
      `  rpc Run(RunRequest) returns (RunResponse) {
    option (example.info) = {
    };
  }`,
    );
  });
});

describe("deprecated options", () => {
  it("writes deprecated option on messages and fields", () => {
    expect(
      writeDeclarations([
        {
          kind: "message",
          name: "EmptyDeprecated",
          deprecated: true,
          declarations: [],
        },
        {
          kind: "message",
          name: "DeprecatedMessage",
          deprecated: true,
          reservations: [2],
          declarations: [
            {
              kind: "field",
              name: "old_field",
              type: scalar("string"),
              index: 1,
              options: { deprecated: true },
            },
            {
              kind: "field",
              name: "values",
              repeated: true,
              type: scalar("int32"),
              index: 3,
              options: { packed: true, deprecated: true },
            },
          ],
        },
      ]),
    ).toContain(`message EmptyDeprecated {
  option deprecated = true;
}

message DeprecatedMessage {
  option deprecated = true;

  reserved 2;

  string old_field = 1 [deprecated = true];
  repeated int32 values = 3 [packed = true, deprecated = true];
}`);
  });

  it("writes deprecated option on enums and enum variants", () => {
    expect(
      writeDeclarations([
        {
          kind: "enum",
          name: "Status",
          deprecated: true,
          allowAlias: true,
          variants: [
            {
              kind: "variant",
              name: "STATUS_UNSPECIFIED",
              value: 0,
            },
            {
              kind: "variant",
              name: "STATUS_LEGACY",
              value: 1,
              deprecated: true,
            },
          ],
        },
      ]),
    ).toContain(`enum Status {
  option deprecated = true;
  option allow_alias = true;

  STATUS_UNSPECIFIED = 0;
  STATUS_LEGACY = 1 [deprecated = true];
}`);
  });

  it("writes deprecated option on services and rpc methods", () => {
    expect(
      writeDeclarations([
        {
          kind: "service",
          name: "EmptyDeprecatedService",
          deprecated: true,
          operations: [],
        },
        {
          kind: "service",
          name: "LegacyService",
          deprecated: true,
          operations: [
            {
              kind: "method",
              stream: 0,
              name: "OldCall",
              input: ref("RunRequest"),
              returns: ref("RunResponse"),
              options: [{ name: "deprecated", value: true }],
            },
          ],
        },
      ]),
    ).toContain(`service EmptyDeprecatedService {
  option deprecated = true;
}

service LegacyService {
  option deprecated = true;

  rpc OldCall(RunRequest) returns (RunResponse) {
    option deprecated = true;
  }
}`);
  });
});
