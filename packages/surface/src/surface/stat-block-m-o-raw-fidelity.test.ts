import { defineRawStatBlockFidelityLane } from "./stat-block-raw-fidelity-lane.test-support.ts";

defineRawStatBlockFidelityLane({
  label: "M–O",
  sourcePath: ".references/srd-5.2.1/Monsters/Monsters-M-O.md",
  authoredSourcePrefix: "Monsters/Monsters-M-O.md:",
  expectedRecordCount: 25,
});
