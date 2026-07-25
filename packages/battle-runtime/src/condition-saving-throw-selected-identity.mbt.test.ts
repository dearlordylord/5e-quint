import {
  battleProcedureExecutionRefForTest,
  resolveBattleSubject,
} from "./battle-runtime-test-support.ts";
import {
  battleActSpellSlotPresentation,
  battleActSpellPresentation,
} from "./battle-act-composition.ts";
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay condition-saving-throw-lifecycle blindness_deafness color_spray entangle hideous_laughter hold_monster hold_person hypnotic_pattern sleep
// UNIT-IDENTITY-REPLAY: condition-saving-throw-lifecycle blindness_deafness doResolveBlindnessDeafnessBlindedSavingThrow doResolveBlindnessDeafnessDeafenedSavingThrow
// UNIT-IDENTITY-REPLAY: condition-saving-throw-lifecycle color_spray doResolveColorSprayFailedSavingThrow
// UNIT-IDENTITY-REPLAY: condition-saving-throw-lifecycle entangle doResolveEntangleFailedSavingThrow
// UNIT-IDENTITY-REPLAY: condition-saving-throw-lifecycle hideous_laughter doResolveHideousLaughterRepeatSavingThrowSuccess
// UNIT-IDENTITY-REPLAY: condition-saving-throw-lifecycle hold_monster doResolveHoldMonsterFailedSavingThrow doResolveHoldMonsterRepeatSavingThrowSuccess
// UNIT-IDENTITY-REPLAY: condition-saving-throw-lifecycle hold_person doResolveHoldPersonFailedSavingThrow doResolveHoldPersonRepeatSavingThrowSuccess
// UNIT-IDENTITY-REPLAY: condition-saving-throw-lifecycle hypnotic_pattern doResolveHypnoticPatternFailedSavingThrow
// UNIT-IDENTITY-REPLAY: condition-saving-throw-lifecycle sleep doResolveSleepRepeatSavingThrowFailure
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE
import { Either } from "effect";
import { expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  DieRollResult,
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
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";
import hypnoticPatternInput from "../../surface/content/hypnotic_pattern.json";

import {
  battleId,
  battleReducerStartRouteEvent,
  characterId,
  combatantId,
  discoverBattleActs,
  endTurn,
  initiativeScore,
  snapshotBattle,
  startBattle,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleReducerRouteEvent,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { spellConditionChoiceFill } from "./unit-profile-admission-spell-fill-support.ts";

type ConditionSavingThrowSelectedIdentityProjection = {
  readonly targetCharmed: boolean;
  readonly targetBlinded: boolean;
  readonly targetDeafened: boolean;
  readonly targetRestrained: boolean;
  readonly targetParalyzed: boolean;
  readonly targetIncapacitated: boolean;
  readonly targetUnconscious: boolean;
  readonly targetProne: boolean;
  readonly casterConcentrating: boolean;
  readonly actionAvailable: boolean;
  readonly targetWalkSpeedFeet: number;
  readonly firstLevelSlotsExpended: number;
  readonly secondLevelSlotsExpended: number;
  readonly thirdLevelSlotsExpended: number;
  readonly fifthLevelSlotsExpended: number;
  readonly lastResult: "init" | "resolved";
};
const conditionSavingThrowSpellUnitIds = [
  "blindness_deafness",
  "color_spray",
  "entangle",
  "hold_monster",
  "hold_person",
  "hideous_laughter",
  "hypnotic_pattern",
  "sleep",
] as const;
type ConditionSavingThrowSpellUnitId =
  (typeof conditionSavingThrowSpellUnitIds)[number];

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "actionSpell"; readonly invocation: unknown }
  >;
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

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Condition Saving Throw selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;
const hypnoticPatternSpell = decodeHypnoticPatternSpellRecord();

it("observes selected condition-saving-throw qRoute through public reducer events", () => {
  expect(resolveBlindnessDeafnessFailedSavingThrowRoute("blinded")).toEqual(
    saveGatedConditionTargetListChoiceRoute(),
  );
  expect(resolveBlindnessDeafnessFailedSavingThrowRoute("deafened")).toEqual(
    saveGatedConditionTargetListChoiceRoute(),
  );
  expect(
    resolveAreaSavingThrowSpellRoute(
      conditionSpellBattle(srdSpellRecord("color_spray"), "wizard"),
      "color_spray",
    ),
  ).toEqual(saveGatedConditionAreaRoute());
  expect(
    resolveAreaSavingThrowSpellRoute(
      conditionSpellBattle(srdSpellRecord("entangle"), "druid"),
      "entangle",
    ),
  ).toEqual(saveGatedConditionAreaRoute());
  expect(resolveHoldPersonFailedSavingThrowRoute()).toEqual(
    saveGatedConditionTargetListRoute(),
  );
  expect(resolveHoldMonsterFailedSavingThrowRoute()).toEqual(
    saveGatedConditionTargetListRoute(),
  );
  expect(resolveHoldPersonRepeatSavingThrowSuccessRoute()).toEqual(
    repeatSaveSuccessCleanupRoute({
      initialRoute: saveGatedConditionTargetListRoute(),
    }),
  );
  expect(resolveHoldMonsterRepeatSavingThrowSuccessRoute()).toEqual(
    repeatSaveSuccessCleanupRoute({
      initialRoute: saveGatedConditionTargetListRoute(),
    }),
  );
  expect(resolveHideousLaughterRepeatSavingThrowSuccessRoute()).toEqual(
    repeatSaveSuccessCleanupRoute({
      initialRoute: [battleReducerStartRouteEvent()],
    }),
  );
  expect(resolveSleepRepeatSavingThrowFailureRoute()).toEqual(
    repeatSaveFailureUnconsciousRoute({
      initialRoute: sleepInitialSaveFailureRoute(),
    }),
  );
  expect(resolveSleepRepeatSaveAndDeathSaveMixedFrontierRoute()).toEqual(
    sleepRepeatSaveAndDeathSaveMixedFrontierRoute(),
  );
});

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Condition Saving Throw selected identity replay",
  taskId: "condition-saving-throw-lifecycle",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-condition-saving-throw-selected-identity.mbt.qnt",
  ),
  projectionSchema: {
    targetCharmed: "bool",
    targetBlinded: "bool",
    targetDeafened: "bool",
    targetRestrained: "bool",
    targetParalyzed: "bool",
    targetIncapacitated: "bool",
    targetUnconscious: "bool",
    targetProne: "bool",
    casterConcentrating: "bool",
    actionAvailable: "bool",
    targetWalkSpeedFeet: "int",
    firstLevelSlotsExpended: "int",
    secondLevelSlotsExpended: "int",
    thirdLevelSlotsExpended: "int",
    fifthLevelSlotsExpended: "int",
    lastResult: "str",
  },
  quintStateField: "qState",
  witnessProtocolField: "protocol",
  initialProjection: expectedProjection(),
  units: [
    {
      unitId: "blindness_deafness",
      procedures: [
        {
          actionName: "doResolveBlindnessDeafnessBlindedSavingThrow",
          discover: () =>
            resolvedProjection(
              resolveBlindnessDeafnessFailedSavingThrow("blinded"),
            ),
        },
        {
          actionName: "doResolveBlindnessDeafnessDeafenedSavingThrow",
          discover: () =>
            resolvedProjection(
              resolveBlindnessDeafnessFailedSavingThrow("deafened"),
            ),
        },
      ],
    },
    {
      unitId: "color_spray",
      procedures: [
        {
          actionName: "doResolveColorSprayFailedSavingThrow",
          discover: () =>
            resolvedProjection(
              resolveAreaSavingThrowSpell(
                conditionSpellBattle(srdSpellRecord("color_spray"), "wizard"),
                "color_spray",
              ),
            ),
        },
      ],
    },
    {
      unitId: "entangle",
      procedures: [
        {
          actionName: "doResolveEntangleFailedSavingThrow",
          discover: () =>
            resolvedProjection(
              resolveAreaSavingThrowSpell(
                conditionSpellBattle(srdSpellRecord("entangle"), "druid"),
                "entangle",
              ),
            ),
        },
      ],
    },
    {
      unitId: "hideous_laughter",
      procedures: [
        {
          actionName: "doResolveHideousLaughterRepeatSavingThrowSuccess",
          discover: () =>
            resolvedProjection(
              resolveHideousLaughterRepeatSavingThrowSuccess(),
            ),
        },
      ],
    },
    {
      unitId: "hold_monster",
      procedures: [
        {
          actionName: "doResolveHoldMonsterFailedSavingThrow",
          discover: () =>
            resolvedProjection(resolveHoldMonsterFailedSavingThrow()),
        },
        {
          actionName: "doResolveHoldMonsterRepeatSavingThrowSuccess",
          discover: () =>
            resolvedProjection(resolveHoldMonsterRepeatSavingThrowSuccess()),
        },
      ],
    },
    {
      unitId: "hold_person",
      procedures: [
        {
          actionName: "doResolveHoldPersonFailedSavingThrow",
          discover: () =>
            resolvedProjection(resolveHoldPersonFailedSavingThrow()),
        },
        {
          actionName: "doResolveHoldPersonRepeatSavingThrowSuccess",
          discover: () =>
            resolvedProjection(resolveHoldPersonRepeatSavingThrowSuccess()),
        },
      ],
    },
    {
      unitId: "hypnotic_pattern",
      procedures: [
        {
          actionName: "doResolveHypnoticPatternFailedSavingThrow",
          discover: () =>
            resolvedProjection(resolveHypnoticPatternFailedSavingThrow()),
        },
      ],
    },
    {
      unitId: "sleep",
      procedures: [
        {
          actionName: "doResolveSleepRepeatSavingThrowFailure",
          discover: () =>
            resolvedProjection(resolveSleepRepeatSavingThrowFailure()),
        },
      ],
    },
  ],
});

