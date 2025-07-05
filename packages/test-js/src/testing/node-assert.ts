import assert from "assert";
import { SystemAssert } from "../../../compiler-show/dist";

export const NodeAssert: SystemAssert = {
  fail(message: string | Error | undefined) {
    assert.fail(message);
  },
  strictEqual(actual: unknown, expected: any, message: string | Error | undefined) {
    assert.strictEqual(actual, expected, message);
  },
  notStrictEqual(actual: unknown, expected: unknown, message: string | Error | undefined) {
    assert.notStrictEqual(actual, expected, message);
  },
  deepStrictEqual(actual: unknown, expected: any, message: string | Error | undefined) {
    assert.deepStrictEqual(actual, expected, message);
  },
  match(value: string, regExp: RegExp, message: string | Error | undefined) {
    assert.match(value, regExp, message);
  },
  ok(value: unknown, message: string | Error | undefined) {
    assert.ok(value, message);
  },
  async rejects(
    block: (() => Promise<unknown>) | Promise<unknown>,
    errorOrMessage?: any,
    message?: string,
  ): Promise<void> {
    if (typeof errorOrMessage === "string" && message === undefined) {
      await assert.rejects(block, errorOrMessage);
    } else if (errorOrMessage !== undefined) {
      await assert.rejects(block, errorOrMessage, message);
    } else {
      await assert.rejects(block);
    }
  },
  equal(actual: unknown, expected: unknown, message: string | Error | undefined) {
    assert.equal(actual, expected, message);
  },
};
