import type {
  OngoingEffectMechanics,
  SpellRecord,
} from "@dnd/surface/surface/types";
import { Brand } from "effect";
import {
  persistentArmorEffectExecutionFactsForSpell,
  type PersistentArmorEffectExecutionFacts,
} from "../procedure-execution/persistent-armor-effect-facts.ts";

export type { PersistentArmorEffectExecutionFacts } from "../procedure-execution/persistent-armor-effect-facts.ts";

type OngoingEffectSpellRecord = SpellRecord & {
  readonly mechanics: OngoingEffectMechanics;
};

export type PersistentArmorEffectAdmission = {
  readonly authoredSpell: OngoingEffectSpellRecord;
  readonly executionFacts: PersistentArmorEffectExecutionFacts;
} & Brand.Brand<"PersistentArmorEffectAdmission">;
const PersistentArmorEffectAdmission =
  Brand.nominal<PersistentArmorEffectAdmission>();

export function admitPersistentArmorEffectSpell(
  spell: SpellRecord,
): PersistentArmorEffectAdmission | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const executionFacts = persistentArmorEffectExecutionFactsForSpell(spell);
  if (executionFacts === null) return null;
  return PersistentArmorEffectAdmission({
    authoredSpell: { ...spell, mechanics: spell.mechanics },
    executionFacts,
  });
}