function resolvedProjection(
  result: BattleResolutionResult,
): ConditionSavingThrowSelectedIdentityProjection {
  if (result.tag !== "resolved") {
    throw new Error(
      `Expected Condition Saving Throw spell to resolve, got ${result.tag}.`,
    );
  }
  return projectConditionSavingThrowSelectedIdentityState(
    result.state,
    "resolved",
  );
}

function resolveAreaSavingThrowSpell(
  session: BattleRuntimeSession,
  spellId: Extract<
    ConditionSavingThrowSpellUnitId,
    "color_spray" | "entangle" | "hypnotic_pattern"
  >,
  slotLevel = 1,
): BattleResolutionResult {
  const act = spellAct({ session, spellId, slotLevel });
  const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
  return resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      savingThrowOutcomeFill(savingThrow, [{ targetId, succeeded: false }]),
    ],
  });
}

function resolveHypnoticPatternFailedSavingThrow(): BattleResolutionResult {
  return resolveAreaSavingThrowSpell(
    conditionSpellBattle(srdSpellRecord("hypnotic_pattern"), "wizard"),
    "hypnotic_pattern",
    3,
  );
}

function resolveBlindnessDeafnessFailedSavingThrow(
  selectedCondition: "blinded" | "deafened",
): BattleResolutionResult {
  const session = conditionSpellBattle(
    srdSpellRecord("blindness_deafness"),
    "wizard",
  );
  const act = spellAct({
    session,
    spellId: "blindness_deafness",
    slotLevel: 2,
  });
  const target = requireHole(act.initialHoles, "spellTargetList");
  const conditionChoice = requireHole(act.initialHoles, "conditionChoice");
  const targetFill = spellTargetListFill(target, [targetId]);
  const conditionChoiceFill = spellConditionChoiceFill(
    conditionChoice,
    selectedCondition,
  );
  const initialSave = requireResultHole(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetFill, conditionChoiceFill],
    }),
    "savingThrowOutcome",
  );
  return resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      targetFill,
      conditionChoiceFill,
      savingThrowOutcomeFill(initialSave, [{ targetId, succeeded: false }]),
    ],
  });
}

