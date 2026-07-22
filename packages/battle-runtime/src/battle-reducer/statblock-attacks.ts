// The mutual import cycle with statblock.ts is tolerated
// because all imported bindings are function values used only at call time.
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.hunters-prey
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.ATTACK_CONTROL

import { Match } from "effect";
import { attackBonus, movementFeet, type AttackBonus } from "@dnd/shared/types";
import { isIncapacitated } from "@dnd/shared-algebras/conditions-algebra";
import type { DamageType, DiceExpr } from "@dnd/surface/surface/types";
import type { AttackRollResult } from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  ATTACK_DAMAGE_DIE_FLOOR_SUPPORT_PROFILE,
  ATTACK_ROLL_MISS_TO_HIT_REPLACEMENT_SUPPORT_PROFILE,
  HUNTERS_PREY_SUPPORT_PROFILE,
  PASSIVE_RANGED_ATTACK_ROLL_BONUS_SUPPORT_PROFILE,
  WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE,
} from "../unit-feature-execution-constants.ts";
import type { UnitFeatureProcedureExecution } from "../character-execution-queries.ts";
import type {
  BoundSupportedAttackActionOption,
  BattleWeaponDamage,
  CharacterUnarmedStrikeActionOption,
  CharacterWeaponAttackActionOption,
  StatBlockAttackActionOption,
  StatBlockAttackDamage,
  StatBlockAttackDamageComponent,
  StaticStatBlockAttackDamage,
  SupportedAttackActionOption,
  SupportedCreatureAttackRollMechanics,
} from "../battle-action-options.ts";
import type { CreatureAttackRollMechanics } from "@dnd/surface/surface/types";
import type { BattleProcedureExecutionRef, CombatantId } from "../identity.ts";
import { sameBattleSubject, type BattleSubject } from "../battle-subjects.ts";
import {
  type AttackDamageRider,
  type AttackTargetConstraint,
  type AttackRollMissToHitReplacement,
  type BattleAttackRollHole,
  type BattleAttackRollResult,
  type CharacterBattleCreatureState,
  type BattleCreatureState,
  type BattleState,
  type BattleTargetSpatialFact,
  type BattleTurnResources,
  type PendingAttackRollMissToHitReplacementContext,
  type SpellMarkedDamageRider,
  type SpellAttackDamageComponent,
  type WeaponDamageDiceRollChoiceFill,
} from "../battle-state-execution.ts";
import { type AttackDamageDieFloorChoiceFill } from "./attack-damage-die-floor-choice.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import {
  isCharacterBattleCreatureState,
  ongoingFeatureProfileForSourceKey,
} from "./creature-state-execution.ts";
import {
  activeRageDamageBonusForFrenzy,
  ongoingFeatureProfileIsRecklessAttackForFrenzy,
} from "./barbarian-frenzy.ts";
import { supportedStatBlockAttackDamage } from "../statblock-attack-damage-support.ts";

export function supportedStatBlockAttackTargetConstraint(
  attack: SupportedCreatureAttackRollMechanics,
): AttackTargetConstraint;
export function supportedStatBlockAttackTargetConstraint(
  attack: Pick<
    CreatureAttackRollMechanics,
    "attackType" | "reachFeet" | "rangeFeet"
  >,
): AttackTargetConstraint | null {
  if (attack.attackType === "melee" && attack.reachFeet !== undefined) {
    return { kind: "meleeReach", reachFeet: movementFeet(attack.reachFeet) };
  }
  if (attack.attackType === "ranged" && attack.rangeFeet !== undefined) {
    return {
      kind: "rangedRange",
      normalFeet: movementFeet(attack.rangeFeet.normal),
      longFeet: movementFeet(attack.rangeFeet.long),
    };
  }

  return null;
}

export function statBlockAttackDamage(
  attack: Extract<
    StatBlockAttackActionOption,
    { readonly damageNotation: "static" }
  >,
): StaticStatBlockAttackDamage;
export function statBlockAttackDamage(
  attack: StatBlockAttackActionOption,
): StatBlockAttackDamage;
export function statBlockAttackDamage(
  attack: StatBlockAttackActionOption,
): StatBlockAttackDamage {
  return supportedStatBlockAttackDamage(attack.attack);
}

export function statBlockAttackTargetConstraint(
  attack: StatBlockAttackActionOption,
): AttackTargetConstraint {
  return supportedStatBlockAttackTargetConstraint(attack.attack);
}

export function statBlockAttackBonus(
  attack: StatBlockAttackActionOption,
): AttackBonus {
  return attackBonus(attack.attack.attackBonus.value);
}

export function attackTargetConstraint(
  attack: SupportedAttackActionOption,
): AttackTargetConstraint {
  return Match.value(attack).pipe(
    Match.when({ kind: "statBlockAttack" }, (option) =>
      statBlockAttackTargetConstraint(option),
    ),
    Match.when({ kind: "weapon" }, (option) =>
      weaponTargetConstraint(option.weapon),
    ),
    Match.when({ kind: "unarmedStrike" }, () => ({
      kind: "meleeReach" as const,
      reachFeet: movementFeet(5),
    })),
    Match.exhaustive,
  );
}

