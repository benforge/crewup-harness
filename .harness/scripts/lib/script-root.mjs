import path from "node:path";

export function resolveScriptPath(root, scriptName) {
  const scriptRoot = process.env.CREWUP_SCRIPT_ROOT || path.join(root, ".harness", "scripts");
  return path.join(scriptRoot, scriptName);
}
