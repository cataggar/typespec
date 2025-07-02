export interface SystemUrl {
  fileURLToPath(url: string): string;
  pathToFileURL(path: string): URL;
}

let systemUrl: SystemUrl;
export function setSystemUrl(impl: SystemUrl) {
  systemUrl = impl;
}
export { systemUrl };
