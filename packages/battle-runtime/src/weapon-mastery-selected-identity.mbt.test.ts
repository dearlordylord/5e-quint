// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt weapon-mastery-properties mastery_sap mastery_topple mastery_cleave
// UNIT-IDENTITY-MBT-REPLAY: weapon-mastery-properties mastery_sap doResolveSapMasteryPropertyHit
// UNIT-IDENTITY-MBT-REPLAY: weapon-mastery-properties mastery_topple doResolveToppleMasteryPropertyFailedSavingThrow
// UNIT-IDENTITY-MBT-REPLAY: weapon-mastery-properties mastery_cleave doResolveCleaveMasteryPropertySecondTargetHit
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { Either } from "effect";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
  DieRollResult,
  Hp,
  movementFeet,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";

import {
  WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE,
  WEAPON_MASTERY_SAP_SUPPORT_PROFILE,
  WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE,
  battleCombatantSide,
  battleId,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";

type WeaponMasteryProjection = {
  readonly primaryTargetHp: number;
  readonly secondTargetHp: number;
  readonly actionAvailable: boolean;
  readonly primaryTargetHasSapEffect: boolean;
  readonly primaryTargetProne: boolean;
  readonly cleaveUsed: boolean;
  readonly lastResult: "init" | "needsHoles" | "resolved";
};

const attackerId = combatantId("weapon-mastery-property-attacker");
const primaryTargetId = combatantId("weapon-mastery-property-primary-target");
const secondTargetId = combatantId("weapon-mastery-property-second-target");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Weapon Mastery selected identity Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

const weaponMasteryPropertyScenarios = {
  mastery_sap: {
    attackName: "Longsword",
    weaponUnitId: "weapon_longsword",
    grip: "one_handed",
    supportProfile: WEAPON_MASTERY_SAP_SUPPORT_PROFILE,
  },
  mastery_topple: {
    attackName: "Quarterstaff",
    weaponUnitId: "weapon_quarterstaff",
    grip: "one_handed",
    supportProfile: WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE,
  },
  mastery_cleave: {
    attackName: "Greataxe",
    weaponUnitId: "weapon_greataxe",
    grip: "two_handed",
    supportProfile: WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE,
  },
} as const;
type WeaponMasteryPropertyUnitId = keyof typeof weaponMasteryPropertyScenarios;

defineSelectedIdentityWitness({
  describeLabel: "Weapon Mastery selected identity MBT",
  taskId: "weapon-mastery-properties",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-weapon-mastery-selected-identity.mbt.qnt",
  ),
  projectionSchema: {
    primaryTargetHp: "int",
    secondTargetHp: "int",
    actionAvailable: "bool",
    primaryTargetHasSapEffect: "bool",
    primaryTargetProne: "bool",
    cleaveUsed: "bool",
    lastResult: "str",
  },
  witnessProtocolField: "qProtocol",
  witnessDecodeHole: weaponMasteryWitnessHole,
  quintFieldNames: { lastResult: "qScenarioResult" },
  initialProjection: initialProjection("mastery_sap"),
  units: [
    {
      unitId: "mastery_sap",
      procedures: [
        {
          actionName: "doResolveSapMasteryPropertyHit",
          projectionAfter: {
            primaryTargetHp: 9,
            secondTargetHp: 13,
            actionAvailable: false,
            primaryTargetHasSapEffect: true,
            primaryTargetProne: false,
            cleaveUsed: false,
            lastResult: "resolved",
          },
          discover: () => resolveSapMasteryPropertyHit(),
        },
      ],
    },
    {
      unitId: "mastery_topple",
      procedures: [
        {
          actionName: "doResolveToppleMasteryPropertyFailedSavingThrow",
          projectionAfter: {
            primaryTargetHp: 13,
            secondTargetHp: 13,
            actionAvailable: true,
            primaryTargetHasSapEffect: false,
            primaryTargetProne: true,
            cleaveUsed: false,
            lastResult: "needsHoles",
          },
          discover: () => resolveToppleMasteryPropertyFailedSavingThrow(),
        },
      ],
    },
    {
      unitId: "mastery_cleave",
      procedures: [
        {
          actionName: "doResolveCleaveMasteryPropertySecondTargetHit",
          projectionAfter: {
            primaryTargetHp: 9,
            secondTargetHp: 9,
            actionAvailable: false,
            primaryTargetHasSapEffect: false,
            primaryTargetProne: false,
            cleaveUsed: true,
            lastResult: "resolved",
          },
          discover: () => resolveCleaveMasteryPropertySecondTargetHit(),
        },
      ],
    },
  ],
});

