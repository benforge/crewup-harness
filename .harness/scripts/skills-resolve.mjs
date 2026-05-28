import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const root = process.cwd();
const outDir = path.join(root, ".harness", "reports");
const outPath = path.join(outDir, "skills-resolve.json");
const config = parseYaml(await readFile(path.join(root, ".harness", "config", "skills.yaml"), "utf8"));
const labels = [...new Set(Object.values(config.role_skills ?? {}).flat())].sort();
const results = [];

await mkdir(outDir, { recursive: true });

for (const label of labels) {
  const output = runFind(label);
  const refs = parseRefs(output);
  const exact = refs.find((item) => item.skill.toLowerCase() === label.toLowerCase()) ?? null;
  results.push({ label, exact, first: refs[0] ?? null, count: refs.length });
  console.log(`${label}: ${exact ? exact.ref : refs[0] ? `no exact; first=${refs[0].ref}` : "no results"}`);
}

await writeFile(outPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");
console.log(`Skill resolution written: ${path.relative(root, outPath)}`);

function runFind(label) {
  try {
    return stripAnsi(execSync(`npx skills find ${label}`, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30000
    }));
  } catch (error) {
    return stripAnsi(`${error.stdout ?? ""}${error.stderr ?? ""}`);
  }
}

function parseRefs(output) {
  return [...output.matchAll(/^([\w.-]+\/[\w.-]+@([\w.-]+))\s+([\d.]+[KkM]?\s+installs)?/gm)]
    .map((match) => ({
      ref: match[1],
      skill: match[2],
      installs: match[3] ?? ""
    }));
}

function stripAnsi(value) {
  return value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}
