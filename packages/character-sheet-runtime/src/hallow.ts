// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.hallow-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.hallow-durable-area
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  HALLOW_MATERIAL_COMPONENTS,
  HALLOW_WARD_CREATURE_TYPE_VALUES,
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetHallowArea,
  type CharacterSheetHallowCasting,
  type CharacterSheetHallowCreatureTypes,
  type CharacterSheetHallowExtraEffect,
  type CharacterSheetHallowInvocation,
  type CharacterSheetHallowResult,
  type CharacterSheetIssue,
} from "./sheet-types.ts";

import { castPreparedSpell } from "./prepared-spell-cast.ts";

const HALLOW_SPELL_ID = "hallow" as const;
const HALLOW_SPELL_LEVEL = spellSlotLevel(5);
const HALLOW_CASTING_TIME_HOURS = 24;
const HALLOW_MAX_RADIUS_FEET = 60;

export function castHallow(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly casting: CharacterSheetHallowCasting;
  readonly area: CharacterSheetHallowArea;
  readonly wardCreatureTypes: CharacterSheetHallowCreatureTypes;
  readonly extraEffect: CharacterSheetHallowExtraEffect;
}): Either.Either<CharacterSheetHallowResult, CharacterSheetIssue> {
  return castPreparedSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: authoredUnitId(HALLOW_SPELL_ID),
    spellLevel: HALLOW_SPELL_LEVEL,
    spellName: "Hallow",
    invocation: (spell) => {
      const inputIssue = hallowInputIssue({
        casting: input.casting,
        area: input.area,
        wardCreatureTypes: input.wardCreatureTypes,
        extraEffect: input.extraEffect,
      });
      if (inputIssue !== null) return characterSheetIssue(inputIssue);
      return hallowInvocationFromSpell({
        spell: spell,
        casting: input.casting,
        area: input.area,
        wardCreatureTypes: input.wardCreatureTypes,
        extraEffect: input.extraEffect,
      });
    },
  });
}

function hallowInputIssue(input: {
  readonly casting: CharacterSheetHallowCasting;
  readonly area: CharacterSheetHallowArea;
  readonly wardCreatureTypes: CharacterSheetHallowCreatureTypes;
  readonly extraEffect: CharacterSheetHallowExtraEffect;
}): string | null {
  if (
    input.casting.materialComponents.consumedIncenseCostGpMinimum <
    HALLOW_MATERIAL_COMPONENTS.consumedIncenseCostGpMinimum
  ) {
    return "Hallow requires consumed incense worth 1,000+ GP.";
  }
  if (input.area.radiusFeet <= 0) {
    return "Hallow area radius must be positive.";
  }
  if (input.area.radiusFeet > HALLOW_MAX_RADIUS_FEET) {
    return "Hallow area radius must be at most 60 feet.";
  }
  if (input.area.areaAlreadyHallowed !== false) {
    return "Hallow requires the target area to be outside existing Hallow effects.";
  }
  const wardIssue = hallowCreatureTypesIssue(input.wardCreatureTypes);
  if (wardIssue !== null) return wardIssue;
  return hallowExtraEffectIssue(input.extraEffect);
}

function hallowCreatureTypesIssue(
  creatureTypes: readonly string[],
): string | null {
  if (creatureTypes.length === 0) {
    return "Hallow requires at least one chosen ward creature type.";
  }
  const supported = new Set<string>(HALLOW_WARD_CREATURE_TYPE_VALUES);
  const seen = new Set<string>();
  for (const creatureType of creatureTypes) {
    if (!supported.has(creatureType)) {
      return "Hallow creature type choice is outside the supported ward list.";
    }
    if (seen.has(creatureType)) {
      return "Hallow creature type choices must be unique.";
    }
    seen.add(creatureType);
  }
  return null;
}

function hallowExtraEffectIssue(
  extraEffect: CharacterSheetHallowExtraEffect,
): string | null {
  if ("affectedCreatureTypes" in extraEffect) {
    return hallowExtraEffectCreatureTypesIssue(
      extraEffect.affectedCreatureTypes,
    );
  }
  return null;
}

function hallowExtraEffectCreatureTypesIssue(
  creatureTypes: readonly string[],
): string | null {
  if (creatureTypes.length === 0) {
    return "Hallow extra effect requires at least one chosen creature type.";
  }
  const seen = new Set<string>();
  for (const creatureType of creatureTypes) {
    if (seen.has(creatureType)) {
      return "Hallow extra effect creature type choices must be unique.";
    }
    seen.add(creatureType);
  }
  return null;
}

function hallowInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly casting: CharacterSheetHallowCasting;
  readonly area: CharacterSheetHallowArea;
  readonly wardCreatureTypes: CharacterSheetHallowCreatureTypes;
  readonly extraEffect: CharacterSheetHallowExtraEffect;
}): Either.Either<CharacterSheetHallowInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.castingTime.kind !== "hours" ||
    spell.mechanics.castingTime.amount !== HALLOW_CASTING_TIME_HOURS ||
    spell.mechanics.duration.kind !== "permanent" ||
    !spell.mechanics.duration.endsOn?.some((end) => end === "dispel") ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true ||
    !("materialCostGp" in spell.mechanics.components) ||
    spell.mechanics.components.materialCostGp !==
      HALLOW_MATERIAL_COMPONENTS.consumedIncenseCostGpMinimum ||
    !("materialConsumed" in spell.mechanics.components) ||
    spell.mechanics.components.materialConsumed !== true
  ) {
    return characterSheetIssue(
      "Hallow requires the supported level-5 durable area profile.",
    );
  }
  const directPhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "direct" &&
      phase.attachment.kind === "area" &&
      phase.attachment.shape.kind === "sphere" &&
      phase.attachment.shape.radiusFeet === HALLOW_MAX_RADIUS_FEET &&
      (phase.effects ?? []).length === 1 &&
      (phase.effects ?? [])[0]?.kind === "none",
  );
  if (directPhase === undefined) {
    return characterSheetIssue(
      "Hallow requires the supported touch-area durable ward profile.",
    );
  }

  return Either.right({
    tag: "hallow",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: HALLOW_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    castingTime: {
      kind: "hours",
      amount: HALLOW_CASTING_TIME_HOURS,
    },
    range: "touch",
    duration: "until_dispelled",
    materialComponents: input.casting.materialComponents,
    area: input.area,
    hallowedWard: {
      blockedCreatureTypes: input.wardCreatureTypes,
      preventsPossessionCharmedFrightenedFromBlockedTypes: true,
    },
    extraEffect: input.extraEffect,
    durableArea: {
      persistenceOwner: "table",
      spatialMembershipOwner: "table",
      dispelEndingOwner: "table",
    },
  });
}

export const completedHallowCasting = {
  tag: "completedHallowCasting",
  materialComponents: HALLOW_MATERIAL_COMPONENTS,
} as const satisfies CharacterSheetHallowCasting;
