export interface SystemGlobby {
  globby(patterns: string | string[], options?: any): Promise<string[]>;
}

let globbyImpl: SystemGlobby;
export function setSystemGlobby(impl: SystemGlobby) {
  globbyImpl = impl;
}
export { globbyImpl as systemGlobby };
