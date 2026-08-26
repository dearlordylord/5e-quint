// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.ATTACK_CONTROL
import type {
  Condition,
  CreatureTrait,
  StatBlockRecord,
} from "@dnd/surface/surface/types";
import { CONDITIONS } from "@dnd/surface/surface/types";
import type { StatBlockTraitAttackRollMode } from "./battle-action-options.ts";
import type { BattleDruidWildShapeKnownFormSupportProfile } from "./druid-wild-shape-support-execution.ts";
import { statBlockIsWildShapeKnownFormEligible } from "./druid-wild-shape-form-eligibility.ts";
import type { BattleStatBlockExecutionSource } from "./stat-block-execution-state.ts";
export {
  creatureActionSectionIsSupported,
  creatureAttackRollMechanicsAreSupported,
  creatureNamedAttackRollIsSupported,
  statBlockActionSurfaceIsSupported,
  supportedStatBlockTraitAttackRollModes,
} from "./statblock-action-execution-support.ts";

/** Generic runtime gate after authored procedure projection. */
export function runtimeStatBlockActionSurfaceIsSupported(
  source: BattleStatBlockExecutionSource,
): boolean {
  return source.procedures.every(
    (procedure) =>
      procedure.kind === "attack" ||
      procedure.kind === "multiattack" ||
      procedure.kind === "bonusActionOption",
  );
}

const WILD_SHAPE_FORM_EXECUTABLE_ACTION_SURFACE_CATEGORIES = [
  "simpleLiteralAttackSingleDamage",
  "multiDamageComponentsOnHit",
  "traitDerivedConditionalAttackRollAdvantage",
  "attackHitTargetSizeConditionRider",
] as const;

const WILD_SHAPE_FORM_CLOSED_ATTACK_HIT_RIDER_CATEGORIES = [
  "attackHitConditionRider",
  "attackHitForcedMovementRider",
  "attackHitOtherRider",
] as const;

const WILD_SHAPE_FORM_ATTACK_HIT_RIDER_CATEGORIES = [
  "attackHitTargetSizeConditionRider",
  ...WILD_SHAPE_FORM_CLOSED_ATTACK_HIT_RIDER_CATEGORIES,
] as const;

const WILD_SHAPE_FORM_ACTION_SECTION_CATEGORIES = [
  "statBlockActionMultiattack",
  "statBlockActionSaveGate",
  "statBlockActionSupport",
  "statBlockActionOption",
  "statBlockSpecialAction",
  "statBlockBonusActionSection",
  "statBlockReactionSection",
  "statBlockLegendaryActionSection",
] as const;

const WILD_SHAPE_FORM_CLOSED_ACTION_SURFACE_CATEGORIES = [
  ...WILD_SHAPE_FORM_CLOSED_ATTACK_HIT_RIDER_CATEGORIES,
  ...WILD_SHAPE_FORM_ACTION_SECTION_CATEGORIES,
  "tableOrProseOnlyTrait",
] as const;

export const WILD_SHAPE_FORM_ACTION_SURFACE_CATEGORIES = [
  ...WILD_SHAPE_FORM_EXECUTABLE_ACTION_SURFACE_CATEGORIES,
  ...WILD_SHAPE_FORM_CLOSED_ACTION_SURFACE_CATEGORIES,
] as const;

type WildShapeFormExecutableActionSurfaceCategory =
  (typeof WILD_SHAPE_FORM_EXECUTABLE_ACTION_SURFACE_CATEGORIES)[number];
type WildShapeFormAttackHitRiderCategory =
  (typeof WILD_SHAPE_FORM_ATTACK_HIT_RIDER_CATEGORIES)[number];
type WildShapeFormClosedActionSurfaceCategory =
  (typeof WILD_SHAPE_FORM_CLOSED_ACTION_SURFACE_CATEGORIES)[number];
export type WildShapeFormActionSurfaceCategory =
  (typeof WILD_SHAPE_FORM_ACTION_SURFACE_CATEGORIES)[number];

type WildShapeFormClosedSurfaceBoundary = {
  readonly owner: string;
  readonly reason: string;
};

export type WildShapeFormActionSurfaceInventoryEntry =
  | {
      readonly category: WildShapeFormExecutableActionSurfaceCategory;
      readonly exampleStatBlockIds: readonly StatBlockRecord["id"][];
    }
  | {
      readonly category: WildShapeFormClosedActionSurfaceCategory;
      readonly exampleStatBlockIds: readonly StatBlockRecord["id"][];
      readonly closedBoundary: WildShapeFormClosedSurfaceBoundary;
    };

const WILD_SHAPE_FORM_CLOSED_ACTION_SURFACE_CATEGORY_SET: ReadonlySet<WildShapeFormActionSurfaceCategory> =
  new Set(WILD_SHAPE_FORM_CLOSED_ACTION_SURFACE_CATEGORIES);

