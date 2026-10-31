import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const testsDir = path.resolve(process.cwd(), "tests");
const testFiles = fs
  .readdirSync(testsDir)
  .filter((f) => f.endsWith(".test.ts"))
  .sort();

console.log(`[MOAS Test Runner] Discovered ${testFiles.length} test suite(s)...\n`);
let passed = 0;
let failed = 0;

for (const file of testFiles) {
  const filePath = path.join("tests", file);
  console.log(`------------------------------------------------------`);
  console.log(`▶ Executing: ${filePath}`);
  console.log(`------------------------------------------------------`);
  try {
    execSync(`npx tsx --test "${filePath}"`, { stdio: "inherit" });
    passed++;
  } catch {
    console.error(`✖ Suite Failed: ${filePath}`);
    failed++;
  }
}

console.log(`\n======================================================`);
console.log(`[MOAS Test Runner] Summary: ${passed} passed, ${failed} failed (${testFiles.length} total suites).`);
console.log(`======================================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
