/**
 * Pre-compute all Soma cube solutions and write them to src/data/solutions.json.
 * Run with: npm run solve
 */

import { writeFileSync, mkdirSync } from "fs";

import { resolve, dirname } from "path";

import { fileURLToPath } from "url";

import {
  solveAll,
  serializeSolution,
  solutionCanonicalKeyUnderRotation,
} from "../src/core/index.ts";

const __filename = fileURLToPath(import.meta.url);

const __dirname = dirname(__filename);

console.log("Solving Soma cube...");

const startTime = Date.now();

const allSolutions = solveAll();

const elapsed = Date.now() - startTime;

console.log(`Found ${allSolutions.length} total solutions in ${elapsed}ms`);

// First pass: for each equivalence class key, record the notation of the first solution seen.
// That first solution becomes the canonical representative for its class.

const keyToCanonical = new Map<string, string>();

for (const sol of allSolutions) {
  const key = solutionCanonicalKeyUnderRotation(sol);

  if (!keyToCanonical.has(key)) {
    keyToCanonical.set(key, serializeSolution(sol));
  }
}

console.log(`${keyToCanonical.size} distinct solutions (under rotation)`);

// Second pass: build output with canonical field.
// - distinct: true  → this solution IS the canonical representative for its class
// - canonical       → notation of the canonical representative (own notation if distinct)

const output = allSolutions.map((sol) => {
  const notation = serializeSolution(sol);

  const key = solutionCanonicalKeyUnderRotation(sol);

  const canonical = keyToCanonical.get(key)!;

  return { notation, distinct: notation === canonical, canonical };
});

const outPath = resolve(__dirname, "../src/data/solutions.json");

mkdirSync(dirname(outPath), { recursive: true });

writeFileSync(outPath, JSON.stringify(output));

console.log(`Wrote ${output.length} solutions to src/data/solutions.json`);