const WILD_SHAPE_FORM_CLOSED_ACTION_SURFACE_BOUNDARIES = {
  attackHitConditionRider: {
    owner: "battle-runtime generic Stat Block attack-hit condition rider owner",
    reason:
      "Attack-hit condition rider shapes outside the typed target Size Prone payload remain closed so the host attack cannot drop required condition-specific facts or over-apply the condition.",
  },
  attackHitForcedMovementRider: {
    owner:
      "battle-runtime generic Stat Block attack-hit forced-movement rider owner",
    reason:
      "Attack-hit forced movement must carry a typed movement payload and target-position owner before Wild Shape admits the host attack.",
  },
  attackHitOtherRider: {
    owner: "battle-runtime generic Stat Block attack-hit rider owner",
    reason:
      "Attack-hit prose with no parsed destination needs a typed payload or table owner before Wild Shape admits the host attack.",
  },
  statBlockActionMultiattack: {
    owner: "battle-runtime generic Stat Block Multiattack control owner",
    reason:
      "Surface actions.multiattacks entries need a Wild Shape selected-form admission witness that consumes the generic Multiattack control owner before the form admits them.",
  },
  statBlockActionSaveGate: {
    owner:
      "battle-runtime generic Stat Block save-gated action procedure owner",
    reason:
      "Surface actions.saves entries carry saving throw, recipient, and effect facts that need a generic save-gated Stat Block procedure owner before Wild Shape admits them.",
  },
  statBlockActionSupport: {
    owner: "battle-runtime generic Stat Block support-action procedure owner",
    reason:
      "Surface actions.supports entries carry self or ally effect facts that need a generic support-action procedure owner before Wild Shape admits them.",
  },
  statBlockActionOption: {
    owner: "battle-runtime generic Stat Block action-option procedure owner",
    reason:
      "Surface actionOptions delegate to Standard Action procedures; Wild Shape admission needs focused evidence for each delegated action kind, and this task does not promote generic Utilize or object-use execution.",
  },
  statBlockSpecialAction: {
    owner:
      "battle-runtime typed Stat Block special-action payload or table owner",
    reason:
      "Surface specials carry prose descriptions and need typed effect payloads or an explicit table owner before Wild Shape admits them.",
  },
  statBlockBonusActionSection: {
    owner:
      "battle-runtime Stat Block Bonus Action lifecycle and delegated procedure owners",
    reason:
      "Surface bonusActions spend a separate Bonus Action resource, and each contained action shape still needs its generic procedure owner before Wild Shape admits it.",
  },
  statBlockReactionSection: {
    owner: "battle-runtime Stat Block Reaction trigger and procedure owners",
    reason:
      "Surface reactions require trigger facts plus Reaction resource handling before Wild Shape admits the section or its contained procedure.",
  },
  statBlockLegendaryActionSection: {
    owner: "battle-runtime Stat Block Legendary Action lifecycle owner",
    reason:
      "Surface legendaryActions use Stat Block-only round resources and need a generic lifecycle owner before any Wild Shape form admits them.",
  },
  tableOrProseOnlyTrait: {
    owner: "battle-runtime table/caller witness owners",
    reason:
      "Traits with table, spatial, exploration, or non-attack effects remain closed until a generic owner consumes their facts.",
  },
} as const satisfies Record<
  WildShapeFormClosedActionSurfaceCategory,
  WildShapeFormClosedSurfaceBoundary
>;

type WildShapeFormActionSurfaceInventoryEntryInput = {
  readonly category: WildShapeFormActionSurfaceCategory;
  readonly exampleStatBlockIds: readonly StatBlockRecord["id"][];
};

export function wildShapeFormActionSurfaceInventory(input: {
  readonly forms: readonly StatBlockRecord[];
  readonly profile: BattleDruidWildShapeKnownFormSupportProfile;
}): readonly WildShapeFormActionSurfaceInventoryEntry[] {
  const eligibleForms = input.forms.filter((form) =>
    statBlockIsWildShapeKnownFormEligible({ form, profile: input.profile }),
  );
  return WILD_SHAPE_FORM_ACTION_SURFACE_CATEGORIES.map((category) => ({
    category,
    exampleStatBlockIds: eligibleForms.flatMap((form) =>
      wildShapeFormActionSurfaceCategories(form).includes(category)
        ? [form.id]
        : [],
    ),
  }))
    .filter((entry) => entry.exampleStatBlockIds.length > 0)
    .map(wildShapeFormActionSurfaceInventoryEntry);
}

function wildShapeFormActionSurfaceInventoryEntry(
  entry: WildShapeFormActionSurfaceInventoryEntryInput,
): WildShapeFormActionSurfaceInventoryEntry {
  const { category, exampleStatBlockIds } = entry;
  if (wildShapeFormActionSurfaceCategoryIsClosed(category)) {
    return {
      category,
      exampleStatBlockIds,
      closedBoundary:
        WILD_SHAPE_FORM_CLOSED_ACTION_SURFACE_BOUNDARIES[category],
    };
  }
  return {
    category,
    exampleStatBlockIds,
  };
}

