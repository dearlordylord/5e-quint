// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.potent-cantrip
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3PUTB-05 wizard_potent_cantrip
// UNIT-IDENTITY-MBT-REPLAY: L3PUTB-05 wizard_potent_cantrip doAttackMissHalfDamage doAttackMissNoAdditionalEffect doAttackMissNoLightEmitter doSaveSuccessHalfDamage doSaveSuccessNoAdditionalEffect doRejectObjectMissHalfDamage
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  armorClass,
  attackRollFill,
  battleId,
  battleObjectId,
  characterSeed,
  damageRollFill,
  findAct,
  findHole,
  Hp,
  magicSubject,
  movementFeet,
  objectTargetFill,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  skeletonCreatureInit,
  skeletonId,
  spellRecord,
  startBattleRight,
  supportedBattleUnitRef,
  targetFill,
  unitLibrary,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";
import type {
  BattleResolutionResult,
  BattleState,
  CombatantId,
} from "./index.ts";

type PotentCantripLastResult =
  | "init"
  | "attackMissHalfDamage"
  | "attackMissNoAdditionalEffect"
  | "attackMissNoLightEmitter"
  | "saveSuccessHalfDamage"
  | "saveSuccessNoAdditionalEffect"
  | "rejectObjectMissHalfDamage";
type PotentCantripProjection = {
  readonly targetHp: number;
  readonly actionResourcesRemaining: number;
  readonly targetActiveEffectCount: number;
  readonly lightEmitterCount: number;
  readonly objectDamageCount: number;
  readonly lastResult: PotentCantripLastResult;
};

const potentCantripUnit = unitLibrary.requireUnit("wizard_potent_cantrip");
const potentCantripUnitRef = supportedBattleUnitRef(potentCantripUnit);

defineSelectedIdentityWitness({
  describeLabel: "Potent Cantrip selected identity MBT",
  taskId: "L3PUTB-05",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-potent-cantrip.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: {
      Init: "init",
      AttackMissHalfDamage: "attackMissHalfDamage",
      AttackMissNoAdditionalEffect: "attackMissNoAdditionalEffect",
      AttackMissNoLightEmitter: "attackMissNoLightEmitter",
      SaveSuccessHalfDamage: "saveSuccessHalfDamage",
      SaveSuccessNoAdditionalEffect: "saveSuccessNoAdditionalEffect",
      RejectObjectMissHalfDamage: "rejectObjectMissHalfDamage",
    },
  },
  projectionSchema: {
    targetHp: "int",
    actionResourcesRemaining: "int",
    targetActiveEffectCount: "int",
    lightEmitterCount: "int",
    objectDamageCount: "int",
    lastResult: "variant",
  },
  initialProjection: expectedProjection(),
  units: [
    {
      unitId: "wizard_potent_cantrip",
      procedures: [
        {
          actionName: "doAttackMissHalfDamage",
          projectionAfter: expectedProjection({
            targetHp: 11,
            actionResourcesRemaining: 0,
            lastResult: "attackMissHalfDamage",
          }),
          discover: () =>
            projectResolvedResult(
              resolveAttackMissCantrip("ray_of_frost"),
              "attackMissHalfDamage",
            ),
        },
        {
          actionName: "doAttackMissNoLightEmitter",
          projectionAfter: expectedProjection({
            targetHp: 11,
            actionResourcesRemaining: 0,
            lightEmitterCount: 0,
            lastResult: "attackMissNoLightEmitter",
          }),
          discover: () =>
            projectResolvedResult(
              resolveAttackMissCantrip("starry_wisp"),
              "attackMissNoLightEmitter",
            ),
        },
        {
          actionName: "doAttackMissNoAdditionalEffect",
          projectionAfter: expectedProjection({
            targetHp: 11,
            actionResourcesRemaining: 0,
            targetActiveEffectCount: 0,
            lastResult: "attackMissNoAdditionalEffect",
          }),
          discover: () =>
            projectResolvedResult(
              resolveAttackMissCantrip("shocking_grasp"),
              "attackMissNoAdditionalEffect",
            ),
        },
        {
          actionName: "doSaveSuccessHalfDamage",
          projectionAfter: expectedProjection({
            targetHp: 11,
            actionResourcesRemaining: 0,
            lastResult: "saveSuccessHalfDamage",
          }),
          discover: () =>
            projectResolvedResult(
              resolveSuccessfulSaveCantrip("acid_splash"),
              "saveSuccessHalfDamage",
            ),
        },
        {
          actionName: "doSaveSuccessNoAdditionalEffect",
          projectionAfter: expectedProjection({
            targetHp: 11,
            actionResourcesRemaining: 0,
            targetActiveEffectCount: 0,
            lastResult: "saveSuccessNoAdditionalEffect",
          }),
          discover: () =>
            projectResolvedResult(
              resolveSuccessfulSaveCantrip("vicious_mockery"),
              "saveSuccessNoAdditionalEffect",
            ),
        },
        {
          actionName: "doRejectObjectMissHalfDamage",
          projectionAfter: expectedProjection({
            actionResourcesRemaining: 0,
            objectDamageCount: 0,
            lastResult: "rejectObjectMissHalfDamage",
          }),
          discover: () =>
            projectResolvedResult(
              resolveObjectMissCantrip("fire_bolt"),
              "rejectObjectMissHalfDamage",
            ),
        },
      ],
    },
  ],
});

