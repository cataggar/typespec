import { NodeAssert } from "../src/testing/node-assert.js";
import { setSystemAssert } from "../src/testing/system-assert.js";

setSystemAssert(NodeAssert);
