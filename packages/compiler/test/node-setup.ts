import { NodeAssert } from "../src/testing/node-assert.js";
import { NodeFsPromises } from "../src/testing/node-fs-promises.js";
import { NodeGlobby } from "../src/testing/node-globby.js";
import { NodePath } from "../src/testing/node-path.js";
import { setSystemAssert } from "../src/testing/system-assert.js";
import { setSystemFsPromises } from "../src/testing/system-fs-promises.js";
import { setSystemGlobby } from "../src/testing/system-globby.js";
import { setSystemPath } from "../src/testing/system-path.js";

setSystemAssert(NodeAssert);
setSystemFsPromises(NodeFsPromises);
setSystemGlobby(NodeGlobby);
setSystemPath(NodePath);
