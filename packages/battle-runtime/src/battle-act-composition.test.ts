import { describe, expect, test } from "vitest";

import {
  battleActDruidWildShapePresentation,
  battleActSpellPresentation,
  battleActSpellSlotPresentation,
  battleActUnitPresentation,
  battleSelectedSpellInvocationForProcedure,
  battleSubjectPresentation,
  discoverBattleActs,
} from "./battle-act-composition.ts";
import {
  battleEffectExecutionRefForTest,
  battleId,
  battleProcedureExecutionRefForTest,
  characterSeed,
  battleObjectId,
  characterAttackSubjectForTest,
  fighterId,
  goblinId,
  monksFocusResource,
  startBattleSessionRight,
  statBlockCreatureInit,
  wizardId,
  wizardSpellcasting,
  spellRecord,
} from "./battle-runtime.test-support.ts";
import {
  battleRuntimeContextForTest,
  battleRuntimeSessionForTest,
} from "./battle-runtime-session.test-support.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import type { BattleRuntimeSession } from "./battle-runtime-context.ts";
import {
  battleAttackExecutionScopeRef,
  battleAttackProcedureExecutionRef,
  battleExecutionScopeOrdinal,
  battleStatBlockExecutionScopeRef,
  battleStatBlockProcedureExecutionRef,
} from "./identity.ts";
import { NonNegativeInteger, movementFeet } from "@dnd/shared/types";

function syntheticAttackProcedureRef(
  discriminator: string,
  actorId: typeof fighterId | typeof goblinId,
) {
  return battleAttackProcedureExecutionRef(
    battleAttackExecutionScopeRef(
      battleId(`battle-act-composition-${discriminator}`),
      actorId,
      battleExecutionScopeOrdinal(0),
    ),
    NonNegativeInteger(0),
  );
}

function syntheticStatBlockProcedureRef(
  discriminator: string,
  actorId: typeof fighterId | typeof goblinId,
) {
  return battleStatBlockProcedureExecutionRef(
    battleStatBlockExecutionScopeRef(
      battleId(`battle-act-composition-${discriminator}`),
      actorId,
      battleExecutionScopeOrdinal(0),
    ),
    NonNegativeInteger(0),
  );
}