function resolveHoldPersonFailedSavingThrow(): BattleResolutionResult {
  return resolveHoldSpellFailedSavingThrow("hold_person", 2);
}

function resolveHoldMonsterFailedSavingThrow(): BattleResolutionResult {
  return resolveHoldSpellFailedSavingThrow("hold_monster", 5);
}

function resolveHoldSpellFailedSavingThrow(
  spellId: Extract<
    ConditionSavingThrowSpellUnitId,
    "hold_monster" | "hold_person"
  >,
  slotLevel: 2 | 5,
): BattleResolutionResult {
  const session = conditionSpellBattle(srdSpellRecord(spellId), "wizard");
  const act = spellAct({ session, spellId, slotLevel });
  const target = requireHole(act.initialHoles, "spellTargetList");
  const targetFill = spellTargetListFill(target, [targetId]);
  const initialSave = requireResultHole(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetFill],
    }),
    "savingThrowOutcome",
  );
  return resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      targetFill,
      savingThrowOutcomeFill(initialSave, [{ targetId, succeeded: false }]),
    ],
  });
}

function resolveHoldPersonRepeatSavingThrowSuccess(): BattleResolutionResult {
  return resolveHoldSpellRepeatSavingThrowSuccess(
    resolveHoldPersonFailedSavingThrow(),
    "Hold Person",
  );
}

function resolveHoldMonsterRepeatSavingThrowSuccess(): BattleResolutionResult {
  return resolveHoldSpellRepeatSavingThrowSuccess(
    resolveHoldMonsterFailedSavingThrow(),
    "Hold Monster",
  );
}

