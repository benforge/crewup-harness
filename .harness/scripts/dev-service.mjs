import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync, spawn } from "node:child_process";
import path from "node:path";
import { loadProjectProfile } from "./lib/project-profile.mjs";

const root = process.cwd();
const [runId, action = "status", ...args] = process.argv.slice(2);

if (!runId) {
  console.error("Usage: npx crewup dev-service <run-id> <start|status|stop> [--command=\"npm run dev\"]");
  process.exit(1);
}

const runDir = path.join(root, ".harness", "runs", runId);
const logsDir = path.join(runDir, "logs");
const statePath = path.join(logsDir, "dev-service.json");
const logPath = path.join(logsDir, "dev-service.log");

if (!existsSync(runDir)) {
  console.error(`Run not found: ${runId}`);
  process.exit(1);
}

await mkdir(logsDir, { recursive: true });

if (action === "start") await startService();
else if (action === "stop") await stopService();
else if (action === "status") await printStatus();
else {
  console.error(`Unknown dev-service action: ${action}`);
  process.exit(1);
}

async function startService() {
  const existing = await readState();
  if (existing?.pid && isRunning(existing.pid)) {
    console.log(`Dev service already running: pid ${existing.pid}`);
    console.log(`- command: ${existing.command}`);
    return;
  }

  const command = commandArg() ?? await detectServiceCommand();
  if (!command) {
    console.error("No dev/preview/start command detected. Pass one explicitly:");
    console.error(`  npx crewup dev-service ${runId} start --command="npm run dev"`);
    process.exit(1);
  }

  await appendFile(logPath, `\n\n# ${new Date().toISOString()} start: ${command}\n`, "utf8");
  await appendFile(logPath, "Process output is not captured by CrewUp; use the project terminal or app logs for live service output.\n", "utf8");
  const child = spawn(command, {
    cwd: root,
    shell: true,
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });
  child.unref();

  const payload = {
    runId,
    command,
    pid: child.pid,
    status: "running",
    startedAt: new Date().toISOString(),
    stoppedAt: null,
    log: path.relative(root, logPath).replaceAll("\\", "/")
  };
  await writeFile(statePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Dev service started: pid ${child.pid}`);
  console.log(`- command: ${command}`);
  console.log(`- log: ${path.relative(root, logPath)}`);
}

async function stopService() {
  const state = await readState();
  if (!state?.pid) {
    console.log("No dev service state found.");
    return;
  }

  if (isRunning(state.pid)) {
    const stopped = stopPidTree(state.pid);
    if (!stopped) {
      console.error(`Failed to stop dev service pid ${state.pid}. Stop it manually, then rerun status.`);
      process.exit(1);
    }
  }

  const next = {
    ...state,
    status: "stopped",
    stoppedAt: new Date().toISOString()
  };
  await writeFile(statePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(`Dev service stopped: pid ${state.pid}`);
}

async function printStatus() {
  const state = await readState();
  if (!state) {
    console.log("Dev service: not started");
    return;
  }
  const running = state.pid ? isRunning(state.pid) : false;
  const displayStatus = running ? "running" : (state.status === "running" ? "stale" : (state.status ?? "stopped"));
  console.log(`Dev service: ${displayStatus}`);
  console.log(`- pid: ${state.pid ?? "-"}`);
  console.log(`- command: ${state.command ?? "-"}`);
  console.log(`- log: ${state.log ?? path.relative(root, logPath)}`);
  if (!running && state.status === "running") {
    console.log("- note: process is no longer running; state file is stale");
  }
}

async function detectServiceCommand() {
  const { project_profile: profile } = await loadProjectProfile(root);
  const commands = profile.commands ?? {};
  return commands.dev ?? commands.preview ?? commands.start ?? "";
}

function commandArg() {
  const eqIndex = args.findIndex((arg) => arg.startsWith("--command="));
  if (eqIndex >= 0) {
    return cleanCommand([
      args[eqIndex].slice("--command=".length),
      ...args.slice(eqIndex + 1)
    ].join(" "));
  }
  const flagIndex = args.findIndex((arg) => arg === "--command");
  if (flagIndex >= 0) return cleanCommand(args.slice(flagIndex + 1).join(" "));
  return "";
}

function cleanCommand(value) {
  return String(value ?? "").trim().replace(/^['"]|['"]$/g, "");
}

async function readState() {
  if (!existsSync(statePath)) return null;
  try {
    return JSON.parse(await readFile(statePath, "utf8"));
  } catch {
    return null;
  }
}

function isRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

function stopPidTree(pid) {
  const numericPid = String(pid);
  if (process.platform === "win32") {
    const result = spawnSync("taskkill", ["/PID", numericPid, "/T", "/F"], { encoding: "utf8" });
    return result.status === 0;
  }
  const result = spawnSync("sh", ["-c", `kill -TERM -${numericPid} 2>/dev/null || kill -TERM ${numericPid} 2>/dev/null`], { encoding: "utf8" });
  return result.status === 0 || !isRunning(pid);
}
