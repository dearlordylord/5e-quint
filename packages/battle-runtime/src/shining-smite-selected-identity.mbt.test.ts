// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B25-SHINING-SMITE-IDENTITY-WITNESS shining_smite
// UNIT-IDENTITY-MBT-REPLAY: B25-SHINING-SMITE-IDENTITY-WITNESS shining_smite doDiscoverShiningSmiteAfterHitDamageIllumination
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";

import { SHINING_SMITE_BRIGHT_LIGHT_RADIUS_FEET } from "./battle-reducer/spells-active-effects.ts";
import {
  shiningSmiteUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  reactionDecisionFill,
  requireHole,
  requireResultHole,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  elapsedTimeTicks,
  movementFeet,
  resolveBattleReaction,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";

const shiningSmiteSelectedIdentityDriverSchema = {
  init: {},
  doDiscoverShiningSmiteAfterHitDamageIllumination: {},
  step: {},
} as const;
type ShiningSmiteSelectedIdentityDriverAction = Exclude<
  keyof typeof shiningSmiteSelectedIdentityDriverSchema,
  "init" | "step"
>;

const shiningSmiteSelectedIdentityResults = [
  "init",
  "shiningSmiteAfterHitDamageIllumination",
] as const;
type ShiningSmiteSelectedIdentityResult =
  (typeof shiningSmiteSelectedIdentityResults)[number];
type ShiningSmiteSelectedIdentityProjection = {
  readonly lastResult: ShiningSmiteSelectedIdentityResult;
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly ShiningSmiteSelectedIdentityDriverAction[];
  readonly expected: ShiningSmiteSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "B25-SHINING-SMITE-IDENTITY-WITNESS";
  readonly unitId: typeof shiningSmiteUnitId;
  readonly actions: readonly ShiningSmiteSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "B25-SHINING-SMITE-IDENTITY-WITNESS",
    unitId: "shining_smite",
    actions: ["doDiscoverShiningSmiteAfterHitDamageIllumination"],
    sequences: [
      {
        name: "selected-shining-smite-after-hit-damage-illumination",
        actions: ["doDiscoverShiningSmiteAfterHitDamageIllumination"],
        expected: expectedProjection("shiningSmiteAfterHitDamageIllumination"),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Shining Smite selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<ShiningSmiteSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createShiningSmiteSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Shining Smite selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Shining Smite selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Shining Smite selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-shining-smite-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createShiningSmiteSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: shiningSmiteSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createShiningSmiteSelectedIdentityDriver() {
  return defineDriver(shiningSmiteSelectedIdentityDriverSchema, () => {
    let projection = expectedProjection("init");

    function reset(): void {
      projection = expectedProjection("init");
    }

    function discoverShiningSmiteAfterHitDamageIllumination(): void {
      const spell = spellRecord(shiningSmiteUnitId);
      const state = spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 3, count: 1 }],
        attack: zeroAbilityWeaponAttack("weapon_longsword"),
        targetHp: 30,
        targetMaxHp: 30,
      });
      const subject = weaponAttackSubject("Longsword");
      const target = requireResultHole(
        resolveBattleSubject({ state, subject, fills: [] }),
        "targetChoice",
      );
      const targetFill = attackTargetFill(
        target,
        spellCasterId,
        spellTargetId,
        "Longsword",
      );
      const roll = requireResultHole(
        resolveBattleSubject({ state, subject, fills: [targetFill] }),
        "attackRoll",
      );
      const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
      const awaitingReaction = resolveBattleSubject({
        state,
        subject,
        fills: [targetFill, rollFill],
      });
      if (awaitingReaction.tag !== "needsHoles") {
        throw new Error("Expected Shining Smite attack-hit window.");
      }
      const choice = awaitingReaction.snapshot.pendingReaction?.choices.find(
        (candidate) =>
          candidate.kind === "castAttackHitBonusActionSpell" &&
          candidate.invocation.spellId === shiningSmiteUnitId,
      );
      if (
        choice === undefined ||
        choice.kind !== "castAttackHitBonusActionSpell"
      ) {
        throw new Error("Expected selected Shining Smite after-hit choice.");
      }
      expect(choice.invocation).toEqual(
        spellSlotInvocationRef(
          shiningSmiteUnitId,
          3,
          "afterHitDamageAndIllumination",
        ),
      );

      const afterShining = resolveBattleReaction({
        state: awaitingReaction.state,
        fill: reactionDecisionFill(
          requireHole(awaitingReaction.holes, "reactionDecision"),
          {
            kind: "resolve",
            reactorId: spellCasterId,
            choice: {
              kind: "castAttackHitBonusActionSpell",
              invocation: choice.invocation,
              fills: [],
            },
          },
        ),
      });
      if (afterShining.tag !== "needsHoles") {
        throw new Error("Expected Shining Smite to request attack damage.");
      }
      const damage = requireHole(afterShining.holes, "rolledDice");
      expect(damage).toEqual(
        expect.objectContaining({
          spellWeaponDamageRiders: [
            expect.objectContaining({
              sourceSpellId: shiningSmiteUnitId,
              damage: {
                expr: { dice: 3, dieSize: 6 },
                damageType: "radiant",
              },
            }),
          ],
        }),
      );
      const afterWeaponDamage = resolveBattleSubject({
        state: afterShining.state,
        subject,
        fills: [
          targetFill,
          rollFill,
          damageRollFillWithGroups(damage, [[4], [1, 2, 3]]),
        ],
      });
      if (afterWeaponDamage.tag !== "resolved") {
        throw new Error("Expected Shining Smite host attack to resolve.");
      }
      expect(snapshotBattle(afterWeaponDamage.state).lightEmitters).toEqual([
        {
          kind: "spellLightEmitter",
          sourceSpellId: shiningSmiteUnitId,
          sourceCombatantId: spellCasterId,
          attachment: { kind: "combatant", combatantId: spellTargetId },
          emission: {
            kind: "brightAndDim",
            brightRadiusFeet: SHINING_SMITE_BRIGHT_LIGHT_RADIUS_FEET,
            dimAdditionalFeet: movementFeet(0),
          },
          opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
          expiresAt: {
            kind: "concentration",
            combatantId: spellCasterId,
            durationTicks: elapsedTimeTicks(10),
          },
        },
      ]);
      projection = expectedProjection("shiningSmiteAfterHitDamageIllumination");
    }

    return {
      init: reset,
      doDiscoverShiningSmiteAfterHitDamageIllumination:
        discoverShiningSmiteAfterHitDamageIllumination,
      getState: () => projection,
      step: () => {},
    };
  });
}

function expectedProjection(
  lastResult: ShiningSmiteSelectedIdentityResult,
): ShiningSmiteSelectedIdentityProjection {
  return { lastResult };
}

function normalizeShiningSmiteSelectedIdentityQuintState(
  raw: unknown,
): ShiningSmiteSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    lastResult: mbtLastResult(state["qLastResult"]),
  };
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Shining Smite selected identity state record.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function mbtLastResult(
  raw: unknown,
): ShiningSmiteSelectedIdentityProjection["lastResult"] {
  if (typeof raw === "string" && isShiningSmiteSelectedIdentityResult(raw)) {
    return raw;
  }
  throw new Error(
    `Unexpected Shining Smite selected identity result ${String(raw)}.`,
  );
}

function isShiningSmiteSelectedIdentityResult(
  value: string,
): value is ShiningSmiteSelectedIdentityResult {
  return shiningSmiteSelectedIdentityResults.some((result) => result === value);
}

const shiningSmiteSelectedIdentityStateCheck = stateCheck(
  normalizeShiningSmiteSelectedIdentityQuintState,
  (
    spec: ShiningSmiteSelectedIdentityProjection,
    impl: ShiningSmiteSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
