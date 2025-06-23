export interface SystemFsPromises {
  readdir(path: string): Promise<string[]>;
  readFile(path: string, encoding: BufferEncoding): Promise<string>;
  stat(path: string): Promise<{ isFile(): boolean; isDirectory(): boolean }>;
}

let fsPromises: SystemFsPromises;
export function setSystemFsPromises(impl: SystemFsPromises) {
  fsPromises = impl;
}
export { fsPromises };
