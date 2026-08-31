import fc from "fast-check";
import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  BattleCheckpointFrontierEnvelopeSchema,
  BattleFillSchema,
  StatBlockExecutionSnapshotSchema,
} from "./battle-reducer/battle-codecs.ts";
import {
  battleId,
  battleExecutionScopeOrdinal,
  combatantId,
} from "./identity.ts";
import {
  admittedStatBlockSource,
  attackRollFill,
  battleProcedureExecutionRefForTest,
  battleCheckpointFrontierEnvelope,
  fighterAttackSubject,
  fighterTurnWithReadiedAcidAndSecondReadiedRay,
  fighterTurnWithReadiedRay,
  fighterVsGoblinBattle,
  fighterId,
  goblinId,
  movementFill,
  monsterResourceStatBlock,
  monsterResourceStatBlockWithSharedResource,
  requireHole,
  resolveBattleSubject,
  targetFill,
} from "./battle-runtime.test-support.ts";
import type { BattleHole } from "./battle-runtime.test-support.ts";
import { statBlockExecutionAdmissionCohort } from "./stat-block-execution.ts";

const PROPERTY_OPTIONS = { numRuns: 64, seed: 0x227c0dec } as const;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function replaceFirstRecordInArray(
  value: unknown,
  key: string,
  replace: (record: UnknownRecord) => UnknownRecord,
): UnknownRecord {
  if (!isRecord(value)) throw new Error(`Expected a record with ${key}.`);
  const entries = value[key];
  if (!Array.isArray(entries))
    throw new Error(`Expected ${key} to be an array.`);
  const first = entries[0];
  if (!isRecord(first)) throw new Error(`Expected ${key}[0] to be a record.`);
  return { ...value, [key]: [replace(first), ...entries.slice(1)] };
}

function replaceRecordField(
  value: unknown,
  key: string,
  replace: (record: UnknownRecord) => UnknownRecord,
): UnknownRecord {
  if (!isRecord(value)) throw new Error(`Expected a record with ${key}.`);
  const field = value[key];
  if (!isRecord(field)) throw new Error(`Expected ${key} to be a record.`);
  return { ...value, [key]: replace(field) };
}

function encodedSnapshots() {
  const state = fighterVsGoblinBattle();
  const initial = battleCheckpointFrontierEnvelope(state);
  const attack = resolveBattleSubject({
    state,
    subject: fighterAttackSubject(state),
    fills: [],
  });
  if (attack.tag !== "needsHoles") {
    throw new Error("Expected a reachable attack discovery snapshot.");
  }
  const firstAttackHole = attack.holes[0];
  if (firstAttackHole === undefined) {
    throw new Error("Expected a non-empty attack frontier.");
  }
  const attackHoles: [BattleHole, ...BattleHole[]] = [
    firstAttackHole,
    ...attack.holes.slice(1),
  ];
  const attackEnvelope = {
    checkpoint: attack.snapshot,
    frontier: {
      kind: "holes" as const,
      subject: attack.subject,
      holes: attackHoles,
      continuation: { kind: "ordinaryReplay" as const },
    },
  };
  const readied = battleCheckpointFrontierEnvelope(
    fighterTurnWithReadiedRay("attackHit"),
  );
  const nestedReadied = battleCheckpointFrontierEnvelope(
    fighterTurnWithReadiedAcidAndSecondReadiedRay(),
  );
  return [initial, attackEnvelope, readied, nestedReadied].map((envelope) =>
    Schema.encodeSync(BattleCheckpointFrontierEnvelopeSchema)(envelope),
  );
}

function encodedFills() {
  const state = fighterVsGoblinBattle();
  const attackSubject = fighterAttackSubject(state);
  const targetHole = requireHole(
    resolveBattleSubject({ state, subject: attackSubject, fills: [] }),
    "targetChoice",
  );
  const target = targetFill(targetHole, goblinId);
  const attackHole = requireHole(
    resolveBattleSubject({ state, subject: attackSubject, fills: [target] }),
    "attackRoll",
  );
  const attackRoll = attackRollFill(attackHole, {
    total: 15,
    naturalD20: 15,
  });
  const movementHole = requireHole(
    resolveBattleSubject({
      state,
      subject: { tag: "runtimeCommand", actorId: fighterId, command: "move" },
      fills: [],
    }),
    "movement",
  );
  const movement = movementFill(movementHole, {
    movementCostFeet: 5,
    provokedOpportunityAttacks: [],
  });
  return [target, attackRoll, movement].map((fill) =>
    Schema.encodeSync(BattleFillSchema)(fill),
  );
}

