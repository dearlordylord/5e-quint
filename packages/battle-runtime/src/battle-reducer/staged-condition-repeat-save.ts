import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { Brand, Match } from "effect";
import type {
  BattleCreatureState,
  BattleFill,
  BattleHoleId,
  BattleSaveGatedConditionRepeatSavingThrowOutcomeHole,
  BattleSavingThrowFlatBonusProjection,
  BattleSavingThrowRollModeProjection,
  BattleSavingThrowOutcomeValue,
  BattleState,
} from "../battle-state-execution.ts";
import type {
  BattleProcedureExecutionRef,
  BattleStartTurnOccurrenceId,
  CombatantId,
} from "../identity.ts";
import type { Index, Round } from "@dnd/shared/types";
import {
  STAGED_CONDITION_DAMAGE_REPEAT_SAVE_HOLE_KEY_PREFIX,
  STAGED_CONDITION_END_TURN_REPEAT_SAVE_HOLE_KEY_PREFIX,
} from "./domain-constants.ts";
import { uniqueSavingThrowRollModeProjections } from "./saving-throw-roll-mode-projections.ts";
import { linkedDefenseResistanceDamageShareSavingThrowFlatBonusProjectionsForTarget } from "./linked-defense-damage-share.ts";
import {
  boundSaveGatedConditionWithRepeatEffect,
  type BoundSaveGatedConditionWithRepeatEffect,
} from "./spell-modifier-binding.ts";

export type SaveGatedConditionWithRepeatEffect =
  BoundSaveGatedConditionWithRepeatEffect;

export type SaveGatedConditionDamageOccurrenceKey = string &
  Brand.Brand<"SaveGatedConditionDamageOccurrenceKey">;

const SaveGatedConditionDamageOccurrenceKey =
  Brand.nominal<SaveGatedConditionDamageOccurrenceKey>();

type SaveGatedConditionDamageOccurrenceIdentity =
  | { readonly kind: "hole"; readonly holeId: BattleHoleId }
  | {
      readonly kind: "holeTarget";
      readonly holeId: BattleHoleId;
      readonly targetId: CombatantId;
    }
  | {
      readonly kind: "chainedSpellStep";
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly stepIndex: Index;
      readonly targetId: CombatantId;
    }
  | {
      readonly kind: "startTurn";
      readonly actorId: CombatantId;
      readonly round: Round;
      readonly occurrenceId: BattleStartTurnOccurrenceId;
    }
  | {
      readonly kind: "attackResume";
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly targetId: CombatantId;
    };

function framedDamageOccurrencePart(value: string | number): string {
  const text = String(value);
  return `${text.length}:${text}`;
}

function saveGatedConditionDamageOccurrenceKey(
  identity: SaveGatedConditionDamageOccurrenceIdentity,
): SaveGatedConditionDamageOccurrenceKey {
  const parts = Match.value(identity).pipe(
    Match.when({ kind: "hole" }, ({ holeId }) => ["hole", holeId]),
    Match.when({ kind: "holeTarget" }, ({ holeId, targetId }) => [
      "holeTarget",
      holeId,
      targetId,
    ]),
    Match.when(
      { kind: "chainedSpellStep" },
      ({ sourceProcedureRef, stepIndex, targetId }) => [
        "chainedSpellStep",
        sourceProcedureRef,
        stepIndex,
        targetId,
      ],
    ),
    Match.when({ kind: "startTurn" }, ({ actorId, round, occurrenceId }) => [
      "startTurn",
      actorId,
      Number(round),
      occurrenceId,
    ]),
    Match.when({ kind: "attackResume" }, ({ sourceProcedureRef, targetId }) => [
      "attackResume",
      sourceProcedureRef,
      targetId,
    ]),
    Match.exhaustive,
  );
  return SaveGatedConditionDamageOccurrenceKey(
    parts.map(framedDamageOccurrencePart).join(""),
  );
}

export function saveGatedConditionDamageOccurrenceKeyForHole(
  holeId: BattleHoleId,
): SaveGatedConditionDamageOccurrenceKey {
  return saveGatedConditionDamageOccurrenceKey({ kind: "hole", holeId });
}

export function saveGatedConditionDamageOccurrenceKeyForHoleTarget(input: {
  readonly holeId: BattleHoleId;
  readonly targetId: CombatantId;
}): SaveGatedConditionDamageOccurrenceKey {
  return saveGatedConditionDamageOccurrenceKey({
    kind: "holeTarget",
    ...input,
  });
}

export function saveGatedConditionDamageOccurrenceKeyForChainedSpellStep(input: {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly stepIndex: Index;
  readonly targetId: CombatantId;
}): SaveGatedConditionDamageOccurrenceKey {
  return saveGatedConditionDamageOccurrenceKey({
    kind: "chainedSpellStep",
    ...input,
  });
}

