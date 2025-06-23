import assert from "assert";
import type { SystemAssert } from "./system-assert.js";

// Node.js implementation using built-in 'assert' module
export const NodeAssert: SystemAssert = {
  fail(message) {
    assert.fail(message);
  },
  strictEqual(actual, expected, message) {
    assert.strictEqual(actual, expected, message);
  },
  notStrictEqual(actual, expected, message) {
    assert.notStrictEqual(actual, expected, message);
  },
  deepStrictEqual(actual, expected, message) {
    assert.deepStrictEqual(actual, expected, message);
  },
  match(value, regExp, message) {
    assert.match(value, regExp, message);
  },
  ok(value, message) {
    assert.ok(value, message);
  },
  async rejects(block, message) {
    await assert.rejects(block, message);
  },
};
