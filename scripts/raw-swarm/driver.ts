import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Either, Match } from "effect";

import {
  createMcpCompositionRoot,
  handleToolCall,
  type McpCompositionRoot,
} from "../../packages/mcp/src/server.ts";

import {
  currentGitSha,
  repoRoot,
  sha256Canonical,
  toolResultPayload,
  type TranscriptHeader,
} from "./transcript.ts";
import { parseScenario, type Scenario, type ScriptAct } from "./scenario.ts";

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(message: string): never {
  throw new Error(message);
}

// Small explicit path resolver. Segments are dot-separated properties.
// `name[selector]` filters an array-valued property: `[field=value]` keeps all
// matching elements, `[value]` matches a single element by combatantId or id.
// `.length` on an array yields its length; a property access on a
// single-element array unwraps it.
function resolvePath(root: unknown, path: string): unknown {
  let current: unknown = root;
  for (const segment of path.split(".")) {
    current = resolveSegment(current, segment, path);
  }
  return current;
}

function resolveSegment(
  value: unknown,
  segment: string,
  path: string,
): unknown {
  const match = /^([^[\]]+)(?:\[([^\]]+)\])?$/.exec(segment);
  if (match === null)
    fail(`Unparseable path segment "${segment}" in "${path}"`);
  const key = match[1];
  const selector = match[2];
  if (Array.isArray(value) && key === "length") return value.length;
  const target = Array.isArray(value)
    ? value.length === 1
      ? value[0]
      : fail(
          `Path "${path}" segment "${segment}": array with ${value.length} elements needs a selector`,
        )
    : value;
  if (!isJsonObject(target)) {
    fail(`Path "${path}" segment "${segment}": not an object`);
  }
  const property = target[key];
  if (selector === undefined) return property;
  if (!Array.isArray(property)) {
    fail(`Path "${path}" segment "${segment}": "${key}" is not an array`);
  }
  if (selector.includes("=")) {
    const equalsAt = selector.indexOf("=");
    const field = selector.slice(0, equalsAt);
    const wanted = coerceScalar(selector.slice(equalsAt + 1));
    return property.filter(
      (element) => isJsonObject(element) && element[field] === wanted,
    );
  }
  const found = property.filter(
    (element) =>
      isJsonObject(element) &&
      (element.combatantId === selector || element.id === selector),
  );
  if (found.length !== 1) {
    fail(
      `Path "${path}" segment "${segment}": selector "${selector}" matched ${found.length} elements`,
    );
  }
  return found[0];
}

function coerceScalar(raw: string): unknown {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+$/.test(raw)) return Number(raw);
  return raw;
}

class Driver {
  private readonly root: McpCompositionRoot;
  private readonly lines: string[] = [];
  private seq = 0;

  constructor(
    private readonly scenario: Scenario,
    header: TranscriptHeader,
  ) {
    this.root = createMcpCompositionRoot();
    this.lines.push(JSON.stringify(header));
  }

  transcript(): string {
    return `${this.lines.join("\n")}\n`;
  }

  call(tool: string, args: unknown): JsonObject {
    const result = handleToolCall(this.root, tool, args);
    const payload = toolResultPayload(result);
    this.lines.push(
      JSON.stringify({
        seq: ++this.seq,
        tool,
        args,
        response: payload,
        responseSha256: sha256Canonical(payload),
      }),
    );
    if (result.isError === true) {
      fail(
        `Tool ${tool} returned an error at seq ${this.seq}: ${JSON.stringify(payload)}`,
      );
    }
    if (!isJsonObject(payload)) {
      fail(`Tool ${tool} returned a non-object payload at seq ${this.seq}`);
    }
    return payload;
  }

