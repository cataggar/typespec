import { readdir as nodeReaddir, readFile as nodeReadFile, stat as nodeStat } from "fs/promises";
import type { SystemFsPromises } from "../core/system-fs-promises.js";

export const NodeFsPromises: SystemFsPromises = {
  readdir: nodeReaddir,
  readFile: nodeReadFile,
  stat: nodeStat,
};
