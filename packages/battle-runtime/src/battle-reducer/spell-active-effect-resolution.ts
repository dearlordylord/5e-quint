import { optionalProperty } from "../optional-property.ts";
import type {
  BattleResolutionResult,
  BattleSpellCastingTimeResource,
  BattleState,
} from "../battle-state-execution.ts";
import type { CharacterBattleMetamagicOptionFact } from "../character-battle-resource-execution.ts";
import type { CombatantId } from "../identity.ts";
import { breakBattleConcentration } from "./damage-apply.ts";
import { resolvedResult } from "./result-helpers.ts";
import { maybeOpenSpellCastReactionWindow } from "./spell-cast-reaction-window.ts";
import {
  spellRequiresConcentration,
  spendSpellCastResources,
} from "./spells-resolve-resources.ts";

type SpellCastReactionResolutionContext = Parameters<
  typeof maybeOpenSpellCastReactionWindow
>[0];

export function maybeOpenConfiguredSpellCastReactionWindow(input: {
  readonly resolution: SpellCastReactionResolutionContext & {
    readonly storedGlyphRelease?: object | undefined;
    readonly actionCostOverride?: "magicAction" | "bonusAction";
    readonly metamagicApplications?:
      | readonly CharacterBattleMetamagicOptionFact[]
      | undefined;
  };
  readonly targetIds: readonly CombatantId[];
}): BattleResolutionResult | null {
  const { resolution } = input;
  return resolution.storedGlyphRelease === undefined
    ? maybeOpenSpellCastReactionWindow(
        resolution,
        input.targetIds,
        resolution.actionCostOverride === "bonusAction" ||
          resolution.input.subject.tag === "bonusActionSpell"
          ? { kind: "bonusAction" }
          : { kind: "magicAction" },
        resolution.metamagicApplications ?? [],
      )
    : null;
}

export function spendConfiguredSpellCastResources(input: {
  readonly resolution: SpellCastReactionResolutionContext & {
    readonly actionCostOverride?: "magicAction" | "bonusAction";
    readonly metamagicApplications?:
      | readonly CharacterBattleMetamagicOptionFact[]
      | undefined;
  };
  readonly state: BattleState;
  readonly startConcentration?: boolean | undefined;
}) {
  const { resolution } = input;
  return spendSpellCastResources({
    state: input.state,
    actorId: resolution.actorId,
    invocation: resolution.invocation,
    errorState: resolution.input.state,
    ...optionalProperty("startConcentration", input.startConcentration),
    ...optionalProperty("actionCostOverride", resolution.actionCostOverride),
    ...optionalProperty(
      "metamagicApplications",
      resolution.metamagicApplications,
    ),
  });
}

/**
 * Owns the ordering shared by spells that install an active effect:
 * reaction window, prior-concentration break, effect installation, and cast
 * resource expenditure. Stored-glyph releases install the effect directly.
 */
export function resolveSpellActiveEffectCast(input: {
  readonly resolution: SpellCastReactionResolutionContext & {
    readonly storedGlyphRelease?: object | undefined;
  };
  readonly targetIds: readonly CombatantId[];
  readonly castingResource: BattleSpellCastingTimeResource;
  readonly applyEffect: (state: BattleState) => BattleState;
  readonly finalizeState?: (state: BattleState) => BattleState;
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly CharacterBattleMetamagicOptionFact[];
}): BattleResolutionResult {
  const { resolution } = input;
  if (resolution.storedGlyphRelease === undefined) {
    const reactionWindow = maybeOpenSpellCastReactionWindow(
      resolution,
      input.targetIds,
      input.castingResource,
      input.metamagicApplications,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
  }
  return completeSpellActiveEffectCast(input);
}

export function completeSpellActiveEffectCast(input: {
  readonly resolution: SpellCastReactionResolutionContext & {
    readonly storedGlyphRelease?: object | undefined;
  };
  readonly applyEffect: (state: BattleState) => BattleState;
  readonly finalizeState?: (state: BattleState) => BattleState;
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly CharacterBattleMetamagicOptionFact[];
}): BattleResolutionResult {
  const { resolution } = input;
  const concentrationBase =
    resolution.storedGlyphRelease !== undefined
      ? resolution.input.state
      : spellRequiresConcentration(resolution.invocation)
        ? breakBattleConcentration(resolution.input.state, resolution.actorId)
        : resolution.input.state;
  const effected = input.applyEffect(concentrationBase);
  const finalizeState = input.finalizeState ?? ((state) => state);
  if (resolution.storedGlyphRelease !== undefined) {
    return resolvedResult(finalizeState(effected));
  }

  const resourced = spendSpellCastResources({
    state: effected,
    actorId: resolution.actorId,
    invocation: resolution.invocation,
    errorState: resolution.input.state,
    ...optionalProperty("actionCostOverride", input.actionCostOverride),
    ...optionalProperty("metamagicApplications", input.metamagicApplications),
  });
  return resourced.tag === "invalid"
    ? resourced
    : resolvedResult(finalizeState(resourced.state));
}
