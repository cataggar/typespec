// bun run build.ts

async function runScript(cwd: string, script: string) {
  console.log(`run in ${cwd}: pnpm run ${script}`);
  let proc = Bun.spawn(["pnpm", "run", script], { cwd });
  let exitCode = await proc.exited;
  console.log(await new Response(proc.stdout).text());
  if (exitCode !== 0) {
    console.error(`In '${cwd}' script '${script}' failed with exit code ${exitCode}`);
    process.exit(exitCode);
  }
}

await runScript("packages/compiler-show", "build");
await runScript("packages/compiler-show", "bundle");
await runScript("packages/compiler-show", "component");

await runScript("test-rs", "wkg");
await runScript("test-rs", "cargo");
await runScript("test-rs", "plug");
await runScript("test-rs", "run");

export {};
