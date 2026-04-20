/**
 * Pure narration — produces a human-readable description for each battle event.
 * No DOM, no React, no side effects.
 */
import type { BattleEvent } from "#/battle-machine-types.ts";

import type { ScenarioMeta } from "./scene-snapshot.ts";

function name(id: string, meta: ScenarioMeta): string {
  return meta.names[id] ?? id;
}

export function narrate(event: BattleEvent, meta: ScenarioMeta): string {
  switch (event.type) {
    case "BATTLE_INIT":
      return `Battle begins — ${event.creatures.length} combatants take the field.`;
    case "BATTLE_START_TURN":
      return "A new turn begins.";
    case "BATTLE_CAST_AOE":
      return `Casts ${event.spellId ?? event.spellName ?? "spell"} (level ${event.slotLvl} slot) — DC ${event.saveDC}, ${event.dmgOnFail} ${event.dt} damage.`;
    case "BATTLE_CAST_SAVE_SPELL":
      return `Casts ${event.spellId ?? event.spellName ?? "spell"} on ${name(event.targetId, meta)} — DC ${event.saveDC}, ${event.dmgOnFail} ${event.dt} damage.`;
    case "BATTLE_RESOLVE_COUNTERSPELL":
      if (!event.reactorId)
        return "No more counterspellers — spell chain resolves.";
      return `${name(event.reactorId, meta)} casts Counterspell!`;
    case "BATTLE_RESOLVE_AOE_TARGET":
      if (!event.targetId) return "AoE resolution complete.";
      return `${name(event.targetId, meta)} rolls ${event.saveRoll} on the save.`;
    case "BATTLE_RESOLVE_SAVE_FAILED_REACTION":
      if (!event.reactorId) return "No more save-failed reactions.";
      if (event.decision.tag === "RPass")
        return `${name(event.reactorId, meta)} skips reaction.`;
      return `${name(event.reactorId, meta)} uses Legendary Resistance!`;
    case "BATTLE_AFTER_DAMAGE_DECLINE":
      if (!event.reactorId) return "No more after-damage reactions.";
      return `${name(event.reactorId, meta)} skips after-damage reaction.`;
    case "BATTLE_ATTACK":
      return `Attacks ${name(event.targetId, meta)} — rolls ${event.attackRoll} vs AC ${event.tAc}.`;
    case "BATTLE_RESOLVE_HIT_REACTION":
      if (!event.reactorId) return "No hit reactions.";
      if (event.decision.tag === "RShield")
        return `${name(event.reactorId, meta)} casts Shield!`;
      if (event.decision.tag === "RPass")
        return `${name(event.reactorId, meta)} skips.`;
      return `${name(event.reactorId, meta)} reacts: ${event.decision.tag}.`;
    case "BATTLE_RESOLVE_DMG_REACTION":
      if (!event.reactorId) return "No damage reactions.";
      if (event.decision.tag === "RUncannyDodge")
        return `${name(event.reactorId, meta)} uses Uncanny Dodge — halves damage!`;
      if (event.decision.tag === "RDeflectAttacks")
        return `${name(event.reactorId, meta)} uses Deflect Attacks!`;
      if (event.decision.tag === "RPass")
        return `${name(event.reactorId, meta)} skips.`;
      return `${name(event.reactorId, meta)} reduces damage.`;
    case "BATTLE_END_TURN":
      return "Turn ends.";
    case "BATTLE_MOVE":
      return "Movement.";
    case "BATTLE_MOVEMENT_OA_DECLINE":
      if (!event.reactorId) return "No opportunity attacks.";
      return `${name(event.reactorId, meta)} forgoes opportunity attack.`;
    case "BATTLE_MOVEMENT_OA_ATTACK":
      if (!event.reactorId) return "Opportunity attack resolves.";
      return `${name(event.reactorId, meta)} takes an opportunity attack!`;
    case "BATTLE_HEAL":
      return `${name(event.targetId, meta)} heals for ${event.amount} HP.`;
    case "BATTLE_LEGENDARY_PASS":
      return "No legendary action taken.";
    case "BATTLE_LEGENDARY_ATTACK":
      return `${name(event.monsterId, meta)} uses a legendary action against ${name(event.laTarget, meta)}!`;
    case "BATTLE_CAST_CONCENTRATION_SPELL":
      return `Concentrates on spell targeting ${name(event.targetId, meta)}.`;
    case "BATTLE_CONCENTRATION_CHECK":
      return `${name(event.targetId, meta)} makes a concentration check — ${event.conSaveSucceeded ? "holds" : "breaks"}!`;
    case "BATTLE_AFTER_DAMAGE_SPELL_REACTION":
      if (!event.reactorId) return "No spell reaction.";
      return `${name(event.reactorId, meta)} retaliates with a spell!`;
    case "BATTLE_AFTER_DAMAGE_REACTIVE_EFFECT":
      if (!event.reactorId) return "No reactive effect.";
      return `${name(event.reactorId, meta)}'s effect retaliates!`;
    case "BATTLE_AFTER_DAMAGE_RETALIATION":
      if (!event.reactorId) return "No retaliation.";
      return `${name(event.reactorId, meta)} retaliates!`;
    default:
      return (event as { type: string }).type;
  }
}
