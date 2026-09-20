import { Brand, Match } from "effect";
import type {
  Attachment,
  Ability,
  DamageTypeRef,
  DcSource,
} from "@dnd/surface/surface/types";
import type {
  CreatureId,
  DieRollResult,
  ReadonlyNonEmptyArray,
} from "@dnd/shared/types";

type HoleIdText = "core_attack_target" | "core_attack_roll" | (string & {});
export type HoleId = HoleIdText & Brand.Brand<"HoleId">;
const HoleId = Brand.nominal<HoleId>();
export const holeId: (value: HoleIdText) => HoleId = HoleId;

export type HoleStepKey = string & Brand.Brand<"HoleStepKey">;
const HoleStepKey = Brand.nominal<HoleStepKey>();
export const holeStepKey: (value: string) => HoleStepKey = HoleStepKey;

export type HoleLocalKey = string & Brand.Brand<"HoleLocalKey">;
const HoleLocalKey = Brand.nominal<HoleLocalKey>();
export const holeLocalKey: (value: string) => HoleLocalKey = HoleLocalKey;

export type HoleInstanceKey = string & Brand.Brand<"HoleInstanceKey">;
const HoleInstanceKey = Brand.nominal<HoleInstanceKey>();
export const holeInstanceKey: (value: string) => HoleInstanceKey =
  HoleInstanceKey;

type KindedMember<T> = Extract<T, { readonly kind: string }>;

type ExcludeByKind<T, K extends KindedMember<T>["kind"]> = Exclude<
  T,
  Extract<KindedMember<T>, { readonly kind: K }>
>;

export type FillableAttachment = ExcludeByKind<Attachment, "hole">;
export type FillableDamageTypeRef = ExcludeByKind<
  DamageTypeRef,
  "hole" | "same_choice_as"
>;

export type RolledDiceGroup = {
  readonly results: ReadonlyArray<DieRollResult>;
};

export const ATTACK_ROLL_MODES = [
  "normal",
  "advantage",
  "disadvantage",
] as const;
export type AttackRollMode = (typeof ATTACK_ROLL_MODES)[number];

export const D20_TEST_ROLLED_DIE_KEYS = ["first", "second"] as const;
export type D20TestRolledDieKey = (typeof D20_TEST_ROLLED_DIE_KEYS)[number];
export const D20_TEST_MULTIPLE_ROLL_MODES = [
  "advantage",
  "disadvantage",
] as const;
export type D20TestMultipleRollMode =
  (typeof D20_TEST_MULTIPLE_ROLL_MODES)[number];

/**
 * The parsed evidence for one D20 Test roll.
 *
 * A normal test has one face. Advantage and Disadvantage keep both faces and
 * the rule mode; the selected face is derived from those facts.
 */
export type D20TestRoll =
  | {
      readonly tag: "single";
      readonly naturalD20: DieRollResult;
    }
  | {
      readonly tag: "multiple";
      readonly first: DieRollResult;
      readonly second: DieRollResult;
      readonly rollMode: D20TestMultipleRollMode;
    };

export function selectedD20TestNaturalD20(roll: D20TestRoll): DieRollResult {
  return Match.value(roll).pipe(
    Match.when({ tag: "single" }, ({ naturalD20 }) => naturalD20),
    Match.when({ tag: "multiple" }, ({ first, second, rollMode }) =>
      rollMode === "advantage"
        ? Number(first) >= Number(second)
          ? first
          : second
        : Number(first) <= Number(second)
          ? first
          : second,
    ),
    Match.exhaustive,
  );
}

export function d20TestRollMode(roll: D20TestRoll): AttackRollMode {
  return Match.value(roll).pipe(
    Match.when({ tag: "single" }, () => "normal" as const),
    Match.when({ tag: "multiple" }, ({ rollMode }) => rollMode),
    Match.exhaustive,
  );
}

export function d20TestRollsEqual(
  a: D20TestRoll | undefined,
  b: D20TestRoll | undefined,
): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  return Match.value(a).pipe(
    Match.when(
      { tag: "single" },
      (left) => b.tag === "single" && left.naturalD20 === b.naturalD20,
    ),
    Match.when(
      { tag: "multiple" },
      (left) =>
        b.tag === "multiple" &&
        left.first === b.first &&
        left.second === b.second &&
        left.rollMode === b.rollMode,
    ),
    Match.exhaustive,
  );
}

export type AttackRollResult = {
  readonly total: number;
  readonly d20TestRoll: D20TestRoll;
};

export type SavingThrowOutcome = {
  readonly targetId: CreatureId;
  readonly succeeded: boolean;
};

export type RuntimeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: HoleId;
} & (
  | {
      readonly kind: "targetChoice";
      readonly label?: string;
    }
  | {
      readonly kind: "attackRoll";
      readonly label?: string;
    }
  | {
      readonly kind: "rolledDice";
      readonly label?: string;
    }
  | {
      readonly kind: "savingThrowOutcome";
      readonly label?: string;
      readonly ability: Ability;
      readonly dc: DcSource;
    }
  | {
      readonly kind: "surfaceAttachment";
      readonly label?: string;
      readonly attachment: FillableAttachment;
    }
  | {
      readonly kind: "surfaceDamageTypeRef";
      readonly label?: string;
      readonly damageTypeRef: FillableDamageTypeRef;
    }
);

export type RuntimeHoleSet = ReadonlyArray<RuntimeHole>;

export type FilledHoleValue =
  | {
      readonly kind: "surfaceDamageTypeRef";
      readonly holeId: HoleId;
      readonly value: FillableDamageTypeRef;
    }
  | {
      readonly kind: "targetChoice";
      readonly holeId: HoleId;
      readonly value: CreatureId;
    }
  | {
      readonly kind: "surfaceAttachment";
      readonly holeId: HoleId;
      readonly value: FillableAttachment;
    }
  | {
      readonly kind: "attackRoll";
      readonly holeId: HoleId;
      readonly value: AttackRollResult;
    }
  | {
      readonly kind: "savingThrowOutcome";
      readonly holeId: HoleId;
      readonly value: ReadonlyArray<SavingThrowOutcome>;
    }
  | {
      readonly kind: "rolledDice";
      readonly holeId: HoleId;
      readonly value: ReadonlyNonEmptyArray<RolledDiceGroup>;
    };