function resolveHoldSpellRepeatSavingThrowSuccess(
  cast: BattleResolutionResult,
  spellName: "Hold Monster" | "Hold Person",
): BattleResolutionResult {
  if (cast.tag !== "resolved") {
    throw new Error(`Expected ${spellName} cast to resolve.`);
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
  const session = conditionSpellBattle(
    srdSpellRecord("hideous_laughter"),
    "wizard",
  );
  const act = spellAct({
    session,
    spellId: "hideous_laughter",
    slotLevel: 1,
  });
  const target = requireHole(act.initialHoles, "spellTargetList");
  const targetFill = spellTargetListFill(target, [targetId]);
  const initialSave = requireResultHole(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetFill],
    }),
    "savingThrowOutcome",
  );
  const cast = resolveBattleSubject({
    state: session.state,
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
  const session = conditionSpellBattle(srdSpellRecord("sleep"), "wizard");
  const act = spellAct({ session, spellId: "sleep", slotLevel: 1 });
  const initialSave = requireHole(act.initialHoles, "savingThrowOutcome");
  const cast = resolveBattleSubject({
    state: session.state,
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

function resolveAreaSavingThrowSpellRoute(
  session: BattleRuntimeSession,
  spellId: Extract<
    ConditionSavingThrowSpellUnitId,
    "color_spray" | "entangle" | "hypnotic_pattern"
  >,
  slotLevel = 1,
): readonly BattleReducerRouteEvent[] {
  const act = spellAct({ session, spellId, slotLevel });
  const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
  const resolved = requireResolvedResult(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(savingThrow, [{ targetId, succeeded: false }]),
      ],
    }),
  );
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOf(act),
    ...routeEventsOf(resolved),
  ];
}

function resolveBlindnessDeafnessFailedSavingThrowRoute(
  selectedCondition: "blinded" | "deafened",
): readonly BattleReducerRouteEvent[] {
  const session = conditionSpellBattle(
    srdSpellRecord("blindness_deafness"),
    "wizard",
  );
  const act = spellAct({
    session,
    spellId: "blindness_deafness",
    slotLevel: 2,
  });
  const target = requireHole(act.initialHoles, "spellTargetList");
  const conditionChoice = requireHole(act.initialHoles, "conditionChoice");
  const targetFill = spellTargetListFill(target, [targetId]);
  const conditionChoiceFill = spellConditionChoiceFill(
    conditionChoice,
    selectedCondition,
  );
  const awaitingConditionChoice = requireNeedsHolesResult(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetFill],
    }),
  );
  const awaitingSave = requireNeedsHolesResult(
    resolveBattleSubject({
      state: awaitingConditionChoice.state,
      subject: act.subject,
      fills: [targetFill, conditionChoiceFill],
    }),
  );
  const initialSave = requireHole(awaitingSave.holes, "savingThrowOutcome");
  const resolved = requireResolvedResult(
    resolveBattleSubject({
      state: awaitingSave.state,
      subject: act.subject,
      fills: [
        targetFill,
        conditionChoiceFill,
        savingThrowOutcomeFill(initialSave, [{ targetId, succeeded: false }]),
      ],
    }),
  );
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOf(act),
    ...routeEventsOf(awaitingConditionChoice),
    ...optionalRouteEventsOf(awaitingSave),
    ...routeEventsOf(resolved),
  ];
}

function resolveHoldPersonFailedSavingThrowRoute(): readonly BattleReducerRouteEvent[] {
  return resolveHoldSpellFailedSavingThrowRoute("hold_person", 2);
}

function resolveHoldMonsterFailedSavingThrowRoute(): readonly BattleReducerRouteEvent[] {
  return resolveHoldSpellFailedSavingThrowRoute("hold_monster", 5);
}

function resolveHoldSpellFailedSavingThrowRoute(
  spellId: Extract<
    ConditionSavingThrowSpellUnitId,
    "hold_monster" | "hold_person"
  >,
  slotLevel: 2 | 5,
): readonly BattleReducerRouteEvent[] {
  const session = conditionSpellBattle(srdSpellRecord(spellId), "wizard");
  const act = spellAct({ session, spellId, slotLevel });
  const target = requireHole(act.initialHoles, "spellTargetList");
  const targetFill = spellTargetListFill(target, [targetId]);
  const awaitingSave = requireNeedsHolesResult(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetFill],
    }),
  );
  const initialSave = requireHole(awaitingSave.holes, "savingThrowOutcome");
  const resolved = requireResolvedResult(
    resolveBattleSubject({
      state: awaitingSave.state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(initialSave, [{ targetId, succeeded: false }]),
      ],
    }),
  );
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOf(act),
    ...routeEventsOf(awaitingSave),
    ...routeEventsOf(resolved),
  ];
}