export function saveGatedConditionDamageOccurrenceKeyForStartTurn(input: {
  readonly actorId: CombatantId;
  readonly round: Round;
  readonly occurrenceId: BattleStartTurnOccurrenceId;
}): SaveGatedConditionDamageOccurrenceKey {
  return saveGatedConditionDamageOccurrenceKey({ kind: "startTurn", ...input });
}

export function saveGatedConditionDamageOccurrenceKeyForAttackResume(input: {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly targetId: CombatantId;
}): SaveGatedConditionDamageOccurrenceKey {
  return saveGatedConditionDamageOccurrenceKey({
    kind: "attackResume",
    ...input,
  });
}

type SaveGatedConditionRepeatSaveTrigger =
  BattleSaveGatedConditionRepeatSavingThrowOutcomeHole["saveGatedConditionRepeatSave"]["trigger"];
type SaveGatedConditionRepeatSaveOccurrence =
  | { readonly trigger: "endTurn" }
  | {
      readonly trigger: "damage";
      readonly occurrenceKey: SaveGatedConditionDamageOccurrenceKey;
    };
type SavingThrowOutcomeFill = Extract<
  BattleFill,
  { readonly kind: "savingThrowOutcome" }
>;
type SaveGatedConditionWithRepeatDamageRepeatSaveFillCheckResult =
  | {
      readonly tag: "ok";
      readonly holes: readonly BattleSaveGatedConditionRepeatSavingThrowOutcomeHole[];
    }
  | {
      readonly tag: "needsHoles";
      readonly holes: readonly BattleSaveGatedConditionRepeatSavingThrowOutcomeHole[];
    }
  | { readonly tag: "invalid"; readonly message: string };

const STAGED_CONDITION_DAMAGE_REPEAT_SAVE_FILL_HOLE_MISMATCH_MESSAGE =
  "save-gated condition damage repeat save fills must match every requested damaged target exactly once.";

export function saveGatedConditionWithRepeatEffects(
  state: BattleState,
  combatant: BattleCreatureState | undefined,
): readonly SaveGatedConditionWithRepeatEffect[] {
  return combatant === undefined
    ? []
    : combatant.activeEffects.flatMap((effect) => {
        if (effect.kind !== "saveGatedConditionWithRepeat") {
          return [];
        }
        const boundEffect = boundSaveGatedConditionWithRepeatEffect(
          state,
          effect,
        );
        return boundEffect === undefined ? [] : [boundEffect];
      });
}

function repeatSaveKeyPart(value: string): string {
  return encodeURIComponent(value);
}

function saveGatedConditionRepeatSaveHoleKeyPrefix(
  trigger: SaveGatedConditionRepeatSaveTrigger,
): string {
  return Match.value(trigger).pipe(
    Match.when(
      "endTurn",
      () => STAGED_CONDITION_END_TURN_REPEAT_SAVE_HOLE_KEY_PREFIX,
    ),
    Match.when(
      "damage",
      () => STAGED_CONDITION_DAMAGE_REPEAT_SAVE_HOLE_KEY_PREFIX,
    ),
    Match.exhaustive,
  );
}

