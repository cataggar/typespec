import { setSystemAssert } from "../src/testing/expect.js";
import { NodeAssert } from "../src/testing/node-assert.js";

setSystemAssert(NodeAssert);
