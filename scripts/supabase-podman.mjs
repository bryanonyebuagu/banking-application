import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Keep the Supabase compatibility API explicitly bound to Podman.
const root = fileURLToPath(new URL("../", import.meta.url));
const installed = path.join(process.env.ProgramFiles ?? "C:\\Program Files", "RedHat", "Podman", "podman.exe");
const podman = process.platform === "win32" && existsSync(installed) ? installed : "podman";
function read(args) {
  const result = spawnSync(podman, args, { encoding: "utf8", timeout: 30000, windowsHide: true });
  if (result.error || result.status !== 0) {
    throw new Error(`Podman is unavailable. Install Podman and start its machine first. ${result.stderr?.trim() || result.error?.message || ""}`);
  }
  return JSON.parse(result.stdout);
}

try {
  let host;
  if (process.platform === "linux") {
    const info = read(["info", "--format", "json"]);
    const socket = info.host?.remoteSocket?.path;
    if (!socket || !existsSync(socket)) throw new Error("Start the Podman API socket (systemctl --user start podman.socket).");
    host = `unix://${socket}`;
  } else {
    const [machine] = read(["machine", "inspect", process.env.PODMAN_MACHINE ?? "podman-machine-default"]);
    if (machine?.State !== "running") throw new Error("Start the Podman machine before running database commands.");
    const connection = machine.ConnectionInfo;
    const socket = process.platform === "win32" ? connection?.PodmanPipe?.Path : connection?.PodmanSocket?.Path;
    if (!socket) throw new Error("Podman did not report its API endpoint.");
    host = process.platform === "win32" ? `npipe://${socket.replaceAll("\\", "/")}` : `unix://${socket}`;
  }
  const env = { ...process.env, DOCKER_HOST: host };
  delete env.DOCKER_CONTEXT;
  delete env.DOCKER_TLS_VERIFY;
  delete env.DOCKER_CERT_PATH;
  const result = spawnSync(process.execPath, [path.join(root, "node_modules/supabase/dist/supabase.js"), ...process.argv.slice(2)], {
    cwd: root, env, stdio: "inherit", windowsHide: true,
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
