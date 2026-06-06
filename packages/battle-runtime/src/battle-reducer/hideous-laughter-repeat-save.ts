import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type {
  BattleCreatureState,
  BattleFill,
  BattleHideousLaughterRepeatSavingThrowOutcomeHole,
  BattleSavingThrowFlatBonusProjection,
  BattleSavingThrowRollModeProjection,
  BattleSavingThrowOutcomeValue,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import { HIDEOUS_LAUGHTER_REPEAT_SAVE_HOLE_KEY_PREFIX } from "./domain-constants.ts";
import { uniqueSavingThrowRollModeProjections } from "./saving-throw-roll-mode-projections.ts";
import { wardingBondSavingThrowFlatBonusProjectionsForTarget } from "./warding-bond.ts";

const DEFAULT_DAMAGE_REPEAT_SAVE_EVENT_KEY = "damage";

type HideousLaughterEffect = Extract<
  BattleCreatureState["activeEffects"][number],
  { readonly kind: "hideousLaughter" }
>;

function repeatSaveKeyPart(value: string): string {
  return encodeURIComponent(value);
}

export function hideousLaughterRepeatSavingThrowOutcomeHole(
  targetId: CombatantId,
  effect: HideousLaughterEffect,
  trigger: "endTurn" | "damage",
  damageEventKey: string = DEFAULT_DAMAGE_REPEAT_SAVE_EVENT_KEY,
  targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[] = [],
): BattleHideousLaughterRepeatSavingThrowOutcomeHole {
  const key = [
    HIDEOUS_LAUGHTER_REPEAT_SAVE_HOLE_KEY_PREFIX,
    [
      targetId,
      effect.sourceCombatantId,
      effect.sourceSpellId,
      trigger,
      ...(trigger === "damage" ? [damageEventKey] : []),
    ]
      .map(repeatSaveKeyPart)
      .join(":"),
  ].join("");
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} repeat WIS save`,
    hideousLaughterRepeatSave: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
      trigger,
      save: effect.save,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes: hideousLaughterRepeatSavingThrowRollModeProjections(
      targetId,
      effect,
      trigger,
    ),
    targetFlatBonuses,
  };
}

function hideousLaughterRepeatSavingThrowRollModeProjections(
  targetId: CombatantId,
  effect: HideousLaughterEffect,
  trigger: "endTurn" | "damage",
): readonly BattleSavingThrowRollModeProjection[] {
  const damageRepeatSaveRollModeProjections: readonly BattleSavingThrowRollModeProjection[] =
    trigger === "damage" ? [{ targetId, rollMode: "advantage" }] : [];
  return uniqueSavingThrowRollModeProjections([
    ...damageRepeatSaveRollModeProjections,
    ...(effect.repeatSaveRollMode === null
      ? []
      : [{ targetId, rollMode: effect.repeatSaveRollMode }]),
  ]);
}

export function hideousLaughterDamageRepeatSaveHoles(
  target: BattleCreatureState,
  damageEventKey: string = DEFAULT_DAMAGE_REPEAT_SAVE_EVENT_KEY,
): BattleHideousLaughterRepeatSavingThrowOutcomeHole[] {
  return target.activeEffects.flatMap((effect) =>
    effect.kind === "hideousLaughter"
      ? [
          hideousLaughterRepeatSavingThrowOutcomeHole(
            target.combatantId,
            effect,
            "damage",
            damageEventKey,
            wardingBondSavingThrowFlatBonusProjectionsForTarget(target),
          ),
        ]
      : [],
  );
}

export function isHideousLaughterDamageRepeatSaveFill(
  fill: Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>,
): boolean {
  const holeIdString = String(fill.holeId);
  if (!holeIdString.startsWith(HIDEOUS_LAUGHTER_REPEAT_SAVE_HOLE_KEY_PREFIX)) {
    return false;
  }
  const [, , , trigger] = holeIdString
    .slice(HIDEOUS_LAUGHTER_REPEAT_SAVE_HOLE_KEY_PREFIX.length)
    .split(":");
  return trigger === "damage";
}

export function hideousLaughterDamageRepeatSaveFillsForTarget(
  target: BattleCreatureState,
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  damageEventKey: string = DEFAULT_DAMAGE_REPEAT_SAVE_EVENT_KEY,
): readonly Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>[] {
  const holeIds = new Set(
    hideousLaughterDamageRepeatSaveHoles(target, damageEventKey).map(
      (hole) => hole.holeId,
    ),
  );
  return fills.filter((fill) => holeIds.has(fill.holeId));
}

export function hideousLaughterDamageRepeatSaveFillCheck(input: {
  readonly target: BattleCreatureState;
  readonly damageAmount: number;
  readonly fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[];
  readonly damageEventKey?: string | undefined;
}):
  | {
      readonly tag: "ok";
      readonly holes: readonly BattleHideousLaughterRepeatSavingThrowOutcomeHole[];
    }
  | {
      readonly tag: "needsHoles";
      readonly holes: readonly BattleHideousLaughterRepeatSavingThrowOutcomeHole[];
    }
  | { readonly tag: "invalid"; readonly message: string } {
  const holes =
    input.damageAmount > 0
      ? hideousLaughterDamageRepeatSaveHoles(input.target, input.damageEventKey)
      : [];
  const missingHoles = holes.filter(
    (hole) => !input.fills.some((fill) => fill.holeId === hole.holeId),
  );
  if (missingHoles.length > 0) {
    return { tag: "needsHoles", holes: missingHoles };
  }
  if (input.fills.length !== holes.length) {
    return {
      tag: "invalid",
      message:
        "Hideous Laughter repeat save fills are only valid for a damaged target affected by Hideous Laughter.",
    };
  }
  const invalidFill = input.fills.find((fill) => {
    const hole = holes.find((candidate) => candidate.holeId === fill.holeId);
    return (
      hole === undefined ||
      validateHideousLaughterRepeatSavingThrowOutcome(
        fill.value,
        hole.hideousLaughterRepeatSave.targetId,
      ) !== null
    );
  });
  if (invalidFill !== undefined) {
    return {
      tag: "invalid",
      message:
        validateHideousLaughterRepeatSavingThrowOutcome(
          invalidFill.value,
          input.target.combatantId,
        ) ??
        "Hideous Laughter damage repeat save fill must match a requested damaged target.",
    };
  }
  return { tag: "ok", holes };
}

export function validateHideousLaughterRepeatSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  if ("area" in value) {
    return "Hideous Laughter repeat Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Hideous Laughter repeat Saving Throw outcome must match the affected target exactly once.";
}