  run(): { readonly actResponses: readonly JsonObject[] } {
    const { setup } = this.scenario;
    for (const participant of setup.participants) {
      this.call("select_stat_block", { statBlockId: participant.statBlockId });
    }
    this.call("start_battle", {
      battleId: setup.battleId,
      initialCombatants: setup.participants.map((participant) => ({
        kind: "statBlock",
        statBlockId: participant.statBlockId,
        combatantId: participant.combatantId,
        initiative: participant.initiative,
        admissionSource: { kind: "encounterParticipant" },
      })),
    });

    const actResponses: JsonObject[] = [];
    for (const [index, act] of this.scenario.script.entries()) {
      actResponses.push(this.runAct(act, index + 1));
    }
    return { actResponses };
  }

  private runAct(act: ScriptAct, actNumber: number): JsonObject {
    const discovery = this.call("discover_battle_acts", {});
    const snapshot = discovery.snapshot;
    if (!isJsonObject(snapshot) || snapshot.currentActorId !== act.actor) {
      fail(
        `Act ${actNumber}: expected current actor "${act.actor}", got ${JSON.stringify(
          isJsonObject(snapshot) ? snapshot.currentActorId : snapshot,
        )}`,
      );
    }

    const actResponse = Match.value(act).pipe(
      Match.when({ kind: "meleeAttackHit" }, (attack) => {
        const selected = selectAct(discovery, attack.actSelector, actNumber);
        const response = this.fillUntilResolved(
          selected,
          attack.resolution,
          actNumber,
        );
        const tag = isJsonObject(response.result)
          ? response.result.tag
          : undefined;
        if (tag !== "resolved") {
          fail(
            `Act ${actNumber}: expected resolved result, got ${JSON.stringify(tag)}`,
          );
        }
        return response;
      }),
      Match.when({ kind: "isolationPass" }, () => discovery),
      Match.exhaustive,
    );

    return Match.value(act.then).pipe(
      Match.when("continue", () => actResponse),
      Match.when("endTurn", () => {
        const ended = this.call("end_turn", { actorId: act.actor });
        return act.kind === "isolationPass" ? ended : actResponse;
      }),
      Match.exhaustive,
    );
  }

  private fillUntilResolved(
    selected: SelectedAct,
    resolution: Extract<
      ScriptAct,
      { readonly kind: "meleeAttackHit" }
    >["resolution"],
    actNumber: number,
  ): JsonObject {
    let response: JsonObject | undefined;
    for (let guard = 0; guard < 16; guard++) {
      const fill = this.nextFill(
        response,
        selected.initialHole,
        resolution,
        actNumber,
      );
      if (fill === undefined) {
        if (response === undefined) {
          fail(`Act ${actNumber}: no fills apply but none were attempted`);
        }
        return response;
      }
      response = this.call("fill_battle_hole", {
        subjectJson: JSON.stringify(selected.subject),
        fillJson: JSON.stringify(fill),
      });
      if (isJsonObject(response.result) && response.result.tag === "resolved") {
        return response;
      }
    }
    fail(`Act ${actNumber}: fill loop did not converge`);
  }

  private nextFill(
    response: JsonObject | undefined,
    initialHole: JsonObject,
    resolution: Extract<
      ScriptAct,
      { readonly kind: "meleeAttackHit" }
    >["resolution"],
    actNumber: number,
  ): JsonObject | undefined {
    if (response === undefined) {
      return attackTargetFill(initialHole, resolution.targetChoice);
    }
    const result = response.result;
    if (!isJsonObject(result) || result.tag !== "needsHoles") return undefined;
    const holes = result.holes;
    if (!Array.isArray(holes) || holes.length === 0) {
      fail(`Act ${actNumber}: needsHoles without holes`);
    }
    const hole = holes[0];
    if (!isJsonObject(hole)) fail(`Act ${actNumber}: malformed hole`);
    return Match.value(hole.kind).pipe(
      Match.when("targetChoice", () =>
        attackTargetFill(hole, resolution.targetChoice),
      ),
      Match.when("attackRoll", () =>
        attackRollFill(
          hole,
          resolution.attackRoll,
          resolution.attackNaturalD20,
        ),
      ),
      Match.when("rolledDice", () =>
        rolledDiceFill(hole, resolution.damage.rolledDice),
      ),
      Match.when("attackDamageDisposition", () => {
        if (typeof hole.holeId !== "string") {
          fail("attackDamageDisposition hole lacks holeId");
        }
        return {
          kind: "attackDamageDisposition",
          holeId: hole.holeId,
          value: {
            kind:
              resolution.damage.kind === "reducesToZeroHitPoints"
                ? resolution.damage.disposition
                : fail(
                    `Act ${actNumber}: runtime requested zero-HP disposition for positive-HP scenario outcome`,
                  ),
          },
        };
      }),
      Match.orElse(() =>
        fail(
          `Act ${actNumber}: unsupported hole kind ${JSON.stringify(hole.kind)}`,
        ),
      ),
    );
  }
}

