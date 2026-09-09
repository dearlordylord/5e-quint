import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Match } from "effect";
import type { BattleSpellExecutionSource } from "../battle-state-execution.ts";
import { type PersistentArmorEffectExecutionFacts } from "../procedure-execution/persistent-armor-effect-facts.ts";
import {
  persistentArmorEffectExecutionFactsFromMechanicsFacts,
  persistentArmorEffectProfile,
  type PersistentArmorEffectMechanicsIssue,
} from "../battle-reducer/spell-procedure-profiles/persistent-armor-effect.ts";
import { projectSpellDefinitionRuleFacts } from "./spell-definition-rule-facts.ts";

export type { PersistentArmorEffectExecutionFacts } from "../procedure-execution/persistent-armor-effect-facts.ts";

type PersistentArmorEffectSpellSource = Pick<
  BattleSpellExecutionSource,
  "id" | "name" | "spellDefinitionRuleFacts"
>;

export type PersistentArmorEffectAdmission = {
  readonly spell: PersistentArmorEffectSpellSource;
  readonly executionFacts: PersistentArmorEffectExecutionFacts;
};

export type PersistentArmorEffectSpellInspection =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "unsupported";
      readonly issues: ReadonlyNonEmptyArray<PersistentArmorEffectMechanicsIssue>;
    }
  | {
      readonly tag: "admitted";
      readonly admission: PersistentArmorEffectAdmission;
    };

export function inspectPersistentArmorEffectSpell(
  spell: SpellRecord,
): PersistentArmorEffectSpellInspection {
  const spellDefinitionRuleFacts = projectSpellDefinitionRuleFacts(
    spell.mechanics,
  );
  const inspection = persistentArmorEffectProfile.admitMechanics({
    mechanics: spell.mechanics,
    spellDefinitionRuleFacts,
  });
  return Match.value(inspection).pipe(
    Match.discriminatorsExhaustive("tag")({
      notRepresented: () => ({ tag: "notRepresented" as const }),
      unsupported: ({ issues }) => ({ tag: "unsupported" as const, issues }),
      supported: ({ admitted }) => ({
        tag: "admitted" as const,
        admission: {
          spell: {
            id: spell.id,
            name: spell.name,
            spellDefinitionRuleFacts,
          },
          executionFacts: persistentArmorEffectExecutionFactsFromMechanicsFacts(
            admitted.facts,
          ),
        },
      }),
    }),
  );
}
