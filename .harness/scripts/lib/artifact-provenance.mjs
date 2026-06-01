import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

export async function collectArtifactProvenance(root, runId) {
  const runDir = path.join(root, ".harness", "runs", runId);
  const logsDir = path.join(runDir, "logs");
  const entries = [];

  entries.push(...await collectOrchestrateArtifactWrites(root, logsDir));
  entries.push(...await collectOrchestrateResults(root, logsDir));
  entries.push(...await collectNativeResults(root, logsDir));
  entries.push(...await collectBridgeResults(root, logsDir));

  const byArtifact = new Map();
  for (const entry of entries) {
    if (!entry.artifact || !entry.agent) continue;
    const list = byArtifact.get(entry.artifact) ?? [];
    list.push(entry);
    byArtifact.set(entry.artifact, list);
  }
  return byArtifact;
}

export function normalizeArtifactPath(inputPath) {
  const normalized = String(inputPath ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized) return "";
  if (normalized.startsWith("artifacts/")) return normalized.slice("artifacts/".length);
  const marker = "/artifacts/";
  if (normalized.includes(marker)) return normalized.split(marker).pop();
  return path.posix.basename(normalized);
}

export function artifactHasOwnerProvenance(provenance, artifact, owner) {
  const name = normalizeArtifactPath(artifact);
  return (provenance.get(name) ?? []).some((entry) => entry.agent === owner && entry.status !== "rejected");
}

export function describeArtifactProvenance(provenance, artifact) {
  const name = normalizeArtifactPath(artifact);
  const entries = provenance.get(name) ?? [];
  if (entries.length === 0) return "none";
  return entries.map((entry) => `${entry.agent}:${entry.source}${entry.applied === false ? ":not-applied" : ""}`).join(", ");
}

async function collectOrchestrateArtifactWrites(root, logsDir) {
  const agentLogsDir = path.join(logsDir, "agents");
  const files = await listFiles(agentLogsDir);
  const entries = [];
  for (const file of files.filter((name) => name.endsWith(".artifact-writes.json"))) {
    const parsed = await readJson(path.join(agentLogsDir, file));
    for (const item of Array.isArray(parsed) ? parsed : []) {
      if (!item.artifact) continue;
      entries.push({
        agent: item.agent,
        artifact: normalizeArtifactPath(item.artifact),
        source: "orchestrate-artifact-write",
        applied: item.applied === true,
        status: item.applied === true ? "applied" : "rejected",
        path: path.relative(root, path.join(agentLogsDir, file)).replaceAll("\\", "/")
      });
    }
  }
  return entries;
}

async function collectOrchestrateResults(root, logsDir) {
  const parsed = await readJson(path.join(logsDir, "orchestrate-results.json"));
  const entries = [];
  for (const result of parsed?.results ?? []) {
    for (const item of result.artifactUpdates ?? result.artifactsUpdated ?? []) {
      entries.push({
        agent: result.agent,
        artifact: normalizeArtifactPath(item.path ?? item),
        source: "orchestrate-result",
        applied: null,
        status: result.status ?? "unknown",
        path: path.relative(root, path.join(logsDir, "orchestrate-results.json")).replaceAll("\\", "/")
      });
    }
  }
  return entries;
}

async function collectNativeResults(root, logsDir) {
  const nativePath = path.join(logsDir, "native-subagents", "native-state.json");
  const native = await readJson(nativePath);
  const entries = [];
  for (const agent of native?.agents ?? []) {
    if (!agent.result_captured_at || agent.result_status !== "completed") continue;
    const resultJson = agent.result_json_path ? await readJson(resolveWorkspacePath(root, agent.result_json_path)) : null;
    for (const item of resultJson?.artifactUpdates ?? resultJson?.artifactsUpdated ?? []) {
      entries.push({
        agent: resultJson.agent ?? agent.agent,
        artifact: normalizeArtifactPath(item.path ?? item),
        source: "native-result-json",
        applied: null,
        status: agent.result_status,
        path: agent.result_json_path
      });
    }
  }
  return entries;
}

async function collectBridgeResults(root, logsDir) {
  const bridgeDir = path.join(logsDir, "agent-bridge");
  const files = await listFiles(bridgeDir);
  const entries = [];
  for (const file of files.filter((name) => name.endsWith(".result.json"))) {
    const parsed = await readJson(path.join(bridgeDir, file));
    for (const item of parsed?.artifactUpdates ?? parsed?.artifactsUpdated ?? []) {
      entries.push({
        agent: parsed.agent ?? file.replace(/\.result\.json$/, ""),
        artifact: normalizeArtifactPath(item.path ?? item),
        source: "bridge-result-json",
        applied: null,
        status: parsed.status ?? "unknown",
        path: path.relative(root, path.join(bridgeDir, file)).replaceAll("\\", "/")
      });
    }
  }
  return entries;
}

async function listFiles(target) {
  if (!existsSync(target)) return [];
  return (await readdir(target, { withFileTypes: true }).catch(() => []))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
}

async function readJson(target) {
  if (!target || !existsSync(target)) return null;
  try {
    return JSON.parse((await readFile(target, "utf8")).replace(/^\uFEFF/, ""));
  } catch {
    return null;
  }
}

function resolveWorkspacePath(root, target) {
  return path.isAbsolute(target) ? target : path.join(root, target);
}
