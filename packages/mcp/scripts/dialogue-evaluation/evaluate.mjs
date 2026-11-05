import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { archivedConclusion } from "./conclusion-review.mjs";
export const DIALOGUE_SOURCE_FILES = [
  "run.mjs",
  "evaluate.mjs",
  "geometry-host.mjs",
  "evaluator-controls.mjs",
  "driver-controls.mjs",
  "codex-run.mjs",
  "codex-server.mjs",
  "conclusion-review.mjs",
];
const body = (result) => {
  if (result?.structuredContent) return result.structuredContent;
  for (const block of result?.content ?? [])
    if (block.type === "text") {
      try {
        return JSON.parse(block.text);
      } catch {
        continue;
      }
    }
  return result;
};
const sorted = (value) =>
  value && typeof value === "object"
    ? Array.isArray(value)
      ? value.map(sorted)
      : Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, sorted(value[key])]),
        )
    : value;
const canonical = (value) => JSON.stringify(sorted(value));
const good = (call) => {
  const b = body(call.result);
  return (
    call.result &&
    !call.error &&
    call.result.isError !== true &&
    ![
      b?.tag,
      b?.result?.tag,
      b?.operation?.result?.tag,
      b?.operation?.result?.result?.tag,
    ].some((tag) =>
      ["invalid", "rejected", "failed", "playSessionUnavailable"].includes(tag),
    )
  );
};
const battle = (state) => state?.operation?.result?.battleEnvelope;
const visit = (value, consume) => {
  if (!value || typeof value !== "object") return;
  consume(value);
  for (const child of Object.values(value)) visit(child, consume);
};
export function dialogueAccepted(verdict) {
  return (
    ["catalog", "session", "wizardBattle"].includes(verdict.expectation) &&
    verdict.cleanScenarioPass === true &&
    (verdict.expectation !== "wizardBattle" || verdict.visualScopePass === true)
  );
}
export function evaluateRun(directory) {
  const read = (name) =>
    JSON.parse(readFileSync(resolve(directory, name), "utf8"));
  const lines = (name) =>
    existsSync(resolve(directory, name))
      ? readFileSync(resolve(directory, name), "utf8")
          .trim()
          .split("\n")
          .filter(Boolean)
          .map(JSON.parse)
      : [];
  const verdict = read("verdict.json"),
    metadata = read("metadata.json");
  const expectation = metadata.expectation ?? verdict.expectation;
  const calls = lines("calls.jsonl"),
    observations = lines("observations.jsonl");
  const final = observations.at(-1)?.states ?? {};
  const ids = Object.keys(final).filter(
    (id) => final[id]?.tag === "playSessionAvailable",
  );
  const target = ids.length === 1 ? ids[0] : null;
  const scoped = calls.filter(
    (call) => call.arguments?.playSessionId === target && good(call),
  );
  const same = (name) => scoped.filter((call) => call.name === name);
  const finalized = same("finalize_character").find((call) => {
    const f = body(call.result)?.operation?.result?.finalization,
      p = f?.build?.progression;
    return (
      f?.tag === "ready" &&
      p?.startingClass === "class_wizard" &&
      p.advancements?.length === 4 &&
      p.advancements.every((a) => a.classUnitId === "class_wizard") &&
      f.build.spellcasting?.sources?.some((s) =>
        s.preparedSpells?.includes("fireball"),
      )
    );
  });
  const characterId =
    finalized && body(finalized.result)?.projection?.characterIds?.length === 1
      ? body(finalized.result).projection.characterIds[0]
      : null;
  const start = same("start_battle").find(
    (call) =>
      characterId &&
      call.arguments?.initialCombatants?.some(
        (c) => c.kind === "characterSession" && c.characterId === characterId,
      ),
  );
  const battleId = start?.arguments?.battleId;
  const actorId = start?.arguments?.initialCombatants?.find(
    (c) => c.kind === "characterSession" && c.characterId === characterId,
  )?.combatantId;
  const afterById = new Map(
    observations
      .filter((o) => o.callId)
      .map((o) => [o.callId, o.states[target]]),
  );
  const selectionAfterById = new Map(
    observations
      .filter((o) => o.callId)
      .map((o) => [o.callId, o.pendingSelectionIds?.[target]]),
  );
  let currentSelection = observations.find((o) =>
    ["initial", "resume"].includes(o.label),
  )?.pendingSelectionIds?.[target];
  let canonicalScopeVerified = true;
  let current = observations.find((o) =>
    ["initial", "resume"].includes(o.label),
  )?.states[target];
  const offeredFireball = new Set(),
    diceGroups = [],
    diceIssues = [],
    fireballs = [];
  let pending = null,
    sampledDiceToolCalls = 0;
  function requestScope(envelope) {
    if (envelope?.frontier?.kind !== "holes") return null;
    if (typeof currentSelection === "string")
      return canonical({
        battleId: envelope.checkpoint.battleId,
        selectionId: currentSelection,
      });
    canonicalScopeVerified = false;
    return canonical({
      battleId: envelope.checkpoint.battleId,
      round: envelope.checkpoint.round,
      actorId: envelope.checkpoint.currentActorId,
      replaySubject: envelope.frontier.replaySubject,
      pendingProcedure: envelope.frontier.pendingProcedure,
    });
  }
  function nextGroup(scope) {
    return diceGroups.find(
      (group) => group.scope === scope && group.remaining.length > 0,
    );
  }
  function consumeD20(test, call, envelope) {
    if (!test) {
      diceIssues.push({ callId: call.callId, reason: "missingD20TestRoll" });
      return false;
    }
    const faces =
      test.tag === "single"
        ? [test.naturalD20]
        : test.tag === "multiple"
          ? [test.first, test.second]
          : [];
    const scope = requestScope(envelope);
    return (
      faces.length > 0 &&
      faces.every((face) => {
        const group = scope === null ? undefined : nextGroup(scope);
        if (!group || group.dieSize !== 20 || group.remaining[0] !== face) {
          diceIssues.push({
            callId: call.callId,
            reason: "d20FaceNotNextForCurrentRequest",
            face,
            expectedFace: group?.remaining[0] ?? null,
            sampledCallId: group?.callId ?? null,
          });
          return false;
        }
        group.remaining.shift();
        return true;
      })
    );
  }
  function consumeGroup(results, call, envelope, requiredDieSize) {
    const scope = requestScope(envelope),
      group = scope === null ? undefined : nextGroup(scope);
    const plan = [];
    let offset = 0;
    const dieSize = requiredDieSize ?? group?.dieSize;
    if (scope !== null && results.length > 0)
      for (const candidate of diceGroups.filter(
        (candidate) =>
          candidate.scope === scope && candidate.remaining.length > 0,
      )) {
        const count = Math.min(
          candidate.remaining.length,
          results.length - offset,
        );
        if (
          candidate.dieSize !== dieSize ||
          canonical(candidate.remaining.slice(0, count)) !==
            canonical(results.slice(offset, offset + count))
        )
          break;
        plan.push({ group: candidate, count });
        offset += count;
        if (offset === results.length) {
          for (const entry of plan)
            entry.group.remaining.splice(0, entry.count);
          return true;
        }
      }
    diceIssues.push({
      callId: call.callId,
      reason: "diceGroupNotNextForCurrentRequest",
      requiredDieSize: requiredDieSize ?? null,
      sampledCallId: group?.callId ?? null,
      results,
    });
    return false;
  }
  for (const call of calls) {
    if (call.arguments?.playSessionId !== target || !good(call)) continue;
    const b = body(call.result),
      before = battle(current),
      afterState = afterById.get(call.callId),
      after = battle(afterState);
    if (call.name === "roll_dice") {
      sampledDiceToolCalls++;
      for (const group of b.operation?.result?.result?.groups ??
        b.operation?.result?.groups ??
        b.groups ??
        [])
        diceGroups.push({
          dieSize: group.dieSize,
          results: group.results,
          remaining: [...group.results],
          callId: call.callId,
          scope: before
            ? (requestScope(before) ?? "unboundBattle")
            : group.dieSize === 20
              ? "initiative"
              : "outsideBattle",
        });
    }
    if (call.name === "start_battle") {
      for (
        let index = 0;
        index < (call.arguments.initialCombatants ?? []).length;
        index++
      ) {
        const group = nextGroup("initiative");
        if (group?.dieSize === 20) group.remaining.shift();
      }
    }
    const selectedSubject =
      call.arguments?.actKey !== undefined
        ? after?.frontier?.replaySubject
        : call.arguments.subject;
    if (
      call.name === "cast_spell" &&
      selectedSubject?.tag === "actionSpell" &&
      selectedSubject.mode?.tag === "cast" &&
      selectedSubject.actorId === actorId &&
      (call.arguments?.actKey === undefined ||
        (before?.frontier?.kind === "acts" &&
          after?.frontier?.kind === "holes" &&
          typeof selectionAfterById.get(call.callId) === "string" &&
          selectionAfterById.get(call.callId) !== currentSelection)) &&
      offeredFireball.has(selectedSubject.procedureRef)
    ) {
      pending = {
        castCallId: call.callId,
        selectionId: selectionAfterById.get(call.callId) ?? null,
        subject: selectedSubject,
        before,
        save: false,
        damage: false,
        sampledSaves: false,
        sampledDamage: false,
        resolved: false,
      };
      fireballs.push(pending);
    }
    if (call.name === "provide_battle_input") {
      const fill = call.arguments.fill;
      const hole =
        before?.frontier?.kind === "holes"
          ? before.frontier.holes.find(
              (h) => h.holeId === fill?.holeId && h.kind === fill.kind,
            )
          : undefined;
      const linked =
        pending &&
        hole &&
        (!pending.selectionId || pending.selectionId === currentSelection) &&
        canonical(before.frontier.replaySubject) ===
          canonical(pending.subject) &&
        (!hole.sourceProcedureRef ||
          hole.sourceProcedureRef === pending.subject.procedureRef);
      if (fill?.kind === "attackRoll")
        consumeD20(fill.value?.d20TestRoll, call, before);
      if (fill?.kind === "savingThrowOutcome") {
        const outcomes = fill.value?.outcomes ?? [];
        const sampled =
          outcomes.length > 0 &&
          outcomes.every(
            (outcome) =>
              outcome.withoutRoll !== true &&
              consumeD20(outcome.d20TestRoll, call, before),
          );
        if (linked) {
          pending.save = true;
          pending.sampledSaves = sampled;
          pending.saveHoleId = fill.holeId;
        }
      }
      if (fill?.kind === "rolledDice") {
        const sampled =
          Array.isArray(fill.value) &&
          fill.value.length > 0 &&
          (!hole?.allocatedDamageDice ||
            fill.value.length === hole.allocatedDamageDice.groups.length) &&
          fill.value.every((group, index) => {
            const requested = hole?.allocatedDamageDice?.groups[index];
            return (
              (!requested || group.results.length === requested.dice) &&
              consumeGroup(
                group.results,
                call,
                before,
                requested?.dieSize ?? (linked ? 6 : undefined),
              )
            );
          });
        if (!sampled && hole?.allocatedDamageDice)
          diceIssues.push({
            callId: call.callId,
            reason: "allocatedDamageDiceRequestMismatch",
          });
        if (linked && pending.save) {
          pending.damage = true;
          pending.sampledDamage = sampled;
          pending.damageHoleId = fill.holeId;
        }
      }
      if (linked && b.operation?.result?.result?.tag === "resolved") {
        pending.resolved = true;
        const beforeCs = pending.before?.checkpoint?.combatants ?? [],
          afterCs = after?.checkpoint?.combatants ?? [];
        pending.hpCommitted = afterCs.some(
          (c) =>
            c.combatantId !== actorId &&
            c.hp <
              (beforeCs.find((old) => old.combatantId === c.combatantId)?.hp ??
                c.hp),
        );
        const slots = (cs) =>
          cs
            .find((c) => c.combatantId === actorId)
            ?.origin?.spellcasting?.spellSlots?.find((s) => s.spellLevel === 3)
            ?.expended;
        pending.slotCommitted =
          Number.isInteger(slots(beforeCs)) &&
          slots(afterCs) === slots(beforeCs) + 1;
        pending = null;
      }
    }
    visit(b, (node) => {
      if (
        node.presentation?.kind === "spell" &&
        node.presentation.invocation?.spellId === "fireball" &&
        node.subject?.actorId === actorId
      )
        offeredFireball.add(node.subject.procedureRef);
    });
    if (afterState) {
      current = afterState;
      currentSelection = selectionAfterById.get(call.callId);
    }
  }
  const priorEnd = observations
    .filter((o) => o.label === "beforeEndBattle")
    .map((o) => o.states[target]);
  const terminal = priorEnd.map(battle).find((e) => {
    const cs = e?.checkpoint?.combatants ?? [],
      character = cs.find((c) => c.combatantId === actorId),
      enemies = cs.filter((c) => c.combatantId !== actorId);
    return (
      e?.checkpoint?.battleId === battleId &&
      e.frontier?.kind === "acts" &&
      character &&
      enemies.length > 0 &&
      (character.hp <= 0 || enemies.every((c) => c.hp <= 0))
    );
  });
  const mechanicalKnockout = Boolean(terminal);
  const cessationReview =
    metadata.evidenceKind === "codingAgentMcp"
      ? archivedConclusion(directory)
      : {
          kind: "unresolved",
          reason: "This client does not run an independent cessation review.",
        };
  const logicalEnd =
    mechanicalKnockout ||
    (cessationReview.kind === "supportedVoluntaryCessation" &&
      cessationReview.playSessionId === target &&
      cessationReview.battleId === battleId);
  const livingTurns = observations
    .map((o) => battle(o.states[target]))
    .filter(
      (e) =>
        e?.checkpoint?.combatants?.find((c) => c.combatantId === actorId)?.hp >
        0,
    );
  const turnEvidenceComplete =
    livingTurns.length > 0 &&
    livingTurns.every((e) => typeof e.checkpoint.currentActorId === "string");
  const legitimatePreTurnDefeat =
    logicalEnd &&
    turnEvidenceComplete &&
    fireballs.length === 0 &&
    terminal.checkpoint.combatants.find((c) => c.combatantId === actorId)?.hp <=
      0 &&
    livingTurns.every((e) => e.checkpoint.currentActorId !== actorId);
  const confirmedFireball = fireballs.some(
    (f) =>
      f.save &&
      f.damage &&
      f.sampledSaves &&
      f.sampledDamage &&
      f.resolved &&
      f.hpCommitted &&
      f.slotCommitted,
  );
  const assertions = {
    catalog: calls.some(
      (call) =>
        call.name === "list_catalog_units" &&
        good(call) &&
        Object.values(body(call.result)?.unitsByKind ?? {}).some(
          (units) => Array.isArray(units) && units.length > 0,
        ),
    ),
    session:
      target !== null &&
      calls.some(
        (call) =>
          call.name === "create_play_session" &&
          good(call) &&
          body(call.result)?.playSessionId === target,
      ),
    exactlyOneObservedSession: target !== null,
    wizardFiveWithPreparedFireball: Boolean(finalized),
    battleUsesFinalizedCharacter: Boolean(start),
    requestedEncounterRoster:
      Boolean(start) &&
      start.arguments.initialCombatants.length === 6 &&
      start.arguments.initialCombatants.filter(
        (c) =>
          c.kind === "statBlock" &&
          c.statBlockId === "stat_block_goblin_warrior",
      ).length === 4 &&
      start.arguments.initialCombatants.filter(
        (c) => c.kind === "statBlock" && c.statBlockId === "stat_block_wolf",
      ).length === 1,
    engineOfferedFireballCast: fireballs.length > 0,
    fireballSaveAccepted: fireballs.some((f) => f.save),
    fireballDamageAccepted: fireballs.some((f) => f.damage),
    sampledFireballCommitted: confirmedFireball,
    sameBattleLogicalEnd: logicalEnd,
    sameBattleKnockout: mechanicalKnockout,
    endedSameSessionBattle:
      same("end_battle").length > 0 &&
      final[target]?.projection?.battleState?.tag === "none",
  };
  const baselineKeys = [
    "session",
    "exactlyOneObservedSession",
    "wizardFiveWithPreparedFireball",
    "battleUsesFinalizedCharacter",
    "requestedEncounterRoster",
    "sameBattleLogicalEnd",
    "endedSameSessionBattle",
  ];
  const scopePass =
    expectation === "catalog"
      ? assertions.catalog
      : expectation === "session"
        ? assertions.session
        : baselineKeys.every((key) => assertions[key]) &&
          (confirmedFireball || legitimatePreTurnDefeat);
  const nativeItems = lines("conversation.jsonl")
    .flatMap((row) => (row.role === "assistant" ? (row.output ?? []) : []))
    .filter((item) => item.type === "code_interpreter_call");
  const files = lines("native-files.jsonl").filter(
    (row) => row.status === "downloaded",
  );
  const sourceMatches = files.every(
    (file) =>
      existsSync(resolve(directory, "artifacts", file.filename)) &&
      createHash("sha256")
        .update(readFileSync(resolve(directory, "artifacts", file.filename)))
        .digest("hex") === file.sha256,
  );
  const visualEvidence = {
    programmaticCodeExecuted:
      metadata.evidenceKind === "codingAgentMcp"
        ? lines("local-python.jsonl").some(
            (item) => item.status === "completed",
          )
        : nativeItems.some((item) => item.status === "completed"),
    pythonExecution:
      metadata.evidenceKind === "codingAgentMcp"
        ? "sandboxedLocalPython"
        : "nativeCodeInterpreter",
    downloadedVisualFiles: files.filter((file) =>
      /\.(svg|png|html|gif|webp)$/i.test(file.filename),
    ).length,
    artifactHashesMatch: sourceMatches,
    duringBattleArtifact: files.some(
      (file) =>
        file.afterCallCount >= calls.indexOf(start) + 1 &&
        file.afterCallCount < calls.length,
    ),
    duringBattleUpdate: files.some(
      (file) =>
        file.afterCallCount > calls.indexOf(start) + 1 &&
        file.afterCallCount <
          calls.findIndex((call) => call.name === "end_battle") + 1,
    ),
    widgetHostVerified: false,
    geometricCorrectnessVerified: false,
    geometryDistanceAudit: "ungraded",
    areaMembershipAudit: "ungraded",
  };
  const engineHashes = new Set(
    observations
      .flatMap((o) => Object.values(o.states))
      .map(battle)
      .filter(Boolean)
      .map((e) => createHash("sha256").update(JSON.stringify(e)).digest("hex")),
  );
  const geometryHashes = new Set();
  for (const file of files.filter((f) => /\.json$/i.test(f.filename))) {
    const path = resolve(directory, "artifacts", file.filename);
    try {
      if (
        createHash("sha256").update(readFileSync(path)).digest("hex") ===
        file.sha256
      )
        geometryHashes.add(
          createHash("sha256")
            .update(JSON.stringify(JSON.parse(readFileSync(path, "utf8"))))
            .digest("hex"),
        );
    } catch {
      continue;
    }
  }
  const hostFrames = lines("live/frames.jsonl");
  const validHostFrames = hostFrames.filter((f) => {
    const path = resolve(directory, "live/frames", f.filename ?? "");
    return (
      /^[0-9]{5}\.svg$/.test(f.filename ?? "") &&
      existsSync(path) &&
      createHash("sha256").update(readFileSync(path)).digest("hex") ===
        f.svgSha256 &&
      engineHashes.has(f.engineSha256) &&
      (f.geometrySha256 === null || geometryHashes.has(f.geometrySha256))
    );
  });
  const intermediateFrames = validHostFrames.filter(
    (f) =>
      f.battleActive &&
      f.geometrySha256 &&
      !f.geometryStale &&
      f.callCount > calls.indexOf(start) + 1 &&
      f.callCount < calls.findIndex((c) => c.name === "end_battle") + 1,
  );
  const lastActiveHostFrame = validHostFrames
    .filter((f) => f.battleActive)
    .at(-1);
  Object.assign(visualEvidence, {
    liveObservedSvgFrames: validHostFrames.length,
    liveIntermediateFreshFrames: intermediateFrames.length,
    liveIntermediateEngineStates: new Set(
      intermediateFrames.map((f) => f.engineSha256),
    ).size,
    liveFrameHashesMatch: validHostFrames.length === hostFrames.length,
    geometryFreshAtEnd: Boolean(
      lastActiveHostFrame?.geometrySha256 && !lastActiveHostFrame.geometryStale,
    ),
    portableTimelineExists: existsSync(resolve(directory, "live/battle.html")),
  });
  const visualScopePass =
    visualEvidence.programmaticCodeExecuted &&
    visualEvidence.artifactHashesMatch &&
    visualEvidence.liveFrameHashesMatch &&
    visualEvidence.liveIntermediateEngineStates >= 2 &&
    visualEvidence.geometryFreshAtEnd &&
    visualEvidence.portableTimelineExists;
  const timeBudgetError = /^Time budget exhausted/.test(
    verdict.infrastructureError ?? "",
  );
  const status = timeBudgetError
    ? "budgetExceeded"
    : ["infrastructureFailed", "budgetExceeded", "sourceChanged"].includes(
          verdict.status,
        )
      ? verdict.status
      : scopePass &&
          verdict.terminationReason === "modelFinished" &&
          (metadata.prototype !== false || canonicalScopeVerified)
        ? "completed"
        : verdict.terminationReason === "prepared"
          ? "prepared"
          : "taskFailed";
  const evaluatorSource = readFileSync(new URL(import.meta.url), "utf8");
  writeFileSync(
    resolve(directory, "evaluator-source.json"),
    JSON.stringify(
      {
        sha256: createHash("sha256").update(evaluatorSource).digest("hex"),
        source: evaluatorSource,
      },
      null,
      2,
    ),
  );
  const evaluated = {
    ...verdict,
    expectation,
    status,
    rawRunClassification: {
      status: verdict.status,
      terminationReason: verdict.terminationReason,
    },
    terminationReason: timeBudgetError
      ? "timeBudget"
      : verdict.terminationReason,
    assertions,
    behaviorSignals: {
      sampledDiceToolCalls,
      diceIssues,
      fireballTransactions: fireballs.map(({ before, ...rest }) => rest),
    },
    visualEvidence,
    visualScopePass,
    cessationReview,
    regressionCoverage: {
      fireballPathObserved: confirmedFireball,
      legitimatePreTurnDefeat,
      canonicalSelectionEvidence:
        canonicalScopeVerified &&
        observations.some((o) =>
          Object.values(o.pendingSelectionIds ?? {}).some(
            (id) => typeof id === "string",
          ),
        ),
    },
    targetPlaySessionId: target,
    targetBattleId: battleId ?? null,
    scopePass,
    cleanScenarioPass:
      status === "completed" &&
      scopePass &&
      calls.every(good) &&
      diceIssues.length === 0 &&
      verdict.sourceUnchanged !== false &&
      (metadata.prototype !== false || canonicalScopeVerified),
    confusionSignals: {
      rejectedToolCalls: calls.filter((call) => !good(call)).length,
      unmatchedExplicitDiceUses: diceIssues.length,
    },
    rejectedCalls: calls.filter((call) => !good(call)),
    evaluator: "independent artifact replay v3",
    gradeScope: "mechanical scenario completion",
    limits: [
      metadata.evidenceKind === "codingAgentMcp"
        ? "Official coding-agent client over native local MCP, sandboxed local Python; not installed ChatGPT or native Code Interpreter"
        : "API function bridge over real local MCP; not native MCP or installed ChatGPT",
      "Mechanical completion requires the requested character/roster and same-battle knockout or independently reviewed voluntary cessation/end, with either an exact sampled and committed Fireball transaction or independently observed pre-turn defeat; Fireball regression coverage is separate",
      "Dice audit covers explicit d20 metadata and dice groups; Initiative modifier derivation and subjective tactical quality remain review items",
      "Live visual scope requires Python-computed geometry artifacts, engine-linked intermediate SVG frames, exact byte hashes and fresh final geometry; installed ChatGPT widget presentation is not certified",
    ],
  };
  writeFileSync(
    resolve(directory, "verdict-reviewed.json"),
    JSON.stringify(evaluated, null, 2),
  );
  return evaluated;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === new URL(import.meta.url).pathname
)
  console.log(JSON.stringify(evaluateRun(resolve(process.argv[2])), null, 2));
