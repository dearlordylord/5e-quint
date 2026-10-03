import { expect, test } from "vitest";
import { srdUnitCollection } from "./unit-catalog.ts";
import { readSubclassCreationFacts } from "./character-creation-readers.ts";

test("subclass creation projection retains canonical grant occurrences and rejects a class owner", () => {
  const subclass = srdUnitCollection.units.find(
    (unit) =>
      unit.kind === "subclass" && unit.id === "subclass_fighter_champion",
  );
  const owner = srdUnitCollection.units.find(
    (unit) => unit.kind === "class" && unit.id === "class_fighter",
  );
  if (subclass?.kind !== "subclass" || owner?.kind !== "class")
    throw new Error("Installed Fighter fixture owners required");
  expect(readSubclassCreationFacts(subclass)).toEqual({
    tag: "readable",
    value: {
      recordId: subclass.id,
      className: subclass.className,
      featureGrants: subclass.featureGrants,
    },
  });
  expect(subclass.featureGrants).toContainEqual({
    level: 7,
    unitId: "fighter_additional_fighting_style",
  });
  expect(readSubclassCreationFacts(owner)).toMatchObject({
    tag: "unreadable",
    issues: [
      {
        code: "unsupportedUnitKind",
        unitId: owner.id,
        message: "Expected subclass record, received class.",
      },
    ],
  });
});
