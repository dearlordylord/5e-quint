// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.cunning-strike
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L5-A13-ROGUE-CUNNING-STRIKE-BATTLE-RUNTIME rogue_cunning_strike
// UNIT-IDENTITY-MBT-REPLAY: L5-A13-ROGUE-CUNNING-STRIKE-BATTLE-RUNTIME rogue_cunning_strike doResolveCunningStrikeTripFailedSave doResolveCunningStrikePoisonFailedSave doResolveCunningStrikeWithdrawMove
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  attackDamageDispositionFill,
  attackDamageHoleAfterHit,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  battleId,
  characterSeed,
  cunningStrikeFeature,
  cunningStrikeUnitRefs,
  damageRollFillWithGroups,
  fighterAttackSubject,
  fighterId,
  goblinId,
  hasCondition,
  movementFill,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  sneakAttackFeature,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  testCharacterD20Statistics,
  testDaggerAttack,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleSubject,
} from "./battle-runtime-test-support.ts";
import { difficultyClass } from "@dnd/shared/types";

type CunningStrikeLastResult =
  | "init"
  | "tripFailedSave"
  | "poisonFailedSave"
  | "withdrawMoved";
type CunningStrikeProjection = {
  readonly targetTempHp: number;
  readonly targetProne: boolean;
  readonly targetPoisoned: boolean;
  readonly actorMovementSpentFeet: number;
  readonly sneakAttackDiceRolled: number;
  readonly cunningStrikeUnitBound: boolean;
  readonly sourceDamageRiderUnitBound: boolean;
  readonly lastResult: CunningStrikeLastResult;
};
type CunningStrikeOptionId = "poison" | "trip" | "withdraw";

const cunningStrikeUnitId = "rogue_cunning_strike";
const sneakAttackUnitId = "rogue_sneak_attack";

defineSelectedIdentityWitness({
  describeLabel: "Cunning Strike selected identity MBT",
  taskId: "L5-A13-ROGUE-CUNNING-STRIKE-BATTLE-RUNTIME",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-cunning-strike-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: {
      Init: "init",
      TripFailedSave: "tripFailedSave",
      PoisonFailedSave: "poisonFailedSave",
      WithdrawMoved: "withdrawMoved",
    },
  },
  projectionSchema: {
    targetTempHp: "int",
    targetProne: "bool",
    targetPoisoned: "bool",
    actorMovementSpentFeet: "int",
    sneakAttackDiceRolled: "int",
    cunningStrikeUnitBound: "bool",
    sourceDamageRiderUnitBound: "bool",
    lastResult: "variant",
  },
  initialProjection: expectedProjection(),
  units: [
    {
      unitId: cunningStrikeUnitId,
      procedures: [
        {
          actionName: "doResolveCunningStrikeTripFailedSave",
          projectionAfter: expectedProjection({
            targetTempHp: 22,
            targetProne: true,
            sneakAttackDiceRolled: 2,
            cunningStrikeUnitBound: true,
            sourceDamageRiderUnitBound: true,
            lastResult: "tripFailedSave",
          }),
          discover: () => resolveTripFailedSave(),
        },
        {
          actionName: "doResolveCunningStrikePoisonFailedSave",
          projectionAfter: expectedProjection({
            targetTempHp: 22,
            targetPoisoned: true,
            sneakAttackDiceRolled: 2,
            cunningStrikeUnitBound: true,
            sourceDamageRiderUnitBound: true,
            lastResult: "poisonFailedSave",
          }),
          discover: () => resolvePoisonFailedSave(),
        },
        {
          actionName: "doResolveCunningStrikeWithdrawMove",
          projectionAfter: expectedProjection({
            targetTempHp: 22,
            sneakAttackDiceRolled: 2,
            cunningStrikeUnitBound: true,
            sourceDamageRiderUnitBound: true,
            lastResult: "withdrawMoved",
          }),
          discover: () => resolveWithdrawMove(),
        },
      ],
    },
  ],
});

function expectedProjection(
  overrides: Partial<CunningStrikeProjection> = {},
): CunningStrikeProjection {
  return {
    targetTempHp: 40,
    targetProne: false,
    targetPoisoned: false,
    actorMovementSpentFeet: 0,
    sneakAttackDiceRolled: 0,
    cunningStrikeUnitBound: false,
    sourceDamageRiderUnitBound: false,
    lastResult: "init",
    ...overrides,
  };
}

function resolveTripFailedSave(): CunningStrikeProjection {
  const window = cunningStrikeDamageWindow("trip");
  const save = requireHole(
    resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: window.damageAppliedFills,
    }),
    "savingThrowOutcome",
  );
  return projectResolved(
    window,
    requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.damageAppliedFills,
          savingThrowOutcomeFill(save, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state,
    "tripFailedSave",
  );
}

function resolvePoisonFailedSave(): CunningStrikeProjection {
  const window = cunningStrikeDamageWindow("poison");
  const kit = requireHole(
    resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: window.damageAppliedFills,
    }),
    "toolPossessionFacts",
  );
  const kitFill = toolPossessionFactsFill(kit, ["poisoners_kit"]);
  const save = requireHole(
    resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: [...window.damageAppliedFills, kitFill],
    }),
    "savingThrowOutcome",
  );
  return projectResolved(
    window,
    requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.damageAppliedFills,
          kitFill,
          savingThrowOutcomeFill(save, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state,
    "poisonFailedSave",
  );
}

