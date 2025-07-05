import { readdir as nodeReaddir, readFile as nodeReadFile, stat as nodeStat } from "fs/promises";
import { SystemFsPromises } from "../../../compiler-show/dist";

export const NodeFsPromises: SystemFsPromises = {
  readdir: nodeReaddir,
  readFile: nodeReadFile,
  stat: nodeStat,
};