function weaponMasteryWitnessHole(raw: unknown): "witnessProtocolHole" {
  if (raw === "WitnessProtocolHole") return "witnessProtocolHole";
  if (
    typeof raw === "object" &&
    raw !== null &&
    "tag" in raw &&
    raw.tag === "WitnessProtocolHole"
  ) {
    return "witnessProtocolHole";
  }
  throw new Error(
    `Unexpected Weapon Mastery witness protocol hole ${String(raw)}.`,
  );
}

function initialProjection(
  unitId: WeaponMasteryPropertyUnitId,
): WeaponMasteryProjection {
  return projectWeaponMasteryState({
    state: weaponMasteryBattle(unitId),
    lastResult: "init",
  });
}

function resolveSapMasteryPropertyHit(): WeaponMasteryProjection {
  const state = weaponMasteryBattle("mastery_sap");
  const scenario = weaponMasteryPropertyScenarios.mastery_sap;
  const subject = attackSubject(scenario.attackName);
  return resultProjection(
    resolveBattleSubject({
      state,
      subject,
      fills: primaryHitFills({
        state,
        subject,
        attackName: scenario.attackName,
        damageRoll: 1,
      }),
    }),
  );
}

function resolveToppleMasteryPropertyFailedSavingThrow(): WeaponMasteryProjection {
  const state = weaponMasteryBattle("mastery_topple");
  const scenario = weaponMasteryPropertyScenarios.mastery_topple;
  const subject = attackSubject(scenario.attackName);
  const target = requireHole(
    discoverAttackHoles(state, subject),
    "targetChoice",
  );
  const targetChoice = targetFill({
    hole: target,
    targetId: primaryTargetId,
    attackName: scenario.attackName,
  });
  const attackRoll = requireHole(
    holesAfterFills(state, subject, [targetChoice]),
    "attackRoll",
  );
  const savingThrow = requireHole(
    holesAfterFills(state, subject, [
      targetChoice,
      attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
    ]),
    "savingThrowOutcome",
  );
  return resultProjection(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetChoice,
        attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
        savingThrowOutcomeFill(savingThrow, primaryTargetId, false),
      ],
    }),
  );
}

function resolveCleaveMasteryPropertySecondTargetHit(): WeaponMasteryProjection {
  const state = weaponMasteryBattle("mastery_cleave");
  const scenario = weaponMasteryPropertyScenarios.mastery_cleave;
  const subject = attackSubject(scenario.attackName);
  const primaryFills = primaryHitFills({
    state,
    subject,
    attackName: scenario.attackName,
    damageRoll: 1,
  });
  const decision = requireHole(
    resolveBattleSubject({ state, subject, fills: primaryFills }),
    "unitFeatureDecision",
  );
  const secondTarget = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
    }),
    "targetChoice",
  );
  const secondTargetFill = targetFill({
    hole: secondTarget,
    targetId: secondTargetId,
    attackName: scenario.attackName,
    spatialFacts: [
      attackTargetInMeleeReachFact(secondTargetId, scenario.attackName),
      {
        kind: "cleaveSecondTargetWithin5FeetOfFirstTarget",
        attackerId,
        firstTargetId: primaryTargetId,
        secondTargetId,
      },
    ],
  });
  const cleaveAttackRoll = requireHole(
    holesAfterFills(state, subject, [
      ...primaryFills,
      unitFeatureDecisionFill(decision, "use"),
      secondTargetFill,
    ]),
    "attackRoll",
  );
  const cleaveDamage = requireHole(
    holesAfterFills(state, subject, [
      ...primaryFills,
      unitFeatureDecisionFill(decision, "use"),
      secondTargetFill,
      attackRollFill(cleaveAttackRoll, { total: 15, naturalD20: 10 }),
    ]),
    "rolledDice",
  );
  return resultProjection(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        secondTargetFill,
        attackRollFill(cleaveAttackRoll, { total: 15, naturalD20: 10 }),
        damageRollFill(cleaveDamage, 4),
      ],
    }),
  );
}

