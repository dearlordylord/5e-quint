// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.ATTACK_CONTROL
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type {
  CreatureNamedAttackRoll,
  DiceExpr,
} from "@dnd/surface/surface/types";
import type {
  StatBlockAttackDamage,
  StatBlockAttackDamageComponent,
  SupportedCreatureNamedAttackRoll,
} from "./battle-action-options.ts";

type SupportedStatBlockAttackDamageEffect =
  | {
      readonly kind: "base";
      readonly component: StatBlockAttackDamageComponent;
    }
  | {
      readonly kind: "advantageBonus";
      readonly component: StatBlockAttackDamageComponent;
    };

export function supportedStatBlockAttackDamage(
  attack: SupportedCreatureNamedAttackRoll,
): StatBlockAttackDamage;
export function supportedStatBlockAttackDamage(
  attack: CreatureNamedAttackRoll,
): StatBlockAttackDamage | null;
export function supportedStatBlockAttackDamage(
  attack: CreatureNamedAttackRoll,
): StatBlockAttackDamage | null {
  const effects: SupportedStatBlockAttackDamageEffect[] = [];
  for (const effect of attack.onHit) {
    const parsed = supportedStatBlockAttackDamageEffect(effect);
    if (parsed === null) {
      return null;
    }
    effects.push(parsed);
  }
  const baseComponents = nonEmpty(
    effects.flatMap((effect) =>
      effect.kind === "base" ? [effect.component] : [],
    ),
  );
  if (baseComponents === null) {
    return null;
  }

  const advantageBonuses = effects.flatMap((effect) =>
    effect.kind === "advantageBonus" ? [effect.component] : [],
  );
  if (advantageBonuses.length > 1) {
    return null;
  }
  const advantageBonus = advantageBonuses[0];
  if (
    advantageBonus !== undefined &&
    advantageBonus.damageType !== baseComponents[0].damageType
  ) {
    return null;
  }
  const advantageBonusIndex = effects.findIndex(
    (effect) => effect.kind === "advantageBonus",
  );
  if (
    advantageBonusIndex > 0 &&
    advantageBonusIndex < effects.length - 1
  ) {
    return null;
  }

  return {
    baseComponents,
    ...(advantageBonus === undefined ? {} : { advantageBonus }),
  };
}

function supportedStatBlockAttackDamageEffect(
  effect: CreatureNamedAttackRoll["onHit"][number],
): SupportedStatBlockAttackDamageEffect | null {
  const base = supportedStatBlockBaseDamageEffect(effect);
  if (base !== null) {
    return { kind: "base", component: base };
  }
  const advantageBonus = supportedStatBlockAdvantageBonusDamageEffect(effect);
  return advantageBonus === null
    ? null
    : { kind: "advantageBonus", component: advantageBonus };
}

function supportedStatBlockBaseDamageEffect(
  effect: CreatureNamedAttackRoll["onHit"][number],
): StatBlockAttackDamageComponent | null {
  if (
    effect.kind !== "damage" ||
    effect.amount.kind !== "fixed" ||
    typeof effect.damageType !== "string"
  ) {
    return null;
  }

  const staticDamage = statBlockDamageNotationStaticAmount(effect.amount);
  return {
    expr: effect.amount.expr,
    ...(staticDamage === undefined ? {} : { static: staticDamage }),
    damageType: effect.damageType,
  };
}

function supportedStatBlockAdvantageBonusDamageEffect(
  effect: CreatureNamedAttackRoll["onHit"][number],
): StatBlockAttackDamageComponent | null {
  if (
    effect.kind !== "conditional_bonus_damage" ||
    effect.when.kind !== "attack_roll_had_advantage" ||
    effect.amount.kind !== "fixed" ||
    typeof effect.damageType !== "string"
  ) {
    return null;
  }

  const staticDamage = statBlockDamageNotationStaticAmount(effect.amount);
  return {
    expr: effect.amount.expr,
    ...(staticDamage === undefined ? {} : { static: staticDamage }),
    damageType: effect.damageType,
  };
}

function statBlockDamageNotationStaticAmount(
  amount: {
    readonly kind: "fixed";
    readonly expr: DiceExpr;
    readonly static?: number;
  },
): number | undefined {
  return "static" in amount && typeof amount.static === "number"
    ? amount.static
    : undefined;
}

export function statBlockAttackDamageSupportsStaticNotation(
  damage: StatBlockAttackDamage,
): boolean {
  return (
    damage.baseComponents.every((component) => component.static !== undefined) &&
    (damage.advantageBonus === undefined ||
      damage.advantageBonus.static !== undefined)
  );
}

function nonEmpty<T>(
  values: readonly T[],
): ReadonlyNonEmptyArray<T> | null {
  const [first, ...rest] = values;
  return first === undefined ? null : [first, ...rest];
}