function expectedProjection(
  overrides: Partial<PotentCantripProjection> = {},
): PotentCantripProjection {
  return {
    targetHp: 13,
    actionResourcesRemaining: 1,
    targetActiveEffectCount: 0,
    lightEmitterCount: 0,
    objectDamageCount: 0,
    lastResult: "init",
    ...overrides,
  };
}

function projectResolvedResult(
  result: BattleResolutionResult,
  lastResult: PotentCantripLastResult,
): PotentCantripProjection {
  const resolved = requireResolved(result);
  return {
    targetHp: currentHp(resolved.state, skeletonId),
    actionResourcesRemaining: resolved.snapshot.turn.actionResources.length,
    targetActiveEffectCount: activeEffectCount(resolved.state, skeletonId),
    lightEmitterCount: resolved.snapshot.lightEmitters.length,
    objectDamageCount: resolved.objectDamages?.length ?? 0,
    lastResult,
  };
}

function resolveAttackMissCantrip(spellId: Parameters<typeof spellRecord>[0]) {
  const state = potentCantripBattle({ cantrips: [spellId] });
  const subject = magicSubject(spellId);
  const target = findHole(findAct(state, subject).initialHoles, "targetChoice");
  const attack = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(target, skeletonId)],
    }),
    "attackRoll",
  );
  const damage = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, skeletonId),
        attackRollFill(attack, { total: 4, naturalD20: 3 }),
      ],
    }),
    "rolledDice",
  );
  return resolveBattleSubject({
    state,
    subject,
    fills: [
      targetFill(target, skeletonId),
      attackRollFill(attack, { total: 4, naturalD20: 3 }),
      damageRollFill(damage, 5),
    ],
  });
}

function resolveSuccessfulSaveCantrip(
  spellId: Parameters<typeof spellRecord>[0],
) {
  const state = potentCantripBattle({ cantrips: [spellId] });
  const subject = magicSubject(spellId);
  const target = findAct(state, subject).initialHoles.find(
    (hole) => hole.kind === "targetChoice",
  );
  const targetFills =
    target === undefined ? [] : [targetFill(target, skeletonId)];
  const save = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: targetFills,
    }),
    "savingThrowOutcome",
  );
  const saveSuccess = savingThrowOutcomeFill(save, [
    { targetId: skeletonId, succeeded: true },
  ]);
  const damage = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [...targetFills, saveSuccess],
    }),
    "rolledDice",
  );
  return resolveBattleSubject({
    state,
    subject,
    fills: [...targetFills, saveSuccess, damageRollFill(damage, 5)],
  });
}

function resolveObjectMissCantrip(spellId: "fire_bolt") {
  const state = potentCantripBattle({ cantrips: [spellId] });
  const subject = magicSubject(spellId);
  const objectTarget = objectTargetFill({
    hole: findHole(findAct(state, subject).initialHoles, "objectTargetChoice"),
    objectId: battleObjectId("potent-cantrip-selected-object-target"),
    spellId,
    rangeFeet: movementFeet(120),
    damageDisposition: { kind: "hitPoints", hitPoints: Hp(8) },
    spatialFacts: objectTargetFacts(spellId),
  });
  const attack = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [objectTarget],
    }),
    "attackRoll",
  );
  return resolveBattleSubject({
    state,
    subject,
    fills: [objectTarget, attackRollFill(attack, { total: 4, naturalD20: 3 })],
  });
}

function objectTargetFacts(spellId: "fire_bolt") {
  const objectId = battleObjectId("potent-cantrip-selected-object-target");
  return [
    {
      kind: "spellObjectTarget" as const,
      casterId: wizardId,
      objectId,
      spellId,
      rangeFeet: movementFeet(120),
      armorClass: armorClass(13),
      damageDisposition: { kind: "hitPoints" as const, hitPoints: Hp(8) },
    },
    {
      kind: "spellObjectIgnition" as const,
      casterId: wizardId,
      objectId,
      spellId,
      disposition: { kind: "flammableUnattended" as const },
    },
  ];
}

function potentCantripBattle(input: {
  readonly cantrips: readonly Parameters<typeof spellRecord>[0][];
}): BattleState {
  return startBattleRight({
    battleId: battleId("potent-cantrip-selected-identity"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        attack: null,
        classLevels: [{ className: "wizard", level: 3 }],
        characterUnitRefs: [potentCantripUnitRef],
        unitFeatures: [{ unit: potentCantripUnit }],
        spellcasting: wizardSpellcasting({
          cantrips: input.cantrips.map(spellRecord),
          preparedSpells: [],
          spellSlots: [],
        }),
      }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function currentHp(state: BattleState, combatantId: CombatantId): number {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${combatantId}.`);
  }
  return Number(combatant.hp);
}

function activeEffectCount(
  state: BattleState,
  combatantId: CombatantId,
): number {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${combatantId}.`);
  }
  return combatant.activeEffects.length;
}
