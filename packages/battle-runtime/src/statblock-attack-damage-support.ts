// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-DAMAGE-PROCEDURE-001
// UNIT-PROFILE-COVERAGE: runtime-owner stat-block.attack-procedure
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.ATTACK_PROCEDURE
import { optionalProperty } from "./optional-property.ts";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type {
  CreatureAttackRollMechanics,
  DiceExpr,
} from "@dnd/surface/surface/types";
import { Brand, Either, Match } from "effect";
import type {
  SelectedStatBlockAttackDamage,
  SelectedStatBlockAttackDamageComponent,
  SelectedStatBlockAttackDamageComponents,
  SelectedStatBlockAttackRollMechanics,
  StatBlockAttackDamage,
  StatBlockAttackDamageComponent,
  SupportedCreatureAttackRollMechanics,
} from "./battle-action-options.ts";
import { statBlockAttackDamageSelectionForDamage } from "./battle-action-options.ts";
import {
  supportedStatBlockAttackHitConditionRiderEffect,
  supportedStatBlockAttackHitConditionRiders,
} from "./statblock-attack-hit-condition-support.ts";
import {
  statBlockAdvantageBonusDamageComponentRef,
  statBlockAttackDamageComponentRefsMatchSelectionRoles,
  parseStatBlockBaseDamageComponentOrdinal,
  statBlockBaseDamageComponentRef,
  statBlockAttackDamageSelectionKey,
  STAT_BLOCK_DAMAGE_COMPONENT_NOTATIONS,
  type StatBlockAttackDamageComponentRef,
  type StatBlockDamageComponentNotation,
} from "./stat-block-attack-damage-selection.ts";

type CreatureAttackHitEffects = Pick<CreatureAttackRollMechanics, "onHit">;

type SupportedStatBlockAttackDamageEffect =
  | {
      readonly kind: "base";
      readonly component: UnreferencedStatBlockAttackDamageComponent;
    }
  | {
      readonly kind: "advantageBonus";
      readonly component: UnreferencedStatBlockAttackDamageComponent;
    };

type UnreferencedStatBlockAttackDamageComponent =
  | Omit<
      Extract<StatBlockAttackDamageComponent, { readonly expr: DiceExpr }>,
      "componentRef"
    >
  | Omit<
      Extract<StatBlockAttackDamageComponent, { readonly static: number }>,
      "componentRef"
    >;

const selectedStatBlockAttackDamage =
  Brand.nominal<SelectedStatBlockAttackDamage>();

export function parseSelectedStatBlockAttackDamage(
  damage: SelectedStatBlockAttackDamageComponents,
) {
  return selectedStatBlockAttackDamageHasCanonicalComponentRefs(damage)
    ? Either.right(selectedStatBlockAttackDamage(damage))
    : Either.left({ kind: "nonCanonicalStatBlockAttackDamageRoles" } as const);
}

export function supportedStatBlockAttackDamage(
  attack: SupportedCreatureAttackRollMechanics,
): StatBlockAttackDamage;
export function supportedStatBlockAttackDamage(
  attack: CreatureAttackHitEffects,
): StatBlockAttackDamage | null;
export function supportedStatBlockAttackDamage(
  attack: CreatureAttackHitEffects,
): StatBlockAttackDamage | null {
  const effects: SupportedStatBlockAttackDamageEffect[] = [];
  for (const effect of attack.onHit) {
    const parsed = supportedStatBlockAttackDamageEffect(effect);
    if (parsed === null) {
      if (supportedStatBlockAttackHitConditionRiderEffect(effect) !== null) {
        continue;
      }
      return null;
    }
    effects.push(parsed);
  }
  const unreferencedBaseComponents = nonEmpty(
    effects.flatMap((effect) =>
      effect.kind === "base" ? [effect.component] : [],
    ),
  );
  if (unreferencedBaseComponents === null) {
    return null;
  }
  const referencedBaseComponents = Either.all(
    unreferencedBaseComponents.map((component, index) =>
      Either.map(
        parseStatBlockBaseDamageComponentOrdinal(index + 1),
        (ordinal) =>
          withStatBlockDamageComponentRef(
            component,
            statBlockBaseDamageComponentRef(ordinal),
          ),
      ),
    ),
  );
  if (Either.isLeft(referencedBaseComponents)) {
    return null;
  }
  const baseComponents = nonEmpty(referencedBaseComponents.right);
  if (baseComponents === null) {
    return null;
  }

  const advantageBonuses = effects.flatMap((effect) =>
    effect.kind === "advantageBonus" ? [effect.component] : [],
  );
  if (advantageBonuses.length > 1) {
    return null;
  }
  const unreferencedAdvantageBonus = advantageBonuses[0];
  const advantageBonus =
    unreferencedAdvantageBonus === undefined
      ? undefined
      : withStatBlockDamageComponentRef(
          unreferencedAdvantageBonus,
          statBlockAdvantageBonusDamageComponentRef,
        );
  if (
    advantageBonus !== undefined &&
    advantageBonus.damageType !== baseComponents[0].damageType
  ) {
    return null;
  }
  const advantageBonusIndex = effects.findIndex(
    (effect) => effect.kind === "advantageBonus",
  );
  if (advantageBonusIndex > 0 && advantageBonusIndex < effects.length - 1) {
    return null;
  }

  return {
    baseComponents,
    ...optionalProperty("advantageBonus", advantageBonus),
  };
}

