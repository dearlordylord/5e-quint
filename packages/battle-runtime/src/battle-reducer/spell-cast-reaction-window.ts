import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import type { CharacterBattleMetamagicOptionFact } from "../character-battle-resource-execution.ts";
import type {
  BattleExecutableSpellInvocation,
  BattleFill,
  BattleResolutionResult,
  BattleSpellCastingTimeResource,
  BattleSpellCastReactionFact,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import {
  spellCastInterruptFrame,
  spellCastMetamagicApplicationsInput,
} from "./spell-cast-interrupt-frame.ts";

type SpellCastReactionResolutionContext = {
  readonly input: {
    readonly state: BattleState;
    readonly subject: BattleSubject;
    readonly fills: readonly BattleFill[];
    readonly handledInterruptTrigger?: BattleInterruptTrigger | undefined;
  };
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly fillSet: {
    readonly reactionSpellTargetFacts: readonly BattleSpellCastReactionFact[];
  };
};

export function maybeOpenSpellCastReactionWindow(
  resolution: SpellCastReactionResolutionContext,
  targetIds: readonly CombatantId[],
  castingResource: BattleSpellCastingTimeResource,
  metamagicApplications:
    | readonly CharacterBattleMetamagicOptionFact[]
    | undefined,
): BattleResolutionResult | null {
  return maybeOpenInterruptWindow(
    resolution.input.state,
    spellCastInterruptFrame({
      casterId: resolution.actorId,
      invocation: resolution.invocation,
      targetIds,
      reactionSpellTargetFacts: resolution.fillSet.reactionSpellTargetFacts,
      castingResource,
      ...spellCastMetamagicApplicationsInput(metamagicApplications ?? []),
      continuation: {
        kind: "replay",
        subject: resolution.input.subject,
        fills: resolution.input.fills,
      },
    }),
    resolution.input.handledInterruptTrigger,
  );
}
