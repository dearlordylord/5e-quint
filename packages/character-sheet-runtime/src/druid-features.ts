import { srdStatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";

import {
  druidWildShapeKnownFormsAfterLongRestWithStatBlockCatalog,
  druidWildShapeKnownFormsConstructionWithStatBlockCatalog,
  druidWildShapeKnownFormsFromInputWithStatBlockCatalog,
  druidWildShapeStatBlockCatalogFromInput as druidWildShapeStatBlockCatalogFromExplicitInput,
} from "./druid-features-core.ts";
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog-contract";
import type {
  CharacterSheetInput,
  CharacterSheetLongRestInput,
} from "./sheet-types.ts";

export {
  characterSheetDruidCircleLandPreparedSpellAccess,
  characterSheetDruidWildShapeKnownForms,
  druidCircleLandAfterLongRest,
  druidCircleLandFromInput,
  isDruidCircleLandChoice,
  storedBookOfShadowsDruidCircleLandSelectionIssue,
} from "./druid-features-core.ts";

export function druidWildShapeStatBlockCatalogFromInput(
  statBlockCatalog: StatBlockCatalog | undefined,
): StatBlockCatalog {
  return druidWildShapeStatBlockCatalogFromExplicitInput(
    statBlockCatalog ?? srdStatBlockCatalog,
  );
}

export function druidWildShapeKnownFormsFromInput(input: CharacterSheetInput) {
  return druidWildShapeKnownFormsFromInputWithStatBlockCatalog({
    ...input,
    statBlockCatalog: input.statBlockCatalog ?? srdStatBlockCatalog,
  });
}

export function druidWildShapeKnownFormsConstruction(
  input: CharacterSheetInput,
) {
  return druidWildShapeKnownFormsConstructionWithStatBlockCatalog({
    ...input,
    statBlockCatalog: input.statBlockCatalog ?? srdStatBlockCatalog,
  });
}

export function druidWildShapeKnownFormsAfterLongRest(input: {
  readonly input: CharacterSheetLongRestInput;
  readonly build: CharacterSheetLongRestInput["completion"]["startedRest"]["sheet"]["build"];
}) {
  return druidWildShapeKnownFormsAfterLongRestWithStatBlockCatalog({
    ...input,
    input: {
      ...input.input,
      statBlockCatalog: input.input.statBlockCatalog ?? srdStatBlockCatalog,
    },
  });
}
