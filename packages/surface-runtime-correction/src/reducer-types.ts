import { Brand } from "effect";
import type {
  Attachment,
  Ability,
  DamageTypeRef,
  DcSource,
  UnitRecord,
} from "@dnd/prototype-content-surface/surface/types";
import type {
  CreatureId,
  DieRollResult,
  ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type { State } from "#/reducer-state.ts";

// Stable identity of a hole across replay.
// Example: "chromatic_orb_damage_type", "fireball_slot_level".
// Note that we NEVER would match fireball_slot_level, chromatic_orb_damage_type or other authored-unit hole ids in code.

type HoleIdText = "core_attack_target" | "core_attack_roll" | (string & {});
export type HoleId = HoleIdText & Brand.Brand<"HoleId">;
const HoleId = Brand.nominal<HoleId>();
export const holeId: (value: HoleIdText) => HoleId = HoleId;
// Replay-step/path identity used when constructing hole instance keys.
// Example: "activation:0", "continuation:1".
export type HoleStepKey = string & Brand.Brand<"HoleStepKey">;
const HoleStepKey = Brand.nominal<HoleStepKey>();
export const holeStepKey: (value: string) => HoleStepKey = HoleStepKey;
// Hole identity within one replay step/path.
// Example: "runtime:attackRoll", "surface:fireball_point".
export type HoleLocalKey = string & Brand.Brand<"HoleLocalKey">;
const HoleLocalKey = Brand.nominal<HoleLocalKey>();
export const holeLocalKey: (value: string) => HoleLocalKey = HoleLocalKey;
// Concrete hole occurrence identity for one replay step/path.
// Example: "activation:0:surface:fireball_point", "continuation:1:runtime:attackRoll".
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
  readonly results: ReadonlyNonEmptyArray<DieRollResult>;
};

export type AttackRollResult = {
  readonly total: number;
  readonly naturalD20: DieRollResult;
};

export type SavingThrowOutcome = {
  readonly targetId: CreatureId;
  readonly succeeded: boolean;
};

// "non-runtime" holes are Surface holes.
export type RuntimeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: HoleId;
} & (
  | {
      readonly kind: "targetChoice";
      readonly label?: string;
    }
  | {
      // RAW: attack roll is a distinct D20 Test kind, not a generic d20 roll.
      // The other D20 Test kinds are ability checks and saving throws.
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

export type Subject =
  | {
      readonly tag: "coreAct";
      readonly actorId: CreatureId;
      readonly act: "attack" | "endTurn";
    }
  | {
      readonly tag: "unit";
      readonly actorId: CreatureId;
      readonly unitId: UnitRecord["id"];
    };

export type FilledHoleValue =
  // Mixed by design:
  // - some filled values wrap Surface-authored payload shapes directly
  //   (`surfaceAttachment`, `surfaceDamageTypeRef`)
  // - some filled values are runtime answers required by Surface semantics
  //   (`slotLevel`, `attackRoll`)
  // Surface can author that a runtime answer is needed without that answer
  // itself being a Surface payload node.
  | {
      // Example: Chromatic Orb chooses damage type once, then later leap damage
      // reuses that choice via `same_choice_as(holeId)`.
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
      readonly kind: "slotLevel";
      readonly holeId: HoleId;
      readonly value: number;
    }
  | {
      // Runtime answer for the D20 Test kind "attack roll".
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
      // Example: Chromatic Orb damage roll [{ results: [4, 4, 2] }].
      readonly value: ReadonlyNonEmptyArray<RolledDiceGroup>;
    };

export type AvailableAct = {
  readonly subject: Subject;
  readonly label: string;
  readonly summary: string;
  readonly initialHoles: RuntimeHoleSet;
};

export type ResolutionRequest = {
  readonly subject: Subject;
  readonly filledHoleValues: ReadonlyArray<FilledHoleValue>;
};

export type ResolutionInvalid = {
  readonly tag: "invalid";
  readonly reason: string;
};

export type ResolutionContinuation =
  | { readonly tag: "resolved"; readonly state: State }
  | { readonly tag: "needsHoles"; readonly holes: RuntimeHoleSet };

export type ResolutionResult = ResolutionInvalid | ResolutionContinuation;
