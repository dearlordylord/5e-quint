import {
  battleEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
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
}

describe("BattleSubject identity", () => {
  test("every runtime command roundtrips with stable execution-reference projections", () => {
    const actorId = combatantId("runtime-command-actor");
    const targetId = combatantId("runtime-command-target");
    const procedureRef = battleProcedureExecutionRefForTest(
      "runtime-command-procedure",
    );
    const attackProcedureRef = battleAttackProcedureExecutionRef(
      battleAttackExecutionScopeRef(
        battleId("runtime-command-battle"),
        actorId,
        battleExecutionScopeOrdinal(0),
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
      releaseReadiedSpell: { readiedSpellCasterId: targetId, procedureRef },
      releaseReadiedMovement: { readiedMovementActorId: targetId },
      reportReadyTrigger: { readiedActorId: targetId },
      releaseReadiedAction: { reactorId: targetId },
      releaseReadiedAttack: {
        reactorId: targetId,
        targetId: actorId,
        procedureRef: attackProcedureRef,
      },
      castTriggeredReactionSpell: { reactorId: targetId, procedureRef },
      castAttackHitBonusActionSpell: { casterId: targetId, procedureRef },
      releaseGrapple: { targetId },
      opportunityAttack: {
        reactorId: targetId,
        targetId: actorId,
        distanceFeet: movementFeet(5),
        procedureRef: attackProcedureRef,
        attackAbility: "str",
        attackDamageType: "slashing",
      },
      retaliationAttack: {
        reactorId: targetId,
        targetId: actorId,
        procedureRef: attackProcedureRef,
        attackAbility: "str",
        attackDamageType: "slashing",
      },
      greaseGroundHazardSave: { areaId, effectRef, trigger: "entersArea" },
      webRestraintSave: { areaId, effectRef, trigger: "startsTurnInArea" },
      sleetStormAreaHazardSave: {
        areaMembershipTrigger: { kind: "turnStartInArea", areaId, effectRef },
      },
      insectPlagueAreaHazardSave: {
        areaMembershipTrigger: { kind: "turnEndInArea", areaId, effectRef },
      },
      cloudkillAreaHazardSave: {
        areaMembershipTrigger: {
          kind: "areaMovesIntoSpace",
          areaId,
          effectRef,
        },
      },
      disperseCloudkill: { effectOwnerId: actorId, effectRef },
      webRestrainedNoLongerInArea: { areaId, effectRef },
      webAreaRemoved: { areaId, effectRef },
      gustOfWindLineSave: {
        areaId,
        effectRef,
        directionId: "runtime-command-direction",
        trigger: "endsTurnInLine",
      },
      gustOfWindLineDirectionChange: {
        areaId,
        effectRef,
        directionId: "runtime-command-direction",
      },
      movableZoneSave: { areaId, effectRef, trigger: "entersArea" },
      moonbeamCylinderExit: { areaId, effectRef },
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
      disperseFogCloud: { areaId },
      linkedDefenseResistanceDamageShareSeparation: { effectRef, targetId },
      jumpMovementReplacement: { effectRef },
      dragonsBreathExhale: { effectRef },
      replaceSelfTransformationMode: {
        effectRef,
        mode: "naturalWeapons",
        naturalWeaponDamageType: "fire",
      },
      commandGrovel: { effectRef },
      commandDrop: { effectRef },
      commandApproach: { effectRef },
      commandFlee: { effectRef },
      levitateAltitudeControl: { effectRef, targetId },
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
          expectStableBattleSubjectRoundtrip({
            tag: "runtimeCommand",
            actorId,
            command,
            ...runtimeCommandExtras[command],
          });
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
      shakeAwakeFromSleep: {},
      shakeAwakeFromHypnoticPattern: {},
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
          expectStableBattleSubjectRoundtrip({
            tag: "action",
            actorId,
            action,
            ...actionExtras[action],
          });
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
        tag: "companionAttack",
        actorId,
        familiarId: companionId,
        procedureRef: statBlockProcedureRef,
      },
      {
        tag: "companionAttack",
        actorId,
        familiarId: companionId,
        procedureRef: statBlockProcedureRef,
        statBlockDamageNotation: "static",
      },
      {
        tag: "bonusAction",
        actorId,
        action: "offHandAttack",
        procedureRef: attackProcedureRef,
        attackAbility: "str",
        attackDamageType: "slashing",
      },
      {
        tag: "bonusAction",
        actorId,
        action: "martialArtsUnarmedStrike",
        procedureRef: attackProcedureRef,
        attackAbility: "dex",
        attackDamageType: "bludgeoning",
      },
      {
        tag: "bonusAction",
        actorId,
        action: "statBlockActionOption",
        procedureRef: statBlockProcedureRef,
        standardAction: "dodge",
      },
      {
        tag: "bonusActionStandardAction",
        actorId,
        procedureRef,
        sourceEffectRef: effectRef,
        action: "dash",
        speedKind: "walk",
      },
      {
        tag: "monkFocusOption",
        actorId,
        procedureRef,
        option: "patientDefense",
        mode: "focusDisengageDodge",
      },
      {
        tag: "monkFocusOption",
        actorId,
        procedureRef,
        option: "flurryOfBlows",
      },
      {
        tag: "monkFocusOption",
        actorId,
        procedureRef,
        option: "stepOfTheWind",
        mode: "focusDisengageDash",
        speedKind: "fly",
      },
      {
        tag: "monkFocusFlurryOfBlowsStrike",
        actorId,
        focusProcedureRef: procedureRef,
        procedureRef: attackProcedureRef,
      },
      {
        tag: "actionSpell",
        actorId,
        procedureRef,
        mode: { tag: "cast" },
      },
      {
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
      {
        tag: "bonusActionSpell",
        actorId,
        procedureRef,
        mode: { tag: "cast" },
      },
      {
        tag: "bonusActionDashSpell",
        actorId,
        procedureRef,
        mode: { tag: "cast" },
        speedKind: "walk",
      },
      { tag: "unitFeature", actorId, procedureRef },
      {
        tag: "unitFeatureHeldWeaponActivation",
        actorId,
        procedureRef,
        weaponItemId: battleObjectId("reference-bearing-subject-weapon"),
      },
      {
        tag: "druidWildShape",
        actorId,
        procedureRef,
        action: "assumeForm",
        formExecutionRef,
      },
      {
        tag: "druidWildShape",
        actorId,
        procedureRef,
        action: "dismiss",
      },
      {
        tag: "companionLifecycle",
        actorId,
        action: "temporarilyDismiss",
      },
      {
        tag: "companionLifecycle",
        actorId,
        action: "reappear",
      },
      {
        tag: "companionLifecycle",
        actorId,
        action: "permanentlyDismiss",
      },
      {
        tag: "spawnedCompanionSharedSenses",
        actorId,
        familiarId: companionId,
      },
      {
        tag: "spawnedCompanionTouchSpellProxy",
        actorId,
        procedureRef,
        companionId,
        spellAction: "action",
        mode: { tag: "cast" },
      },
      {
        tag: "spawnedCompanionTouchSpellProxy",
        actorId,
        procedureRef,
        companionId,
        spellAction: "bonusAction",
        mode: { tag: "cast" },
        metamagic: [{ effectKind: SUBTLE_METAMAGIC_EFFECT_KIND }],
      },
    ] as const satisfies ReadonlyArray<BattleSubject>;

    for (const [candidateIndex, candidate] of candidates.entries()) {
      expectStableBattleSubjectRoundtrip(candidate);

      for (const distinctCandidate of candidates.slice(candidateIndex + 1)) {
        expect(sameBattleSubject(candidate, distinctCandidate)).toBe(false);
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
    expect(sameBattleSubject(subject, otherOccurrence)).toBe(false);
    expect(sameBattleSubject(subject, subject)).toBe(true);
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
        command: "greaseGroundHazardSave",
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
        command: "commandGrovel",
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