type SelectedAct = {
  readonly subject: JsonObject;
  readonly initialHole: JsonObject;
};

function selectAct(
  discovery: JsonObject,
  selector: Extract<
    ScriptAct,
    { readonly kind: "meleeAttackHit" }
  >["actSelector"],
  actNumber: number,
): SelectedAct {
  const acts = discovery.availableActs;
  if (!Array.isArray(acts)) fail(`Act ${actNumber}: no availableActs array`);
  const initialMatches = acts.filter((candidate) => {
    if (!isJsonObject(candidate) || !isJsonObject(candidate.subject)) {
      return false;
    }
    const text = `${candidate.label ?? ""} ${candidate.summary ?? ""}`;
    if (
      selector.labelContains !== undefined &&
      !text.includes(selector.labelContains)
    ) {
      return false;
    }
    if (
      selector.subjectKind !== undefined &&
      candidate.subject.action !== selector.subjectKind &&
      candidate.subject.tag !== selector.subjectKind
    ) {
      return false;
    }
    return true;
  });
  // Prefer the rolled variant over the fixed-damage notation variant.
  const rolled = initialMatches.filter(
    (candidate) =>
      isJsonObject(candidate) &&
      isJsonObject(candidate.subject) &&
      candidate.subject.statBlockDamageNotation === undefined,
  );
  const matches =
    initialMatches.length > 1 && rolled.length > 0 ? rolled : initialMatches;
  if (matches.length !== 1) {
    fail(
      `Act ${actNumber}: selector ${JSON.stringify(selector)} matched ${matches.length} acts`,
    );
  }
  const act = matches[0];
  if (
    !isJsonObject(act) ||
    !isJsonObject(act.subject) ||
    !Array.isArray(act.initialHoles) ||
    act.initialHoles.length === 0 ||
    !isJsonObject(act.initialHoles[0])
  ) {
    fail(`Act ${actNumber}: matched act has no subject and initial hole`);
  }
  return { subject: act.subject, initialHole: act.initialHoles[0] };
}

function attackTargetFill(hole: JsonObject, targetId: string): JsonObject {
  const attack = hole.attack;
  if (
    typeof hole.holeId !== "string" ||
    !isJsonObject(attack) ||
    typeof attack.actorId !== "string" ||
    !isJsonObject(attack.selection) ||
    typeof attack.selection.procedureRef !== "string" ||
    attack.targetConstraint !== "meleeReach"
  ) {
    fail("Scripted probe requires a melee target-choice hole");
  }
  const selection = {
    procedureRef: attack.selection.procedureRef,
    ...(typeof attack.selection.attackAbility === "string"
      ? { attackAbility: attack.selection.attackAbility }
      : {}),
    ...(typeof attack.selection.attackDamageType === "string"
      ? { attackDamageType: attack.selection.attackDamageType }
      : {}),
  };
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId: attack.actorId,
        targetId,
        ...selection,
      },
    ],
  };
}