export function attackCanCarryKnockOutChoice(
  attack: SupportedAttackActionOption,
): boolean {
  return attackTargetConstraint(attack).kind === "meleeReach";
}

export function weaponTargetConstraint(
  weapon: CharacterWeaponAttackActionOption["weapon"],
): AttackTargetConstraint {
  const properties = weapon.properties;
  if (weapon.usage === "ranged") {
    const ammunition = properties.find(
      (property) => property.kind === "ammunition",
    );
    const thrown = properties.find((property) => property.kind === "thrown");
    const range = ammunition?.range ?? thrown?.range;
    if (range == null) {
      throw new Error("Ranged Battle Attack requires weapon range.");
    }
    return {
      kind: "rangedRange",
      normalFeet: movementFeet(range.normal),
      longFeet: movementFeet(range.long),
    };
  }

  return {
    kind: "meleeReach",
    reachFeet: properties.some((property) => property.kind === "reach")
      ? movementFeet(10)
      : movementFeet(5),
  };
}

export function selectedWeaponDamage(
  weapon: CharacterWeaponAttackActionOption["weapon"],
): BattleWeaponDamage {
  if (weapon.damage.kind !== "dice") {
    throw new Error("Battle Attack requires dice weapon damage.");
  }

  return weapon.damage;
}

export function attackActionOptionName(
  attack: SupportedAttackActionOption,
): string {
  return Match.value(attack).pipe(
    Match.when(
      { kind: "weapon" },
      (weaponAttack) => weaponAttack.weapon.weaponUnitId,
    ),
    Match.when({ kind: "unarmedStrike" }, () => "Unarmed Strike"),
    Match.when({ kind: "statBlockAttack" }, () => "Stat Block Attack"),
    Match.exhaustive,
  );
}

export function attackActionVariantOptions(
  attack: BoundSupportedAttackActionOption,
): readonly BoundSupportedAttackActionOption[];
export function attackActionVariantOptions(
  attack: SupportedAttackActionOption,
): readonly SupportedAttackActionOption[];
export function attackActionVariantOptions(
  attack: SupportedAttackActionOption,
): readonly SupportedAttackActionOption[] {
  if (attack.kind !== "weapon") {
    return [attack];
  }
  return characterWeaponAttackAbilityOptions(attack).flatMap((abilityOption) =>
    characterWeaponAttackDamageTypeOptions(abilityOption),
  );
}

function characterWeaponAttackAbilityOptions(
  attack: CharacterWeaponAttackActionOption,
): readonly CharacterWeaponAttackActionOption[] {
  if (attack.alternateAbilityChoices === undefined) {
    return [attack];
  }
  const { alternateAbilityChoices: _alternateAbilityChoices, ...baseAttack } =
    attack;
  const {
    attackDamageAbilityModifierChoice: _baseAttackDamageAbilityModifierChoice,
    ...baseAttackWithoutAbilityModifierChoice
  } = baseAttack;
  return [
    baseAttack,
    ...attack.alternateAbilityChoices.map((choice) => ({
      ...baseAttackWithoutAbilityModifierChoice,
      ...choice,
    })),
  ];
}

function characterWeaponAttackDamageTypeOptions(
  attack: CharacterWeaponAttackActionOption,
): readonly CharacterWeaponAttackActionOption[] {
  if (
    attack.damageTypeChoices === undefined ||
    attack.weapon.damage.kind !== "dice"
  ) {
    return [attack];
  }
  return attack.damageTypeChoices.map((damageType) =>
    weaponAttackWithDamageType(attack, damageType),
  );
}

function weaponAttackWithDamageType(
  attack: CharacterWeaponAttackActionOption,
  damageType: DamageType,
): CharacterWeaponAttackActionOption {
  const { damageTypeChoices: _damageTypeChoices, ...attackWithoutChoices } =
    attack;
  return {
    ...attackWithoutChoices,
    weapon: {
      ...attack.weapon,
      damage: { ...attack.weapon.damage, damageType },
    },
  };
}

export function attackDamage(attack: SupportedAttackActionOption): {
  readonly dice: number;
  readonly dieSize: number;
  readonly flat?: number;
  readonly damageType: DamageType;
} {
  return Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, (weaponAttack) =>
      selectedWeaponDamage(weaponAttack.weapon),
    ),
    Match.when({ kind: "unarmedStrike" }, (unarmedStrike) =>
      unarmedStrikeAttackDamage(unarmedStrike),
    ),
    Match.when({ kind: "statBlockAttack" }, (statBlockAttack) => {
      const [damage] = statBlockAttackDamage(statBlockAttack).baseComponents;
      return {
        dice: damage.expr.dice,
        dieSize: damage.expr.dieSize,
        ...(damage.expr.flat === undefined ? {} : { flat: damage.expr.flat }),
        damageType: damage.damageType,
      };
    }),
    Match.exhaustive,
  );
}

