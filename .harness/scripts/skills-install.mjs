import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const root = process.cwd();
const outDir = path.join(root, ".harness", "reports");
const resolvePath = path.join(outDir, "skills-resolve.json");
const resultsPath = path.join(outDir, "skills-install-results.json");
const installExact = process.argv.includes("--exact");

await mkdir(outDir, { recursive: true });

const config = parseYaml(await readFile(path.join(root, ".harness", "config", "skills.yaml"), "utf8"));
const installed = new Set(readInstalled().map((item) => item.name));
const refs = [];

for (const [name, item] of Object.entries(config.external_skill_candidates ?? {})) {
  if (!installed.has(name) && item.install_command) refs.push({ name, command: item.install_command, source: "external_skill_candidates" });
}

if (installExact) {
  if (!existsSync(resolvePath)) {
    throw new Error(`Missing ${path.relative(root, resolvePath)}. Run npm run harness:skills:resolve first.`);
  }
  const resolved = JSON.parse(await readFile(resolvePath, "utf8"));
  for (const item of resolved) {
    if (item.exact && !installed.has(item.label)) {
      refs.push({
        name: item.label,
        command: `npx skills add ${item.exact.ref} -a codex --copy -y`,
        source: "exact_marketplace_match",
        ref: item.exact.ref
      });
    }
  }
}

const results = [];
for (const item of refs) {
  console.log(`Installing ${item.name} from ${item.source}`);
  try {
    const output = stripAnsi(execSync(item.command, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 180000
    }));
    results.push({ ...item, status: "installed", output: tail(output) });
  } catch (error) {
    const output = stripAnsi(`${error.stdout ?? ""}${error.stderr ?? ""}`);
    results.push({ ...item, status: "failed", output: tail(output) });
  }
}

await writeFile(resultsPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");
console.log(`Skill install results written: ${path.relative(root, resultsPath)}`);

function readInstalled() {
  try {
    return JSON.parse(execSync("npx skills list --json", {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }));
  } catch {
    return [];
  }
}

function stripAnsi(value) {
  return value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

function tail(value, max = 2000) {
  return value.length > max ? value.slice(-max) : value;
}