function supportedStatBlockAttackDamageEffect(
  effect: CreatureAttackRollMechanics["onHit"][number],
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

/**
 * The individual damage branch used by the complete attack support profile.
 * Keeping this next to the selected-damage projection prevents admission and
 * projection from growing separate effect-shape allowlists.
 */
export function statBlockAttackDamageEffectIsSupported(
  effect: CreatureAttackRollMechanics["onHit"][number],
): boolean {
  return supportedStatBlockAttackDamageEffect(effect) !== null;
}

function supportedStatBlockBaseDamageEffect(
  effect: CreatureAttackRollMechanics["onHit"][number],
): UnreferencedStatBlockAttackDamageComponent | null {
  if (
    effect.kind !== "damage" ||
    effect.amount.kind !== "fixed" ||
    typeof effect.damageType !== "string"
  ) {
    return null;
  }

  if (!("expr" in effect.amount)) {
    return { static: effect.amount.static, damageType: effect.damageType };
  }
  return statBlockDamageComponent(effect.amount, effect.damageType);
}

function supportedStatBlockAdvantageBonusDamageEffect(
  effect: CreatureAttackRollMechanics["onHit"][number],
): UnreferencedStatBlockAttackDamageComponent | null {
  if (
    effect.kind !== "conditional_bonus_damage" ||
    effect.when.kind !== "attack_roll_had_advantage" ||
    effect.amount.kind !== "fixed" ||
    typeof effect.damageType !== "string"
  ) {
    return null;
  }

  if (!("expr" in effect.amount)) {
    return { static: effect.amount.static, damageType: effect.damageType };
  }
  return statBlockDamageComponent(effect.amount, effect.damageType);
}

function statBlockDamageComponent(
  amount: {
    readonly kind: "fixed";
    readonly expr: DiceExpr;
    readonly static?: number;
  },
  damageType: StatBlockAttackDamageComponent["damageType"],
): UnreferencedStatBlockAttackDamageComponent {
  const staticDamage = printedStatBlockDamageAmount(amount);
  return {
    expr: amount.expr,
    ...optionalProperty("static", staticDamage),
    damageType,
  };
}

function printedStatBlockDamageAmount(amount: {
  readonly kind: "fixed";
  readonly expr: DiceExpr;
  readonly static?: number;
}): number | undefined {
  return "static" in amount && typeof amount.static === "number"
    ? amount.static
    : undefined;
}

export function selectedStatBlockAttackRollOptions(
  attack: SupportedCreatureAttackRollMechanics,
): readonly SelectedStatBlockAttackRollMechanics[] {
  const damage = supportedStatBlockAttackDamage(attack);
  const [conditionRider] = supportedStatBlockAttackHitConditionRiders(attack);
  return selectedStatBlockAttackDamageOptions(damage).map(
    (selectedDamage): SelectedStatBlockAttackRollMechanics => {
      const onHit = {
        damage: selectedDamage,
        ...optionalProperty("conditionRider", conditionRider),
      };
      const common = {
        attackAbility: attack.attackAbility,
        attackBonus: attack.attackBonus,
        onHit,
      };
      return Match.value(attack).pipe(
        Match.when({ attackType: "melee" }, (meleeAttack) => ({
          ...common,
          attackType: meleeAttack.attackType,
          reachFeet: meleeAttack.reachFeet,
        })),
        Match.when({ attackType: "ranged" }, (rangedAttack) => ({
          ...common,
          attackType: rangedAttack.attackType,
          rangeFeet: rangedAttack.rangeFeet,
          ...optionalProperty("ammunition", rangedAttack.ammunition),
        })),
        Match.exhaustive,
      );
    },
  );
}

export function selectedStatBlockAttackDamageOptions(
  damage: StatBlockAttackDamage,
): readonly SelectedStatBlockAttackDamage[] {
  const [firstBaseComponent, ...remainingBaseComponents] =
    damage.baseComponents;
  const firstComponentOptions =
    selectedStatBlockDamageComponentOptions(firstBaseComponent);
  const baseOptions = remainingBaseComponents.reduce<
    readonly ReadonlyNonEmptyArray<SelectedStatBlockAttackDamageComponent>[]
  >(
    (options, component) =>
      options.flatMap((baseOption) =>
        selectedStatBlockDamageComponentOptions(component).map(
          (
            selectedComponent,
          ): ReadonlyNonEmptyArray<SelectedStatBlockAttackDamageComponent> => [
            ...baseOption,
            selectedComponent,
          ],
        ),
      ),
    firstComponentOptions.map((component) => [component]),
  );
  const advantageBonus = damage.advantageBonus;
  const options: readonly SelectedStatBlockAttackDamageComponents[] =
    advantageBonus === undefined
      ? baseOptions.map((baseComponents) => ({ baseComponents }))
      : baseOptions.flatMap((baseComponents) =>
          selectedStatBlockDamageComponentOptions(advantageBonus).map(
            (advantageBonus) => ({
              baseComponents,
              advantageBonus,
            }),
          ),
        );
  return deduplicatedSelectedStatBlockAttackDamageOptions(
    options.flatMap((option) => {
      const parsed = parseSelectedStatBlockAttackDamage(option);
      return Either.isRight(parsed) ? [parsed.right] : [];
    }),
  );
}

function deduplicatedSelectedStatBlockAttackDamageOptions(
  options: readonly SelectedStatBlockAttackDamage[],
): readonly SelectedStatBlockAttackDamage[] {
  const seenSelectionKeys = new Set<string>();
  return options.filter((option) => {
    const selectionKey = statBlockAttackDamageSelectionKey(
      statBlockAttackDamageSelectionForDamage(option),
    );
    if (seenSelectionKeys.has(selectionKey)) return false;
    seenSelectionKeys.add(selectionKey);
    return true;
  });
}

function selectedStatBlockDamageComponentOptions(
  component: StatBlockAttackDamageComponent,
): readonly SelectedStatBlockAttackDamageComponent[] {
  const notations: readonly StatBlockDamageComponentNotation[] =
    STAT_BLOCK_DAMAGE_COMPONENT_NOTATIONS.filter((notation) =>
      Match.value(notation).pipe(
        Match.when(
          "rolled",
          () => "expr" in component && component.expr.dice > 0,
        ),
        Match.when("static", () => component.static !== undefined),
        Match.exhaustive,
      ),
    );
  return notations.flatMap((notation) => {
    const selected = selectedStatBlockDamageComponent(component, notation);
    return selected === null ? [] : [selected];
  });
}

function selectedStatBlockDamageComponent(
  component: StatBlockAttackDamageComponent,
  notation: StatBlockDamageComponentNotation,
): SelectedStatBlockAttackDamageComponent | null {
  return Match.value(notation).pipe(
    Match.when("static", () =>
      component.static === undefined
        ? null
        : {
            kind: "fixed" as const,
            componentRef: component.componentRef,
            amount: component.static,
            damageType: component.damageType,
          },
    ),
    Match.when("rolled", () =>
      "expr" in component && component.expr.dice > 0
        ? {
            kind: "rolled" as const,
            componentRef: component.componentRef,
            expr: component.expr,
            damageType: component.damageType,
          }
        : null,
    ),
    Match.exhaustive,
  );
}

export function selectedStatBlockAttackDamageHasCanonicalComponentRefs(
  damage: SelectedStatBlockAttackDamageComponents,
): boolean {
  const [firstBaseComponent, ...remainingBaseComponents] =
    damage.baseComponents;
  return statBlockAttackDamageComponentRefsMatchSelectionRoles([
    firstBaseComponent.componentRef,
    ...remainingBaseComponents.map(({ componentRef }) => componentRef),
    ...(damage.advantageBonus === undefined
      ? []
      : [damage.advantageBonus.componentRef]),
  ]);
}

function withStatBlockDamageComponentRef(
  component: UnreferencedStatBlockAttackDamageComponent,
  componentRef: StatBlockAttackDamageComponentRef,
): StatBlockAttackDamageComponent {
  return { ...component, componentRef };
}

function nonEmpty<T>(values: readonly T[]): ReadonlyNonEmptyArray<T> | null {
  const [first, ...rest] = values;
  return first === undefined ? null : [first, ...rest];
}