export function unarmedStrikeAttackDamage(
  attack: CharacterUnarmedStrikeActionOption,
): {
  readonly dice: number;
  readonly dieSize: number;
  readonly flat?: number;
  readonly damageType: DamageType;
} {
  return Match.value(attack.effect.damage).pipe(
    Match.when({ kind: "base" }, (damage) => ({
      dice: 0,
      dieSize: 1,
      flat: damage.flat,
      damageType: damage.damageType,
    })),
    Match.when({ kind: "mechanicalReplacement" }, (damage) => ({
      dice: damage.dice,
      dieSize: damage.dieSize,
      damageType: damage.damageType,
    })),
    Match.when({ kind: "procedureReplacement" }, (damage) => ({
      dice: damage.dice,
      dieSize: damage.dieSize,
      damageType: damage.damageType,
    })),
    Match.exhaustive,
  );
}

export function unarmedStrikeDamageDiceExpr(
  attack: CharacterUnarmedStrikeActionOption,
  critical: boolean,
): DiceExpr | null {
  return Match.value(attack.effect.damage).pipe(
    Match.when({ kind: "base" }, () => null),
    Match.when({ kind: "mechanicalReplacement" }, (damage) => ({
      dice: critical ? damage.dice * 2 : damage.dice,
      dieSize: damage.dieSize,
    })),
    Match.when({ kind: "procedureReplacement" }, (damage) => ({
      dice: critical ? damage.dice * 2 : damage.dice,
      dieSize: damage.dieSize,
    })),
    Match.exhaustive,
  );
}

export type AttackDamageComponent = {
  readonly expr: DiceExpr;
  readonly damageType: DamageType;
  readonly operation?: "add" | "subtract";
  readonly minimumDamageTotal?: 1;
};

export function attackDamageRiderDiceCount(
  profile: Extract<
    UnitFeatureProcedureExecution,
    { readonly kind: "attackDamageRider" }
  >,
  rageDamageBonus: number,
): number {
  return profile.dice.kind === "rageDamageBonus"
    ? rageDamageBonus
    : profile.dice.diceByLevel.reduce(
        (current, tier) =>
          Number(profile.classLevel) >= tier.atLevel
            ? Math.max(current, tier.count)
            : current,
        0,
      );
}

export function attackDamageRiderForProfile(
  profile: Extract<
    UnitFeatureProcedureExecution,
    { readonly kind: "attackDamageRider" }
  >,
  procedureRef: BattleProcedureExecutionRef,
  attackerId: CombatantId,
  damageType: DamageType,
  rageDamageBonus: number,
): AttackDamageRider | null {
  const dice = attackDamageRiderDiceCount(profile, rageDamageBonus);
  return dice > 0
    ? {
        attackerId,
        procedureRef,
        optional: profile.optional,
        damage: {
          dice,
          dieSize: profile.dice.dieSize,
          damageType,
        },
      }
    : null;
}

export function weaponAttackSupportsFinesseOrRanged(
  attack: SupportedAttackActionOption,
): attack is CharacterWeaponAttackActionOption {
  return (
    attack.kind === "weapon" &&
    (attack.weapon.usage === "ranged" ||
      attack.weapon.properties.some((property) => property.kind === "finesse"))
  );
}

function attackUsesStrengthWeaponOrUnarmedStrike(
  attack: SupportedAttackActionOption,
): attack is
  | CharacterWeaponAttackActionOption
  | CharacterUnarmedStrikeActionOption {
  return (
    (attack.kind === "weapon" && attack.ability === "str") ||
    (attack.kind === "unarmedStrike" && attack.attackAbility === "str")
  );
}

function selectedAttackDamageType(
  attack:
    | CharacterWeaponAttackActionOption
    | CharacterUnarmedStrikeActionOption,
): DamageType {
  return attack.kind === "weapon"
    ? selectedWeaponDamage(attack.weapon).damageType
    : attack.effect.damage.damageType;
}

export function targetHasAdjacentNonIncapacitatedAlly(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  facts: readonly BattleTargetSpatialFact[],
): boolean {
  return facts.some((fact) => {
    if (
      fact.kind !== "attackerAllyWithin5FeetOfTarget" ||
      fact.attackerId !== attackerId ||
      fact.targetId !== targetId
    ) {
      return false;
    }
    const ally = state.combatants.get(fact.allyId);
    return (
      ally !== undefined &&
      fact.allyId !== attackerId &&
      fact.allyId !== targetId &&
      !isIncapacitated(ally.conditions)
    );
  });
}

