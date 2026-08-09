import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { Match } from "effect";
import type {
  BattleCreatureState,
  BattleFill,
  BattleHideousLaughterRepeatSavingThrowOutcomeHole,
  BattleSavingThrowFlatBonusProjection,
  BattleSavingThrowRollModeProjection,
  BattleSavingThrowOutcomeValue,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  HIDEOUS_LAUGHTER_DAMAGE_REPEAT_SAVE_HOLE_KEY_PREFIX,
  HIDEOUS_LAUGHTER_END_TURN_REPEAT_SAVE_HOLE_KEY_PREFIX,
} from "./domain-constants.ts";
import { uniqueSavingThrowRollModeProjections } from "./saving-throw-roll-mode-projections.ts";
import { wardingBondSavingThrowFlatBonusProjectionsForTarget } from "./warding-bond.ts";

const DEFAULT_DAMAGE_REPEAT_SAVE_EVENT_KEY = "damage";

export type HideousLaughterEffect = Extract<
  BattleCreatureState["activeEffects"][number],
  { readonly kind: "hideousLaughter" }
>;

type HideousLaughterRepeatSaveTrigger =
  BattleHideousLaughterRepeatSavingThrowOutcomeHole["hideousLaughterRepeatSave"]["trigger"];
type SavingThrowOutcomeFill = Extract<
  BattleFill,
  { readonly kind: "savingThrowOutcome" }
>;
type HideousLaughterDamageRepeatSaveFillCheckResult =
  | {
      readonly tag: "ok";
      readonly holes: readonly BattleHideousLaughterRepeatSavingThrowOutcomeHole[];
    }
  | {
      readonly tag: "needsHoles";
      readonly holes: readonly BattleHideousLaughterRepeatSavingThrowOutcomeHole[];
    }
  | { readonly tag: "invalid"; readonly message: string };

const HIDEOUS_LAUGHTER_DAMAGE_REPEAT_SAVE_FILL_HOLE_MISMATCH_MESSAGE =
  "Hideous Laughter damage repeat save fills must match every requested damaged target exactly once.";

export function hideousLaughterEffects(
  combatant: BattleCreatureState | undefined,
): readonly HideousLaughterEffect[] {
  return combatant === undefined
    ? []
    : combatant.activeEffects.filter(
        (effect): effect is HideousLaughterEffect =>
          effect.kind === "hideousLaughter",
      );
}

function repeatSaveKeyPart(value: string): string {
  return encodeURIComponent(value);
}

function hideousLaughterRepeatSaveHoleKeyPrefix(
  trigger: HideousLaughterRepeatSaveTrigger,
): string {
  return Match.value(trigger).pipe(
    Match.when(
      "endTurn",
      () => HIDEOUS_LAUGHTER_END_TURN_REPEAT_SAVE_HOLE_KEY_PREFIX,
    ),
    Match.when(
      "damage",
      () => HIDEOUS_LAUGHTER_DAMAGE_REPEAT_SAVE_HOLE_KEY_PREFIX,
    ),
    Match.exhaustive,
  );
}

export function hideousLaughterRepeatSavingThrowOutcomeHole(
  targetId: CombatantId,
  effect: HideousLaughterEffect,
  trigger: HideousLaughterRepeatSaveTrigger,
  damageEventKey: string = DEFAULT_DAMAGE_REPEAT_SAVE_EVENT_KEY,
  targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[] = [],
): BattleHideousLaughterRepeatSavingThrowOutcomeHole {
  const key = [
    hideousLaughterRepeatSaveHoleKeyPrefix(trigger),
    [
      targetId,
      effect.sourceCombatantId,
      effect.sourceProcedureRef,
      ...(trigger === "damage" ? [damageEventKey] : []),
    ]
      .map(repeatSaveKeyPart)
      .join(":"),
  ].join("");
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Repeat WIS save",
    hideousLaughterRepeatSave: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
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
  trigger: HideousLaughterRepeatSaveTrigger,
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
  fill: SavingThrowOutcomeFill,
): boolean {
  return String(fill.holeId).startsWith(
    HIDEOUS_LAUGHTER_DAMAGE_REPEAT_SAVE_HOLE_KEY_PREFIX,
  );
}

export function hideousLaughterDamageRepeatSaveFillsForTarget(
  target: BattleCreatureState,
  fills: readonly SavingThrowOutcomeFill[],
  damageEventKey: string = DEFAULT_DAMAGE_REPEAT_SAVE_EVENT_KEY,
): readonly SavingThrowOutcomeFill[] {
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
  readonly fills: readonly SavingThrowOutcomeFill[];
  readonly damageEventKey?: string | undefined;
}): HideousLaughterDamageRepeatSaveFillCheckResult {
  const holes =
    input.damageAmount > 0
      ? hideousLaughterDamageRepeatSaveHoles(input.target, input.damageEventKey)
      : [];
  return checkHideousLaughterDamageRepeatSaveFills({
    holes,
    fills: input.fills,
  });
}

export function checkHideousLaughterDamageRepeatSaveFills(input: {
  readonly holes: readonly BattleHideousLaughterRepeatSavingThrowOutcomeHole[];
  readonly fills: readonly SavingThrowOutcomeFill[];
}): HideousLaughterDamageRepeatSaveFillCheckResult {
  const { holes } = input;
  const missingHoles = holes.filter(
    (hole) => !input.fills.some((fill) => fill.holeId === hole.holeId),
  );
  if (missingHoles.length > 0) {
    return { tag: "needsHoles", holes: missingHoles };
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length !== holes.length) {
    return {
      tag: "invalid",
      message: HIDEOUS_LAUGHTER_DAMAGE_REPEAT_SAVE_FILL_HOLE_MISMATCH_MESSAGE,
    };
  }
  /* v8 ignore stop */
  const invalidFillIssue = input.fills
    .map((fill) => hideousLaughterDamageRepeatSaveFillIssue(fill, holes))
    .find((issue): issue is string => issue !== null);
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (invalidFillIssue !== undefined) {
    return {
      tag: "invalid",
      message: invalidFillIssue,
    };
  }
  /* v8 ignore stop */
  return { tag: "ok", holes };
}

function hideousLaughterDamageRepeatSaveFillIssue(
  fill: SavingThrowOutcomeFill,
  holes: readonly BattleHideousLaughterRepeatSavingThrowOutcomeHole[],
): string | null {
  const hole = holes.find((candidate) => candidate.holeId === fill.holeId);
  return hole === undefined
    ? HIDEOUS_LAUGHTER_DAMAGE_REPEAT_SAVE_FILL_HOLE_MISMATCH_MESSAGE
    : validateHideousLaughterRepeatSavingThrowOutcome(
        fill.value,
        hole.hideousLaughterRepeatSave.targetId,
      );
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
