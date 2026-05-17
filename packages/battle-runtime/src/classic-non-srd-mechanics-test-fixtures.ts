import type { ClassicNonSrdMechanicsUnit } from "./unit-feature-support.ts";

export const myceliumStepUnitId = "mycelium_step";

type MyceliumStepMechanicsInput = {
  readonly id: string;
  readonly syntheticLabel: string;
  readonly provenance: { readonly kind: string };
  readonly mechanics: {
    readonly family: string;
    readonly from: {
      readonly kind: string;
      readonly actions: readonly string[];
    };
    readonly to: { readonly kind: string };
  };
};

export function mechanicsOnlyMyceliumStepUnit(
  input: MyceliumStepMechanicsInput,
): ClassicNonSrdMechanicsUnit {
  if (
    input.id !== myceliumStepUnitId ||
    input.syntheticLabel !== "Mycelium Step" ||
    input.provenance.kind !== "classic-2024-mechanics-source-lane" ||
    input.mechanics.family !== "alternate_action_cost" ||
    input.mechanics.from.kind !== "standard_action" ||
    input.mechanics.from.actions.length !== 1 ||
    input.mechanics.from.actions[0] !== "dash" ||
    input.mechanics.to.kind !== "bonus_action"
  ) {
    throw new Error("Classic mycelium_step fixture shape drifted.");
  }

  return {
    id: myceliumStepUnitId,
    syntheticLabel: "Mycelium Step",
    provenance: { kind: "classic-2024-mechanics-source-lane" },
    kind: "class_feature",
    mechanics: {
      family: "alternate_action_cost",
      from: { kind: "standard_action", actions: ["dash"] },
      to: { kind: "bonus_action" },
    },
  };
}
