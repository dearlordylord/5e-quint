import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { describe, expect, test } from "vitest";
import { battleActSpellPresentation } from "../battle-act-composition.ts";
import {
  battleEffectExecutionRefForTest,
  barbarianRageUnit,
  battleId,
  characterSeed,
  discoverBattleActs,
  fighterAttackSubject,
  fighterId,
  findAct,
  magicSubject,
  rageResource,
  recklessAttackFeature,
  requireCharacterUnitProcedureRefForTest,
  skeletonCreatureInit,
  spellRecord,
  startBattleRight,
  startBattleSessionRight,
  statBlockCatalog,
  statBlockProcedurePresentationsForStateForTest,
  statBlockCreatureInit,
  testBattleCreatureStateWithConditions,
  wizardId,
  wizardSpellcasting,
} from "../battle-runtime.test-support.ts";
import type { BattleState } from "../battle-state-execution.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import type { BattleCompanionState } from "../companion-state.ts";
import {
  battleSubjectActionEligibilityIssue,
  battleSubjectBeginsBonusAction,
} from "./action-eligibility.ts";
import {
  battleAttackExecutionScopeRef,
  battleAttackProcedureExecutionRef,
  battleObjectId,
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleProcedureExecutionRef,
  battleStatBlockExecutionScopeRef,
  BattleStatBlockProcedureExecutionRef,
  battleStatBlockProcedureExecutionRef,
  combatantId,
} from "../identity.ts";
import { NonNegativeInteger } from "@dnd/shared/types";

function eligibilityBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-action-eligibility"),
    combatants: [
      characterSeed({ initiative: 20 }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function familiarEligibilityBattle(): {
  readonly state: BattleState;
  readonly familiarId: ReturnType<typeof combatantId>;
} {
  const familiarId = combatantId("action-eligibility-familiar");
  const started = startBattleRight({
    battleId: battleId("battle-familiar-action-eligibility"),
    combatants: [
      characterSeed({ initiative: 20 }),
      statBlockCreatureInit({ initiative: 10 }),
      statBlockCreatureInit({
        combatantId: familiarId,
        initiative: 5,
        statBlock: statBlockCatalog.requireStatBlock("stat_block_bat"),
      }),
    ],
  });
  const companion: BattleCompanionState = {
    status: "present",
    formAccess: "spawnedCompanion",
    ownerId: fighterId,
    identity: { tag: "battleOnly" },
    protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
    creatureTypeOverride: "fey",
    combatantId: familiarId,
    placement: { kind: "unoccupiedSpaceWithinSpellRange" },
  };
  return {
    state: {
      ...started,
      companions: new Map([[fighterId, companion]]),
    },
    familiarId,
  };
}

describe("battle subject action eligibility", () => {
  test("admits an action subject while its actor and resource are eligible", () => {
    const state = eligibilityBattle();

    expect(
      battleSubjectActionEligibilityIssue(
        state,
        fighterAttackSubject(state, "Longsword"),
      ),
    ).toBeNull();
  });

  test("reports an exhausted standard action resource", () => {
    const state = eligibilityBattle();
    const withoutAction = {
      ...state,
      currentTurnResources: {
        ...state.currentTurnResources,
        actionResources: [],
      },
    };

    expect(
      battleSubjectActionEligibilityIssue(withoutAction, {
        tag: "action",
        actorId: fighterId,
        action: "dash",
        speedKind: "walk",
      }),
    ).toBe("The selected action is no longer available for the current actor.");
  });

  test("reports an actor that cannot take actions before resource eligibility", () => {
    const state = eligibilityBattle();
    const fighter = state.combatants.get(fighterId);
    if (fighter === undefined) {
      throw new Error("Expected the fighter fixture.");
    }
    const incapacitated = {
      ...state,
      combatants: new Map(state.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          fighter,
          applyCondition(fighter.conditions, "incapacitated"),
        ),
      ),
    };

    expect(
      battleSubjectActionEligibilityIssue(
        incapacitated,
        fighterAttackSubject(state, "Longsword"),
      ),
    ).toBe("The selected action is no longer available for the current actor.");
  });

  test("owns Magic and Bonus Action spell resource diagnostics", () => {
    const actionSession = startBattleSessionRight({
      battleId: battleId("battle-magic-action-eligibility"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("mage_armor")],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const bonusActionSession = startBattleSessionRight({
      battleId: battleId("battle-bonus-action-spell-eligibility"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Warlock",
          initiative: 20,
          attack: null,
          classLevels: [{ className: "warlock", level: 1 }],
          spellcasting: {
            ...wizardSpellcasting({
              preparedSpells: [spellRecord("hex")],
            }),
            spellcastingSource: {
              tag: "classSpellcasting",
              className: "warlock",
              abilityModifier: 3,
            },
          },
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const withoutMagicAction = {
      ...actionSession.state,
      currentTurnResources: {
        ...actionSession.state.currentTurnResources,
        actionResources: [],
      },
    };
    const withoutBonusAction = {
      ...bonusActionSession.state,
      currentTurnResources: {
        ...bonusActionSession.state.currentTurnResources,
        currentHasBonusAction: false,
      },
    };
    const bonusActionSpell = discoverBattleActs(bonusActionSession).find(
      (act) =>
        act.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(act)?.invocation.spellId === "hex",
    );
    if (bonusActionSpell?.subject.tag !== "bonusActionSpell") {
      throw new Error("Expected a Hex Bonus Action spell subject.");
    }

    expect(
      battleSubjectActionEligibilityIssue(
        withoutMagicAction,
        findAct(actionSession, magicSubject("mage_armor")).subject,
      ),
    ).toBe("Magic action is no longer available for the current actor.");
    expect(
      battleSubjectActionEligibilityIssue(
        withoutBonusAction,
        bonusActionSpell.subject,
      ),
    ).toBe("Bonus Action spell is no longer available for the current actor.");
  });

  test("does not claim eligibility ownership for unrelated subjects", () => {
    const state = eligibilityBattle();

    expect(
      battleSubjectActionEligibilityIssue(state, {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "endTurn",
      }),
    ).toBeNull();
  });

  test("classifies every discovered subject family by its action economy", () => {
    const familiarBattle = familiarEligibilityBattle();
    const state = familiarBattle.state;
    const { familiarId } = familiarBattle;
    const procedureRef = battleProcedureExecutionRef(
      battleCharacterExecutionScopeRef(
        battleId("battle-action-eligibility-subjects"),
        fighterId,
        battleExecutionScopeOrdinal(0),
      ),
      NonNegativeInteger(0),
    );
    const attackProcedureRef = battleAttackProcedureExecutionRef(
      battleAttackExecutionScopeRef(
        battleId("battle-action-eligibility-subjects"),
        fighterId,
        battleExecutionScopeOrdinal(1),
      ),
      NonNegativeInteger(0),
    );
    const statBlockProcedureRef = battleStatBlockProcedureExecutionRef(
      battleStatBlockExecutionScopeRef(
        battleId("battle-action-eligibility-subjects"),
        familiarId,
        battleExecutionScopeOrdinal(2),
      ),
      NonNegativeInteger(0),
    );
    const subjects = [
      { tag: "action", actorId: fighterId, action: "dash", speedKind: "walk" },
      {
        tag: "monkFocusOption",
        actorId: fighterId,
        procedureRef,
        option: "flurryOfBlows",
      },
      {
        tag: "monkFocusFlurryOfBlowsStrike",
        actorId: fighterId,
        focusProcedureRef: procedureRef,
        procedureRef: attackProcedureRef,
      },
      {
        tag: "unitFeatureHeldWeaponActivation",
        actorId: fighterId,
        procedureRef,
        weaponItemId: battleObjectId("synthetic-weapon"),
      },
      {
        tag: "companionAttack",
        actorId: fighterId,
        familiarId,
        procedureRef: statBlockProcedureRef,
      },
      {
        tag: "actionSpell",
        actorId: fighterId,
        procedureRef,
        mode: { tag: "cast" },
      },
      {
        tag: "bonusAction",
        actorId: fighterId,
        action: "offHandAttack",
        procedureRef: attackProcedureRef,
        attackAbility: "str",
        attackDamageType: "slashing",
      },
      {
        tag: "bonusActionDashSpell",
        actorId: fighterId,
        procedureRef,
        mode: { tag: "cast" },
        speedKind: "walk",
      },
      {
        tag: "bonusActionSpell",
        actorId: fighterId,
        procedureRef,
        mode: { tag: "cast" },
      },
      {
        tag: "bonusActionStandardAction",
        actorId: fighterId,
        procedureRef,
        sourceEffectRef: battleEffectExecutionRefForTest("synthetic-effect"),
        action: "dash",
        speedKind: "walk",
      },
      {
        tag: "companionLifecycle",
        actorId: fighterId,
        action: "temporarilyDismiss",
      },
      {
        tag: "druidWildShape",
        actorId: fighterId,
        procedureRef,
        action: "dismiss",
      },
      {
        tag: "spawnedCompanionSharedSenses",
        actorId: fighterId,
        familiarId,
      },
      {
        tag: "spawnedCompanionTouchSpellProxy",
        actorId: fighterId,
        procedureRef,
        companionId: familiarId,
        spellAction: "action",
        mode: { tag: "cast" },
      },
      { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" },
      { tag: "unitFeature", actorId: fighterId, procedureRef },
    ] as const satisfies ReadonlyArray<BattleSubject>;
    const bonusActionTags = new Set<BattleSubject["tag"]>([
      "monkFocusOption",
      "bonusAction",
      "bonusActionDashSpell",
      "bonusActionSpell",
      "bonusActionStandardAction",
      "druidWildShape",
      "spawnedCompanionSharedSenses",
    ]);

    for (const subject of subjects) {
      expect(battleSubjectBeginsBonusAction(state, subject)).toBe(
        bonusActionTags.has(subject.tag),
      );
    }
  });

  test("reads the Bonus Action trigger from bound ongoing and resource features", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-action-eligibility-bound-features"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 2 }],
          resources: [rageResource()],
          unitFeatures: [recklessAttackFeature()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const rageSubject = {
      tag: "unitFeature" as const,
      actorId: fighterId,
      procedureRef: requireCharacterUnitProcedureRefForTest(
        session,
        fighterId,
        barbarianRageUnit().id,
      ),
    } satisfies Extract<BattleSubject, { readonly tag: "unitFeature" }>;
    const recklessAttackSubject = {
      ...rageSubject,
      procedureRef: requireCharacterUnitProcedureRefForTest(
        session,
        fighterId,
        "barbarian_reckless_attack",
      ),
    } satisfies Extract<BattleSubject, { readonly tag: "unitFeature" }>;

    expect(battleSubjectBeginsBonusAction(session.state, rageSubject)).toBe(
      true,
    );
    expect(
      battleSubjectBeginsBonusAction(session.state, recklessAttackSubject),
    ).toBe(false);
  });

  test("rejects a present familiar's attack action while preserving other eligibility families", () => {
    const { state, familiarId } = familiarEligibilityBattle();
    const familiar = state.combatants.get(familiarId);
    if (familiar?.origin.kind !== "statBlock") {
      throw new Error("Expected the Bat familiar fixture.");
    }
    const bitePresentation = statBlockProcedurePresentationsForStateForTest(
      state,
      familiarId,
    ).find(
      (procedure) => procedure.kind === "attack" && procedure.name === "Bite",
    );
    if (bitePresentation === undefined) {
      throw new Error("Expected the Bat's admitted Bite procedure.");
    }
    const biteAttack = {
      tag: "action" as const,
      actorId: familiarId,
      action: "attack" as const,
      procedureRef: BattleStatBlockProcedureExecutionRef.make(
        bitePresentation.procedureRef,
      ),
    } satisfies Extract<
      BattleSubject,
      { readonly tag: "action"; readonly action: "attack" }
    >;
    const subjects = [
      {
        subject: biteAttack,
        expectedIssue: "Find Familiar familiars can't attack.",
      },
      {
        subject: {
          tag: "action" as const,
          actorId: familiarId,
          action: "grapple" as const,
        },
        expectedIssue: "Find Familiar familiars can't attack.",
      },
      {
        subject: {
          tag: "action" as const,
          actorId: familiarId,
          action: "shove" as const,
        },
        expectedIssue: "Find Familiar familiars can't attack.",
      },
      {
        subject: {
          tag: "action" as const,
          actorId: familiarId,
          action: "escapeGrapple" as const,
        },
        expectedIssue: null,
      },
      {
        subject: {
          tag: "action" as const,
          actorId: familiarId,
          action: "dash" as const,
          speedKind: "walk" as const,
        },
        expectedIssue: null,
      },
      {
        subject: {
          tag: "action" as const,
          actorId: familiarId,
          action: "shakeAwakeFromStagedCondition" as const,
        },
        expectedIssue: null,
      },
      {
        subject: {
          tag: "unitFeature" as const,
          actorId: familiarId,
          procedureRef: biteAttack.procedureRef,
        },
        expectedIssue: null,
      },
      {
        subject: {
          tag: "bonusActionSpell" as const,
          actorId: familiarId,
          procedureRef: biteAttack.procedureRef,
          mode: { tag: "cast" as const },
        },
        expectedIssue: null,
      },
      {
        subject: {
          tag: "druidWildShape" as const,
          actorId: familiarId,
          procedureRef: biteAttack.procedureRef,
          action: "dismiss" as const,
        },
        expectedIssue: null,
      },
      {
        subject: {
          tag: "actionSpell" as const,
          actorId: familiarId,
          procedureRef: biteAttack.procedureRef,
          mode: { tag: "cast" as const },
        },
        expectedIssue: null,
      },
      {
        subject: {
          tag: "monkFocusOption" as const,
          actorId: familiarId,
          procedureRef: biteAttack.procedureRef,
          option: "flurryOfBlows" as const,
        },
        expectedIssue: null,
      },
      {
        subject: {
          tag: "unitFeatureHeldWeaponActivation" as const,
          actorId: familiarId,
          procedureRef: biteAttack.procedureRef,
          weaponItemId: battleObjectId("familiar-held-weapon"),
        },
        expectedIssue: null,
      },
    ] as const satisfies ReadonlyArray<{
      readonly subject: BattleSubject;
      readonly expectedIssue: string | null;
    }>;

    for (const { subject, expectedIssue } of subjects) {
      expect(battleSubjectActionEligibilityIssue(state, subject)).toBe(
        expectedIssue,
      );
    }
    const unitFeature = subjects.find(
      ({ subject }) => subject.tag === "unitFeature",
    )?.subject;
    if (unitFeature?.tag !== "unitFeature") {
      throw new Error("Expected the familiar unit-feature subject.");
    }
    expect(battleSubjectBeginsBonusAction(state, unitFeature)).toBe(false);

    const familiarState = state.combatants.get(familiarId);
    if (familiarState === undefined) {
      throw new Error("Expected the familiar fixture.");
    }
    const incapacitatedState = {
      ...state,
      combatants: new Map(state.combatants).set(
        familiarId,
        testBattleCreatureStateWithConditions(
          familiarState,
          applyCondition(familiarState.conditions, "incapacitated"),
        ),
      ),
    };
    expect(
      battleSubjectActionEligibilityIssue(incapacitatedState, biteAttack),
    ).toBe("The selected action is no longer available for the current actor.");
  });

  test("reports each exhausted resource family at its canonical action boundary", () => {
    const state = eligibilityBattle();
    const withoutResources = {
      ...state,
      currentTurnResources: {
        ...state.currentTurnResources,
        actionResources: [],
        currentHasBonusAction: false,
      },
    };
    const procedureRef = battleProcedureExecutionRef(
      battleCharacterExecutionScopeRef(
        battleId("battle-action-eligibility-resources"),
        fighterId,
        battleExecutionScopeOrdinal(0),
      ),
      NonNegativeInteger(0),
    );
    const attackProcedureRef = battleAttackProcedureExecutionRef(
      battleAttackExecutionScopeRef(
        battleId("battle-action-eligibility-resources"),
        fighterId,
        battleExecutionScopeOrdinal(1),
      ),
      NonNegativeInteger(0),
    );
    const subjects = [
      {
        tag: "bonusAction",
        actorId: fighterId,
        action: "offHandAttack",
        procedureRef: attackProcedureRef,
        attackAbility: "str",
        attackDamageType: "slashing",
      },
      {
        tag: "bonusActionSpell",
        actorId: fighterId,
        procedureRef,
        mode: { tag: "cast" },
      },
      {
        tag: "druidWildShape",
        actorId: fighterId,
        procedureRef,
        action: "dismiss",
      },
      {
        tag: "actionSpell",
        actorId: fighterId,
        procedureRef,
        mode: { tag: "cast" },
      },
      {
        tag: "unitFeatureHeldWeaponActivation",
        actorId: fighterId,
        procedureRef,
        weaponItemId: battleObjectId("exhausted-held-weapon"),
      },
      { tag: "action", actorId: fighterId, action: "grapple" },
      { tag: "action", actorId: fighterId, action: "escapeGrapple" },
    ] as const satisfies ReadonlyArray<BattleSubject>;
    expect(
      subjects.map((subject) =>
        battleSubjectActionEligibilityIssue(withoutResources, subject),
      ),
    ).toEqual([
      "Bonus Action is no longer available for the current actor.",
      "Bonus Action spell is no longer available for the current actor.",
      "Druid Wild Shape Bonus Action is no longer available.",
      "Magic action is no longer available for the current actor.",
      "Attack action feature is no longer available for the current actor.",
      "The selected action is no longer available for the current actor.",
      "The selected action is no longer available for the current actor.",
    ]);
  });

  test("uses the action-specific diagnostics when an actor is incapacitated", () => {
    const state = eligibilityBattle();
    const fighter = state.combatants.get(fighterId);
    if (fighter === undefined) {
      throw new Error("Expected the fighter fixture.");
    }
    const incapacitated = {
      ...state,
      combatants: new Map(state.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          fighter,
          applyCondition(fighter.conditions, "incapacitated"),
        ),
      ),
    };
    const procedureRef = battleProcedureExecutionRef(
      battleCharacterExecutionScopeRef(
        battleId("battle-action-eligibility-incapacitated"),
        fighterId,
        battleExecutionScopeOrdinal(0),
      ),
      NonNegativeInteger(0),
    );
    const attackProcedureRef = battleAttackProcedureExecutionRef(
      battleAttackExecutionScopeRef(
        battleId("battle-action-eligibility-incapacitated"),
        fighterId,
        battleExecutionScopeOrdinal(1),
      ),
      NonNegativeInteger(0),
    );
    const cases = [
      {
        subject: {
          tag: "bonusAction",
          actorId: fighterId,
          action: "offHandAttack",
          procedureRef: attackProcedureRef,
          attackAbility: "str",
          attackDamageType: "slashing",
        },
        expected: "Bonus Action is no longer available for the current actor.",
      },
      {
        subject: {
          tag: "bonusActionSpell",
          actorId: fighterId,
          procedureRef,
          mode: { tag: "cast" },
        },
        expected:
          "Bonus Action spell is no longer available for the current actor.",
      },
      {
        subject: {
          tag: "unitFeatureHeldWeaponActivation",
          actorId: fighterId,
          procedureRef,
          weaponItemId: battleObjectId("synthetic-held-weapon"),
        },
        expected:
          "Attack action feature is no longer available for the current actor.",
      },
      {
        subject: {
          tag: "druidWildShape",
          actorId: fighterId,
          procedureRef,
          action: "dismiss",
        },
        expected: "Druid Wild Shape Bonus Action is no longer available.",
      },
      {
        subject: {
          tag: "action",
          actorId: fighterId,
          action: "escapeGrapple",
        },
        expected:
          "The selected action is no longer available for the current actor.",
      },
      {
        subject: {
          tag: "actionSpell",
          actorId: fighterId,
          procedureRef,
          mode: { tag: "cast" },
        },
        expected: "Magic action is no longer available for the current actor.",
      },
    ] as const satisfies ReadonlyArray<{
      readonly subject: BattleSubject;
      readonly expected: string;
    }>;

    for (const { subject, expected } of cases) {
      expect(battleSubjectActionEligibilityIssue(incapacitated, subject)).toBe(
        expected,
      );
    }
  });
});