export function saveGatedConditionWithRepeatRepeatSavingThrowOutcomeHole(
  targetId: CombatantId,
  effect: SaveGatedConditionWithRepeatEffect,
  occurrence: SaveGatedConditionRepeatSaveOccurrence,
  targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[] = [],
): BattleSaveGatedConditionRepeatSavingThrowOutcomeHole {
  const key = [
    saveGatedConditionRepeatSaveHoleKeyPrefix(occurrence.trigger),
    [
      targetId,
      effect.effectRef,
      ...(occurrence.trigger === "damage" ? [occurrence.occurrenceKey] : []),
    ]
      .map(repeatSaveKeyPart)
      .join(":"),
  ].join("");
  return {
    kind: "savingThrowOutcome",
    damageOccurrence: { kind: "untrackedDamage" },
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Repeat WIS save",
    saveGatedConditionRepeatSave: {
      targetId,
      effectRef: effect.effectRef,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      trigger: occurrence.trigger,
      save: effect.save,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes:
      saveGatedConditionWithRepeatRepeatSavingThrowRollModeProjections(
        targetId,
        effect,
        occurrence.trigger,
      ),
    targetFlatBonuses,
  };
}

function saveGatedConditionWithRepeatRepeatSavingThrowRollModeProjections(
  targetId: CombatantId,
  effect: SaveGatedConditionWithRepeatEffect,
  trigger: SaveGatedConditionRepeatSaveTrigger,
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

export function saveGatedConditionWithRepeatDamageRepeatSaveHoles(
  state: BattleState,
  target: BattleCreatureState,
  occurrenceKey: SaveGatedConditionDamageOccurrenceKey,
): BattleSaveGatedConditionRepeatSavingThrowOutcomeHole[] {
  return target.activeEffects.flatMap((effect) => {
    const boundEffect =
      effect.kind === "saveGatedConditionWithRepeat"
        ? boundSaveGatedConditionWithRepeatEffect(state, effect)
        : undefined;
    return boundEffect !== undefined
      ? [
          saveGatedConditionWithRepeatRepeatSavingThrowOutcomeHole(
            target.combatantId,
            boundEffect,
            { trigger: "damage", occurrenceKey },
            linkedDefenseResistanceDamageShareSavingThrowFlatBonusProjectionsForTarget(
              target,
            ),
          ),
        ]
      : [];
  });
}

export function isSaveGatedConditionWithRepeatDamageRepeatSaveFill(
  fill: SavingThrowOutcomeFill,
): boolean {
  return String(fill.holeId).startsWith(
    STAGED_CONDITION_DAMAGE_REPEAT_SAVE_HOLE_KEY_PREFIX,
  );
}

export function saveGatedConditionWithRepeatDamageRepeatSaveFillsForTarget(
  state: BattleState,
  target: BattleCreatureState,
  fills: readonly SavingThrowOutcomeFill[],
  occurrenceKey: SaveGatedConditionDamageOccurrenceKey,
): readonly SavingThrowOutcomeFill[] {
  const holeIds = new Set(
    saveGatedConditionWithRepeatDamageRepeatSaveHoles(
      state,
      target,
      occurrenceKey,
    ).map((hole) => hole.holeId),
  );
  return fills.filter((fill) => holeIds.has(fill.holeId));
}

export function saveGatedConditionWithRepeatDamageRepeatSaveFillCheck(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly damageAmount: number;
  readonly fills: readonly SavingThrowOutcomeFill[];
  readonly occurrenceKey: SaveGatedConditionDamageOccurrenceKey;
}): SaveGatedConditionWithRepeatDamageRepeatSaveFillCheckResult {
  const holes =
    input.damageAmount > 0
      ? saveGatedConditionWithRepeatDamageRepeatSaveHoles(
          input.state,
          input.target,
          input.occurrenceKey,
        )
      : [];
  return checkSaveGatedConditionWithRepeatDamageRepeatSaveFills({
    holes,
    fills: input.fills,
  });
}

export function checkSaveGatedConditionWithRepeatDamageRepeatSaveFills(input: {
  readonly holes: readonly BattleSaveGatedConditionRepeatSavingThrowOutcomeHole[];
  readonly fills: readonly SavingThrowOutcomeFill[];
}): SaveGatedConditionWithRepeatDamageRepeatSaveFillCheckResult {
  const { holes } = input;
  const missingHoles = holes.filter(
    (hole) => !input.fills.some((fill) => fill.holeId === hole.holeId),
  );
  if (missingHoles.length > 0) {
    return { tag: "needsHoles", holes: missingHoles };
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length !== holes.length) {
    return {
      tag: "invalid",
      message: STAGED_CONDITION_DAMAGE_REPEAT_SAVE_FILL_HOLE_MISMATCH_MESSAGE,
    };
  }
  /* v8 ignore stop -- @preserve */
  const invalidFillIssue = input.fills
    .map((fill) =>
      saveGatedConditionWithRepeatDamageRepeatSaveFillIssue(fill, holes),
    )
    .find((issue): issue is string => issue !== null);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (invalidFillIssue !== undefined) {
    return {
      tag: "invalid",
      message: invalidFillIssue,
    };
  }
  /* v8 ignore stop -- @preserve */
  return { tag: "ok", holes };
}

function saveGatedConditionWithRepeatDamageRepeatSaveFillIssue(
  fill: SavingThrowOutcomeFill,
  holes: readonly BattleSaveGatedConditionRepeatSavingThrowOutcomeHole[],
): string | null {
  const hole = holes.find((candidate) => candidate.holeId === fill.holeId);
  return hole === undefined
    ? STAGED_CONDITION_DAMAGE_REPEAT_SAVE_FILL_HOLE_MISMATCH_MESSAGE
    : validateSaveGatedConditionWithRepeatRepeatSavingThrowOutcome(
        fill.value,
        hole.saveGatedConditionRepeatSave.targetId,
      );
}

export function validateSaveGatedConditionWithRepeatRepeatSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  if ("area" in value) {
    return "save-gated condition repeat Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "save-gated condition repeat Saving Throw outcome must match the affected target exactly once.";
}
