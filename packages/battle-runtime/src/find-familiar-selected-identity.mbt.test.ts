// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.find-familiar-lifecycle
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B22-FIND-FAMILIAR-IDENTITY-WITNESS find_familiar
// UNIT-IDENTITY-MBT-REPLAY: B22-FIND-FAMILIAR-IDENTITY-WITNESS find_familiar doCastFindFamiliar doRecastFindFamiliarReplacement doDismissAndReappearFindFamiliar doDeliverTouchSpellThroughFindFamiliar
import * as path from "node:path";

import {
  DieRollResult,
  abilityModifier,
  proficiencyBonus,
} from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import * as Either from "effect/Either";
import { describe, expect, it } from "vitest";

import { ATTACK_TARGET_HOLE_ID } from "./battle-reducer.ts";
import {
  characterCreature,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  cureWoundsUnitId,
  healingWordUnitId,
  oppositionSide,
  partySide,
  statBlockCatalog,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import {
  battleId,
  combatantId,
  castFindFamiliar,
  deliverTouchSpellThroughFindFamiliar,
  discoverBattleActs,
  findFamiliarFormEligibilityForSpell,
  initiativeScore,
  reappearTemporarilyDismissedFindFamiliar,
  startBattle,
  temporarilyDismissFindFamiliar,
  type BattleState,
  type FindFamiliarFormEligibility,
  type FindFamiliarState,
} from "./index.ts";

const findFamiliarSelectedIdentityDriverSchema = {
  init: {},
  doCastFindFamiliar: {},
  doRecastFindFamiliarReplacement: {},
  doDismissAndReappearFindFamiliar: {},
  doDeliverTouchSpellThroughFindFamiliar: {},
  step: {},
} as const;
type FindFamiliarSelectedIdentityAction = Exclude<
  keyof typeof findFamiliarSelectedIdentityDriverSchema,
  "init" | "step"
>;

type FindFamiliarSelectedIdentityProjection = {
  readonly familiarStatus: FindFamiliarState["status"] | "none";
  readonly formId: string;
  readonly familiarCombatantPresent: boolean;
  readonly replacementCombatantPresent: boolean;
  readonly familiarReactionAvailable: boolean;
  readonly ownerActionAvailable: boolean;
  readonly ownerSpellSlotCommitted: boolean;
  readonly targetHp: number;
  readonly lastResult:
    | "init"
    | "cast"
    | "recast"
    | "dismissedAndReappeared"
    | "touchDelivered";
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly FindFamiliarSelectedIdentityAction[];
  readonly expected: FindFamiliarSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "B22-FIND-FAMILIAR-IDENTITY-WITNESS";
  readonly unitId: "find_familiar";
  readonly actions: readonly FindFamiliarSelectedIdentityAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const findFamiliarUnitId = "find_familiar";
const casterId = combatantId("find-familiar-selected-caster");
const familiarId = combatantId("find-familiar-selected-companion");
const replacementFamiliarId = combatantId("find-familiar-selected-replacement");
const targetId = combatantId("find-familiar-selected-target");

const findFamiliarSpell = requireSpellRecord(findFamiliarUnitId);
const cureWoundsSpell = requireSpellRecord(cureWoundsUnitId);
const healingWordSpell = requireSpellRecord(healingWordUnitId);
const familiarEligibility = requireFindFamiliarEligibility(
  findFamiliarFormEligibilityForSpell(findFamiliarSpell),
);
const firstTypeOverride = familiarEligibility.creatureTypeOverrideChoices[0];
if (firstTypeOverride === undefined) {
  throw new Error("Expected Find Familiar creature type override choices.");
}

const selectedUnitIdentityReplays = [
  {
    taskId: "B22-FIND-FAMILIAR-IDENTITY-WITNESS",
    unitId: "find_familiar",
    actions: [
      "doCastFindFamiliar",
      "doRecastFindFamiliarReplacement",
      "doDismissAndReappearFindFamiliar",
      "doDeliverTouchSpellThroughFindFamiliar",
    ],
    sequences: [
      {
        name: "selected-find-familiar-casts-owner-linked-companion",
        actions: ["doCastFindFamiliar"],
        expected: expectedFindFamiliarProjection({
          familiarStatus: "present",
          formId: "cat",
          familiarCombatantPresent: true,
          familiarReactionAvailable: true,
          lastResult: "cast",
        }),
      },
      {
        name: "selected-find-familiar-recast-keeps-one-owner-record",
        actions: ["doRecastFindFamiliarReplacement"],
        expected: expectedFindFamiliarProjection({
          familiarStatus: "present",
          formId: "rat",
          familiarCombatantPresent: true,
          familiarReactionAvailable: true,
          lastResult: "recast",
        }),
      },
      {
        name: "selected-find-familiar-dismisses-and-reappears",
        actions: ["doDismissAndReappearFindFamiliar"],
        expected: expectedFindFamiliarProjection({
          familiarStatus: "present",
          formId: "cat",
          familiarCombatantPresent: true,
          familiarReactionAvailable: true,
          ownerActionAvailable: false,
          lastResult: "dismissedAndReappeared",
        }),
      },
      {
        name: "selected-find-familiar-delivers-touch-spell",
        actions: ["doDeliverTouchSpellThroughFindFamiliar"],
        expected: expectedFindFamiliarProjection({
          familiarStatus: "present",
          formId: "cat",
          familiarCombatantPresent: true,
          familiarReactionAvailable: false,
          ownerActionAvailable: false,
          ownerSpellSlotCommitted: true,
          targetHp: 12,
          lastResult: "touchDelivered",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Find Familiar selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<FindFamiliarSelectedIdentityAction>();

      for (const sequence of replay.sequences) {
        const driver = createFindFamiliarSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Find Familiar selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Find Familiar selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Find Familiar selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-find-familiar-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createFindFamiliarSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: findFamiliarSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createFindFamiliarSelectedIdentityDriver() {
  return defineDriver(findFamiliarSelectedIdentityDriverSchema, () => {
    let state = startSpellcasterFixtureBattle();
    let lastResult: FindFamiliarSelectedIdentityProjection["lastResult"] =
      "init";

    function reset(): void {
      state = startSpellcasterFixtureBattle();
      lastResult = "init";
    }

    return {
      init: reset,
      step: () => {},
      doCastFindFamiliar: () => {
        const result = castCatFamiliar(startSpellcasterFixtureBattle());
        if (result.tag !== "resolved") {
          throw new Error(`Expected Find Familiar cast, got ${result.tag}.`);
        }
        state = result.state;
        lastResult = "cast";
      },
      doRecastFindFamiliarReplacement: () => {
        const first = castCatFamiliar(startSpellcasterFixtureBattle());
        if (first.tag !== "resolved") {
          throw new Error(
            `Expected initial Find Familiar cast, got ${first.tag}.`,
          );
        }
        const second = castRatFamiliar(first.state);
        if (second.tag !== "resolved") {
          throw new Error(`Expected Find Familiar recast, got ${second.tag}.`);
        }
        state = second.state;
        lastResult = "recast";
      },
      doDismissAndReappearFindFamiliar: () => {
        const cast = castCatFamiliar(startSpellcasterFixtureBattle());
        if (cast.tag !== "resolved") {
          throw new Error(`Expected Find Familiar cast, got ${cast.tag}.`);
        }
        const dismissed = temporarilyDismissFindFamiliar({
          state: cast.state,
          casterId,
          heldObjectIds: [],
        });
        if (dismissed.tag !== "resolved") {
          throw new Error(
            `Expected Find Familiar temporary dismissal, got ${dismissed.tag}.`,
          );
        }
        const reappeared = reappearTemporarilyDismissedFindFamiliar({
          state: withFreshMagicAction(dismissed.state),
          casterId,
          catalog: statBlockCatalog,
          eligibility: familiarEligibility,
          familiarId,
          initiative: initiativeScore(14),
          placement: { kind: "unoccupiedSpaceWithin30Feet" },
        });
        if (reappeared.tag !== "resolved") {
          throw new Error(
            `Expected Find Familiar reappearance, got ${reappeared.tag}.`,
          );
        }
        state = reappeared.state;
        lastResult = "dismissedAndReappeared";
      },
      doDeliverTouchSpellThroughFindFamiliar: () => {
        const cast = castCatFamiliar(startSpellcasterFixtureBattle());
        if (cast.tag !== "resolved") {
          throw new Error(`Expected Find Familiar cast, got ${cast.tag}.`);
        }
        const cureWoundsAct = discoverBattleActs(cast.state).find(
          (act) =>
            act.subject.tag === "actionSpell" &&
            act.subject.invocation.spellId === cureWoundsUnitId,
        );
        if (cureWoundsAct?.subject.tag !== "actionSpell") {
          throw new Error("Expected Cure Wounds action spell act.");
        }
        const targetFill = {
          kind: "targetChoice" as const,
          holeId: ATTACK_TARGET_HOLE_ID,
          value: targetId,
          spatialFacts: [
            {
              kind: "spellTarget" as const,
              casterId,
              targetId,
              spellId: cureWoundsUnitId,
            },
          ],
        };
        const awaitingHealingRoll = deliverTouchSpellThroughFindFamiliar({
          state: cast.state,
          subject: cureWoundsAct.subject,
          fills: [targetFill],
          fact: {
            kind: "findFamiliarWithin100FeetOfOwner",
            ownerId: casterId,
            familiarId,
          },
        });
        if (awaitingHealingRoll.tag !== "needsHoles") {
          throw new Error(
            `Expected Find Familiar touch delivery healing roll, got ${awaitingHealingRoll.tag}.`,
          );
        }
        const delivered = deliverTouchSpellThroughFindFamiliar({
          state: cast.state,
          subject: cureWoundsAct.subject,
          fills: [
            targetFill,
            {
              kind: "rolledDice",
              holeId: requireHole(awaitingHealingRoll.holes, "rolledDice")
                .holeId,
              value: [{ results: [DieRollResult(4), DieRollResult(4)] }],
            },
          ],
          fact: {
            kind: "findFamiliarWithin100FeetOfOwner",
            ownerId: casterId,
            familiarId,
          },
        });
        if (delivered.tag !== "resolved") {
          throw new Error(
            `Expected Find Familiar touch delivery, got ${delivered.tag}.`,
          );
        }
        state = delivered.state;
        lastResult = "touchDelivered";
      },
      getState: () => projectFindFamiliarState(state, lastResult),
    };
  });
}

function startSpellcasterFixtureBattle(): BattleState {
  const result = startBattle({
    battleId: battleId("find-familiar-selected-identity-test"),
    combatants: [
      characterCreature({
        combatantId: casterId,
        displayName: "Caster",
        initiative: 12,
        side: partySide,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [cureWoundsSpell, healingWordSpell],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
      characterCreature({
        combatantId: targetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
        currentHp: 1,
        maxHp: 12,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function castCatFamiliar(state: BattleState) {
  return castFindFamiliar({
    state,
    casterId,
    catalog: statBlockCatalog,
    eligibility: familiarEligibility,
    selection: {
      tag: "normalNamedForm",
      formId: "cat",
    },
    creatureTypeOverrideChoiceId: firstTypeOverride.optionId,
    familiarId,
    initiative: initiativeScore(18),
    placement: { kind: "unoccupiedSpaceWithinSpellRange" },
  });
}

function castRatFamiliar(state: BattleState) {
  return castFindFamiliar({
    state,
    casterId,
    catalog: statBlockCatalog,
    eligibility: familiarEligibility,
    selection: {
      tag: "normalNamedForm",
      formId: "rat",
    },
    creatureTypeOverrideChoiceId: firstTypeOverride.optionId,
    familiarId: replacementFamiliarId,
    initiative: initiativeScore(15),
    placement: { kind: "unoccupiedSpaceWithinSpellRange" },
  });
}

function withFreshMagicAction(state: BattleState): BattleState {
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      actionResources: [{ kind: "action", source: "turn" }],
    },
  };
}

function requireSpellRecord(unitId: string): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected ${unitId} spell record.`);
  }
  return unit;
}

function requireFindFamiliarEligibility(
  eligibility: FindFamiliarFormEligibility | null,
): FindFamiliarFormEligibility {
  if (eligibility === null) {
    throw new Error("Expected Find Familiar form eligibility.");
  }
  return eligibility;
}

function expectedFindFamiliarProjection(
  input: Partial<FindFamiliarSelectedIdentityProjection>,
): FindFamiliarSelectedIdentityProjection {
  return {
    familiarStatus: "none",
    formId: "none",
    familiarCombatantPresent: false,
    replacementCombatantPresent: false,
    familiarReactionAvailable: false,
    ownerActionAvailable: true,
    ownerSpellSlotCommitted: false,
    targetHp: 1,
    lastResult: "init",
    ...input,
  };
}

function projectFindFamiliarState(
  state: BattleState,
  lastResult: FindFamiliarSelectedIdentityProjection["lastResult"],
): FindFamiliarSelectedIdentityProjection {
  const familiar = state.findFamiliars.get(casterId);
  return {
    familiarStatus: familiar?.status ?? "none",
    formId:
      familiar === undefined
        ? "none"
        : formSelectionProjection(familiar.formSelection),
    familiarCombatantPresent: state.combatants.has(familiarId),
    replacementCombatantPresent: state.combatants.has(replacementFamiliarId),
    familiarReactionAvailable:
      state.combatants.get(familiarId)?.reactionAvailable ?? false,
    ownerActionAvailable: state.currentTurnResources.actionResources.some(
      (resource) => resource.kind === "action",
    ),
    ownerSpellSlotCommitted:
      state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    targetHp: Number(state.combatants.get(targetId)?.hp ?? 0),
    lastResult,
  };
}

function formSelectionProjection(
  selection: FindFamiliarState["formSelection"],
): string {
  if (selection.tag === "challengeRatingZeroBeast")
    return selection.statBlockId;
  return selection.formId;
}

function normalizeFindFamiliarSelectedIdentityQuintState(
  raw: unknown,
): FindFamiliarSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    familiarStatus: mbtFamiliarStatus(state["qFamiliarStatus"]),
    formId: stringField(state, "qFormId"),
    familiarCombatantPresent: booleanField(state, "qFamiliarCombatantPresent"),
    replacementCombatantPresent: booleanField(
      state,
      "qReplacementCombatantPresent",
    ),
    familiarReactionAvailable: booleanField(
      state,
      "qFamiliarReactionAvailable",
    ),
    ownerActionAvailable: booleanField(state, "qOwnerActionAvailable"),
    ownerSpellSlotCommitted: booleanField(state, "qOwnerSpellSlotCommitted"),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    lastResult: mbtLastResult(state["qLastResult"]),
  };
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint state record.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function stringField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): string {
  const value = state[field];
  if (typeof value === "string") return value;
  throw new Error(`Expected Quint string field ${field}.`);
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  const value = state[field];
  if (typeof value === "boolean") return value;
  throw new Error(`Expected Quint boolean field ${field}.`);
}

function mbtFamiliarStatus(
  raw: unknown,
): FindFamiliarSelectedIdentityProjection["familiarStatus"] {
  if (
    raw === "none" ||
    raw === "present" ||
    raw === "temporarilyDismissed" ||
    raw === "disappearedAtZeroHitPoints"
  ) {
    return raw;
  }
  throw new Error(`Unexpected Find Familiar status ${String(raw)}.`);
}

function mbtLastResult(
  raw: unknown,
): FindFamiliarSelectedIdentityProjection["lastResult"] {
  if (
    raw === "init" ||
    raw === "cast" ||
    raw === "recast" ||
    raw === "dismissedAndReappeared" ||
    raw === "touchDelivered"
  ) {
    return raw;
  }
  throw new Error(`Unexpected MBT result ${String(raw)}.`);
}

const findFamiliarSelectedIdentityStateCheck = stateCheck(
  normalizeFindFamiliarSelectedIdentityQuintState,
  (
    spec: FindFamiliarSelectedIdentityProjection,
    impl: FindFamiliarSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