export function eligibleAttackDamageRiders(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
  attackRoll: AttackRollResult,
  targetSpatialFacts: readonly BattleTargetSpatialFact[],
): readonly AttackDamageRider[] {
  const attacker = state.combatants.get(attackerId);
  if (!isCharacterBattleCreatureState(attacker)) {
    return [];
  }
  const profileRiders = attacker.origin.execution.procedureBindings.flatMap(
    (binding): readonly AttackDamageRider[] => {
      if (
        binding.procedure.kind !== "unitFeature" ||
        binding.procedure.execution.kind !== "attackDamageRider"
      ) {
        return [];
      }
      const profile = binding.procedure.execution;
      if (
        state.currentTurnResources.attackDamageRidersUsedThisTurn.some(
          (usage) =>
            usage.attackerId === attackerId &&
            usage.procedureRef === binding.procedureRef,
        )
      ) {
        return [];
      }
      const damageType = selectedAttackDamageTypeForProfile({
        state,
        attacker,
        attackerId,
        attack,
        attackRoll,
        targetId,
        targetSpatialFacts,
        profile,
      });
      if (damageType === null) {
        return [];
      }
      const rider = attackDamageRiderForProfile(
        profile,
        binding.procedureRef,
        attackerId,
        damageType,
        profile.trigger ===
          "rageActiveRecklessStrengthWeaponOrUnarmedStrikeFirstHit" &&
          attackUsesStrengthWeaponOrUnarmedStrike(attack)
          ? (activeRageDamageBonusForFrenzy(attacker, attack)?.damageBonus ?? 0)
          : 0,
      );
      return rider === null ? [] : [rider];
    },
  );
  return [
    ...profileRiders,
    ...huntersPreyColossusSlayerRiders({
      state,
      attacker,
      attackerId,
      targetId,
      attack,
    }),
  ];
}

function huntersPreyColossusSlayerRiders(input: {
  readonly state: BattleState;
  readonly attacker: CharacterBattleCreatureState;
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly attack: SupportedAttackActionOption;
}): readonly AttackDamageRider[] {
  if (input.attack.kind !== "weapon") {
    return [];
  }
  const attack = input.attack;
  const target = input.state.combatants.get(input.targetId);
  if (target === undefined || target.hp >= target.maxHp) {
    return [];
  }
  return input.attacker.origin.execution.procedureBindings.flatMap(
    (binding) => {
      if (
        binding.procedure.kind !== "unitSupportProfile" ||
        typeof binding.procedure.execution !== "object" ||
        binding.procedure.execution.kind !== HUNTERS_PREY_SUPPORT_PROFILE
      ) {
        return [];
      }
      if (
        input.state.currentTurnResources.attackDamageRidersUsedThisTurn.some(
          (usage) =>
            usage.attackerId === input.attackerId &&
            usage.procedureRef === binding.procedureRef,
        )
      ) {
        return [];
      }
      const huntersPrey = binding.procedure.execution.huntersPrey;
      if (
        huntersPrey.kind !== "woundedTargetWeaponDamage" ||
        huntersPrey.damage.kind !== "addAttackDamageDice"
      ) {
        return [];
      }
      return [
        {
          attackerId: input.attackerId,
          procedureRef: binding.procedureRef,
          optional: true,
          damage: {
            dice: huntersPrey.damage.dice.dice,
            dieSize: huntersPrey.damage.dice.dieSize,
            damageType: selectedWeaponDamage(attack.weapon).damageType,
          },
        },
      ];
    },
  );
}

function selectedAttackDamageTypeForProfile(input: {
  readonly state: BattleState;
  readonly attacker: CharacterBattleCreatureState;
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly attack: SupportedAttackActionOption;
  readonly attackRoll: AttackRollResult;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
  readonly profile: Extract<
    UnitFeatureProcedureExecution,
    { readonly kind: "attackDamageRider" }
  >;
}): DamageType | null {
  if (input.profile.trigger === "finesseOrRangedAttackWithAdvantageOrAlly") {
    if (!weaponAttackSupportsFinesseOrRanged(input.attack)) {
      return null;
    }
    const hasRequiredRollContext =
      input.attackRoll.rollMode === "advantage" ||
      (targetHasAdjacentNonIncapacitatedAlly(
        input.state,
        input.attackerId,
        input.targetId,
        input.targetSpatialFacts,
      ) &&
        input.attackRoll.rollMode !== "disadvantage");
    return hasRequiredRollContext
      ? selectedWeaponDamage(input.attack.weapon).damageType
      : null;
  }
  if (
    input.profile.trigger ===
    "rageActiveRecklessStrengthWeaponOrUnarmedStrikeFirstHit"
  ) {
    if (currentActorId(input.state) !== input.attackerId) {
      return null;
    }
    if (!attackUsesStrengthWeaponOrUnarmedStrike(input.attack)) {
      return null;
    }
    const attack = input.attack;
    if (
      !frenzyRecklessAttackWhileRagingUsedThisTurn({
        state: input.state,
        attacker: input.attacker,
        attackerId: input.attackerId,
        attack,
      })
    ) {
      return null;
    }
    return selectedAttackDamageType(attack);
  }
  return null;
}

function frenzyRecklessAttackWhileRagingUsedThisTurn(input: {
  readonly state: BattleState;
  readonly attacker: CharacterBattleCreatureState;
  readonly attackerId: CombatantId;
  readonly attack:
    | CharacterWeaponAttackActionOption
    | CharacterUnarmedStrikeActionOption;
}): boolean {
  const activeRage = activeRageDamageBonusForFrenzy(
    input.attacker,
    input.attack,
  );
  if (activeRage === null || activeRage.damageBonus <= 0) {
    return false;
  }
  return [...input.attacker.activeOngoingFeatureOccurrences.keys()].some(
    (key) => {
      const profile = ongoingFeatureProfileForSourceKey(input.attacker, key);
      return (
        profile?.kind === "ongoingFeature" &&
        ongoingFeatureProfileIsRecklessAttackForFrenzy(profile) &&
        input.state.currentTurnResources.recklessAttackWhileRagingUsedThisTurn.some(
          (usage) =>
            usage.attackerId === input.attackerId &&
            usage.recklessAttackSourceKey === key &&
            usage.rageSourceKey === activeRage.sourceKey,
        )
      );
    },
  );
}

