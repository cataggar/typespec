import { api } from "../../compiler-show/dist/index.js";

async function main() {
  console.log("version:", api.version());
  await api.test();
}

main().catch(console.error);
