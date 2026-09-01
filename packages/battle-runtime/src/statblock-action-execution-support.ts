import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type {
  CreatureActions,
  CreatureNamedAttackRoll,
  CreatureTrait,
  CreatureTraitEffect,
  CreatureStatBlock,
} from "@dnd/surface/surface/types";
import type { StandaloneStatBlock } from "../../surface/src/surface/stat-block-types.ts";
import { Match } from "effect";
import type {
  StatBlockTraitAttackRollMode,
  SupportedCreatureAttackRollMechanics,
} from "./battle-action-options.ts";
import { creatureAttackRollMechanicsAreSupported } from "./statblock-attack-execution-mechanics.ts";
export { creatureAttackRollMechanicsAreSupported } from "./statblock-attack-execution-mechanics.ts";

export function creatureActionSectionIsSupported(
  actions: CreatureActions | undefined,
): boolean {
  return (
    actions === undefined ||
    (actions.multiattacks === undefined &&
      actions.saves === undefined &&
      actions.supports === undefined &&
      actions.actionOptions === undefined &&
      actions.specials === undefined &&
      (actions.attacks ?? []).every(creatureNamedAttackRollIsSupported))
  );
}

export function creatureNamedAttackRollIsSupported(
  attack: CreatureNamedAttackRoll,
): attack is CreatureNamedAttackRoll & SupportedCreatureAttackRollMechanics {
  return (
    attack.description === undefined &&
    creatureAttackRollMechanicsAreSupported(attack)
  );
}

export function statBlockTraitsAreSupported(
  traits: CreatureStatBlock["traits"] | StandaloneStatBlock["traits"],
): boolean {
  // An untyped trait is retained for presentation, but contributes no
  // runtime fact. Only a typed effect can make a trait ineligible here.
  return (traits ?? []).every(
    (trait) => statBlockTraitSupport(trait).kind !== "unsupported",
  );
}

/**
 * The typed boundary for Stat Block traits. Text-only traits are deliberately
 * distinct from typed effects: presentation may report them, while execution
 * can only consume a supported effect payload. Every CreatureTraitEffect kind
 * is listed below so widening the Surface union cannot silently discard a new
 * rule effect.
 */
export type StatBlockTraitSupport =
  | {
      readonly kind: "textOnly";
    }
  | {
      readonly kind: "supported";
      readonly attackRollMode: StatBlockTraitAttackRollMode;
    }
  | {
      readonly kind: "unsupported";
      readonly effect: CreatureTraitEffect;
    };

export function statBlockTraitSupport(
  trait: CreatureTrait,
): StatBlockTraitSupport {
  if (trait.effect === undefined) return { kind: "textOnly" };
  return Match.value(trait.effect).pipe(
    Match.discriminatorsExhaustive("kind")({
      attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target:
        () => ({
          kind: "supported" as const,
          attackRollMode: {
            mode: "advantage" as const,
            predicate: "nonIncapacitatedAllyWithin5FeetOfTarget" as const,
          },
        }),
      caster_shared_resistance: (effect) => ({
        kind: "unsupported" as const,
        effect,
      }),
      caster_heal_link: (effect) => ({
        kind: "unsupported" as const,
        effect,
      }),
    }),
  );
}

export function supportedStatBlockTraitAttackRollModes(
  traits: CreatureStatBlock["traits"] | StandaloneStatBlock["traits"],
): ReadonlyNonEmptyArray<StatBlockTraitAttackRollMode> | undefined {
  const modes = (traits ?? []).flatMap((trait) => {
    const support = statBlockTraitSupport(trait);
    return support.kind === "supported" ? [support.attackRollMode] : [];
  });
  const [firstMode, ...restModes] = modes;
  return firstMode === undefined ? undefined : [firstMode, ...restModes];
}
