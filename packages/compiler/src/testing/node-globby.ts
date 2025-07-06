import { globby as nodeGlobby } from "globby";
import type { SystemGlobby } from "./system-globby.js";

export const NodeGlobby: SystemGlobby = {
  globby: nodeGlobby,
};
