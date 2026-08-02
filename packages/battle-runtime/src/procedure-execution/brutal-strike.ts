import type { MovementDeltaFeet, MovementFeet } from "@dnd/shared/types";

export type BrutalStrikeOptionId = (typeof BRUTAL_STRIKE_OPTION_IDS)[number];

export const BRUTAL_STRIKE_OPTION_IDS = [
  "forceful_blow",
  "hamstring_blow",
] as const;

export type BrutalStrikeProfile = {
  readonly trigger: {
    readonly kind: "recklessAttackStrengthAttackHit";
    readonly advantageForgone: true;
    readonly attackMustNotHaveDisadvantage: true;
  };
  readonly damage: {
    readonly dice: 1;
    readonly dieSize: 10;
    readonly damageType: "sameAsAttack";
  };
  readonly options: readonly [
    {
      readonly selectionId: "forceful_blow";
      readonly effect: {
        readonly kind: "forcefulBlow";
        readonly pushFeet: MovementFeet;
        readonly selfMovement: {
          readonly kind: "moveTowardTargetWithoutOpportunityAttacks";
          readonly distance: "halfSpeed";
        };
      };
    },
    {
      readonly selectionId: "hamstring_blow";
      readonly effect: {
        readonly kind: "hamstringBlow";
        readonly deltaFeet: MovementDeltaFeet;
        readonly stacking: "mostRecentOnly";
        readonly expires: "startOfYourNextTurn";
      };
    },
  ];
};

export type BrutalStrikeEffect =
  BrutalStrikeProfile["options"][number]["effect"];

export type BrutalStrikeHamstringEffect = Extract<
  BrutalStrikeEffect,
  { readonly kind: "hamstringBlow" }
>;
