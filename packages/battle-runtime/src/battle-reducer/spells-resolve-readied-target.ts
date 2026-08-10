import type { BattleExecutableSpellInvocation } from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import type { SpellFillSet } from "./spells-resolve-fill-set.ts";

type ReadiedSpellFillSetOk = Extract<SpellFillSet, { readonly tag: "ok" }>;
type ReadiedObjectTarget = NonNullable<ReadiedSpellFillSetOk["objectTarget"]>;

export type ReadiedCreatureSpellFillSet = Omit<
  ReadiedSpellFillSetOk,
  "targetId" | "objectTarget"
> & {
  readonly targetId: CombatantId;
  readonly objectTarget: undefined;
};

export type ReadiedObjectSpellFillSet = Omit<
  ReadiedSpellFillSetOk,
  "targetId" | "objectTarget"
> & {
  readonly targetId: undefined;
  readonly objectTarget: ReadiedObjectTarget;
};

export type ReadiedSpellTargetSelection =
  | { readonly tag: "none" }
  | {
      readonly tag: "creature";
      readonly fillSet: ReadiedCreatureSpellFillSet;
    }
  | {
      readonly tag: "object";
      readonly fillSet: ReadiedObjectSpellFillSet;
    }
  | { readonly tag: "invalid"; readonly message: string };

export const READIED_SPELL_TARGET_SELECTION_KINDS = [
  "none",
  "creature",
  "object",
  "invalid",
] as const;
export type ReadiedSpellTargetSelectionKind =
  (typeof READIED_SPELL_TARGET_SELECTION_KINDS)[number];

export function readiedSpellTargetSelectionKind(
  creatureTargetSelected: boolean,
  objectTargetSelected: boolean,
): ReadiedSpellTargetSelectionKind {
  if (creatureTargetSelected && objectTargetSelected) {
    return "invalid";
  }
  if (creatureTargetSelected) {
    return "creature";
  }
  if (objectTargetSelected) {
    return "object";
  }
  return "none";
}

/**
 * Parses the release-time target domain once. The result carries the
 * domain-refined fill set used to dispatch the release, so consumers do not
 * re-read optional target fields or reconstruct the parser's decision.
 */
export function readiedSpellTargetSelection(
  fillSet: ReadiedSpellFillSetOk,
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "spellAttackDamage" }
  >,
): ReadiedSpellTargetSelection {
  const selectionKind = readiedSpellTargetSelectionKind(
    fillSet.targetId !== undefined,
    fillSet.objectTarget !== undefined,
  );
  if (selectionKind === "invalid") {
    return {
      tag: "invalid",
      message:
        "Readied spell target must choose either one combatant or one object, not both.",
    };
  }
  if (selectionKind === "object") {
    const objectTarget = fillSet.objectTarget;
    /* v8 ignore start -- The shared target-domain classifier proves that an object selection carries its object. */
    if (objectTarget === undefined) {
      return {
        tag: "invalid",
        message: "Readied spell object target selection is missing its object.",
      };
    }
    /* v8 ignore stop */
    /* v8 ignore start -- Object-target holes are admitted only for the single-creature-or-object targeting shape. */
    if (invocation.targeting.kind !== "singleCreatureOrObject") {
      return {
        tag: "invalid",
        message:
          "Readied spell object target does not match the selected spell's targeting.",
      };
    }
    /* v8 ignore stop */
    return {
      tag: "object",
      fillSet: {
        ...fillSet,
        targetId: undefined,
        objectTarget,
      },
    };
  }
  if (selectionKind === "creature") {
    const targetId = fillSet.targetId;
    /* v8 ignore start -- The shared target-domain classifier proves that a creature selection carries its target. */
    if (targetId === undefined) {
      return {
        tag: "invalid",
        message:
          "Readied spell creature target selection is missing its target.",
      };
    }
    /* v8 ignore stop */
    return {
      tag: "creature",
      fillSet: {
        ...fillSet,
        targetId,
        objectTarget: undefined,
      },
    };
  }
  return { tag: "none" };
}
