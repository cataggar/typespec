import {
  api,
  setSystemAssert,
  setSystemFsPromises,
  setSystemGlobby,
  setSystemPath,
  setSystemUrl,
} from "../../compiler-show/dist/index.js";

import { NodeUrl } from "./core/node-url.js";
import { NodeAssert } from "./testing/node-assert.js";
import { NodeFsPromises } from "./testing/node-fs-promises.js";
import { NodeGlobby } from "./testing/node-globby.js";
import { NodePath } from "./testing/node-path.js";

async function main() {
  setSystemAssert(NodeAssert);
  setSystemFsPromises(NodeFsPromises);
  setSystemGlobby(NodeGlobby);
  setSystemPath(NodePath);
  setSystemUrl(NodeUrl);

  console.log("version:", api.version());
  await api.test();
}

main().catch(console.error);
