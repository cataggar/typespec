// SystemAssert interface for pluggable assertion implementations
export interface SystemAssert {
  fail(message?: string): never;
  strictEqual(actual: any, expected: any, message?: string): void;
  notStrictEqual(actual: any, expected: any, message?: string): void;
  deepStrictEqual(actual: any, expected: any, message?: string): void;
  match(value: string, regex: RegExp, message?: string): void;
  ok(value: any, message?: string): void;
}

let assert: SystemAssert;
export function setSystemAssert(impl: SystemAssert) {
  assert = impl;
}
export { assert };
