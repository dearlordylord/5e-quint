// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.arcane-hand-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.arcane-hand-object-lifecycle
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import {
  spellSlotLevel,
  type Hp as HpType,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Result } from "effect";

import { characterSheetHitPointMaximum } from "./hit-points.ts";
import {
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetArcaneHandInvocation,
  type CharacterSheetArcaneHandResult,
  type CharacterSheetArcaneHandSpace,
  type CharacterSheetIssue,
} from "./sheet-types.ts";

import { castPreparedSpell } from "./prepared-spell-cast.ts";

const ARCANE_HAND_SPELL_ID = "arcane_hand" as const;
const ARCANE_HAND_SPELL_LEVEL = spellSlotLevel(5);
const ARCANE_HAND_RANGE_FEET = 120;
const ARCANE_HAND_DURATION_MINUTES = 1;

export function castArcaneHand(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly space: CharacterSheetArcaneHandSpace;
  readonly castLevel?: SpellSlotLevel;
}): Result.Result<CharacterSheetArcaneHandResult, CharacterSheetIssue> {
  return castPreparedSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: authoredUnitId(ARCANE_HAND_SPELL_ID),
    spellLevel: input.castLevel ?? ARCANE_HAND_SPELL_LEVEL,
    spellName: "Arcane Hand",
    invocation: (spell) => {
      const castLevel = input.castLevel ?? ARCANE_HAND_SPELL_LEVEL;
      if (castLevel < ARCANE_HAND_SPELL_LEVEL) {
        return characterSheetIssue(
          "Arcane Hand requires a level-5 or higher Spell Slot.",
        );
      }
      const hitPointMaximum = characterSheetHitPointMaximum({
        sheet: input.sheet,
        unitLibrary: input.unitLibrary,
      });
      /* v8 ignore start -- @preserve -- Malformed sheet/catalog correlation: an admitted caster build must still yield its hit-point maximum. */
      if (Result.isFailure(hitPointMaximum))
        return Result.fail(hitPointMaximum.failure);
      /* v8 ignore stop -- @preserve */
      return arcaneHandInvocationFromSpell({
        spell: spell,
        space: input.space,
        castLevel,
        hitPointMaximum: hitPointMaximum.success,
      });
    },
  });
}

function arcaneHandInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly space: CharacterSheetArcaneHandSpace;
  readonly castLevel: SpellSlotLevel;
  readonly hitPointMaximum: HpType;
}): Result.Result<CharacterSheetArcaneHandInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  /* v8 ignore start -- @preserve -- The catalog record failed the exact authored level-5 Arcane Hand support profile required by this projector. */
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.school !== "evocation" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== ARCANE_HAND_RANGE_FEET ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== ARCANE_HAND_DURATION_MINUTES ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true ||
    spell.mechanics.components.m !== "an eggshell and a glove"
  ) {
    return characterSheetIssue(
      "Arcane Hand requires the supported level-5 magical hand profile.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const directPhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "direct" &&
      phase.attachment.kind === "location" &&
      /* v8 ignore next -- @preserve -- Unsupported authored Arcane Hand data: the admitted direct phase requires exactly one explicit no-op effect. */
      (phase.effects ?? []).length === 1 &&
      /* v8 ignore next -- @preserve -- Unsupported authored Arcane Hand data: omission of that required effect was rejected by the same profile predicate. */
      (phase.effects ?? [])[0]?.kind === "none",
  );
  /* v8 ignore start -- @preserve -- The catalog record has Arcane Hand facts but no supported visible-space phase. */
  if (directPhase === undefined) {
    return characterSheetIssue(
      "Arcane Hand requires the supported visible unoccupied space profile.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const duration = timeSpanDuration(spell.mechanics.duration.upTo);
  /* v8 ignore start -- @preserve -- The exact one-minute duration is always accepted by the elapsed-time parser. */
  if (Result.isFailure(duration)) {
    return characterSheetIssue("Arcane Hand requires a supported duration.");
  }
  /* v8 ignore stop -- @preserve */

  return Result.succeed({
    tag: "arcaneHand",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    castLevel: input.castLevel,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: input.castLevel,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    castingTime: { kind: "action" },
    rangeFeet: ARCANE_HAND_RANGE_FEET,
    duration: duration.success,
    concentrationRequired: true,
    hand: {
      objectId: input.space.objectId,
      creatureSize: "large",
      objectArmorClass: 20,
      hitPointMaximum: input.hitPointMaximum,
      occupiesSpace: false,
      dropsToZeroEndsSpell: true,
      mapPlacementOwner: "table",
    },
    command: {
      onCast: true,
      laterTurnAction: "bonus_action",
      moveDistanceFeet: 60,
      movementPathOwner: "table",
      availableEffects: [
        "clenched_fist",
        "forceful_hand",
        "grasping_hand",
        "interposing_hand",
      ],
    },
    effectContracts: {
      clenchedFist: {
        attackKind: "melee_spell_attack",
        reachFeet: 5,
        baseDamageDice: { count: 5, die: 8 },
        damageType: "force",
        damageDicePerSlotAboveBase: { count: 2, die: 8 },
      },
      forcefulHand: {
        targetSizeMaximum: "huge",
        savingThrowAbility: "str",
        basePushFeet: 5,
        pushFeetPerSpellcastingAbilityModifier: 5,
        handMovesWithTarget: true,
        remainsWithinFeet: 5,
      },
      graspingHand: {
        targetSizeMaximum: "huge",
        savingThrowAbility: "dex",
        condition: "grappled",
        escapeDc: "caster_spell_save_dc",
        crushAction: "bonus_action",
        crushDamageDice: { count: 4, die: 6 },
        crushAddsSpellcastingAbilityModifier: true,
        damageDicePerSlotAboveBase: { count: 2, die: 6 },
      },
      interposingHand: {
        coverGrantedToCaster: "half_cover",
        difficultTerrainForEnemies: true,
      },
    },
  });
}
