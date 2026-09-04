import type {
  OngoingEffectMechanics,
  SpellRecord,
} from "@dnd/surface/surface/types";
import { Brand } from "effect";
import { type PersistentArmorEffectExecutionFacts } from "../procedure-execution/persistent-armor-effect-facts.ts";
import {
  persistentArmorEffectExecutionFactsFromMechanicsFacts,
  persistentArmorEffectProfile,
} from "../battle-reducer/spell-procedure-profiles/persistent-armor-effect.ts";
import { projectSpellDefinitionRuleFacts } from "./spell-definition-rule-facts.ts";

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
  const inspection = persistentArmorEffectProfile.admitMechanics({
    mechanics: spell.mechanics,
    spellDefinitionRuleFacts: projectSpellDefinitionRuleFacts(spell.mechanics),
  });
  if (inspection.tag !== "supported") return null;
  return PersistentArmorEffectAdmission({
    authoredSpell: { ...spell, mechanics: spell.mechanics },
    executionFacts: persistentArmorEffectExecutionFactsFromMechanicsFacts(
      inspection.admitted.facts,
    ),
  });
}