export function selectedAttackDamageRiders(
  eligibleRiders: readonly AttackDamageRider[],
  selectedProcedureRefs: readonly BattleProcedureExecutionRef[] | undefined,
): readonly AttackDamageRider[] | null {
  const mandatoryRiders = eligibleRiders.filter((rider) => !rider.optional);
  if (
    selectedProcedureRefs === undefined ||
    selectedProcedureRefs.length === 0
  ) {
    return mandatoryRiders;
  }
  if (new Set(selectedProcedureRefs).size !== selectedProcedureRefs.length) {
    return null;
  }
  const selected: AttackDamageRider[] = [...mandatoryRiders];
  for (const procedureRef of selectedProcedureRefs) {
    const rider = eligibleRiders.find(
      (candidate) =>
        candidate.procedureRef === procedureRef && candidate.optional,
    );
    if (rider === undefined) {
      return null;
    }
    selected.push(rider);
  }
  return selected;
}

export function attackDamageComponents(
  attack: SupportedAttackActionOption,
  critical: boolean,
  attackRoll?: AttackRollResult,
  attackDamageRiders: readonly AttackDamageRider[] = [],
  spellWeaponDamageRiders: readonly SpellAttackDamageComponent[] = [],
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
): readonly AttackDamageComponent[] {
  const riderComponents = attackDamageRiders.map((rider) => ({
    expr: {
      dice: critical ? rider.damage.dice * 2 : rider.damage.dice,
      dieSize: rider.damage.dieSize,
    },
    damageType: rider.damage.damageType,
  }));
  const spellRiderComponents = spellWeaponDamageRiders.map((rider) => ({
    expr: {
      ...rider.damage.expr,
      dice: critical ? rider.damage.expr.dice * 2 : rider.damage.expr.dice,
    },
    damageType: rider.damage.damageType,
    ...(rider.operation === undefined ? {} : { operation: rider.operation }),
    ...(rider.minimumDamageTotal === undefined
      ? {}
      : { minimumDamageTotal: rider.minimumDamageTotal }),
  }));
  const markedRiderComponents = spellMarkedDamageRiders.map((rider) => ({
    expr: {
      ...rider.damage.expr,
      dice: critical ? rider.damage.expr.dice * 2 : rider.damage.expr.dice,
    },
    damageType: rider.damage.damageType,
  }));
  const baseComponents = Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, (weaponAttack) => {
      const damage = selectedWeaponDamage(weaponAttack.weapon);
      return [
        {
          expr: critical
            ? {
                dice: damage.dice * 2,
                dieSize: damage.dieSize,
              }
            : {
                dice: damage.dice,
                dieSize: damage.dieSize,
              },
          damageType: damage.damageType,
        },
      ];
    }),
    Match.when({ kind: "unarmedStrike" }, (unarmedStrike) => {
      const expr = unarmedStrikeDamageDiceExpr(unarmedStrike, critical);
      return expr === null
        ? []
        : [{ expr, damageType: unarmedStrike.effect.damage.damageType }];
    }),
    Match.when({ kind: "statBlockAttack" }, (statBlockAttack) => {
      const damage = statBlockAttackDamage(statBlockAttack);
      const baseComponents = damage.baseComponents.flatMap((component) =>
        statBlockAttack.damageNotation === "static" &&
        component.static !== undefined
          ? []
          : [statBlockRolledDamageComponent(component, critical)],
      );
      const advantageBonus = damage.advantageBonus;
      if (
        attackRoll?.rollMode !== "advantage" ||
        advantageBonus === undefined
      ) {
        return baseComponents;
      }

      return statBlockAttack.damageNotation === "static" &&
        advantageBonus.static !== undefined
        ? baseComponents
        : [
            ...baseComponents,
            statBlockRolledDamageComponent(advantageBonus, critical),
          ];
    }),
    Match.exhaustive,
  );
  return [
    ...baseComponents,
    ...riderComponents,
    ...spellRiderComponents,
    ...markedRiderComponents,
  ];
}

function statBlockRolledDamageComponent(
  damage: StatBlockAttackDamageComponent,
  critical: boolean,
): AttackDamageComponent {
  return {
    expr: {
      ...damage.expr,
      dice: critical ? damage.expr.dice * 2 : damage.expr.dice,
    },
    damageType: damage.damageType,
  };
}

export function weaponDamageComponent(
  attack: SupportedAttackActionOption,
  critical: boolean,
): AttackDamageComponent | null {
  if (attack.kind !== "weapon") {
    return null;
  }
  const damage = selectedWeaponDamage(attack.weapon);
  return {
    expr: {
      dice: critical ? damage.dice * 2 : damage.dice,
      dieSize: damage.dieSize,
    },
    damageType: damage.damageType,
  };
}

