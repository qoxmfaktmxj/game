import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const directory = fileURLToPath(new URL("..", import.meta.url));
await build({
  absWorkingDir: directory,
  entryPoints: ["src/index.ts"],
  outfile: resolve(directory, "dist/index.mjs"),
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  sourcemap: true,
  sourcesContent: false,
  external: ["@colyseus/*", "@supabase/*", "express", "pg"],
  logLevel: "info",
});
