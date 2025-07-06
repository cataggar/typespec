import { resolvePath } from "../core/path-utils.js";
import { fsPromises } from "../core/system-fs-promises.js";
import { getSystemUrl } from "../core/system-url.js";
import type { SystemHost } from "../core/types.js";
import { findProjectRoot } from "../utils/io.js";

async function getCompilerPackageRoot(): Promise<string> {
  const root = await findProjectRoot(
    fsPromises.stat,
    getSystemUrl().fileURLToPath(import.meta.url),
  );
  if (!root) {
    throw new Error("Could not find the compiler package root.");
  }
  return root;
}

let templatesDirPromise: Promise<string> | undefined;
async function getTemplatesDir(): Promise<string> {
  if (!templatesDirPromise) {
    templatesDirPromise = getCompilerPackageRoot().then((root) => resolvePath(root, "templates"));
  }
  return templatesDirPromise;
}
export interface LoadedCoreTemplates {
  readonly baseUri: string;
  readonly templates: Record<string, any>;
}

let typeSpecCoreTemplates: LoadedCoreTemplates | undefined;
export async function getTypeSpecCoreTemplates(host: SystemHost): Promise<LoadedCoreTemplates> {
  if (typeSpecCoreTemplates === undefined) {
    const templatesDir = await getTemplatesDir();
    const file = await host.readFile(resolvePath(templatesDir, "scaffolding.json"));
    const content = JSON.parse(file.text);
    typeSpecCoreTemplates = {
      baseUri: templatesDir,
      templates: content,
    };
  }
  return typeSpecCoreTemplates;
}
