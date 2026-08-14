import {
  resourceCount,
  type AbilityModifier,
  type ProficiencyBonus,
  type ResourceCount,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import type {
  ActivationResource,
  PointPoolResource,
} from "@dnd/surface/surface/types";
import type { ClassName } from "@dnd/surface/surface/types";
import * as Either from "effect/Either";

import type { BattleResourcePoolExecutionRef } from "./identity.ts";
import { SORCERER_METAMAGIC_EFFECT_KINDS } from "@dnd/surface/surface/schema";

type UseCountActivationResource = Extract<
  ActivationResource,
  { readonly kind: "use_count" }
>;
export type SupportedUseCountActivationResource = UseCountActivationResource & {
  readonly cap: Extract<
    UseCountActivationResource["cap"],
    | { readonly kind: "fixed" }
    | { readonly kind: "proficiency_bonus" }
    | { readonly kind: "linear_per_level" }
    | { readonly kind: "threshold_tiers" }
    | { readonly kind: "ability_modifier" }
    | { readonly kind: "unlimited" }
  >;
};
export type LimitedUseCountActivationResource =
  SupportedUseCountActivationResource & {
    readonly cap: Exclude<
      SupportedUseCountActivationResource["cap"],
      { readonly kind: "unlimited" }
    >;
  };
export type UnlimitedActivationResource =
  SupportedUseCountActivationResource & {
    readonly cap: { readonly kind: "unlimited" };
  };
export type CharacterBattleActivationResource =
  | LimitedUseCountActivationResource
  | UnlimitedActivationResource;
export type SupportedPointPoolResource = PointPoolResource & {
  readonly cap: Extract<
    PointPoolResource["cap"],
    | { readonly kind: "fixed" }
    | { readonly kind: "proficiency_bonus" }
    | { readonly kind: "linear_per_level" }
    | { readonly kind: "threshold_tiers" }
  >;
};
export type CharacterBattleResourceExecutionFacts =
  | CharacterBattleActivationResource
  | SupportedPointPoolResource;

export type CharacterBattleMetamagicEffectKind =
  (typeof SORCERER_METAMAGIC_EFFECT_KINDS)[number];
export type CharacterBattleMetamagicOptionFact = {
  readonly effectKind: CharacterBattleMetamagicEffectKind;
  readonly stackingMode:
    | "one_per_spell"
    | "can_combine_with_different_metamagic";
  readonly sorceryPointCost: ResourceCount;
};
export type CharacterBattleMetamagicState = {
  readonly sorceryPointResourcePoolRef: BattleResourcePoolExecutionRef;
  readonly spellUseLimit: "one_per_spell_unless_option_allows_stacking";
  readonly knownOptions: readonly CharacterBattleMetamagicOptionFact[];
};
export type PactOfTheChainFindFamiliarInvocationMode = {
  readonly action: "magicAction";
  readonly resource: "noSpellSlot";
};
export type CharacterBattleSpellSlotState = {
  readonly spellLevel: SpellSlotLevel;
  readonly count: ResourceCount;
  readonly expended: ResourceCount;
};
export type CharacterBattleSpellcastingExecutionState = {
  readonly spellcastingSource:
    | {
        readonly tag: "classSpellcasting";
        readonly className: ClassName;
        readonly abilityModifier: AbilityModifier;
      }
    | { readonly tag: "spellAccessOnly" };
  readonly proficiencyBonus: ProficiencyBonus;
  readonly canCastSpells: boolean;
  readonly spellSlots: readonly CharacterBattleSpellSlotState[];
  readonly pactOfTheChainFindFamiliarInvocationMode: PactOfTheChainFindFamiliarInvocationMode | null;
};
export type CharacterBattlePointPoolSpendIssue = {
  readonly tag: "characterBattlePointPoolSpendIssue";
  readonly message: string;
};
export function spendCharacterPointPoolResource(input: {
  readonly resource: CharacterBattleResourceState;
  readonly points: ResourceCount;
}): Either.Either<
  CharacterBattlePointPoolResourceState,
  CharacterBattlePointPoolSpendIssue
> {
  if (!characterBattleResourceIsPointPool(input.resource)) {
    return Either.left({
      tag: "characterBattlePointPoolSpendIssue",
      message: "Only point-pool character battle resources can spend points.",
    });
  }
  if (input.points <= 0) {
    return Either.left({
      tag: "characterBattlePointPoolSpendIssue",
      message: "Point-pool spending requires a positive point cost.",
    });
  }
  if (input.resource.pointsRemaining < input.points) {
    return Either.left({
      tag: "characterBattlePointPoolSpendIssue",
      message: "Point-pool resource has insufficient remaining points.",
    });
  }
  return Either.right({
    ...input.resource,
    pointsRemaining: resourceCount(
      Number(input.resource.pointsRemaining) - Number(input.points),
    ),
  });
}

type CharacterBattleResourceStateBase = {
  readonly resourcePoolRef: BattleResourcePoolExecutionRef;
};

export type CharacterBattleUseCountResourceStateBase =
  CharacterBattleResourceStateBase & {
    readonly usedThisTurn: boolean;
  };

export type CharacterBattleResourceState =
  | (CharacterBattleUseCountResourceStateBase & {
      readonly resource: LimitedUseCountActivationResource;
      readonly usesRemaining: ResourceCount;
    })
  | (CharacterBattleUseCountResourceStateBase & {
      readonly resource: UnlimitedActivationResource;
      readonly usesRemaining?: never;
    })
  | (CharacterBattleResourceStateBase & {
      readonly resource: SupportedPointPoolResource;
      readonly pointsRemaining: ResourceCount;
      readonly usesRemaining?: never;
      readonly usedThisTurn?: never;
    });

export type CharacterBattleUseCountResourceState = Extract<
  CharacterBattleResourceState,
  { readonly usedThisTurn: boolean }
>;

export type CharacterBattlePointPoolResourceState = Extract<
  CharacterBattleResourceState,
  { readonly pointsRemaining: ResourceCount }
>;

export function characterBattleResourceUsage(
  resource: CharacterBattleResourceState,
): "limited" | "unlimited" | "pointPool" {
  if (characterBattleResourceIsPointPool(resource)) return "pointPool";
  return characterBattleResourceIsUnlimited(resource) ? "unlimited" : "limited";
}

export function characterBattleResourceIsUnlimited(
  resource: CharacterBattleResourceState,
): resource is CharacterBattleUseCountResourceStateBase & {
  readonly resource: UnlimitedActivationResource;
  readonly usesRemaining?: never;
} {
  return (
    resource.resource.kind === "use_count" &&
    resource.resource.cap.kind === "unlimited"
  );
}

export function characterBattleResourceIsUseCount(
  resource: CharacterBattleResourceState,
): resource is CharacterBattleUseCountResourceState {
  return resource.resource.kind === "use_count";
}

export function characterBattleResourceIsPointPool(
  resource: CharacterBattleResourceState,
): resource is CharacterBattlePointPoolResourceState {
  return resource.resource.kind === "point_pool";
}

export function resourceHasUsesRemaining(
  resource: CharacterBattleResourceState,
): resource is CharacterBattleUseCountResourceState {
  return (
    characterBattleResourceIsUseCount(resource) &&
    (characterBattleResourceIsUnlimited(resource) || resource.usesRemaining > 0)
  );
}

export function characterBattleResourcePoolRefHasUsesRemaining(
  resources: readonly CharacterBattleResourceState[],
  resourcePoolRef: BattleResourcePoolExecutionRef,
): boolean {
  const resource = resources.find(
    (candidate) => candidate.resourcePoolRef === resourcePoolRef,
  );
  return resource !== undefined && resourceHasUsesRemaining(resource);
}

export function spendCharacterResourceUse(
  resource: CharacterBattleUseCountResourceState,
): CharacterBattleUseCountResourceState {
  return characterBattleResourceIsUnlimited(resource)
    ? resource
    : {
        ...resource,
        usesRemaining: resourceCount(Number(resource.usesRemaining) - 1),
      };
}
