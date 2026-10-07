import type {
  BattleCreatureState,
  BattleState,
} from "../../battle-state-execution.ts";
import {
  spellAdmissionBattleProjection,
  type SpellAdmissionActor,
  type CharacterSpellAdmissionContext,
} from "./profile.ts";

function isSpellAdmissionActor(
  actor: BattleCreatureState,
): actor is SpellAdmissionActor & {
  readonly origin: Extract<
    BattleCreatureState["origin"],
    { readonly kind: "character" }
  > & {
    readonly spellcasting: NonNullable<
      Extract<
        BattleCreatureState["origin"],
        { readonly kind: "character" }
      >["spellcasting"]
    > & { readonly canCastSpells: true };
  };
} {
  return (
    actor.origin.kind === "character" &&
    actor.origin.spellcasting !== undefined &&
    actor.origin.spellcasting.canCastSpells
  );
}

export function spellAdmissionContextFor(
  actor: BattleCreatureState,
  state: BattleState | undefined,
): Omit<CharacterSpellAdmissionContext, "castingSource"> | null {
  if (!isSpellAdmissionActor(actor)) return null;
  return {
    kind: "character",
    actor,
    battle: spellAdmissionBattleProjection(state),
    spellCastOptions: actor.origin.spellcasting.spellSlots.map((slot) => ({
      spellLevel: slot.spellLevel,
      payment: { tag: "slot" },
    })),
  };
}
