// A caster concentrating on Dragon's Breath, whose willing target exhales on
// the caster: the exhale's save and damage lead to the caster's Concentration
// save, so tests reach a Concentration save hole through a battle.
import grantedAreaSaveDamageActionInput from "../../surface/content/dragons_breath.json";
import {
  endTurn,
  requireResolved,
  resolveBattleSubject,
  type BattleState,
} from "./battle-runtime.test-support.ts";
import type {
  BattleHole,
  BattleRolledSavingThrowOutcome,
} from "./battle-state-execution.ts";
import type { BattleRuntimeSession } from "./index.ts";
import { dragonsBreathUnitId } from "./unit-profile-admission-catalog.test-support.ts";
import { requireHole } from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  bonusSpellAct,
  damageTypeChoiceFill,
  knownWillingSpellTargetListFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  decodeUnitRecordSync,
  discoverBattleActCandidates,
  spellCasterId,
  spellTargetId,
  type BattleFill,
  type SpellRecord,
} from "./unit-profile-admission.test-support.ts";

/** The caster's facts besides the Dragon's Breath spell and its slot. */
export type ExhaleCaster = Omit<
  Parameters<typeof spellBattle>[0],
  "preparedSpells" | "spellSlots"
>;

/**
 * The battle at the target's turn, after the caster cast Dragon's Breath on
 * the target, with the target's exhale on the caster and its save hole.
 */
export function exhaleOnConcentratingCaster(caster: ExhaleCaster) {
  const session = spellBattle({
    preparedSpells: [dragonsBreathSpell()],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    ...caster,
  });
  const ended = endTurn({
    state: castDragonsBreath(session),
    actorId: spellCasterId,
  });
  if (ended.tag !== "resolved") {
    throw new Error("Expected caster End Turn to resolve.");
  }
  const exhaleAct = discoverBattleActCandidates(ended.state).find(
    (candidate) =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "grantedAreaSaveDamageAction",
  );
  if (exhaleAct === undefined) {
    throw new Error("Expected Dragon's Breath exhale action.");
  }
  return {
    state: ended.state,
    subject: exhaleAct.subject,
    saveHole: requireHole(exhaleAct.initialHoles, "savingThrowOutcome"),
  };
}

/** The caster's save against the exhale, from the target's space. */
export function exhaleSaveFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcome: Omit<BattleRolledSavingThrowOutcome, "targetId">,
): BattleFill {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        originAnchorId: spellTargetId,
        affectedTargetIds: [spellCasterId],
      },
      outcomes: [{ targetId: spellCasterId, ...outcome }],
    },
  };
}

function castDragonsBreath(session: BattleRuntimeSession): BattleState {
  const act = bonusSpellAct({
    session,
    spellId: dragonsBreathUnitId,
    slotLevel: 2,
  });
  return requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetListFill(
          requireHole(act.initialHoles, "spellTargetList"),
          spellCasterId,
          dragonsBreathUnitId,
          [spellTargetId],
        ),
        damageTypeChoiceFill(
          requireHole(act.initialHoles, "damageTypeChoice"),
          "lightning",
        ),
      ],
    }),
  ).state;
}

function dragonsBreathSpell(): SpellRecord {
  const unit = decodeUnitRecordSync(grantedAreaSaveDamageActionInput);
  if (unit.kind !== "spell") {
    throw new Error("Expected Dragon's Breath fixture to decode as a spell.");
  }
  return unit;
}
