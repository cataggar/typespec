// SystemAssert interface for pluggable assertion implementations
export interface SystemAssert {
  fail(message?: string): never;
  strictEqual(actual: any, expected: any, message?: string): void;
  match(value: string, regex: RegExp, message?: string): void;
}
