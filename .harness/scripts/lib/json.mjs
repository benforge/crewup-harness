import { readFile } from "node:fs/promises";

export async function readJsonFile(filePath) {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(stripBom(content));
}

function stripBom(value) {
  return value.replace(/^\uFEFF/, "");
}
