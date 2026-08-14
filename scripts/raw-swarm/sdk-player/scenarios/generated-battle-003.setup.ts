import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = () => ({
  kind: "obstructed",
  obstruction:
    "The delegated pre-battle choices do not remove the remaining public-SDK obstruction. ScenarioBattleObject has no carrier or attachment state, transfer/retrieval interactions, retention after a fall or dismount, removal restrictions, indestructibility/opening restrictions, or gate-passage scoring for the required dispatch-cylinder objective. The surface also has no mounted rider relationship or rider-within-mount spatial projection for reach, cover, the gate trigger, and a dropped-object square, and its two-dimensional placements cannot represent Cinder beginning 20 feet above Hook. Starting a partial canonical battle or supplying ground placements would therefore omit or change scenario-fixed facts.",
  observation: {
    scenarioId: "generated-battle-003",
    publicSurfaceGaps: [
      "dispatch-cylinder carrier, attachment, interaction, restriction, and scoring semantics",
      "mounted rider relationship and rider spatial projection",
      "creature elevation and vertically separated co-located placements",
    ],
    omittedRatherThanInvented: [
      "battle initialization",
      "battlefield placements",
      "dispatch-cylinder object projection",
    ],
  },
});
