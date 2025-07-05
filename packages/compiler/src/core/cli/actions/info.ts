/* eslint-disable no-console */
import { stringify } from "yaml";
import { loadTypeSpecConfigForPath } from "../../../config/config-loader.js";
import { getSystemUrl } from "../../system-url.js";
import { CompilerHost, Diagnostic } from "../../types.js";
/**
 * Print the resolved TypeSpec configuration.
 */
export async function printInfoAction(host: CompilerHost): Promise<readonly Diagnostic[]> {
  const cwd = process.cwd();
  console.log(`Module: ${getSystemUrl().fileURLToPath(import.meta.url)}`);

  const config = await loadTypeSpecConfigForPath(host, cwd, true, true);
  const { diagnostics, filename, file, ...restOfConfig } = config;

  console.log(`User Config: ${filename ?? "No config file found"}`);
  console.log("-----------");
  console.log(stringify(restOfConfig));
  console.log("-----------");
  return config.diagnostics;
}
