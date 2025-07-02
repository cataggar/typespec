import { fileURLToPath as nodeFileURLToPath, pathToFileURL as nodePathToFileURL } from "url";
import { SystemUrl } from "./system-url.js";

export const NodeUrl: SystemUrl = {
  fileURLToPath: nodeFileURLToPath,
  pathToFileURL: nodePathToFileURL,
};
