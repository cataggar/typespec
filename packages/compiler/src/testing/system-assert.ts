type AssertPredicate =
  | RegExp
  | (new () => object)
  | ((thrown: unknown) => boolean)
  | object
  | Error;

export interface SystemAssert {
  fail(message?: string | Error): never;
  strictEqual<T>(actual: unknown, expected: T, message?: string | Error): asserts actual is T;
  notStrictEqual(actual: unknown, expected: unknown, message?: string | Error): void;
  deepStrictEqual<T>(actual: unknown, expected: T, message?: string | Error): asserts actual is T;
  match(value: string, regExp: RegExp, message?: string | Error): void;
  ok(value: unknown, message?: string | Error): asserts value;
  rejects(
    block: (() => Promise<unknown>) | Promise<unknown>,
    message?: string | Error,
  ): Promise<void>;
  rejects(
    block: (() => Promise<unknown>) | Promise<unknown>,
    message?: string | Error,
  ): Promise<void>;
  rejects(
    block: (() => Promise<unknown>) | Promise<unknown>,
    error: AssertPredicate,
    message?: string | Error,
  ): Promise<void>;
  equal(actual: unknown, expected: unknown, message?: string | Error): void;
}

let assert: SystemAssert;
export function setSystemAssert(impl: SystemAssert) {
  assert = impl;
}
export { assert };