function wildShapeFormActionSurfaceCategoryIsClosed(
  category: WildShapeFormActionSurfaceCategory,
): category is WildShapeFormClosedActionSurfaceCategory {
  return WILD_SHAPE_FORM_CLOSED_ACTION_SURFACE_CATEGORY_SET.has(category);
}

function wildShapeFormActionSurfaceCategories(
  form: StatBlockRecord,
): readonly WildShapeFormActionSurfaceCategory[] {
  const source = form.statBlock;
  const categories = new Set<WildShapeFormActionSurfaceCategory>();
  if (source.bonusActions !== undefined) {
    categories.add("statBlockBonusActionSection");
  }
  if (source.reactions !== undefined) {
    categories.add("statBlockReactionSection");
  }
  if (source.legendaryActions !== undefined) {
    categories.add("statBlockLegendaryActionSection");
  }
  const sections = [
    source.actions,
    source.bonusActions,
    source.reactions,
    source.legendaryActions?.entries,
  ];
  for (const entries of sections) {
    for (const entry of entries ?? []) {
      if (entry.kind === "textOnly") {
        categories.add("statBlockSpecialAction");
        continue;
      }
      switch (entry.procedure.kind) {
        case "multiattack":
          categories.add("statBlockActionMultiattack");
          break;
        case "save":
          categories.add("statBlockActionSaveGate");
          break;
        case "support":
          categories.add("statBlockActionSupport");
          break;
        case "action_option":
          categories.add("statBlockActionOption");
          break;
        case "spellcasting":
          categories.add("statBlockSpecialAction");
          break;
        case "attack_roll": {
          const damageEffects = entry.procedure.onHit.filter(
            (effect) => effect.kind === "damage",
          );
          if (damageEffects.length === 1) {
            categories.add("simpleLiteralAttackSingleDamage");
          } else if (damageEffects.length > 1) {
            categories.add("multiDamageComponentsOnHit");
          }
          for (const effect of entry.procedure.onHit) {
            if (effect.kind === "apply_condition_if_target_size_at_most") {
              categories.add("attackHitTargetSizeConditionRider");
            } else if (effect.kind !== "damage") {
              categories.add("attackHitOtherRider");
            }
          }
          if (
            "description" in entry.procedure &&
            entry.procedure.description !== undefined
          ) {
            for (const category of attackHitDescriptionRiderCategories(
              entry.procedure.description,
            )) {
              categories.add(category);
            }
          }
          break;
        }
      }
    }
  }

  for (const trait of source.traits ?? []) {
    if (statBlockTraitAttackRollMode(trait) !== null) {
      categories.add("traitDerivedConditionalAttackRollAdvantage");
    } else if (trait.effect === undefined) {
      categories.add(
        mentionsAttackRollAdvantage(trait.description)
          ? "traitDerivedConditionalAttackRollAdvantage"
          : "tableOrProseOnlyTrait",
      );
    }
  }

  return WILD_SHAPE_FORM_ACTION_SURFACE_CATEGORIES.filter((category) =>
    categories.has(category),
  );
}

function attackHitDescriptionRiderCategories(
  description: string,
): readonly WildShapeFormAttackHitRiderCategory[] {
  const categories = new Set<WildShapeFormAttackHitRiderCategory>();
  const lowerDescription = description.toLowerCase();
  if (
    CONDITIONS.some((condition) =>
      mentionsCondition(lowerDescription, condition),
    )
  ) {
    categories.add("attackHitConditionRider");
  }
  if (mentionsForcedMovement(lowerDescription)) {
    categories.add("attackHitForcedMovementRider");
  }
  if (categories.size === 0) {
    categories.add("attackHitOtherRider");
  }
  return WILD_SHAPE_FORM_ATTACK_HIT_RIDER_CATEGORIES.filter((category) =>
    categories.has(category),
  );
}

function mentionsCondition(
  lowerDescription: string,
  condition: Condition,
): boolean {
  return lowerDescription.includes(`${condition} condition`);
}

function mentionsForcedMovement(lowerDescription: string): boolean {
  const mentionsDistance =
    lowerDescription.includes(" feet") || lowerDescription.includes(" ft.");
  return (
    mentionsDistance &&
    (lowerDescription.includes("push") ||
      lowerDescription.includes("pull") ||
      lowerDescription.includes("move") ||
      lowerDescription.includes("moved"))
  );
}

function mentionsAttackRollAdvantage(description: string): boolean {
  const lowerDescription = description.toLowerCase();
  return (
    lowerDescription.includes("advantage") &&
    lowerDescription.includes("attack roll")
  );
}

function statBlockTraitAttackRollMode(
  trait: CreatureTrait,
): StatBlockTraitAttackRollMode | null {
  return trait.effect?.kind ===
    "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target"
    ? {
        mode: "advantage",
        predicate: "nonIncapacitatedAllyWithin5FeetOfTarget",
      }
    : null;
}
