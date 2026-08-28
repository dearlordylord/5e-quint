/** Eager canonical SRD Stat Block collection. Keep this module out of runtime bundles that receive staged projections. */
// Content JSON is generated from the matching content/*.dhall source.
// Keep authoring changes in Dhall, then regenerate JSON and trace output.
import findFamiliarStatBlocksInput from "../../content/stat_block_find_familiar_forms.json";
import goblinWarriorInput from "../../content/stat_block_goblin_warrior.json";
import skeletonInput from "../../content/stat_block_skeleton.json";
import sphinxOfWonderInput from "../../content/stat_block_sphinx_of_wonder.json";
import wildShapeRecommendedFormsInput from "../../content/stat_block_wild_shape_recommended_forms.json";
import { decodeStatBlockRecordSync } from "./schema.ts";
import {
  assertSrd521StatBlock,
  defineSrdStatBlockCollection,
} from "./stat-block-catalog-core.ts";

export const srdStatBlockCollection = defineSrdStatBlockCollection({
  statBlocks: [
    ...findFamiliarStatBlocksInput.map((input) =>
      assertSrd521StatBlock(decodeStatBlockRecordSync(input)),
    ),
    ...wildShapeRecommendedFormsInput.map((input) =>
      assertSrd521StatBlock(decodeStatBlockRecordSync(input)),
    ),
    assertSrd521StatBlock(decodeStatBlockRecordSync(goblinWarriorInput)),
    assertSrd521StatBlock(decodeStatBlockRecordSync(skeletonInput)),
    assertSrd521StatBlock(decodeStatBlockRecordSync(sphinxOfWonderInput)),
  ],
});
