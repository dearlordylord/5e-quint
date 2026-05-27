// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE
import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import type { SpellRecord, TargetSelection } from "@dnd/surface/surface/types";
import { Either } from "effect";
import {
  type DirectConditionSpellInvocation,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CharacterBattleSpellcastingState } from "../character-battle-resources.ts";
import type { CombatantId } from "../identity.ts";
import {
  sameStringSet,
  scalarBuffSpellTargetCount,
} from "./spells-profile-shared.ts";

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
