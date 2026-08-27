import fc from "fast-check";
import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  BattleFillSchema,
  BattleSnapshotSchema,
  StatBlockExecutionSnapshotSchema,
} from "./battle-reducer/battle-codecs.ts";
import {
  battleId,
  battleExecutionScopeOrdinal,
  combatantId,
} from "./identity.ts";
import {
  attackRollFill,
  battleProcedureExecutionRefForTest,
  fighterAttackSubject,
  fighterTurnWithReadiedAcidAndSecondReadiedRay,
  fighterTurnWithReadiedRay,
  fighterVsGoblinBattle,
  fighterId,
  goblinId,
  movementFill,
  monsterResourceStatBlock,
  requireHole,
  resolveBattleSubject,
  snapshotBattle,
  targetFill,
} from "./battle-runtime.test-support.ts";
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
  const initial = snapshotBattle(state);
  const attack = resolveBattleSubject({
    state,
    subject: fighterAttackSubject(state),
    fills: [],
  });
  if (attack.tag !== "needsHoles") {
    throw new Error("Expected a reachable attack discovery snapshot.");
  }
  const readied = snapshotBattle(fighterTurnWithReadiedRay("attackHit"));
  const nestedReadied = snapshotBattle(
    fighterTurnWithReadiedAcidAndSecondReadiedRay(),
  );
  return [initial, attack.snapshot, readied, nestedReadied].map((snapshot) =>
    Schema.encodeSync(BattleSnapshotSchema)(snapshot),
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
    [monsterResourceStatBlock()],
    battleExecutionScopeOrdinal(0),
  ).admissions[0];
  if (admission === undefined) {
    throw new Error("Expected a reachable Stat Block execution admission.");
  }
  return Schema.encodeSync(StatBlockExecutionSnapshotSchema)(
    admission.execution,
  );
}

describe("GH-227 battle codec properties", () => {
  test.each(encodedSnapshots())(
    "reachable snapshot %# preserves its decoded graph under encode/decode",
    (encoded) => {
      const decoded = Schema.decodeUnknownResult(BattleSnapshotSchema)(encoded);
      expect(Result.isSuccess(decoded)).toBe(true);
      if (Result.isFailure(decoded)) return;
      expect(Schema.encodeSync(BattleSnapshotSchema)(decoded.success)).toEqual(
        encoded,
      );
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

  test("generated duplicate ammunition ownership is rejected at the unknown snapshot boundary", () => {
    const encoded = encodedSnapshots()[0];
    fc.assert(
      fc.property(
        fc.nat({ max: 100 }),
        fc.nat({ max: 100 }),
        (firstRemaining, secondRemaining) => {
          const malformed = replaceFirstRecordInArray(
            encoded,
            "combatants",
            (combatant) => ({
              ...combatant,
              ammunitionStocks: [
                { ammunition: "arrow", remaining: firstRemaining },
                { ammunition: "arrow", remaining: secondRemaining },
              ],
            }),
          );
          expect(
            Result.isFailure(
              Schema.decodeUnknownResult(BattleSnapshotSchema)(malformed),
            ),
          ).toBe(true);
        },
      ),
      PROPERTY_OPTIONS,
    );
  });

  test("single act-owner and readied-spell mutations are rejected precisely", () => {
    const encoded = encodedSnapshots()[2];
    const unknownActOwner = replaceFirstRecordInArray(encoded, "acts", (act) =>
      replaceRecordField(act, "subject", (subject) => ({
        ...subject,
        actorId: "missing-combatant",
      })),
    );
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleSnapshotSchema)(unknownActOwner),
      ),
    ).toBe(true);

    const unknownReadiedProcedure = replaceRecordField(
      encoded,
      "readiedResponses",
      (responses) =>
        replaceFirstRecordInArray(responses, "spells", (spell) => ({
          ...spell,
          procedureRef: "unbound-readied-spell",
        })),
    );
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleSnapshotSchema)(
          unknownReadiedProcedure,
        ),
      ),
    ).toBe(true);
  });
});