function resolveHoldPersonRepeatSavingThrowSuccessRoute(): readonly BattleReducerRouteEvent[] {
  return resolveHoldSpellRepeatSavingThrowSuccessRoute(
    resolveHoldPersonFailedSavingThrow(),
    resolveHoldPersonFailedSavingThrowRoute(),
  );
}

function resolveHoldMonsterRepeatSavingThrowSuccessRoute(): readonly BattleReducerRouteEvent[] {
  return resolveHoldSpellRepeatSavingThrowSuccessRoute(
    resolveHoldMonsterFailedSavingThrow(),
    resolveHoldMonsterFailedSavingThrowRoute(),
  );
}

function resolveHoldSpellRepeatSavingThrowSuccessRoute(
  castResult: BattleResolutionResult,
  initialRoute: readonly BattleReducerRouteEvent[],
): readonly BattleReducerRouteEvent[] {
  const cast = requireResolvedResult(castResult);
  const targetTurn = requireResolvedResult(
    endTurn({ state: cast.state, actorId: casterId }),
  );
  const subject = endTurnSubjectFor(targetId);
  const repeat = requireNeedsHolesResult(
    resolveBattleSubject({
      state: targetTurn.state,
      subject,
      fills: [],
    }),
  );
  const repeatSave = requireHole(repeat.holes, "savingThrowOutcome");
  const resolved = requireResolvedResult(
    resolveBattleSubject({
      state: repeat.state,
      subject,
      fills: [
        savingThrowOutcomeFill(repeatSave, [{ targetId, succeeded: true }]),
      ],
    }),
  );
  return [
    ...initialRoute,
    ...optionalRouteEventsOf(targetTurn),
    ...routeEventsOf(repeat),
    ...routeEventsOf(resolved),
  ];
}

function resolveHideousLaughterRepeatSavingThrowSuccessRoute(): readonly BattleReducerRouteEvent[] {
  const session = conditionSpellBattle(
    srdSpellRecord("hideous_laughter"),
    "wizard",
  );
  const act = spellAct({
    session,
    spellId: "hideous_laughter",
    slotLevel: 1,
  });
  const target = requireHole(act.initialHoles, "spellTargetList");
  const targetFill = spellTargetListFill(target, [targetId]);
  const awaitingSave = requireNeedsHolesResult(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetFill],
    }),
  );
  const initialSave = requireHole(awaitingSave.holes, "savingThrowOutcome");
  const cast = requireResolvedResult(
    resolveBattleSubject({
      state: awaitingSave.state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(initialSave, [{ targetId, succeeded: false }]),
      ],
    }),
  );
  const targetTurn = requireResolvedResult(
    endTurn({ state: cast.state, actorId: casterId }),
  );
  const subject = endTurnSubjectFor(targetId);
  const repeat = requireNeedsHolesResult(
    resolveBattleSubject({
      state: targetTurn.state,
      subject,
      fills: [],
    }),
  );
  const repeatSave = requireHole(repeat.holes, "savingThrowOutcome");
  const resolved = requireResolvedResult(
    resolveBattleSubject({
      state: repeat.state,
      subject,
      fills: [
        savingThrowOutcomeFill(repeatSave, [{ targetId, succeeded: true }]),
      ],
    }),
  );
  return [
    battleReducerStartRouteEvent(),
    ...optionalRouteEventsOf(act),
    ...optionalRouteEventsOf(awaitingSave),
    ...optionalRouteEventsOf(cast),
    ...optionalRouteEventsOf(targetTurn),
    ...routeEventsOf(repeat),
    ...routeEventsOf(resolved),
  ];
}

function resolveSleepRepeatSavingThrowFailureRoute(): readonly BattleReducerRouteEvent[] {
  const session = conditionSpellBattle(srdSpellRecord("sleep"), "wizard");
  const act = spellAct({ session, spellId: "sleep", slotLevel: 1 });
  const initialSave = requireHole(act.initialHoles, "savingThrowOutcome");
  const cast = requireResolvedResult(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(initialSave, [{ targetId, succeeded: false }]),
      ],
    }),
  );
  const targetTurn = requireResolvedResult(
    endTurn({ state: cast.state, actorId: casterId }),
  );
  const subject = endTurnSubjectFor(targetId);
  const repeat = requireNeedsHolesResult(
    resolveBattleSubject({
      state: targetTurn.state,
      subject,
      fills: [],
    }),
  );
  const repeatSave = requireHole(repeat.holes, "savingThrowOutcome");
  const resolved = requireResolvedResult(
    resolveBattleSubject({
      state: repeat.state,
      subject,
      fills: [
        savingThrowOutcomeFill(repeatSave, [{ targetId, succeeded: false }]),
      ],
    }),
  );
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOf(act),
    ...routeEventsOf(cast),
    ...optionalRouteEventsOf(targetTurn),
    ...routeEventsOf(repeat),
    ...routeEventsOf(resolved),
  ];
}

