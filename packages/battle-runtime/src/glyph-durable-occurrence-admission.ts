import { spellProcedureExecution } from "./character-execution-admission.ts";
import {
  glyphDurableOccurrenceEffectFromCompletedInscriptionWithProjection,
  type CompletedGlyphInscriptionWitness,
  type GlyphDurableOccurrenceEffectFromCompletedInscriptionResult,
  type GlyphDurableOccurrenceProfile,
} from "./battle-reducer/glyph-durable-occurrence.ts";

export function glyphDurableOccurrenceEffectFromCompletedInscription(input: {
  readonly profile: GlyphDurableOccurrenceProfile;
  readonly witness: CompletedGlyphInscriptionWitness;
}): GlyphDurableOccurrenceEffectFromCompletedInscriptionResult {
  return glyphDurableOccurrenceEffectFromCompletedInscriptionWithProjection({
    ...input,
    projectStoredInvocation: spellProcedureExecution,
  });
}
