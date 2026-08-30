import fc from "fast-check";
import { Either } from "effect";
import { describe, expect, it } from "vitest";
import {
  ALIGNMENT_CHOICES,
  alignmentAbbreviation,
  alignmentFromAbbreviation,
  alignmentFromOptionId,
  alignmentLabel,
  alignmentOptionId,
  characterClassLevel,
  featureSaveDC,
  parseAlignmentOptionId,
  statBlockId,
  surfaceSkillId,
  unitId,
} from "./game-facts.ts";
import { abilityModifier, difficultyClass } from "./check-difficulty.ts";
import {
  D6_ROLL_RESULTS,
  D6RollResult,
  abilityScore,
  abilityScoreToMod,
  armorClass,
  attackBonus,
  characterLevel,
  classLevel,
  copperPieceAmount,
  d20Roll,
  damageAmount,
  deathSaveCount,
  exhaustionLevel,
  getOnlyOne,
  getOnlyOneStrict,
  healAmount,
  hp,
  isCopperPieceAmount,
  isArrayOfOne,
  movementDeltaFeet,
  movementFeet,
  proficiencyBonus,
  proficiencyBonusForCharacterLevel,
  resourceCount,
  spellSlotLevel,
  tempHp,
} from "./types.ts";
import { druidWildShapeDurationHoursForClassLevel } from "./wild-shape.ts";

describe("shared domain primitive constructors", () => {
  it("clamps and floors numeric inputs to their declared domains", () => {
    fc.assert(
      fc.property(
        fc.double({
          noNaN: true,
          noDefaultInfinity: true,
          min: -10_000,
          max: 10_000,
        }),
        (value) => {
          expect(hp(value)).toBe(Math.max(0, Math.floor(value)));
          expect(tempHp(value)).toBe(Math.max(0, Math.floor(value)));
          expect(damageAmount(value)).toBe(Math.max(0, Math.floor(value)));
          expect(healAmount(value)).toBe(Math.max(1, Math.floor(value)));
          expect(deathSaveCount(value)).toBe(
            Math.max(0, Math.min(3, Math.floor(value))),
          );
          expect(d20Roll(value)).toBe(
            Math.max(1, Math.min(20, Math.floor(value))),
          );
          expect(exhaustionLevel(value)).toBe(
            Math.max(0, Math.min(6, Math.floor(value))),
          );
          expect(abilityScore(value)).toBe(
            Math.max(1, Math.min(30, Math.floor(value))),
          );
          expect(proficiencyBonus(value)).toBe(
            Math.max(2, Math.min(6, Math.floor(value))),
          );
          expect(movementFeet(value)).toBe(Math.max(0, Math.floor(value)));
          expect(movementDeltaFeet(value)).toBe(Math.floor(value));
          expect(classLevel(value)).toBe(
            Math.max(1, Math.min(20, Math.floor(value))),
          );
          expect(characterLevel(value)).toBe(
            Math.max(1, Math.min(20, Math.floor(value))),
          );
          expect(armorClass(value)).toBe(Math.max(1, Math.floor(value)));
          expect(attackBonus(value)).toBe(Math.floor(value));
          expect(spellSlotLevel(value)).toBe(
            Math.max(1, Math.min(9, Math.floor(value))),
          );
          expect(resourceCount(value)).toBe(Math.max(0, Math.floor(value)));
          expect(difficultyClass(value)).toBe(Math.max(1, Math.floor(value)));
          expect(abilityModifier(value)).toBe(Math.floor(value));
        },
      ),
    );
  });

  it("round-trips every alignment representation", () => {
    for (const alignment of ALIGNMENT_CHOICES) {
      const abbreviation = alignmentAbbreviation(alignment);
      const optionId = alignmentOptionId(alignment);
      expect(alignmentFromAbbreviation(abbreviation)).toEqual(alignment);
      expect(alignmentFromOptionId(optionId)).toEqual(alignment);
      expect(parseAlignmentOptionId(optionId)).toBe(optionId);
      expect(alignmentLabel(alignment)).not.toBe("");
    }
    expect(parseAlignmentOptionId("not_an_alignment")).toBeUndefined();
  });

  it("projects remaining branded and collection facts", () => {
    for (const rollResult of D6_ROLL_RESULTS) {
      expect(D6RollResult(rollResult)).toBe(rollResult);
    }
    expect(() => D6RollResult(7)).toThrow();

    expect(unitId("unit")).toBe("unit");
    expect(statBlockId("stat-block")).toBe("stat-block");
    expect(characterClassLevel(20)).toBe(20);
    expect(() => characterClassLevel(21)).toThrow();
    expect(surfaceSkillId("animalHandling")).toBe("animal_handling");
    expect(surfaceSkillId("athletics")).toBe("athletics");
    expect(featureSaveDC(abilityModifier(3), 2)).toBe(13);
    expect(proficiencyBonusForCharacterLevel(characterLevel(1))).toBe(2);
    expect(proficiencyBonusForCharacterLevel(characterLevel(20))).toBe(6);
    expect(abilityScoreToMod(9)).toBe(-1);
    expect(copperPieceAmount(29)).toBe(29);
    expect(isCopperPieceAmount(0)).toBe(true);
    expect(isCopperPieceAmount(Number.MAX_SAFE_INTEGER)).toBe(true);
    expect(isCopperPieceAmount(-1)).toBe(false);
    expect(isCopperPieceAmount(0.5)).toBe(false);
    expect(isCopperPieceAmount(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
    expect(isCopperPieceAmount("29")).toBe(false);
    expect(() => copperPieceAmount(0.5)).toThrow();
    expect(druidWildShapeDurationHoursForClassLevel(5)).toBe(2);

    expect(isArrayOfOne([1])).toBe(true);
    expect(isArrayOfOne([])).toBe(false);
    expect(getOnlyOneStrict(["only"])).toBe("only");
    expect(Either.getOrThrow(getOnlyOne(["only"]))).toBe("only");
    expect(Either.isLeft(getOnlyOne([]))).toBe(true);
    expect(Either.isLeft(getOnlyOne([], (length) => `length:${length}`))).toBe(
      true,
    );
  });
});
