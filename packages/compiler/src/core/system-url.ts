export interface SystemUrl {
  fileURLToPath(url: string): string;
  pathToFileURL(path: string): URL;
}

let systemUrl: SystemUrl | undefined;
export function setSystemUrl(impl: SystemUrl) {
  systemUrl = impl;
}
export function getSystemUrl(): SystemUrl {
  if (!systemUrl) {
    throw new Error("SystemUrl has not been set.");
  }
  return systemUrl;
}
