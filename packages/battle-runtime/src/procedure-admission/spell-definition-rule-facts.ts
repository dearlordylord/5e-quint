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
  const selections = spellTargetSelections(mechanics).filter((selection) => {
    if (!("count" in selection)) return false;
    const count = selection.count;
    const baseLevel =
      typeof count === "object" && count !== null && "baseLevel" in count
        ? (count.baseLevel ?? mechanics.level)
        : undefined;
    return (
      selection.mode === "choose_up_to" &&
      !("repeatsAllowed" in selection && selection.repeatsAllowed === true) &&
      selection.targetKinds?.length === 1 &&
      selection.targetKinds[0] === "creature" &&
      typeof count === "object" &&
      count !== null &&
      count.kind === "linear" &&
      count.perSlotAboveBase === 1 &&
      baseLevel === mechanics.level
    );
  });
  const selection = selections.length === 1 ? selections[0] : undefined;
  if (
    selection?.mode !== "choose_up_to" ||
    typeof selection.count !== "object" ||
    selection.count === null ||
    selection.count.kind !== "linear"
  ) {
    return null;
  }
  return {
    base: selection.count.base,
    baseLevel: selection.count.baseLevel ?? mechanics.level,
  };
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
