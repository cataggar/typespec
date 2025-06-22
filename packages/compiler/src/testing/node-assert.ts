import assert from "assert";
import type { SystemAssert } from "./system-assert.js";

// Node.js implementation using built-in 'assert' module
export const NodeAssert: SystemAssert = {
  fail(message?: string): never {
    assert.fail(message);
  },
  strictEqual(actual: any, expected: any, message?: string) {
    assert.strictEqual(actual, expected, message);
  },
  match(value: string, regex: RegExp, message?: string) {
    assert.match(value, regex, message);
  },
};