export function attackPotentialDamageTypes(
  attack: SupportedAttackActionOption,
  critical: boolean,
  attackRoll: AttackRollResult,
  eligibleAttackDamageRiders: readonly AttackDamageRider[],
  spellWeaponDamageRiders: readonly SpellAttackDamageComponent[] = [],
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
): readonly DamageType[] {
  return [
    ...new Set(
      attackDamageComponents(
        attack,
        critical,
        attackRoll,
        eligibleAttackDamageRiders,
        spellWeaponDamageRiders,
        spellMarkedDamageRiders,
      ).map((component) => component.damageType),
    ),
  ];
}

export function attackDamageModifier(
  attack: SupportedAttackActionOption,
): number {
  return Match.value(attack).pipe(
    Match.when(
      { kind: "weapon" },
      (weaponAttack) =>
        Number(
          weaponAttack.damageAbilityModifier ?? weaponAttack.abilityModifier,
        ) + (weaponAttack.damageBonus ?? 0),
    ),
    Match.when(
      { kind: "unarmedStrike" },
      (unarmedStrike) =>
        (unarmedStrike.effect.damage.kind === "base"
          ? unarmedStrike.effect.damage.flat
          : 0) +
        Number(unarmedStrike.damageAbilityModifier) +
        (unarmedStrike.damageBonus ?? 0),
    ),
    Match.when({ kind: "statBlockAttack" }, () => 0),
    Match.exhaustive,
  );
}

export function attackActionBonus(
  attack: SupportedAttackActionOption,
): AttackBonus {
  return Match.value(attack).pipe(
    Match.when(
      { kind: "weapon" },
      (weaponAttack) =>
        weaponAttack.attackBonus ?? attackBonus(weaponAttack.abilityModifier),
    ),
    Match.when(
      { kind: "unarmedStrike" },
      (unarmedStrike) => unarmedStrike.attackBonus,
    ),
    Match.when({ kind: "statBlockAttack" }, (statBlockAttack) =>
      statBlockAttackBonus(statBlockAttack),
    ),
    Match.exhaustive,
  );
}

export function attackActionBonusWithPassiveFeatureBonus(
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
): AttackBonus {
  return attackBonus(
    Number(attackActionBonus(attack)) +
      passiveRangedAttackRollBonus(attacker, attack),
  );
}

export function passiveRangedAttackRollBonus(
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
): number {
  if (
    attacker?.origin.kind !== "character" ||
    attack.kind !== "weapon" ||
    attack.weapon.usage !== "ranged"
  ) {
    return 0;
  }
  for (const binding of attacker.origin.execution.procedureBindings) {
    const procedure = binding.procedure;
    if (
      (procedure.kind === "unitFeature" ||
        procedure.kind === "unitSupportProfile") &&
      typeof procedure.execution === "object" &&
      procedure.execution.kind ===
        PASSIVE_RANGED_ATTACK_ROLL_BONUS_SUPPORT_PROFILE &&
      procedure.execution.attackRoll.weaponFilter.kind === "weaponCategory" &&
      procedure.execution.attackRoll.weaponFilter.category ===
        attack.weapon.usage
    ) {
      return procedure.execution.attackRoll.bonus;
    }
  }
  return 0;
}

export function eligibleWeaponDamageDiceRollChoiceProcedureRefs(
  state: BattleState,
  attackerId: CombatantId,
  attack: SupportedAttackActionOption,
): readonly BattleProcedureExecutionRef[] {
  const attacker = state.combatants.get(attackerId);
  if (attacker?.origin.kind !== "character" || attack.kind !== "weapon") {
    return [];
  }
  return attacker.origin.execution.procedureBindings.flatMap((binding) =>
    binding.procedure.kind === "unitSupportProfile" &&
    binding.procedure.execution ===
      WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE &&
    !state.currentTurnResources.weaponDamageDiceRollChoicesUsedThisTurn.some(
      (usage) =>
        usage.attackerId === attackerId &&
        usage.procedureRef === binding.procedureRef,
    )
      ? [binding.procedureRef]
      : [],
  );
}

export function eligibleAttackDamageDieFloorProcedureRefs(
  state: BattleState,
  attackerId: CombatantId,
  attack: SupportedAttackActionOption,
  attackProcedureRef: BattleProcedureExecutionRef,
): readonly BattleProcedureExecutionRef[] {
  return eligibleAttackDamageDieFloorProcedureRefsForAttacker(
    state.combatants.get(attackerId),
    attack,
    attackProcedureRef,
  );
}

export function eligibleAttackDamageDieFloorProcedureRefsForAttacker(
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
  attackProcedureRef: BattleProcedureExecutionRef,
): readonly BattleProcedureExecutionRef[] {
  if (
    attacker?.origin.kind !== "character" ||
    attack.kind !== "weapon" ||
    attack.weapon.usage !== "melee" ||
    !weaponHasTwoHandedOrVersatileProperty(attack.weapon)
  ) {
    return [];
  }
  const mainWeapon = attacker.origin.selectedLoadout.weapon;
  if (
    mainWeapon === undefined ||
    attacker.origin.attack?.procedureRef !== attackProcedureRef ||
    mainWeapon.grip !== "two_handed"
  ) {
    return [];
  }
  return attacker.origin.execution.procedureBindings.flatMap((binding) =>
    binding.procedure.kind === "unitSupportProfile" &&
    binding.procedure.execution === ATTACK_DAMAGE_DIE_FLOOR_SUPPORT_PROFILE
      ? [binding.procedureRef]
      : [],
  );
}