function attackRollFill(
  hole: JsonObject,
  total: number,
  naturalD20: number,
): JsonObject {
  if (typeof hole.holeId !== "string") fail("attackRoll hole lacks holeId");
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total,
      naturalD20,
      ...(typeof hole.rollMode === "string" ? { rollMode: hole.rollMode } : {}),
    },
  };
}

function rolledDiceFill(
  hole: JsonObject,
  groups: readonly (readonly number[])[],
): JsonObject {
  if (typeof hole.holeId !== "string") fail("rolledDice hole lacks holeId");
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: groups.map((results) => ({ results })),
  };
}

function parseArgs(argv: readonly string[]): {
  readonly scenarioPath: string;
  readonly transcriptPath: string;
} {
  const [scenarioPath, ...rest] = argv;
  if (scenarioPath === undefined) {
    fail("Usage: driver.ts <scenario.json> --transcript <out.jsonl>");
  }
  const flag = rest.indexOf("--transcript");
  const transcriptPath = flag >= 0 ? rest[flag + 1] : undefined;
  if (transcriptPath === undefined) {
    fail("Usage: driver.ts <scenario.json> --transcript <out.jsonl>");
  }
  return { scenarioPath, transcriptPath };
}

function main(): void {
  const { scenarioPath, transcriptPath } = parseArgs(process.argv.slice(2));
  const decoded = parseScenario(
    JSON.parse(readFileSync(resolve(repoRoot, scenarioPath), "utf8")),
  );
  if (Either.isLeft(decoded)) {
    fail(`Invalid scenario ${scenarioPath}: ${decoded.left}`);
  }
  const scenario = decoded.right;

  const driver = new Driver(scenario, {
    type: "header",
    scenarioId: scenario.id,
    kind: scenario.kind,
    rawCitations: scenario.rawCitations,
    gitSha: currentGitSha(),
    startedAt: new Date().toISOString(),
  });

  const writeTranscript = () => {
    const outPath = resolve(repoRoot, transcriptPath);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, driver.transcript(), "utf8");
  };

  const actResponses = (() => {
    try {
      return driver.run().actResponses;
    } finally {
      writeTranscript();
    }
  })();

  const finalResponse = lastResponse(driver.transcript());
  let failures = 0;
  for (const expectation of scenario.expectations) {
    const base =
      expectation.afterAct === undefined
        ? finalResponse
        : actResponses[expectation.afterAct - 1];
    if (base === undefined) {
      console.log(
        `FAIL afterAct=${expectation.afterAct} ${expectation.path}: no such act`,
      );
      failures++;
      continue;
    }
    const actual = Either.try({
      try: () => resolvePath(base, expectation.path),
      catch: (error) =>
        error instanceof Error ? error.message : String(error),
    });
    if (Either.isLeft(actual)) {
      console.log(`FAIL ${expectation.path}: ${actual.left}`);
      failures++;
      continue;
    }
    const passed =
      sha256Canonical(actual.right) === sha256Canonical(expectation.equals);
    if (!passed) failures++;
    const scope =
      expectation.afterAct === undefined
        ? "final"
        : `afterAct=${expectation.afterAct}`;
    console.log(
      `${passed ? "PASS" : "FAIL"} ${scope} ${expectation.path}` +
        ` expected=${JSON.stringify(expectation.equals)} actual=${JSON.stringify(actual.right)}` +
        (expectation.citation ? ` [${expectation.citation}]` : "") +
        (expectation.note ? ` — ${expectation.note}` : ""),
    );
  }

  if (failures > 0) {
    console.log(`\n${failures} expectation(s) failed. Probe outcome: FAIL`);
    process.exitCode = 1;
  } else {
    console.log("\nAll expectations passed. Probe outcome: PASS");
  }
}

function lastResponse(transcript: string): unknown {
  const lines = transcript.trim().split("\n");
  const last: unknown = JSON.parse(lines[lines.length - 1]);
  if (!isJsonObject(last) || !("response" in last)) {
    fail("Transcript has no final scripted response");
  }
  return last.response;
}

main();
