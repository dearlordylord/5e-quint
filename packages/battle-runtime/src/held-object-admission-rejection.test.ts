import { expect, test } from "vitest";
import { spellCreatedHeldObjectProfile } from "./battle-reducer/spell-procedure-profiles/spell-created-held-object.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";

test("rejects independently unsupported held-object damage and operation contracts at authored admission", () => {
  const base = spellRecord("flame_blade");
  const mechanics = base.mechanics;
  if (mechanics.family !== "ongoing_effect")
    throw new Error("Expected ongoing mechanics.");
  const light = mechanics.operations.find(
    (operation) => operation.effect.kind === "emit_bright_and_dim_illumination",
  );
  const attack = mechanics.operations.find(
    (operation) => operation.effect.kind === "attack_roll",
  );
  if (light === undefined || attack?.effect.kind !== "attack_roll")
    throw new Error("Expected light and attack operations.");
  const damage = attack.effect.onHit[0];
  if (damage?.kind !== "damage" || damage.amount?.kind !== "linear_per_level")
    throw new Error("Expected linear damage.");
  const amount = damage.amount;
  const damageVariants = [
    { ...damage, damageType: "cold" },
    { ...damage, amount: { kind: "fixed", expr: { dice: 3, dieSize: 6 } } },
    { ...damage, amount: { ...amount, axis: "character" } },
    { ...damage, amount: { ...amount, startingAtLevel: 3 } },
    { ...damage, amount: { ...amount, base: { ...amount.base, dice: 2 } } },
    { ...damage, amount: { ...amount, base: { ...amount.base, dieSize: 8 } } },
    {
      ...damage,
      amount: {
        ...amount,
        base: { dice: amount.base.dice, dieSize: amount.base.dieSize },
      },
    },
    {
      ...damage,
      amount: { ...amount, perLevel: { ...amount.perLevel, dice: 2 } },
    },
    {
      ...damage,
      amount: { ...amount, perLevel: { ...amount.perLevel, dieSize: 8 } },
    },
  ];
  const variants = [
    ...damageVariants.map((variant) => ({
      failedFact: "attackDamage",
      operations: [
        light,
        { ...attack, effect: { ...attack.effect, onHit: [variant] } },
      ],
    })),
    {
      failedFact: "attackDamage",
      operations: [
        light,
        { ...attack, effect: { ...attack.effect, onHit: [damage, damage] } },
      ],
    },
    {
      failedFact: "attackDisposition",
      operations: [
        light,
        { ...attack, effect: { ...attack.effect, onMiss: [damage] } },
      ],
    },
    { failedFact: "attackOperation", operations: [light] },
    { failedFact: "illuminationOperation", operations: [attack] },
    { failedFact: "operationCount", operations: [light, attack, attack] },
  ];
  for (const [index, variant] of variants.entries()) {
    const record = decodeSpellRecordForTest({
      ...base,
      id: `synthetic_held_object_rejection_${index}`,
      name: `Synthetic Held Object Rejection ${index}`,
      provenance: { kind: "synthetic-test", section: "held_object_rejection" },
      mechanics: { ...mechanics, operations: variant.operations },
    });
    const source = spellAdmissionSource(record);
    const result = spellCreatedHeldObjectProfile.admitMechanics({
      mechanics: source.mechanics,
      spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
    });
    expect(result.tag, `variant ${index}`).toBe("unsupported");
    if (result.tag !== "unsupported")
      throw new Error("Expected precise authored rejection.");
    expect(result.issues.map((issue) => issue.failedFact)).toContain(
      variant.failedFact,
    );
  }
});
