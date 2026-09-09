import type {
  Attachment,
  SpellMechanics,
  TargetSelection,
} from "@dnd/surface/surface/types";
import type { SpellDefinitionRuleFacts } from "../procedure-execution/spell-rule-facts.ts";

/**
 * Project immutable Spell Definition mechanics at the admission boundary.
 * Execution receives the resulting facts and never traverses authored
 * mechanics. Caster, targets, slot/resource payment, turn, and BattleState
 * remain dynamic and are intentionally not projected here.
 */
export function projectSpellDefinitionRuleFacts(
  mechanics: SpellMechanics,
): SpellDefinitionRuleFacts {
  return {
    level: mechanics.level,
    range: mechanics.range,
    duration: mechanics.duration,
    components: {
      verbal: mechanics.components.v,
      somatic: mechanics.components.s,
      hasMaterial: mechanics.components.m !== false,
      hasPricedOrConsumedMaterial:
        mechanics.components.m !== false &&
        (typeof mechanics.components.m === "object" ||
          ("materialCostGp" in mechanics.components &&
            mechanics.components.materialCostGp !== undefined) ||
          ("materialConsumed" in mechanics.components &&
            mechanics.components.materialConsumed === true)),
    },
    twinnedTargetCount: spellTwinnedTargetCountFacts(mechanics),
  };
}

function spellTwinnedTargetCountFacts(
  mechanics: SpellMechanics,
): SpellDefinitionRuleFacts["twinnedTargetCount"] {
  const selections = spellTargetSelections(mechanics).filter((selection) =>
    isTwinnedTargetCountSelection(selection, mechanics.level),
  );
  const selection = selections.length === 1 ? selections[0] : undefined;
  if (!isTwinnedTargetCountSelection(selection, mechanics.level)) return null;
  return {
    base: selection.count.base,
    baseLevel: selection.count.baseLevel ?? mechanics.level,
  };
}

type TwinnedTargetCountSelection = Extract<
  TargetSelection,
  { readonly mode: "choose_up_to" }
> & {
  readonly count: {
    readonly kind: "linear";
    readonly base: number;
    readonly baseLevel?: number;
    readonly perSlotAboveBase: number;
  };
};

function isTwinnedTargetCountSelection(
  selection: TargetSelection | undefined,
  spellLevel: number,
): selection is TwinnedTargetCountSelection {
  if (selection?.mode !== "choose_up_to") return false;
  if (!("count" in selection)) return false;
  const count = selection.count;
  if (!isTwinnedLinearTargetCount(count)) return false;
  return [
    selection.repeatsAllowed !== true,
    selection.targetKinds?.length === 1,
    selection.targetKinds?.[0] === "creature",
    count.perSlotAboveBase === 1,
    (count.baseLevel ?? spellLevel) === spellLevel,
  ].every(Boolean);
}

function isTwinnedLinearTargetCount(
  count: unknown,
): count is TwinnedTargetCountSelection["count"] {
  if (typeof count !== "object" || count === null) return false;
  return "kind" in count && count.kind === "linear";
}

function spellTargetSelections(
  mechanics: SpellMechanics,
): readonly TargetSelection[] {
  if (mechanics.family === "ongoing_effect") {
    const selection = targetSelectionFromAttachment(mechanics.attachment);
    return selection === null ? [] : [selection];
  }
  if (mechanics.family !== "activation") return [];
  return mechanics.phases.flatMap((phase) => {
    if (!("attachment" in phase)) return [];
    const selection = targetSelectionFromAttachment(phase.attachment);
    return selection === null ? [] : [selection];
  });
}

function targetSelectionFromAttachment(
  attachment: Attachment,
): TargetSelection | null {
  return attachment.kind === "hole" && attachment.value.kind === "target"
    ? attachment.value.selection
    : null;
}
