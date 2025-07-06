import { globby as nodeGlobby } from "globby";
import { SystemGlobby } from "../../../compiler-show/dist";

export const NodeGlobby: SystemGlobby = {
  globby: nodeGlobby,
};
