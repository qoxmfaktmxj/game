import { spawn } from "node:child_process";
try {
  process.loadEnvFile(".env");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const children = ["@moyeotable/game-server", "@moyeotable/web"].map(
  (workspace) =>
    spawn(npm, ["run", "dev", "--workspace", workspace], {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: {
        ...process.env,
        ...(workspace === "@moyeotable/game-server" && !process.env.AUTH_MODE
          ? {
              AUTH_MODE: "local",
              ALLOW_LOCAL_GUEST: "true",
              GAME_HOST: "127.0.0.1",
            }
          : {}),
      },
    }),
);
let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const child of children)
  child.on("exit", (code) => {
    if (code && !stopping) {
      stop();
      process.exitCode = code;
    }
  });
