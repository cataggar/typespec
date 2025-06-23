import { assert } from "../../src/testing/system-assert.js";
import { describe, it } from "vitest";
import { parseMimeType } from "../../src/core/mime-type.js";

describe("compiler: mime-type utils", () => {
  it("return undefined if invalid mime type", () => {
    assert.strictEqual(parseMimeType("foo/bar/baz"), undefined);
  });

  it("parse simple mime types", () => {
    assert.deepStrictEqual(parseMimeType("application/json"), { type: "application", subtype: "json" });
  });

  it("parse mime types with suffix", () => {
    assert.deepStrictEqual(parseMimeType("application/merge-patch+json"), {
      type: "application",
      subtype: "merge-patch",
      suffix: "json",
    });
  });
});