function resultProjection(
  result: BattleResolutionResult,
): WeaponMasteryProjection {
  if (result.tag !== "resolved" && result.tag !== "needsHoles") {
    throw new Error(`Unexpected Weapon Mastery resolution: ${result.reason}`);
  }
  return projectWeaponMasteryState({
    state: result.state,
    lastResult: result.tag,
  });
}

function primaryHitFills(input: {
  readonly state: BattleState;
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >;
  readonly attackName: string;
  readonly damageRoll: number;
}): readonly BattleFill[] {
  const target = requireHole(
    discoverAttackHoles(input.state, input.subject),
    "targetChoice",
  );
  const targetChoice = targetFill({
    hole: target,
    targetId: primaryTargetId,
    attackName: input.attackName,
  });
  const attackRoll = requireHole(
    holesAfterFills(input.state, input.subject, [targetChoice]),
    "attackRoll",
  );
  const damageRoll = requireHole(
    holesAfterFills(input.state, input.subject, [
      targetChoice,
      attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
    ]),
    "rolledDice",
  );
  return [
    targetChoice,
    attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
    damageRollFill(damageRoll, input.damageRoll),
  ];
}

function weaponMasteryBattle(unitId: WeaponMasteryPropertyUnitId): BattleState {
  return startBattleRight({
    battleId: battleId(`battle-runtime-mbt-${unitId}`),
    combatants: [
      weaponMasteryAttackerInit(unitId),
      targetCreatureInit(primaryTargetId, "Primary Target", 10),
      targetCreatureInit(secondTargetId, "Second Target", 9),
    ],
  });
}

function weaponMasteryAttackerInit(
  unitId: WeaponMasteryPropertyUnitId,
): BattleCreatureInit {
  const scenario = weaponMasteryPropertyScenarios[unitId];
  return {
    combatantId: attackerId,
    displayName: "Mastery Property Fighter",
    initiative: initiativeScore(20),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId(`character:${unitId}`),
      characterUnitRefs: [
        {
          unitId,
          supportProfiles: [scenario.supportProfile],
        },
      ],
      weaponMasteries: [{ weaponUnitId: scenario.weaponUnitId }],
      classLevels: [{ className: "fighter", level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
      armorClass: {
        ...defaultArmorClassState(),
        rightHandUse: "mainWeapon",
      },
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {
        weapon: {
          itemId: `main:${scenario.weaponUnitId}`,
          unitId: scenario.weaponUnitId,
          grip: scenario.grip,
        },
      },
      attack: weaponAttack(scenario.weaponUnitId),
      unarmedStrike: baseUnarmedStrike(),
    },
  };
}

function targetCreatureInit(
  combatantIdValue: CombatantId,
  displayName: string,
  initiative: number,
): BattleCreatureInit {
  return {
    combatantId: combatantIdValue,
    displayName,
    initiative: initiativeScore(initiative),
    side: oppositionSide,
    creatureInit: {
      kind: "character",
      characterId: characterId(`character:${combatantIdValue}`),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(13),
      maxHp: Hp(13),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
    },
  };
}

function weaponAttack(
  weaponUnitId: (typeof weaponMasteryPropertyScenarios)[WeaponMasteryPropertyUnitId]["weaponUnitId"],
): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"]
> {
  const weapon = unitLibrary.requireUnit(weaponUnitId);
  if (weapon.kind !== "weapon") {
    throw new Error(`Expected ${weaponUnitId} weapon Unit.`);
  }
  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: abilityModifier(3),
  };
}

