import type { BattleSubject } from "../battle-subjects.ts";
import type {
  ActionSpellBattleResolutionInput,
  BattleFill,
  BattleInterruptedProcedure,
  BonusActionSpellBattleResolutionInput,
} from "../battle-state-execution.ts";

type SpellReactionContinuation = {
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
};

type SpellReplayContinuationInput =
  | ActionSpellBattleResolutionInput
  | (BonusActionSpellBattleResolutionInput & {
      readonly glyphStoredSpellReleaseReplay?: never;
    })
  | {
      readonly subject: BattleSubject;
      readonly fills: readonly BattleFill[];
      readonly reactionContinuation?: SpellReactionContinuation;
      readonly glyphStoredSpellReleaseReplay?: never;
    };

export function spellReplayContinuation(
  input: SpellReplayContinuationInput,
): Extract<BattleInterruptedProcedure, { readonly kind: "replay" }> {
  if (input.glyphStoredSpellReleaseReplay !== undefined) {
    const { fills, ...witness } = input.glyphStoredSpellReleaseReplay.witness;
    return {
      kind: "replay",
      subject: input.subject,
      fills,
      glyphStoredSpellReleaseReplay: {
        profile: input.glyphStoredSpellReleaseReplay.profile,
        witness,
      },
    };
  }
  return {
    kind: "replay",
    ...(input.reactionContinuation ?? {
      subject: input.subject,
      fills: input.fills,
    }),
  };
}
