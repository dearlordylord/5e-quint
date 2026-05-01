import type { UnitRecord } from "@dnd/surface/surface/types";
import type { SrdActionKind } from "@dnd/shared/game-facts";
import type { CreatureId } from "@dnd/shared/types";
import type { State } from "#/reducer-state.ts";
import type {
  FilledHoleValue,
  RuntimeHoleSet,
} from "@dnd/shared-algebras/runtime-hole-algebra";

export {
  holeId,
  holeInstanceKey,
  holeLocalKey,
  holeStepKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
export type {
  AttackRollResult,
  FillableAttachment,
  FillableDamageTypeRef,
  FilledHoleValue,
  HoleId,
  HoleInstanceKey,
  HoleLocalKey,
  HoleStepKey,
  RolledDiceGroup,
  RuntimeHole,
  RuntimeHoleSet,
  SavingThrowOutcome,
} from "@dnd/shared-algebras/runtime-hole-algebra";

export type Subject =
  | {
      // Core SRD Action subject. The closed action vocabulary is the SRD
      // standard Action set from @dnd/shared. This variant is not an authored
      // Surface Unit or a reducer-only runtime command.
      readonly tag: "srdAction";
      readonly actorId: CreatureId;
      readonly action: SrdActionKind;
    }
  | {
      readonly tag: "runtimeCommand";
      readonly actorId: CreatureId;
      readonly command: "endTurn";
    }
  | {
      readonly tag: "unit";
      readonly actorId: CreatureId;
      readonly unitId: UnitRecord["id"];
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