function resolveWithdrawMove(): CunningStrikeProjection {
  const window = cunningStrikeDamageWindow("withdraw");
  const move = requireHole(
    resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: window.damageAppliedFills,
    }),
    "movement",
  );
  return projectResolved(
    window,
    requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.damageAppliedFills,
          movementFill(move, {
            movementCostFeet: 15,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).state,
    "withdrawMoved",
  );
}

function projectResolved(
  window: CunningStrikeDamageWindow,
  state: BattleState,
  lastResult: CunningStrikeLastResult,
): CunningStrikeProjection {
  const target = state.combatants.get(goblinId);
  const actor = state.combatants.get(fighterId);
  if (target === undefined || actor === undefined) {
    throw new Error("Expected Cunning Strike actor and target.");
  }
  return expectedProjection({
    targetTempHp: Number(target.tempHp),
    targetProne: hasCondition(target.conditions, "prone"),
    targetPoisoned: hasCondition(target.conditions, "poisoned"),
    actorMovementSpentFeet: Number(actor.movementSpentFeet),
    sneakAttackDiceRolled: 2,
    cunningStrikeUnitBound: window.cunningStrikeUnitBound,
    sourceDamageRiderUnitBound: window.sourceDamageRiderUnitBound,
    lastResult,
  });
}

type CunningStrikeDamageWindow = {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly damageAppliedFills: readonly BattleFill[];
  readonly cunningStrikeUnitBound: boolean;
  readonly sourceDamageRiderUnitBound: boolean;
};

function cunningStrikeDamageWindow(
  optionId: CunningStrikeOptionId,
): CunningStrikeDamageWindow {
  const state = cunningStrikeBattle();
  const subject = fighterAttackSubject("Dagger");
  const target = attackInitialTargetHole(state, subject);
  const roll = attackRollHoleAfterTarget(state, target, subject);
  const attackRoll = {
    total: 15,
    naturalD20: 10,
    rollMode: "advantage" as const,
  };
  const damage = attackDamageHoleAfterHit(
    state,
    target,
    roll,
    attackRoll,
    subject,
  );
  const boundary = selectedCunningStrikeBoundary(damage, optionId);
  const throughDamageRoll = [
    targetFill(target, goblinId),
    attackRollFill(roll, attackRoll),
    damageRollFillWithGroups(
      damage,
      [[4], [6, 5]],
      [sneakAttackUnitId],
      undefined,
      { unitId: cunningStrikeUnitId, optionId },
    ),
  ];
  const afterDamageRoll = resolveBattleSubject({
    state,
    subject,
    fills: throughDamageRoll,
  });
  const disposition =
    afterDamageRoll.tag === "needsHoles"
      ? afterDamageRoll.holes.find(
          (hole) => hole.kind === "attackDamageDisposition",
        )
      : undefined;

  return {
    state,
    subject,
    damageAppliedFills:
      disposition === undefined
        ? throughDamageRoll
        : [
            ...throughDamageRoll,
            attackDamageDispositionFill(disposition, {
              kind: "ordinaryDamage",
            }),
          ],
    ...boundary,
  };
}

function selectedCunningStrikeBoundary(
  damage: BattleHole,
  optionId: CunningStrikeOptionId,
): {
  readonly cunningStrikeUnitBound: boolean;
  readonly sourceDamageRiderUnitBound: boolean;
} {
  if (damage.kind !== "rolledDice") {
    throw new Error("Expected Cunning Strike damage roll hole.");
  }
  const options =
    "cunningStrikeOptions" in damage ? (damage.cunningStrikeOptions ?? []) : [];
  const selected = options.find(
    (option) =>
      option.unitId === cunningStrikeUnitId && option.optionId === optionId,
  );
  const sourceDamageRiderUnitBound =
    "attackDamageRiders" in damage &&
    (damage.attackDamageRiders ?? []).some(
      (rider) => rider.unitId === sneakAttackUnitId,
    ) &&
    selected?.sourceDamageRiderUnitId === sneakAttackUnitId;
  return {
    cunningStrikeUnitBound: selected?.unitId === cunningStrikeUnitId,
    sourceDamageRiderUnitBound,
  };
}

function cunningStrikeBattle(): BattleState {
  const state = startBattleRight({
    battleId: battleId("battle-cunning-strike-selected-identity"),
    combatants: [
      characterSeed({
        displayName: "Cunning Strike Rogue",
        initiative: 20,
        classLevels: [{ className: "rogue", level: 5 }],
        d20Statistics: testCharacterD20Statistics({ dex: 16 }),
        unitFeatures: [sneakAttackFeature(), cunningStrikeFeature()],
        characterUnitRefs: cunningStrikeUnitRefs(),
        attack: testDaggerAttack(),
      }),
      statBlockCreatureInit({ initiative: 10, tempHp: 40 }),
    ],
  });
  const rogue = state.combatants.get(fighterId);
  if (rogue === undefined) {
    throw new Error("Expected Cunning Strike rogue combatant.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(fighterId, {
      ...rogue,
      hidden: { discoveryDc: difficultyClass(16) },
    }),
  };
}

function toolPossessionFactsFill(
  hole: BattleHole,
  toolIdsOnPerson: readonly "poisoners_kit"[],
): Extract<BattleFill, { readonly kind: "toolPossessionFacts" }> {
  if (hole.kind !== "toolPossessionFacts") {
    throw new Error("Expected toolPossessionFacts hole.");
  }
  return {
    kind: "toolPossessionFacts",
    holeId: hole.holeId,
    value: { toolIdsOnPerson },
  };
}
