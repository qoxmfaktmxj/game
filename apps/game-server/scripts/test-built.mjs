import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL("..", import.meta.url));
const child = spawn(
  process.execPath,
  ["--import", "tsx", "--test", "test/network.test.ts", "test/multigame-network.test.ts"],
  {
    cwd: directory,
    windowsHide: true,
    stdio: "inherit",
    env: { ...process.env, GAME_TEST_BUILT: "true" },
  },
);
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
