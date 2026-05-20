import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import type { SpellRecord, TargetSelection } from "@dnd/surface/surface/types";
import { Either } from "effect";
import {
  type DirectConditionSpellInvocation,
  type DirectConditionRemovalSpellInvocation,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CharacterBattleSpellcastingState } from "../character-battle-resources.ts";
import type { CombatantId } from "../identity.ts";
import {
  sameStringSet,
  scalarBuffSpellTargetCount,
} from "./spells-profile-shared.ts";
import { DIRECT_CONDITION_REMOVAL_CONDITIONS } from "./domain-constants.ts";

const INVISIBILITY_EARLY_END_KINDS = [
  "target_makes_attack_roll",
  "target_deals_damage",
  "target_casts_spell",
] as const;

export function supportedPreparedDirectConditionSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const projection = directConditionProjection(actorId, spell);
    if (projection === null) {
      return [];
    }
    const maxTargets = scalarBuffSpellTargetCount(
      projection.selection,
      spell.mechanics.level,
      slot.spellLevel,
    );
    return maxTargets === null
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "directCondition",
            spell,
            actionCost: "magicAction",
            targeting: { kind: "targetList", minTargets: 1, maxTargets },
            activeEffect: projection.activeEffect,
            rangeFeet: projection.rangeFeet,
          },
        ];
  });
}

export function supportedPreparedDirectConditionRemovalSpellProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const projection = directConditionRemovalProjection(spell);
  if (projection === null) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] =>
    Number(slot.spellLevel) < spell.mechanics.level
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "directConditionRemoval",
            spell,
            actionCost: "bonusAction",
            ...projection,
          },
        ],
  );
}

function directConditionRemovalProjection(
  spell: SpellRecord,
): Pick<
  DirectConditionRemovalSpellInvocation,
  "conditionChoices" | "rangeFeet" | "targeting"
> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const [phase] = spell.mechanics.phases;
  const attachment = phase?.kind === "direct" ? phase.attachment : null;
  const selection =
    attachment?.kind === "hole" && attachment.value.kind === "target"
      ? attachment.value.selection
      : null;
  const effects = phase?.kind === "direct" ? (phase.effects ?? []) : [];
  const [effect, extraEffect] = effects;
  const condition =
    effect?.kind === "remove_condition" ? effect.condition : null;
  const conditionChoice =
    condition !== null &&
    typeof condition === "object" &&
    !Array.isArray(condition) &&
    "kind" in condition &&
    condition.kind === "choose"
      ? condition
      : null;
  if (
    selection === null ||
    selection.mode !== "one" ||
    !sameStringSet(selection.targetKinds ?? ["creature"], ["creature"]) ||
    extraEffect !== undefined ||
    conditionChoice === null ||
    !sameStringSet(conditionChoice.from, DIRECT_CONDITION_REMOVAL_CONDITIONS)
  ) {
    return null;
  }
  return {
    targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
    conditionChoices: DIRECT_CONDITION_REMOVAL_CONDITIONS,
    rangeFeet: movementFeet(5),
  };
}

function directConditionProjection(
  actorId: CombatantId,
  spell: SpellRecord,
):
  | (Pick<DirectConditionSpellInvocation, "activeEffect" | "rangeFeet"> & {
      readonly selection: TargetSelection;
    })
  | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "hour" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const [phase] = spell.mechanics.phases;
  const attachment = phase?.kind === "direct" ? phase.attachment : null;
  const selection =
    attachment?.kind === "hole" && attachment.value.kind === "target"
      ? attachment.value.selection
      : null;
  const effects = phase?.kind === "direct" ? (phase.effects ?? []) : [];
  const [effect, extraEffect] = effects;
  if (
    selection === null ||
    !sameStringSet(selection.targetKinds ?? ["creature"], ["creature"]) ||
    effect?.kind !== "apply_condition" ||
    effect.condition !== "invisible" ||
    extraEffect !== undefined ||
    !sameStringSet(
      (spell.mechanics.duration.earlyEnd ?? []).map((end) => end.kind),
      INVISIBILITY_EARLY_END_KINDS,
    )
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.upTo,
  );
  return Either.isLeft(durationTicks)
    ? null
    : {
        selection,
        rangeFeet: movementFeet(5),
        activeEffect: {
          kind: "targetActionEndedSpellCondition",
          sourceSpellId: spell.id,
          sourceCombatantId: actorId,
          condition: "invisible",
          expiresAt: {
            kind: "concentration",
            combatantId: actorId,
            durationTicks: durationTicks.right,
          },
        },
      };
}
