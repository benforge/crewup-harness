import assert from "node:assert/strict";
import { greet } from "../src/index.js";

assert.equal(greet("Agent"), "Hello, Agent!");
console.log("smoke test passed");
