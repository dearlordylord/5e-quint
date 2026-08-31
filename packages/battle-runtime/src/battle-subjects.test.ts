import {
  battleEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  singleBaseStatBlockAttackDamageSelectionForTest,
} from "./battle-runtime.test-support.ts";
import { Schema } from "effect";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { movementFeet, NonNegativeInteger } from "@dnd/shared/types";
import {
  battleObjectId,
  combatantId,
  sameBattleSubject,
  BattleSubjectSchema,
  type BattleSubject,
  type BattleSubjectAction,
  type BattleRuntimeCommand,
} from "./index.ts";
import {
  BATTLE_SUBJECT_ACTIONS,
  BATTLE_RUNTIME_COMMANDS,
  battleSubjectBoundExecutionReferences,
  battleSubjectProcedureRefs,
  battleSubjectProcedureRefsBelongToOwners,
} from "./battle-subjects.ts";
import {
  SUBTLE_METAMAGIC_EFFECT_KIND,
  TRANSMUTED_METAMAGIC_EFFECT_KIND,
} from "./battle-reducer/metamagic-support.ts";
import {
  battleAttackExecutionScopeRef,
  battleAttackProcedureExecutionRef,
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battleProcedureExecutionRef,
  battleProcedureExecutionRefBelongsToCombatant,
  battleStatBlockExecutionScopeRef,
  battleStatBlockProcedureExecutionRef,
} from "./identity.ts";

const decodeBattleSubject = Schema.decodeUnknownSync(BattleSubjectSchema);
const encodeBattleSubject = Schema.encodeSync(BattleSubjectSchema);

function expectStableBattleSubjectRoundtrip(candidate: unknown): void {
  const subject = decodeBattleSubject(candidate);
  const roundtripped = decodeBattleSubject(encodeBattleSubject(subject));

  expect(roundtripped).toEqual(subject);
  expect(sameBattleSubject(subject, roundtripped)).toBe(true);
  expect(battleSubjectProcedureRefs(roundtripped)).toEqual(
    battleSubjectProcedureRefs(subject),
  );
  expect(battleSubjectBoundExecutionReferences(roundtripped)).toEqual(
    battleSubjectBoundExecutionReferences(subject),
  );
  expect(battleSubjectProcedureRefsBelongToOwners(subject)).toBe(true);
  expect(battleSubjectProcedureRefsBelongToOwners(roundtripped)).toBe(true);
}