describe("battle act composition presentations", () => {
  test("projects ordinary intrinsic acts and spell presentation helpers", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-act-composition-projections"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("ray_of_frost")],
            preparedSpells: [spellRecord("magic_missile")],
          }),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
      ],
    });

    const acts = discoverBattleActs(session);
    const intrinsic = acts.find(
      (act) => act.subject.tag === "action" && act.subject.action === "dash",
    );
    const spell = acts.find(
      (act) =>
        act.subject.tag === "actionSpell" &&
        act.subject.mode.tag === "cast" &&
        act.presentation.kind === "spell",
    );
    if (intrinsic === undefined || spell === undefined) {
      throw new Error("Expected intrinsic and spell presentation acts.");
    }

    expect(intrinsic).toMatchObject({
      label: "Dash",
      summary: "Use Dash.",
      presentation: { kind: "intrinsic" },
    });
    expect(battleActSpellPresentation(intrinsic)).toBeUndefined();
    expect(battleActSpellSlotPresentation(intrinsic)).toBeUndefined();
    expect(battleActUnitPresentation(intrinsic)).toBeUndefined();
    expect(battleActDruidWildShapePresentation(intrinsic)).toBeUndefined();

    const spellPresentation = battleActSpellPresentation(spell);
    expect(spellPresentation).toMatchObject({
      kind: "spell",
      invocation: { spellId: "magic_missile", tag: "spellSlot" },
    });
    expect(battleActSpellSlotPresentation(spell)).toEqual(spellPresentation);
    expect(battleActUnitPresentation(spell)).toBeUndefined();
    expect(battleActDruidWildShapePresentation(spell)).toBeUndefined();
  });

  test("maps typed interrupt spell owners independently of route eligibility", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-act-composition-interrupts"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("ray_of_frost")],
            preparedSpells: [],
          }),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
      ],
    });
    const spellAct = discoverBattleActs(session).find(
      (act) =>
        act.subject.tag === "actionSpell" &&
        act.subject.mode.tag === "cast" &&
        act.presentation.kind === "spell",
    );
    if (spellAct?.subject.tag !== "actionSpell") {
      throw new Error("Expected a cast spell act.");
    }

    // Route discovery proves each interrupt's eligibility; this presentation
    // boundary selects its command-specific spell owner from the typed subject.
    const interruptSubjects = [
      {
        tag: "runtimeCommand",
        actorId: goblinId,
        command: "releaseReadiedSpell",
        readiedSpellCasterId: wizardId,
        procedureRef: spellAct.subject.procedureRef,
      },
      {
        tag: "runtimeCommand",
        actorId: goblinId,
        command: "castTriggeredReactionSpell",
        reactorId: wizardId,
        procedureRef: spellAct.subject.procedureRef,
      },
      {
        tag: "runtimeCommand",
        actorId: goblinId,
        command: "castAttackHitBonusActionSpell",
        casterId: wizardId,
        procedureRef: spellAct.subject.procedureRef,
      },
    ] as const satisfies ReadonlyArray<BattleSubject>;

    expect(
      interruptSubjects.map((subject) =>
        battleSubjectPresentation(session, subject),
      ),
    ).toEqual([
      expect.objectContaining({
        kind: "spell",
        procedureRef: spellAct.subject.procedureRef,
      }),
      expect.objectContaining({
        kind: "spell",
        procedureRef: spellAct.subject.procedureRef,
      }),
      expect.objectContaining({
        kind: "spell",
        procedureRef: spellAct.subject.procedureRef,
      }),
    ]);

    expect(
      battleSubjectPresentation(session, {
        ...interruptSubjects[0],
        readiedSpellCasterId: goblinId,
      }),
    ).toBeUndefined();

    const stale = {
      ...interruptSubjects[0],
      procedureRef: battleProcedureExecutionRefForTest("missing-interrupt"),
    } satisfies BattleSubject;
    expect(battleSubjectPresentation(session, stale)).toBeUndefined();
  });

  test("keeps stale character procedure presentations absent", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-act-composition-stale-character"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("ray_of_frost")],
            preparedSpells: [],
          }),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
      ],
    });
    const missingProcedureRef = battleProcedureExecutionRefForTest(
      "missing-character-procedure",
    );
    const missingEffectRef = battleEffectExecutionRefForTest(
      "missing-character-effect",
    );

    const staleCharacterSubjects = [
      {
        tag: "actionSpell",
        actorId: fighterId,
        procedureRef: missingProcedureRef,
        mode: { tag: "cast" },
      },
      {
        tag: "bonusActionSpell",
        actorId: fighterId,
        procedureRef: missingProcedureRef,
        mode: { tag: "cast" },
      },
      {
        tag: "bonusActionDashSpell",
        actorId: fighterId,
        procedureRef: missingProcedureRef,
        mode: { tag: "cast" },
        speedKind: "walk",
      },
      {
        tag: "spawnedCompanionTouchSpellProxy",
        actorId: fighterId,
        procedureRef: missingProcedureRef,
        companionId: goblinId,
        spellAction: "action",
        mode: { tag: "cast" },
      },
      {
        tag: "unitFeature",
        actorId: fighterId,
        procedureRef: missingProcedureRef,
      },
      {
        tag: "unitFeatureHeldWeaponActivation",
        actorId: fighterId,
        procedureRef: missingProcedureRef,
        weaponItemId: battleObjectId("missing-weapon"),
      },
      {
        tag: "druidWildShape",
        actorId: fighterId,
        procedureRef: missingProcedureRef,
        action: "assumeForm",
        formExecutionRef: battleStatBlockExecutionScopeRef(
          battleId("battle-act-composition-label-families"),
          fighterId,
          battleExecutionScopeOrdinal(0),
        ),
      },
      {
        tag: "druidWildShape",
        actorId: fighterId,
        procedureRef: missingProcedureRef,
        action: "dismiss",
      },
      {
        tag: "bonusActionStandardAction",
        actorId: fighterId,
        procedureRef: missingProcedureRef,
        sourceEffectRef: missingEffectRef,
        action: "dash",
        speedKind: "walk",
      },
      {
        tag: "monkFocusOption",
        actorId: fighterId,
        procedureRef: missingProcedureRef,
        option: "flurryOfBlows",
      },
    ] as const satisfies ReadonlyArray<BattleSubject>;

    for (const subject of staleCharacterSubjects) {
      expect(battleSubjectPresentation(session, subject)).toBeUndefined();
    }
    expect(
      battleSubjectPresentation(session, {
        ...staleCharacterSubjects[0],
        actorId: goblinId,
      }),
    ).toBeUndefined();
    expect(
      battleSelectedSpellInvocationForProcedure(
        session,
        goblinId,
        missingProcedureRef,
      ),
    ).toBeUndefined();
    expect(
      battleSelectedSpellInvocationForProcedure(
        session,
        fighterId,
        missingProcedureRef,
      ),
    ).toBeUndefined();
  });

  test("projects monk units and maps typed intrinsic presentation variants", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-act-composition-label-families"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          initiative: 20,
          attack: null,
          classLevels: [{ className: "monk", level: 2 }],
          resources: [monksFocusResource({ usesRemaining: 2 })],
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
      ],
    });
    const acts = discoverBattleActs(session);
    const focusActs = acts.filter(
      (act) => act.subject.tag === "monkFocusOption",
    );
    expect(focusActs).toHaveLength(5);
    expect(focusActs.map((act) => act.label)).toEqual(
      expect.arrayContaining([
        "Monk's Focus: Flurry of Blows",
        "Monk's Focus: Disengage",
        "Monk's Focus: Disengage and Dodge",
        "Monk's Focus: Dash",
        "Monk's Focus: Disengage and Dash",
      ]),
    );
    const firstFocusAct = focusActs[0];
    if (firstFocusAct === undefined) {
      throw new Error("Expected at least one Monk Focus act.");
    }
    expect(battleActUnitPresentation(firstFocusAct)).toMatchObject({
      kind: "unit",
      unitId: "monk_monks_focus",
    });

    // These variants exercise the intrinsic presentation algebra directly;
    // unlike joined attack or feature presentations, it does not inspect actor
    // procedure state after route discovery has produced a typed subject.
    const procedureRef = syntheticAttackProcedureRef("label-family", goblinId);
    const intrinsicSubjects = [
      {
        tag: "bonusAction",
        actorId: goblinId,
        action: "martialArtsUnarmedStrike",
        procedureRef,
        attackAbility: "dex",
        attackDamageType: "bludgeoning",
      },
      { tag: "companionLifecycle", actorId: goblinId, action: "reappear" },
      {
        tag: "companionLifecycle",
        actorId: goblinId,
        action: "temporarilyDismiss",
      },
      {
        tag: "companionLifecycle",
        actorId: goblinId,
        action: "permanentlyDismiss",
      },
      {
        tag: "spawnedCompanionSharedSenses",
        actorId: goblinId,
        familiarId: fighterId,
      },
      {
        tag: "companionAttack",
        actorId: goblinId,
        familiarId: fighterId,
        procedureRef: battleStatBlockProcedureExecutionRef(
          battleStatBlockExecutionScopeRef(
            battleId("battle-act-composition-label-families"),
            goblinId,
            battleExecutionScopeOrdinal(0),
          ),
          NonNegativeInteger(0),
        ),
      },
      {
        tag: "monkFocusFlurryOfBlowsStrike",
        actorId: goblinId,
        focusProcedureRef: procedureRef,
        procedureRef,
      },
      {
        tag: "bonusAction",
        actorId: goblinId,
        action: "statBlockActionOption",
        procedureRef: syntheticStatBlockProcedureRef(
          "label-family-stat-block",
          goblinId,
        ),
        standardAction: "dodge",
      },
    ] as const satisfies ReadonlyArray<BattleSubject>;

    for (const subject of intrinsicSubjects) {
      expect(battleSubjectPresentation(session, subject)).toEqual({
        kind: "intrinsic",
      });
    }
  });

  test("stale intrinsic execution references do not leak attack presentations", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-act-composition-stale-intrinsic"),
      combatants: [
        characterSeed({ combatantId: fighterId, initiative: 20 }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
      ],
    });
    const missingProcedureRef = syntheticAttackProcedureRef(
      "missing-attack-procedure",
      fighterId,
    );
    const missingEffectRef = battleEffectExecutionRefForTest(
      "missing-jump-effect",
    );
    const staleSubjects = [
      {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        procedureRef: missingProcedureRef,
        attackAbility: "str",
        attackDamageType: "slashing",
      },
      {
        tag: "runtimeCommand",
        actorId: goblinId,
        command: "opportunityAttack",
        reactorId: goblinId,
        targetId: fighterId,
        distanceFeet: movementFeet(5),
        procedureRef: missingProcedureRef,
        attackAbility: "str",
        attackDamageType: "slashing",
      },
      {
        tag: "runtimeCommand",
        actorId: goblinId,
        command: "retaliationAttack",
        reactorId: goblinId,
        targetId: fighterId,
        procedureRef: missingProcedureRef,
        attackAbility: "str",
        attackDamageType: "slashing",
      },
    ] as const satisfies ReadonlyArray<BattleSubject>;
    for (const subject of staleSubjects) {
      expect(battleSubjectPresentation(session, subject)).toBeUndefined();
    }

    const jump = {
      tag: "runtimeCommand",
      actorId: goblinId,
      command: "jumpMovementReplacement",
      effectRef: missingEffectRef,
    } as const satisfies BattleSubject;
    expect(battleSubjectPresentation(session, jump)).toEqual({
      kind: "intrinsic",
    });

    expect(
      battleSubjectPresentation(session, {
        ...jump,
        actorId: wizardId,
      }),
    ).toEqual({ kind: "intrinsic" });

    const fighterAttack = characterAttackSubjectForTest(
      session.state,
      fighterId,
      "Longsword",
    );
    const opportunity = {
      tag: "runtimeCommand",
      actorId: goblinId,
      command: "opportunityAttack",
      reactorId: fighterId,
      targetId: goblinId,
      distanceFeet: movementFeet(5),
      procedureRef: fighterAttack.procedureRef,
      attackAbility: fighterAttack.attackAbility,
      attackDamageType: fighterAttack.attackDamageType,
    } as const satisfies BattleSubject;
    expect(battleSubjectPresentation(session, opportunity)).toEqual(
      expect.objectContaining({ kind: "attack", name: "Longsword" }),
    );
  });

  test("an actor missing from the state is rejected by character presentation lookup", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-act-composition-missing-actor"),
      combatants: [
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
      ],
    });
    const missingActor = {
      tag: "actionSpell",
      actorId: fighterId,
      procedureRef: battleProcedureExecutionRefForTest("missing-actor"),
      mode: { tag: "cast" },
    } as const satisfies BattleSubject;
    expect(battleSubjectPresentation(session, missingActor)).toBeUndefined();
    expect(
      battleSelectedSpellInvocationForProcedure(
        session,
        fighterId,
        missingActor.procedureRef,
      ),
    ).toBeUndefined();
  });

  test("missing character context cannot supply a unit presentation", () => {
    const stateSession = startBattleSessionRight({
      battleId: battleId("battle-act-composition-missing-context"),
      combatants: [
        characterSeed({ combatantId: fighterId, initiative: 20 }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
      ],
    });
    const session: BattleRuntimeSession = battleRuntimeSessionForTest({
      state: stateSession.state,
      context: battleRuntimeContextForTest(new Map()),
    });
    const subject = {
      tag: "unitFeature",
      actorId: fighterId,
      procedureRef: battleProcedureExecutionRefForTest("missing-context"),
    } as const satisfies BattleSubject;
    expect(battleSubjectPresentation(session, subject)).toBeUndefined();

    const attack = characterAttackSubjectForTest(
      stateSession.state,
      fighterId,
      "Longsword",
    );
    const opportunity = {
      tag: "runtimeCommand",
      actorId: goblinId,
      command: "opportunityAttack",
      reactorId: fighterId,
      targetId: goblinId,
      distanceFeet: movementFeet(5),
      procedureRef: attack.procedureRef,
      attackAbility: attack.attackAbility,
      attackDamageType: attack.attackDamageType,
    } as const satisfies BattleSubject;
    expect(battleSubjectPresentation(session, opportunity)).toMatchObject({
      kind: "presentationIssue",
      issue: {
        tag: "attackPresentationJoinIssue",
        reason: "characterContextMissing",
      },
    });
  });
});