function baseUnarmedStrike(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["unarmedStrike"] {
  return {
    kind: "unarmedStrike",
    effect: {
      kind: "damage",
      damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
    },
    attackAbility: "str",
    attackAbilityModifier: abilityModifier(3),
    attackBonus: attackBonus(5),
    damageAbilityModifier: abilityModifier(3),
  };
}

function attackSubject(
  attackName: string,
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  return {
    tag: "action",
    actorId: attackerId,
    action: "attack",
    attackName,
  };
}

function discoverAttackHoles(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >,
): readonly BattleHole[] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack" &&
      candidate.subject.actorId === subject.actorId &&
      candidate.subject.attackName === subject.attackName,
  );
  if (act == null) {
    throw new Error(`Expected ${subject.attackName} attack act.`);
  }
  return act.initialHoles;
}

function holesAfterFills(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >,
  fills: readonly BattleFill[],
): readonly BattleHole[] {
  const result = resolveBattleSubject({ state, subject, fills });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected attack fills to request more holes.");
  }
  return result.holes;
}

function requireHole(
  resultOrHoles: BattleResolutionResult | readonly BattleHole[],
  kind: BattleHole["kind"],
): BattleHole {
  const holes: readonly BattleHole[] =
    "tag" in resultOrHoles
      ? resultOrHoles.tag === "needsHoles"
        ? resultOrHoles.holes
        : []
      : resultOrHoles;
  const hole = holes.find((candidate) => candidate.kind === kind);
  if (hole == null) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function targetFill(input: {
  readonly hole: BattleHole;
  readonly targetId: CombatantId;
  readonly attackName: string;
  readonly spatialFacts?: NonNullable<
    Extract<BattleFill, { readonly kind: "targetChoice" }>["spatialFacts"]
  >;
}): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: input.hole.holeId,
    value: input.targetId,
    spatialFacts: input.spatialFacts ?? [
      attackTargetInMeleeReachFact(input.targetId, input.attackName),
    ],
  };
}

function attackTargetInMeleeReachFact(
  targetId: CombatantId,
  attackName: string,
) {
  return {
    kind: "attackTargetInMeleeReach" as const,
    actorId: attackerId,
    targetId,
    attackName,
  };
}

function attackRollFill(
  hole: BattleHole,
  value: { readonly total: number; readonly naturalD20: number },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
    },
  };
}

function damageRollFill(
  hole: BattleHole,
  value: number,
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [{ results: [DieRollResult(value)] }],
  };
}

function savingThrowOutcomeFill(
  hole: BattleHole,
  targetId: CombatantId,
  succeeded: boolean,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: { outcomes: [{ targetId, succeeded }] },
  };
}

function unitFeatureDecisionFill(
  hole: BattleHole,
  value: "use" | "decline",
): Extract<BattleFill, { readonly kind: "unitFeatureDecision" }> {
  return {
    kind: "unitFeatureDecision",
    holeId: hole.holeId,
    value,
  };
}

function projectWeaponMasteryState(input: {
  readonly state: BattleState;
  readonly lastResult: WeaponMasteryProjection["lastResult"];
}): WeaponMasteryProjection {
  const snapshot = snapshotBattle(input.state);
  const primaryTarget = snapshot.combatants.find(
    (combatant) => combatant.combatantId === primaryTargetId,
  );
  const secondTarget = snapshot.combatants.find(
    (combatant) => combatant.combatantId === secondTargetId,
  );
  const primaryTargetState = input.state.combatants.get(primaryTargetId);
  if (
    primaryTarget === undefined ||
    secondTarget === undefined ||
    primaryTargetState === undefined
  ) {
    throw new Error("Expected Weapon Mastery selected identity combatants.");
  }
  return {
    primaryTargetHp: primaryTarget.hp,
    secondTargetHp: secondTarget.hp,
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    primaryTargetHasSapEffect: primaryTargetState.activeEffects.some(
      (effect) =>
        effect.kind === "nextAttackRollBySelf" &&
        "sourceUnitId" in effect &&
        effect.sourceUnitId === "mastery_sap",
    ),
    primaryTargetProne: primaryTarget.conditions.includes("prone"),
    cleaveUsed:
      input.state.currentTurnResources.weaponMasteryCleaveAttackersUsedThisTurn.includes(
        attackerId,
      ),
    lastResult: input.lastResult,
  };
}

function startBattleRight(
  input: Parameters<typeof startBattle>[0],
): BattleState {
  const result = startBattle(input);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}
