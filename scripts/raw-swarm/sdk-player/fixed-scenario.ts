import {
  battleCreatureInitFromStatBlock,
  battleId,
  battleStateInitIssueMessage,
  combatantId,
  initiativeScore,
  startBattle,
  type BattleRuntimeSession,
} from "../../../packages/battle-runtime/src/index.ts";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "../../../packages/surface/src/surface/stat-block-catalog.ts";
import { Either } from "effect";

export const TRACER_SCENARIO_ID =
  "tracer-001-goblin-warrior-vs-skeleton" as const;

export type ScenarioSessionResult =
  | { readonly tag: "ready"; readonly session: BattleRuntimeSession }
  | { readonly tag: "invalid"; readonly message: string };

export function tracerScenarioSession(): ScenarioSessionResult {
  const catalog = buildStatBlockCatalog({
    collections: [srdStatBlockCollection],
  });
  if (catalog.tag === "invalid") {
    return { tag: "invalid", message: "SRD Stat Block catalog is invalid." };
  }
  const goblin = battleCreatureInitFromStatBlock({
    combatantId: combatantId("goblin-warrior"),
    initiative: initiativeScore(15),
    statBlock: catalog.catalog.requireStatBlock("stat_block_goblin_warrior"),
  });
  if (Either.isLeft(goblin)) {
    return {
      tag: "invalid",
      message: battleStateInitIssueMessage(goblin.left),
    };
  }
  const skeleton = battleCreatureInitFromStatBlock({
    combatantId: combatantId("skeleton"),
    initiative: initiativeScore(10),
    statBlock: catalog.catalog.requireStatBlock("stat_block_skeleton"),
  });
  if (Either.isLeft(skeleton)) {
    return {
      tag: "invalid",
      message: battleStateInitIssueMessage(skeleton.left),
    };
  }
  const started = startBattle({
    battleId: battleId(TRACER_SCENARIO_ID),
    combatants: [goblin.right, skeleton.right],
  });
  return Either.isLeft(started)
    ? {
        tag: "invalid",
        message: battleStateInitIssueMessage(started.left),
      }
    : { tag: "ready", session: started.right };
}
