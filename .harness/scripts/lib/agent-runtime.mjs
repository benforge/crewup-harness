import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const supportedAgentIds = new Set(["codex", "claude", "cursor", "trae", "manual"]);

export async function readAgentEnvironment(root) {
  const target = path.join(root, ".harness", "project", "agent.yaml");
  if (!existsSync(target)) {
    return defaultAgentEnvironment();
  }

  try {
    const parsed = parseYaml(await readFile(target, "utf8")) ?? {};
    return normalizeAgentEnvironment(parsed.agent_environment ?? parsed);
  } catch {
    return defaultAgentEnvironment();
  }
}

export function normalizeAgentEnvironment(value = {}) {
  const id = supportedAgentIds.has(value.id) ? value.id : "codex";
  const mode = value.mode === "bridge" || value.mode === "manual" ? value.mode : "native";
  const supportLevel = value.support_level ?? (mode === "native" ? "native" : mode === "manual" ? "fallback" : "experimental");
  return {
    id,
    label: value.label ?? titleCase(id),
    description: value.description ?? "",
    support_level: supportLevel,
    mode,
    capabilities: normalizeCapabilities(value.capabilities, mode)
  };
}

export function isNativeAgentEnvironment(agentEnvironment) {
  return normalizeAgentEnvironment(agentEnvironment).mode === "native";
}

export function isBridgeAgentEnvironment(agentEnvironment) {
  const mode = normalizeAgentEnvironment(agentEnvironment).mode;
  return mode === "bridge" || mode === "manual";
}

export function renderAgentEnvironmentTable(agentEnvironment) {
  const env = normalizeAgentEnvironment(agentEnvironment);
  const capabilities = env.capabilities ?? {};
  return [
    "| Item | Value |",
    "| --- | --- |",
    `| selected_agent | \`${env.id}\` |`,
    `| label | ${env.label} |`,
    `| support_level | ${env.support_level} |`,
    `| mode | ${env.mode} |`,
    `| subagents | ${renderCapability(capabilities.subagents)} |`,
    `| parallel_subagents | ${renderCapability(capabilities.parallel_subagents)} |`,
    `| command_execution | ${renderCapability(capabilities.command_execution)} |`,
    `| file_editing | ${renderCapability(capabilities.file_editing)} |`,
    `| structured_results | ${renderCapability(capabilities.structured_results)} |`,
    `| state_writeback | ${renderCapability(capabilities.state_writeback)} |`
  ].join("\n");
}

export function buildBridgeTaskManifest({ runId, agentEnvironment, tasks }) {
  const env = normalizeAgentEnvironment(agentEnvironment);
  return {
    runId,
    generatedAt: new Date().toISOString(),
    agent_environment: env,
    tasks: tasks.map((task) => ({
      agent: task.agent,
      title: task.title,
      task_path: task.task_path,
      handoff_path: task.handoff_path,
      result_path: task.result_path,
      output_format: "json",
      required_output_contract: task.required_output_contract
    }))
  };
}

export function renderBridgeManifestMarkdown(manifest) {
  const env = normalizeAgentEnvironment(manifest.agent_environment);
  const rows = (manifest.tasks ?? []).map((task) =>
    `| \`${task.agent}\` | ${task.title} | \`${task.handoff_path}\` | \`${task.result_path}\` | ${task.output_format ?? "json"} |`
  );
  return [
    `# Bridge Handoff: ${manifest.runId}`,
    "",
    renderAgentEnvironmentTable(env),
    "",
    "## Task Pack",
    "",
    "| Agent | Title | Handoff | Result | Format |",
    "| --- | --- | --- | --- | --- |",
    ...(rows.length ? rows : ["| none | - | - | - | - |"]),
    "",
    "## Execution Rule",
    "",
    "- Native Codex keeps using subagents.",
    "- Claude, Cursor, Trae, and Manual use the bridge contract.",
    "- The external agent must write the JSON result file at the declared result path before CrewUp can collect and apply the output.",
    "",
    "## Result Contract",
    "",
    "The JSON result must match the harness agent output schema used by native/bridge result capture."
  ].join("\n");
}

function normalizeCapabilities(value = {}, mode = "native") {
  const fallback = mode === "native"
    ? {
        subagents: true,
        parallel_subagents: true,
        command_execution: true,
        file_editing: true,
        structured_results: true,
        state_writeback: true
      }
    : {
        subagents: false,
        parallel_subagents: false,
        command_execution: mode === "manual" ? "human-run" : "tool-dependent",
        file_editing: mode === "manual" ? "human-run" : "tool-dependent",
        structured_results: "bridge-json",
        state_writeback: "bridge-json"
      };
  return { ...fallback, ...value };
}

function defaultAgentEnvironment() {
  return normalizeAgentEnvironment({
    id: "codex",
    label: "Codex",
    description: "OpenAI Codex native execution",
    support_level: "native",
    mode: "native"
  });
}

function renderCapability(value) {
  if (value === true) return "yes";
  if (value === false) return "no";
  return String(value ?? "unknown");
}

function titleCase(value) {
  return String(value ?? "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase()) || "Codex";
}