function resolveSleepRepeatSaveAndDeathSaveMixedFrontierRoute(): readonly BattleReducerRouteEvent[] {
  const session = conditionSpellBattle(srdSpellRecord("sleep"), "wizard");
  const act = spellAct({ session, spellId: "sleep", slotLevel: 1 });
  const initialSave = requireHole(act.initialHoles, "savingThrowOutcome");
  const cast = requireResolvedResult(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(initialSave, [{ targetId, succeeded: false }]),
      ],
    }),
  );
  const targetTurn = requireResolvedResult(
    endTurn({ state: cast.state, actorId: casterId }),
  );
  const mixedFrontierState = withCombatantHp(targetTurn.state, casterId, Hp(0));
  const subject = endTurnSubjectFor(targetId);
  const repeat = requireNeedsHolesResult(
    resolveBattleSubject({
      state: mixedFrontierState,
      subject,
      fills: [],
    }),
  );
  const repeatSave = requireHole(repeat.holes, "savingThrowOutcome");
  const deathSave = requireHole(repeat.holes, "deathSavingThrow");
  const resolved = requireResolvedResult(
    resolveBattleSubject({
      state: repeat.state,
      subject,
      fills: [
        savingThrowOutcomeFill(repeatSave, [{ targetId, succeeded: false }]),
        deathSavingThrowFill(deathSave, 10),
      ],
    }),
  );
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOf(act),
    ...routeEventsOf(cast),
    ...optionalRouteEventsOf(targetTurn),
    ...routeEventsOf(repeat),
    ...routeEventsOf(resolved),
  ];
}

function saveGatedConditionAreaRoute(): readonly BattleReducerRouteEvent[] {
  return [
    battleReducerStartRouteEvent(),
    routeDiscoverBattleActs({
      subject: "saveGatedSpell",
      holes: ["savingThrowOutcome"],
      owner: "battleSpellSlotAndActionEconomy",
    }),
    routeResolveSubject({
      subject: "saveGatedSpell",
      fill: "savingThrowOutcome",
      holes: [],
      owner: "battleHoleFrontier",
    }),
  ];
}

function saveGatedConditionTargetListRoute(): readonly BattleReducerRouteEvent[] {
  return [
    battleReducerStartRouteEvent(),
    routeDiscoverBattleActs({
      subject: "saveGatedSpell",
      holes: ["spellTargetList"],
      owner: "battleSpellSlotAndActionEconomy",
    }),
    routeResolveSubject({
      subject: "saveGatedSpell",
      fill: "spellTargetList",
      holes: ["savingThrowOutcome"],
      owner: "battleHoleFrontier",
    }),
    routeResolveSubject({
      subject: "saveGatedSpell",
      fill: "savingThrowOutcome",
      holes: [],
      owner: "battleHoleFrontier",
    }),
  ];
}

function saveGatedConditionTargetListChoiceRoute(): readonly BattleReducerRouteEvent[] {
  return [
    battleReducerStartRouteEvent(),
    routeDiscoverBattleActs({
      subject: "saveGatedSpell",
      holes: ["spellTargetList"],
      owner: "battleSpellSlotAndActionEconomy",
    }),
    routeResolveSubject({
      subject: "saveGatedSpell",
      fill: "spellTargetList",
      holes: [],
      owner: "battleHoleFrontier",
    }),
    routeResolveSubject({
      subject: "saveGatedSpell",
      fill: "savingThrowOutcome",
      holes: [],
      owner: "battleHoleFrontier",
    }),
  ];
}

function sleepInitialSaveFailureRoute(): readonly BattleReducerRouteEvent[] {
  return [
    battleReducerStartRouteEvent(),
    routeDiscoverBattleActs({
      subject: "repeatSaveConditionEffect",
      holes: ["savingThrowOutcome"],
      owner: "battleSpellSlotAndActionEconomy",
    }),
    routeResolveSubject({
      subject: "repeatSaveConditionEffect",
      fill: "savingThrowOutcome",
      holes: [],
      owner: "battleConditionLifecycle",
    }),
    routeResolveSubjectWithoutFill({
      subject: "repeatSaveConditionEffect",
      owner: "battleActiveEffect",
    }),
    routeResolveSubjectWithoutFill({
      subject: "repeatSaveConditionEffect",
      owner: "battleConcentration",
    }),
  ];
}

