import { spellProcedureExecution } from "./character-execution-admission.ts";
import {
  glyphDurableOccurrenceEffectFromCompletedInscriptionWithProjection,
  type CompletedGlyphInscriptionWitness,
  type GlyphDurableOccurrenceMechanicsFacts,
  type GlyphDurableOccurrenceEffectFromCompletedInscriptionResult,
} from "./battle-reducer/glyph-durable-occurrence.ts";
import type { AdmittedStaticSpellMechanics } from "./battle-reducer/spell-procedure-profiles/spell-mechanics-admission.ts";

export function glyphDurableOccurrenceEffectFromCompletedInscription(input: {
  readonly admission: AdmittedStaticSpellMechanics<
    "glyphDurableOccurrence",
    GlyphDurableOccurrenceMechanicsFacts
  >;
  readonly witness: CompletedGlyphInscriptionWitness;
}): GlyphDurableOccurrenceEffectFromCompletedInscriptionResult {
  return glyphDurableOccurrenceEffectFromCompletedInscriptionWithProjection({
    profile: input.admission.facts.profile,
    witness: input.witness,
    projectStoredInvocation: spellProcedureExecution,
  });
}
