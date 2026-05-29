import type { SpellRecord } from "@dnd/surface/surface/types";
import { Match } from "effect";

export function reactionTriggerIncludesHitByAttackRoll(
  castingTime: Extract<
    SpellRecord["mechanics"]["castingTime"],
    { kind: "reaction" }
  >,
): boolean {
  const trigger = castingTime.trigger;
  return trigger.kind === "hit_by_attack_roll"
    ? true
    : trigger.kind === "any_of" &&
        trigger.triggers.some(
          (candidate) => candidate.kind === "hit_by_attack_roll",
        );
}

export function reactionTriggerNamedSpellIds(
  castingTime: Extract<
    SpellRecord["mechanics"]["castingTime"],
    { kind: "reaction" }
  >,
): readonly string[] {
  return reactionTriggerNamedSpellIdsFromTrigger(castingTime.trigger);
}

export type ReactionTrigger = Extract<
  SpellRecord["mechanics"]["castingTime"],
  { kind: "reaction" }
>["trigger"];

export function reactionTriggerNamedSpellIdsFromTrigger(
  trigger: ReactionTrigger,
): readonly string[] {
  return Match.value(trigger).pipe(
    Match.when({ kind: "hit_by_attack_roll" }, () => []),
    Match.when({ kind: "takes_damage_from_creature" }, () => []),
    Match.when({ kind: "self_or_visible_creature_falls" }, () => []),
    Match.when({ kind: "targeted_by_named_spell" }, (namedSpell) => [
      namedSpell.spellId,
    ]),
    Match.when({ kind: "creature_casts_spell" }, () => []),
    Match.when({ kind: "spell_save_outcome" }, () => []),
    Match.when({ kind: "any_of" }, (anyOf) =>
      anyOf.triggers.flatMap(reactionTriggerNamedSpellIdsFromTrigger),
    ),
    Match.exhaustive,
  );
}
