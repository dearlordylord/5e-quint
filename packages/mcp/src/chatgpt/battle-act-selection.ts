import { createHash } from "node:crypto";
import { Schema } from "effect";
import type { BattleSubject } from "@dnd/battle-runtime";
import type { McpPlaySessionRoot } from "../composition-root.ts";
import type { PlaySessionId } from "../play-session.ts";
import { battleMechanicsEnvelopeForSession } from "../battle-tool-payloads.ts";

export const BattleActKeySchema = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^act:[0-9a-f]{32}$/u)),
  Schema.brand("BattleActKey"),
).annotate({
  description:
    "Opaque key for a currently offered Act in this Play Session. Copy it unchanged from readyCalls; rediscover after the frontier changes.",
});
export type BattleActKey = typeof BattleActKeySchema.Type;

export function battleActSelections(
  root: McpPlaySessionRoot,
  playSessionId: PlaySessionId,
): readonly {
  readonly actKey: BattleActKey;
  readonly subject: BattleSubject;
}[] {
  const battle = root.sessionStore.battleState;
  if (battle.tag !== "activeBattle") return [];
  const envelope = battleMechanicsEnvelopeForSession(root, battle.session);
  if (envelope.frontier.kind !== "acts") return [];
  const scope = JSON.stringify([
    playSessionId,
    root.sessionStore.nextBattleActionSelectionId,
    envelope,
  ]);
  return envelope.frontier.acts.map(({ subject }) => ({
    subject,
    actKey: Schema.decodeUnknownSync(BattleActKeySchema)(
      `act:${createHash("sha256").update(scope).update(JSON.stringify(subject)).digest("hex").slice(0, 32)}`,
    ),
  }));
}