function repeatSaveSuccessCleanupRoute(input: {
  readonly initialRoute: readonly BattleReducerRouteEvent[];
}): readonly BattleReducerRouteEvent[] {
  return [
    ...input.initialRoute,
    routeResolveSubjectWithoutFill({
      subject: "battleAction",
      owner: "battleActionEconomy",
    }),
    routeDiscoverBattleActs({
      subject: "repeatSaveConditionEffect",
      holes: ["savingThrowOutcome"],
      owner: "battleTurnBoundary",
    }),
    routeResolveSubject({
      subject: "repeatSaveConditionEffect",
      fill: "savingThrowOutcome",
      holes: [],
      owner: "battleConditionLifecycle",
    }),
    routeResolveSubjectWithoutFill({
      subject: "repeatSaveConditionEffect",
      owner: "battleActiveEffect",
    }),
    routeResolveSubjectWithoutFill({
      subject: "repeatSaveConditionEffect",
      owner: "battleConcentration",
    }),
  ];
}

function repeatSaveFailureUnconsciousRoute(input: {
  readonly initialRoute: readonly BattleReducerRouteEvent[];
}): readonly BattleReducerRouteEvent[] {
  return [
    ...input.initialRoute,
    routeResolveSubjectWithoutFill({
      subject: "repeatSaveConditionEffect",
      owner: "battleTurnBoundary",
    }),
    routeDiscoverBattleActs({
      subject: "repeatSaveConditionEffect",
      holes: ["savingThrowOutcome"],
      owner: "battleTurnBoundary",
    }),
    routeResolveSubject({
      subject: "repeatSaveConditionEffect",
      fill: "savingThrowOutcome",
      holes: [],
      owner: "battleConditionLifecycle",
    }),
  ];
}

function sleepRepeatSaveAndDeathSaveMixedFrontierRoute(): readonly BattleReducerRouteEvent[] {
  return [
    ...sleepInitialSaveFailureRoute(),
    routeResolveSubjectWithoutFill({
      subject: "repeatSaveConditionEffect",
      owner: "battleTurnBoundary",
    }),
    routeDiscoverBattleActs({
      subject: "repeatSaveConditionEffect",
      holes: ["savingThrowOutcome"],
      owner: "battleTurnBoundary",
    }),
    routeDiscoverBattleActs({
      subject: "deathSavingThrow",
      holes: ["deathSavingThrow"],
      owner: "battleHitPointAndZeroHpLifecycle",
    }),
    routeResolveSubject({
      subject: "repeatSaveConditionEffect",
      fill: "savingThrowOutcome",
      holes: [],
      owner: "battleConditionLifecycle",
    }),
    routeResolveSubject({
      subject: "deathSavingThrow",
      fill: "deathSavingThrow",
      holes: [],
      owner: "battleHitPointAndZeroHpLifecycle",
    }),
  ];
}

function routeDiscoverBattleActs(
  input: Omit<
    Extract<BattleReducerRouteEvent, { readonly kind: "discoverBattleActs" }>,
    "kind"
  >,
): BattleReducerRouteEvent {
  return { kind: "discoverBattleActs", ...input };
}

function routeResolveSubject(
  input: Omit<
    Extract<BattleReducerRouteEvent, { readonly kind: "resolveBattleSubject" }>,
    "kind"
  >,
): BattleReducerRouteEvent {
  return { kind: "resolveBattleSubject", ...input };
}

function routeResolveSubjectWithoutFill(
  input: Omit<
    Extract<
      BattleReducerRouteEvent,
      { readonly kind: "resolveBattleSubjectWithoutFill" }
    >,
    "kind" | "holes"
  >,
): BattleReducerRouteEvent {
  return { kind: "resolveBattleSubjectWithoutFill", holes: [], ...input };
}

function routeEventsOf(source: {
  readonly routeEvents?: readonly BattleReducerRouteEvent[];
}): readonly BattleReducerRouteEvent[] {
  if (source.routeEvents === undefined) {
    throw new Error("Expected public reducer route events.");
  }
  return source.routeEvents;
}

function optionalRouteEventsOf(source: {
  readonly routeEvents?: readonly BattleReducerRouteEvent[];
}): readonly BattleReducerRouteEvent[] {
  return source.routeEvents ?? [];
}

