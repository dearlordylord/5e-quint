// KERNEL-COVERAGE: runtime-owner SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE
/** Eager canonical SRD Unit collection. Keep this module out of runtime bundles that receive staged projections. */
// Canonical authored state remains in content/*.dhall and its strict JSON
// peers; the membership manifest owns the ordered publication slice, and this
// generated module stores only its deterministic static imports.
import { srdUnitAggregateInputs } from "./generated/srd-unit-aggregate.ts";
import { decodeUnitRecordSync } from "./schema.ts";
import {
  assertSrd521Unit,
  defineSrdUnitCollection,
} from "./unit-catalog-core.ts";

export const srdUnitCollection = defineSrdUnitCollection({
  units: srdUnitAggregateInputs.map((input) =>
    assertSrd521Unit(decodeUnitRecordSync(input)),
  ),
});