function weaponHasTwoHandedOrVersatileProperty(
  weapon: CharacterWeaponAttackActionOption["weapon"],
): boolean {
  return weapon.properties.some(
    (property) =>
      property.kind === "two_handed" || property.kind === "versatile",
  );
}

export function attackRollMissToHitReplacementHolePayload(
  state: BattleState,
  attackerId: CombatantId,
): Pick<BattleAttackRollHole, "missToHitReplacements"> {
  const attacker = state.combatants.get(attackerId);
  return attacker === undefined
    ? {}
    : attackRollMissToHitReplacementHolePayloadForAttacker(attacker);
}

export function attackRollMissToHitReplacementHolePayloadForAttacker(
  attacker: BattleCreatureState,
): Pick<BattleAttackRollHole, "missToHitReplacements"> {
  const missToHitReplacements =
    eligibleAttackRollMissToHitReplacements(attacker);
  return missToHitReplacements.length === 0 ? {} : { missToHitReplacements };
}

export function eligibleAttackRollMissToHitReplacements(
  attacker: BattleCreatureState | undefined,
): readonly AttackRollMissToHitReplacement[] {
  if (attacker?.origin.kind !== "character") {
    return [];
  }
  return attacker.origin.execution.procedureBindings.flatMap((binding) =>
    binding.procedure.kind === "unitSupportProfile" &&
    typeof binding.procedure.execution === "object" &&
    binding.procedure.execution.kind ===
      ATTACK_ROLL_MISS_TO_HIT_REPLACEMENT_SUPPORT_PROFILE &&
    !attacker.attackRollMissToHitReplacementsUsedSinceTurnStart.some(
      (usage) => usage.procedureRef === binding.procedureRef,
    )
      ? [{ procedureRef: binding.procedureRef }]
      : [],
  );
}

export function selectedAttackRollMissToHitReplacement(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly attackRoll: BattleAttackRollResult;
  readonly ordinaryHit: boolean;
}): AttackRollMissToHitReplacement | null {
  if (input.attackRoll.missToHitReplacementProcedureRef === undefined) {
    return null;
  }
  if (input.ordinaryHit) {
    return null;
  }
  return attackRollMissToHitReplacementForProcedure(
    input.state,
    input.attackerId,
    input.attackRoll.missToHitReplacementProcedureRef,
    {
      subject: input.subject,
      targetId: input.targetId,
      attackRoll: input.attackRoll,
    },
  );
}

export function attackRollMissToHitReplacementForProcedure(
  state: BattleState,
  attackerId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
  context: PendingAttackRollMissToHitReplacementContext,
): AttackRollMissToHitReplacement | null {
  const attacker = state.combatants.get(attackerId);
  if (attacker?.origin.kind !== "character") {
    return null;
  }
  const hasReplacementProfile =
    attacker.origin.execution.procedureBindings.some(
      (binding) =>
        binding.procedureRef === procedureRef &&
        binding.procedure.kind === "unitSupportProfile" &&
        typeof binding.procedure.execution === "object" &&
        binding.procedure.execution.kind ===
          ATTACK_ROLL_MISS_TO_HIT_REPLACEMENT_SUPPORT_PROFILE,
    );
  if (!hasReplacementProfile) {
    return null;
  }
  const pendingSelection =
    state.currentTurnResources.pendingAttackRollMissToHitReplacementSelection;
  return (pendingSelection?.attackerId === attackerId &&
    pendingSelection.procedureRef === procedureRef &&
    samePendingAttackRollMissToHitReplacementContext(
      pendingSelection.context,
      context,
    )) ||
    eligibleAttackRollMissToHitReplacements(attacker).some(
      (replacement) => replacement.procedureRef === procedureRef,
    )
    ? { procedureRef }
    : null;
}

export function recordAttackRollMissToHitReplacementUsed(
  state: BattleState,
  attackerId: CombatantId,
  replacement: AttackRollMissToHitReplacement | null,
  context: PendingAttackRollMissToHitReplacementContext,
): BattleState {
  if (replacement === null) {
    return state;
  }
  const attacker = state.combatants.get(attackerId);
  if (attacker === undefined) {
    return state;
  }
  const alreadyUsed =
    attacker.attackRollMissToHitReplacementsUsedSinceTurnStart.some(
      (usage) => usage.procedureRef === replacement.procedureRef,
    );
  return {
    ...state,
    combatants: new Map(state.combatants).set(attackerId, {
      ...attacker,
      attackRollMissToHitReplacementsUsedSinceTurnStart: alreadyUsed
        ? attacker.attackRollMissToHitReplacementsUsedSinceTurnStart
        : [
            ...attacker.attackRollMissToHitReplacementsUsedSinceTurnStart,
            { procedureRef: replacement.procedureRef },
          ],
    }),
    currentTurnResources: {
      ...state.currentTurnResources,
      pendingAttackRollMissToHitReplacementSelection: {
        attackerId,
        procedureRef: replacement.procedureRef,
        context,
      },
    },
  };
}

