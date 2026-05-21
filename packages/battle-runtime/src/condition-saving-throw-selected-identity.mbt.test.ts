// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt condition-saving-throw-lifecycle blindness_deafness color_spray entangle hideous_laughter hold_person sleep
// UNIT-IDENTITY-MBT-REPLAY: condition-saving-throw-lifecycle blindness_deafness doResolveBlindnessDeafnessBlindedSavingThrow doResolveBlindnessDeafnessDeafenedSavingThrow
// UNIT-IDENTITY-MBT-REPLAY: condition-saving-throw-lifecycle color_spray doResolveColorSprayFailedSavingThrow
// UNIT-IDENTITY-MBT-REPLAY: condition-saving-throw-lifecycle entangle doResolveEntangleFailedSavingThrow
// UNIT-IDENTITY-MBT-REPLAY: condition-saving-throw-lifecycle hideous_laughter doResolveHideousLaughterRepeatSavingThrowSuccess
// UNIT-IDENTITY-MBT-REPLAY: condition-saving-throw-lifecycle hold_person doResolveHoldPersonFailedSavingThrow doResolveHoldPersonRepeatSavingThrowSuccess
// UNIT-IDENTITY-MBT-REPLAY: condition-saving-throw-lifecycle sleep doResolveSleepRepeatSavingThrowFailure
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  Hp,
  abilityModifier,
  attackBonus,
  movementFeet,
  proficiencyBonus,
  type Condition,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  battleCombatantSide,
  battleId,
  characterId,
  combatantId,
  discoverBattleActs,
  endTurn,
  initiativeScore,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { spellConditionChoiceFill } from "./unit-profile-admission-spell-fill-support.ts";

const conditionSavingThrowSelectedIdentityDriverSchema = {
  init: {},
  doResolveBlindnessDeafnessBlindedSavingThrow: {},
  doResolveBlindnessDeafnessDeafenedSavingThrow: {},
  doResolveColorSprayFailedSavingThrow: {},
  doResolveEntangleFailedSavingThrow: {},
  doResolveHoldPersonFailedSavingThrow: {},
  doResolveHoldPersonRepeatSavingThrowSuccess: {},
  doResolveHideousLaughterRepeatSavingThrowSuccess: {},
  doResolveSleepRepeatSavingThrowFailure: {},
  step: {},
} as const;
type ConditionSavingThrowSelectedIdentityDriverAction = Exclude<
  keyof typeof conditionSavingThrowSelectedIdentityDriverSchema,
  "init" | "step"
>;

type ConditionSavingThrowSelectedIdentityProjection = {
  readonly targetBlinded: boolean;
  readonly targetDeafened: boolean;
  readonly targetRestrained: boolean;
  readonly targetParalyzed: boolean;
  readonly targetIncapacitated: boolean;
  readonly targetUnconscious: boolean;
  readonly targetProne: boolean;
  readonly casterConcentrating: boolean;
  readonly actionAvailable: boolean;
  readonly firstLevelSlotsExpended: number;
  readonly secondLevelSlotsExpended: number;
  readonly lastResult: "init" | "resolved";
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly ConditionSavingThrowSelectedIdentityDriverAction[];
  readonly expected: ConditionSavingThrowSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "condition-saving-throw-lifecycle";
  readonly unitId: ConditionSavingThrowSpellUnitId;
  readonly actions: readonly ConditionSavingThrowSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const conditionSavingThrowSpellUnitIds = [
  "blindness_deafness",
  "color_spray",
  "entangle",
  "hold_person",
  "hideous_laughter",
  "sleep",
] as const;
type ConditionSavingThrowSpellUnitId =
  (typeof conditionSavingThrowSpellUnitIds)[number];

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};
type CharacterCreatureInit = Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>;
type CharacterClassName =
  CharacterCreatureInit["classLevels"][number]["className"];
type CharacterSpellcastingInit = NonNullable<
  CharacterCreatureInit["spellcasting"]
>;

