import { getCompilerPackageRoot } from "../core/node-host.js";
import { resolvePath } from "../core/path-utils.js";
import type { SystemHost } from "../core/types.js";

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
