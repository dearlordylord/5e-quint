import type { BattleSubject } from "../battle-subjects.ts";
import type { BattleFill } from "../battle-state-execution.ts";

type SpellReactionContinuation = {
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
};

export function spellReactionContinuation(input: {
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
  readonly reactionContinuation?: SpellReactionContinuation;
}): SpellReactionContinuation {
  return (
    input.reactionContinuation ?? {
      subject: input.subject,
      fills: input.fills,
    }
  );
}
