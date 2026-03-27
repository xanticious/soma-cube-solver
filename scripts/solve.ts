/**
 * Pre-compute all Soma cube solutions and write them to src/data/solutions.json.
 * Run with: npm run solve
 */

import { writeFileSync, mkdirSync } from "fs";

import { resolve, dirname } from "path";

import { fileURLToPath } from "url";

import {
  solveAll,
  filterDistinctSolutions,
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

const distinctSolutions = filterDistinctSolutions(allSolutions);

console.log(`${distinctSolutions.length} distinct solutions (under rotation)`);

// Build output: array of { notation, isDistinct }

const distinctKeys = new Set<string>();

for (const sol of distinctSolutions) {
  distinctKeys.add(solutionCanonicalKeyUnderRotation(sol));
}

const output = allSolutions.map((sol) => {
  const notation = serializeSolution(sol);

  const key = solutionCanonicalKeyUnderRotation(sol);

  return {
    notation,

    distinct: distinctKeys.has(key) && distinctKeys.delete(key), // true for first occurrence
  };
});

// Re-add all distinct keys so the deduplication above picks exactly one per group

// (The delete trick ensures exactly one `distinct: true` per equivalence class)

const outPath = resolve(__dirname, "../src/data/solutions.json");

mkdirSync(dirname(outPath), { recursive: true });

writeFileSync(outPath, JSON.stringify(output));

console.log(`Wrote ${output.length} solutions to src/data/solutions.json`);