export function samePendingAttackRollMissToHitReplacementContext(
  left: PendingAttackRollMissToHitReplacementContext,
  right: PendingAttackRollMissToHitReplacementContext,
): boolean {
  return (
    left.targetId === right.targetId &&
    sameBattleSubject(left.subject, right.subject) &&
    sameAttackRollMissToHitReplacementRoll(left.attackRoll, right.attackRoll)
  );
}

export function sameAttackRollMissToHitReplacementRoll(
  left: BattleAttackRollResult,
  right: BattleAttackRollResult,
): boolean {
  return (
    left.total === right.total &&
    left.naturalD20 === right.naturalD20 &&
    left.rollMode === right.rollMode &&
    left.activatedOngoingFeatureProcedureRef ===
      right.activatedOngoingFeatureProcedureRef &&
    left.missToHitReplacementProcedureRef ===
      right.missToHitReplacementProcedureRef
  );
}

export function clearPendingAttackRollMissToHitReplacementSelection(
  resources: BattleTurnResources,
  attackerId: CombatantId,
): BattleTurnResources {
  const pending = resources.pendingAttackRollMissToHitReplacementSelection;
  if (pending?.attackerId !== attackerId) {
    return resources;
  }
  const {
    pendingAttackRollMissToHitReplacementSelection: _completedSelection,
    ...withoutPendingSelection
  } = resources;
  return withoutPendingSelection;
}

export function selectedWeaponDamageDiceRollChoice(
  eligibleProcedureRefs: readonly BattleProcedureExecutionRef[],
  choice: WeaponDamageDiceRollChoiceFill | undefined,
): WeaponDamageDiceRollChoiceFill | null {
  if (choice === undefined) {
    return null;
  }
  return eligibleProcedureRefs.includes(choice.procedureRef) ? choice : null;
}

export function selectedAttackDamageDieFloorChoice(
  eligibleProcedureRefs: readonly BattleProcedureExecutionRef[],
  choice: AttackDamageDieFloorChoiceFill | undefined,
): AttackDamageDieFloorChoiceFill | null {
  if (choice === undefined) {
    return null;
  }
  return eligibleProcedureRefs.includes(choice.procedureRef) ? choice : null;
}

export function weaponAttackDamageExpression(
  attack: SupportedAttackActionOption,
  critical = false,
  attackRoll?: AttackRollResult,
  attackDamageRiders: readonly AttackDamageRider[] = [],
  spellWeaponDamageRiders: readonly SpellAttackDamageComponent[] = [],
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
  ongoingDamageModifier = 0,
): string {
  const damage = attackDamage(attack);
  const components = attackDamageComponents(
    attack,
    critical,
    attackRoll,
    attackDamageRiders,
    spellWeaponDamageRiders,
    spellMarkedDamageRiders,
  );
  const attackLevelDamageModifier =
    attackDamageModifier(attack) + ongoingDamageModifier;

  if (
    attack.kind === "statBlockAttack" &&
    damageComponentTypes(components) > 1
  ) {
    return components
      .map((component, index) =>
        statBlockTypedDamageComponentExpression(
          component,
          index,
          index === 0 ? attackLevelDamageModifier : 0,
        ),
      )
      .join("");
  }

  const modifier = signedModifier(
    attackLevelDamageModifier + damageComponentFlatModifier(components),
  );

  return `${components
    .map((component, index) => {
      const sign = component.operation === "subtract" ? "-" : "+";
      const dice = `${component.expr.dice}d${component.expr.dieSize}`;
      return index === 0 && sign === "+" ? dice : `${sign}${dice}`;
    })
    .join("")}${modifier}-${damage.damageType}`;
}

function damageComponentFlatModifier(
  components: readonly AttackDamageComponent[],
): number {
  return components.reduce(
    (total, component) =>
      total +
      (component.operation === "subtract" ? -1 : 1) *
        (component.expr.flat ?? 0),
    0,
  );
}

function damageComponentTypes(
  components: readonly AttackDamageComponent[],
): number {
  return new Set(components.map((component) => component.damageType)).size;
}

function statBlockTypedDamageComponentExpression(
  component: AttackDamageComponent,
  index: number,
  attackLevelDamageModifier: number,
): string {
  const sign = component.operation === "subtract" ? "-" : "+";
  const dice = `${component.expr.dice}d${component.expr.dieSize}`;
  const prefix = index === 0 && sign === "+" ? "" : sign;
  return `${prefix}${dice}${signedModifier(
    (component.expr.flat ?? 0) + attackLevelDamageModifier,
  )}-${component.damageType}`;
}

export function signedModifier(modifier: number): string {
  if (modifier === 0) {
    return "";
  }

  return modifier > 0 ? `+${modifier}` : `${modifier}`;
}
