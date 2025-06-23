import { NodeAssert } from "../src/testing/node-assert.js";
import { setSystemAssert } from "../src/testing/system-assert.js";
import { setSystemFsPromises } from "../src/testing/system-fs-promises.js";
import { NodeFsPromises } from "../src/testing/node-fs-promises.js";

setSystemAssert(NodeAssert);
setSystemFsPromises(NodeFsPromises);