function requireResolvedResult(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved result, got ${result.tag}.`);
  }
  return result;
}

function expectedProjection(
  overrides: Partial<ConditionSavingThrowSelectedIdentityProjection> = {},
): ConditionSavingThrowSelectedIdentityProjection {
  return {
    targetCharmed: false,
    targetBlinded: false,
    targetDeafened: false,
    targetRestrained: false,
    targetParalyzed: false,
    targetIncapacitated: false,
    targetUnconscious: false,
    targetProne: false,
    casterConcentrating: false,
    actionAvailable: true,
    targetWalkSpeedFeet: 30,
    firstLevelSlotsExpended: 0,
    secondLevelSlotsExpended: 0,
    thirdLevelSlotsExpended: 0,
    fifthLevelSlotsExpended: 0,
    lastResult: "init",
    ...overrides,
  };
}

function srdSpellRecord(unitId: ConditionSavingThrowSpellUnitId): SpellRecord {
  if (unitId === "hypnotic_pattern") {
    return hypnoticPatternSpell;
  }
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${unitId} to be a Spell.`);
  }
  return unit;
}

function decodeHypnoticPatternSpellRecord(): SpellRecord {
  const unit = decodeUnitRecordSync(hypnoticPatternInput);
  if (unit.kind !== "spell") {
    throw new Error("Expected Hypnotic Pattern fixture to decode as a Spell.");
  }
  return unit;
}

function conditionSpellBattle(
  spell: SpellRecord,
  sourceClassName: CharacterSpellcastingInit["sourceClassName"],
): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId(`condition-saving-throw-selected-identity-${spell.id}`),
    combatants: [
      conditionSpellCreature({
        combatantId: casterId,
        displayName: "Condition Saving Throw caster",
        initiative: 20,
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
              : spell.id === "hold_monster"
                ? [{ spellLevel: 5, count: 1 }]
                : spell.id === "hypnotic_pattern"
                  ? [{ spellLevel: 3, count: 1 }]
                  : [{ spellLevel: 1, count: 1 }],
        },
      }),
      conditionSpellCreature({
        combatantId: targetId,
        displayName: "Condition Saving Throw target",
        initiative: 10,
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
  readonly className: CharacterClassName;
  readonly spellcasting?: CharacterSpellcastingInit;
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: [{ className: input.className, level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      weaponMasteries: [],
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
  readonly session: BattleRuntimeSession;
  readonly spellId: ConditionSavingThrowSpellUnitId;
  readonly slotLevel: number;
}): ActionSpellAct {
  const act = discoverBattleActs(input.session).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.tag === "spellSlot" &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        input.spellId &&
      Number(
        battleActSpellSlotPresentation(candidate)?.invocation.slotLevel,
      ) === input.slotLevel,
  );
  if (act === undefined) {
    throw new Error(`Expected ${input.spellId} spell act.`);
  }
  return act;
}

function spellTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
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
      sourceProcedureRef: hole.sourceProcedureRef,
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
      "sourceProcedureRef" in hole &&
      hole.sourceProcedureRef ===
        battleProcedureExecutionRefForTest("hypnotic_pattern")
        ? {
            area: {
              kind: "hypnoticPatternArea",
              originAnchorId: casterId,
              affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
              cubeSideFeet: 30,
              affectedCreatureWitnesses: outcomes.map((outcome) => ({
                targetId: outcome.targetId,
                inCube: true,
                canSeePattern: true,
              })),
            },
            outcomes,
          }
        : "outcomeTargeting" in hole && hole.outcomeTargeting === "area"
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

function deathSavingThrowFill(
  hole: Extract<BattleHole, { readonly kind: "deathSavingThrow" }>,
  roll: number,
): Extract<BattleFill, { readonly kind: "deathSavingThrow" }> {
  return {
    kind: "deathSavingThrow",
    holeId: hole.holeId,
    value: DieRollResult(roll),
  };
}

function withCombatantHp(
  state: BattleState,
  selectedCombatantId: CombatantId,
  hp: Hp,
): BattleState {
  const combatant = state.combatants.get(selectedCombatantId);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${selectedCombatantId}.`);
  }
  const updatedCombatant: BattleState["combatants"] extends ReadonlyMap<
    CombatantId,
    infer TCombatant
  >
    ? TCombatant
    : never = {
    ...combatant,
    hp,
    positiveHpUnconscious: null,
  };
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      selectedCombatantId,
      updatedCombatant,
    ),
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
    targetCharmed: snapshotHasCondition(target.conditions, "charmed"),
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
    targetWalkSpeedFeet: Number(target.movement.speedFeet),
    firstLevelSlotsExpended: expendedSlotsForSpellLevel(state, casterId, 1),
    secondLevelSlotsExpended: expendedSlotsForSpellLevel(state, casterId, 2),
    thirdLevelSlotsExpended: expendedSlotsForSpellLevel(state, casterId, 3),
    fifthLevelSlotsExpended: expendedSlotsForSpellLevel(state, casterId, 5),
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
