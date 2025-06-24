import { main } from "../dist/src/server/tmlanguage.js";
import { NodePath } from "../dist/src/testing/node-path.js";
import { setSystemPath } from "../dist/src/testing/system-path.js";

setSystemPath(NodePath);
await main();
