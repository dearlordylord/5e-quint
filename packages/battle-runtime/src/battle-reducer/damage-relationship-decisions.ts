import type {
  BattleDamageRelationshipDecisions,
  BattleFill,
  BattleHoleId,
} from "../battle-reducer.ts";

export type DamageRelationshipDecisionParseResult =
  | {
      readonly tag: "ok";
      readonly decisionsByDamageHole: DamageRelationshipDecisionsByHole;
    }
  | { readonly tag: "invalid"; readonly message: string };

export class DamageRelationshipDecisionsByHole {
  readonly #decisions: ReadonlyMap<
    BattleHoleId,
    BattleDamageRelationshipDecisions
  >;

  private constructor(
    decisions: ReadonlyMap<
      BattleHoleId,
      BattleDamageRelationshipDecisions
    >,
  ) {
    this.#decisions = decisions;
  }

  static parse(input: {
    readonly fills: readonly BattleFill[];
    readonly damageRollHoleIds: ReadonlySet<BattleHoleId>;
    readonly owner: "an Attack" | "a Spell" | "a chained Spell";
  }): DamageRelationshipDecisionParseResult {
    const decisions = new Map<
      BattleHoleId,
      BattleDamageRelationshipDecisions
    >();
    for (const fill of input.fills) {
      if (fill.kind !== "damageRelationshipDecisions") {
        continue;
      }
      if (
        !input.damageRollHoleIds.has(fill.holeId) ||
        decisions.has(fill.holeId)
      ) {
        return {
          tag: "invalid",
          message: `Damage relationship decisions must uniquely match ${input.owner} damage roll.`,
        };
      }
      decisions.set(fill.holeId, fill.decisions);
    }
    return {
      tag: "ok",
      decisionsByDamageHole: new DamageRelationshipDecisionsByHole(decisions),
    };
  }

  forDamageHole(
    holeId: BattleHoleId,
  ): BattleDamageRelationshipDecisions | undefined {
    return this.#decisions.get(holeId);
  }
}
