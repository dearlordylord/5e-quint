#!/usr/bin/env node
/**
 * Pre-compile battle.qnt spec for fast MBT runs.
 *
 * WHY: `quint run` spends ~15s parsing+typechecking creature.qnt (6K lines) +
 * battle.qnt (2.5K lines) on EVERY invocation. This script compiles once and
 * saves the evaluator input so subsequent MBT runs skip the overhead.
 *
 * HOW: Uses Quint's JS API to parse+typecheck, then serializes the evaluator
 * input with json-bigint (matching what commandWrapper.simulate does internally).
 * The output is byte-identical to what `quint run` would send to the evaluator.
 *
 * IMPORTANT: The file MUST be written by json-bigint.stringify(), NOT by
 * JSON.stringify() of a JSON.parse()'d intermediate. Reading the file back with
 * standard JSON.parse() silently converts BigInt integers to float64, causing
 * the Rust evaluator to hang (see QUINT_CONNECT_TROUBLESHOOT.md, Finding 6).
 *
 * CACHE INVALIDATION: Includes SHA-256 hash of source spec files.
 * Re-run after editing battle.qnt or creature.qnt.
 *
 * Usage:
 *   node scripts/compile-battle-spec.cjs [output-path]
 *
 * Default output: .quint-cache/battle-compiled.json
 */
const crypto = require("crypto")
const fs = require("fs")
const path = require("path")

// Resolve Quint and its dependencies
const globalRoot = require("child_process").execSync("npm root -g").toString().trim()
const quintPkgPath = require.resolve("@informalsystems/quint/package.json", { paths: [globalRoot] })
const quintRoot = path.dirname(quintPkgPath)
const quintNodeModules = path.join(quintRoot, "node_modules")
module.paths.unshift(globalRoot, quintNodeModules)

const { load, parse, typecheck } = require(path.join(quintRoot, "dist/src/cliCommands.js"))
const { toExpr } = require(path.join(quintRoot, "dist/src/cliHelpers.js"))
const JSONbig = require(path.join(quintNodeModules, "json-bigint"))
const { bigintCheckerReplacer } = require(path.join(quintRoot, "dist/src/rust/helpers.js"))

const outputPath = process.argv[2] || ".quint-cache/battle-compiled.json"
const hashPath = outputPath.replace(/\.json$/, ".hash")
const outputDir = path.dirname(outputPath)
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Compute hash of spec files for staleness detection
function computeSpecHash() {
  const hash = crypto.createHash("sha256")
  for (const f of ["battle.qnt", "creature.qnt"]) {
    if (fs.existsSync(f)) hash.update(fs.readFileSync(f))
  }
  return hash.digest("hex")
}

const currentHash = computeSpecHash()

// Check if cache is fresh
if (fs.existsSync(outputPath) && fs.existsSync(hashPath)) {
  const cachedHash = fs.readFileSync(hashPath, "utf-8").trim()
  if (cachedHash === currentHash) {
    console.log("Cache is fresh (spec files unchanged). Skipping recompilation.")
    process.exit(0)
  }
  console.log("Cache is stale (spec files changed). Recompiling...")
} else {
  console.log("No cache found. Compiling...")
}

async function main() {
  const startTime = Date.now()

  // Step 1: load
  const loadResult = await load({ input: "battle.qnt" })
  if (loadResult.isLeft()) {
    console.error("Load failed:", loadResult.value.msg || loadResult.value)
    process.exit(1)
  }
  console.log(`  Load: ${Date.now() - startTime}ms`)

  // Step 2: parse
  const t2 = Date.now()
  const parseResult = await parse(loadResult.value)
  if (parseResult.isLeft()) {
    console.error("Parse failed:", parseResult.value.msg || parseResult.value)
    process.exit(1)
  }
  console.log(`  Parse: ${Date.now() - t2}ms`)

  // Step 3: typecheck
  const t3 = Date.now()
  const tcResult = await typecheck(parseResult.value)
  if (tcResult.isLeft()) {
    console.error("Typecheck failed:", tcResult.value.msg || tcResult.value)
    process.exit(1)
  }
  const typechecked = tcResult.value
  console.log(`  Typecheck: ${Date.now() - t3}ms`)

  // Step 4: resolve init/step/invariant expressions (matching quint run's runSimulator)
  const t4 = Date.now()
  const initE = toExpr(typechecked, "bInit")
  const stepE = toExpr(typechecked, "battleStep")
  if (initE.isLeft()) { console.error("Failed to resolve bInit"); process.exit(1) }
  if (stepE.isLeft()) { console.error("Failed to resolve battleStep"); process.exit(1) }

  // Step 5: Build evaluator input (mirrors commandWrapper.simulate)
  const evaluatorInput = {
    parsed: {
      modules: [],
      table: typechecked.resolver.table,
      main: "battle",
      init: initE.value,
      step: stepE.value,
      invariants: [{ id: 0, kind: "bool", value: true }],  // no invariant checking in MBT
      witnesses: [],
    },
    source: typechecked.path,
    // Runtime params — patched by quint-connect at test time
    nruns: 1,
    nsteps: 10,
    ntraces: 1,
    nthreads: 1,
    mbt: true,
    verbosity: 2,
  }

  // CRITICAL: Must use json-bigint.stringify with bigintCheckerReplacer.
  // Standard JSON.stringify/parse silently converts BigInt integers to float64,
  // producing byte-different output that makes the Rust evaluator hang.
  const inputStr = JSONbig.stringify(evaluatorInput, bigintCheckerReplacer)
  console.log(`  Build: ${Date.now() - t4}ms, size: ${(inputStr.length / 1024 / 1024).toFixed(1)}MB`)

  // Step 6: Write cache (raw string, no re-parsing)
  fs.writeFileSync(outputPath, inputStr)
  fs.writeFileSync(hashPath, currentHash)
  console.log(`Compiled in ${Date.now() - startTime}ms → ${outputPath}`)
  console.log(`Hash: ${currentHash.slice(0, 12)}...`)
}

main().catch(e => { console.error(e); process.exit(1) })
