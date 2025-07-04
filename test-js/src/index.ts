// @ts-ignore
import { api } from "../../packages/compiler-show/dist/index.js";

async function main() {
  if (typeof api.version === "function") {
    console.log("version:", api.version());
  } else {
    console.log("version() export not found in ES module");
  }
}

main().catch(console.error);
