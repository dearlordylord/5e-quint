import {
  abilityModifier,
  armorClassDelta,
  defaultArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import {
  classLevel,
  movementDeltaFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import type { SpellRecord, UnitRecord } from "@dnd/surface/surface/types";
import * as Either from "effect/Either";
import { expect } from "vitest";
import {
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  battleId,
  battleUnitRefWithSupportProfiles,
  discoverBattleActs,
  resolveBattleSubject,
  startBattle,
  WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleSubject,
} from "./index.ts";
import {
  BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
  PASSIVE_SPEED_BONUS_SUPPORT_PROFILE,
  PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE,
} from "./unit-feature-support.ts";
import type { PassiveFeatUnit } from "./unit-profile-admission-catalog-support.ts";
import {
  archerySupportProfile,
  archeryUnitId,
  barbarianFastMovementUnitId,
  boonOfCombatProwessUnitId,
  combatProwessSupportProfile,
  extraAttackSupportProfile,
  fighterExtraAttackUnitId,
  monkUnarmoredMovementUnitId,
  oppositionSide,
  orcAdrenalineRushUnitId,
  orcRelentlessEnduranceUnitId,
  paladinExtraAttackUnitId,
  partySide,
  rangerRovingUnitId,
  rogueSneakAttackUnitId,
  savageAttackerUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackDamageDispositionFill,
  attackRollFill,
  attackTargetFill,
  characterCreature,
  damageRollFillWithGroups,
  requireHole,
  requireResultHole,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";

export function archeryBattle(input: {
  readonly attack: NonNullable<
    Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["attack"]
  >;
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
}): BattleState {
  const characterUnitRefs = input.characterUnitRefs ?? [archeryBattleUnitRef()];
  const result = startBattle({
    battleId: battleId("unit-profile-archery-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Archer",
        initiative: 20,
        side: partySide,
        attack: input.attack,
        characterUnitRefs,
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export function savageAttackerBattle(input: {
  readonly attack: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly classLevels?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  readonly currentHp?: number;
  readonly maxHp?: number;
  readonly tempHp?: number;
  readonly resources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly unitFeatures?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"];
}): BattleState {
  const savageAttackerUnitRef = savageAttackerBattleUnitRef();
  const result = startBattle({
    battleId: battleId("unit-profile-savage-attacker-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Savage Attacker",
        initiative: 20,
        side: partySide,
        attack: input.attack,
        characterUnitRefs: input.characterUnitRefs ?? [savageAttackerUnitRef],
        ...(input.classLevels === undefined
          ? {}
          : { classLevels: input.classLevels }),
        ...(input.unitFeatures === undefined
          ? {}
          : { unitFeatures: input.unitFeatures }),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export function combatProwessBattle(input: {
  readonly attack: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
  readonly cantrips?: readonly SpellRecord[];
  readonly targetPreparedSpells?: readonly SpellRecord[];
}): BattleState {
  const result = startBattle({
    battleId: battleId("unit-profile-combat-prowess-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Peerless Aim User",
        initiative: 20,
        side: partySide,
        attack: input.attack,
        characterUnitRefs: [combatProwessBattleUnitRef()],
        ...(input.cantrips === undefined
          ? {}
          : {
              spellcasting: {
                sourceClassName: "wizard",
                spellcastingAbilityModifier: abilityModifier(3),
                proficiencyBonus: proficiencyBonus(2),
                canCastSpells: true,
                cantrips: input.cantrips,
                preparedSpells: [],
                featurePreparedSpells: [],
                spellbookRitualSpellAccesses: [],
                invocationSpellAccesses: [],
                spellSlots: [],
              },
            }),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
        ...(input.targetPreparedSpells === undefined
          ? {}
          : {
              spellcasting: {
                sourceClassName: "wizard",
                spellcastingAbilityModifier: abilityModifier(3),
                proficiencyBonus: proficiencyBonus(2),
                canCastSpells: true,
                cantrips: [],
                preparedSpells: input.targetPreparedSpells,
                featurePreparedSpells: [],
                spellbookRitualSpellAccesses: [],
                invocationSpellAccesses: [],
                spellSlots: [{ spellLevel: 1, count: 1 }],
              },
            }),
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export function extraAttackBattle(
  characterUnitRefs: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"],
): BattleState {
  const result = startBattle({
    battleId: battleId("unit-profile-extra-attack-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Extra Attacker",
        initiative: 20,
        side: partySide,
        attack: zeroAbilityWeaponAttack("weapon_longsword"),
        characterUnitRefs,
        classLevels: [{ className: "fighter", level: classLevel(5) }],
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export function fastMovementBattle(
  input: {
    readonly armorClass?: Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["armorClass"];
  } = {},
): BattleState {
  const result = startBattle({
    battleId: battleId("unit-profile-fast-movement-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Fast Barbarian",
        initiative: 20,
        side: partySide,
        characterUnitRefs: [fastMovementBattleUnitRef()],
        classLevels: [{ className: "barbarian", level: classLevel(5) }],
        ...(input.armorClass === undefined
          ? {}
          : { armorClass: input.armorClass }),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export function rovingBattle(
  input: {
    readonly armorClass?: Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["armorClass"];
  } = {},
): BattleState {
  const result = startBattle({
    battleId: battleId("unit-profile-roving-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Roving Ranger",
        initiative: 20,
        side: partySide,
        characterUnitRefs: [rovingBattleUnitRef()],
        classLevels: [{ className: "ranger", level: classLevel(6) }],
        ...(input.armorClass === undefined
          ? {}
          : { armorClass: input.armorClass }),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export function monkUnarmoredMovementBattle(
  input: {
    readonly armorClass?: Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["armorClass"];
    readonly selectedLoadout?: Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["selectedLoadout"];
  } = {},
): BattleState {
  const result = startBattle({
    battleId: battleId("unit-profile-monk-unarmored-movement-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Mobile Monk",
        initiative: 20,
        side: partySide,
        characterUnitRefs: [monkUnarmoredMovementBattleUnitRef()],
        classLevels: [{ className: "monk", level: classLevel(2) }],
        ...(input.armorClass === undefined
          ? {}
          : { armorClass: input.armorClass }),
        ...(input.selectedLoadout === undefined
          ? {}
          : { selectedLoadout: input.selectedLoadout }),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export function relentlessEnduranceBattle(input: {
  readonly targetHp: number;
  readonly targetMaxHp?: number;
  readonly usesRemaining?: number;
}): BattleState {
  const unit = unitLibrary.requireUnit(orcRelentlessEnduranceUnitId);
  const result = startBattle({
    battleId: battleId("unit-profile-relentless-endurance-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Attacker",
        initiative: 20,
        side: partySide,
        attack: zeroAbilityWeaponAttack("weapon_longsword"),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Orc Target",
        initiative: 10,
        side: oppositionSide,
        currentHp: input.targetHp,
        maxHp: input.targetMaxHp ?? 12,
        resources: [
          input.usesRemaining === undefined
            ? { unit }
            : { unit, usesRemaining: input.usesRemaining },
        ],
        characterUnitRefs: [
          {
            unitId: orcRelentlessEnduranceUnitId,
            supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
          },
        ],
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export function adrenalineRushBattle(
  input: { readonly tempHp?: number; readonly usesRemaining?: number } = {},
): BattleState {
  const unit = unitLibrary.requireUnit(orcAdrenalineRushUnitId);
  const result = startBattle({
    battleId: battleId("unit-profile-adrenaline-rush-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Orc",
        initiative: 20,
        side: partySide,
        tempHp: input.tempHp ?? 0,
        classLevels: [{ className: "fighter", level: classLevel(5) }],
        resources: [
          input.usesRemaining === undefined
            ? { unit }
            : { unit, usesRemaining: input.usesRemaining },
        ],
        characterUnitRefs: [adrenalineRushBattleUnitRef()],
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export function adrenalineRushDashAct(
  state: BattleState,
): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionStandardAction"; readonly action: "dash" }
  >;
} {
  const act = discoverBattleActs(state).find(isBonusActionWalkDashAct);
  expect(isBonusActionWalkDashAct(act)).toBe(true);
  if (!isBonusActionWalkDashAct(act)) {
    throw new Error("Expected Adrenaline Rush Bonus Action Dash act.");
  }
  return act;
}

function isBonusActionWalkDashAct(
  act: AvailableBattleAct | undefined,
): act is AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionStandardAction"; readonly action: "dash" }
  >;
} {
  return (
    act !== undefined &&
    act.subject.tag === "bonusActionStandardAction" &&
    act.subject.action === "dash" &&
    act.subject.speedKind === "walk"
  );
}

export function adrenalineRushDashSubject(): Extract<
  BattleSubject,
  { readonly tag: "bonusActionStandardAction"; readonly action: "dash" }
> {
  return {
    tag: "bonusActionStandardAction",
    actorId: spellCasterId,
    sourceUnitId: orcAdrenalineRushUnitId,
    action: "dash",
    speedKind: "walk",
  };
}

export function relentlessEnduranceDisposition(
  state: BattleState,
  damageRoll: number,
): Extract<BattleHole, { readonly kind: "attackDamageDisposition" }> & {
  readonly prefixFills: readonly BattleFill[];
} {
  const subject = weaponAttackSubject("Longsword");
  const target = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(
    target,
    spellCasterId,
    spellTargetId,
    "Longsword",
  );
  const roll = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [targetFill] }),
    "attackRoll",
  );
  const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
  const damage = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [targetFill, rollFill] }),
    "rolledDice",
  );
  const damageFill = damageRollFillWithGroups(damage, [[damageRoll]]);
  const awaitingDisposition = resolveBattleSubject({
    state,
    subject,
    fills: [targetFill, rollFill, damageFill],
  });
  const disposition = requireResultHole(
    awaitingDisposition,
    "attackDamageDisposition",
  );
  return {
    ...disposition,
    prefixFills: [targetFill, rollFill, damageFill],
  };
}

export function relentlessEnduranceDamageResult(
  state: BattleState,
  damageRoll: number,
): ReturnType<typeof resolveBattleSubject> {
  const subject = weaponAttackSubject("Longsword");
  const target = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(
    target,
    spellCasterId,
    spellTargetId,
    "Longsword",
  );
  const roll = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [targetFill] }),
    "attackRoll",
  );
  const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
  const damage = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [targetFill, rollFill] }),
    "rolledDice",
  );
  const damageFill = damageRollFillWithGroups(damage, [[damageRoll]]);
  const withoutDisposition = resolveBattleSubject({
    state,
    subject,
    fills: [targetFill, rollFill, damageFill],
  });
  if (
    withoutDisposition.tag !== "needsHoles" ||
    !withoutDisposition.holes.some(
      (hole) => hole.kind === "attackDamageDisposition",
    )
  ) {
    return withoutDisposition;
  }
  const disposition = requireResultHole(
    withoutDisposition,
    "attackDamageDisposition",
  );
  return resolveBattleSubject({
    state,
    subject,
    fills: [
      targetFill,
      rollFill,
      damageFill,
      attackDamageDispositionFill(disposition, { kind: "ordinaryDamage" }),
    ],
  });
}

export function extraAttackBattleUnitRef(
  unitId:
    | typeof fighterExtraAttackUnitId
    | typeof paladinExtraAttackUnitId = fighterExtraAttackUnitId,
): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(unitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId,
      supportProfiles: [extraAttackSupportProfile],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

export function attackDamageRiderBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(rogueSneakAttackUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: rogueSneakAttackUnitId,
      supportProfiles: [ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

export function savageAttackerBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(savageAttackerUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: savageAttackerUnitId,
      supportProfiles: [WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

export function archeryBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = archeryFeatureUnit();
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: archeryUnitId,
      supportProfiles: [archerySupportProfile],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

export function combatProwessBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(boonOfCombatProwessUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: boonOfCombatProwessUnitId,
      supportProfiles: [combatProwessSupportProfile],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

export function fastMovementBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(barbarianFastMovementUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: barbarianFastMovementUnitId,
      supportProfiles: [fastMovementSupportProfile()],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

export function rovingBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(rangerRovingUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: rangerRovingUnitId,
      supportProfiles: [rovingSupportProfile()],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

export function monkUnarmoredMovementBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(monkUnarmoredMovementUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: monkUnarmoredMovementUnitId,
      supportProfiles: [monkUnarmoredMovementSupportProfile()],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

export function adrenalineRushBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(orcAdrenalineRushUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: orcAdrenalineRushUnitId,
      supportProfiles: [adrenalineRushSupportProfile()],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

export function fastMovementSupportProfile() {
  return {
    kind: PASSIVE_SPEED_BONUS_SUPPORT_PROFILE,
    deltaFeet: movementDeltaFeet(10),
    condition: {
      kind: "notWearingArmor",
      categories: ["heavy"],
    },
  } as const;
}

export function monkUnarmoredMovementSupportProfile() {
  return {
    kind: PASSIVE_SPEED_BONUS_SUPPORT_PROFILE,
    deltaFeet: movementDeltaFeet(10),
    condition: {
      kind: "unarmoredUnshielded",
    },
  } as const;
}

export function rovingSupportProfile() {
  return {
    kind: PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE,
    speed: rovingSpeedBonusProfile(),
    grants: rovingSpeedKindGrants(),
  } as const;
}

export function adrenalineRushSupportProfile() {
  return {
    kind: BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
    dashTemporaryHitPoints: adrenalineRushProfilePayload(),
  } as const;
}

export function adrenalineRushProfilePayload() {
  return {
    activationCost: { kind: "bonusAction", action: "dash" },
    temporaryHitPoints: { amount: { kind: "proficiencyBonus" } },
    resource: {
      cap: { kind: "proficiencyBonus" },
      resetCadence: "shortOrLongRest",
    },
  } as const;
}

export function rovingSpeedBonusProfile() {
  return {
    deltaFeet: movementDeltaFeet(10),
    condition: {
      kind: "notWearingArmor",
      categories: ["heavy"],
    },
  } as const;
}

export function rovingSpeedKindGrants() {
  return [
    { speedKind: "climb", feet: { kind: "walkSpeed" } },
    { speedKind: "swim", feet: { kind: "walkSpeed" } },
  ] as const;
}

export function rovingMovementHole(
  state: BattleState,
): Extract<BattleHole, { readonly kind: "movement" }> {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.actorId === spellCasterId &&
      candidate.subject.command === "move",
  );
  if (act === undefined) {
    throw new Error("Expected Roving Movement act.");
  }
  return requireHole(act.initialHoles, "movement");
}

export function archeryFeatureUnit(): PassiveFeatUnit {
  const unit = unitLibrary.requireUnit(archeryUnitId);
  expect(isPassiveFeatUnit(unit)).toBe(true);
  if (!isPassiveFeatUnit(unit)) {
    throw new Error("Expected Archery passive feat Unit.");
  }
  return unit;
}

export function isPassiveFeatUnit(unit: UnitRecord): unit is PassiveFeatUnit {
  return unit.kind === "feat" && unit.mechanics.family === "passive";
}

export function heavyArmorClassState(): ReturnType<
  typeof defaultArmorClassState
> {
  return {
    ...defaultArmorClassState(),
    base: {
      kind: "armor",
      category: "heavy",
      formula: { kind: "heavy_fixed", ac: 16 },
    },
    armorTraining: new Set(["heavy"]),
  };
}

export function lightArmorClassState(): ReturnType<
  typeof defaultArmorClassState
> {
  return {
    ...defaultArmorClassState(),
    base: {
      kind: "armor",
      category: "light",
      formula: { kind: "light_dex", base: 11 },
    },
    armorTraining: new Set(["light"]),
  };
}

export function shieldArmorClassState(): ReturnType<
  typeof defaultArmorClassState
> {
  return {
    ...defaultArmorClassState(),
    bonuses: [
      {
        kind: "shield",
        bonus: armorClassDelta(2),
        handUse: "shield",
        trainingRequired: "shield",
      },
    ],
    armorTraining: new Set(["shield"]),
    leftHandUse: "shield",
  };
}

export function shieldLoadout(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["selectedLoadout"] {
  return { shield: "equipment_shield" };
}