function encodedStatBlockSnapshots() {
  const admission = statBlockExecutionAdmissionCohort(
    battleId("gh227-codec-stat-block"),
    combatantId("gh227-codec-stat-block"),
    [admittedStatBlockSource(monsterResourceStatBlock())],
    battleExecutionScopeOrdinal(0),
  ).admissions[0];
  if (admission === undefined) {
    throw new Error("Expected a reachable Stat Block execution admission.");
  }
  return Schema.encodeSync(StatBlockExecutionSnapshotSchema)(
    admission.execution,
  );
}

function encodedSharedResourceStatBlockSnapshot() {
  const admission = statBlockExecutionAdmissionCohort(
    battleId("gh227-codec-shared-resource-stat-block"),
    combatantId("gh227-codec-shared-resource-stat-block"),
    [admittedStatBlockSource(monsterResourceStatBlockWithSharedResource())],
    battleExecutionScopeOrdinal(0),
  ).admissions[0];
  if (admission === undefined) {
    throw new Error(
      "Expected a reachable shared-resource Stat Block admission.",
    );
  }
  return Schema.encodeSync(StatBlockExecutionSnapshotSchema)(
    admission.execution,
  );
}

describe("GH-227 battle codec properties", () => {
  test.each(encodedSnapshots())(
    "reachable checkpoint frontier envelope %# preserves its decoded graph under encode/decode",
    (encoded) => {
      const decoded = Schema.decodeUnknownResult(
        BattleCheckpointFrontierEnvelopeSchema,
      )(encoded);
      expect(Result.isSuccess(decoded)).toBe(true);
      if (Result.isFailure(decoded)) return;
      expect(
        Schema.encodeSync(BattleCheckpointFrontierEnvelopeSchema)(
          decoded.success,
        ),
      ).toEqual(encoded);
    },
  );

  test.each(encodedFills())(
    "reachable fill %# preserves its boundary representation",
    (encoded) => {
      const decoded = Schema.decodeUnknownResult(BattleFillSchema)(encoded);
      expect(Result.isSuccess(decoded)).toBe(true);
      if (Result.isFailure(decoded)) return;
      expect(Schema.encodeSync(BattleFillSchema)(decoded.success)).toEqual(
        encoded,
      );
    },
  );

  test("a reachable Stat Block execution graph round-trips", () => {
    const encoded = encodedStatBlockSnapshots();
    const decoded = Schema.decodeUnknownResult(
      StatBlockExecutionSnapshotSchema,
    )(encoded);
    expect(Result.isSuccess(decoded)).toBe(true);
    if (Result.isFailure(decoded)) return;
    expect(
      Schema.encodeSync(StatBlockExecutionSnapshotSchema)(decoded.success),
    ).toEqual(encoded);
  });

  test("a shared Stat Block resource pool referenced by multiple bindings round-trips", () => {
    const encoded = encodedSharedResourceStatBlockSnapshot();
    const sharedRefs = encoded.procedureBindings
      .filter((binding) => binding.resourcePoolRefs.length > 0)
      .flatMap((binding) => binding.resourcePoolRefs);
    expect(new Set(sharedRefs).size).toBeLessThan(sharedRefs.length);
    const decoded = Schema.decodeUnknownResult(
      StatBlockExecutionSnapshotSchema,
    )(encoded);
    expect(Result.isSuccess(decoded)).toBe(true);
    if (Result.isFailure(decoded)) return;
    expect(
      Schema.encodeSync(StatBlockExecutionSnapshotSchema)(decoded.success),
    ).toEqual(encoded);
  });

  test.each([0, -2])(
    "rejects runtime Stat Block procedure ordinal %s",
    (procedureOrdinal) => {
      const encoded = encodedStatBlockSnapshots();
      const malformed = replaceFirstRecordInArray(
        encoded,
        "procedureBindings",
        (binding) => ({
          ...binding,
          procedure: replaceProcedureField(
            binding,
            "procedureOrdinal",
            procedureOrdinal,
          ),
        }),
      );
      expect(
        Result.isFailure(
          Schema.decodeUnknownResult(StatBlockExecutionSnapshotSchema)(
            malformed,
          ),
        ),
      ).toBe(true);
    },
  );

  test("rejects a negative ordinal on an authored attack binding", () => {
    const encoded = encodedStatBlockSnapshots();
    const malformed = replaceFirstRecordInArray(
      encoded,
      "procedureBindings",
      (binding) => ({
        ...binding,
        procedure: replaceProcedureField(binding, "procedureOrdinal", -1),
      }),
    );
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(StatBlockExecutionSnapshotSchema)(malformed),
      ),
    ).toBe(true);
  });

  test("rejects duplicate runtime Stat Block procedure ordinals", () => {
    const encoded = encodedStatBlockSnapshots();
    const ordinalBindings = encoded.procedureBindings.filter(
      (binding) =>
        binding.procedure.kind !== "effectOccurrenceSource" &&
        binding.procedure.kind !== "unarmedStrike",
    );
    const first = ordinalBindings[0];
    const second = ordinalBindings[1];
    if (
      first === undefined ||
      second === undefined ||
      first.procedure.kind === "effectOccurrenceSource" ||
      second.procedure.kind === "effectOccurrenceSource" ||
      first.procedure.kind === "unarmedStrike" ||
      second.procedure.kind === "unarmedStrike"
    ) {
      throw new Error("Expected two ordinal-bearing procedure bindings.");
    }
    const firstProcedure = first.procedure;
    const firstProcedureOrdinal = firstProcedure.procedureOrdinal;
    const malformed = {
      ...encoded,
      procedureBindings: encoded.procedureBindings.map((binding) =>
        binding.procedureRef === second.procedureRef
          ? {
              ...binding,
              procedure: {
                ...binding.procedure,
                procedureOrdinal: firstProcedureOrdinal,
              },
            }
          : binding,
      ),
    };
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(StatBlockExecutionSnapshotSchema)(malformed),
      ),
    ).toBe(true);
  });

  test("generated missing Stat Block pool edges are rejected", () => {
    const encoded = encodedStatBlockSnapshots();
    fc.assert(
      fc.property(fc.nat({ max: 10_000 }), (suffix) => {
        const malformed = replaceFirstRecordInArray(
          encoded,
          "procedureBindings",
          (binding) => ({
            ...binding,
            resourcePoolRefs: [
              battleProcedureExecutionRefForTest(
                `gh227-missing-pool:${suffix}`,
              ),
            ],
          }),
        );
        expect(
          Result.isFailure(
            Schema.decodeUnknownResult(StatBlockExecutionSnapshotSchema)(
              malformed,
            ),
          ),
        ).toBe(true);
      }),
      PROPERTY_OPTIONS,
    );
  });

  test("generated duplicate ammunition ownership is rejected at the unknown envelope boundary", () => {
    const encoded = encodedSnapshots()[0];
    fc.assert(
      fc.property(
        fc.nat({ max: 100 }),
        fc.nat({ max: 100 }),
        (firstRemaining, secondRemaining) => {
          const malformed = replaceRecordField(
            encoded,
            "checkpoint",
            (checkpoint) =>
              replaceFirstRecordInArray(
                checkpoint,
                "combatants",
                (combatant) => ({
                  ...combatant,
                  ammunitionStocks: [
                    { ammunition: "arrow", remaining: firstRemaining },
                    { ammunition: "arrow", remaining: secondRemaining },
                  ],
                }),
              ),
          );
          expect(
            Result.isFailure(
              Schema.decodeUnknownResult(
                BattleCheckpointFrontierEnvelopeSchema,
              )(malformed),
            ),
          ).toBe(true);
        },
      ),
      PROPERTY_OPTIONS,
    );
  });

  test("single act-owner and readied-spell mutations are rejected precisely", () => {
    const encoded = encodedSnapshots()[2];
    const unknownActOwner = replaceRecordField(
      encoded,
      "frontier",
      (frontier) =>
        replaceFirstRecordInArray(frontier, "acts", (act) =>
          replaceRecordField(act, "subject", (subject) => ({
            ...subject,
            actorId: "missing-combatant",
          })),
        ),
    );
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)(
          unknownActOwner,
        ),
      ),
    ).toBe(true);

    const unknownReadiedProcedure = replaceRecordField(
      encoded,
      "checkpoint",
      (checkpoint) =>
        replaceRecordField(checkpoint, "readiedResponses", (responses) =>
          replaceFirstRecordInArray(responses, "spells", (spell) => ({
            ...spell,
            procedureRef: "unbound-readied-spell",
          })),
        ),
    );
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)(
          unknownReadiedProcedure,
        ),
      ),
    ).toBe(true);
  });
});

function replaceProcedureField(
  binding: UnknownRecord,
  field: string,
  value: unknown,
): UnknownRecord {
  const procedure = binding["procedure"];
  if (!isRecord(procedure)) {
    throw new Error("Expected a procedure object.");
  }
  return { ...procedure, [field]: value };
}
