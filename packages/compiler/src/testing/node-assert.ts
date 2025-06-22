import type { SystemAssert } from "./system-assert.js";

// Node.js implementation using built-in 'assert' module
export const NodeAssert: SystemAssert = {
  fail(message?: string): never {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const assert = require("assert");
    assert.fail(message);
    throw new Error(message);
  },
  strictEqual(actual: any, expected: any, message?: string) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const assert = require("assert");
    assert.strictEqual(actual, expected, message);
  },
  match(value: string, regex: RegExp, message?: string) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const assert = require("assert");
    assert.match(value, regex, message);
  },
};
