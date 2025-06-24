export interface SystemPath {
  dirname(path: string): string;
  join(...paths: string[]): string;
  resolve(...paths: string[]): string;
  normalize(path: string): string;
}

let pathImpl: SystemPath;
export function setSystemPath(impl: SystemPath) {
  pathImpl = impl;
}
export { pathImpl as systemPath };