const casterId = combatantId("condition-saving-throw-caster");
const targetId = combatantId("condition-saving-throw-target");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Condition Saving Throw selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "condition-saving-throw-lifecycle",
    unitId: "blindness_deafness",
    actions: [
      "doResolveBlindnessDeafnessBlindedSavingThrow",
      "doResolveBlindnessDeafnessDeafenedSavingThrow",
    ],
    sequences: [
      {
        name: "failed-constitution-saving-throw-applies-chosen-blinded-condition",
        actions: ["doResolveBlindnessDeafnessBlindedSavingThrow"],
        expected: expectedProjection({
          targetBlinded: true,
          actionAvailable: false,
          secondLevelSlotsExpended: 1,
          lastResult: "resolved",
        }),
      },
      {
        name: "failed-constitution-saving-throw-applies-chosen-deafened-condition",
        actions: ["doResolveBlindnessDeafnessDeafenedSavingThrow"],
        expected: expectedProjection({
          targetDeafened: true,
          actionAvailable: false,
          secondLevelSlotsExpended: 1,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "condition-saving-throw-lifecycle",
    unitId: "color_spray",
    actions: ["doResolveColorSprayFailedSavingThrow"],
    sequences: [
      {
        name: "failed-constitution-saving-throw-applies-blinded",
        actions: ["doResolveColorSprayFailedSavingThrow"],
        expected: expectedProjection({
          targetBlinded: true,
          actionAvailable: false,
          firstLevelSlotsExpended: 1,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "condition-saving-throw-lifecycle",
    unitId: "entangle",
    actions: ["doResolveEntangleFailedSavingThrow"],
    sequences: [
      {
        name: "failed-strength-saving-throw-applies-restrained",
        actions: ["doResolveEntangleFailedSavingThrow"],
        expected: expectedProjection({
          targetRestrained: true,
          casterConcentrating: true,
          actionAvailable: false,
          firstLevelSlotsExpended: 1,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "condition-saving-throw-lifecycle",
    unitId: "hideous_laughter",
    actions: ["doResolveHideousLaughterRepeatSavingThrowSuccess"],
    sequences: [
      {
        name: "repeat-wisdom-saving-throw-success-clears-prone-incapacitated",
        actions: ["doResolveHideousLaughterRepeatSavingThrowSuccess"],
        expected: expectedProjection({
          actionAvailable: true,
          firstLevelSlotsExpended: 1,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "condition-saving-throw-lifecycle",
    unitId: "hold_person",
    actions: [
      "doResolveHoldPersonFailedSavingThrow",
      "doResolveHoldPersonRepeatSavingThrowSuccess",
    ],
    sequences: [
      {
        name: "failed-wisdom-saving-throw-applies-paralyzed-concentration",
        actions: ["doResolveHoldPersonFailedSavingThrow"],
        expected: expectedProjection({
          targetParalyzed: true,
          targetIncapacitated: true,
          casterConcentrating: true,
          actionAvailable: false,
          secondLevelSlotsExpended: 1,
          lastResult: "resolved",
        }),
      },
      {
        name: "repeat-wisdom-saving-throw-success-clears-paralyzed-concentration",
        actions: ["doResolveHoldPersonRepeatSavingThrowSuccess"],
        expected: expectedProjection({
          actionAvailable: true,
          secondLevelSlotsExpended: 1,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "condition-saving-throw-lifecycle",
    unitId: "sleep",
    actions: ["doResolveSleepRepeatSavingThrowFailure"],
    sequences: [
      {
        name: "repeat-wisdom-saving-throw-failure-escalates-to-unconscious",
        actions: ["doResolveSleepRepeatSavingThrowFailure"],
        expected: expectedProjection({
          targetIncapacitated: true,
          targetUnconscious: true,
          targetProne: true,
          casterConcentrating: true,
          actionAvailable: true,
          firstLevelSlotsExpended: 1,
          lastResult: "resolved",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Condition Saving Throw selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<ConditionSavingThrowSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createConditionSavingThrowSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Condition Saving Throw selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Condition Saving Throw selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Condition Saving Throw selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-condition-saving-throw-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createConditionSavingThrowSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: conditionSavingThrowSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createConditionSavingThrowSelectedIdentityDriver() {
  return defineDriver(conditionSavingThrowSelectedIdentityDriverSchema, () => {
    let state = conditionSpellBattle(srdSpellRecord("color_spray"), "wizard");
    let lastResult: ConditionSavingThrowSelectedIdentityProjection["lastResult"] =
      "init";

    function reset(): void {
      state = conditionSpellBattle(srdSpellRecord("color_spray"), "wizard");
      lastResult = "init";
    }

    function recordResolvedResult(result: BattleResolutionResult): void {
      if (result.tag !== "resolved") {
        throw new Error(
          `Expected Condition Saving Throw spell to resolve, got ${result.tag}.`,
        );
      }
      state = result.state;
      lastResult = "resolved";
    }

    return {
      init: reset,
      doResolveBlindnessDeafnessBlindedSavingThrow: () => {
        state = conditionSpellBattle(
          srdSpellRecord("blindness_deafness"),
          "wizard",
        );
        recordResolvedResult(
          resolveBlindnessDeafnessFailedSavingThrow("blinded"),
        );
      },
      doResolveBlindnessDeafnessDeafenedSavingThrow: () => {
        state = conditionSpellBattle(
          srdSpellRecord("blindness_deafness"),
          "wizard",
        );
        recordResolvedResult(
          resolveBlindnessDeafnessFailedSavingThrow("deafened"),
        );
      },
      doResolveColorSprayFailedSavingThrow: () => {
        state = conditionSpellBattle(srdSpellRecord("color_spray"), "wizard");
        recordResolvedResult(resolveAreaSavingThrowSpell("color_spray"));
      },
      doResolveEntangleFailedSavingThrow: () => {
        state = conditionSpellBattle(srdSpellRecord("entangle"), "druid");
        recordResolvedResult(resolveAreaSavingThrowSpell("entangle"));
      },
      doResolveHoldPersonFailedSavingThrow: () => {
        state = conditionSpellBattle(srdSpellRecord("hold_person"), "wizard");
        recordResolvedResult(resolveHoldPersonFailedSavingThrow());
      },
      doResolveHoldPersonRepeatSavingThrowSuccess: () => {
        state = conditionSpellBattle(srdSpellRecord("hold_person"), "wizard");
        recordResolvedResult(resolveHoldPersonRepeatSavingThrowSuccess());
      },
      doResolveHideousLaughterRepeatSavingThrowSuccess: () => {
        state = conditionSpellBattle(
          srdSpellRecord("hideous_laughter"),
          "wizard",
        );
        recordResolvedResult(resolveHideousLaughterRepeatSavingThrowSuccess());
      },
      doResolveSleepRepeatSavingThrowFailure: () => {
        state = conditionSpellBattle(srdSpellRecord("sleep"), "wizard");
        recordResolvedResult(resolveSleepRepeatSavingThrowFailure());
      },
      step: () => {},
      getState: () =>
        projectConditionSavingThrowSelectedIdentityState(state, lastResult),
    };

    function resolveAreaSavingThrowSpell(
      spellId: Extract<
        ConditionSavingThrowSpellUnitId,
        "color_spray" | "entangle"
      >,
    ): BattleResolutionResult {
      const act = spellAct({ state, spellId, slotLevel: 1 });
      const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
      return resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          savingThrowOutcomeFill(savingThrow, [{ targetId, succeeded: false }]),
        ],
      });
    }

    function resolveBlindnessDeafnessFailedSavingThrow(
      selectedCondition: "blinded" | "deafened",
    ): BattleResolutionResult {
      const act = spellAct({
        state,
        spellId: "blindness_deafness",
        slotLevel: 2,
      });
      const target = requireHole(act.initialHoles, "spellTargetList");
      const conditionChoice = requireHole(act.initialHoles, "conditionChoice");
      const targetFill = spellTargetListFill(target, "blindness_deafness", [
        targetId,
      ]);
      const conditionChoiceFill = spellConditionChoiceFill(
        conditionChoice,
        selectedCondition,
      );
      const initialSave = requireResultHole(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [targetFill, conditionChoiceFill],
        }),
        "savingThrowOutcome",
      );
      return resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          targetFill,
          conditionChoiceFill,
          savingThrowOutcomeFill(initialSave, [{ targetId, succeeded: false }]),
        ],
      });
    }

    function resolveHoldPersonFailedSavingThrow(): BattleResolutionResult {
      const act = spellAct({ state, spellId: "hold_person", slotLevel: 2 });
      const target = requireHole(act.initialHoles, "spellTargetList");
      const targetFill = spellTargetListFill(target, "hold_person", [targetId]);
      const initialSave = requireResultHole(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [targetFill],
        }),
        "savingThrowOutcome",
      );
      return resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          targetFill,
          savingThrowOutcomeFill(initialSave, [{ targetId, succeeded: false }]),
        ],
      });
    }

    function resolveHoldPersonRepeatSavingThrowSuccess(): BattleResolutionResult {
      const cast = resolveHoldPersonFailedSavingThrow();
      if (cast.tag !== "resolved") {
        throw new Error("Expected Hold Person cast to resolve.");
      }
      const targetTurn = endTurn({ state: cast.state, actorId: casterId });
      if (targetTurn.tag !== "resolved") {
        throw new Error("Expected caster End Turn to resolve.");
      }
      const subject = endTurnSubjectFor(targetId);
      const repeat = resolveBattleSubject({
        state: targetTurn.state,
        subject,
        fills: [],
      });
      const repeatResult = requireNeedsHolesResult(repeat);
      const repeatSave = requireHole(repeatResult.holes, "savingThrowOutcome");
      return resolveBattleSubject({
        state: repeatResult.state,
        subject,
        fills: [
          savingThrowOutcomeFill(repeatSave, [{ targetId, succeeded: true }]),
        ],
      });
    }

    function resolveHideousLaughterRepeatSavingThrowSuccess(): BattleResolutionResult {
      const act = spellAct({
        state,
        spellId: "hideous_laughter",
        slotLevel: 1,
      });
      const target = requireHole(act.initialHoles, "spellTargetList");
      const targetFill = spellTargetListFill(target, "hideous_laughter", [
        targetId,
      ]);
      const initialSave = requireResultHole(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [targetFill],
        }),
        "savingThrowOutcome",
      );
      const cast = resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          targetFill,
          savingThrowOutcomeFill(initialSave, [{ targetId, succeeded: false }]),
        ],
      });
      if (cast.tag !== "resolved") {
        throw new Error("Expected Hideous Laughter cast to resolve.");
      }
      const targetTurn = endTurn({ state: cast.state, actorId: casterId });
      if (targetTurn.tag !== "resolved") {
        throw new Error("Expected caster End Turn to resolve.");
      }
      const subject = endTurnSubjectFor(targetId);
      const repeat = resolveBattleSubject({
        state: targetTurn.state,
        subject,
        fills: [],
      });
      const repeatResult = requireNeedsHolesResult(repeat);
      const repeatSave = requireHole(repeatResult.holes, "savingThrowOutcome");
      return resolveBattleSubject({
        state: repeatResult.state,
        subject,
        fills: [
          savingThrowOutcomeFill(repeatSave, [{ targetId, succeeded: true }]),
        ],
      });
    }

    function resolveSleepRepeatSavingThrowFailure(): BattleResolutionResult {
      const act = spellAct({ state, spellId: "sleep", slotLevel: 1 });
      const initialSave = requireHole(act.initialHoles, "savingThrowOutcome");
      const cast = resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          savingThrowOutcomeFill(initialSave, [{ targetId, succeeded: false }]),
        ],
      });
      if (cast.tag !== "resolved") {
        throw new Error("Expected Sleep cast to resolve.");
      }
      const targetTurn = endTurn({ state: cast.state, actorId: casterId });
      if (targetTurn.tag !== "resolved") {
        throw new Error("Expected caster End Turn to resolve.");
      }
      const subject = endTurnSubjectFor(targetId);
      const repeat = resolveBattleSubject({
        state: targetTurn.state,
        subject,
        fills: [],
      });
      const repeatResult = requireNeedsHolesResult(repeat);
      const repeatSave = requireHole(repeatResult.holes, "savingThrowOutcome");
      return resolveBattleSubject({
        state: repeatResult.state,
        subject,
        fills: [
          savingThrowOutcomeFill(repeatSave, [{ targetId, succeeded: false }]),
        ],
      });
    }
  });
}

function expectedProjection(
  overrides: Partial<ConditionSavingThrowSelectedIdentityProjection> = {},
): ConditionSavingThrowSelectedIdentityProjection {
  return {
    targetBlinded: false,
    targetDeafened: false,
    targetRestrained: false,
    targetParalyzed: false,
    targetIncapacitated: false,
    targetUnconscious: false,
    targetProne: false,
    casterConcentrating: false,
    actionAvailable: true,
    firstLevelSlotsExpended: 0,
    secondLevelSlotsExpended: 0,
    lastResult: "init",
    ...overrides,
  };
}

function srdSpellRecord(unitId: ConditionSavingThrowSpellUnitId): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${unitId} to be a Spell.`);
  }
  return unit;
}

function conditionSpellBattle(
  spell: SpellRecord,
  sourceClassName: CharacterSpellcastingInit["sourceClassName"],
): BattleState {
  const result = startBattle({
    battleId: battleId(`condition-saving-throw-selected-identity-${spell.id}`),
    combatants: [
      conditionSpellCreature({
        combatantId: casterId,
        displayName: "Condition Saving Throw caster",
        initiative: 20,
        side: partySide,
        className: sourceClassName,
        spellcasting: {
          sourceClassName,
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [spell],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots:
            spell.id === "hold_person" || spell.id === "blindness_deafness"
              ? [{ spellLevel: 2, count: 1 }]
              : [{ spellLevel: 1, count: 1 }],
        },
      }),
      conditionSpellCreature({
        combatantId: targetId,
        displayName: "Condition Saving Throw target",
        initiative: 10,
        side: oppositionSide,
        className: "fighter",
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function conditionSpellCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly className: CharacterClassName;
  readonly spellcasting?: CharacterSpellcastingInit;
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: [{ className: input.className, level: 1 }],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

function spellAct(input: {
  readonly state: BattleState;
  readonly spellId: ConditionSavingThrowSpellUnitId;
  readonly slotLevel: number;
}): ActionSpellAct {
  const act = discoverBattleActs(input.state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.tag === "spellSlot" &&
      candidate.subject.invocation.spellId === input.spellId &&
      Number(candidate.subject.invocation.slotLevel) === input.slotLevel,
  );
  if (act === undefined) {
    throw new Error(`Expected ${input.spellId} spell act.`);
  }
  return act;
}

function spellTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  spellId: ConditionSavingThrowSpellUnitId,
  targetIds: readonly CombatantId[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: targetIds.map((selectedTargetId) => ({
      kind: "spellTarget",
      casterId,
      targetId: selectedTargetId,
      spellId,
    })),
  };
}

function savingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value:
      "spell" in hole &&
      hole.spell.procedure !== "rollModifier" &&
      hole.spell.targeting.kind !== "singleCombatant" &&
      hole.spell.targeting.kind !== "targetList"
        ? {
            area: {
              originAnchorId: casterId,
              affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
            },
            outcomes,
          }
        : { outcomes },
  };
}

function endTurnSubjectFor(
  actorId: CombatantId,
): Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "endTurn" }
> {
  return { tag: "runtimeCommand", actorId, command: "endTurn" };
}

function requireResultHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  return requireHole(requireNeedsHolesResult(result).holes, kind);
}

function requireNeedsHolesResult(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  if (result.tag !== "needsHoles") {
    throw new Error("Expected needsHoles result.");
  }
  return result;
}

function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function projectConditionSavingThrowSelectedIdentityState(
  state: BattleState,
  lastResult: ConditionSavingThrowSelectedIdentityProjection["lastResult"],
): ConditionSavingThrowSelectedIdentityProjection {
  const snapshot = snapshotBattle(state);
  const caster = snapshot.combatants.find(
    (combatant) => combatant.combatantId === casterId,
  );
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === targetId,
  );
  if (caster === undefined || target === undefined) {
    throw new Error(
      "Expected Condition Saving Throw selected identity actors.",
    );
  }
  return {
    targetBlinded: snapshotHasCondition(target.conditions, "blinded"),
    targetDeafened: snapshotHasCondition(target.conditions, "deafened"),
    targetRestrained: snapshotHasCondition(target.conditions, "restrained"),
    targetParalyzed: snapshotHasCondition(target.conditions, "paralyzed"),
    targetIncapacitated: snapshotHasCondition(
      target.conditions,
      "incapacitated",
    ),
    targetUnconscious: snapshotHasCondition(target.conditions, "unconscious"),
    targetProne: snapshotHasCondition(target.conditions, "prone"),
    casterConcentrating: caster.concentrating,
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    firstLevelSlotsExpended: expendedSlotsForSpellLevel(state, casterId, 1),
    secondLevelSlotsExpended: expendedSlotsForSpellLevel(state, casterId, 2),
    lastResult,
  };
}

function snapshotHasCondition(
  conditions: readonly Condition[],
  condition: Condition,
): boolean {
  return conditions.includes(condition);
}

function expendedSlotsForSpellLevel(
  state: BattleState,
  combatantId: CombatantId,
  spellLevel: number,
): number {
  const combatant = state.combatants.get(combatantId);
  if (combatant?.origin.kind !== "character") {
    throw new Error("Expected Condition Saving Throw caster character origin.");
  }
  return (
    combatant.origin.spellcasting?.spellSlots.find(
      (slot) => slot.spellLevel === spellLevel,
    )?.expended ?? 0
  );
}

function normalizeConditionSavingThrowSelectedIdentityQuintState(
  raw: unknown,
): ConditionSavingThrowSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    targetBlinded: booleanField(state, "qTargetBlinded"),
    targetDeafened: booleanField(state, "qTargetDeafened"),
    targetRestrained: booleanField(state, "qTargetRestrained"),
    targetParalyzed: booleanField(state, "qTargetParalyzed"),
    targetIncapacitated: booleanField(state, "qTargetIncapacitated"),
    targetUnconscious: booleanField(state, "qTargetUnconscious"),
    targetProne: booleanField(state, "qTargetProne"),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    actionAvailable: booleanField(state, "qActionAvailable"),
    firstLevelSlotsExpended: numberFromQuintInt(
      state["qFirstLevelSlotsExpended"],
      "qFirstLevelSlotsExpended",
    ),
    secondLevelSlotsExpended: numberFromQuintInt(
      state["qSecondLevelSlotsExpended"],
      "qSecondLevelSlotsExpended",
    ),
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

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  const value = state[field];
  if (typeof value === "boolean") return value;
  throw new Error(`Expected Quint boolean field ${field}.`);
}

function mbtLastResult(
  raw: unknown,
): ConditionSavingThrowSelectedIdentityProjection["lastResult"] {
  if (raw === "init" || raw === "resolved") {
    return raw;
  }
  throw new Error(`Unexpected MBT result ${String(raw)}.`);
}

const conditionSavingThrowSelectedIdentityStateCheck = stateCheck(
  normalizeConditionSavingThrowSelectedIdentityQuintState,
  (
    spec: ConditionSavingThrowSelectedIdentityProjection,
    impl: ConditionSavingThrowSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
