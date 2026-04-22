import { Brand } from "effect";
import type {
  Attachment,
  AttackKind as SurfaceAttackKind,
  DamageTypeRef,
  UnitRecord,
} from "@dnd/prototype-content-surface/surface/types";
import type { CreatureId } from "@dnd/shared/types";
import type { State } from "#/reducer-state.ts";

// Semantic identity of a hole across replay.
// Example: "chromatic_orb_damage_type", "fireball_slot_level".
// Note that we NEVER would match fireball_slot_level, chromatic_orb_damage_type or other runtime authored Units in code

type HoleIdText =
  | "core_attack_target"
  | "core_attack_roll"
  | (string & {});
export type HoleId = HoleIdText & Brand.Brand<"HoleId">;
// Concrete prompt occurrence identity for one replay step/path.
// Example: "activation:0:surface:fireball_point", "continuation:1:runtime:attackRoll".
export type PromptInstanceKey = string & Brand.Brand<"PromptInstanceKey">;

type KindedMember<T> = Extract<T, { readonly kind: string }>;

type ExcludeByKind<
  T,
  K extends KindedMember<T>["kind"],
> = Exclude<T, Extract<KindedMember<T>, { readonly kind: K }>>;

export type FillableAttachment = ExcludeByKind<Attachment, "hole">;
export type FillableDamageTypeRef = ExcludeByKind<
  DamageTypeRef,
  "hole" | "same_choice_as"
>;

export type RuntimeHole =
  | {
      readonly promptInstanceKey: PromptInstanceKey
      readonly holeId: HoleId
      readonly kind: "targetChoice"
      readonly label?: string
    }
  | {
      readonly promptInstanceKey: PromptInstanceKey
      readonly holeId: HoleId
      // RAW: attack roll is a distinct D20 Test kind, not a generic d20 roll.
      // The other D20 Test kinds are ability checks and saving throws.
      readonly kind: "attackRoll"
      readonly label?: string
    }
  | {
      readonly promptInstanceKey: PromptInstanceKey
      readonly holeId: HoleId
      readonly kind: "surfaceAttachment"
      readonly label?: string
      readonly attachment: FillableAttachment
    }
  | {
      readonly promptInstanceKey: PromptInstanceKey
      readonly holeId: HoleId
      readonly kind: "surfaceDamageTypeRef"
      readonly label?: string
      readonly damageTypeRef: FillableDamageTypeRef
    }
  | {
      readonly promptInstanceKey: PromptInstanceKey
      readonly kind: "attackRoll"
      readonly attackKind: SurfaceAttackKind
    };

export type RuntimeHoleSet = ReadonlyArray<RuntimeHole>;

export type ResolutionSubject =
  | {
      readonly tag: "coreAction";
      readonly actorId: CreatureId;
      readonly action: "attack" | "endTurn";
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
      readonly kind: "surfaceDamageTypeRef"
      readonly holeId: HoleId
      readonly value: FillableDamageTypeRef
    }
  | {
      readonly kind: "targetChoice"
      readonly holeId: HoleId
      readonly value: CreatureId
    }
  | {
      readonly kind: "surfaceAttachment"
      readonly holeId: HoleId
      readonly value: FillableAttachment
    }
  | {
      readonly kind: "slotLevel"
      readonly holeId: HoleId
      readonly value: number
    }
  | {
      // Runtime answer for the D20 Test kind "attack roll".
      readonly kind: "attackRoll"
      readonly holeId: HoleId
      readonly value: number
    }
  | {
      readonly kind: "rolledDice"
      readonly holeId: HoleId
      // Example: Chromatic Orb damage roll [4, 4, 2].
      readonly value: ReadonlyArray<number>
    };

export type AvailableAction = {
  readonly subject: ResolutionSubject
  readonly label: string
  readonly summary: string
  readonly initialHoles: RuntimeHoleSet
};

export type ResolutionRequest = {
  readonly subject: ResolutionSubject
  readonly filledHoleValues: ReadonlyArray<FilledHoleValue>
}

export type ResolutionResult =
  | { readonly tag: "resolved"; readonly state: State }
  | { readonly tag: "needsHoles"; readonly holes: RuntimeHoleSet }
  | { readonly tag: "invalid"; readonly reason: string }
