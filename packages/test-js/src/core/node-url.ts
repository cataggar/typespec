import { fileURLToPath as nodeFileURLToPath, pathToFileURL as nodePathToFileURL } from "url";
import { SystemUrl } from "../../../compiler-show/dist";

export const NodeUrl: SystemUrl = {
  fileURLToPath: nodeFileURLToPath,
  pathToFileURL: nodePathToFileURL,
};