describe("BattleSubject identity", () => {
  test("checks ownership for each canonical procedure scope family", () => {
    const ownerBattleId = battleId("procedure-scope-ownership-battle");
    const ownerId = combatantId("procedure-scope-owner");
    const wrongOwnerId = combatantId("procedure-scope-other-owner");
    const scopes = [
      battleCharacterExecutionScopeRef(
        ownerBattleId,
        ownerId,
        battleExecutionScopeOrdinal(0),
      ),
      battleStatBlockExecutionScopeRef(
        ownerBattleId,
        ownerId,
        battleExecutionScopeOrdinal(0),
      ),
    ] as const;

    for (const scopeRef of scopes) {
      const procedureRef = battleProcedureExecutionRef(
        scopeRef,
        NonNegativeInteger(0),
      );
      expect(
        battleProcedureExecutionRefBelongsToCombatant(procedureRef, ownerId),
      ).toBe(true);
      expect(
        battleProcedureExecutionRefBelongsToCombatant(
          procedureRef,
          wrongOwnerId,
        ),
      ).toBe(false);
    }
  });

  test("every runtime command roundtrips with stable execution-reference projections", () => {
    const actorId = combatantId("runtime-command-actor");
    const targetId = combatantId("runtime-command-target");
    const targetProcedureRef = battleProcedureExecutionRef(
      battleCharacterExecutionScopeRef(
        battleId("runtime-command-battle"),
        targetId,
        battleExecutionScopeOrdinal(1),
      ),
      NonNegativeInteger(0),
    );
    const targetAttackProcedureRef = battleAttackProcedureExecutionRef(
      battleAttackExecutionScopeRef(
        battleId("runtime-command-battle"),
        targetId,
        battleExecutionScopeOrdinal(2),
      ),
      NonNegativeInteger(0),
    );
    const effectRef = battleEffectExecutionRefForTest("runtime-command-effect");
    const areaId = "runtime-command-area";
    const runtimeCommandExtras = {
      endTurn: {},
      endConcentration: {},
      move: {},
      standFromProne: {},
      releaseReadiedSpell: {
        readiedSpellCasterId: targetId,
        procedureRef: targetProcedureRef,
      },
      releaseReadiedMovement: { readiedMovementActorId: targetId },
      reportReadyTrigger: { readiedActorId: targetId },
      releaseReadiedAction: { reactorId: targetId },
      releaseReadiedAttack: {
        reactorId: targetId,
        targetId: actorId,
        procedureRef: targetAttackProcedureRef,
      },
      castTriggeredReactionSpell: {
        reactorId: targetId,
        procedureRef: targetProcedureRef,
      },
      castAttackHitBonusActionSpell: {
        casterId: targetId,
        procedureRef: targetProcedureRef,
      },
      releaseGrapple: { targetId },
      opportunityAttack: {
        reactorId: targetId,
        targetId: actorId,
        distanceFeet: movementFeet(5),
        procedureRef: targetAttackProcedureRef,
        attackAbility: "str",
        attackDamageType: "slashing",
      },
      retaliationAttack: {
        reactorId: targetId,
        targetId: actorId,
        procedureRef: targetAttackProcedureRef,
        attackAbility: "str",
        attackDamageType: "slashing",
      },
      persistentAreaSaveConditionSave: {
        areaId,
        effectRef,
        trigger: "entersArea",
      },
      persistentAreaSaveConditionEscapeSave: {
        areaId,
        effectRef,
        trigger: "startsTurnInArea",
      },
      persistentAreaSaveCompositeSave: {
        areaMembershipTrigger: { kind: "turnStartInArea", areaId, effectRef },
      },
      persistentAreaSaveDamageSave: {
        areaMembershipTrigger: {
          kind: "areaMovesIntoSpace",
          areaId,
          effectRef,
        },
      },
      endPersistentAreaSaveDamageForEnvironment: {
        effectOwnerId: actorId,
        effectRef,
      },
      endPersistentAreaSaveConditionEscapeForDeparture: {
        areaId,
        effectRef,
      },
      endPersistentAreaSaveConditionEscapeForAreaRemoval: {
        areaId,
        effectRef,
      },
      directionalPersistentAreaSave: {
        areaId,
        effectRef,
        directionId: "runtime-command-direction",
        trigger: "endsTurnInLine",
      },
      directionalPersistentAreaDirectionChange: {
        areaId,
        effectRef,
        directionId: "runtime-command-direction",
      },
      movableZoneSave: { areaId, effectRef, trigger: "entersArea" },
      persistentAreaSaveDamageExit: { areaId, effectRef },
      movableZoneReposition: { areaId, effectRef },
      movableZoneRam: {
        targetId,
        areaId,
        effectRef,
        trigger: "rammedBySphere",
      },
      releaseSpellCreatedHeldObject: { effectRef },
      protectionRelevantEffectSave: { effectRef, relevantEffect: "charmed" },
      creatureTypeProtectionConditionAttempt: {
        sourceCombatantId: targetId,
        condition: "frightened",
      },
      creatureTypeProtectionPossessionAttempt: {
        sourceCombatantId: targetId,
      },
      endPersistentAreaTraitForEnvironment: { areaId },
      linkedDefenseResistanceDamageShareSeparation: { effectRef, targetId },
      fixedCostMovementReplacement: { effectRef },
      grantedAreaSaveDamageAction: { effectRef },
      replaceSelfTransformationMode: {
        effectRef,
        mode: "naturalWeapons",
        naturalWeaponDamageType: "fire",
      },
      executeCompelledGrovel: { effectRef },
      executeCompelledDrop: { effectRef },
      executeCompelledApproach: { effectRef },
      executeCompelledFlee: { effectRef },
      controlledVerticalSuspensionAltitudeControl: { effectRef, targetId },
      creatureFalls: { fallingCreatureId: targetId },
    } as const satisfies Record<
      BattleRuntimeCommand,
      Readonly<Record<string, unknown>>
    >;
    const everyCommandInRandomOrder = fc.shuffledSubarray(
      [...BATTLE_RUNTIME_COMMANDS],
      {
        minLength: BATTLE_RUNTIME_COMMANDS.length,
        maxLength: BATTLE_RUNTIME_COMMANDS.length,
      },
    );

    fc.assert(
      fc.property(everyCommandInRandomOrder, (commands) => {
        for (const command of commands) {
          const subject = {
            tag: "runtimeCommand",
            actorId,
            command,
            ...runtimeCommandExtras[command],
          };
          expectStableBattleSubjectRoundtrip(subject);
        }
      }),
      { numRuns: 20 },
    );
  });

  test("every action roundtrips with stable execution-reference projections", () => {
    const actorId = combatantId("action-subject-actor");
    const targetId = combatantId("action-subject-target");
    const battle = battleId("action-subject-battle");
    const attackProcedureRef = battleAttackProcedureExecutionRef(
      battleAttackExecutionScopeRef(
        battle,
        actorId,
        battleExecutionScopeOrdinal(0),
      ),
      NonNegativeInteger(0),
    );
    const statBlockProcedureRef = battleStatBlockProcedureExecutionRef(
      battleStatBlockExecutionScopeRef(
        battle,
        actorId,
        battleExecutionScopeOrdinal(1),
      ),
      NonNegativeInteger(0),
    );
    const effectRef = battleEffectExecutionRefForTest("action-subject-effect");
    const actionExtras = {
      attack: {
        procedureRef: attackProcedureRef,
        attackAbility: "dex",
        attackDamageType: "piercing",
      },
      dash: { speedKind: "walk" },
      disengage: {},
      dodge: {},
      helpAttack: {},
      hide: {},
      multiattack: { procedureRef: statBlockProcedureRef },
      ready: {},
      search: {},
      grapple: {},
      shove: {},
      escapeGrapple: {},
      escapeSpellRestraint: { targetId, effectRef },
      shakeAwakeFromStagedCondition: {},
      shakeAwakeFromAreaControl: {},
    } as const satisfies Record<
      BattleSubjectAction,
      Readonly<Record<string, unknown>>
    >;
    const everyActionInRandomOrder = fc.shuffledSubarray(
      [...BATTLE_SUBJECT_ACTIONS],
      {
        minLength: BATTLE_SUBJECT_ACTIONS.length,
        maxLength: BATTLE_SUBJECT_ACTIONS.length,
      },
    );

    fc.assert(
      fc.property(everyActionInRandomOrder, (actions) => {
        for (const action of actions) {
          const subject = {
            tag: "action",
            actorId,
            action,
            ...actionExtras[action],
          };
          expectStableBattleSubjectRoundtrip(subject);
        }
      }),
      { numRuns: 20 },
    );
  });

  test("non-standard-action subjects roundtrip with distinct stable identities", () => {
    const actorId = combatantId("reference-bearing-subject-actor");
    const companionId = combatantId("reference-bearing-subject-companion");
    const battle = battleId("reference-bearing-subject-battle");
    const procedureRef = battleProcedureExecutionRef(
      battleCharacterExecutionScopeRef(
        battle,
        actorId,
        battleExecutionScopeOrdinal(0),
      ),
      NonNegativeInteger(0),
    );
    const statBlockProcedureRef = battleStatBlockProcedureExecutionRef(
      battleStatBlockExecutionScopeRef(
        battle,
        companionId,
        battleExecutionScopeOrdinal(1),
      ),
      NonNegativeInteger(0),
    );
    const actorStatBlockProcedureRef = battleStatBlockProcedureExecutionRef(
      battleStatBlockExecutionScopeRef(
        battle,
        actorId,
        battleExecutionScopeOrdinal(4),
      ),
      NonNegativeInteger(0),
    );
    const attackProcedureRef = battleAttackProcedureExecutionRef(
      battleAttackExecutionScopeRef(
        battle,
        actorId,
        battleExecutionScopeOrdinal(2),
      ),
      NonNegativeInteger(0),
    );
    const formExecutionRef = battleStatBlockExecutionScopeRef(
      battle,
      actorId,
      battleExecutionScopeOrdinal(3),
    );
    const effectRef = battleEffectExecutionRefForTest(
      "reference-bearing-subject-effect",
    );
    const candidates = [
      {
        name: "pact familiar attack with rolled damage",
        subject: {
          tag: "companionAttack",
          actorId,
          familiarId: companionId,
          procedureRef: statBlockProcedureRef,
          statBlockDamageSelection:
            singleBaseStatBlockAttackDamageSelectionForTest("rolled"),
        },
      },
      {
        name: "pact familiar attack with static damage",
        subject: {
          tag: "companionAttack",
          actorId,
          familiarId: companionId,
          procedureRef: statBlockProcedureRef,
          statBlockDamageSelection:
            singleBaseStatBlockAttackDamageSelectionForTest("static"),
        },
      },
      {
        name: "off-hand attack",
        subject: {
          tag: "bonusAction",
          actorId,
          action: "offHandAttack",
          procedureRef: attackProcedureRef,
          attackAbility: "str",
          attackDamageType: "slashing",
        },
      },
      {
        name: "martial arts unarmed strike",
        subject: {
          tag: "bonusAction",
          actorId,
          action: "martialArtsUnarmedStrike",
          procedureRef: attackProcedureRef,
          attackAbility: "dex",
          attackDamageType: "bludgeoning",
        },
      },
      {
        name: "stat block dodge",
        subject: {
          tag: "bonusAction",
          actorId,
          action: "statBlockActionOption",
          procedureRef: actorStatBlockProcedureRef,
          standardAction: "dodge",
        },
      },
      {
        name: "stat block attack with static damage",
        subject: {
          tag: "action",
          actorId,
          action: "attack",
          procedureRef: actorStatBlockProcedureRef,
          statBlockDamageSelection:
            singleBaseStatBlockAttackDamageSelectionForTest("static"),
        },
      },
      {
        name: "effect-backed bonus action dash",
        subject: {
          tag: "bonusActionStandardAction",
          actorId,
          procedureRef,
          sourceEffectRef: effectRef,
          action: "dash",
          speedKind: "walk",
        },
      },
      {
        name: "effect-backed bonus action disengage",
        subject: {
          tag: "bonusActionStandardAction",
          actorId,
          procedureRef,
          action: "disengage",
        },
      },
      {
        name: "focused patient defense",
        subject: {
          tag: "monkFocusOption",
          actorId,
          procedureRef,
          option: "patientDefense",
          mode: "focusDisengageDodge",
        },
      },
      {
        name: "focused flurry of blows",
        subject: {
          tag: "monkFocusOption",
          actorId,
          procedureRef,
          option: "flurryOfBlows",
        },
      },
      {
        name: "focused step of the wind",
        subject: {
          tag: "monkFocusOption",
          actorId,
          procedureRef,
          option: "stepOfTheWind",
          mode: "focusDisengageDash",
          speedKind: "fly",
        },
      },
      {
        name: "focused flurry strike",
        subject: {
          tag: "monkFocusFlurryOfBlowsStrike",
          actorId,
          focusProcedureRef: procedureRef,
          procedureRef: attackProcedureRef,
        },
      },
      {
        name: "action spell cast",
        subject: {
          tag: "actionSpell",
          actorId,
          procedureRef,
          mode: { tag: "cast" },
        },
      },
      {
        name: "action spell ready with metamagic",
        subject: {
          tag: "actionSpell",
          actorId,
          procedureRef,
          mode: { tag: "ready", trigger: "attackHit" },
          metamagic: [
            {
              effectKind: TRANSMUTED_METAMAGIC_EFFECT_KIND,
              targetDamageType: "cold",
            },
            { effectKind: SUBTLE_METAMAGIC_EFFECT_KIND },
          ],
        },
      },
      {
        name: "bonus action spell cast",
        subject: {
          tag: "bonusActionSpell",
          actorId,
          procedureRef,
          mode: { tag: "cast" },
        },
      },
      {
        name: "bonus action dash spell cast",
        subject: {
          tag: "bonusActionDashSpell",
          actorId,
          procedureRef,
          mode: { tag: "cast" },
          speedKind: "walk",
        },
      },
      {
        name: "unit feature",
        subject: { tag: "unitFeature", actorId, procedureRef },
      },
      {
        name: "unit feature held weapon activation",
        subject: {
          tag: "unitFeatureHeldWeaponActivation",
          actorId,
          procedureRef,
          weaponItemId: battleObjectId("reference-bearing-subject-weapon"),
        },
      },
      {
        name: "wild shape assume form",
        subject: {
          tag: "druidWildShape",
          actorId,
          procedureRef,
          action: "assumeForm",
          formExecutionRef,
        },
      },
      {
        name: "wild shape dismiss",
        subject: {
          tag: "druidWildShape",
          actorId,
          procedureRef,
          action: "dismiss",
        },
      },
      {
        name: "temporarily dismiss companion",
        subject: {
          tag: "companionLifecycle",
          actorId,
          action: "temporarilyDismiss",
        },
      },
      {
        name: "reappear companion",
        subject: {
          tag: "companionLifecycle",
          actorId,
          action: "reappear",
        },
      },
      {
        name: "permanently dismiss companion",
        subject: {
          tag: "companionLifecycle",
          actorId,
          action: "permanentlyDismiss",
        },
      },
      {
        name: "share familiar senses",
        subject: {
          tag: "spawnedCompanionSharedSenses",
          actorId,
          familiarId: companionId,
        },
      },
      {
        name: "familiar touch action spell",
        subject: {
          tag: "spawnedCompanionTouchSpellProxy",
          actorId,
          procedureRef,
          companionId,
          spellAction: "action",
          mode: { tag: "cast" },
        },
      },
      {
        name: "familiar touch bonus-action spell with metamagic",
        subject: {
          tag: "spawnedCompanionTouchSpellProxy",
          actorId,
          procedureRef,
          companionId,
          spellAction: "bonusAction",
          mode: { tag: "cast" },
          metamagic: [{ effectKind: SUBTLE_METAMAGIC_EFFECT_KIND }],
        },
      },
    ] as const satisfies ReadonlyArray<{
      readonly name: string;
      readonly subject: BattleSubject;
    }>;

    for (const candidate of candidates) {
      expectStableBattleSubjectRoundtrip(candidate.subject);
      expect(
        battleSubjectProcedureRefsBelongToOwners(candidate.subject),
        candidate.name,
      ).toBe(true);

      for (const distinctCandidate of candidates) {
        if (distinctCandidate.name === candidate.name) continue;
        expect(
          sameBattleSubject(candidate.subject, distinctCandidate.subject),
          `${candidate.name} vs ${distinctCandidate.name}`,
        ).toBe(false);
      }
    }
  });

  test("attack ability projections of one bound procedure remain distinct", () => {
    const actorId = combatantId("ability-choice-attacker");
    const procedureRef = battleAttackProcedureExecutionRef(
      battleAttackExecutionScopeRef(
        battleId("ability-choice-battle"),
        actorId,
        battleExecutionScopeOrdinal(0),
      ),
      NonNegativeInteger(0),
    );
    const strengthAttack = {
      tag: "action",
      actorId,
      action: "attack",
      procedureRef,
      attackAbility: "str",
      attackDamageType: "slashing",
    } satisfies BattleSubject;
    const dexterityAttack = {
      ...strengthAttack,
      attackAbility: "dex",
    } satisfies BattleSubject;
    const necroticAttack = {
      ...strengthAttack,
      attackDamageType: "necrotic",
    } satisfies BattleSubject;
    const radiantAttack = {
      ...strengthAttack,
      attackDamageType: "radiant",
    } satisfies BattleSubject;

    expect(sameBattleSubject(strengthAttack, dexterityAttack)).toBe(false);
    expect(sameBattleSubject(necroticAttack, radiantAttack)).toBe(false);
  });

  test("creature-type protection condition attempts include condition identity", () => {
    const charmedAttempt = {
      tag: "runtimeCommand",
      actorId: combatantId("protected-target"),
      command: "creatureTypeProtectionConditionAttempt",
      sourceCombatantId: combatantId("scoped-source"),
      condition: "charmed",
    } satisfies BattleSubject;
    const frightenedAttempt = {
      ...charmedAttempt,
      condition: "frightened",
    } satisfies BattleSubject;

    expect(sameBattleSubject(charmedAttempt, frightenedAttempt)).toBe(false);
  });

  test("admitted character procedures include their execution ref in subject identity", () => {
    const actorId = combatantId("procedure-subject-owner");
    const scopeRef = battleCharacterExecutionScopeRef(
      battleId("procedure-subject-battle"),
      actorId,
      battleExecutionScopeOrdinal(0),
    );
    const subject = {
      tag: "monkFocusOption",
      actorId,
      procedureRef: battleProcedureExecutionRef(
        scopeRef,
        NonNegativeInteger(0),
      ),
      option: "flurryOfBlows",
    } satisfies BattleSubject;
    const otherOccurrence = {
      ...subject,
      procedureRef: battleProcedureExecutionRef(
        scopeRef,
        NonNegativeInteger(1),
      ),
    } satisfies BattleSubject;

    expect(sameBattleSubject(subject, otherOccurrence)).toBe(false);
    expect(sameBattleSubject(subject, subject)).toBe(true);

    const wrongOwnerSubject = {
      ...subject,
      procedureRef: battleProcedureExecutionRef(
        battleCharacterExecutionScopeRef(
          battleId("procedure-subject-battle"),
          combatantId("procedure-subject-wrong-owner"),
          battleExecutionScopeOrdinal(0),
        ),
        NonNegativeInteger(0),
      ),
    } satisfies BattleSubject;
    const ownerCases = [
      { subject, expected: true },
      { subject: wrongOwnerSubject, expected: false },
    ] as const;
    for (const { subject: candidate, expected } of ownerCases) {
      expect(battleSubjectProcedureRefsBelongToOwners(candidate)).toBe(
        expected,
      );
    }
  });

  test("rejects authored character-procedure selectors after binding", () => {
    const actorId = combatantId("procedure-subject-owner");
    const procedureRef = battleProcedureExecutionRef(
      battleCharacterExecutionScopeRef(
        battleId("procedure-subject-battle"),
        actorId,
        battleExecutionScopeOrdinal(0),
      ),
      NonNegativeInteger(0),
    );
    const decode = Schema.decodeUnknownSync(BattleSubjectSchema);
    const authoredSelectors = [
      {
        tag: "unitFeature",
        actorId,
        procedureRef,
        unitId: "synthetic-feature",
      },
      {
        tag: "bonusActionStandardAction",
        actorId,
        procedureRef,
        sourceUnitId: "synthetic-feature",
        action: "disengage",
      },
      {
        tag: "monkFocusOption",
        actorId,
        procedureRef,
        resourceUnitId: "synthetic-focus-resource",
        option: "flurryOfBlows",
      },
      {
        tag: "actionSpell",
        actorId,
        procedureRef,
        invocation: {
          tag: "cantrip",
          spellId: "synthetic-spell",
          procedure: "spellAttackDamage",
        },
        mode: { tag: "cast" },
      },
      {
        tag: "runtimeCommand",
        actorId,
        command: "persistentAreaSaveConditionSave",
        areaId: "synthetic-area",
        effectRef: battleEffectExecutionRefForTest("synthetic-area-effect"),
        trigger: "entersArea",
        sourceCombatantId: actorId,
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String("synthetic-spell"),
        ),
      },
      {
        tag: "runtimeCommand",
        actorId,
        command: "executeCompelledGrovel",
        sourceCombatantId: actorId,
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String("synthetic-spell"),
        ),
      },
      {
        tag: "druidWildShape",
        actorId,
        procedureRef,
        action: "assumeForm",
        formExecutionRef: battleStatBlockExecutionScopeRef(
          battleId("procedure-subject-battle"),
          actorId,
          battleExecutionScopeOrdinal(1),
        ),
        formStatBlockId: "synthetic-form",
      },
    ];

    for (const subject of authoredSelectors) {
      expect(() => decode(subject)).toThrow();
    }
  });
});
