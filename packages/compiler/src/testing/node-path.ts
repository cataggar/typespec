import path from "path";
import { SystemPath } from "./system-path.js";

export const NodePath: SystemPath = {
  dirname: path.dirname,
  join: path.join,
  resolve: path.resolve,
  normalize: path.normalize,
};
